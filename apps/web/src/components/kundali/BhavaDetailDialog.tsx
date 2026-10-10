import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLocale, bilingualText } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { useMediaQuery, BELOW_MD_MQ } from "@/hooks/use-media-query";
import type { BhavaHouse } from "@/lib/bhava";
import { houseBadge, formatHouseBadge, drishtiTargetHouses } from "@/lib/bhava";
import { GRAHA_NAME, GRAHA_ICON, type GrahaKey } from "@/lib/graha-details";
import type { BhavaReferencePayload } from "@/lib/api";
import {
  HOUSE_ORDINAL_NE,
  HOUSE_ORDINAL_EN,
  HOUSE_LORD_TITLE_NE,
  computeAspectedBy,
  splitList,
} from "@/lib/kundali/bhava-detail";
import { formatRashiByNumber } from "@/lib/rashi-i18n";

function grahaName(key: string, lang: "ne" | "en"): string {
  const entry = GRAHA_NAME[key as GrahaKey];
  return entry ? bilingualText(lang, entry.ne, entry.en, key) : key;
}

function joinNames(keys: string[], lang: "ne" | "en"): string {
  if (keys.length === 0) return bilingualText(lang, "कोही छैन", "None");
  return keys.map((k) => grahaName(k, lang)).join(lang === "en" ? ", " : ", ");
}

function yutiKey(keys: string[]): string {
  return [...keys].sort().join("+");
}

/** Every 3-element subset of `keys` — houses rarely hold more than 3-4
 * grahas, so this stays small in practice. */
function subsetsOf3(keys: string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      for (let k = j + 1; k < keys.length; k++) {
        out.push([keys[i], keys[j], keys[k]]);
      }
    }
  }
  return out;
}

type TabId = "summary" | "lord" | "drishti" | "rules";

/** A compact, always-visible card within a tab — replaces the old
 * TopSection/AccordionItem pattern now that each tab already isolates its
 * content, so there's no need for a second layer of collapsing on top. The
 * `right` slot still carries the headline fact (a count, a badge) right in
 * the card header, same as before. */
function Block({
  icon,
  title,
  right,
  children,
}: {
  icon: string;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="mb-1.5 flex items-baseline gap-2">
        <span aria-hidden>{icon}</span>
        <span className="text-sm font-bold text-foreground">{title}</span>
        {right && <span className="ml-auto shrink-0 text-sm font-normal text-muted-foreground">{right}</span>}
      </div>
      {children}
    </div>
  );
}

const ratingBadgeCls: Record<string, string> = {
  uttam: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  shubh: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  mishrit: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  kamjor: "border-destructive/20 bg-destructive/10 text-destructive",
};

/** A classical Sanskrit citation — book/label + shloka — as a distinct
 * quote card instead of small italic prose, so it reads at a glance rather
 * than blending into the surrounding text. `label` is the citation's own
 * kind (e.g. "कारकत्व श्लोक"); when omitted, `source` (the scripture name)
 * doubles as the badge text on its own, matching the saravali-citation use
 * where there's no separate kind to name. */
function ShlokaCard({
  label,
  source,
  shloka,
}: {
  label?: string;
  source: string;
  shloka: string;
}) {
  return (
    <div className="rounded-lg border border-secondary/25 bg-secondary/[0.06] p-2.5">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {label && <span className="text-sm font-semibold text-foreground">📜 {label}</span>}
        <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-sm font-medium leading-none text-secondary">
          {label ? source : `📜 ${source}`}
        </span>
      </div>
      <p className="whitespace-pre-line text-base font-bold leading-relaxed text-foreground">{shloka}</p>
    </div>
  );
}

function GrahaKarakatvaCard({
  grahaKey,
  house,
  reference,
  lang,
  digits,
}: {
  grahaKey: string;
  house: number;
  reference: BhavaReferencePayload;
  lang: "ne" | "en";
  digits: (v: string | number) => string;
}) {
  const k = reference.grahaKarakatva[grahaKey];
  if (!k) return null;
  const saravali = reference.grahaHouseSaravali[grahaKey]?.[house];

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-foreground">
        {GRAHA_ICON[grahaKey as GrahaKey] ?? "🪐"} {grahaName(grahaKey, lang)}
      </p>

      <ShlokaCard
        label={bilingualText(lang, "कारकत्व श्लोक", "Karakatva shloka")}
        source={bilingualText(lang, k.shlokaSourceNe, k.shlokaSourceEn)}
        shloka={k.shloka}
      />

      <div>
        <p className="text-sm font-semibold text-foreground">📋 {bilingualText(lang, "कारकत्व विषयहरू", "Karakatva subjects")}</p>
        <p className="mt-1 text-sm leading-relaxed">{bilingualText(lang, k.subjectsNe, k.subjectsEn)}।</p>
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground">💡 {bilingualText(lang, "ग्रहको महत्व", "Significance")}</p>
        <p className="mt-1 text-sm leading-relaxed">{bilingualText(lang, k.significanceNe, k.significanceEn)}</p>
      </div>

      <div className="border-l-2 border-secondary/40 pl-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            ⬡{" "}
            {bilingualText(
              lang,
              `भाव ${digits(house)}${house === 1 ? " (Lagna)" : ""} मा ${grahaName(grahaKey, lang)}को फल`,
              `${grahaName(grahaKey, lang)} in house ${digits(house)}${house === 1 ? " (Lagna)" : ""}`,
            )}
          </p>
          {saravali && (
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-sm font-semibold leading-none",
                ratingBadgeCls[saravali.rating],
              )}
            >
              {bilingualText(lang, reference.ratingLabel[saravali.rating].ne, reference.ratingLabel[saravali.rating].en)}
            </span>
          )}
        </div>

        {saravali ? (
          /* एक भावमा जति ग्रन्थ (सारावली, फलदीपिका, होरासार, जातक पारिजात, ...)
              उद्धृत छन् ती सबैका श्लोकहरू पहिले लगातार देखाइन्छ (प्रत्येकको आफ्नै
              ग्रन्थ-सन्दर्भसहित, तर छुट्टै अर्थ/व्याख्या बिना), अनि अन्त्यमा एकपटक
              मात्र समग्र अर्थ र व्याख्या (`summaryNe`/`summaryEn`) — हरेक ग्रहको
              लागि सधैं यही एउटै ढाँचा। */
          <div className="space-y-2.5">
            {saravali.entries.map((citation, i) => (
              <ShlokaCard
                key={i}
                source={bilingualText(lang, citation.shlokaSourceNe, citation.shlokaSourceEn)}
                shloka={citation.shloka}
              />
            ))}
            <p className="border-t border-border/50 pt-2 text-sm leading-relaxed">
              💡 {bilingualText(lang, saravali.summaryNe, saravali.summaryEn)}
            </p>
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-muted-foreground">
            {bilingualText(
              lang,
              "यो भाव-ग्रह संयोजनको लागि शास्त्रीय श्लोक अहिले उपलब्ध छैन।",
              "No classical shloka is available for this house-graha combination yet.",
            )}
          </p>
        )}
      </div>
    </div>
  );
}

type Props = {
  houses: BhavaHouse[];
  houseNumber: number | null;
  reference: BhavaReferencePayload | undefined;
  onClose: () => void;
};

export function BhavaDetailDialog({ houses, houseNumber, reference, onClose }: Props) {
  const { lang, digits } = useLocale();
  const house = houseNumber != null ? houses.find((h) => h.house === houseNumber) : undefined;
  const isMobile = useMediaQuery(BELOW_MD_MQ);
  const open = Boolean(house);
  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  const content = house ? (
    reference ? (
      <BhavaDetailBody
        key={house.house}
        variant={isMobile ? "drawer" : "dialog"}
        house={house}
        houses={houses}
        reference={reference}
        lang={lang}
        digits={digits}
        onClose={onClose}
      />
    ) : isMobile ? (
      <DrawerHeader>
        <DrawerTitle>{bilingualText(lang, "लोड हुँदैछ…", "Loading…")}</DrawerTitle>
      </DrawerHeader>
    ) : (
      <DialogHeader>
        <DialogTitle>{bilingualText(lang, "लोड हुँदैछ…", "Loading…")}</DialogTitle>
      </DialogHeader>
    )
  ) : null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="flex flex-col gap-0 overflow-hidden">{content}</DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 overflow-hidden p-0">{content}</DialogContent>
    </Dialog>
  );
}

function BhavaDetailBody({
  variant,
  house,
  houses,
  reference,
  lang,
  digits,
  onClose,
}: {
  variant: "dialog" | "drawer";
  house: BhavaHouse;
  houses: BhavaHouse[];
  reference: BhavaReferencePayload;
  lang: "ne" | "en";
  digits: (v: string | number) => string;
  onClose: () => void;
}) {
  const info = reference.houseInfo[house.house];
  const lordKey = reference.rashiLord[house.rashi];
  const lordHouse = houses.find((h) => h.planets.some((p) => p.key === lordKey))?.house;
  const bhaveshEntry = lordHouse != null ? reference.bhaveshPhala[house.house]?.[lordHouse] : undefined;
  const lordTitle = bilingualText(
    lang,
    HOUSE_LORD_TITLE_NE[house.house - 1],
    `Lord of house ${digits(house.house)}`,
  );

  const occupants = house.planets;
  const aspectedBy = computeAspectedBy(houses, house.house);

  const beneficPresent = [...occupants.map((p) => p.key), ...aspectedBy].some(
    (k) => reference.grahaDrishti[k]?.isMalefic === false,
  );
  const maleficPresent = [...occupants.map((p) => p.key), ...aspectedBy].some(
    (k) => reference.grahaDrishti[k]?.isMalefic === true,
  );
  // The one-line takeaway for this house — computed once and surfaced both in
  // the collapsed "Health signals" row and inside it, instead of being buried
  // as the last accordion item where nobody scrolled to find it.
  const verdictLabel = maleficPresent
    ? bilingualText(lang, "⚠️ ध्यान दिनुपर्ने", "⚠️ Needs attention")
    : bilingualText(lang, "✅ सामान्यतया ठीक", "✅ Generally fine");
  const verdictCls = maleficPresent
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";

  const badge = houseBadge(house.house);
  const ordinal = bilingualText(lang, HOUSE_ORDINAL_NE[house.house - 1], HOUSE_ORDINAL_EN[house.house - 1]);
  const lalKitabFixedLord = reference.lalKitabFixedLord[house.house] ?? [];

  const occupantKeys = occupants.map((p) => p.key);
  const yuti2Entry = occupantKeys.length === 2 ? reference.grahaYuti2[yutiKey(occupantKeys)] : undefined;
  const yuti3Entries =
    occupantKeys.length >= 3
      ? subsetsOf3(occupantKeys)
          .map((triple) => reference.grahaYuti3[yutiKey(triple)])
          .filter((e): e is NonNullable<typeof e> => Boolean(e))
      : [];
  const showYutiSection = occupantKeys.length >= 2;

  const applicableSutras = reference.naadiSutras
    .filter((s) => s.grahas.every((g) => occupantKeys.includes(g)))
    .sort((a, b) => a.number - b.number);
  const lalKitabEntries = occupants
    .map((p) => ({ key: p.key, entry: reference.lalKitabHouse[p.key]?.[house.house] }))
    .filter((e): e is { key: string; entry: NonNullable<typeof e.entry> } => Boolean(e.entry));
  const lalKitabYutiMatch =
    occupantKeys.length >= 2 && occupantKeys.length <= 3
      ? reference.lalKitabYuti.find((y) => yutiKey(y.grahas) === yutiKey(occupantKeys))
      : undefined;

  const themes = splitList(bilingualText(lang, info.themeNe, info.themeEn));
  const classicalName = reference.houseClassicalName[house.house];
  const bodyPart = reference.houseBodyPart[house.house];
  const houseDetail = reference.houseDetail[house.house];

  const HeaderWrap = variant === "drawer" ? DrawerHeader : DialogHeader;
  const TitleWrap = variant === "drawer" ? DrawerTitle : DialogTitle;

  const tabs: { id: TabId; icon: string; label: string }[] = [
    { id: "summary", icon: "📋", label: bilingualText(lang, "सारांश", "Summary") },
    { id: "lord", icon: "👑", label: bilingualText(lang, "स्वामी र फल", "Lord & results") },
    { id: "drishti", icon: "👁️", label: bilingualText(lang, "दृष्टि", "Aspects") },
    { id: "rules", icon: "📚", label: bilingualText(lang, "नियम", "Rules") },
  ];
  const [tab, setTab] = useState<TabId>("summary");

  return (
    <>
      <HeaderWrap className="gap-1 border-b border-border px-4 py-3.5 text-left">
        <TitleWrap className="flex items-center gap-2 text-lg">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-sm font-bold text-secondary">
            {digits(house.house)}
          </span>
          {ordinal} {bilingualText(lang, "भाव", "house")}
          {classicalName && (
            <span className="font-normal text-muted-foreground">
              · {bilingualText(lang, classicalName.ne, classicalName.en)}
            </span>
          )}
        </TitleWrap>
        <p className="text-sm text-muted-foreground">{themes.join(" · ")}</p>
      </HeaderWrap>

      {/* Tabs replace the old single long stacked-accordion list — only one
          group is on screen at a time, so reading the dialog no longer means
          scrolling past 7-8 sections to reach the one you want. */}
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-sm font-semibold transition-colors",
              tab === t.id
                ? "border-secondary/40 bg-secondary/12 text-secondary"
                : "border-border bg-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <span aria-hidden className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {tab === "summary" && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* यस भावमा — occupying grahas, condensed; leads with the chart's
                  actual sign/lord/type since that moved here out of the header */}
              <Block
                icon="🪐"
                title={bilingualText(lang, "यस भावमा", "Occupants")}
                right={occupants.length === 0 ? bilingualText(lang, "रिक्त", "Empty") : undefined}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                  <span>
                    <span className="font-semibold text-foreground">
                      {digits(house.rashi)} {formatRashiByNumber(house.rashi, lang)}
                    </span>{" "}
                    {bilingualText(lang, "राशि", "sign")}
                  </span>
                  <span className="text-border">·</span>
                  <span>
                    {bilingualText(lang, "स्वामी", "Lord")}{" "}
                    <span className="font-semibold text-secondary">{grahaName(lordKey, lang)}</span>
                  </span>
                  {badge && (
                    <>
                      <span className="text-border">·</span>
                      <span className="text-muted-foreground">{formatHouseBadge(badge, lang)}</span>
                    </>
                  )}
                </div>
                {occupants.length > 0 ? (
                  <div className="space-y-1.5">
                    {occupants.map((p) => {
                      const k = reference.grahaKarakatva[p.key];
                      const subjects = k
                        ? splitList(bilingualText(lang, k.subjectsNe, k.subjectsEn)).slice(0, 3).join(" · ")
                        : "";
                      return (
                        <div key={p.key}>
                          <p className="text-sm font-semibold text-foreground">{grahaName(p.key, lang)}</p>
                          {subjects && <p className="text-sm text-muted-foreground">{subjects}</p>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {bilingualText(
                      lang,
                      `कुनै ग्रह छैन — राशि स्वामी ${grahaName(lordKey, lang)}को स्थिति हेर्नुहोस्।`,
                      `No graha here — see the placement of ${grahaName(lordKey, lang)}, this house's ruling graha.`,
                    )}
                  </p>
                )}
              </Block>

              {/* स्वास्थ्य संकेत — the headline verdict, shown as a compact card
                  next to Occupants instead of buried as the 8th accordion item */}
              <Block
                icon="🩺"
                title={bilingualText(lang, "स्वास्थ्य संकेत", "Health signals")}
                right={
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm font-semibold leading-none",
                      verdictCls,
                    )}
                  >
                    {verdictLabel}
                  </span>
                }
              >
                <p className="text-sm leading-relaxed">
                  <span className="font-semibold text-foreground">
                    {bilingualText(lang, "अंग:", "Parts:")}
                  </span>{" "}
                  {bilingualText(lang, info.medicalNe, info.medicalEn)}
                </p>
                {bodyPart && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {bilingualText(lang, bodyPart.ne, bodyPart.en)}
                  </p>
                )}
                {!maleficPresent && !beneficPresent && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {bilingualText(
                      lang,
                      "यस भावमा कुनै ग्रहको दृष्टि वा उपस्थिति छैन।",
                      "No graha occupies or aspects this house.",
                    )}
                  </p>
                )}
              </Block>
            </div>

            {/* भाव विवरण — the full house-by-house reference notes (sign, lord,
                natural significator, description, cited shloka, and separate
                benefic/malefic effects), not just the one-line theme/summary
                the header already carries */}
            {houseDetail && (
              <Block
                icon="📖"
                title={bilingualText(lang, "भावको स्थायी जानकारी", "General house reference")}
              >
                <p className="text-sm text-muted-foreground">
                  {bilingualText(lang, houseDetail.titlesNe, houseDetail.titlesEn)}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span>
                    {bilingualText(lang, "स्वाभाविक कारक", "Natural significator")}:{" "}
                    <span className="font-semibold text-foreground">
                      {bilingualText(lang, houseDetail.naturalNe, houseDetail.naturalEn)}
                    </span>
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed">
                  {bilingualText(lang, houseDetail.descriptionNe, houseDetail.descriptionEn)}
                </p>
                {/* कालपुरुष कुण्डली अनुसार — यो सधैं मेष लग्न मानेर गणना गरिएको आदर्श/सैद्धान्तिक
                    राशि-स्वामी हो, यस जातकको वास्तविक राशि/स्वामी होइन (त्यो माथि हेडरमा
                    देखिन्छ)। दुवैलाई एउटै लेबलमा नराखिएकाले यहाँ छुट्टै र स्पष्ट चिनो दिइएको छ। */}
                <p className="mt-2 text-sm text-muted-foreground">
                  {bilingualText(
                    lang,
                    `कालपुरुष कुण्डली अनुसार यो भाव ${houseDetail.signNe} राशिसँग मेल खान्छ (राशि स्वामी ${houseDetail.lordNe}) — यो यस जातकको वास्तविक राशि होइन, माथिको भावको वास्तविक राशि/स्वामी हेर्नुहोस्।`,
                    `In the Kalapurusha (natural zodiac) chart this house corresponds to ${houseDetail.signEn} (ruled by ${houseDetail.lordEn}) — that's not this native's actual sign; see the real sign/lord for this house above.`,
                  )}
                </p>
                <div className="mt-2">
                  <ShlokaCard
                    label={bilingualText(lang, "शास्त्रीय प्रमाण", "Classical citation")}
                    source={bilingualText(lang, houseDetail.shlokaSourceNe, houseDetail.shlokaSourceEn)}
                    shloka={houseDetail.shloka}
                  />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {bilingualText(
                    lang,
                    "ग्रहको वास्तविक प्रभाव यसको भावेशत्व, बल, दृष्टि, संयोजन, अस्त/वक्री जस्ता अवस्थामा भर पर्छ — तल दिइएको सामान्य शुभ/पाप वर्गीकरण एउटा आधारभूत सिद्धान्त मात्र हो, अनिवार्य नियम होइन।",
                    "A graha's actual effect depends on its lordship, strength, aspects, conjunctions, combustion/retrogression and more — the general benefic/malefic classification below is only a baseline classical principle, not an unconditional rule.",
                  )}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {bilingualText(lang, "शुभ ग्रह", "Benefic grahas")} (
                    {bilingualText(lang, houseDetail.beneficGrahasNe, houseDetail.beneficGrahasEn)}):
                  </span>{" "}
                  {bilingualText(lang, houseDetail.beneficEffectNe, houseDetail.beneficEffectEn)}
                </p>
                <p className="mt-1 text-sm leading-relaxed">
                  <span className="font-semibold text-destructive">
                    {bilingualText(lang, "पापग्रह", "Malefic grahas")} (
                    {bilingualText(lang, houseDetail.maleficGrahasNe, houseDetail.maleficGrahasEn)}):
                  </span>{" "}
                  {bilingualText(lang, houseDetail.maleficEffectNe, houseDetail.maleficEffectEn)}
                </p>
              </Block>
            )}

          </div>
        )}

        {tab === "lord" && (
          <div className="space-y-3">
            {/* ग्रह फलादेश — one worked saravali example per occupying graha, expandable for full karakatva */}
            <Block
              icon="🪐"
              title={bilingualText(lang, "ग्रह फलादेश", "Graha in this house")}
              right={occupants.length > 0 ? digits(occupants.length) : undefined}
            >
              {occupants.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {occupants.map((p) => (
                    <div key={p.key} className="py-3 first:pt-0 last:pb-0">
                      <GrahaKarakatvaCard
                        grahaKey={p.key}
                        house={house.house}
                        reference={reference}
                        lang={lang}
                        digits={digits}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {bilingualText(
                    lang,
                    "यस भावमा कुनै ग्रह नभएकाले ग्रह फलादेश छैन।",
                    "No graha occupies this house, so there's no graha-in-house reading.",
                  )}
                </p>
              )}
            </Block>

            {/* भावेश सम्बन्ध — this house's real (chart-specific) lord and
                where it actually sits, with the matching BPHS ch. 13
                (भावेशफलाध्याय) shloka for that exact lord-house pair. */}
            <Block
              icon="👑"
              title={bilingualText(lang, "भावेश सम्बन्ध", "Lord placement")}
              right={
                lordHouse != null
                  ? bilingualText(lang, `${digits(lordHouse)}औँ भाव`, `house ${digits(lordHouse)}`)
                  : undefined
              }
            >
              {lordHouse != null ? (
                <p className="text-sm">
                  <span className="font-semibold text-foreground">{lordTitle}</span>{" "}
                  <span className="font-semibold text-secondary">{grahaName(lordKey, lang)}</span> →{" "}
                  {bilingualText(lang, `${digits(lordHouse)}औँ भाव`, `house ${digits(lordHouse)}`)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {bilingualText(
                    lang,
                    `राशि स्वामी ${grahaName(lordKey, lang)} यो D1 चार्टमा फेला परेन।`,
                    `Sign lord ${grahaName(lordKey, lang)} wasn't found placed in this D1 chart.`,
                  )}
                </p>
              )}
              {lordHouse != null &&
                (bhaveshEntry ? (
                  <div className="mt-2 space-y-1.5">
                    {bhaveshEntry.shloka && (
                      <ShlokaCard source={bilingualText(lang, "बृ.पा.हो.शा. (भावेशफलाध्याय)", "BPHS (ch. 13)")} shloka={bhaveshEntry.shloka} />
                    )}
                    <p className="text-sm leading-relaxed">{bilingualText(lang, bhaveshEntry.ne, bhaveshEntry.en)}</p>
                    <p className="text-sm text-muted-foreground">
                      {bilingualText(
                        lang,
                        `स्रोत: ${reference.bhaveshPhalaSource}`,
                        `Source: ${reference.bhaveshPhalaSource}`,
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    🚧 {bilingualText(lang, "चाँडै आउँदैछ", "Coming soon")}
                  </p>
                ))}
            </Block>

            {/* ग्रह युति फल — shown only when 2+ grahas share this house */}
            {showYutiSection && (
              <Block icon="👥" title={bilingualText(lang, "ग्रह युति फल", "Graha conjunction (yuti) result")}>
                <div className="space-y-3">
                  {yuti2Entry && (
                    <div className="border-l-2 border-secondary/40 pl-3">
                      <p className="text-sm font-semibold text-foreground">
                        {joinNames(occupantKeys, lang)}
                        {yuti2Entry.yogaNameNe && (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            ({bilingualText(lang, yuti2Entry.yogaNameNe, yuti2Entry.yogaNameEn ?? yuti2Entry.yogaNameNe)})
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed">{bilingualText(lang, yuti2Entry.textNe, yuti2Entry.textEn)}</p>
                    </div>
                  )}
                  {yuti3Entries.map((entry) => (
                    <div key={yutiKey(entry.grahas)} className="border-l-2 border-secondary/40 pl-3">
                      <p className="text-sm font-semibold text-foreground">{joinNames(entry.grahas, lang)}</p>
                      <p className="mt-1 text-sm leading-relaxed">{bilingualText(lang, entry.textNe, entry.textEn)}</p>
                    </div>
                  ))}
                  {occupantKeys.length >= 3 && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {bilingualText(lang, reference.grahaYutiGeneralRule.ne, reference.grahaYutiGeneralRule.en)}
                    </p>
                  )}
                  {!yuti2Entry && yuti3Entries.length === 0 && occupantKeys.length < 3 && (
                    <p className="text-sm text-muted-foreground">
                      {bilingualText(
                        lang,
                        "यो विशेष ग्रह-युतिको लागि सन्दर्भ अहिले उपलब्ध छैन।",
                        "No reference is available for this specific graha combination yet.",
                      )}
                    </p>
                  )}
                </div>
              </Block>
            )}
          </div>
        )}

        {tab === "drishti" && (
          /* दृष्टि — outgoing aspects from occupants, expandable for the full incoming picture */
          <Block icon="👁️" title={bilingualText(lang, "दृष्टि", "Aspects")}>
            {occupants.length > 0 ? (
              <div className="space-y-1.5">
                {occupants.map((p) => {
                  const targets = drishtiTargetHouses(p.key, house.house);
                  return (
                    <p key={p.key} className="text-sm">
                      <span className="font-semibold text-foreground">{grahaName(p.key, lang)}</span>
                      {" → "}
                      {targets.map((t) => bilingualText(lang, `${digits(t)}औँ`, digits(t))).join(" · ")}{" "}
                      {bilingualText(lang, "भाव", "house")}
                    </p>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {bilingualText(
                  lang,
                  "यस भावमा कुनै ग्रह नभएकाले यहाँबाट बाहिर दृष्टि पर्दैन।",
                  "No graha occupies this house, so it casts no aspect outward.",
                )}
              </p>
            )}
            <div className="mt-3 border-t border-border/60 pt-3">
              <p className="mb-1.5 text-sm font-semibold text-foreground">
                {bilingualText(lang, "सबै दृष्टि", "All aspects")}
              </p>
              {aspectedBy.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    {bilingualText(lang, "यस भावमा दृष्टि गर्ने ग्रहहरू:", "Grahas aspecting this house:")}
                  </p>
                  {aspectedBy.map((k) => {
                    const d = reference.grahaDrishti[k];
                    return (
                      <div key={k}>
                        <p className="text-sm font-semibold text-foreground">{grahaName(k, lang)}</p>
                        {d && (
                          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                            {bilingualText(lang, d.summaryNe, d.summaryEn)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {bilingualText(lang, "यस भावमा कुनै ग्रहको दृष्टि पर्दैन।", "No graha aspects this house.")}
                </p>
              )}
            </div>
          </Block>
        )}

        {tab === "rules" && (
          /* सम्बन्धित नियम — Brighu Naadi sutras + Lal Kitab signals */
          <Block icon="📚" title={bilingualText(lang, "सम्बन्धित नियम", "Related rules")}>
            <Accordion type="multiple">
              <AccordionItem value="naadi">
                <AccordionTrigger className="text-sm hover:no-underline">
                  <span className="flex-1">{bilingualText(lang, "भृगु नाडी सूत्र", "Brighu Naadi sutras")}</span>
                  <span className="text-muted-foreground">{digits(applicableSutras.length)}</span>
                </AccordionTrigger>
                <AccordionContent>
                  {applicableSutras.length > 0 ? (
                    <div className="space-y-3">
                      {applicableSutras.map((s) => (
                        <div key={s.number} className="border-l-2 border-secondary/40 pl-3">
                          <p className="text-sm font-semibold text-foreground">
                            {bilingualText(lang, `सूत्र ${digits(s.number)} — ${s.titleNe}`, `Sutra ${digits(s.number)} — ${s.titleEn}`)}
                          </p>
                          <p className="text-sm text-muted-foreground">{bilingualText(lang, s.categoryNe, s.categoryEn)}</p>
                          <p className="mt-1 text-sm leading-relaxed">{bilingualText(lang, s.bodyNe, s.bodyEn)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {bilingualText(
                        lang,
                        "यस भावमा कुनै ग्रह नभएकाले लागू हुने भृगु नाडी सूत्र देखिएका छैनन्।",
                        "No Brighu Naadi sutras apply, since no graha occupies this house.",
                      )}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">
                    {bilingualText(lang, `स्रोत: ${reference.naadiSutraSource}`, `Source: ${reference.naadiSutraSource}`)}
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="lalkitab">
                <AccordionTrigger className="text-sm hover:no-underline">
                  <span className="flex-1">{bilingualText(lang, "लाल किताब", "Lal Kitab")}</span>
                  <span className="text-muted-foreground">{digits(lalKitabEntries.length)}</span>
                </AccordionTrigger>
                <AccordionContent>
                  {lalKitabEntries.length > 0 ? (
                    <div className="space-y-3">
                      {lalKitabEntries.map(({ key, entry }) => {
                        const tip = reference.lalKitabSafetyTips[key];
                        return (
                          <div key={key}>
                            <p className="text-sm font-semibold text-foreground">
                              {GRAHA_ICON[key as GrahaKey] ?? "🪐"} {grahaName(key, lang)} —{" "}
                              {bilingualText(lang, `भाव ${digits(house.house)}`, `house ${digits(house.house)}`)}
                            </p>
                            <p className="mt-0.5 text-sm leading-relaxed">{bilingualText(lang, entry.ne, entry.en)}</p>
                            {tip && (
                              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                {bilingualText(lang, "सुरक्षित व्यवहार:", "Safe practice:")} {bilingualText(lang, tip.ne, tip.en)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {bilingualText(
                        lang,
                        `यस भावमा कुनै ग्रह नभएकाले प्रत्यक्ष लाल किताब सङ्केत छैन। यस भावको पक्का घर स्वामी ${joinNames(lalKitabFixedLord, lang)}को स्थिति हेर्नुहोस्।`,
                        `This house has no occupying graha, so there's no direct Lal Kitab signal. See the placement of ${joinNames(lalKitabFixedLord, lang)}, this house's fixed (pakka ghar) lord.`,
                      )}
                    </p>
                  )}
                  {lalKitabYutiMatch && (
                    <div className="mt-3 border-l-2 border-secondary/40 pl-3">
                      <p className="text-sm font-semibold text-foreground">
                        {bilingualText(lang, "👥 ग्रह युति —", "👥 Graha yuti —")} {joinNames(lalKitabYutiMatch.grahas, lang)}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed">
                        {bilingualText(lang, lalKitabYutiMatch.textNe, lalKitabYutiMatch.textEn)}
                      </p>
                    </div>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">
                    {bilingualText(lang, "स्रोत: लाल किताब — भाग २–११", "Source: Lal Kitab, parts 2–11")}
                  </p>
                  <Accordion type="single" collapsible className="mt-2">
                    <AccordionItem value="lalkitab-sustha-dustha" className="border-b-0">
                      <AccordionTrigger className="py-1.5 text-sm text-secondary hover:no-underline">
                        {bilingualText(
                          lang,
                          "लाल किताबको सुस्थ/दुःस्थ नियम के हो?",
                          "What is Lal Kitab's sustha/dustha rule?",
                        )}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-1.5">
                          {reference.lalKitabSusthaDustha.map((rule, i) => (
                            <p key={i} className="text-sm leading-relaxed">
                              {bilingualText(lang, rule.ne, rule.en)}
                            </p>
                          ))}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {bilingualText(
                            lang,
                            `स्रोत: ${reference.lalKitabRevisionSource}`,
                            `Source: ${reference.lalKitabRevisionSource}`,
                          )}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Block>
        )}
      </div>

      <div className="flex justify-end border-t border-border px-4 py-3">
        <Button variant="outline" onClick={onClose}>
          {bilingualText(lang, "बन्द गर्नुहोस्", "Close")}
        </Button>
      </div>
    </>
  );
}
