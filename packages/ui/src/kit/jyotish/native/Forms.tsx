import { useEffect } from "react";
import { Switch } from "react-native";
import type { AshtakutaResult } from "@vedic-patro/api-client";
import { cn } from "@vedic-patro/domain/utils";
import { patroNavataraToneBg } from "@vedic-patro/design-tokens/classes/patro-classes";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { vastuClasses } from "@vedic-patro/design-tokens/classes/vastu-classes";
import { EMPTY_PROFILE, profileToInput, useProfileForm } from "@vedic-patro/features/account";
import { useAyanamshaSelector, useKundaliMilanResult, useKundaliProfilePicker } from "@vedic-patro/features/kundali";
import { useHouseRequirements, useOwnerCompatibility } from "@vedic-patro/features/vastu";
import { Box, Button, Icon, Input, Pressable, Sheet, Text } from "@vedic-patro/ui";
import type {
  AyanamshaSelectorProps,
  HouseRequirementsFormProps,
  HouseSelectArgs,
  KundaliMilanResultProps,
  KundaliProfilePickerProps,
  OwnerCompatibilityProps,
  ProfileFormProps,
} from "../contract";
import { iconCalendarClock, iconChevronDown, iconChevronRight, iconClock, iconGlobe, iconLoader, iconMapPin, iconNavigation, iconPencil, iconSparkles, iconStar } from "../icons";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box className={cn("min-w-0 flex-1", accountClasses.field)}>
      <Text className={accountClasses.label}>{label}</Text>
      {children}
    </Box>
  );
}

function Chips({ options }: { options: { value: string; label: string; active: boolean; select: () => void }[] }) {
  return (
    <Box nativeClassName="flex-row flex-wrap" className="gap-2">
      {options.map((option) => (
        <Pressable key={option.value} onPress={option.select} className={cn("h-8 items-center justify-center rounded-lg border px-2.5", option.active ? "border-secondary bg-secondary/10" : "border-border")}>
          <Text className={cn("text-sm", option.active ? "font-semibold text-secondary" : "text-foreground")}>{option.label}</Text>
        </Pressable>
      ))}
    </Box>
  );
}

export function AyanamshaSelector(props: AyanamshaSelectorProps) {
  const sel = useAyanamshaSelector(props);
  return (
    <Box className={cn(kundaliDetailClasses.ayanamsha.card, "mb-4 overflow-hidden border border-border")}>
      <Box className={cn(kundaliDetailClasses.ayanamsha.header, "bg-secondary/10")}>
        <Text className={kundaliDetailClasses.ayanamsha.heading}>{sel.heading}</Text>
      </Box>
      <Box className={kundaliDetailClasses.ayanamsha.body}>
        <Box className={kundaliDetailClasses.ayanamsha.chips} nativeClassName="flex-row flex-wrap">
          {sel.chips.map((chip) => (
            <Pressable key={chip.id} onPress={chip.select} label={chip.title} className={cn(kundaliDetailClasses.ayanamsha.chip, chip.active ? kundaliDetailClasses.ayanamsha.chipActive : kundaliDetailClasses.ayanamsha.chipIdle)}>
              <Text className={cn(kundaliDetailClasses.ayanamsha.chipText, chip.active ? kundaliDetailClasses.ayanamsha.chipActiveText : kundaliDetailClasses.ayanamsha.chipIdleText)}>{chip.label}</Text>
            </Pressable>
          ))}
        </Box>
        <Text className={kundaliDetailClasses.ayanamsha.note}>{sel.note}</Text>
      </Box>
    </Box>
  );
}

export function ProfileForm({ initial, existing, onCancel, onSaved, afterSave, renderPlace }: ProfileFormProps) {
  const f = useProfileForm({ initial, existing, onSaved, afterSave });
  const { form, copy } = f;
  return (
    <Box className={accountClasses.profileForm}>
      <Box className={cn("sm:flex-row", accountClasses.fieldRow)}>
        <Field label={copy.fullName}><Input value={form.full_name} onChange={f.setName} className={accountClasses.input} /></Field>
        <Field label={copy.phone}><Input value={form.phone ?? ""} onChange={f.setPhone} placeholder={copy.phonePlaceholder} className={accountClasses.input} /></Field>
      </Box>
      <Box className={cn("sm:flex-row", accountClasses.fieldRow)}>
        <Field label={copy.email}><Input type="email" value={form.email ?? ""} onChange={f.setEmail} className={accountClasses.input} /></Field>
        <Field label={copy.gender}><Chips options={f.genders} /></Field>
      </Box>
      <Field label={copy.birthPlace}>
        {renderPlace({ value: f.placeValue, onSelect: f.selectPlace, onSelectLabel: f.selectPlaceByLabel })}
        {f.placeHint ? <Text className={accountClasses.hint}>{f.placeHint}</Text> : null}
      </Field>
      <Box className={cn("sm:flex-row", accountClasses.fieldRow)}>
        <Field label={copy.birthDate}><Input value={form.birth_date ?? ""} onChange={f.setBirthDate} placeholder={copy.birthDatePlaceholder} className={accountClasses.input} /></Field>
        <Field label={copy.birthTime}><Input value={form.birth_time ?? ""} onChange={f.setBirthTime} placeholder={copy.birthTimePlaceholder} className={accountClasses.input} /></Field>
        <Field label={copy.calendar}><Chips options={f.eras} /></Field>
      </Box>
      <Box className={accountClasses.checkRow} nativeClassName="flex-row">
        <Switch value={!!form.is_default} onValueChange={f.setDefault} />
        <Text className={accountClasses.checkText}>{copy.setDefault}</Text>
      </Box>
      {f.error ? <Text className={accountClasses.formError}>{f.error}</Text> : null}
      <Box className={accountClasses.formActions} nativeClassName="flex-row">
        <Button variant="ghost" label={copy.cancel} onPress={onCancel} disabled={f.busy} />
        <Button label={copy.submit} onPress={() => void f.submit()} disabled={f.busy} />
      </Box>
    </Box>
  );
}

function SelectField({ field, renderSelect }: { field: HouseSelectArgs; renderSelect?: HouseRequirementsFormProps["renderSelect"] }) {
  if (renderSelect) return <>{renderSelect(field)}</>;
  return (
    <Box className="min-w-0 flex-1 basis-[45%]">
      <Text className={vastuClasses.fieldLabel}>{field.label}</Text>
      <Text className={vastuClasses.selectControl}>{field.options.find((option) => option.id === field.value)?.label ?? field.value}</Text>
    </Box>
  );
}

function SpaceChips({ chips }: { chips: { id: string; label: string; on: boolean; toggle: () => void }[] }) {
  return (
    <Box className={vastuClasses.chipRow} nativeClassName="flex-row flex-wrap">
      {chips.map((chip) => (
        <Pressable key={chip.id} onPress={chip.toggle} selected={chip.on} className={cn(vastuClasses.spaceChip, chip.on ? vastuClasses.spaceChipOn : vastuClasses.spaceChipOff)}>
          <Text className={cn(vastuClasses.spaceChipText, chip.on ? vastuClasses.spaceChipTextOn : vastuClasses.spaceChipTextOff)}>{chip.label}</Text>
        </Pressable>
      ))}
    </Box>
  );
}

export function HouseRequirementsForm({ plan, onChange, renderSelect }: HouseRequirementsFormProps) {
  const v = useHouseRequirements({ plan, onChange });
  return (
    <Box className="gap-4">
      <Box>
        <Text className={vastuClasses.requirementsHeading}>{v.copy.heading}</Text>
        <Text className={vastuClasses.requirementsBlurb}>{v.copy.blurb}</Text>
      </Box>
      <Box nativeClassName="flex-row flex-wrap" className="gap-3">
        {v.fields.map((field) => <SelectField key={field.id} field={field} renderSelect={renderSelect} />)}
      </Box>
      <Box>
        <Text className={vastuClasses.groupLabel}>{v.copy.essential}</Text>
        <SpaceChips chips={v.essential} />
        <Pressable onPress={v.combine.toggle} className={vastuClasses.checkboxRow} nativeClassName="flex-row">
          <Text className={vastuClasses.checkboxTitle}>{v.combine.checked ? "✓ " : ""}{v.combine.title}</Text>
          <Text className={vastuClasses.checkboxNote}>{v.combine.note}</Text>
        </Pressable>
        <Text className={cn(vastuClasses.groupLabel, "mt-3")}>{v.copy.optional}</Text>
        <SpaceChips chips={v.optional} />
      </Box>
      {v.floorFields.length > 0 ? (
        <Box nativeClassName="flex-row flex-wrap" className="gap-3">
          {v.floorFields.map((field) => <SelectField key={field.id} field={field} renderSelect={renderSelect} />)}
        </Box>
      ) : null}
    </Box>
  );
}

export function OwnerCompatibility({ fetchDay, renderProfile, renderPlace, renderSelect }: OwnerCompatibilityProps) {
  const v = useOwnerCompatibility({ fetchDay });
  const date = v.dateParts;
  return (
    <Box className={vastuClasses.ownerCard}>
      <Box className={vastuClasses.ownerHeader} nativeClassName="flex-row">
        <Icon node={iconCalendarClock} size={16} tone="secondary" />
        <Text className={vastuClasses.ownerHeading}>{v.copy.heading}</Text>
      </Box>
      <Box className={vastuClasses.ownerBody}>
        <Text className={vastuClasses.planBlurb}>{v.copy.blurb}</Text>
        {renderProfile({ selectedId: v.selectedProfile?.id ?? null, onSelect: v.setSelectedProfile })}
        {v.hasProfile ? (
          <>
            <Text className={vastuClasses.fieldLabel}>{v.copy.dateLabel}</Text>
            <Box nativeClassName="flex-row" className="gap-2">
              {renderSelect ? (
                <>
                  {renderSelect({ id: "year", label: v.copy.dateLabel, value: date.year, onChange: date.setYear, options: date.yearOptions.map((o) => ({ id: o.value, label: o.label })) })}
                  {renderSelect({ id: "month", label: v.copy.dateLabel, value: date.month, onChange: date.setMonth, options: date.monthOptions.map((o) => ({ id: o.value, label: o.label })) })}
                  {renderSelect({ id: "day", label: v.copy.dateLabel, value: date.day, onChange: date.setDay, options: date.dayOptions.map((o) => ({ id: o.value, label: o.label })) })}
                </>
              ) : (
                <Text>{v.candidateDate}</Text>
              )}
            </Box>
            <Text className={vastuClasses.fieldLabel}>{v.copy.placeLabel}</Text>
            {renderPlace({ location: v.plotLocation, onChange: v.setPlotLocation })}
            {v.status ? <Text className={vastuClasses.mutedNote}>{v.status}</Text> : null}
            {v.error ? <Text className={vastuClasses.destructiveText}>{v.error}</Text> : null}
            {v.result ? (
              <Box className={cn(vastuClasses.ownerResult, patroNavataraToneBg(v.result.tone))}>
                <Text className={vastuClasses.ownerResultTitle}>{v.result.title}</Text>
                <Text className={vastuClasses.ownerResultVerdict}>{v.result.verdict}</Text>
                <Text className={vastuClasses.infoDisclaimer}>{v.result.disclaimer}</Text>
              </Box>
            ) : null}
          </>
        ) : null}
      </Box>
    </Box>
  );
}

const milan = kundaliDetailClasses.milanResult;
const REC: Record<AshtakutaResult["recommendation"], string> = {
  excellent: milan.recExcellent,
  very_good: milan.recVeryGood,
  middling: milan.recMiddling,
  inauspicious: milan.recInauspicious,
};

export function KundaliMilanResult({ boyName, girlName, result }: KundaliMilanResultProps) {
  const view = useKundaliMilanResult({ boyName, girlName, result });
  return (
    <Box className={milan.root}>
      <Box className={milan.card}>
        <Box className={milan.totalRow} nativeClassName="flex-row">
          <Box>
            <Text className={milan.eyebrow}>{view.copy.totalGuna}</Text>
            <Text className={cn(milan.recommendation, REC[view.recommendation])}>{view.recommendationLabel}</Text>
          </Box>
          <Box>
            <Text className={milan.totalValue}>{view.total}<Text className={milan.totalMax}>{view.totalMax}</Text></Text>
            <Text className={milan.gunaLabel}>{view.copy.guna}</Text>
          </Box>
        </Box>
        {view.partners.map((partner) => (
          <Text key={partner.label} className={milan.partner}>{partner.label}: <Text className={milan.partnerName}>{partner.name}</Text></Text>
        ))}
        {view.advisory ? (
          <Box className={milan.advisory}>
            <Text className={milan.advisoryTitle}>{view.advisory.title}</Text>
            <Text className={milan.advisoryText}>{view.advisory.text}</Text>
          </Box>
        ) : null}
      </Box>
      <Box className={milan.card}>
        <Text className={milan.cardTitle}>{view.copy.doshaTitle}</Text>
        {view.doshas.map((dosha) => (
          <Box key={dosha.id} className={milan.doshaRow} nativeClassName="flex-row">
            <Text className={milan.doshaLabel}>{dosha.label}{dosha.alt ? ` ${dosha.alt}` : ""}</Text>
            <Text className={cn(milan.doshaVerdict, dosha.present ? milan.doshaPresent : milan.doshaAbsent)}>{dosha.verdict}</Text>
          </Box>
        ))}
      </Box>
      <Box className={milan.tableCard}>
        {view.kutas.map((kuta) => (
          <Box key={kuta.id}>
            <Pressable onPress={kuta.toggle} className="flex-row items-center gap-2 py-2">
              <Icon node={kuta.open ? iconChevronDown : iconChevronRight} size={16} tone="muted" />
              <Text className="flex-1">{kuta.label}</Text>
              <Text>{kuta.obtained}/{kuta.max}</Text>
            </Pressable>
            {kuta.open ? (
              <Box className={milan.panel}>
                <Text className={milan.panelTitle}>{kuta.detail.title}</Text>
                <Text className={milan.panelInfo}>{kuta.detail.info}</Text>
                <Text>{kuta.boyValue}</Text>
                <Text>{kuta.girlValue}</Text>
              </Box>
            ) : null}
          </Box>
        ))}
        <Text className={milan.tableFootnote}>{view.footnote}</Text>
      </Box>
      <Box className={milan.card}>
        <Text className={milan.cardTitle}>{view.copy.notesTitle}</Text>
        {view.notes.map((note) => <Text key={note.slice(0, 40)} className={milan.noteText}>{note}</Text>)}
      </Box>
    </Box>
  );
}

const pickerCard = kundaliDetailClasses.profilePicker;

export function KundaliProfilePicker({ selectedId, onSelect, bindOpen, onPrefetch, renderForm }: KundaliProfilePickerProps) {
  const picker = useKundaliProfilePicker({ selectedId, onSelect });
  useEffect(() => {
    bindOpen?.(picker.openAdd);
  }, [bindOpen, picker.openAdd]);
  if (picker.status === "loading") {
    return (
      <Box className={kundaliDetailClasses.milanPicker.loadingBox} nativeClassName="flex-row">
        <Icon node={iconLoader} size={16} tone="muted" />
        <Text>{picker.loadingText}</Text>
      </Box>
    );
  }
  if (picker.status === "error") return <Text className={kundaliDetailClasses.milanPicker.errorText}>{picker.errorText}</Text>;
  const rowIcon = { dob: iconClock, place: iconMapPin, latLon: iconNavigation, timezone: iconGlobe } as const;
  return (
    <>
      {picker.cards.length === 0 ? (
        <Box className={kundaliDetailClasses.milanPicker.emptyBoxCentered}>
          <Text>{picker.empty.title}</Text>
          <Text>{picker.empty.hint}</Text>
          <Button label={picker.empty.action} onPress={picker.openAdd} icon={<Icon node={iconSparkles} size={16} tone="foreground" />} />
        </Box>
      ) : (
        <Box className="gap-3">
          {picker.cards.map((card) => (
            <Box key={card.id} className={cn(pickerCard.card, card.active ? pickerCard.cardActive : pickerCard.cardIdle)}>
              <Box className={pickerCard.head} nativeClassName="flex-row">
                <Box className="min-w-0 flex-1">
                  <Text className={pickerCard.nameText}>{card.name}</Text>
                  {card.isDefault ? <Icon node={iconStar} size={14} tone="secondary" /> : null}
                  {card.gender ? <Text className={pickerCard.gender}>{card.gender}</Text> : null}
                </Box>
                <Pressable onPress={card.edit} label={picker.editLabel}><Icon node={iconPencil} size={16} tone="muted" /></Pressable>
              </Box>
              {(["dob", "place", "latLon", "timezone"] as const).map((key) => (
                <Box key={key} className={pickerCard.row} nativeClassName="flex-row">
                  <Icon node={rowIcon[key]} size={14} tone="muted" />
                  <Text className={pickerCard.rowLabel}>{card.rows[key].label}:</Text>
                  <Text className={pickerCard.rowValue}>{card.rows[key].value}</Text>
                </Box>
              ))}
              <Button label={card.viewLabel} onPress={() => { onPrefetch?.(card.id); card.view(); }} variant={card.active ? "default" : "outline"} size="sm" className="mt-auto w-full" />
            </Box>
          ))}
        </Box>
      )}
      <Sheet open={picker.dialogOpen} onClose={picker.closeDialog} title={picker.dialogTitle}>
        {picker.dialog ? (
          <>
            <Text>{picker.dialogHint}</Text>
            {renderForm({
              initial: picker.dialog.existing ? profileToInput(picker.dialog.existing) : EMPTY_PROFILE,
              existing: picker.dialog.existing,
              onCancel: picker.closeDialog,
              onSaved: (saved) => void picker.dialog?.onSaved(saved),
            })}
          </>
        ) : null}
      </Sheet>
    </>
  );
}
