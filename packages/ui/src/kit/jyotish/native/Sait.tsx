import { useWindowDimensions } from "react-native";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@vedic-patro/design-tokens/cn";
import { SUITABILITY_STYLE } from "@vedic-patro/design-tokens/classes/sait-suitability-classes";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";
import { useSaitAside } from "@vedic-patro/features/home";
import { saitDayKey, useSaitCeremonyList, useSaitDayCard, useSaitProfilePicker } from "@vedic-patro/features/sait";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import type { SaitAsidePanelProps, SaitCeremonyLayoutProps, SaitDayCardProps, SaitProfilePickerProps } from "../contract";
import { iconBaby, iconChevronDown, iconChevronRight, iconChevronUp, iconClock3, iconCompass, iconUserRound } from "../icons";
import { SuitabilityBadge } from "./SaitSuitability";
import { SaitRulesSection } from "./SaitRulesSection";

/**
 * A year of muhurta days is often 100+ cards. Mounting every month in one frame
 * held the screen blank, so the first months draw at once and the rest follow
 * once the JS thread is idle (or after a short cap, if it never is).
 */
function useStagedMonths<T>(months: T[], first: number): T[] {
  const [all, setAll] = useState(false);
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setAll(true);
      }
    };
    const idle = requestIdleCallback(finish, { timeout: 400 });
    return () => {
      done = true;
      cancelIdleCallback(idle);
    };
  }, []);
  return all ? months : months.slice(0, first);
}

function columnsFor(width: number) {
  return width >= 1024 ? 3 : width >= 640 ? 2 : 1;
}

export function SaitDayCard({ d, suitability, personalize }: SaitDayCardProps) {
  const { width } = useWindowDimensions();
  const card = useSaitDayCard({ d, personalize });
  const factWidth = width >= 640 ? 33.33 : 50;
  return (
    <Box className={cn(saitClasses.card, suitability ? SUITABILITY_STYLE[suitability].ring : null)}>
      {suitability ? (
        <Box className={saitClasses.cardBadgeRow}>
          <SuitabilityBadge suitability={suitability} />
        </Box>
      ) : null}
      <Box className={saitClasses.cardHead}>
        <Box className={saitClasses.dateBox}>
          <Text className={saitClasses.dateMonth}>{card.month}</Text>
          <Text className={saitClasses.dateDay}>{card.day}</Text>
        </Box>
        <Box className={saitClasses.headBody}>
          <Box className={saitClasses.titleRow}>
            <Text as="h3" className={saitClasses.weekday}>{card.weekday}</Text>
            <Text className={saitClasses.gregorian}>{card.gregorian}</Text>
          </Box>
          <Box className={cn(saitClasses.windowChip, "self-start", saitClasses.windowText)}>
            <Icon node={iconClock3} size={14} tone="secondary" />
            <Text className={cn(saitClasses.windowText, saitClasses.windowTime)}>{card.window}</Text>
            {width >= 640 ? <Text className={saitClasses.windowNote}>{card.windowNote}</Text> : null}
          </Box>
        </Box>
      </Box>
      <Box className={saitClasses.facts} nativeClassName="flex-row flex-wrap">
        {card.facts.map((fact) => (
          <Box key={fact.label} className={cn(saitClasses.factItem, "pb-2 pr-4")} widthPercent={factWidth}>
            <Text className={saitClasses.factLabel}>{fact.label}</Text>
            <Text numberOfLines={1} className={saitClasses.factValue}>{fact.value}</Text>
          </Box>
        ))}
      </Box>
      {card.shuddhi ? (
        <Box className={saitClasses.block}>
          <Box className={saitClasses.blockRow}>
            <Text className={saitClasses.blockLabel}>{card.shuddhi.label}</Text>
            {card.shuddhi.planets.map((planet) => (
              <Box key={planet.key} className={cn(saitClasses.chip, saitClasses.chipGap, saitClasses.toneChip[planet.tone])} label={planet.title}>
                <Text className={cn(saitClasses.chipText, saitClasses.toneChipText[planet.tone])}>{planet.name}</Text>
                <Text className={cn(saitClasses.chipText, saitClasses.chipNum, saitClasses.toneChipText[planet.tone])}>{planet.house}</Text>
              </Box>
            ))}
          </Box>
          <Text className={cn(saitClasses.summary, saitClasses.toneText[card.shuddhi.tone])}>
            {card.shuddhi.summary} <Text className={saitClasses.summaryNote}>{card.shuddhi.note}</Text>
          </Text>
        </Box>
      ) : null}
      {card.kumbha ? (
        <Box className={saitClasses.block}>
          <Box className={saitClasses.blockRowLoose}>
            <Box className={saitClasses.blockIconLabel}>
              <Icon node={iconCompass} size={14} tone="muted" />
              <Text className={saitClasses.blockLabel}>{card.kumbha.label}</Text>
            </Box>
            <Box className={cn(saitClasses.chip, saitClasses.toneChip[card.kumbha.tone])}>
              <Text className={cn(saitClasses.chipText, saitClasses.toneChipText[card.kumbha.tone])}>{card.kumbha.zone}</Text>
            </Box>
          </Box>
          <Text className={cn(saitClasses.summary, saitClasses.toneText[card.kumbha.tone])}>
            {card.kumbha.effect} <Text className={saitClasses.summaryNote}>{card.kumbha.note}</Text>
          </Text>
        </Box>
      ) : null}
      {card.anna ? (
        <Box className={saitClasses.block}>
          <Box className={saitClasses.blockRowLoose}>
            <Box className={saitClasses.blockIconLabel}>
              <Icon node={iconBaby} size={14} tone="muted" />
              <Text className={saitClasses.blockLabel}>{card.anna.label}</Text>
            </Box>
            <Box className={cn(saitClasses.chip, saitClasses.toneChip[card.anna.tone])}>
              <Text className={cn(saitClasses.chipText, saitClasses.chipNum, saitClasses.toneChipText[card.anna.tone])}>{card.anna.month}</Text>
            </Box>
          </Box>
          <Text className={cn(saitClasses.summary, saitClasses.toneText[card.anna.tone])}>{card.anna.summary}</Text>
        </Box>
      ) : null}
    </Box>
  );
}

function PickerLabel({ text }: { text: string }) {
  return (
    <Box className={saitClasses.pickerLabel} nativeClassName="flex-row">
      <Icon node={iconUserRound} size={16} tone="secondary" />
      <Text className={saitClasses.pickerLabelText}>{text}</Text>
    </Box>
  );
}

export function SaitProfilePicker({ selectedId, onSelect, isAuthenticated, renderAuth }: SaitProfilePickerProps) {
  const picker = useSaitProfilePicker({ isAuthenticated, selectedId, onSelect });
  const { copy, menuOpen } = picker;
  if (picker.status === "guest") {
    return (
      <Box className={saitClasses.pickerRow}>
        <PickerLabel text={copy.label} />
        <Pressable onPress={picker.openAuth} className={saitClasses.pickerSignIn}>
          <Text className={saitClasses.pickerSignInText}>{copy.signIn}</Text>
        </Pressable>
        {renderAuth({ open: picker.authOpen, onOpenChange: picker.setAuthOpen })}
      </Box>
    );
  }
  if (picker.status === "empty") {
    return (
      <Box className={saitClasses.pickerRow}>
        <PickerLabel text={copy.label} />
        <Text className={saitClasses.pickerHint}>{copy.empty}</Text>
      </Box>
    );
  }
  return (
    <Box className="items-center gap-1">
      <Box className={saitClasses.pickerRow}>
        <PickerLabel text={copy.label} />
        <Pressable onPress={picker.toggleMenu} disabled={picker.loading} className={cn(saitClasses.pickerSelect, "flex-row items-center justify-between gap-2")}>
          <Text className={cn("flex-1", saitClasses.pickerSelectText)} numberOfLines={1}>{picker.current}</Text>
          <Icon node={menuOpen ? iconChevronUp : iconChevronDown} size={14} tone="muted" />
        </Pressable>
      </Box>
      {menuOpen && picker.status === "ready" ? (
        <Box className="w-full max-w-sm overflow-hidden rounded-lg border border-border bg-card">
          {picker.options.map((option) => (
            <Pressable key={option.id ?? "none"} onPress={() => picker.select(option.id)} className={cn(saitClasses.sheetOption, option.active && saitClasses.sheetOptionActive)}>
              <Text className={cn(saitClasses.sheetOptionText, option.active ? saitClasses.sheetOptionTextActive : saitClasses.sheetOptionTextIdle)} numberOfLines={1}>
                {option.name}
              </Text>
            </Pressable>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

function DayGrid({ children }: { children: ReactNode }) {
  return (
    <Box className={saitClasses.dayGrid} nativeClassName="flex-row flex-wrap">
      {children}
    </Box>
  );
}

function DayCell({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const cols = columnsFor(width);
  return <Box widthPercent={cols === 1 ? 100 : 100 / cols - 1.5}>{children}</Box>;
}

export function SaitCeremonyLayout(props: SaitCeremonyLayoutProps) {
  const {
    year, method, rules, engineVersion, enabledRuleIds, onToggleRule, rulesBusy,
    nakshatraMode = null, onNakshatraModeChange, days = [], count, profileControl, suitabilityByDay,
    personalizeByDay, loading, notice, children, emptyLabel, countLabel, footer, renderShell, renderHeader, renderYearNav, renderBack,
  } = props;
  const list = useSaitCeremonyList({ days, count, year, emptyLabel, countLabel });
  const months = useStagedMonths(list.months, 2);
  return renderShell(
    <>
      {renderHeader()}
      <SaitRulesSection method={method} rules={rules} engineVersion={engineVersion} enabledRuleIds={enabledRuleIds} onToggleRule={onToggleRule} busy={rulesBusy} />
      {nakshatraMode && onNakshatraModeChange ? (
        <Box className={saitClasses.nakshatraRow}>
          <Text className={saitClasses.nakshatraLabel}>{list.nakshatra.label}</Text>
          <Box className={cn(saitClasses.nakshatraGroup, "self-start")}>
            {list.nakshatra.modes.map(({ id, label }) => {
              const active = nakshatraMode === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => onNakshatraModeChange(id)}
                  selected={active}
                  className={cn(saitClasses.nakshatraBtn, active ? saitClasses.nakshatraBtnActive : undefined)}
                >
                  <Text className={cn(saitClasses.nakshatraBtnText, active ? saitClasses.nakshatraBtnTextActive : saitClasses.nakshatraBtnTextIdle)}>{label}</Text>
                </Pressable>
              );
            })}
          </Box>
        </Box>
      ) : null}
      {renderYearNav()}
      {!loading && list.displayCount > 0 ? <Text className={saitClasses.countText}>{list.countText}</Text> : null}
      {profileControl ? <Box className={saitClasses.profileBox}>{profileControl}</Box> : null}
      {notice}
      <Box className={saitClasses.body}>
        {children ? children : loading ? (
          <DayGrid>
            {Array.from({ length: 6 }).map((_, i) => (
              <DayCell key={i}><Box className={saitClasses.skeletonCard} /></DayCell>
            ))}
          </DayGrid>
        ) : days.length > 0 ? (
          months.map((month) => (
            <Box key={month.month} className={saitClasses.monthBlock}>
              <Box className={saitClasses.monthHeader}>
                <Text className={saitClasses.monthTitle}>{month.label}</Text>
                <Text className={saitClasses.monthCount}>{month.count}</Text>
              </Box>
              <DayGrid>
                {month.days.map((day) => (
                  <DayCell key={`${saitDayKey(day)}-${day.window_start}`}>
                    <SaitDayCard d={day} suitability={suitabilityByDay?.get(saitDayKey(day))} personalize={personalizeByDay?.get(saitDayKey(day))} />
                  </DayCell>
                ))}
              </DayGrid>
            </Box>
          ))
        ) : (
          <Text className={saitClasses.emptyText}>{list.empty}</Text>
        )}
      </Box>
      {footer}
      {renderBack()}
    </>,
  );
}

export function SaitAsidePanel({ year, month, highlightDay, adYear, adMonth, location, renderLink }: SaitAsidePanelProps) {
  const sait = useSaitAside({ year, month, adYear, adMonth, highlightDay, location });
  let body: ReactNode;
  if (sait.status === "loading") body = <Box className={homeClasses.saitSkeleton} />;
  else if (sait.status === "error") body = <Text className={homeClasses.saitEmpty}>{sait.copy.error}</Text>;
  else {
    body = (
      <>
        <Box className={homeClasses.saitList}>
          {sait.rows.map((row) => (
            <Box key={row.id}>
              {renderLink({
                id: row.id,
                className: cn(homeClasses.saitRow, "active:opacity-80"),
                children: (
                  <>
                    <Text className={homeClasses.saitName}>{row.name}</Text>
                    <Text className={cn("min-w-0 flex-1", homeClasses.saitDays)}>
                      {row.days.length ? row.days.map((day, i) => (
                        <Text key={day.day} className={day.highlighted ? homeClasses.saitHighlight : undefined}>
                          {i > 0 ? ", " : ""}
                          {day.label}
                        </Text>
                      )) : <Text className={homeClasses.saitDaysNone}>{sait.copy.none}</Text>}
                    </Text>
                    <Icon node={iconChevronRight} size={14} tone="muted" />
                  </>
                ),
              })}
            </Box>
          ))}
        </Box>
        {sait.empty ? <Text className={homeClasses.saitEmpty}>{sait.empty}</Text> : null}
      </>
    );
  }
  return (
    <Box className={homeClasses.saitStack}>
      <Text className={homeClasses.saitMonth}>{sait.monthName}</Text>
      {body}
    </Box>
  );
}
