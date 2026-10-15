import type { NavataraTone } from "@vedic-patro/api-client";
import { cn } from "@vedic-patro/domain/utils";
import { rashifalToneBar, rashifalToneText } from "@vedic-patro/domain/rashifal-ui";
import { patroNavataraToneBg } from "@vedic-patro/design-tokens/classes/patro-classes";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";
import { useRashifalGocharChips, useRashifalPersonalCard, useRashifalProfilePicker, useRashifalSignCard, type RashifalGocharFlag } from "@vedic-patro/features/rashifal";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import type {
  RashifalComponentsProps,
  RashifalDomainsProps,
  RashifalGocharChipsProps,
  RashifalLuckyProps,
  RashifalMeterProps,
  RashifalPersonalCardProps,
  RashifalProfilePickerProps,
  RashifalSignCardProps,
  RashifalWhyButtonProps,
} from "../contract";
import { iconChevronDown, iconChevronUp, iconClock, iconUserRound, rashifalDomainIcon, rashifalFlagIcon, rashifalFlagTone, rashifalIconTone, rashifalLuckyIcon } from "../rashifal-icons";

const GOCHAR_TONE = {
  vedha: rashifalClasses.gochar.toneVedha,
  good: rashifalClasses.gochar.toneGood,
  bad: rashifalClasses.gochar.toneBad,
} as const;

function StarMeter({ stars, tone }: { stars: number; tone?: NavataraTone }) {
  return (
    <Box className={rashifalClasses.stars} nativeClassName="flex-row">
      {[1, 2, 3, 4, 5].map((n) => (
        <Box key={n} className={cn(rashifalClasses.star, n <= stars ? rashifalToneBar(tone) : rashifalClasses.starOff)} />
      ))}
    </Box>
  );
}

function FlagIcon({ flag, label }: { flag: RashifalGocharFlag; label?: string }) {
  return <Icon node={rashifalFlagIcon[flag]} size={12} tone={rashifalFlagTone[flag]} label={label} />;
}

export function RashifalMeter({ card }: RashifalMeterProps) {
  return (
    <Box className={rashifalClasses.meter} nativeClassName="flex-row">
      <StarMeter stars={card.stars} tone={card.tone} />
      <Box className={rashifalClasses.meterTrack}>
        <Box className={cn(rashifalClasses.meterFill, rashifalToneBar(card.tone))} widthPercent={card.percent} />
      </Box>
      <Text className={cn(rashifalClasses.percent, rashifalToneText(card.tone))}>
        {card.percentLabel}%
      </Text>
    </Box>
  );
}

export function RashifalDomains({ card }: RashifalDomainsProps) {
  if (!card.domains.length) return null;
  return (
    <Box className={rashifalClasses.domains} nativeClassName="flex-row flex-wrap">
      {card.domains.map((domain) => {
        const node = rashifalDomainIcon[domain.key];
        return (
          <Box key={domain.key} className={cn("mb-2 w-1/3 px-1", rashifalClasses.domain)} label={domain.title}>
            <Box className={rashifalClasses.domainHead} nativeClassName="flex-row">
              {node ? <Icon node={node} size={14} tone={rashifalIconTone(domain.tone)} /> : null}
              <Text className={cn("flex-1", rashifalClasses.domainLabel)} numberOfLines={1}>
                {domain.label}
              </Text>
            </Box>
            <Box className={rashifalClasses.domainTrack}>
              <Box className={cn(rashifalClasses.domainFill, rashifalToneBar(domain.tone))} widthPercent={domain.percent} />
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

export function RashifalLucky({ card, columns }: RashifalLuckyProps) {
  const cell = columns === 3 ? "w-[48%] sm:w-[32%]" : "w-[48%]";
  return (
    <Box className={rashifalClasses.lucky} nativeClassName="flex-row flex-wrap justify-between">
      {card.lucky.map(({ key, label, value }) => (
        <Box key={key} className={cn(cell, rashifalClasses.luckyCell)} nativeClassName="flex-row" label={`${label}: ${value}`}>
          <Icon node={rashifalLuckyIcon[key]} size={14} tone="muted" />
          <Text className={cn("min-w-0 flex-1", rashifalClasses.luckyValue)} numberOfLines={1}>
            {value}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

export function RashifalWhyButton({ card }: RashifalWhyButtonProps) {
  return (
    <Pressable onPress={card.toggle} className={rashifalClasses.whyButton} nativeClassName="flex-row">
      <Text className={rashifalClasses.whyLabel}>{card.whyLabel}</Text>
      <Icon node={card.open ? iconChevronUp : iconChevronDown} size={16} tone="muted" />
    </Pressable>
  );
}

export function RashifalComponents({ card }: RashifalComponentsProps) {
  return (
    <>
      {card.components.length ? (
        <Box className={rashifalClasses.componentList}>
          {card.components.map((row) => (
            <Box key={row.key} className={rashifalClasses.componentRow} nativeClassName="flex-row">
              <Text className={rashifalClasses.componentLabel}>{row.label}</Text>
              <Text className={rashifalClasses.componentNote}>{row.note}</Text>
              <Text className={cn(rashifalClasses.componentValue, rashifalToneText(row.tone))}>{row.value}</Text>
            </Box>
          ))}
        </Box>
      ) : null}
      {card.gochar.length ? <RashifalGocharChips rows={card.gochar} className="mt-3" /> : null}
    </>
  );
}

export function RashifalGocharChips({ rows, className }: RashifalGocharChipsProps) {
  const { chips, legend } = useRashifalGocharChips(rows);
  if (!chips.length) return null;
  return (
    <Box className={cn(rashifalClasses.gochar.wrap, className)}>
      <Box className={rashifalClasses.gochar.list} nativeClassName="flex-row flex-wrap">
        {chips.map((chip) => (
          <Box key={chip.key} className={cn(rashifalClasses.gochar.chip, GOCHAR_TONE[chip.tone])} nativeClassName="flex-row" label={chip.hint}>
            <Text className={rashifalClasses.gochar.chipText}>{chip.graha}</Text>
            <Text className={cn(rashifalClasses.gochar.chipText, rashifalClasses.gochar.house)}>{chip.house}</Text>
            {chip.flags.map((flag) => (
              <FlagIcon key={flag.flag} flag={flag.flag} label={flag.label} />
            ))}
          </Box>
        ))}
      </Box>
      {legend.length ? (
        <Box className={rashifalClasses.gochar.legend} nativeClassName="flex-row flex-wrap items-center">
          {legend.map((flag) => (
            <Box key={flag.flag} className={rashifalClasses.gochar.legendItem} nativeClassName="flex-row">
              <FlagIcon flag={flag.flag} />
              <Text className={rashifalClasses.gochar.legendText}>{flag.label}</Text>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

export function RashifalSignCard({ sign, period, taraLine, renderGlyph }: RashifalSignCardProps) {
  const card = useRashifalSignCard({ sign, period });
  return (
    <Box className={rashifalClasses.card}>
      <Box className={rashifalClasses.header} nativeClassName="flex-row">
        {renderGlyph(card.glyph)}
        <Box className={rashifalClasses.headerBody}>
          <Text as="h3" className={rashifalClasses.name}>
            {card.name}
          </Text>
          <Text as="p" className={rashifalClasses.nameSub}>
            {card.sub}
          </Text>
        </Box>
        {taraLine && card.tone ? (
          <Box className={cn(rashifalClasses.taraBadge, patroNavataraToneBg(card.tone))}>
            <Text className={rashifalClasses.taraBadgeText}>{taraLine}</Text>
          </Box>
        ) : null}
      </Box>
      <RashifalMeter card={card} />
      {card.grade ? <Text className={rashifalClasses.grade}>{card.grade}</Text> : null}
      <RashifalDomains card={card} />
      <Text className={rashifalClasses.prediction}>{card.prediction}</Text>
      <RashifalLucky card={card} columns={2} />
      <RashifalWhyButton card={card} detailsId={`rashifal-detail-${sign.id}`} />
      {card.open ? (
        <Box className={rashifalClasses.details}>
          <RashifalComponents card={card} />
          {card.lordLine ? <Text className={rashifalClasses.lordLine}>{card.lordLine}</Text> : null}
          {card.windowDays ? <Text className={rashifalClasses.footNote}>{card.windowDays}</Text> : null}
          {card.remedy ? <Text className={rashifalClasses.remedy}>{card.remedy}</Text> : null}
        </Box>
      ) : null}
    </Box>
  );
}

export function RashifalPersonalCard({ name, personal, renderGlyph }: RashifalPersonalCardProps) {
  const card = useRashifalPersonalCard({ personal });
  return (
    <Box className={rashifalClasses.cardPersonal}>
      <Box className={rashifalClasses.header} nativeClassName="flex-row">
        {renderGlyph(card.glyph)}
        <Box className={rashifalClasses.headerBody}>
          <Text as="h3" className={rashifalClasses.name}>
            {name}
          </Text>
          <Text as="p" className={rashifalClasses.nameSub}>
            {card.sub}
          </Text>
        </Box>
      </Box>
      <RashifalMeter card={card} />
      {card.dashaLine ? (
        <Box className={rashifalClasses.dashaRow} nativeClassName="flex-row">
          <Icon node={iconClock} size={14} tone="secondary" />
          <Text className={cn("flex-1", rashifalClasses.dashaText)} numberOfLines={1}>
            {card.dashaLine}
          </Text>
        </Box>
      ) : null}
      <RashifalDomains card={card} />
      <Text className={rashifalClasses.prediction}>{card.prediction}</Text>
      <RashifalLucky card={card} columns={3} />
      <RashifalWhyButton card={card} detailsId="rashifal-personal-detail" />
      {card.open ? (
        <Box className={rashifalClasses.details}>
          <RashifalComponents card={card} />
          {card.lordLine ? <Text className={rashifalClasses.lordLine}>{card.lordLine}</Text> : null}
          {card.dashaRange ? <Text className={rashifalClasses.footNote}>{card.dashaRange}</Text> : null}
        </Box>
      ) : null}
    </Box>
  );
}

function PickerLabel({ text }: { text: string }) {
  return (
    <Box className={rashifalClasses.picker.label} nativeClassName="flex-row">
      <Icon node={iconUserRound} size={16} tone="secondary" />
      <Text className={rashifalClasses.picker.labelText}>{text}</Text>
    </Box>
  );
}

export function RashifalProfilePicker({ selectedId, onSelect, isAuthenticated, renderAuth }: RashifalProfilePickerProps) {
  const picker = useRashifalProfilePicker({ isAuthenticated, selectedId, onSelect });
  const { copy, menuOpen } = picker;
  if (picker.status === "guest") {
    return (
      <Box className={rashifalClasses.picker.row} nativeClassName="flex-row">
        <PickerLabel text={copy.label} />
        <Pressable onPress={picker.openAuth} className={rashifalClasses.picker.signInButton}>
          <Text className={rashifalClasses.picker.signInText}>{copy.signIn}</Text>
        </Pressable>
        {renderAuth({ open: picker.authOpen, onOpenChange: picker.setAuthOpen })}
      </Box>
    );
  }
  if (picker.status === "empty") {
    return (
      <Box className={rashifalClasses.picker.row} nativeClassName="flex-row">
        <PickerLabel text={copy.label} />
        <Text className={rashifalClasses.picker.empty}>{copy.empty}</Text>
      </Box>
    );
  }
  return (
    <Box className="items-center gap-1">
      <Box className="flex-row flex-wrap items-center justify-center gap-2">
        <PickerLabel text={copy.label} />
        <Pressable onPress={picker.toggleMenu} disabled={picker.loading} className={rashifalClasses.picker.select} nativeClassName="flex-row items-center gap-1">
          <Text className={cn("flex-1", rashifalClasses.picker.selectText)} numberOfLines={1}>
            {picker.current}
          </Text>
          <Icon node={menuOpen ? iconChevronUp : iconChevronDown} size={14} tone="muted" />
        </Pressable>
      </Box>
      {menuOpen && picker.status === "ready" ? (
        <Box className={rashifalClasses.picker.menu}>
          {picker.options.map((option, index) => (
            <Pressable
              key={option.id ?? "none"}
              onPress={() => picker.select(option.id)}
              className={cn(rashifalClasses.picker.menuItem, index === 0 && rashifalClasses.picker.menuItemDivider, option.active && rashifalClasses.picker.menuItemActive)}
            >
              <Text className={rashifalClasses.picker.menuText}>{option.name}</Text>
            </Pressable>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
