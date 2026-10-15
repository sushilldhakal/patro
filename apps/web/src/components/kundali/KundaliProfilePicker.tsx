import { forwardRef, useImperativeHandle } from "react";
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
import { useKundaliProfilePicker } from "@vedic-patro/features/kundali";
import { preloadPanchangaRoute } from "@/lib/panchanga-route-preload";
import { cn } from "@vedic-patro/domain/utils";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";

export interface KundaliProfilePickerHandle {
  openAdd: () => void;
}

type Picker = ReturnType<typeof useKundaliProfilePicker>;

/**
 * Signed-in users pick a saved profile to generate its kundali. Each card shows
 * the full birth details and has "View kundali" + "Edit". The "Add profile"
 * trigger is exposed via ref so the page heading can host the button.
 */
export const KundaliProfilePicker = forwardRef<
  KundaliProfilePickerHandle,
  { selectedId?: string | null; onSelect: (profile: Profile) => void }
>(function KundaliProfilePicker({ selectedId, onSelect }, ref) {
  const picker = useKundaliProfilePicker({ selectedId, onSelect });
  const { openAdd } = picker;

  useImperativeHandle(ref, () => ({ openAdd }), [openAdd]);

  if (picker.status === "loading") {
    return (
      <div className={cn(kundaliDetailClasses.milanPicker.loadingBox, "flex text-sm")}>
        <Loader2 className="size-4 animate-spin" /> {picker.loadingText}
      </div>
    );
  }

  if (picker.status === "error") {
    return (
      <p className={cn(kundaliDetailClasses.milanPicker.errorBox, kundaliDetailClasses.milanPicker.errorText)}>
        {picker.errorText}
      </p>
    );
  }

  return (
    <>
      {picker.cards.length === 0 ? (
        <div className={kundaliDetailClasses.milanPicker.emptyBoxCentered}>
          <p className="text-sm text-base text-foreground">{picker.empty.title}</p>
          <p className="mx-auto mt-1 max-w-md text-sm">{picker.empty.hint}</p>
          <Button className="mt-4" onClick={picker.openAdd}>
            <Sparkles className="size-4" /> {picker.empty.action}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {picker.cards.map((c) => (
            <ProfileCard
              key={c.id}
              card={c}
              editLabel={picker.editLabel}
              onPrefetch={() => preloadPanchangaRoute(`/kundali/${c.id}`)}
            />
          ))}
        </div>
      )}

      <Dialog open={picker.dialogOpen} onOpenChange={(o) => !o && picker.closeDialog()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{picker.dialogTitle}</DialogTitle>
            <DialogDescription>{picker.dialogHint}</DialogDescription>
          </DialogHeader>
          {picker.dialog && (
            <ProfileForm
              initial={picker.dialog.existing ? profileToInput(picker.dialog.existing) : EMPTY_PROFILE}
              existing={picker.dialog.existing}
              onCancel={picker.closeDialog}
              onSaved={picker.dialog.onSaved}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
});

function ProfileCard({
  card: c,
  editLabel,
  onPrefetch,
}: {
  card: Picker["cards"][number];
  editLabel: string;
  onPrefetch: () => void;
}) {
  return (
    <div
      className={cn(
        kundaliDetailClasses.profilePicker.card,
        "transition-colors",
        c.active
          ? cn(kundaliDetailClasses.profilePicker.cardActive, "ring-1 ring-secondary/40")
          : kundaliDetailClasses.profilePicker.cardIdle
      )}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
    >
      <div className={kundaliDetailClasses.profilePicker.head}>
        <div className="min-w-0">
          <div className={cn(kundaliDetailClasses.profilePicker.nameRow, kundaliDetailClasses.profilePicker.nameText, "flex")}>
            <span className="truncate">{c.name}</span>
            {c.isDefault && <Star className="size-3.5 shrink-0 text-secondary" />}
          </div>
          {c.gender && <span className={kundaliDetailClasses.profilePicker.gender}>{c.gender}</span>}
        </div>
        <Button variant="ghost" size="icon-sm" title={editLabel} onClick={c.edit}>
          <Pencil className="size-4" />
        </Button>
      </div>

      <div className={cn(kundaliDetailClasses.profilePicker.rows, "text-xs")}>
        <Row icon={Clock} label={c.rows.dob.label}>{c.rows.dob.value}</Row>
        <Row icon={MapPin} label={c.rows.place.label}>{c.rows.place.value}</Row>
        <Row icon={Navigation} label={c.rows.latLon.label}>{c.rows.latLon.value}</Row>
        <Row icon={Globe} label={c.rows.timezone.label}>{c.rows.timezone.value}</Row>
      </div>

      <Button
        onClick={c.view}
        variant={c.active ? "default" : "outline"}
        size="sm"
        className="mt-auto w-full"
      >
        <Sparkles className="size-3.5" />
        {c.viewLabel}
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
