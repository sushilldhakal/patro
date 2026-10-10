import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("account_page.title")}</h1>
        <p className="text-sm">{user.email}</p>
      </header>

      {!user.is_verified && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <MailWarning className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-amber-800 dark:text-amber-200">
              {t("account_page.verify_email")}
            </p>
            <button
              type="button"
              disabled={resent}
              className="mt-1 text-base text-amber-700 hover:underline disabled:opacity-60 dark:text-amber-300"
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

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{t("account_page.profiles_title")}</h2>
        {editing === null && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="size-3.5" />
            {t("account_page.add_profile")}
          </Button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

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
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm">
          {t("account_page.no_profiles")}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {profiles.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-base text-foreground">{p.full_name}</p>
                  {p.is_default && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-xs text-base text-secondary">
                      <Star className="size-3" /> {t("account_page.default")}
                    </span>
                  )}
                </div>
                <p className="truncate text-sm">
                  {[p.location_label || p.city, p.birth_date && `${p.birth_date}${p.birth_time ? " " + p.birth_time : ""}`]
                    .filter(Boolean)
                    .join(" · ") || t("account_page.no_birth_details")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
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

      <div className="mt-10 border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-destructive">{t("account_page.delete_account")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("account_page.delete_account_confirm")}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 border-destructive text-destructive hover:bg-destructive/10"
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
