import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Star, Trash2, Pencil, MailWarning, Loader2 } from "lucide-react";
import { useAccountPage } from "@vedic-patro/features/account";
import { Button } from "@/components/ui/button";
import { useRouteLoading } from "@/lib/route-loading";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  ProfileForm,
  EMPTY_PROFILE,
  profileToInput,
} from "@/components/auth/ProfileForm";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/domain/utils";

export function Account() {
  const auth = useAuth();
  const navigate = useNavigate();
  const page = useAccountPage({ auth });
  const { status, user, copy, editing, verification } = page;

  useEffect(() => {
    if (status === "signed-out") {
      void navigate({ to: "/" });
    }
  }, [status, navigate]);

  useRouteLoading(status !== "ready" || page.listStatus === "loading");

  if (status !== "ready" || !user) {
    return null;
  }

  return (
    <div className={cn("px-4 py-8", accountClasses.column)}>
      <header className={accountClasses.header}>
        <h1 className={accountClasses.title}>{copy.title}</h1>
        <p className={accountClasses.subtitle}>{user.email}</p>
      </header>

      {verification.needed && (
        <div className={cn("flex", accountClasses.banner)}>
          <MailWarning className={cn("size-4 text-amber-600 dark:text-amber-400", accountClasses.bannerIcon)} />
          <div className="flex-1">
            <p className={accountClasses.bannerText}>
              {copy.verifyEmail}
            </p>
            <button
              type="button"
              disabled={verification.sent}
              className={cn("hover:underline disabled:opacity-60", accountClasses.bannerAction)}
              onClick={verification.resend}
            >
              {verification.label}
            </button>
          </div>
        </div>
      )}

      <div className={cn("flex", accountClasses.sectionRow)}>
        <h2 className={accountClasses.sectionTitle}>{copy.profilesTitle}</h2>
        {editing === null && (
          <Button size="sm" onClick={page.startNew}>
            <Plus className="size-3.5" />
            {copy.addProfile}
          </Button>
        )}
      </div>

      {page.loadError && <p className={accountClasses.errorText}>{page.loadError}</p>}

      {editing !== null ? (
        <ProfileForm
          initial={editing === "new" ? EMPTY_PROFILE : profileToInput(editing)}
          onCancel={page.cancelEdit}
          onSaved={() => void page.onProfileSaved()}
          existing={editing === "new" ? undefined : editing}
        />
      ) : page.listStatus === "loading" ? (
        <div className={cn("flex justify-center", accountClasses.loadingBox)}>
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : page.listStatus === "empty" ? (
        <div className={cn(accountClasses.emptyBox, accountClasses.emptyText)}>
          {copy.noProfiles}
        </div>
      ) : (
        <ul className={cn("flex flex-col", accountClasses.profileList)}>
          {page.profiles.map(({ profile: p, name, isDefault, meta }) => (
            <li
              key={p.id}
              className={cn("flex", accountClasses.profileRow)}
            >
              <div className={accountClasses.profileBody}>
                <div className={cn("flex", accountClasses.profileNameRow)}>
                  <p className={cn("truncate", accountClasses.profileName)}>{name}</p>
                  {isDefault && (
                    <span className={cn("inline-flex", accountClasses.defaultBadge, accountClasses.defaultBadgeText)}>
                      <Star className="size-3" /> {copy.defaultBadge}
                    </span>
                  )}
                </div>
                <p className={cn("truncate", accountClasses.profileMeta)}>
                  {meta}
                </p>
              </div>
              <div className={cn("flex", accountClasses.profileActions)}>
                {!isDefault && (
                  <Button variant="ghost" size="icon-sm" title={copy.makeDefault} onClick={() => void page.makeDefault(p)}>
                    <Star className="size-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon-sm" title={copy.edit} onClick={() => page.startEdit(p)}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" title={copy.delete}
                  onClick={() => {
                    if (confirm(copy.deleteProfileConfirm)) void page.removeProfile(p);
                  }}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className={accountClasses.dangerZone}>
        <h2 className={accountClasses.dangerTitle}>{copy.deleteAccount}</h2>
        <p className={accountClasses.dangerBody}>{copy.deleteAccountConfirm}</p>
        <Button
          variant="outline"
          size="sm"
          className={cn("hover:bg-destructive/10", accountClasses.dangerButton, accountClasses.dangerButtonText)}
          onClick={async () => {
            if (!confirm(copy.deleteAccountConfirm)) return;
            if (await page.deleteAccount()) void navigate({ to: "/" });
            else alert(copy.deleteAccountError);
          }}
        >
          {copy.deleteAccount}
        </Button>
      </div>
    </div>
  );
}
