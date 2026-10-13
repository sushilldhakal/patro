import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@vedic-patro/i18n/react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Star, Trash2, Pencil, MailWarning, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouteLoading } from "@/lib/route-loading";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  listProfiles,
  updateProfile,
  deleteProfile,
  apiResendVerification,
  type Profile,
} from "@/lib/auth/client";
import {
  ProfileForm,
  EMPTY_PROFILE,
  profileToInput,
} from "@/components/auth/ProfileForm";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/domain/utils";

export function Account() {
  const { t } = useTranslation();
  const { user, loading: authLoading, refreshUser, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profilesQuery = useQuery({
    queryKey: ["account-profiles"],
    queryFn: listProfiles,
    enabled: !!user,
  });
  const profiles = profilesQuery.data ?? [];
  const loading = profilesQuery.isLoading;
  const [editing, setEditing] = useState<Profile | "new" | null>(null);
  const error = profilesQuery.isError ? t("account_page.load_error") : null;
  const [resent, setResent] = useState(false);

  const reloadProfiles = () => void queryClient.invalidateQueries({ queryKey: ["account-profiles"] });

  useEffect(() => {
    if (!authLoading && !user) {
      void navigate({ to: "/" });
    }
  }, [authLoading, user, navigate]);

  async function onDelete(id: string) {
    if (!confirm(t("account_page.delete_confirm"))) return;
    await deleteProfile(id);
    reloadProfiles();
  }

  async function onMakeDefault(p: Profile) {
    await updateProfile(p.id, { is_default: true });
    reloadProfiles();
  }

  useRouteLoading(authLoading || !user || loading);

  if (authLoading || !user) {
    return null;
  }

  return (
    <div className={cn("px-4 py-8", accountClasses.column)}>
      <header className={accountClasses.header}>
        <h1 className={accountClasses.title}>{t("account_page.title")}</h1>
        <p className={accountClasses.subtitle}>{user.email}</p>
      </header>

      {!user.is_verified && (
        <div className={cn("flex", accountClasses.banner)}>
          <MailWarning className={cn("size-4 text-amber-600 dark:text-amber-400", accountClasses.bannerIcon)} />
          <div className="flex-1">
            <p className={accountClasses.bannerText}>
              {t("account_page.verify_email")}
            </p>
            <button
              type="button"
              disabled={resent}
              className={cn("hover:underline disabled:opacity-60", accountClasses.bannerAction)}
              onClick={async () => {
                await apiResendVerification();
                setResent(true);
              }}
            >
              {resent ? t("account_page.resent") : t("account_page.resend")}
            </button>
          </div>
        </div>
      )}

      <div className={cn("flex", accountClasses.sectionRow)}>
        <h2 className={accountClasses.sectionTitle}>{t("account_page.profiles_title")}</h2>
        {editing === null && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="size-3.5" />
            {t("account_page.add_profile")}
          </Button>
        )}
      </div>

      {error && <p className={accountClasses.errorText}>{error}</p>}

      {editing !== null ? (
        <ProfileForm
          initial={editing === "new" ? EMPTY_PROFILE : profileToInput(editing)}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reloadProfiles();
            void refreshUser();
          }}
          existing={editing === "new" ? undefined : editing}
        />
      ) : loading ? (
        <div className={cn("flex justify-center", accountClasses.loadingBox)}>
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : profiles.length === 0 ? (
        <div className={cn(accountClasses.emptyBox, accountClasses.emptyText)}>
          {t("account_page.no_profiles")}
        </div>
      ) : (
        <ul className={cn("flex flex-col", accountClasses.profileList)}>
          {profiles.map((p) => (
            <li
              key={p.id}
              className={cn("flex", accountClasses.profileRow)}
            >
              <div className={accountClasses.profileBody}>
                <div className={cn("flex", accountClasses.profileNameRow)}>
                  <p className={cn("truncate", accountClasses.profileName)}>{p.full_name}</p>
                  {p.is_default && (
                    <span className={cn("inline-flex", accountClasses.defaultBadge, accountClasses.defaultBadgeText)}>
                      <Star className="size-3" /> {t("account_page.default")}
                    </span>
                  )}
                </div>
                <p className={cn("truncate", accountClasses.profileMeta)}>
                  {[p.location_label || p.city, p.birth_date && `${p.birth_date}${p.birth_time ? " " + p.birth_time : ""}`]
                    .filter(Boolean)
                    .join(" · ") || t("account_page.no_birth_details")}
                </p>
              </div>
              <div className={cn("flex", accountClasses.profileActions)}>
                {!p.is_default && (
                  <Button variant="ghost" size="icon-sm" title={t("account_page.make_default")} onClick={() => onMakeDefault(p)}>
                    <Star className="size-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon-sm" title={t("account_page.edit")} onClick={() => setEditing(p)}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" title={t("account_page.delete")} onClick={() => onDelete(p.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={accountClasses.dangerZone}>
        <h2 className={accountClasses.dangerTitle}>{t("account_page.delete_account")}</h2>
        <p className={accountClasses.dangerBody}>{t("account_page.delete_account_confirm")}</p>
        <Button
          variant="outline"
          size="sm"
          className={cn("hover:bg-destructive/10", accountClasses.dangerButton, accountClasses.dangerButtonText)}
          onClick={async () => {
            if (!confirm(t("account_page.delete_account_confirm"))) return;
            try {
              await deleteAccount();
              void navigate({ to: "/" });
            } catch {
              alert(t("account_page.delete_account_error"));
            }
          }}
        >
          {t("account_page.delete_account")}
        </Button>
      </div>
    </div>
  );
}
