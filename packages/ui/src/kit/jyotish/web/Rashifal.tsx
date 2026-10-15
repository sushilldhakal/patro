import type { NavataraTone } from "@vedic-patro/api-client";
import { cn } from "@vedic-patro/domain/utils";
import { rashifalToneBar, rashifalToneText } from "@vedic-patro/domain/rashifal-ui";
import { patroNavataraToneBg } from "@vedic-patro/design-tokens/classes/patro-classes";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";
import { useRashifalGocharChips, useRashifalPersonalCard, useRashifalProfilePicker, useRashifalSignCard, type RashifalGocharFlag } from "@vedic-patro/features/rashifal";
import { Box, Icon, Text } from "@vedic-patro/ui";
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
import { iconChevronDown, iconClock, iconUserRound, rashifalDomainIcon, rashifalFlagIcon, rashifalFlagTone, rashifalIconTone, rashifalLuckyIcon } from "../rashifal-icons";

const GOCHAR_TONE = {
  vedha: rashifalClasses.gochar.toneVedha,
  good: rashifalClasses.gochar.toneGood,
  bad: rashifalClasses.gochar.toneBad,
} as const;

function StarMeter({ stars, tone }: { stars: number; tone?: NavataraTone }) {
  return (
    <span className={cn("inline-flex", rashifalClasses.stars)} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={cn(rashifalClasses.star, n <= stars ? rashifalToneBar(tone) : rashifalClasses.starOff)} />
      ))}
    </span>
  );
}

function FlagIcon({ flag }: { flag: RashifalGocharFlag }) {
  return <Icon node={rashifalFlagIcon[flag]} size={12} tone={rashifalFlagTone[flag]} />;
}

export function RashifalMeter({ card }: RashifalMeterProps) {
  return (
    <Box className={rashifalClasses.meter}>
      <StarMeter stars={card.stars} tone={card.tone} />
      <Box className={rashifalClasses.meterTrack}>
        <Box className={cn(rashifalClasses.meterFill, rashifalToneBar(card.tone))} webClassName="transition-[width]" widthPercent={card.percent} />
      </Box>
      <Text as="span" className={cn(rashifalClasses.percent, rashifalToneText(card.tone))}>
        {card.percentLabel}
        <span aria-hidden="true">%</span>
      </Text>
    </Box>
  );
}

export function RashifalDomains({ card }: RashifalDomainsProps) {
  if (!card.domains.length) return null;
  return (
    <ul className={cn(rashifalClasses.domainGrid, rashifalClasses.domains)}>
      {card.domains.map((domain) => {
        const node = rashifalDomainIcon[domain.key];
        return (
          <li key={domain.key} className={rashifalClasses.domain} title={domain.title}>
            <Box className={rashifalClasses.domainHead}>
              {node ? <Icon node={node} size={14} tone={rashifalIconTone(domain.tone)} className={rashifalToneText(domain.tone)} /> : null}
              <Text as="span" className={cn("truncate", rashifalClasses.domainLabel)}>
                {domain.label}
              </Text>
            </Box>
            <Box className={rashifalClasses.domainTrack}>
              <Box className={cn(rashifalClasses.domainFill, rashifalToneBar(domain.tone))} widthPercent={domain.percent} />
            </Box>
          </li>
        );
      })}
    </ul>
  );
}

export function RashifalLucky({ card, columns }: RashifalLuckyProps) {
  return (
    <Box className={cn("grid", columns === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2", rashifalClasses.lucky)}>
      {card.lucky.map(({ key, label, value }) => (
        <Box key={key} className={cn("flex", rashifalClasses.luckyCell)} label={label}>
          <Icon node={rashifalLuckyIcon[key]} size={14} tone="muted" />
          <span className="sr-only">{label}: </span>
          <Text as="span" className={cn("truncate", rashifalClasses.luckyValue)}>
            {value}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

export function RashifalWhyButton({ card, detailsId }: RashifalWhyButtonProps) {
  return (
    <button
      type="button"
      className={cn("flex", rashifalClasses.whyButton, rashifalClasses.whyLabel, rashifalClasses.whyButtonHover)}
      aria-expanded={card.open}
      aria-controls={detailsId}
      onClick={card.toggle}
    >
      {card.whyLabel}
      <Icon node={iconChevronDown} size={16} tone="muted" webClassName={cn("transition-transform", card.open && "rotate-180")} />
    </button>
  );
}

export function RashifalComponents({ card }: RashifalComponentsProps) {
  return (
    <>
      {card.components.length ? (
        <ul className={cn(rashifalClasses.componentListReset, rashifalClasses.componentList)}>
          {card.components.map((row) => (
            <li key={row.key} className={cn("m-0 flex", rashifalClasses.componentRow)}>
              <Text as="span" className={rashifalClasses.componentLabel}>
                {row.label}
              </Text>
              <Text as="span" className={rashifalClasses.componentNote}>
                {row.note}
              </Text>
              <Text as="span" className={cn(rashifalClasses.componentValue, rashifalToneText(row.tone))}>
                {row.value}
              </Text>
            </li>
          ))}
        </ul>
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
      <ul className={cn("m-0 flex list-none flex-wrap p-0", rashifalClasses.gochar.list)}>
        {chips.map((chip) => (
          <li
            key={chip.key}
            className={cn("m-0 inline-flex", rashifalClasses.gochar.chip, rashifalClasses.gochar.chipText, GOCHAR_TONE[chip.tone])}
            title={chip.hint}
          >
            <span>{chip.graha}</span>
            <span className={rashifalClasses.gochar.house}>{chip.house}</span>
            {chip.flags.map((flag) => (
              <span key={flag.flag} className="inline-flex" title={flag.label} aria-label={flag.label}>
                <FlagIcon flag={flag.flag} />
              </span>
            ))}
          </li>
        ))}
      </ul>
      {legend.length ? (
        <p className={cn("m-0 flex flex-wrap items-center", rashifalClasses.gochar.legend, rashifalClasses.gochar.legendText)}>
          {legend.map((flag) => (
            <span key={flag.flag} className={cn("inline-flex", rashifalClasses.gochar.legendItem)}>
              <FlagIcon flag={flag.flag} />
              {flag.label}
            </span>
          ))}
        </p>
      ) : null}
    </Box>
  );
}

export function RashifalSignCard({ sign, period, taraLine, renderGlyph }: RashifalSignCardProps) {
  const card = useRashifalSignCard({ sign, period });
  const detailsId = `rashifal-detail-${sign.id}`;
  return (
    <article className={cn(rashifalClasses.card, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)]")}>
      <Box as="header" className={rashifalClasses.header}>
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
          <Text as="span" className={cn(rashifalClasses.taraBadge, patroNavataraToneBg(card.tone))}>
            {taraLine}
          </Text>
        ) : null}
      </Box>
      <RashifalMeter card={card} />
      {card.grade ? (
        <Text as="p" className={rashifalClasses.grade}>
          {card.grade}
        </Text>
      ) : null}
      <RashifalDomains card={card} />
      <Text as="p" className={cn("m-0 flex-1", rashifalClasses.prediction)}>
        {card.prediction}
      </Text>
      <RashifalLucky card={card} columns={2} />
      <RashifalWhyButton card={card} detailsId={detailsId} />
      {card.open ? (
        <div id={detailsId} className={rashifalClasses.details}>
          <RashifalComponents card={card} />
          {card.lordLine ? (
            <Text as="p" className={rashifalClasses.lordLine}>
              {card.lordLine}
            </Text>
          ) : null}
          {card.windowDays ? (
            <Text as="p" className={rashifalClasses.footNote}>
              {card.windowDays}
            </Text>
          ) : null}
          {card.remedy ? (
            <Text as="p" className={rashifalClasses.remedy}>
              {card.remedy}
            </Text>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function RashifalPersonalCard({ name, personal, renderGlyph }: RashifalPersonalCardProps) {
  const card = useRashifalPersonalCard({ personal });
  const detailsId = "rashifal-personal-detail";
  return (
    <article className={cn(rashifalClasses.cardPersonal, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--secondary)_18%,transparent)]")}>
      <Box as="header" className={rashifalClasses.header}>
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
        <Box className={rashifalClasses.dashaRow}>
          <Icon node={iconClock} size={14} tone="secondary" />
          <Text as="span" className={cn("truncate", rashifalClasses.dashaText)}>
            {card.dashaLine}
          </Text>
        </Box>
      ) : null}
      <RashifalDomains card={card} />
      <Text as="p" className={cn("m-0 flex-1", rashifalClasses.prediction)}>
        {card.prediction}
      </Text>
      <RashifalLucky card={card} columns={3} />
      <RashifalWhyButton card={card} detailsId={detailsId} />
      {card.open ? (
        <div id={detailsId} className={rashifalClasses.details}>
          <RashifalComponents card={card} />
          {card.lordLine ? (
            <Text as="p" className={rashifalClasses.lordLine}>
              {card.lordLine}
            </Text>
          ) : null}
          {card.dashaRange ? (
            <Text as="p" className={rashifalClasses.footNote}>
              {card.dashaRange}
            </Text>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function PickerLabel({ text }: { text: string }) {
  return (
    <Text as="span" className={cn("inline-flex", rashifalClasses.picker.label, rashifalClasses.picker.labelText)}>
      <Icon node={iconUserRound} size={16} tone="secondary" />
      {text}
    </Text>
  );
}

export function RashifalProfilePicker({ selectedId, onSelect, isAuthenticated, renderAuth }: RashifalProfilePickerProps) {
  const picker = useRashifalProfilePicker({ isAuthenticated, selectedId, onSelect });
  const { copy } = picker;
  if (picker.status === "guest") {
    return (
      <Box className={cn("flex", rashifalClasses.picker.row)}>
        <PickerLabel text={copy.label} />
        <button
          type="button"
          onClick={picker.openAuth}
          className={cn(rashifalClasses.picker.signInButton, rashifalClasses.picker.signInText, "hover:bg-surface-muted")}
        >
          {copy.signIn}
        </button>
        {renderAuth({ open: picker.authOpen, onOpenChange: picker.setAuthOpen })}
      </Box>
    );
  }
  if (picker.status === "empty") {
    return (
      <Box className={cn("flex", rashifalClasses.picker.row)}>
        <PickerLabel text={copy.label} />
        <Text as="span" className={rashifalClasses.picker.empty}>
          {copy.empty}
        </Text>
      </Box>
    );
  }
  return (
    <Box className={cn("flex", rashifalClasses.picker.row)}>
      <PickerLabel text={copy.label} />
      <select
        value={selectedId ?? ""}
        disabled={picker.loading}
        onChange={(event) => picker.select(event.target.value || null)}
        className={cn(rashifalClasses.picker.select, "focus:outline-none focus:ring-2 focus:ring-primary/40")}
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
