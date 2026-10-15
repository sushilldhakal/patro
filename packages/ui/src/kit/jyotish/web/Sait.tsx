import type { ReactNode } from "react";
import { cn } from "@vedic-patro/domain/utils";
import { SUITABILITY_STYLE } from "@vedic-patro/domain/sait-suitability";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";
import { useSaitAside } from "@vedic-patro/features/home";
import { saitDayKey, useSaitCeremonyList, useSaitDayCard, useSaitProfilePicker } from "@vedic-patro/features/sait";
import { Box, Icon, Text } from "@vedic-patro/ui";
import type { SaitAsidePanelProps, SaitCeremonyLayoutProps, SaitDayCardProps, SaitProfilePickerProps } from "../contract";
import { iconBaby, iconChevronRight, iconClock3, iconCompass, iconUserRound } from "../icons";
import { SuitabilityBadge } from "./SaitSuitability";
import { SaitRulesSection } from "./SaitRulesSection";

function chip(tone: keyof typeof saitClasses.toneChip) {
  return cn(saitClasses.chip, "inline-flex", saitClasses.chipText, saitClasses.toneChip[tone], saitClasses.toneChipText[tone]);
}

export function SaitDayCard({ d, index = 0, suitability, personalize }: SaitDayCardProps) {
  const card = useSaitDayCard({ d, personalize });
  return (
    <article
      className={cn(saitClasses.card, "animate-in fade-in fill-mode-both", suitability ? SUITABILITY_STYLE[suitability].ring : null)}
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      {suitability ? (
        <Box className={saitClasses.cardBadgeRow}>
          <SuitabilityBadge suitability={suitability} />
        </Box>
      ) : null}
      <Box className={saitClasses.cardHead}>
        <Box className={saitClasses.dateBox}>
          <Text as="span" className={saitClasses.dateMonth}>{card.month}</Text>
          <Text as="span" className={saitClasses.dateDay}>{card.day}</Text>
        </Box>
        <Box className={saitClasses.headBody}>
          <Box className={saitClasses.titleRow}>
            <Text as="h3" className={cn("m-0", saitClasses.weekday)}>{card.weekday}</Text>
            <Text as="span" className={saitClasses.gregorian}>{card.gregorian}</Text>
          </Box>
          <Box className={cn(saitClasses.windowChip, "inline-flex w-fit", saitClasses.windowText)}>
            <Icon node={iconClock3} size={14} tone="secondary" className="opacity-80" />
            <Text as="span" className={saitClasses.windowTime}>{card.window}</Text>
            <Text as="span" className={cn("hidden sm:inline", saitClasses.windowNote)}>{card.windowNote}</Text>
          </Box>
        </Box>
      </Box>
      <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3", saitClasses.facts)}>
        {card.facts.map((fact) => (
          <Box key={fact.label} className={saitClasses.factItem}>
            <dt className={saitClasses.factLabel}>{fact.label}</dt>
            <dd className={cn("m-0 truncate", saitClasses.factValue)}>{fact.value}</dd>
          </Box>
        ))}
      </dl>
      {card.shuddhi ? (
        <Box className={saitClasses.block}>
          <Box className={saitClasses.blockRow}>
            <Text as="span" className={saitClasses.blockLabel}>{card.shuddhi.label}</Text>
            {card.shuddhi.planets.map((planet) => (
              <span key={planet.key} title={planet.title} className={cn(chip(planet.tone), saitClasses.chipGap, saitClasses.chipNum)}>
                {planet.name}
                <span>{planet.house}</span>
              </span>
            ))}
          </Box>
          <Text as="p" className={cn("m-0", saitClasses.summary, saitClasses.toneText[card.shuddhi.tone])}>
            {card.shuddhi.summary}
            <Text as="span" className={cn("ml-1", saitClasses.summaryNote)}>{card.shuddhi.note}</Text>
          </Text>
        </Box>
      ) : null}
      {card.kumbha ? (
        <Box className={saitClasses.block}>
          <Box className={saitClasses.blockRowLoose}>
            <Text as="span" className={cn(saitClasses.blockIconLabel, "inline-flex", saitClasses.blockLabel)}>
              <Icon node={iconCompass} size={14} tone="muted" className="opacity-80" />
              {card.kumbha.label}
            </Text>
            <span className={chip(card.kumbha.tone)}>{card.kumbha.zone}</span>
          </Box>
          <Text as="p" className={cn("m-0", saitClasses.summary, saitClasses.toneText[card.kumbha.tone])}>
            {card.kumbha.effect}
            <Text as="span" className={cn("ml-1", saitClasses.summaryNote)}>{card.kumbha.note}</Text>
          </Text>
        </Box>
      ) : null}
      {card.anna ? (
        <Box className={saitClasses.block}>
          <Box className={saitClasses.blockRowLoose}>
            <Text as="span" className={cn(saitClasses.blockIconLabel, "inline-flex", saitClasses.blockLabel)}>
              <Icon node={iconBaby} size={14} tone="muted" className="opacity-80" />
              {card.anna.label}
            </Text>
            <span className={cn(chip(card.anna.tone), saitClasses.chipNum)}>{card.anna.month}</span>
          </Box>
          <Text as="p" className={cn("m-0", saitClasses.summary, saitClasses.toneText[card.anna.tone])}>{card.anna.summary}</Text>
        </Box>
      ) : null}
    </article>
  );
}

function PickerLabel({ text }: { text: string }) {
  return (
    <Text as="span" className={cn(saitClasses.pickerLabel, "inline-flex", saitClasses.pickerLabelText)}>
      <Icon node={iconUserRound} size={16} tone="secondary" />
      {text}
    </Text>
  );
}

export function SaitProfilePicker({ selectedId, onSelect, isAuthenticated, renderAuth }: SaitProfilePickerProps) {
  const picker = useSaitProfilePicker({ isAuthenticated, selectedId, onSelect });
  const { copy } = picker;
  if (picker.status === "guest") {
    return (
      <Box className={saitClasses.pickerRow}>
        <PickerLabel text={copy.label} />
        <button type="button" onClick={picker.openAuth} className={cn(saitClasses.pickerSignIn, saitClasses.pickerSignInText, "hover:bg-surface-muted")}>
          {copy.signIn}
        </button>
        {renderAuth({ open: picker.authOpen, onOpenChange: picker.setAuthOpen })}
      </Box>
    );
  }
  if (picker.status === "empty") {
    return (
      <Box className={saitClasses.pickerRow}>
        <PickerLabel text={copy.label} />
        <Text as="span" className={saitClasses.pickerHint}>{copy.empty}</Text>
      </Box>
    );
  }
  return (
    <Box className={saitClasses.pickerRow}>
      <PickerLabel text={copy.label} />
      <select
        value={selectedId ?? ""}
        disabled={picker.loading}
        onChange={(event) => picker.select(event.target.value || null)}
        className={cn(saitClasses.pickerSelect, saitClasses.pickerSelectText, "focus:outline-none focus:ring-2 focus:ring-primary/40")}
      >
        {picker.options.map((option) => (
          <option key={option.id ?? ""} value={option.id ?? ""}>
            {option.id == null && picker.loading ? copy.loading : option.name}
          </option>
        ))}
      </select>
    </Box>
  );
}

const DAY_GRID = cn("grid sm:grid-cols-2 lg:grid-cols-3", saitClasses.dayGrid);

export function SaitCeremonyLayout({
  year, method, rules, engineVersion, enabledRuleIds, onToggleRule, rulesBusy = false,
  nakshatraMode = null, onNakshatraModeChange, days = [], count, profileControl, suitabilityByDay,
  personalizeByDay, loading, notice, children, emptyLabel, countLabel, footer, renderShell, renderHeader, renderYearNav, renderBack,
}: SaitCeremonyLayoutProps) {
  const list = useSaitCeremonyList({ days, count, year, emptyLabel, countLabel });
  let cardIndex = 0;
  return renderShell(
    <>
      {renderHeader()}
      <SaitRulesSection method={method} rules={rules} engineVersion={engineVersion} enabledRuleIds={enabledRuleIds} onToggleRule={onToggleRule} busy={rulesBusy} />
      {nakshatraMode && onNakshatraModeChange ? (
        <Box className={saitClasses.nakshatraRow}>
          <Text as="span" className={saitClasses.nakshatraLabel}>{list.nakshatra.label}</Text>
          <Box className={cn(saitClasses.nakshatraGroup, "inline-flex")} label={list.nakshatra.label}>
            {list.nakshatra.modes.map(({ id, label }) => {
              const active = nakshatraMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onNakshatraModeChange(id)}
                  className={cn(
                    saitClasses.nakshatraBtn,
                    saitClasses.nakshatraBtnText,
                    "transition-colors",
                    active ? cn(saitClasses.nakshatraBtnActive, saitClasses.nakshatraBtnTextActive) : cn(saitClasses.nakshatraBtnTextIdle, "hover:bg-surface-muted hover:text-foreground"),
                  )}
                >
                  {label}
                </button>
              );
            })}
          </Box>
        </Box>
      ) : null}
      {renderYearNav()}
      {!loading && list.displayCount > 0 ? <Text as="p" className={cn("m-0", saitClasses.countText)}>{list.countText}</Text> : null}
      {profileControl ? <Box className={saitClasses.profileBox}>{profileControl}</Box> : null}
      {notice}
      <section aria-busy={loading} className={saitClasses.body}>
        {children ? children : loading ? (
          <Box className={DAY_GRID}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} className={cn("animate-pulse", saitClasses.skeletonCard)} />
            ))}
          </Box>
        ) : days.length > 0 ? (
          list.months.map((month) => (
            <Box key={month.month} className={saitClasses.monthBlock}>
              <Box className={saitClasses.monthHeader}>
                <Text as="h2" className={cn("m-0", saitClasses.monthTitle)}>{month.label}</Text>
                <Text as="span" className={saitClasses.monthCount}>{month.count}</Text>
              </Box>
              <Box className={DAY_GRID}>
                {month.days.map((day) => {
                  const i = cardIndex++;
                  return (
                    <SaitDayCard
                      key={`${saitDayKey(day)}-${day.window_start}`}
                      d={day}
                      index={i}
                      suitability={suitabilityByDay?.get(saitDayKey(day))}
                      personalize={personalizeByDay?.get(saitDayKey(day))}
                    />
                  );
                })}
              </Box>
            </Box>
          ))
        ) : (
          <Text as="p" className={cn("m-0", saitClasses.emptyText)}>{list.empty}</Text>
        )}
      </section>
      {footer}
      {renderBack()}
    </>,
  );
}

export function SaitAsidePanel({ year, month, highlightDay, adYear, adMonth, location, renderLink }: SaitAsidePanelProps) {
  const sait = useSaitAside({ year, month, adYear, adMonth, highlightDay, location });
  const rowClass = cn(homeClasses.saitRow, "text-sm leading-snug transition-colors hover:bg-surface-hover");
  let body: ReactNode;
  if (sait.status === "loading") body = <Box className={cn("animate-pulse", homeClasses.saitSkeleton)} />;
  else if (sait.status === "error") body = <Text as="p" className={cn("m-0", homeClasses.saitEmpty)}>{sait.copy.error}</Text>;
  else {
    body = (
      <>
        <ul className={cn("m-0 list-none p-0", homeClasses.saitList)}>
          {sait.rows.map((row) => (
            <li key={row.id}>
              {renderLink({
                id: row.id,
                className: rowClass,
                children: (
                  <>
                    <Text as="span" className={homeClasses.saitName}>{row.name}</Text>
                    <Text as="span" className={cn("min-w-0 flex-1", homeClasses.saitDays)}>
                      {row.days.length ? row.days.map((day, i) => (
                        <Text as="span" key={day.day}>
                          {i > 0 ? ", " : ""}
                          <Text as="span" className={cn(day.highlighted && cn(homeClasses.saitHighlight, "underline-offset-2"))}>{day.label}</Text>
                        </Text>
                      )) : <Text as="span" className={homeClasses.saitDaysNone}>{sait.copy.none}</Text>}
                    </Text>
                    <Icon node={iconChevronRight} size={14} tone="muted" />
                  </>
                ),
              })}
            </li>
          ))}
        </ul>
        {sait.empty ? <Text as="p" className={cn("m-0", homeClasses.saitEmpty)}>{sait.empty}</Text> : null}
      </>
    );
  }
  return (
    <Box className={homeClasses.saitStack}>
      <Text as="p" className={homeClasses.saitMonth}>{sait.monthName}</Text>
      {body}
    </Box>
  );
}
