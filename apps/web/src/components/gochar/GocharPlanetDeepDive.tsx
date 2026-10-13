import type { GocharGraha } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { GRAHA_NAME, GRAHA_DETAIL_ORDER } from "@vedic-patro/domain/graha-details";
import {
  formatGocharPatroDate,
  grahaExalted,
  grahaNakshatraLine,
  motionLabel,
  speedTone,
} from "@vedic-patro/domain/gochar-page-utils";
import { grahaRashiDisplay } from "@vedic-patro/domain/dainikKranti/gochar-display";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { useLocale, bilingualText } from "@/i18n/locale";
import { cn } from "@vedic-patro/domain/utils";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";

type Props = {
  gochar: Record<string, GocharGraha>;
  selected: GrahaKey;
  onSelect: (key: GrahaKey) => void;
};

function windowLine(
  labelNe: string,
  labelEn: string,
  entryLocal: string | undefined,
  lang: "ne" | "en" | "hi",
): string | undefined {
  if (!entryLocal) return undefined;
  const datePart = entryLocal.slice(0, 10);
  const when = formatGocharPatroDate(datePart, lang);
  return lang === "en" ? `${labelEn} until ${when}` : `${labelNe} ${when} सम्म`;
}

export function GocharPlanetDeepDive({ gochar, selected, onSelect }: Props) {
  const { lang, digits } = useLocale();
  const g = gochar[selected];
  if (!g) return null;

  const name = bilingualText(lang, GRAHA_NAME[selected].ne, GRAHA_NAME[selected].en);
  const rashi = grahaRashiDisplay(g, lang);
  const deg =
    g.deg_in_rashi != null
      ? lang === "en"
        ? `${g.deg_in_rashi.toFixed(1)}°`
        : `${digits(g.deg_in_rashi.toFixed(1))}°`
      : "—";

  const windows = [
    windowLine(
      g.rashi_ne ?? g.rashi ?? "",
      g.rashi ?? "",
      g.next_rashi_entry?.entry_time_local,
      lang,
    ),
    windowLine(
      g.next_nakshatra_entry?.to_nakshatra_ne ?? "",
      g.next_nakshatra_entry?.to_nakshatra ?? "",
      g.next_nakshatra_entry?.entry_time_local,
      lang,
    ),
    g.next_pada_entry?.to_pada
      ? windowLine(
          `पद ${g.next_pada_entry.to_pada}`,
          `Pada ${g.next_pada_entry.to_pada}`,
          g.next_pada_entry.entry_time_local,
          lang,
        )
      : undefined,
  ].filter(Boolean) as string[];

  return (
    <section className={cn("shadow-ring-soft", gocharClasses.deepCard)}>
      <div className={gocharClasses.deepHead}>
        <p className={cn("m-0", gocharClasses.deepEyebrow)}>
          {bilingualText(lang, "विस्तृत अध्ययन", "Deep dive")}
        </p>
        <h2 className={cn("mb-0 break-words", gocharClasses.deepTitle)}>
          {bilingualText(lang, "ग्रह छान्नुहोस्", "Pick a planet")}
        </h2>
        <p className={cn("mb-0 break-words", gocharClasses.deepSubtitle)}>
          {bilingualText(lang, "वर्तमान स्थिति, सीमा र वक्री", "Current position, windows & retrograde")}
        </p>
      </div>

      <div className={cn("grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9", gocharClasses.pickerGrid)}>
        {GRAHA_DETAIL_ORDER.map((key) => {
          const row = gochar[key];
          if (!row) return null;
          const active = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={cn(
                "flex flex-col text-center transition-colors",
                gocharClasses.pickerButton,
                active
                  ? cn(gocharClasses.pickerActive, gocharClasses.pickerLabelActive)
                  : cn(gocharClasses.pickerIdle, gocharClasses.pickerLabelIdle, "hover:border-secondary/30"),
              )}
            >
              <GrahaPlanetIcon graha={key} size={28} />
              <span className={cn("w-full min-w-0 break-words", gocharClasses.pickerLabel)}>
                {bilingualText(lang, GRAHA_NAME[key].ne, GRAHA_NAME[key].en)}
              </span>
            </button>
          );
        })}
      </div>

      <div className={gocharClasses.detail}>
        <div className={cn("flex flex-wrap", gocharClasses.detailTitleRow)}>
          <GrahaPlanetIcon graha={selected} size={36} />
          <h3 className={cn("m-0 min-w-0 break-words", gocharClasses.detailTitle)}>
            {name}
            {g.name_vedic ? (
              <span className={cn("ml-2", gocharClasses.detailVedic)}>({g.name_vedic})</span>
            ) : null}
          </h3>
          {grahaExalted(selected, g) ? (
            <span className={cn(gocharClasses.detailBadge, gocharClasses.detailBadgeText)}>
              {bilingualText(lang, "उच्च", "Exalted")}
            </span>
          ) : null}
        </div>

        <div className={cn("grid sm:grid-cols-2 lg:grid-cols-4", gocharClasses.factGrid)}>
          <Detail label={bilingualText(lang, "राशि", "Sign")} value={`${rashi} ${deg}`} />
          <Detail label={bilingualText(lang, "नक्षत्र", "Nakshatra")} value={grahaNakshatraLine(g, lang)} />
          <Detail label={bilingualText(lang, "गति", "Motion")} value={motionLabel(g, lang)} />
          <Detail label={bilingualText(lang, "वेग", "Speed")} value={speedTone(g, lang)} />
        </div>

        {windows.length > 0 ? (
          <div className={gocharClasses.windowsBox}>
            <p className={cn("m-0", gocharClasses.windowsTitle)}>
              {bilingualText(lang, "हालका सीमाहरू", "Current windows")}
            </p>
            <ul className={cn("mb-0 list-disc space-y-1 pl-4", gocharClasses.windowsList, gocharClasses.windowsItem)}>
              {windows.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className={gocharClasses.fact}>
      <p className={cn("m-0", gocharClasses.factLabel)}>{label}</p>
      <p className={cn("m-0", gocharClasses.factValue)}>{value}</p>
    </div>
  );
}
