import {
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Pencil,
  Sparkles,
  Star,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfileForm, EMPTY_PROFILE, profileToInput } from "@/components/auth/ProfileForm";
import { listProfiles, type Profile } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

export interface MilanProfilePickerHandle {
  openAdd: () => void;
}

type DialogState = { mode: "add" } | { mode: "edit"; profile: Profile } | null;
type PickRole = "boy" | "girl" | null;

interface Props {
  boyId: string | null;
  girlId: string | null;
  onBoySelect: (profile: Profile) => void;
  onGirlSelect: (profile: Profile) => void;
}

export const MilanProfilePicker = forwardRef<MilanProfilePickerHandle, Props>(
  function MilanProfilePicker({ boyId, girlId, onBoySelect, onGirlSelect }, ref) {
  const { t } = useTranslation();
    const queryClient = useQueryClient();
    const profilesQuery = useQuery({
      queryKey: ["milan-profiles"],
      queryFn: listProfiles,
    });
    const profiles = profilesQuery.isPending ? null : (profilesQuery.data ?? []);
    const reload = async () => {
      await queryClient.invalidateQueries({ queryKey: ["milan-profiles"] });
    };
    const [formDialog, setFormDialog] = useState<DialogState>(null);
    const [pickRole, setPickRole] = useState<PickRole>(null);
    const error = profilesQuery.isError ? t("account_page.load_error") : null;

    useImperativeHandle(ref, () => ({ openAdd: () => setFormDialog({ mode: "add" }) }), []);

    const boyProfile = profiles?.find((p) => p.id === boyId) ?? null;
    const girlProfile = profiles?.find((p) => p.id === girlId) ?? null;

    function handlePick(profile: Profile) {
      if (pickRole === "boy") {
        onBoySelect(profile);
      } else if (pickRole === "girl") {
        onGirlSelect(profile);
      }
      setPickRole(null);
    }

    if (profiles === null) {
      return (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-6 text-sm">
          <Loader2 className="size-4 animate-spin" /> {t("common.loading")}
        </div>
      );
    }

    if (error) {
      return (
        <p className="rounded-xl border border-border bg-card px-4 py-4 text-sm text-destructive">
          {error}
        </p>
      );
    }

    if (profiles.length === 0) {
      return (
        <>
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
            <p className="text-sm text-base text-foreground">{t("milan.no_profiles_title")}</p>
            <p className="mx-auto mt-1 max-w-md text-sm">
              {t("milan.no_profiles_body")}
            </p>
            <Button className="mt-4" onClick={() => setFormDialog({ mode: "add" })}>
              <Sparkles className="size-4" /> {t("kundali.add_profile")}
            </Button>
          </div>
          <ProfileFormDialog dialog={formDialog} setDialog={setFormDialog} onSaved={reload} />
        </>
      );
    }

    return (
      <>
        <div className="grid gap-3 sm:grid-cols-2">
          <RoleSlot
            role="boy"
            label={t("milan.vara_slot")}
            emptyLabel={t("milan.pick_vara")}
            changeLabel={t("milan.change_vara")}
            profile={boyProfile}
            onPick={() => setPickRole("boy")}
            onEdit={boyProfile ? () => setFormDialog({ mode: "edit", profile: boyProfile }) : undefined}
          />
          <RoleSlot
            role="girl"
            label={t("milan.kanya_slot")}
            emptyLabel={t("milan.pick_kanya")}
            changeLabel={t("milan.change_kanya")}
            profile={girlProfile}
            onPick={() => setPickRole("girl")}
            onEdit={girlProfile ? () => setFormDialog({ mode: "edit", profile: girlProfile }) : undefined}
          />
        </div>

        <RolePickerDialog
          open={pickRole !== null}
          role={pickRole}
          profiles={profiles}
          otherId={pickRole === "boy" ? girlId : boyId}
          onClose={() => setPickRole(null)}
          onPick={handlePick}
          onEdit={(profile) => {
            setPickRole(null);
            setFormDialog({ mode: "edit", profile });
          }}
          onAdd={() => {
            setPickRole(null);
            setFormDialog({ mode: "add" });
          }}
        />

        <ProfileFormDialog dialog={formDialog} setDialog={setFormDialog} onSaved={reload} />
      </>
    );
  },
);

function RoleSlot({
  role,
  label,
  emptyLabel,
  changeLabel,
  profile,
  onPick,
  onEdit,
}: {
  role: "boy" | "girl";
  label: string;
  emptyLabel: string;
  changeLabel: string;
  profile: Profile | null;
  onPick: () => void;
  onEdit?: () => void;
}) {
  const { t } = useTranslation();
  const accent = role === "boy" ? "border-sky-500/30 bg-sky-500/[0.06]" : "border-pink-500/30 bg-pink-500/[0.06]";

  if (!profile) {
    return (
      <button
        type="button"
        onClick={onPick}
        className={cn(
          "flex min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-center transition-colors",
          "border-border bg-muted/10 hover:border-secondary/50 hover:bg-secondary/[0.04]",
        )}
      >
        <UserRound className="size-8" />
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="text-xs">{emptyLabel}</span>
        <ChevronRight className="size-4" aria-hidden />
      </button>
    );
  }

  const place = profile.location_label || profile.city || "—";
  const dob = profile.birth_date
    ? `${profile.birth_date} ${(profile.birth_era ?? "bs").toUpperCase()}`
    : "—";

  return (
    <div className={cn("rounded-2xl border p-4 shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)]", accent)}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide">{label}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-base font-bold text-foreground">
            <span className="truncate">{profile.full_name}</span>
            {profile.is_default ? <Star className="size-3.5 shrink-0 text-secondary" /> : null}
          </p>
        </div>
        {onEdit ? (
          <Button variant="ghost" size="icon-sm" title={t("account_page.edit")} onClick={onEdit}>
            <Pencil className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <div className="space-y-1 text-xs">
        <p className="flex items-center gap-1.5">
          <Clock className="size-3 shrink-0" />
          {dob}
          {profile.birth_time ? ` · ${profile.birth_time}` : ""}
        </p>
        <p className="flex items-center gap-1.5">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{place}</span>
        </p>
      </div>
      <Button variant="outline" size="sm" className="mt-3 w-full" onClick={onPick}>
        {changeLabel}
      </Button>
    </div>
  );
}

function RolePickerDialog({
  open,
  role,
  profiles,
  otherId,
  onClose,
  onPick,
  onEdit,
  onAdd,
}: {
  open: boolean;
  role: PickRole;
  profiles: Profile[];
  otherId: string | null;
  onClose: () => void;
  onPick: (profile: Profile) => void;
  onEdit: (profile: Profile) => void;
  onAdd: () => void;
}) {
  const { t } = useTranslation();
  const title = role === "boy" ? t("milan.pick_vara_title") : t("milan.pick_kanya_title");
  const desc = role === "boy" ? t("milan.pick_vara_desc") : t("milan.pick_kanya_desc");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>

        <ul className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
          {profiles.map((p) => {
            const blocked = p.id === otherId;
            const place = p.location_label || p.city || "—";
            const dob = p.birth_date
              ? `${p.birth_date} ${(p.birth_era ?? "bs").toUpperCase()}`
              : "—";

            return (
              <li key={p.id} className="border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2 rounded-lg p-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 font-semibold text-sm text-foreground">
                      <span className="truncate">{p.full_name}</span>
                      {p.is_default ? <Star className="size-3 shrink-0 text-secondary" /> : null}
                    </p>
                    <p className="mt-0.5 truncate text-xs">
                      {dob}
                      {p.birth_time ? ` · ${p.birth_time}` : ""} · {place}
                    </p>
                    {blocked ? (
                      <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                        {t("milan.already_other_role")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      size="sm"
                      disabled={blocked}
                      onClick={() => onPick(p)}
                    >
                      {role === "boy" ? t("milan.select_as_boy") : t("milan.select_as_girl")}
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => onEdit(p)}>
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-border px-4 py-3">
          <Button variant="outline" className="w-full" onClick={onAdd}>
            <Sparkles className="size-4" /> {t("kundali.add_profile")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProfileFormDialog({
  dialog,
  setDialog,
  onSaved,
}: {
  dialog: DialogState;
  setDialog: (v: DialogState) => void;
  onSaved: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {dialog?.mode === "edit" ? t("kundali.edit_profile") : t("kundali.add_profile")}
          </DialogTitle>
          <DialogDescription>{t("milan.profile_form_hint")}</DialogDescription>
        </DialogHeader>
        {dialog ? (
          <ProfileForm
            initial={dialog.mode === "edit" ? profileToInput(dialog.profile) : EMPTY_PROFILE}
            existing={dialog.mode === "edit" ? dialog.profile : undefined}
            onCancel={() => setDialog(null)}
            onSaved={async () => {
              setDialog(null);
              await onSaved();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
