import { forwardRef, useImperativeHandle, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@vedic-patro/i18n/react";
import { Sparkles, Star, Pencil, Loader2, MapPin, Clock, Navigation, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfileForm, EMPTY_PROFILE, profileToInput } from "@/components/auth/ProfileForm";
import { type Profile } from "@/lib/auth/client";
import { PROFILES_QUERY_KEY, useProfilesQuery } from "@/lib/kundali/profiles-query";
import { preloadPanchangaRoute } from "@/lib/panchanga-route-preload";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

export interface KundaliProfilePickerHandle {
  openAdd: () => void;
}

type DialogState = { mode: "add" } | { mode: "edit"; profile: Profile } | null;

/**
 * Signed-in users pick a saved profile to generate its kundali. Each card shows
 * the full birth details and has "View kundali" + "Edit". The "Add profile"
 * trigger is exposed via ref so the page heading can host the button.
 */
export const KundaliProfilePicker = forwardRef<
  KundaliProfilePickerHandle,
  { selectedId?: string | null; onSelect: (profile: Profile) => void }
>(function KundaliProfilePicker({ selectedId, onSelect }, ref) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: profiles, isLoading, isError } = useProfilesQuery();
  const [dialog, setDialog] = useState<DialogState>(null);

  useImperativeHandle(ref, () => ({ openAdd: () => setDialog({ mode: "add" }) }), []);

  if (isLoading && !profiles) {
    return (
      <div className={cn(kundaliDetailClasses.milanPicker.loadingBox, "flex text-sm")}>
        <Loader2 className="size-4 animate-spin" /> {t("kundali.loading_profiles")}
      </div>
    );
  }

  if (isError) {
    return (
      <p className={cn(kundaliDetailClasses.milanPicker.errorBox, kundaliDetailClasses.milanPicker.errorText)}>
        {t("account_page.load_error")}
      </p>
    );
  }

  const list = profiles ?? [];

  return (
    <>
      {list.length === 0 ? (
        <div className={kundaliDetailClasses.milanPicker.emptyBoxCentered}>
          <p className="text-sm text-base text-foreground">{t("kundali.no_profiles_yet")}</p>
          <p className="mx-auto mt-1 max-w-md text-sm">{t("kundali.no_profiles_hint")}</p>
          <Button className="mt-4" onClick={() => setDialog({ mode: "add" })}>
            <Sparkles className="size-4" /> {t("kundali.first_profile")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              active={p.id === selectedId}
              onView={() => onSelect(p)}
              onEdit={() => setDialog({ mode: "edit", profile: p })}
              onPrefetch={() => preloadPanchangaRoute(`/kundali/${p.id}`)}
            />
          ))}
        </div>
      )}

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "edit" ? t("kundali.edit_profile") : t("kundali.add_profile")}
            </DialogTitle>
            <DialogDescription>{t("kundali.form_hint")}</DialogDescription>
          </DialogHeader>
          {dialog && (
            <ProfileForm
              initial={dialog.mode === "edit" ? profileToInput(dialog.profile) : EMPTY_PROFILE}
              existing={dialog.mode === "edit" ? dialog.profile : undefined}
              onCancel={() => setDialog(null)}
              onSaved={async (saved) => {
                const wasEditingSelected =
                  dialog.mode === "edit" && dialog.profile.id === selectedId;
                setDialog(null);
                await queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY });
                if (dialog.mode === "add" || wasEditingSelected) onSelect(saved);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
});

function ProfileCard({
  profile: p,
  active,
  onView,
  onEdit,
  onPrefetch,
}: {
  profile: Profile;
  active: boolean;
  onView: () => void;
  onEdit: () => void;
  onPrefetch: () => void;
}) {
  const { t } = useTranslation();
  const place = p.location_label || p.city || "—";
  const dob = p.birth_date ? `${p.birth_date} ${(p.birth_era ?? "bs").toUpperCase()}` : "—";
  const latLon =
    p.latitude != null && p.longitude != null
      ? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`
      : "—";
  const genderLabel =
    p.gender === "male"
      ? t("profile.male")
      : p.gender === "female"
        ? t("profile.female")
        : p.gender === "other"
          ? t("profile.other")
          : p.gender;

  return (
    <div
      className={cn(
        kundaliDetailClasses.profilePicker.card,
        "transition-colors",
        active
          ? cn(kundaliDetailClasses.profilePicker.cardActive, "ring-1 ring-secondary/40")
          : kundaliDetailClasses.profilePicker.cardIdle
      )}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
    >
      <div className={kundaliDetailClasses.profilePicker.head}>
        <div className="min-w-0">
          <div className={cn(kundaliDetailClasses.profilePicker.nameRow, kundaliDetailClasses.profilePicker.nameText, "flex")}>
            <span className="truncate">{p.full_name}</span>
            {p.is_default && <Star className="size-3.5 shrink-0 text-secondary" />}
          </div>
          {genderLabel && <span className={kundaliDetailClasses.profilePicker.gender}>{genderLabel}</span>}
        </div>
        <Button variant="ghost" size="icon-sm" title={t("kundali.edit_profile")} onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
      </div>

      <div className={cn(kundaliDetailClasses.profilePicker.rows, "text-xs")}>
        <Row icon={Clock} label={t("kundali.dob")}>
          {dob}
          {p.birth_time ? ` · ${p.birth_time}` : ""}
        </Row>
        <Row icon={MapPin} label={t("kundali.place")}>
          {place}
        </Row>
        <Row icon={Navigation} label={t("kundali.lat_long")}>
          {latLon}
        </Row>
        <Row icon={Globe} label={t("kundali.timezone")}>
          {p.timezone || "—"}
        </Row>
      </div>

      <Button
        onClick={onView}
        variant={active ? "default" : "outline"}
        size="sm"
        className="mt-auto w-full"
      >
        <Sparkles className="size-3.5" />
        {active ? t("kundali.viewing_kundali") : t("kundali.view_kundali")}
      </Button>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(kundaliDetailClasses.profilePicker.row, "flex")}>
      <Icon className="mt-0.5 size-3.5 shrink-0 opacity-70" />
      <span className={kundaliDetailClasses.profilePicker.rowLabel}>{label}:</span>
      <span className={cn(kundaliDetailClasses.profilePicker.rowValue, "break-words")}>{children}</span>
    </div>
  );
}
