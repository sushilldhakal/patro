import { Plus, Star, Trash2, Pencil, Loader2 } from "lucide-react";
import type { useAccountPage } from "@vedic-patro/features/account";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Button } from "@/components/ui/button";
import { ProfileForm, EMPTY_PROFILE, profileToInput } from "@/components/auth/ProfileForm";

/** Account → Saved profiles: add, edit, make default and delete the birth profiles. */
export function ProfilesSection({ page }: { page: ReturnType<typeof useAccountPage> }) {
  const { copy, editing } = page;
  return (
    <>
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
    </>
  );
}
