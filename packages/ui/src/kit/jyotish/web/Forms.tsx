import { Fragment, useEffect } from "react";
import type { AshtakutaResult } from "@vedic-patro/api-client";
import { cn } from "@vedic-patro/domain/utils";
import { patroNavataraToneBg } from "@vedic-patro/design-tokens/classes/patro-classes";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { vastuClasses } from "@vedic-patro/design-tokens/classes/vastu-classes";
import { EMPTY_PROFILE, profileToInput, useProfileForm } from "@vedic-patro/features/account";
import { useAyanamshaSelector, useKundaliMilanResult, useKundaliProfilePicker } from "@vedic-patro/features/kundali";
import { useHouseRequirements, useOwnerCompatibility } from "@vedic-patro/features/vastu";
import { Box, Button, Icon, Input, Sheet, Text } from "@vedic-patro/ui";
import type {
  AyanamshaSelectorProps,
  HouseRequirementsFormProps,
  HouseSelectArgs,
  KundaliMilanResultProps,
  KundaliProfilePickerProps,
  OwnerCompatibilityProps,
  ProfileFormProps,
} from "../contract";
import {
  iconCalendarClock,
  iconChevronRight,
  iconClock,
  iconGlobe,
  iconLoader,
  iconMapPin,
  iconNavigation,
  iconPencil,
  iconSparkles,
  iconStar,
} from "../icons";

const labelClass = accountClasses.label;
const fieldWrap = cn("flex flex-col", accountClasses.field);
const selectClass = cn(accountClasses.select, "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50");

export function AyanamshaSelector(props: AyanamshaSelectorProps) {
  const sel = useAyanamshaSelector(props);
  return (
    <Box className={cn(kundaliDetailClasses.ayanamsha.card, "w-full overflow-hidden shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent)]")}>
      <Box className={cn(kundaliDetailClasses.ayanamsha.header, "flex flex-wrap items-baseline gap-x-2.5 gap-y-1 bg-secondary/[0.09] dark:bg-secondary/20")}>
        <Text as="span" className={kundaliDetailClasses.ayanamsha.heading}>{sel.heading}</Text>
      </Box>
      <Box className={kundaliDetailClasses.ayanamsha.body}>
        <Box className={kundaliDetailClasses.ayanamsha.chips}>
          {sel.chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              title={chip.title}
              onClick={chip.select}
              className={cn(
                kundaliDetailClasses.ayanamsha.chip,
                kundaliDetailClasses.ayanamsha.chipText,
                "inline-flex items-center transition-colors",
                chip.active
                  ? cn(kundaliDetailClasses.ayanamsha.chipActive, kundaliDetailClasses.ayanamsha.chipActiveText)
                  : cn(kundaliDetailClasses.ayanamsha.chipIdle, kundaliDetailClasses.ayanamsha.chipIdleText, "hover:bg-muted"),
              )}
            >
              {chip.label}
            </button>
          ))}
        </Box>
        <Text as="p" className={kundaliDetailClasses.ayanamsha.note}>{sel.note}</Text>
      </Box>
    </Box>
  );
}

export function ProfileForm({ initial, existing, onCancel, onSaved, afterSave, renderPlace }: ProfileFormProps) {
  const f = useProfileForm({ initial, existing, onSaved, afterSave });
  const { form, copy } = f;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void f.submit();
      }}
      className={cn("flex flex-col", accountClasses.profileForm)}
    >
      <Box className={cn("grid sm:grid-cols-2", accountClasses.fieldRow)}>
        <Box className={fieldWrap}>
          <Text as="label" className={labelClass}>{copy.fullName}</Text>
          <Input value={form.full_name} onChange={f.setName} />
        </Box>
        <Box className={fieldWrap}>
          <Text as="label" className={labelClass}>{copy.phone}</Text>
          <Input value={form.phone ?? ""} onChange={f.setPhone} placeholder={copy.phonePlaceholder} />
        </Box>
        <Box className={fieldWrap}>
          <Text as="label" className={labelClass}>{copy.email}</Text>
          <Input type="email" value={form.email ?? ""} onChange={f.setEmail} />
        </Box>
        <Box className={fieldWrap}>
          <Text as="label" className={labelClass}>{copy.gender}</Text>
          <select value={form.gender ?? ""} onChange={(event) => f.setGender(event.target.value)} className={selectClass}>
            <option value="">—</option>
            {f.genders.map((gender) => (
              <option key={gender.value} value={gender.value}>{gender.label}</option>
            ))}
          </select>
        </Box>
      </Box>
      <Box className={fieldWrap}>
        <Text as="label" className={labelClass}>{copy.birthPlace}</Text>
        {renderPlace({ value: f.placeValue, onSelect: f.selectPlace, onSelectLabel: f.selectPlaceByLabel })}
        {f.placeHint ? <Text as="p" className={accountClasses.hint}>{f.placeHint}</Text> : null}
      </Box>
      <Box className={cn("grid sm:grid-cols-3", accountClasses.fieldRow)}>
        <Box className={fieldWrap}>
          <Text as="label" className={labelClass}>{copy.birthDate}</Text>
          <Input value={form.birth_date ?? ""} onChange={f.setBirthDate} placeholder={copy.birthDatePlaceholder} />
        </Box>
        <Box className={fieldWrap}>
          <Text as="label" className={labelClass}>{copy.birthTime}</Text>
          <Input value={form.birth_time ?? ""} onChange={f.setBirthTime} placeholder={copy.birthTimePlaceholder} />
        </Box>
        <Box className={fieldWrap}>
          <Text as="label" className={labelClass}>{copy.calendar}</Text>
          <select value={form.birth_era ?? "bs"} onChange={(event) => f.setEra(event.target.value)} className={selectClass}>
            {f.eras.map((era) => (
              <option key={era.value} value={era.value}>{era.label}</option>
            ))}
          </select>
        </Box>
      </Box>
      <label className={cn("flex", accountClasses.checkRow, accountClasses.checkText)}>
        <input type="checkbox" checked={!!form.is_default} onChange={(event) => f.setDefault(event.target.checked)} className="size-4 accent-[var(--secondary)]" />
        {copy.setDefault}
      </label>
      {f.error ? <Text as="p" className={accountClasses.formError}>{f.error}</Text> : null}
      <Box className={cn("flex", accountClasses.formActions)}>
        <Button type="button" variant="ghost" label={copy.cancel} onPress={onCancel} disabled={f.busy} />
        <Button type="submit" label={copy.submit} disabled={f.busy} />
      </Box>
    </form>
  );
}

function SelectField({ field, renderSelect }: { field: HouseSelectArgs; renderSelect?: HouseRequirementsFormProps["renderSelect"] }) {
  if (renderSelect) return <>{renderSelect(field)}</>;
  return (
    <Box className="min-w-0">
      <label htmlFor={field.id} className={cn(vastuClasses.fieldLabel, "block")}>{field.label}</label>
      <select id={field.id} className={cn(vastuClasses.selectControl, "w-full cursor-pointer")} value={field.value} onChange={(event) => field.onChange(event.target.value)}>
        {field.options.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
    </Box>
  );
}

function SpaceChips({ chips }: { chips: { id: string; label: string; on: boolean; toggle: () => void }[] }) {
  return (
    <Box className={vastuClasses.chipRow}>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          aria-pressed={chip.on}
          onClick={chip.toggle}
          className={cn(vastuClasses.spaceChip, vastuClasses.spaceChipText, chip.on ? cn(vastuClasses.spaceChipOn, vastuClasses.spaceChipTextOn) : cn(vastuClasses.spaceChipOff, vastuClasses.spaceChipTextOff, "hover:text-foreground"))}
        >
          {chip.label}
        </button>
      ))}
    </Box>
  );
}

export function HouseRequirementsForm({ plan, onChange, renderSelect }: HouseRequirementsFormProps) {
  const v = useHouseRequirements({ plan, onChange });
  return (
    <Box className="space-y-4">
      <Box>
        <Text as="h3" className={vastuClasses.requirementsHeading}>{v.copy.heading}</Text>
        <Text as="p" className={vastuClasses.requirementsBlurb}>{v.copy.blurb}</Text>
      </Box>
      <Box className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {v.fields.map((field) => <SelectField key={field.id} field={field} renderSelect={renderSelect} />)}
      </Box>
      <Box>
        <Text as="p" className={vastuClasses.groupLabel}>{v.copy.essential}</Text>
        <SpaceChips chips={v.essential} />
        <label className={cn(vastuClasses.checkboxRow, "text-xs")}>
          <input type="checkbox" className="mt-0.5" checked={v.combine.checked} onChange={v.combine.toggle} />
          <span>
            <span className={cn(vastuClasses.checkboxTitle, "block")}>{v.combine.title}</span>
            <span className={cn(vastuClasses.checkboxNote, "block")}>{v.combine.note}</span>
          </span>
        </label>
        <Text as="p" className={cn(vastuClasses.groupLabel, "mt-3")}>{v.copy.optional}</Text>
        <SpaceChips chips={v.optional} />
      </Box>
      {v.floorFields.length > 0 ? (
        <Box className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {v.floorFields.map((field) => <SelectField key={field.id} field={field} renderSelect={renderSelect} />)}
        </Box>
      ) : null}
    </Box>
  );
}

export function OwnerCompatibility({ fetchDay, renderProfile, renderPlace }: OwnerCompatibilityProps) {
  const v = useOwnerCompatibility({ fetchDay });
  return (
    <Box className={vastuClasses.ownerCard}>
      <Box className={vastuClasses.ownerHeader}>
        <Icon node={iconCalendarClock} size={16} tone="secondary" />
        <Text as="h3" className={vastuClasses.ownerHeading}>{v.copy.heading}</Text>
      </Box>
      <Box className={vastuClasses.ownerBody}>
        <Text as="p" className={vastuClasses.planBlurb}>{v.copy.blurb}</Text>
        {renderProfile({ selectedId: v.selectedProfile?.id ?? null, onSelect: v.setSelectedProfile })}
        {v.hasProfile ? (
          <>
            <Box className="grid gap-3 sm:grid-cols-2">
              <Box>
                <label htmlFor="vastu-construction-date" className={cn(vastuClasses.fieldLabel, "block")}>{v.copy.dateLabel}</label>
                <input id="vastu-construction-date" type="date" value={v.candidateDate} onChange={(event) => v.setCandidateDate(event.target.value)} className={vastuClasses.dateControl} />
              </Box>
              <Box>
                <Text as="p" className={vastuClasses.fieldLabel}>{v.copy.placeLabel}</Text>
                {renderPlace({ location: v.plotLocation, onChange: v.setPlotLocation })}
              </Box>
            </Box>
            {v.status ? <Text as="p" className={vastuClasses.mutedNote}>{v.status}</Text> : null}
            {v.error ? <Text as="p" className={vastuClasses.destructiveText}>{v.error}</Text> : null}
            {v.result ? (
              <Box className={cn(vastuClasses.ownerResult, patroNavataraToneBg(v.result.tone))}>
                <Text as="p" className={vastuClasses.ownerResultTitle}>{v.result.title}</Text>
                <Text as="p" className={vastuClasses.ownerResultVerdict}>{v.result.verdict}</Text>
                <Text as="p" className={vastuClasses.infoDisclaimer}>{v.result.disclaimer}</Text>
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
      <section className={cn(milan.card, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_8%,transparent)]")}>
        <Box className={milan.totalRow}>
          <Box>
            <Text as="p" className={milan.eyebrow}>{view.copy.totalGuna}</Text>
            <Text as="p" className={cn(milan.recommendation, REC[view.recommendation])}>{view.recommendationLabel}</Text>
          </Box>
          <Box className="text-right">
            <Text as="p" className={milan.totalValue}>{view.total}<Text as="span" className={milan.totalMax}>{view.totalMax}</Text></Text>
            <Text as="p" className={milan.gunaLabel}>{view.copy.guna}</Text>
          </Box>
        </Box>
        <Box className={cn(milan.partners, milan.partnerText)}>
          {view.partners.map((partner) => (
            <Text as="span" key={partner.label} className={milan.partner}>
              <Text as="span">{partner.label}:</Text> <Text as="span" className={milan.partnerName}>{partner.name}</Text>
            </Text>
          ))}
        </Box>
        {view.advisory ? (
          <Box className={cn(milan.advisory, milan.advisoryText)} label={view.advisory.title}>
            <Text as="p" className={milan.advisoryTitle}>{view.advisory.title}</Text>
            <Text as="p">{view.advisory.text}</Text>
          </Box>
        ) : null}
      </section>
      <section className={milan.card}>
        <Text as="h3" className={cn(milan.cardTitle, "mb-4")}>{view.copy.doshaTitle}</Text>
        <ul className="divide-y divide-border/70">
          {view.doshas.map((dosha) => (
            <li key={dosha.id} className={cn(milan.doshaRow, "first:pt-0 last:pb-0")}>
              <Text as="span" className={milan.doshaLabel}>
                {dosha.label}
                {dosha.alt ? <Text as="span" className={milan.doshaLabelAlt}> {dosha.alt}</Text> : null}
              </Text>
              <Text as="span" className={cn(milan.doshaVerdict, dosha.present ? milan.doshaPresent : milan.doshaAbsent)}>{dosha.verdict}</Text>
            </li>
          ))}
        </ul>
      </section>
      <section className={milan.tableCard}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30">
              <th className="w-8" />
              {view.columns.map((column, index) => (
                <th key={index} className={cn("px-2 py-2 text-left font-medium", (index === 1 || index === 2) && "text-center")}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.kutas.map((kuta) => (
              <Fragment key={kuta.id}>
                <tr className="cursor-pointer" onClick={kuta.toggle}>
                  <td className="py-2"><Icon node={iconChevronRight} size={16} tone="muted" webClassName={cn("transition-transform", kuta.open && "rotate-90")} /></td>
                  <td className="text-base">{kuta.label}</td>
                  <td className="text-center tabular-nums">{kuta.max}</td>
                  <td className="text-center font-semibold tabular-nums">{kuta.obtained}</td>
                  <td>{kuta.boyValue}</td>
                  <td>{kuta.girlValue}</td>
                  <td>{kuta.area}</td>
                </tr>
                {kuta.open ? (
                  <tr>
                    <td colSpan={7} className="p-3 pt-0">
                      <Box className={milan.panel}>
                        <Text as="p" className={milan.panelTitle}>{kuta.detail.title}</Text>
                        <Text as="p" className={milan.panelPoints}>{kuta.detail.pointsLabel} <Text as="span" className={milan.panelPointsValue}>{kuta.detail.points}</Text></Text>
                        <Box className={cn(milan.panelPeople, "grid sm:grid-cols-2")}>
                          {kuta.detail.people.map((person, index) => (
                            <Box key={index} className={milan.panelPerson}>
                              <Text as="p" className={milan.panelPersonName}>{person.who}</Text>
                              <Text as="p" className={milan.panelPersonValue}>{person.value}</Text>
                            </Box>
                          ))}
                        </Box>
                        <Text as="p" className={milan.panelInfo}>{kuta.detail.info}</Text>
                      </Box>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
        <Text as="p" className={milan.tableFootnote}>{view.footnote}</Text>
      </section>
      <section className={milan.card}>
        <Text as="h3" className={cn(milan.cardTitle, "mb-3")}>{view.copy.notesTitle}</Text>
        <ul className={cn("list-disc space-y-2 pl-5", milan.noteText)}>
          {view.notes.map((note) => <li key={note.slice(0, 40)}>{note}</li>)}
        </ul>
      </section>
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
      <Box className={cn(kundaliDetailClasses.milanPicker.loadingBox, "flex text-sm")}>
        <Icon node={iconLoader} size={16} tone="muted" webClassName="animate-spin" />
        <Text as="span">{picker.loadingText}</Text>
      </Box>
    );
  }
  if (picker.status === "error") {
    return <Text as="p" className={cn(kundaliDetailClasses.milanPicker.errorBox, kundaliDetailClasses.milanPicker.errorText)}>{picker.errorText}</Text>;
  }
  const rowIcon = { dob: iconClock, place: iconMapPin, latLon: iconNavigation, timezone: iconGlobe } as const;
  return (
    <>
      {picker.cards.length === 0 ? (
        <Box className={kundaliDetailClasses.milanPicker.emptyBoxCentered}>
          <Text as="p" className="text-sm text-foreground">{picker.empty.title}</Text>
          <Text as="p" className="mx-auto mt-1 max-w-md text-sm">{picker.empty.hint}</Text>
          <Button label={picker.empty.action} onPress={picker.openAdd} icon={<Icon node={iconSparkles} size={16} tone="foreground" />} className="mt-4" />
        </Box>
      ) : (
        <Box className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {picker.cards.map((card) => (
            <div
              key={card.id}
              onMouseEnter={() => onPrefetch?.(card.id)}
              onFocus={() => onPrefetch?.(card.id)}
            >
            <Box
              className={cn(pickerCard.card, "transition-colors", card.active ? cn(pickerCard.cardActive, "ring-1 ring-secondary/40") : pickerCard.cardIdle)}
              webClassName=""
            >
              <Box className={pickerCard.head} label={card.name}>
                <Box className="min-w-0">
                  <Box className={cn(pickerCard.nameRow, pickerCard.nameText, "flex")}>
                    <Text as="span" className="truncate">{card.name}</Text>
                    {card.isDefault ? <Icon node={iconStar} size={14} tone="secondary" /> : null}
                  </Box>
                  {card.gender ? <Text as="span" className={pickerCard.gender}>{card.gender}</Text> : null}
                </Box>
                <Button variant="ghost" size="sm" label={picker.editLabel} onPress={card.edit} icon={<Icon node={iconPencil} size={16} tone="muted" />} />
              </Box>
              <Box className={cn(pickerCard.rows, "text-xs")}>
                {(["dob", "place", "latLon", "timezone"] as const).map((key) => (
                  <Box key={key} className={cn(pickerCard.row, "flex")}>
                    <Icon node={rowIcon[key]} size={14} tone="muted" />
                    <Text as="span" className={pickerCard.rowLabel}>{card.rows[key].label}:</Text>
                    <Text as="span" className={cn(pickerCard.rowValue, "break-words")}>{card.rows[key].value}</Text>
                  </Box>
                ))}
              </Box>
              <Button label={card.viewLabel} onPress={card.view} variant={card.active ? "default" : "outline"} size="sm" icon={<Icon node={iconSparkles} size={14} tone="foreground" />} className="mt-auto w-full" />
            </Box>
            </div>
          ))}
        </Box>
      )}
      <Sheet open={picker.dialogOpen} onClose={picker.closeDialog} title={picker.dialogTitle}>
        {picker.dialog ? (
          <>
            <Text as="p">{picker.dialogHint}</Text>
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
