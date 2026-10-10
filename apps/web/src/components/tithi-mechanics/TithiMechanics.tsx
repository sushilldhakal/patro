import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pause, Play } from "lucide-react";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { moonIllumination, WHEEL_TITHIS, tithiIndexFromElongation, tithiNum, tithiPaksha, tithiPakshaEn } from "@/lib/tithi-wheel-data";
import { ElongationDiagram, EARTH_ARC_SYNODIC, earthOrbitDegFromLunarDay } from "./ElongationDiagram";
import { SYNODIC_MONTH } from "@/components/learn/sun-earth-moon-math";
import { cn } from "@/lib/utils";
import { edScrub } from "@/lib/diagram-classes";
import { AdhikMassDiagram, SunriseTimeline } from "./tithi-mechanics-diagrams";
import { useLocale, bilingualText } from "@/i18n/locale";
import { tmCardCap, tmCardPadLg, tmFcard, tmFormula, tmHero, tmHeroEyebrow, tmHeroSub, tmHeroTitle, tmKey, tmKeys, tmLede, tmNote, tmPageShell, tmSecEn, tmSecHead, tmSecKicker, tmSecTitle, tmSection, tmWrap, edControls, edPlayBtn, edPresets, edPreset, edReadout, edRo, edRoK, edRoV, edScrubWrap } from "@/lib/learn-classes";

const PRESETS = [
  { ne: "औंसी", en: "Aaushi", day: 0 },
  { ne: "शुक्ल अष्टमी", en: "Shukla Ashtami", day: (90 / 360) * SYNODIC_MONTH },
  { ne: "पूर्णिमा", en: "Purnima", day: (174 / 360) * SYNODIC_MONTH },
  { ne: "कृष्ण अष्टमी", en: "Krishna Ashtami", day: (270 / 360) * SYNODIC_MONTH },
];

/** One simulated day per second — full two-month run ~60 s. */
const LUNAR_DAYS_PER_SEC = 1;

function elongationFromLunarDay(day: number): number {
  return ((day % SYNODIC_MONTH) / SYNODIC_MONTH) * 360;
}

function lunarDayFromElongation(E: number, monthStart: number): number {
  return monthStart + ((((E % 360) + 360) % 360) / 360) * SYNODIC_MONTH;
}

/** ~30 fps — smooth motion without React choking on 60 full SVG rebuilds/sec. */
const ANIM_FRAME_MS = 33;

export interface ElongationStudyProps {
  /** How many synodic months to play before looping (default 2 for solar-system). */
  animMonths?: number;
  /** Dashed Earth guide arc span in lunar months (default matches animMonths). */
  earthPathMonths?: number;
}

export function ElongationStudy({ animMonths = 2, earthPathMonths }: ElongationStudyProps) {
  const { t } = useTranslation();
  const pathMonths = earthPathMonths ?? animMonths;
  const { lang, digits } = useLocale();
  const [lunarDay, setLunarDay] = useState((87 / 360) * SYNODIC_MONTH);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const animDayRef = useRef(lunarDay);
  const fmt = (n: number) => digits(n);
  const animSpan = SYNODIC_MONTH * animMonths;
  const E = elongationFromLunarDay(lunarDay);
  const lunarMonthNum = Math.floor(lunarDay / SYNODIC_MONTH) + 1;
  const dayInMonth = lunarDay % SYNODIC_MONTH;

  useEffect(() => {
    animDayRef.current = lunarDay;
  }, [lunarDay]);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let lastPaint = last;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      animDayRef.current = (animDayRef.current + dt * LUNAR_DAYS_PER_SEC) % animSpan;
      if (now - lastPaint >= ANIM_FRAME_MS) {
        lastPaint = now;
        setLunarDay(animDayRef.current);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, animSpan]);

  const idx = tithiIndexFromElongation(E);
  const wheelTithi = WHEEL_TITHIS[idx]!;
  const paksha = bilingualText(lang, tithiPaksha(idx), tithiPakshaEn(idx));
  const tno = tithiNum(idx);
  const illum = moonIllumination(E);
  const tithiLabel = wheelTithi.moon === "full" ? t("learn.purnima") : wheelTithi.moon === "new" ? t("learn.aunsi") : bilingualText(lang, wheelTithi.ne, wheelTithi.en);
  const earthArc = earthOrbitDegFromLunarDay(lunarDay);
  const monthStart = Math.floor(lunarDay / SYNODIC_MONTH) * SYNODIC_MONTH;

  return (
    <div className={tmCardPadLg}>
      <ElongationDiagram
        E={E}
        lunarDay={lunarDay}
        earthPathMonths={pathMonths}
        onE={(v) => {
          setPlaying(false);
          setLunarDay(lunarDayFromElongation(v, monthStart));
        }}
      />
      <div className={edControls}>
        <div className={edReadout}>
          {animMonths > 1 && (
            <div className={edRo}>
              <span className={edRoK}>{t("learn.total_days_2_lunar_months")}</span>
              <span className={edRoV({ mono: true })}>
                {fmt(Math.round(lunarDay * 10) / 10)} / ~{fmt(Math.round(animSpan))}
              </span>
            </div>
          )}
          <div className={edRo}>
            <span className={edRoK}>
              {animMonths > 1
                ? t("learn.lunar_month_day")
                : t("learn.day_of_lunar_month")}
            </span>
            <span className={edRoV({ amber: animMonths > 1 && lunarMonthNum === 2 })}>
              {animMonths > 1
                ? `${fmt(lunarMonthNum)} · ${fmt(Math.round(dayInMonth * 10) / 10)} / ~${fmt(Math.round(SYNODIC_MONTH))}`
                : `${fmt(Math.round(lunarDay * 10) / 10)} / ~${fmt(Math.round(SYNODIC_MONTH))}`}
            </span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.elongation")}</span>
            <span className={edRoV({ mono: true })}>{fmt(Math.round(E))}°</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.month_paksha")}</span>
            <span className={edRoV()}>{t("learn.ashadh")} {paksha}</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.tithi")}</span>
            <span className={edRoV({ amber: true })}>
              {tithiLabel} · {fmt(tno)}
            </span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.illumination")}</span>
            <span className={edRoV({ mono: true })}>{fmt(illum)}%</span>
          </div>
          <div className={edRo}>
            <span className={edRoK}>{t("learn.earth_arc")}</span>
            <span className={edRoV({ mono: true })}>
              {fmt(Math.round(earthArc))}° / ~{fmt(Math.round(EARTH_ARC_SYNODIC * pathMonths))}°
            </span>
          </div>
        </div>
        <div className={edScrubWrap}>
          <button
            type="button"
            className={edPlayBtn}
            onClick={() => setPlaying((p) => !p)}
            title={playing ? t("learn.pause") : t("learn.play")}
            aria-label={playing ? t("learn.pause") : t("learn.play")}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <input
            className={edScrub}
            type="range"
            min={0}
            max={animSpan}
            step={0.05}
            value={lunarDay}
            style={{ "--fill": `${(lunarDay / animSpan) * 100}%` } as React.CSSProperties}
            onChange={(e) => {
              setPlaying(false);
              setLunarDay(+e.target.value);
            }}
          />
        </div>
        <div className={edPresets}>
          {PRESETS.map((p) => (
            <button
              key={p.ne}
              type="button"
              className={edPreset(Math.abs(lunarDay - p.day) < 0.8 || Math.abs(lunarDay - (p.day + SYNODIC_MONTH)) < 0.8)}
              onClick={() => {
                setPlaying(false);
                setLunarDay(p.day);
              }}
            >
              {bilingualText(lang, p.ne, p.en)}
            </button>
          ))}
          {animMonths > 1 && (
            <button
              type="button"
              className={edPreset(Math.abs(lunarDay - SYNODIC_MONTH) < 0.8)}
              onClick={() => {
                setPlaying(false);
                setLunarDay(SYNODIC_MONTH);
              }}
            >
              {t("learn.month_2_aaushi")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function TithiMechanics() {
  return (
    <div className={cn(tmPageShell, "rounded-2xl border border-border overflow-hidden")}>
      <div className={tmWrap}>
        <header className={tmHero}>
          <div className={tmHeroEyebrow}>पञ्चाङ्ग · तिथिको गणित</div>
          <h2 className={tmHeroTitle}>
            तिथि कसरी बन्छ — र किन कहिले <b>दोहोरिन्छ वा हराउँछ</b>
          </h2>
          <p className={tmHeroSub}>
            एक तिथि भनेको चन्द्र र सूर्यबीचको <b>१२° कोणीय दूरी</b> हो। यो कोण फरक–फरक गतिमा
            बढ्ने हुनाले कहिलेकाहीँ एउटै तिथि दुई दिन पर्छ, कहिले एउटा तिथि नै छुट्छ, अनि चान्द्र
            र सौर मासको भिन्नताले अधिक मास जन्मन्छ।
          </p>
        </header>

        <section className={tmSection}>
          <div className={tmSecHead}>
            <span className={tmSecKicker}>०१</span>
            <h3 className={tmSecTitle}>सूर्य · पृथ्वी · चन्द्र — तिथिको आधार</h3>
          </div>
          <p className={tmLede}>
            पृथ्वीबाट हेर्दा चन्द्रमा सूर्यभन्दा जति <span className={cn("hl")}>कोणले अगाडि</span> पुग्छ,
            त्यही कोणले तिथि निर्धारण गर्छ। <b>०°</b> मा दुवै एकै दिशामा हुन्छन् —{" "}
            <span className={cn("hl-amber")}>औंसी</span>। कोण बढ्दै <b>१८०°</b> पुग्दा चन्द्र ठ्याक्क
            विपरीत — <span className={cn("hl-amber")}>पूर्णिमा</span>। तल मुनको गोलो तानेर वा चलाउनुहोस्।
          </p>
          <ElongationStudy animMonths={1} />

          <div className={tmFormula}>
            <div className={tmFcard}>
              <div className={cn("big")}>
                {toNepaliDigits(12)}
                <span className={cn("u")}>°</span>
              </div>
              <div className={cn("lbl")}>= १ तिथि</div>
              <div className={cn("desc")}>३६०° ÷ ३० तिथि। हरेक १२° कोण पार गर्दा नयाँ तिथि सुरु हुन्छ।</div>
            </div>
            <div className={tmFcard}>
              <div className={cn("big")}>
                ~{toNepaliDigits(12)}
                <span className={cn("u")}>°/दिन</span>
              </div>
              <div className={cn("lbl")}>चन्द्रको औसत गति</div>
              <div className={cn("desc")}>
                तर वास्तवमा १०.७°–१४.३° सम्म घटबढ हुन्छ — चन्द्र कक्षको आकारका कारण।
              </div>
            </div>
            <div className={tmFcard}>
              <div className={cn("big")}>सूर्योदय</div>
              <div className={cn("lbl")}>तिथि कहिले गनिन्छ?</div>
              <div className={cn("desc")}>
                जुन तिथि <b>सूर्योदयमा</b> चलिरहेको हुन्छ, त्यही दिनको तिथि मानिन्छ — यही नियमले
                वृद्धि र क्षय जन्माउँछ।
              </div>
            </div>
          </div>
        </section>

        <section className={tmSection}>
          <div className={tmSecHead}>
            <span className={tmSecKicker}>०२</span>
            <h3 className={tmSecTitle}>तिथि वृद्धि — एउटै तिथि दुई दिन</h3>
            <span className={tmSecEn}>Repeated tithi</span>
          </div>
          <p className={tmLede}>
            जब चन्द्र <span className={cn("hl")}>मन्द गतिमा</span> (~१०.७°/दिन) हिँड्छ, एउटै १२° को
            तिथि–खण्डले <b>लगातार दुई सूर्योदय</b> समेट्छ। दुवै बिहान त्यही तिथि चलिरहेकाले
            पात्रोमा त्यो तिथि <span className={cn("hl-amber")}>दुई दिन</span> देखिन्छ।
          </p>
          <div className={tmCardPadLg}>
            <SunriseTimeline mode="vriddhi" />
            <div className={tmCardCap}>
              तृतीया खण्ड यति फराकिलो छ कि १० र ११ गते — दुवै सूर्योदय यसैभित्र परे। त्यसैले
              तृतीया दोहोरियो।
            </div>
          </div>
        </section>

        <section className={tmSection}>
          <div className={tmSecHead}>
            <span className={tmSecKicker}>०३</span>
            <h3 className={tmSecTitle}>तिथि क्षय — हराएको तिथि</h3>
            <span className={tmSecEn}>Skipped tithi</span>
          </div>
          <p className={tmLede}>
            उल्टो, जब चन्द्र <span className={cn("hl")}>द्रुत गतिमा</span> (~१४.३°/दिन) हिँड्छ, कुनै १२° को
            तिथि–खण्ड <b>दुई सूर्योदयको बीचमै</b> पूरै सकिन्छ। कुनै पनि सूर्योदयमा त्यो तिथि
            नभेटिएकाले त्यो <span className={cn("hl-amber")}>क्षय</span> भई पात्रोबाट हराउँछ।
          </p>
          <div className={tmCardPadLg}>
            <SunriseTimeline mode="kshaya" />
            <div className={tmCardCap}>
              अष्टमी खण्ड साँघुरो भएर एक सूर्योदयदेखि अर्कोको बीचमै सकियो — कुनै बिहान अष्टमी परेन,
              त्यसैले त्यो क्षय भयो।
            </div>
          </div>
        </section>

        <section className={tmSection}>
          <div className={tmSecHead}>
            <span className={tmSecKicker}>०४</span>
            <h3 className={tmSecTitle}>अधिक मास — थपिने महिना</h3>
            <span className={tmSecEn}>Extra month</span>
          </div>
          <p className={tmLede}>
            एक <b>चान्द्र मास</b> (औंसीदेखि औंसी) ~२९.५ दिनको हुन्छ; एक <b>सौर मास</b> (सूर्य
            एक राशिमा रहने अवधि) ~३०.४ दिनको। चान्द्र मास छोटो भएकाले बेलाबेला एउटा चान्द्र
            मासभित्र <span className={cn("hl")}>कुनै सङ्क्रान्ति पर्दैन</span> — त्यही महिना{" "}
            <span className={cn("hl-amber")}>अधिक मास</span> कहलिन्छ र अघिल्लो महिनाको नाम दोहोरिन्छ।
          </p>
          <div className={tmCardPadLg}>
            <AdhikMassDiagram />
            <div className={tmCardCap}>
              यहाँ मेष सौर मासभित्रै दुई औंसी परे — बीचको चान्द्र मासमा कुनै सङ्क्रान्ति
              नपरेकाले त्यो “अधिक वैशाख” बन्यो; त्यसपछिको नियमित महिना “निज वैशाख”।
            </div>
          </div>
          <div className={tmKeys}>
            <div className={tmKey}>
              <h4>~३२.५ महिनामा एकपटक</h4>
              <p>
                यसरी जोडिँदै गएको फरक झन्डै हरेक तीन वर्षमा एक अधिक मास बनाउँछ, जसले चान्द्र र सौर
                वर्षलाई मिलाउँछ।
              </p>
            </div>
            <div className={tmKey}>
              <h4>अधिक र निज</h4>
              <p>
                सङ्क्रान्ति बिनाको महिना “अधिक”, र त्यसपछि सङ्क्रान्ति परेको महिना “निज” (साँचो)
                भनिन्छ — जस्तै अधिक जेठ अनि निज जेठ।
              </p>
            </div>
            <div className={tmKey}>
              <h4>क्षय मास</h4>
              <p>
                विरलै, एउटै चान्द्र मासमा दुई सङ्क्रान्ति परे त्यो महिना क्षय हुन्छ — अधिक मासको
                ठीक विपरीत।
              </p>
            </div>
          </div>
        </section>

        <p className={tmNote}>
          टिप्पणी: माथिका अङ्क र गति अवधारणा बुझाउन सरलीकृत गरिएका हुन्। वास्तविक पात्रोमा
          चन्द्र–सूर्यको खास स्थिति गणना गर्न पञ्चाङ्ग इन्जिन प्रयोग गरिन्छ।
        </p>
      </div>
    </div>
  );
}
