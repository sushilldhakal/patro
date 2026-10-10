import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toNepaliDigits } from "@/lib/panchanga-format";
import { ElongationStudy } from "@/components/tithi-mechanics/TithiMechanics";
import { HeliocentricOrbitStudy } from "@/components/learn/HeliocentricOrbitStudy";
import { EarthRotationDiagram } from "@/components/learn/EarthRotationDiagram";
import { EclipseStudy } from "@/components/learn/EclipseStudy";
import { MoonOrbitTiltStudy } from "@/components/learn/MoonOrbitTilt";
import { SolarEclipseStudy } from "@/components/learn/SolarEclipseStudy";
import { AyanamshaWheel } from "@/components/learn/AyanamshaWheel";
import { EquinoxPrecession } from "@/components/learn/EquinoxPrecession";
import { PrecessionCone } from "@/components/learn/PrecessionCone";
import { MoonPhasesStrip } from "@/components/learn/MoonPhasesStrip";
import {
  GrahaReferenceTable,
  KaranaReferenceTable,
  NakshatraReferenceTable,
  RashiReferenceTable,
  TithiReferenceTable,
  YogaReferenceTable,
} from "@/components/learn/PanchangaReferenceGuide";
import {
  SunriseTimeline,
} from "@/components/tithi-mechanics/tithi-mechanics-diagrams";
import { HoraRing } from "@/components/panchanga/HoraRing";
import {
  resolveLocationTimezone,
  usePanchangaLocation,
} from "@/components/panchanga/use-panchanga-location";
import { fetchPanchangaDay, panchangaKeys } from "@/lib/api";
import { AD_DISPLAY, patroDayFetchFromApiDateAd } from "@/lib/patro-day-url";
import { resolveTimeZone, todayAdStringInTimezone } from "@/lib/zoned-time";
import { useLocale, bilingualNode } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import {
  ssPhasesHeading,
  tmCardCap,
  tmCardPadLg,
  tmFcard,
  tmFormula,
  tmKey,
  tmKeys,
  tmLede,
  tmNote,
  tmSecEn,
  tmSecHead,
  tmSecKicker,
  tmSecTitle,
  tmSection,
} from "@/lib/learn-classes";

const N = toNepaliDigits;

/* ------------------------------------------------------------------ */
/* Small presentational helpers (reuse the tm-* design system)        */
/* ------------------------------------------------------------------ */

function Lede({ children }: { children: React.ReactNode }) {
  return <p className={tmLede}>{children}</p>;
}

function Section({
  kicker,
  title,
  en,
  children,
}: {
  kicker: string;
  title: string;
  en?: string;
  children: React.ReactNode;
}) {
  const { lang } = useLocale();
  return (
    <section className={tmSection}>
      <div className={tmSecHead}>
        <span className={tmSecKicker}>{kicker}</span>
        <h3 className={tmSecTitle}>{title}</h3>
        {lang === "en" && en ? <span className={tmSecEn}>{en}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Keys({ items }: { items: { h: string; p: React.ReactNode }[] }) {
  return (
    <div className={tmKeys}>
      {items.map((k) => (
        <div className={tmKey} key={k.h}>
          <h4>{k.h}</h4>
          <p>{k.p}</p>
        </div>
      ))}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className={tmNote}>{children}</p>;
}

/* ================================================================== */
/* ARTICLES                                                            */
/* ================================================================== */

export function AstronomyBasics() {
      const { lang } = useLocale();
  return bilingualNode(lang, <>
      <Section kicker="०१" title="आकाश कसरी देखिन्छ" en="What we see from Earth">
        <Lede>
          रातको आकाशमा <span className="hl">ताराहरू</span> टाढाका सूर्यजस्तै उज्यालो
          बिन्दु हुन्। दिनमा <span className="hl-amber">सूर्य</span> सबैभन्दा चम्किलो
          देखिन्छ; रातमा <span className="hl">चन्द्रमा</span> सबैभन्दा नजिकको खगोलीय
          पिण्ड हो — यिनै तीनले नेपाली पात्रो र पञ्चाङ्गको गणनाको आधार बनाउँछन्।
        </Lede>
        <Keys
          items={[
            {
              h: "क्षितिज र शिरोबिन्दु",
              p: "जहाँ आकाश र जमिन भेटिन्छ — क्षितिज; सिधै माथि — शिरोबिन्दु। सबै खगोलीय वस्तु यही गोलाकार आकाशमा देखिन्छ।",
            },
            {
              h: "सूर्य पूर्व → पश्चिम",
              p: "सूर्य नभई पृथ्वी घुमिरहेको हुनाले सूर्य उदाएजस्तो लाग्छ — यो घूर्णनको परिणाम हो, परिक्रमा होइन।",
            },
            {
              h: "चन्द्रमा र ताराहरू",
              p: "चन्द्रमा सूर्यको प्रकाश परावर्तन गर्छ (आफैं बल्दैन); ताराहरू आफैं चम्किन्छन्।",
            },
          ]}
        />
      </Section>
      <Section kicker="०२" title="घूर्णन र परिक्रमा" en="Rotation vs revolution">
        <Lede>
          खगोलमा <b>दुई फरक गति</b> छन् — यिनलाई नमिलाउँदा धेरै भ्रम हुन्छ।{" "}
          <span className="hl">घूर्णन</span> = आफ्नै अक्षमा फर्किने (दिन–रात)।{" "}
          <span className="hl-amber">परिक्रमा</span> = अर्को वस्तुको वरिपरि फर्किने
          (वर्ष, महिना)।
        </Lede>
        <Keys
          items={[
            { h: "पृथ्वीको घूर्णन ≈ २४ घण्टा", p: "एक सौर दिन — सूर्य फेरि उस्तै स्थानमा देखा पर्ने समय।" },
            { h: "पृथ्वीको परिक्रमा ≈ ३६५ दिन", p: "सूर्यको वरिपरि एक फेरो — वर्ष र ऋतु यसैले बन्छ।" },
            { h: "चन्द्रको परिक्रमा ≈ २९.५ दिन", p: "पृथ्वीको वरिपरि — तिथि र पक्ष यसै गतिमा आधारित।" },
          ]}
        />
        <Note>
          पछिल्लो लेखमा यी गतिहरू चित्रसहित विस्तारमा हेर्न सकिन्छ — तर पहिले यो भिन्नता
          स्पष्ट हुनु जरूरी छ।
        </Note>
      </Section>
      <Section kicker="०३" title="कोण किन महत्त्वपूर्ण" en="Why degrees matter">
        <Lede>
          पञ्चाङ्गमा सूर्य, चन्द्र र अन्य ग्रहहरूको स्थिति <b>कोण (°)</b> मा मापिन्छ।
          पूर्ण आकाशलाई <b>{N(360)}°</b> मा बाँडेर “चन्द्र सूर्यभन्दा कति अगाडि छ” भन्ने
          प्रश्नको उत्तर दिइन्छ — तिथि, नक्षत्र र योग यही कोणबाट निकालिन्छ।
        </Lede>
        <div className={tmFormula}>
          <div className={tmFcard}>
            <div className="big">
              {N(360)}
              <span className="u">°</span>
            </div>
            <div className="lbl">पूर्ण वृत्त</div>
            <div className="desc">आकाशको एक पूरा फेरो — सबै राशि र नक्षत्र यसैभित्र।</div>
          </div>
          <div className={tmFcard}>
            <div className="big">
              {N(12)}
              <span className="u">°</span>
            </div>
            <div className="lbl">१ तिथि</div>
            <div className="desc">चन्द्र–सूर्यको कोणीय दूरी — ३६०° ÷ ३० तिथि।</div>
          </div>
          <div className={tmFcard}>
            <div className="big">
              ~{N(13)}
              <span className="u">°२०′</span>
            </div>
            <div className="lbl">१ नक्षत्र</div>
            <div className="desc">३६०° ÷ २७ नक्षत्र — चन्द्रको गति यसै स्केलमा मापिन्छ।</div>
          </div>
        </div>
      </Section>
      <Section kicker="०४" title="हाम्रो दृष्टिकोण" en="Geocentric framing">
        <Lede>
          वास्तवमा पृथ्वी सूर्यको वरिपरि घुम्छ, तर पात्रो बनाउँदा हामी{" "}
          <span className="hl">पृथ्वीबाट हेर्दा</span> के देखिन्छ भन्ने दृष्टिकोण (
          <b>भूकेन्द्रित</b>) प्रयोग गर्छौं — “आज सूर्य कुन राशिमा छ”, “चन्द्र कति अगाडि
          सर्‍यो”। यो सुविधाजनक हो र हजारौं वर्षदेखि प्रयोग भइरहेको छ।
        </Lede>
        <Keys
          items={[
            {
              h: "सूर्यको मार्ग (क्रान्तिवृत्त)",
              p: "सूर्य, चन्द्र र ग्रहहरू लगभग एउटै पट्टीमा देखिन्छ — यही चन्द्र–मार्ग हो।",
            },
            {
              h: "राशि चक्र",
              p: "यो मार्गलाई १२ भाग — मेषदेखि मीनसम्म; सङ्क्रान्ति = सूर्य अर्को राशिमा।",
            },
            {
              h: "सूर्यकेन्द्रित र भूकेन्द्रित",
              p: "वास्तविक गति सूर्य–केन्द्रित; पात्रो गणना पृथ्वी–केन्द्रित — दुवै सही, प्रयोजन फरक।",
            },
          ]}
        />
      </Section>
      <Section kicker="०५" title="१२ राशि" en="Zodiac signs">
        <Lede>
          सूर्यको मार्ग (क्रान्तिवृत्त) लाई <b>{N(12)} बराबर भाग</b> मा बाँडिएको छ — प्रत्येक{" "}
          <span className="hl-amber">३०°</span> को एक राशि। सङ्क्रान्ति = सूर्य अर्को राशिमा
          प्रवेश; बि.सं. को महिना पनि यही सूर्य–राशिमा आधारित।
        </Lede>
        <RashiReferenceTable />
      </Section>
      <Section kicker="०६" title="नव ग्रह" en="Nine grahas">
        <Lede>
          पञ्चाङ्ग र कुण्डलीमा <b>{N(9)} ग्रह</b> (नव ग्रह) प्रयोग हुन्छ — सात वास्तविक ग्रह
          र दुई <span className="hl">छाया बिन्दु</span> (राहु, केतु)। सबैको स्थिति कोणमा
          मापिन्छ।
        </Lede>
        <GrahaReferenceTable />
      </Section>
      <Section kicker="०७" title="२७ नक्षत्र र पद" en="Lunar mansions & padas">
        <Lede>
          चन्द्र–मार्ग <b>{N(27)} नक्षत्र</b> मा बाँडिन्छ (प्रत्येक{" "}
          <b>{N(13)}°{N(20)}′</b>)। हरेक नक्षत्र फेरि <b>{N(4)} पद</b> ({N(3)}°{N(20)}′
          प्रति पद) — जन्म नामाक्षर र कुण्डलीका लागि यही पद प्रयोग हुन्छ।
        </Lede>
        <NakshatraReferenceTable />
      </Section>
      <Section kicker="०८" title="३० तिथि" en="Lunar days">
        <Lede>
          चन्द्र र सूर्यबीचको कोण हरेक <b>{N(12)}°</b> बढ्दा नयाँ तिथि सुरु — शुक्ल पक्ष{" "}
          {N(1)}–{N(15)} (पूर्णिमासम्म), कृष्ण पक्ष {N(1)}–{N(15)} (औंसीसम्म)।
        </Lede>
        <TithiReferenceTable />
      </Section>
      <Section kicker="०९" title="२७ योग" en="Yogas">
        <Lede>
          सूर्य र चन्द्रको <b>देशान्तर जोड</b> बढ्दै गए बढ्दै {N(27)} योग बन्दै जान्छ —
          विष्कम्भदेखि वैधृतिसम्म। शुभ–अशुभ मुहूर्तमा योग पनि हेरिन्छ।
        </Lede>
        <YogaReferenceTable />
      </Section>
      <Section kicker="१०" title="११ करण" en="Karanas">
        <Lede>
          प्रत्येक तिथिको <b>आधा</b> (= {N(6)}° कोण) एक करण — महिनामा जम्मा{" "}
          <span className="hl-amber">{N(60)} करण</span>। नाम {N(11)} मात्र: {N(7)} चर
          (बारम्बार) र {N(4)} स्थिर (महिनामा एक पटक)।
        </Lede>
        <KaranaReferenceTable />
      </Section>
      <Section kicker="११" title="अर्को कदम" en="What comes next">
        <Lede>
          अब तपाईंले जान्नुपर्ने मूल कुरा — <b>के हेर्दैछौं</b>, <b>कसरी घुमिरहेको छ</b>, र{" "}
          <b>किन कोण गनिन्छ</b> — स्पष्ट भयो। अर्को लेखमा सौर्यमण्डल, पृथ्वीको झुकाव, चन्द्र
          कला र वास्तविक परिक्रमा चित्रसहित हेर्नुहोस्।
        </Lede>
        <Keys
          items={[
            { h: "सौर्यमण्डल र चन्द्र गति", p: "पृथ्वीको अण्डाकार कक्ष, २३.५° झुकाव, चन्द्रका कला।" },
            { h: "सौर vs चान्द्र पात्रो", p: "विक्रम सम्वत् किन दुई घडी मिलाएर चल्छ।" },
            { h: "पञ्चाङ्गका पाँच अङ्ग", p: "तिथि, वार, नक्षत्र, योग, करण — कोणबाट कसरी जन्मिन्छन्।" },
          ]}
        />
      </Section>
      <Note>
        यी आधार बुझिसकेपछि बाँकी लेखहरू सजिलो लाग्नेछ — प्रत्येकले माथिको एउटै भाषा (
        कोण, परिक्रमा, पृथ्वी–केन्द्रित दृष्टि) प्रयोग गर्छ।
      </Note>
    </>,
    <>
      <Section kicker="01" title="What the sky looks like" en="What we see from Earth">
        <Lede>
          In the night sky the <span className="hl">stars</span> are bright points like distant
          suns. By day the <span className="hl-amber">Sun</span> is the brightest; at night the{" "}
          <span className="hl">Moon</span> is the nearest celestial body — these three form the
          basis of the Nepali patro and almanac calculations.
        </Lede>
        <Keys
          items={[
            { h: "Horizon and zenith", p: "Where sky meets ground — the horizon; straight overhead — the zenith. Every celestial object appears on this dome of sky." },
            { h: "Sun: east → west", p: "It's the Earth rotating, not the Sun moving, that makes the Sun appear to rise — a result of rotation, not revolution." },
            { h: "Moon and stars", p: "The Moon reflects the Sun's light (it does not shine on its own); the stars shine by themselves." },
          ]}
        />
      </Section>
      <Section kicker="02" title="Rotation vs revolution" en="Rotation vs revolution">
        <Lede>
          Astronomy has <b>two different motions</b> — confusing them causes a lot of mix-ups.{" "}
          <span className="hl">Rotation</span> = spinning on one's own axis (day–night).{" "}
          <span className="hl-amber">Revolution</span> = orbiting around another body (year, month).
        </Lede>
        <Keys
          items={[
            { h: "Earth's rotation ≈ 24 hours", p: "One solar day — the time for the Sun to return to the same place." },
            { h: "Earth's revolution ≈ 365 days", p: "One orbit around the Sun — this makes the year and seasons." },
            { h: "Moon's revolution ≈ 29.5 days", p: "Around the Earth — tithi and paksha are based on this motion." },
          ]}
        />
        <Note>
          A later article covers these motions in detail with diagrams — but this distinction must
          be clear first.
        </Note>
      </Section>
      <Section kicker="03" title="Why degrees matter" en="Why degrees matter">
        <Lede>
          In the almanac, the positions of the Sun, Moon and other planets are measured in{" "}
          <b>degrees (°)</b>. The full sky is divided into <b>360°</b> to answer “how far ahead of
          the Sun is the Moon” — tithi, nakshatra and yoga are all derived from this angle.
        </Lede>
        <div className={tmFormula}>
          <div className={tmFcard}>
            <div className="big">360<span className="u">°</span></div>
            <div className="lbl">Full circle</div>
            <div className="desc">One complete turn of the sky — all rashis and nakshatras within it.</div>
          </div>
          <div className={tmFcard}>
            <div className="big">12<span className="u">°</span></div>
            <div className="lbl">1 tithi</div>
            <div className="desc">The Moon–Sun angular gap — 360° ÷ 30 tithis.</div>
          </div>
          <div className={tmFcard}>
            <div className="big">~13<span className="u">°20′</span></div>
            <div className="lbl">1 nakshatra</div>
            <div className="desc">360° ÷ 27 nakshatras — the Moon's motion is measured on this scale.</div>
          </div>
        </div>
      </Section>
      <Section kicker="04" title="Our viewpoint" en="Geocentric framing">
        <Lede>
          In reality the Earth orbits the Sun, but to build a calendar we use the viewpoint of{" "}
          <span className="hl">what we see from Earth</span> (<b>geocentric</b>) — “which sign is
          the Sun in today”, “how far the Moon has moved”. It is convenient and has been used for
          thousands of years.
        </Lede>
        <Keys
          items={[
            { h: "The Sun's path (ecliptic)", p: "The Sun, Moon and planets appear in nearly the same band — this is the ecliptic." },
            { h: "The zodiac", p: "This path split into 12 parts — Mesha to Meena; a sankranti = the Sun moving to the next sign." },
            { h: "Heliocentric vs geocentric", p: "The real motion is Sun-centred; the patro calculation is Earth-centred — both correct, different purposes." },
          ]}
        />
      </Section>
      <Section kicker="05" title="12 rashis" en="Zodiac signs">
        <Lede>
          The Sun's path (ecliptic) is divided into <b>12 equal parts</b> — each a{" "}
          <span className="hl-amber">30°</span> rashi. A sankranti = the Sun entering the next
          sign; the BS months are also based on this solar sign.
        </Lede>
        <RashiReferenceTable />
      </Section>
      <Section kicker="06" title="Nine grahas" en="Nine grahas">
        <Lede>
          The almanac and kundali use <b>9 grahas</b> (nava graha) — seven real bodies and two{" "}
          <span className="hl">shadow points</span> (Rahu, Ketu). Every position is measured as an angle.
        </Lede>
        <GrahaReferenceTable />
      </Section>
      <Section kicker="07" title="27 nakshatras & padas" en="Lunar mansions & padas">
        <Lede>
          The Moon's path is divided into <b>27 nakshatras</b> (each <b>13°20′</b>). Each nakshatra
          is further split into <b>4 padas</b> (3°20′ per pada) — this pada is used for the birth
          name-syllable and the chart.
        </Lede>
        <NakshatraReferenceTable />
      </Section>
      <Section kicker="08" title="30 tithis" en="Lunar days">
        <Lede>
          Each time the Moon–Sun angle increases by <b>12°</b> a new tithi begins — Shukla Paksha
          1–15 (to the full moon), Krishna Paksha 1–15 (to the new moon).
        </Lede>
        <TithiReferenceTable />
      </Section>
      <Section kicker="09" title="27 yogas" en="Yogas">
        <Lede>
          As the <b>sum of the Sun's and Moon's longitudes</b> increases, the 27 yogas form in turn
          — from Vishkambha to Vaidhriti. Yoga is also checked for auspicious/inauspicious muhurtas.
        </Lede>
        <YogaReferenceTable />
      </Section>
      <Section kicker="10" title="11 karanas" en="Karanas">
        <Lede>
          <b>Half</b> of each tithi (= 6° of angle) is one karana — 60 karanas per month in all.
          Only 11 names: 7 movable (recurring) and 4 fixed (once a month).
        </Lede>
        <KaranaReferenceTable />
      </Section>
      <Section kicker="11" title="What comes next" en="What comes next">
        <Lede>
          Now the core ideas are clear — <b>what we're looking at</b>, <b>how it's moving</b>, and{" "}
          <b>why angles are counted</b>. In the next article, see the solar system, Earth's tilt,
          the Moon's phases and the real orbits with diagrams.
        </Lede>
        <Keys
          items={[
            { h: "Solar system & lunar motion", p: "Earth's elliptical orbit, 23.5° tilt, the Moon's phases." },
            { h: "Solar vs lunar calendar", p: "Why Vikram Samvat runs by aligning two clocks." },
            { h: "The five limbs of the almanac", p: "Tithi, vaara, nakshatra, yoga, karana — how they arise from angles." },
          ]}
        />
      </Section>
      <Note>
        Once these basics are understood, the rest of the articles will feel easy — each uses the
        same language above (angle, revolution, Earth-centred view).
      </Note>
    </>,
  );
}

export function SolarSystem() {
      const { lang } = useLocale();
  return bilingualNode(lang, <>
      <Section kicker="०१" title="सूर्य केन्द्र, पृथ्वी परिक्रमा" en="Heliocentric view">
        <Lede>
          हाम्रो सौर्यमण्डलमा पृथ्वी सूर्यको वरिपरि झन्डै <b>३६५.२५ दिन</b> मा एक फेरो लगाउँछ —
          यही परिक्रमाले <span className="hl">वर्ष</span> बन्छ। पृथ्वी आफैँ पनि २३.५° ढल्केर
          घुम्ने हुनाले ऋतु फेरिन्छन्।
        </Lede>
        <HeliocentricOrbitStudy />
      </Section>
      <Section kicker="०२" title="चन्द्रको गति" en="Lunar motion">
        <Lede>
          चन्द्रमा पृथ्वीको वरिपरि झन्डै <b>{N(27.3)} दिन</b> (नाक्षत्र मास) मा एक फेरो लगाउँछ,
          तर सूर्यसमेत सर्ने हुनाले एक <b>औंसीदेखि अर्को औंसी</b> सम्म ~{N(29.5)} दिन
          लाग्छ (चान्द्र मास)। यिनै दुई गतिको खेलले पञ्चाङ्गका तिथि, नक्षत्र र पक्ष निर्धारण
          गर्छन्।
        </Lede>
        <ElongationStudy />
        <Keys
          items={[
            { h: "नाक्षत्र मास ~२७.३ दिन", p: "चन्द्र आकाशमा एकै तारापुञ्जमा फर्किन लाग्ने समय।" },
            { h: "चान्द्र मास ~२९.५ दिन", p: "एक औंसीदेखि अर्को औंसीसम्म — तिथि गणनाको आधार।" },
            { h: "सौर वर्ष ~३६५.२५ दिन", p: "पृथ्वीको एक पूर्ण परिक्रमा — ऋतु र साल यसैले बन्छ।" },
          ]}
        />
      </Section>
      <Section kicker="०३" title="पृथ्वीको घूर्णन" en="Earth's Rotation">
        <Lede>
          पृथ्वी आफ्नै अक्षमा <b>पश्चिमबाट पूर्वतर्फ</b> घुम्छ। एक पूरा घूर्णन पूरा गर्न करिब{" "}
          <b>{N(24)} घण्टा</b> लाग्छ। यही घूर्णनका कारण दिन र रात हुन्छन्।
        </Lede>
        <div className={tmCardPadLg}>
          <EarthRotationDiagram />
        </div>
        <Keys
          items={[
            { h: `१ घूर्णन ≈ ${N(24)} घण्टा`, p: "सौर दिन — सूर्य फेरि उस्तै स्थानमा देखा पर्ने समय।" },
            {
              h: "सूर्य पूर्वबाट उदाएजस्तो देखिनु",
              p: "पृथ्वीको घूर्णनका कारण हो — सूर्य नभई पृथ्वी नै घुमिरहेको हुन्छ।",
            },
            {
              h: "सूर्योदय र सूर्यास्तको समय",
              p: "स्थानअनुसार फरक हुन्छ — देशान्तर र समय क्षेत्रले निर्धारण गर्छ।",
            },
          ]}
        />
      </Section>
      <Section kicker="०४" title="पृथ्वीको अक्षीय झुकाव" en="Axial Tilt">
        <Lede>
          पृथ्वीको अक्ष लगभग <b>{N(23.5)}°</b> झुकेको छ। यही झुकावका कारण विभिन्न ऋतुहरू
          उत्पन्न हुन्छन् — नेपालमा छ ऋतु:
        </Lede>
        <Keys
          items={[
            { h: "वसन्त", p: "तापमान बढ्दै, दिन लामो हुँदै।" },
            { h: "ग्रीष्म", p: "सबैभन्दा लामो दिन, उच्च ताप।" },
            { h: "वर्षा", p: "मनसुन — नेपालमा प्रमुख वर्षाकाल।" },
            { h: "शरद", p: "ताप घट्दै, शुष्क र सफा आकाश।" },
            { h: "हेमन्त", p: "जाडो सुरु, रात लामो हुँदै।" },
            { h: "शिशिर", p: "सबैभन्दा चिसो, छोटो दिन।" },
          ]}
        />
        <Note>
          यदि पृथ्वीको अक्ष नझुकेको भए ऋतुहरूको परिवर्तन धेरै कम हुने थियो।
        </Note>
      </Section>
      <Section kicker="०५" title="चन्द्रका कला" en="Phases of the Moon">
        <Lede>
          चन्द्रमा आफैं प्रकाश दिने वस्तु होइन। <span className="hl">सूर्यको प्रकाश</span>{" "}
          परावर्तित गरेर चम्किन्छ। <b>औंसी</b> मा चन्द्र देखिँदैन; <b>पूर्णिमा</b> मा
          पूरै चम्किन्छ — यिनै कलाहरूले पक्ष र तिथिको अनुभव गराउँछन्।
        </Lede>
        <div className={tmCardPadLg}>
          <p className={ssPhasesHeading}>मुख्य चरणहरू</p>
          <MoonPhasesStrip />
        </div>
      </Section>
      <Note>
        खगोलीय गतिको यही नियमितताले नै नेपाली पात्रोदेखि पञ्चाङ्गसम्मका सबै गणनाको जग बसाल्छ।
      </Note>
    </>,
    <>
      <Section kicker="01" title="Sun at the centre, Earth orbiting" en="Heliocentric view">
        <Lede>
          In our solar system the Earth completes one orbit around the Sun in about{" "}
          <b>365.25 days</b> — this revolution makes the <span className="hl">year</span>. Because
          the Earth also spins tilted at 23.5°, the seasons change.
        </Lede>
        <HeliocentricOrbitStudy />
      </Section>
      <Section kicker="02" title="Lunar motion" en="Lunar motion">
        <Lede>
          The Moon completes one orbit of the Earth in about <b>27.3 days</b> (sidereal month), but
          because the Sun also moves, one <b>new moon to the next</b> takes ~29.5 days (synodic
          month). The interplay of these two motions determines the almanac's tithi, nakshatra
          and paksha.
        </Lede>
        <ElongationStudy />
        <Keys
          items={[
            { h: "Sidereal month ~27.3 days", p: "The time for the Moon to return to the same star-cluster in the sky." },
            { h: "Synodic month ~29.5 days", p: "From one new moon to the next — the basis of tithi calculation." },
            { h: "Solar year ~365.25 days", p: "One full orbit of the Earth — seasons and the year come from this." },
          ]}
        />
      </Section>
      <Section kicker="03" title="Earth's rotation" en="Earth's Rotation">
        <Lede>
          The Earth spins on its axis <b>from west to east</b>. One full rotation takes about{" "}
          <b>24 hours</b>. This rotation causes day and night.
        </Lede>
        <div className={tmCardPadLg}>
          <EarthRotationDiagram />
        </div>
        <Keys
          items={[
            { h: "1 rotation ≈ 24 hours", p: "A solar day — the time for the Sun to reappear in the same place." },
            { h: "The Sun appears to rise in the east", p: "This is due to Earth's rotation — it is the Earth turning, not the Sun." },
            { h: "Sunrise and sunset times", p: "Vary by location — determined by longitude and time zone." },
          ]}
        />
      </Section>
      <Section kicker="04" title="Earth's axial tilt" en="Axial Tilt">
        <Lede>
          The Earth's axis is tilted about <b>23.5°</b>. This tilt produces the different seasons —
          Nepal has six ṛtu:
        </Lede>
        <Keys
          items={[
            { h: "Vasanta (Spring)", p: "Warming up, days lengthening." },
            { h: "Grishma (Summer)", p: "Longest day, high heat." },
            { h: "Varsha (Monsoon)", p: "The monsoon — Nepal's main rainy season." },
            { h: "Sharad (Autumn)", p: "Cooling, dry and clear skies." },
            { h: "Hemanta (Pre-winter)", p: "Cold begins, nights lengthening." },
            { h: "Shishira (Winter)", p: "Coldest, shortest days." },
          ]}
        />
        <Note>
          If the Earth's axis were not tilted, the change of seasons would be far smaller.
        </Note>
      </Section>
      <Section kicker="05" title="Phases of the Moon" en="Phases of the Moon">
        <Lede>
          The Moon does not give off its own light. It shines by reflecting{" "}
          <span className="hl">the Sun's light</span>. At the <b>new moon</b> the Moon is not seen;
          at the <b>full moon</b> it shines fully — these phases give us the sense of paksha and
          tithi.
        </Lede>
        <div className={tmCardPadLg}>
          <p className={ssPhasesHeading}>Main phases</p>
          <MoonPhasesStrip />
        </div>
      </Section>
      <Note>
        This very regularity of celestial motion is the foundation of every calculation from the
        Nepali patro to the almanac.
      </Note>
    </>,
  );
}

export function CalendarDifferences() {
      const { lang } = useLocale();
  return bilingualNode(lang, <>
      <Section kicker="०१" title="तीन पात्रो, तीन आधार" en="Three systems">
        <Lede>
          <b>ग्रेगोरियन (ई.सं.)</b> शुद्ध सौर पात्रो हो — महिनाको दिन निश्चित।{" "}
          <b>नेपाली (बि.सं.)</b> चान्द्र–सौर हो — महिना सूर्यको राशिले तय हुन्छ।{" "}
          <b>वैदिक</b> मा दुई धारा छन्: नागरिक शक सम्वत् (सौर) र पञ्चाङ्ग आधारित विक्रम/शालिवाहन
          (चान्द्र–सौर)।
        </Lede>
      </Section>
      <Section kicker="०२" title="मुख्य भिन्नता" en="Key differences">
        <Keys
          items={[
            { h: "वर्ष गणना", p: "बि.सं. ≈ ई.सं. + ५६/५७; शक सम्वत् ≈ ई.सं. − ७८।" },
            { h: "वर्षारम्भ", p: "ग्रेगोरियन: जनवरी १; बि.सं.: बैशाख (मेष सङ्क्रान्ति); वैदिक चान्द्र: चैत्र शुक्ल प्रतिपदा।" },
            { h: "महिनाको दिन", p: "ग्रेगोरियन: २८–३१ निश्चित; बि.सं.: २९–३२ सूर्य–गति अनुसार।" },
            { h: "अधिक मास", p: "ग्रेगोरियनमा छैन; बि.सं./वैदिक चान्द्र–सौरमा ~३ वर्षमा थपिन्छ।" },
          ]}
        />
      </Section>
      <Note>
        यही कारण मितिको रूपान्तरण साधारण जोडघटाउले मिल्दैन — पञ्चाङ्ग गणना नै सही उत्तर हो।
      </Note>
    </>,
    <>
      <Section kicker="01" title="Three calendars, three bases" en="Three systems">
        <Lede>
          The <b>Gregorian (AD)</b> is a purely solar calendar — fixed days per month. The{" "}
          <b>Nepali (BS)</b> is luni-solar — the month is set by the Sun's sign. The <b>Vedic</b>{" "}
          tradition has two streams: the civil Shaka Samvat (solar) and the almanac-based
          Vikram/Shalivahana (luni-solar).
        </Lede>
      </Section>
      <Section kicker="02" title="Key differences" en="Key differences">
        <Keys
          items={[
            { h: "Year count", p: "BS ≈ AD + 56/57; Shaka Samvat ≈ AD − 78." },
            { h: "Year start", p: "Gregorian: Jan 1; BS: Baisakh (Mesha Sankranti); Vedic lunar: Chaitra Shukla Pratipada." },
            { h: "Days per month", p: "Gregorian: fixed 28–31; BS: 29–32 by the Sun's motion." },
            { h: "Adhik Maas", p: "None in the Gregorian; added ~every 3 years in BS/Vedic luni-solar." },
          ]}
        />
      </Section>
      <Note>
        This is why date conversion cannot be done by simple addition/subtraction — almanac
        calculation is the correct answer.
      </Note>
    </>,
  );
}

export function WhatIsPanchang() {
      const { lang } = useLocale();
  return bilingualNode(lang, <>
      <Section kicker="०१" title="पञ्चाङ्ग = पाँच अङ्ग" en="The five limbs">
        <Lede>
          “पञ्चाङ्ग” शब्द <b>पञ्च (पाँच) + अङ्ग</b> बाट बनेको हो। हरेक दिनको खगोलीय अवस्था
          वर्णन गर्न पाँच तत्त्व प्रयोग हुन्छन् — यिनै पाँचले शुभ–अशुभ मुहूर्त, पर्व र दैनिक
          गणना निर्धारण गर्छन्।
        </Lede>
        <Keys
          items={[
            { h: "१. तिथि", p: "चन्द्र–सूर्यको १२° कोणीय दूरीले बन्ने चान्द्र दिन।" },
            { h: "२. वार", p: "हप्ताको सात दिन — सूर्य, सोम, मङ्गल…।" },
            { h: "३. नक्षत्र", p: "चन्द्र रहेको २७ तारापुञ्जमध्ये एक।" },
            { h: "४. योग", p: "सूर्य र चन्द्रको देशान्तर जोडबाट बन्ने २७ योग।" },
            { h: "५. करण", p: "तिथिको आधा भाग — एक तिथिमा दुई करण।" },
          ]}
        />
      </Section>
      <Note>
        यस ज्ञानकेन्द्रका छुट्टाछुट्टै लेखमा यी पाँचै अङ्ग कसरी गणना हुन्छन् भनेर विस्तारमा
        बुझाइएको छ।
      </Note>
    </>,
    <>
      <Section kicker="01" title="Panchanga = five limbs" en="The five limbs">
        <Lede>
          The word “panchanga” comes from <b>pancha (five) + anga (limb)</b>. Five elements
          describe each day's celestial state — together they determine auspicious/inauspicious
          muhurtas, festivals and the daily calculation.
        </Lede>
        <Keys
          items={[
            { h: "1. Tithi", p: "The lunar day formed by the 12° angular gap between Moon and Sun." },
            { h: "2. Vaara", p: "The seven weekdays — Sunday, Monday, Tuesday…" },
            { h: "3. Nakshatra", p: "One of the 27 star-clusters the Moon occupies." },
            { h: "4. Yoga", p: "The 27 yogas formed from the sum of the Sun's and Moon's longitudes." },
            { h: "5. Karana", p: "Half of a tithi — two karanas per tithi." },
          ]}
        />
      </Section>
      <Note>
        Separate articles in this knowledge center explain in detail how each of these five limbs
        is calculated.
      </Note>
    </>,
  );
}

export function TithiArticle() {
      const { lang } = useLocale();
  return bilingualNode(lang, <>
      <Section kicker="०१" title="तिथि = १२° कोणीय दूरी" en="12° of elongation">
        <Lede>
          पृथ्वीबाट हेर्दा चन्द्रमा सूर्यभन्दा जति <span className="hl">कोणले अगाडि</span> पुग्छ,
          त्यही कोणले तिथि निर्धारण गर्छ। <b>०°</b> मा औंसी, <b>१८०°</b> मा पूर्णिमा।
          यो चित्रमा पृथ्वी पनि सूर्यको वरिपरि <span className="hl-amber">~{N(29)}°</span> सर्छ
          (एक चान्द्र मास) — त्यसैले चन्द्रले नक्षत्रमा फर्कन ~{N(27)} दिन, अर्को औंसीसम्म
          ~{N(29.5)} दिन। तल तानेर वा चलाउनुहोस्।
        </Lede>
        <ElongationStudy />
        <div className={tmFormula}>
          <div className={tmFcard}>
            <div className="big">
              {N(12)}
              <span className="u">°</span>
            </div>
            <div className="lbl">= १ तिथि</div>
            <div className="desc">३६०° ÷ ३० तिथि। हरेक १२° कोण पार गर्दा नयाँ तिथि सुरु हुन्छ।</div>
          </div>
          <div className={tmFcard}>
            <div className="big">
              ~{N(12)}
              <span className="u">°/दिन</span>
            </div>
            <div className="lbl">चन्द्रको औसत गति</div>
            <div className="desc">वास्तवमा १०.७°–१४.३° सम्म घटबढ हुन्छ — चन्द्र कक्षको आकारका कारण।</div>
          </div>
          <div className={tmFcard}>
            <div className="big">सूर्योदय</div>
            <div className="lbl">तिथि कहिले गनिन्छ?</div>
            <div className="desc">
              जुन तिथि सूर्योदयमा चलिरहेको हुन्छ, त्यही दिनको तिथि मानिन्छ — यही नियमले वृद्धि
              र क्षय जन्माउँछ।
            </div>
          </div>
        </div>
      </Section>
      <Note>
        चन्द्रको गति स्थिर नभएकाले तिथिको लम्बाइ पनि स्थिर हुँदैन — कहिले एउटै तिथि दुई दिन
        (वृद्धि), कहिले बीचमै हराउँछ (क्षय)। ती छुट्टै लेखमा हेर्नुहोस्।
      </Note>
    </>,
    <>
      <Section kicker="01" title="Tithi = 12° of elongation" en="12° of elongation">
        <Lede>
          Seen from Earth, the angle by which the Moon runs <span className="hl">ahead of the Sun</span>{" "}
          determines the tithi. <b>0°</b> is the new moon (Aaushi), <b>180°</b> the full moon
          (Purnima). In this diagram the Earth also moves <span className="hl-amber">~29°</span>{" "}
          around the Sun (one lunar month) — so the Moon takes ~27 days to return to a nakshatra,
          and ~29.5 days to the next new moon. Drag or press play below.
        </Lede>
        <ElongationStudy />
        <div className={tmFormula}>
          <div className={tmFcard}>
            <div className="big">
              12
              <span className="u">°</span>
            </div>
            <div className="lbl">= 1 tithi</div>
            <div className="desc">360° ÷ 30 tithis. Each 12° of angle crossed starts a new tithi.</div>
          </div>
          <div className={tmFcard}>
            <div className="big">
              ~12
              <span className="u">°/day</span>
            </div>
            <div className="lbl">Moon's average speed</div>
            <div className="desc">Actually varies 10.7°–14.3° — due to the shape of the Moon's orbit.</div>
          </div>
          <div className={tmFcard}>
            <div className="big">Sunrise</div>
            <div className="lbl">When is the tithi counted?</div>
            <div className="desc">
              Whichever tithi is running at sunrise is taken as that day's tithi — this rule is
              what creates vriddhi and kshaya.
            </div>
          </div>
        </div>
      </Section>
      <Note>
        Because the Moon's speed is not constant, the length of a tithi is not constant either —
        sometimes one tithi spans two days (vriddhi), sometimes it is skipped entirely (kshaya).
        See those in separate articles.
      </Note>
    </>,
  );
}

export function TithiVriddhiKshaya() {
      const { lang } = useLocale();
  return bilingualNode(lang, <>
      <Section kicker="०१" title="एउटै तिथि दुई दिन — वृद्धि" en="Repeated tithi">
        <Lede>
          जब चन्द्र <span className="hl">मन्द गतिमा</span> (~१०.७°/दिन) हिँड्छ, एउटै १२° को
          तिथि–खण्डले <b>लगातार दुई सूर्योदय</b> समेट्छ। दुवै बिहान त्यही तिथि चलिरहेकाले
          पात्रोमा त्यो तिथि <span className="hl-amber">दुई दिन</span> देखिन्छ।
        </Lede>
        <div className={tmCardPadLg}>
          <SunriseTimeline mode="vriddhi" />
          <div className={tmCardCap}>
            तृतीया खण्ड यति फराकिलो छ कि १० र ११ गते — दुवै सूर्योदय यसैभित्र परे। त्यसैले
            तृतीया दोहोरियो।
          </div>
        </div>
      </Section>
      <Section kicker="०२" title="हराएको तिथि — क्षय" en="Skipped tithi">
        <Lede>
          उल्टो, जब चन्द्र <span className="hl">द्रुत गतिमा</span> (~१४.३°/दिन) हिँड्छ, कुनै १२°
          को तिथि–खण्ड <b>दुई सूर्योदयको बीचमै</b> पूरै सकिन्छ। कुनै पनि सूर्योदयमा त्यो तिथि
          नभेटिएकाले त्यो <span className="hl-amber">क्षय</span> भई पात्रोबाट हराउँछ।
        </Lede>
        <div className={tmCardPadLg}>
          <SunriseTimeline mode="kshaya" />
          <div className={tmCardCap}>
            अष्टमी खण्ड साँघुरो भएर एक सूर्योदयदेखि अर्कोको बीचमै सकियो — कुनै बिहान अष्टमी परेन,
            त्यसैले त्यो क्षय भयो।
          </div>
        </div>
      </Section>
      <Section kicker="०३" title="एउटै नियमका दुई पक्ष" en="Two sides of one rule">
        <Lede>
          दुवै अवस्था एउटै नियमबाट आउँछन् — <b>सूर्योदयमा जुन तिथि चलिरहेको छ, त्यही दिनको तिथि</b>।
          तिथि–खण्ड सूर्योदयको अन्तरभन्दा <span className="hl">फराकिलो</span> भए वृद्धि,{" "}
          <span className="hl">साँघुरो</span> भए क्षय। चन्द्रको गति स्थिर नभएकाले दुवै अनिवार्य छन्।
        </Lede>
      </Section>
    </>,
    <>
      <Section kicker="01" title="One tithi, two days — vriddhi" en="Repeated tithi">
        <Lede>
          When the Moon moves <span className="hl">slowly</span> (~10.7°/day), a single 12°
          tithi-segment spans <b>two consecutive sunrises</b>. Since the same tithi is running on
          both mornings, the calendar shows that tithi on <span className="hl-amber">two days</span>.
        </Lede>
        <div className={tmCardPadLg}>
          <SunriseTimeline mode="vriddhi" />
          <div className={tmCardCap}>
            The Tritiya segment is so wide that both the 10th and 11th sunrises fall within it — so
            Tritiya repeats.
          </div>
        </div>
      </Section>
      <Section kicker="02" title="A skipped tithi — kshaya" en="Skipped tithi">
        <Lede>
          Conversely, when the Moon moves <span className="hl">fast</span> (~14.3°/day), a 12°
          tithi-segment finishes entirely <b>between two sunrises</b>. Since that tithi is present
          at no sunrise, it is <span className="hl-amber">skipped (kshaya)</span> and disappears
          from the calendar.
        </Lede>
        <div className={tmCardPadLg}>
          <SunriseTimeline mode="kshaya" />
          <div className={tmCardCap}>
            The Ashtami segment is so narrow it ended between one sunrise and the next — no morning
            landed on Ashtami, so it was skipped.
          </div>
        </div>
      </Section>
      <Section kicker="03" title="Two sides of one rule" en="Two sides of one rule">
        <Lede>
          Both cases fall out of the same rule — <b>the tithi running at sunrise is the tithi of
          that day</b>. If a tithi-segment is <span className="hl">wider</span> than the gap
          between sunrises you get a vriddhi; <span className="hl">narrower</span>, a kshaya.
          Since the Moon's speed is not constant, both are inevitable.
        </Lede>
      </Section>
    </>,
  );
}

export function Nakshatra() {
      const { lang } = useLocale();
  return bilingualNode(lang, <>
      <Section kicker="०१" title="२७ तारापुञ्ज" en="27 lunar mansions">
        <Lede>
          आकाशको चान्द्र–मार्गलाई <b>{N(27)} बराबर भाग</b> मा बाँडिएको छ, प्रत्येक{" "}
          <b>{N(360 / 27)}° ≈ १३°२०′</b> को। चन्द्रमा जुन भागमा हुन्छ, त्यही{" "}
          <span className="hl-amber">नक्षत्र</span> कहलिन्छ — अश्विनीदेखि रेवतीसम्म।
        </Lede>
      </Section>
      <Section kicker="०२" title="पद र गणना" en="Padas">
        <Lede>
          हरेक नक्षत्र फेरि <b>चार पद</b> मा बाँडिन्छ (३°२०′ प्रत्येक)। जन्म नक्षत्र र पदले
          कुण्डलीमा राशि र नामाक्षर तय गर्छ। नक्षत्र <span className="hl">अयनांश</span> मा भर
          पर्ने हुनाले सायन र निरयन गणनामा फरक आउँछ।
        </Lede>
        <Keys
          items={[
            { h: "१३°२०′ प्रति नक्षत्र", p: "३६०° ÷ २७ — चन्द्र दिनमा ~१ नक्षत्र पार गर्छ।" },
            { h: "४ पद", p: "प्रत्येक नक्षत्रको चौथाइ — नवांश र नामाक्षरको आधार।" },
            { h: "अधिपति ग्रह", p: "हरेक नक्षत्रको एक स्वामी ग्रह — विंशोत्तरी दशाको जग।" },
          ]}
        />
      </Section>
    </>,
    <>
      <Section kicker="01" title="27 star-clusters" en="27 lunar mansions">
        <Lede>
          The Moon's path across the sky is divided into <b>27 equal parts</b>, each{" "}
          <b>13°20′</b>. Whichever part the Moon is in is the <span className="hl-amber">nakshatra</span>{" "}
          — from Ashwini to Revati.
        </Lede>
      </Section>
      <Section kicker="02" title="Padas and calculation" en="Padas">
        <Lede>
          Each nakshatra is further divided into <b>four padas</b> (3°20′ each). The birth nakshatra
          and pada set the rashi and name-syllable in the chart. Because nakshatra depends on{" "}
          <span className="hl">ayanamsha</span>, tropical and sidereal calculations differ.
        </Lede>
        <Keys
          items={[
            { h: "13°20′ per nakshatra", p: "360° ÷ 27 — the Moon crosses ~1 nakshatra per lunar day." },
            { h: "4 padas", p: "A quarter of each nakshatra — the basis of navamsha and name-syllable." },
            { h: "Ruling planet", p: "Each nakshatra has one lord planet — the foundation of Vimshottari dasha." },
          ]}
        />
      </Section>
    </>,
  );
}

export function Yoga() {
      const { lang } = useLocale();
  return bilingualNode(lang, <>
      <Section kicker="०१" title="सूर्य + चन्द्रको जोड" en="Sun + Moon longitude">
        <Lede>
          योग पञ्चाङ्गको चौथो अङ्ग हो। यो सूर्य र चन्द्रको <b>देशान्तर जोडेर</b> निकालिन्छ —
          जोड हरेक <b>{N(360 / 27)}°</b> बढ्दा नयाँ योग सुरु हुन्छ। जम्मा{" "}
          <span className="hl-amber">{N(27)} योग</span> छन् — विष्कम्भदेखि वैधृतिसम्म।
        </Lede>
      </Section>
      <Section kicker="०२" title="किन महत्त्व" en="Why it matters">
        <Lede>
          केही योग शुभ मानिन्छन् भने केही (जस्तै व्यतीपात, वैधृति) त्याज्य। मुहूर्त निकाल्दा
          तिथि–वार–नक्षत्रसँगै योग पनि हेरिन्छ।
        </Lede>
      </Section>
    </>,
    <>
      <Section kicker="01" title="Sum of Sun + Moon" en="Sun + Moon longitude">
        <Lede>
          Yoga is the fourth limb of the almanac. It is found by <b>adding the longitudes</b> of
          the Sun and Moon — each time the sum increases by <b>13°20′</b> a new yoga begins. There
          are <span className="hl-amber">27 yogas</span> in all — from Vishkambha to Vaidhriti.
        </Lede>
      </Section>
      <Section kicker="02" title="Why it matters" en="Why it matters">
        <Lede>
          Some yogas are considered auspicious while others (such as Vyatipata, Vaidhriti) are
          avoided. When choosing a muhurta, yoga is checked alongside tithi, vaara and nakshatra.
        </Lede>
      </Section>
    </>,
  );
}

export function Karana() {
      const { lang } = useLocale();
  return bilingualNode(lang, <>
      <Section kicker="०१" title="तिथिको आधा भाग" en="Half a tithi">
        <Lede>
          करण भनेको <b>आधा तिथि</b> हो — चन्द्र–सूर्यको <b>६° कोणीय दूरी</b>। एक तिथिमा दुई
          करण पर्ने हुनाले महिनाभरि <span className="hl-amber">{N(60)} करण</span> हुन्छन्, तर
          नाम जम्मा <b>{N(11)}</b> — सात चर (बारम्बार दोहोरिने) र चार स्थिर।
        </Lede>
        <Keys
          items={[
            { h: "७ चर करण", p: "बव, बालव, कौलव… महिनाभरि घुमिफिरी आउँछन्।" },
            { h: "४ स्थिर करण", p: "शकुनि, चतुष्पद, नाग, किंस्तुघ्न — महिनामा एक–एक पटक मात्र।" },
            { h: "मुहूर्तमा प्रयोग", p: "विष्टि (भद्रा) करण अशुभ मानिन्छ — शुभ कार्य टारिन्छ।" },
          ]}
        />
      </Section>
    </>,
    <>
      <Section kicker="01" title="Half a tithi" en="Half a tithi">
        <Lede>
          A karana is <b>half a tithi</b> — a <b>6° angular gap</b> between Moon and Sun. Since each
          tithi contains two karanas, there are <span className="hl-amber">60 karanas</span> across
          a month, but only <b>11</b> names — seven movable (repeating) and four fixed.
        </Lede>
        <Keys
          items={[
            { h: "7 movable karanas", p: "Bava, Balava, Kaulava… recur throughout the month." },
            { h: "4 fixed karanas", p: "Shakuni, Chatushpada, Naga, Kimstughna — once each per month." },
            { h: "Use in muhurta", p: "The Vishti (Bhadra) karana is inauspicious — auspicious work is avoided." },
          ]}
        />
      </Section>
    </>,
  );
}

export function Sankranti() {
      const { lang } = useLocale();
  return bilingualNode(lang, <>
      <Section kicker="०१" title="राशि परिवर्तनको क्षण" en="Sun enters a sign">
        <Lede>
          सूर्य एक राशिबाट अर्को राशिमा प्रवेश गर्ने ठ्याक्क क्षणलाई{" "}
          <span className="hl-amber">सङ्क्रान्ति</span> भनिन्छ। वर्षमा{" "}
          <b>{N(12)} सङ्क्रान्ति</b> हुन्छन्, र प्रत्येकले बि.सं. को नयाँ{" "}
          <span className="hl">महिनाको पहिलो गते</span> चिन्ह लगाउँछ।
        </Lede>
      </Section>
      <Section kicker="०२" title="प्रमुख सङ्क्रान्ति" en="Notable ones">
        <Keys
          items={[
            { h: "मेष सङ्क्रान्ति", p: "बैशाख १ — नेपाली नयाँ वर्ष।" },
            { h: "मकर सङ्क्रान्ति", p: "माघे सङ्क्रान्ति — सूर्य उत्तरायण हुने पर्व।" },
            { h: "महिनाको आधार", p: "हरेक सङ्क्रान्ति = नयाँ सौर महिनाको सुरुवात।" },
          ]}
        />
      </Section>
      <Note>
        अधिक मास पनि सङ्क्रान्तिमै निर्भर छ — जुन चान्द्र मासमा सङ्क्रान्ति पर्दैन, त्यो अधिक
        हुन्छ।
      </Note>
    </>,
    <>
      <Section kicker="01" title="The moment the sign changes" en="Sun enters a sign">
        <Lede>
          The exact moment the Sun enters a new sign from the previous one is called{" "}
          <span className="hl-amber">Sankranti</span>. There are <b>12 sankrantis</b> a year, and
          each marks the <span className="hl">first day of a new BS month</span>.
        </Lede>
      </Section>
      <Section kicker="02" title="Notable ones" en="Notable ones">
        <Keys
          items={[
            { h: "Mesha Sankranti", p: "Baisakh 1 — Nepali New Year." },
            { h: "Makar Sankranti", p: "Maghe Sankranti — the festival when the Sun turns north (Uttarayana)." },
            { h: "Basis of months", p: "Every sankranti = the start of a new solar month." },
          ]}
        />
      </Section>
      <Note>
        Adhik Maas also depends on sankranti — the lunar month in which no sankranti falls becomes
        the adhik (extra) month.
      </Note>
    </>,
  );
}

export function Eclipses() {
      const { lang } = useLocale();
  return bilingualNode(lang, <>
      <Section kicker="०१" title="चन्द्रग्रहण — पृथ्वीको छायाँमा चन्द्र" en="Lunar eclipse: Earth's shadow">
        <Lede>
          चन्द्रग्रहण सधैँ <b>पूर्णिमा</b> मा हुन्छ — जब सूर्य, पृथ्वी र चन्द्रमा एकै रेखामा
          आउँछन् र पृथ्वीको <span className="hl">छायाँ</span> चन्द्रमाथि पर्छ। चन्द्र रातो
          देखिन सक्छ (“ब्लड मुन”), किनकि पृथ्वीको वायुमण्डलले रातो प्रकाश मोडेर पठाउँछ।
        </Lede>
      </Section>
      <Section kicker="०२" title="सूर्य–पृथ्वी–चन्द्र र राहु–केतु" en="Shadow geometry & the nodes">
        <Lede>
          सूर्यको उज्यालोले पृथ्वीपछाडि <span className="hl">प्रच्छायाँ</span> र{" "}
          <span className="hl">उपछायाँ</span> को शंकु बनाउँछ। तल{" "}
          <b>▶ चलाउनुहोस्</b> — पृथ्वी क्रान्तिवृत्तमा घुम्छ, चन्द्र छिटो चर्किन्छ;{" "}
          <b>पात-चक्र</b> बटनले मात्र राहु–केतु ढिलो घुमाउँछ। ग्रहण त्यतिबेला मात्र हुन्छ जब
          पूर्णिमा/औंसी <b>पात रेखा</b> नजिक पर्छ — वर्षमा झन्डै दुई पटक मात्र।
        </Lede>
        <EclipseStudy />
      </Section>
      <Section kicker="०३" title="चन्द्र कक्षको ५° झुकाव र ग्रहण रेखा" en="The tilted orbit, the eclipse line & 18.6-year nodal cycle">
        <Lede>
          तलको <b>त्रिआयामिक</b> चित्रमा <span className="hl">क्रान्तिवृत्त तल</span> (सूर्यपथको समतल)
          र त्यसमाथि <span className="hl-amber">~५° झुकेको</span> चन्द्र-कक्ष देखिन्छ। पृथ्वीको बीचबाट
          <span className="hl-amber"> सूर्य–पृथ्वी रेखा</span> गएको छ। <b>▶ चलाउनुहोस्</b> — सूर्यसँगै यो
          रेखा घुम्छ; जब यो <b>राहु वा केतु</b> मा पुग्छ र त्यहीँ चन्द्र (पूर्णिमा/औंसी) पर्छ तब
          मात्र ग्रहण हुन्छ। तल्लो स्लाइडरले पात रेखालाई <b>~१८.६ वर्षे</b> चक्रमा घुमाउँछ।
        </Lede>
        <MoonOrbitTiltStudy />
      </Section>
      <Section kicker="०४" title="चन्द्रग्रहण — प्रकार र सुरक्षा" en="Lunar types & safety">
        <Lede>
          चन्द्रको कक्ष पृथ्वीको कक्षभन्दा <b>~५° ढल्केको</b> छ, त्यसैले धेरैजसो पूर्णिमामा
          चन्द्र छायाँभन्दा माथि वा तल हुन्छ। ग्रहण त्यतिबेला मात्र हुन्छ जब पूर्णिमा{" "}
          <span className="hl-amber">राहु–केतु (पात बिन्दु)</span> नजिक पर्छ।
        </Lede>
        <Keys
          items={[
            { h: "पूर्ण ग्रहण", p: "चन्द्र पूरै पृथ्वीको गाढा छायाँ (umbra) भित्र।" },
            { h: "खण्डग्रास", p: "चन्द्रको केही भाग मात्र छायाँमा।" },
            { h: "उपछायाँ ग्रहण", p: "चन्द्र penumbra मा मात्र — हल्का मलिन देखिन्छ।" },
            { h: "खुला आँखाले सुरक्षित", p: "सूर्यग्रहणभन्दा फरक — चन्द्रग्रहण सीधै हेर्न सकिन्छ।" },
          ]}
        />
      </Section>
      <Section kicker="०५" title="सूर्यग्रहण — चन्द्रको छायाँमा पृथ्वी" en="Solar eclipse: Moon's shadow">
        <Lede>
          सूर्यग्रहण सधैँ <b>औंसी</b> मा हुन्छ — जब चन्द्रमा सूर्य र पृथ्वीको ठ्याक्क
          बीचमा आएर सूर्यलाई <span className="hl">ढाक्छ</span>। चन्द्रको छायाँ पृथ्वीको
          सानो भागमा मात्र पर्ने हुनाले ग्रहण सीमित क्षेत्रबाट मात्र देखिन्छ।
        </Lede>
      </Section>
      <Section kicker="०६" title="चन्द्रको छायाँ–शंकु र पृथ्वीमा मार्ग" en="Shadow cones: umbra, antumbra & penumbra">
        <Lede>
          तलको चित्रमा सूर्यको उज्यालोले चन्द्रपछाडि <span className="hl">प्रच्छायाँ (umbra)</span> को
          सानो गाढा शंकु र फराकिलो <span className="hl">उपछायाँ (penumbra)</span> बनाउँछ। <b>▶ चलाउनुहोस्</b>{" "}
          — चन्द्रको छायाँ पृथ्वीमाथि सर्छ, त्यही नै <span className="hl-amber">पूर्णताको मार्ग</span> हो।
          तल्लो स्लाइडरले चन्द्र दूरी (perigee ↔ apogee) बदल्छ — हेर्नुहोस् कसरी प्रच्छायाँ पुग्दा{" "}
          <b>पूर्ण</b> र अपुग हुँदा <b>वलयाकार</b> ग्रहण हुन्छ।
        </Lede>
        <SolarEclipseStudy />
      </Section>
      <Section kicker="०७" title="सूर्यग्रहण — प्रकार र सावधानी" en="Solar types & safety">
        <Keys
          items={[
            { h: "पूर्ण (Total)", p: "चन्द्र नजिक हुँदा प्रच्छायाँले पृथ्वी छुन्छ — सूर्य पूरै ढाकिन्छ, दिनमै अँध्यारो र सूर्यमुकुट (corona) देखिन्छ।" },
            { h: "वलयाकार (Annular)", p: "चन्द्र टाढा हुँदा प्रच्छायाँ अपुग — वलयच्छायाँ (antumbra) पुग्छ र सूर्यको किनारा “आगोको औँठी” झैँ देखिन्छ।" },
            { h: "खण्डग्रास (Partial)", p: "उपछायाँभित्र पर्ने ठूलो क्षेत्रबाट सूर्यको केही भाग मात्र ढाकिएको देखिन्छ।" },
            { h: "⚠ कहिल्यै नाङ्गो आँखाले नहेर्नुहोस्", p: "ग्रहण चश्मा वा प्रोजेक्सन मात्र — आँखा स्थायी बिग्रन सक्छ।" },
          ]}
        />
      </Section>
      <Note>
        राहु–केतु आकाशका भौतिक पिण्ड होइनन् — चन्द्रको कक्ष र सूर्यपथ (क्रान्तिवृत्त) काट्ने
        दुई गणितीय बिन्दु हुन्। यी पात बिस्तारै घुम्छन् (~१८.६ वर्षमा एक फेरो), त्यसैले ग्रहण
        ऋतु पनि सर्दै जान्छ। औंसी/पूर्णिमा पनि राहु–केतु नजिक परेमा मात्र ग्रहण हुन्छ — त्यसैले
        हरेक महिना हुँदैन। सूर्यग्रहणमा चन्द्रको छायाँ सानो हुनाले पृथ्वीको सीमित पट्टीबाट मात्र
        देखिन्छ।
      </Note>
    </>,
    <>
      <Section kicker="01" title="Lunar eclipse — Moon in Earth's shadow" en="Lunar eclipse: Earth's shadow">
        <Lede>
          A lunar eclipse always occurs at the <b>full moon</b> — when the Sun, Earth and Moon line
          up and the Earth's <span className="hl">shadow</span> falls on the Moon. The Moon can look
          red (“blood moon”) because Earth's atmosphere bends red light onto it.
        </Lede>
      </Section>
      <Section kicker="02" title="Sun–Earth–Moon & Rahu–Ketu" en="Shadow geometry & the nodes">
        <Lede>
          The Sun's light casts an <span className="hl">umbra</span> and <span className="hl">penumbra</span>{" "}
          cone behind the Earth. Press <b>▶ play</b> below — the Earth moves on the ecliptic, the
          Moon cycles quickly; the <b>node-cycle</b> button rotates only Rahu–Ketu slowly. An
          eclipse happens only when a full/new moon falls near the <b>node line</b> — roughly twice
          a year.
        </Lede>
        <EclipseStudy />
      </Section>
      <Section kicker="03" title="The 5° tilted orbit, eclipse line & 18.6-year nodal cycle" en="The tilted orbit, the eclipse line & 18.6-year nodal cycle">
        <Lede>
          The <b>3-D</b> diagram below shows the <span className="hl">ecliptic plane</span> (the
          Sun's path) and the Moon's orbit tilted <span className="hl-amber">~5°</span> above it.
          The <span className="hl-amber">Sun–Earth line</span> runs through the centre of the Earth.
          Press <b>▶ play</b> — this line turns with the Sun; an eclipse happens only when it reaches{" "}
          <b>Rahu or Ketu</b> and a moon (full/new) is there. The lower slider rotates the node line
          on its <b>~18.6-year</b> cycle.
        </Lede>
        <MoonOrbitTiltStudy />
      </Section>
      <Section kicker="04" title="Lunar eclipse — types & safety" en="Lunar types & safety">
        <Lede>
          The Moon's orbit is tilted <b>~5°</b> to Earth's, so at most full moons the Moon is above
          or below the shadow. An eclipse happens only when the full moon falls near{" "}
          <span className="hl-amber">Rahu–Ketu (the nodes)</span>.
        </Lede>
        <Keys
          items={[
            { h: "Total eclipse", p: "The Moon fully inside Earth's dark shadow (umbra)." },
            { h: "Partial", p: "Only part of the Moon in the shadow." },
            { h: "Penumbral eclipse", p: "The Moon only in the penumbra — appears slightly dimmed." },
            { h: "Safe to the naked eye", p: "Unlike a solar eclipse — a lunar eclipse can be viewed directly." },
          ]}
        />
      </Section>
      <Section kicker="05" title="Solar eclipse — Earth in the Moon's shadow" en="Solar eclipse: Moon's shadow">
        <Lede>
          A solar eclipse always occurs at the <b>new moon</b> — when the Moon comes exactly between
          the Sun and Earth and <span className="hl">covers</span> the Sun. Because the Moon's
          shadow falls on only a small part of the Earth, the eclipse is seen from a limited region.
        </Lede>
      </Section>
      <Section kicker="06" title="The Moon's shadow cones & the path on Earth" en="Shadow cones: umbra, antumbra & penumbra">
        <Lede>
          In the diagram below, the Sun's light casts a small dark <span className="hl">umbra</span>{" "}
          cone and a wide <span className="hl">penumbra</span> behind the Moon. Press <b>▶ play</b>{" "}
          — the Moon's shadow sweeps across the Earth; that is the{" "}
          <span className="hl-amber">path of totality</span>. The lower slider changes the Moon's
          distance (perigee ↔ apogee) — see how a <b>total</b> eclipse occurs when the umbra reaches
          Earth and an <b>annular</b> one when it falls short.
        </Lede>
        <SolarEclipseStudy />
      </Section>
      <Section kicker="07" title="Solar eclipse — types & safety" en="Solar types & safety">
        <Keys
          items={[
            { h: "Total", p: "When the Moon is near, the umbra touches Earth — the Sun is fully covered, day turns dark and the corona appears." },
            { h: "Annular", p: "When the Moon is far the umbra falls short — the antumbra reaches Earth and the Sun's edge looks like a “ring of fire”." },
            { h: "Partial", p: "From the large penumbra region only part of the Sun appears covered." },
            { h: "⚠ Never look with the naked eye", p: "Use eclipse glasses or projection only — permanent eye damage can result." },
          ]}
        />
      </Section>
      <Note>
        Rahu–Ketu are not physical bodies in the sky — they are two mathematical points where the
        Moon's orbit crosses the Sun's path (ecliptic). These nodes rotate slowly (one loop in
        ~18.6 years), so the eclipse seasons also drift. A new/full moon causes an eclipse only when
        it falls near Rahu–Ketu — which is why it doesn't happen every month. In a solar eclipse the
        Moon's shadow is small, so it is seen only from a limited strip of the Earth.
      </Note>
    </>,
  );
}

export function Ayanamsha() {
      const { lang } = useLocale();
  return bilingualNode(lang, <>
      <Section kicker="०१" title="सायन र निरयन — एउटै आकाश, दुई शून्य" en="Tropical vs sidereal zero">
        <Lede>
          राशिचक्रको <b>शून्य अंश</b> कहाँबाट सुरु गर्ने? दुई जवाफ छन्।{" "}
          <span className="hl-amber">सायन (tropical)</span> ले <b>वसन्त-विषुव</b> — जुन दिन सूर्य
          भूमध्यरेखा काटेर उत्तर लाग्छ — लाई शून्य मान्छ, त्यसैले यो <b>ऋतु</b> मा अडिन्छ।{" "}
          <span className="hl">निरयन (sidereal)</span> ले साँचो <b>तारापुञ्ज</b> (मेष राशिको
          आरम्भ) लाई शून्य मान्छ। यी दुई शून्यबीचको कोणीय फरक नै <b>अयनांश</b> हो।
        </Lede>
      </Section>

      <Section kicker="०२" title="अयनांश चक्र" en="Interactive: the precessing equinox">
        <Lede>
          तलको चक्रमा बाहिरी <b>१२ राशि तारापुञ्जमा अडिएका</b> छन् (निरयन)। <b>▶ चलाउनुहोस्</b> —
          वर्ष अघि बढ्दा पृथ्वीको अक्ष-चलनले <span className="hl-amber">सायन शून्य (विषुव)</span>{" "}
          लाई ताराका सापेक्ष पछाडि सार्छ; बढ्दै जाने <span className="hl-amber">अम्बर खाँडो</span> नै
          अयनांश हो। तल्लो स्लाइडरले एउटै <span className="hl">ग्रह</span> लाई सार्छ — हेर्नुहोस्
          कसरी त्यही आकाश-स्थान निरयन र सायनमा फरक राशिमा पढिन्छ।
        </Lede>
        <AyanamshaWheel />
      </Section>

      <Section kicker="०३" title="किन सर्छ — अयन चलन" en="Precession of the equinoxes">
        <Lede>
          पृथ्वी ठ्याक्क सिधा घुम्दैन — लठ्ठा (lattu) झैँ यसको अक्ष ठूलो वृत्तमा बिस्तारै{" "}
          <span className="hl">डुल्छ</span>। एक फेरो पूरा गर्न झन्डै{" "}
          <b>{N(25800)} वर्ष</b> लाग्छ, अर्थात् विषुव बिन्दु प्रति वर्ष करिब{" "}
          <b>५०.३″</b> (हरेक <b>~{N(72)} वर्ष</b> मा १°) पछाडि सर्छ। त्यसैले अयनांश पनि वर्षेनि
          बढ्छ — आज लाहिरीमा झन्डै <b>{N(24)}°</b>।
        </Lede>
        <PrecessionCone />
      </Section>

      <Section kicker="०४" title="तीन प्रमुख प्रणाली" en="Lahiri · Raman · KP">
        <Lede>
          निरयन शून्य ठ्याक्क कुन ताराबाट गन्ने भन्नेमा मतभेद हुनाले फरक–फरक प्रणाली छन् — मूल फरक
          केही अंश/कलाको मात्र हो, तर ग्रह राशि-सन्धिमा परेमा त्यही सानो फरकले <span className="hl">राशि नै बदल्न</span>{" "}
          सक्छ। चक्रमाथिका बटनले प्रणाली बदलेर फरक हेर्नुहोस्।
        </Lede>
        <Keys
          items={[
            { h: "लाहिरी (Lahiri)", p: "भारत सरकारको आधिकारिक (चित्रा-पक्ष) — धेरैजसो पञ्चाङ्गको पूर्वनिर्धारित; आज ~२४°।" },
            { h: "रमन (Raman)", p: "बी.वी. रमनद्वारा प्रचलित — लाहिरीभन्दा झन्डै १.३° कम।" },
            { h: "कृष्णमूर्ति (KP)", p: "के.एस. कृष्णमूर्ति पद्धति — लाहिरीभन्दा अति थोरै (~६′) कम; सूक्ष्म भविष्यवाणीमा।" },
          ]}
        />
      </Section>

      <Note>
        पश्चिमी ज्योतिष प्रायः <b>सायन</b> चलाउँछ, नेपाली–वैदिक वैदिक ज्योतिष <b>निरयन</b>। यस एपको
        कुण्डली पृष्ठमा तपाईं आफैँ अयनांश प्रणाली रोज्न सक्नुहुन्छ र फरक आफ्नै आँखाले हेर्न सक्नुहुन्छ।
      </Note>
    </>,
    <>
      <Section kicker="01" title="Tropical vs sidereal — one sky, two zeros" en="Tropical vs sidereal zero">
        <Lede>
          Where do you start the <b>zero degree</b> of the zodiac? There are two answers.{" "}
          <span className="hl-amber">Tropical (sayana)</span> takes the <b>vernal equinox</b> — the
          day the Sun crosses the equator heading north — as zero, so it stays anchored to the{" "}
          <b>seasons</b>. <span className="hl">Sidereal (nirayana)</span> takes the actual{" "}
          <b>star-cluster</b> (the start of Mesha) as zero. The angular gap between these two zeros
          is the <b>ayanamsha</b>.
        </Lede>
      </Section>
      <Section kicker="02" title="The ayanamsha wheel" en="Interactive: the precessing equinox">
        <Lede>
          In the wheel below the outer <b>12 signs are fixed to the star-clusters</b> (sidereal).
          Press <b>▶ play</b> — as the years advance, Earth's axial precession drags the{" "}
          <span className="hl-amber">tropical zero (equinox)</span> backward relative to the
          stars; the growing <span className="hl-amber">amber wedge</span> is the ayanamsha. The
          lower slider moves a single <span className="hl">planet</span> — see how the same sky
          position reads as a different sign in sidereal vs tropical.
        </Lede>
        <AyanamshaWheel />
      </Section>
      <Section kicker="03" title="Why it drifts — precession" en="Precession of the equinoxes">
        <Lede>
          The Earth does not spin perfectly upright — like a spinning top its axis slowly{" "}
          <span className="hl">wobbles</span> in a large circle. One full loop takes about{" "}
          <b>25,800 years</b>, i.e. the equinox point moves back about <b>50.3″</b> per year (1°
          every <b>~72 years</b>). So the ayanamsha grows year by year — today about <b>24°</b> in
          Lahiri.
        </Lede>
        <PrecessionCone />
      </Section>
      <Section kicker="04" title="Three main systems" en="Lahiri · Raman · KP">
        <Lede>
          Because there is disagreement over exactly which star to count the sidereal zero from,
          different systems exist — the core difference is only a few degrees/arc-minutes, but if a
          planet sits at a sign boundary that small gap can <span className="hl">change the sign</span>{" "}
          itself. Use the buttons above the wheel to switch systems and see the difference.
        </Lede>
        <Keys
          items={[
            { h: "Lahiri", p: "India's official system (Chitra-paksha) — the default in most almanacs; ~24° today." },
            { h: "Raman", p: "Popularised by B. V. Raman — about 1.3° less than Lahiri." },
            { h: "Krishnamurti (KP)", p: "The K. S. Krishnamurti system — a tiny amount (~6′) less than Lahiri; used in fine prediction." },
          ]}
        />
      </Section>
      <Note>
        Western astrology mostly uses <b>tropical</b>, Nepali–Vedic astrology uses <b>sidereal</b>.
        On this app's kundali page you can pick the ayanamsha system yourself and see the difference
        with your own eyes.
      </Note>
    </>,
  );
}

export function RituDrift() {
      const { lang } = useLocale();
  return bilingualNode(lang, <>
      <Section kicker="०१" title="ऋतु सायन, महिना निरयन" en="Seasons are tropical, months are sidereal">
        <Lede>
          एउटै सूर्यलाई <b>दुई फरक शून्य</b> बाट नापिन्छ। <span className="hl-amber">ऋतु</span> लाई{" "}
          <b>सायन</b> ले नाप्छ — शून्य अंश भनेको <b>वसन्त-विषुव</b> (सूर्य भूमध्यरेखा
          काटेर उत्तर लाग्ने क्षण), त्यसैले ऋतु सधैँ विषुव र अयनान्तमा अडिन्छ। तर बि.सं. का{" "}
          <span className="hl">महिना</span> लाई <b>निरयन</b> ले नाप्छ — शून्य भनेको
          आकाशको साँचो <b>मेष तारापुञ्ज</b>, र महिनाको पहिलो गते भनेको <b>सङ्क्रान्ति</b> (सूर्य
          नयाँ राशिमा पस्ने क्षण) हो। यी दुई शून्यबीचको कोण नै <b>अयनांश</b> — आज ~<b>{N(24)}°</b>।
        </Lede>
        <EquinoxPrecession />
      </Section>

      <Section kicker="०२" title="किन सर्छ — अयन चलन" en="Why it drifts: precession">
        <Lede>
          पृथ्वी लट्टु झैँ अक्षमा बिस्तारै <span className="hl">डुल्छ</span>। एक फेरो पूरा
          हुन ~<b>{N(25800)} वर्ष</b> लाग्छ, अर्थात् विषुव बिन्दु प्रति वर्ष ~<b>५०.३″</b> — हरेक
          ~<b>{N(72)} वर्ष</b> मा ठ्याक्क <b>१°</b> — पछाडि सर्छ। सूर्य दिनमा ~<b>१°</b> हिँड्ने
          हुनाले, यो <b>१° = झन्डै १ दिन</b>। त्यसैले निरयन महिनाको सापेक्ष ऋतु{" "}
          <span className="hl-amber">हरेक ~{N(72)} वर्षमा १ दिन</span> सर्दै जान्छ।
        </Lede>
        <PrecessionCone />
      </Section>

      <Section kicker="०३" title="दुई बाटो — दुवै सँगै सम्भव छैन" en="The trade-off: you cannot fix both">
        <Lede>
          महिना र ऋतु दुवैलाई सधैँभरि एकनासले मिलाइराख्न <b>सकिँदैन</b>, किनकि एउटा ताराको
          सापेक्ष स्थिर छ भने अर्को विषुवको। कुनै एउटा रोज्नैपर्छ — र अर्को बिस्तारै सर्छ।
        </Lede>
        <Keys
          items={[
            {
              h: "महिनालाई राशिमा अडाए (अहिलेको प्रचलन)",
              p: (
                <>
                  वैशाख सधैँ मेष सङ्क्रान्तिमै सुरु हुन्छ — कुण्डली, नक्षत्र र ग्रह-राशि{" "}
                  <b>ताराका सापेक्ष स्थिर</b> रहन्छन्। तर ऋतु निरयनको सापेक्ष ~<b>{N(72)} वर्षमा
                  १ दिन</b> (~{N(2160)} वर्षमा पूरा १ महिना) सर्छ — धेरै शताब्दीपछि वैशाख वसन्त
                  नभई अर्कै ऋतुमा पर्न सक्छ।
                </>
              ),
            },
            {
              h: "महिनालाई ऋतुमा अडाए (सायन सुधार)",
              p: (
                <>
                  वैशाख सधैँ वसन्त-विषुवमै बस्छ — ऋतु <b>कहिल्यै सर्दैन</b>। तर बदलामा हरेक
                  राशिको पछाडिको <b>तारापुञ्ज सर्छ</b> — कुण्डली, ग्रहको राशि, नक्षत्र र जन्म-चार्ट
                  सबै ~१°/{N(72)} वर्षका दरले फरक पर्न थाल्छन्; आज मेषमा देखिने तारा भोलि अर्कै
                  राशिमा पढिन्छ।
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section kicker="०४" title="यस पात्रोले के गर्छ" en="What this patro does">
        <Lede>
          यो पात्रोले <b>दुवै</b> देखाउँछ — महिना/गते <span className="hl">निरयन सङ्क्रान्ति</span>{" "}
          ले (तारा स्थिर), अनि गृहपृष्ठको <span className="hl-amber">ऋतु पट्टी सायन</span>{" "}
          (विषुव–अयनान्त) ले गणना गर्छ, ताकि ऋतु वास्तविक मौसमसँगै रहोस्। त्यसैले बैशाख कहिलेकाहीँ
          वसन्तसँग ठ्याक्क नमिल्न सक्छ — त्यो भुल होइन, अयन चलनको असर हो।
        </Lede>
      </Section>

      <Note>
        पश्चिमी ज्योतिष प्रायः <b>सायन</b> (ऋतु-केन्द्रित) चलाउँछ, नेपाली–वैदिक वैदिक ज्योतिष{" "}
        <b>निरयन</b> (तारा-केन्द्रित)। अयनांशको गहिराइ <Link to="/learn/$slug" params={{ slug: "ayanamsha" }} className="hl">अयनांश</Link> लेखमा छ।
      </Note>
    </>,
    <>
      <Section kicker="01" title="Seasons are tropical, months are sidereal" en="Seasons are tropical, months are sidereal">
        <Lede>
          The same Sun is measured from <b>two different zeros</b>. The{" "}
          <span className="hl-amber">ṛtu (season)</span> is measured by the <b>tropical</b> zodiac
          — zero degree is the <b>vernal equinox</b> (the moment the Sun crosses the equator heading
          north), so the seasons stay anchored to the equinoxes and solstices. But the BS{" "}
          <span className="hl">months</span> are measured by the <b>sidereal</b> zodiac — zero is
          the true <b>Mesha star-cluster</b>, and the first day of a month is the <b>sankranti</b>{" "}
          (the moment the Sun enters a new sign). The angle between these two zeros is the{" "}
          <b>ayanamsha</b> — today ~<b>24°</b>.
        </Lede>
        <EquinoxPrecession />
      </Section>
      <Section kicker="02" title="Why it drifts — precession" en="Why it drifts: precession">
        <Lede>
          The Earth wobbles slowly on its axis like a spinning top. One full loop takes ~<b>25,800
          years</b>, i.e. the equinox point moves back ~<b>50.3″</b> per year — exactly <b>1°</b>{" "}
          every ~<b>72 years</b>. Since the Sun moves ~<b>1°</b> per day, this <b>1° ≈ 1 day</b>. So
          relative to the sidereal months, the season drifts{" "}
          <span className="hl-amber">by 1 day every ~72 years</span>.
        </Lede>
        <PrecessionCone />
      </Section>
      <Section kicker="03" title="The trade-off — you cannot fix both" en="The trade-off: you cannot fix both">
        <Lede>
          The months and the seasons <b>cannot</b> both be kept aligned forever, because one is
          fixed relative to a star and the other relative to the equinox. You must choose one — and
          the other slowly drifts.
        </Lede>
        <Keys
          items={[
            {
              h: "Anchor months to signs (current practice)",
              p: (
                <>
                  Baisakh always starts at Mesha Sankranti — the chart, nakshatra and planet-signs
                  stay <b>fixed relative to the stars</b>. But the season drifts ~<b>1 day every 72
                  years</b> (a full month in ~2,160 years) relative to the sidereal zodiac — after
                  many centuries Baisakh may fall in a different season than spring.
                </>
              ),
            },
            {
              h: "Anchor months to seasons (tropical correction)",
              p: (
                <>
                  Baisakh always stays at the vernal equinox — the season <b>never drifts</b>. But
                  in exchange the <b>star-cluster behind each sign shifts</b> — the chart, planet
                  signs, nakshatra and birth-chart all begin to differ at ~1° / 72 years; a star in
                  Mesha today would be read in a different sign later.
                </>
              ),
            },
          ]}
        />
      </Section>
      <Section kicker="04" title="What this patro does" en="What this patro does">
        <Lede>
          This patro shows <b>both</b> — the month/gate is computed by{" "}
          <span className="hl">sidereal sankranti</span> (stars fixed), while the home-page{" "}
          <span className="hl-amber">ṛtu strip is tropical</span> (equinox–solstice), so the season
          stays with the real weather. That's why Baisakh may not line up exactly with spring —
          that's not a bug, it's the effect of precession.
        </Lede>
      </Section>
      <Note>
        Western astrology mostly uses <b>tropical</b> (season-centred), Nepali–Vedic astrology uses{" "}
        <b>sidereal</b> (star-centred). The depth of ayanamsha is in the{" "}
        <Link to="/learn/$slug" params={{ slug: "ayanamsha" }} className="hl">Ayanamsha</Link> article.
      </Note>
    </>,
  );
}

export function HoraArticle() {
  const { lang } = useLocale();
  const { location } = usePanchangaLocation();
  const todayAd = useMemo(
    () => todayAdStringInTimezone(new Date(), resolveLocationTimezone(location)),
    [location],
  );
  const panchangaQ = useQuery({
    queryKey: panchangaKeys.day(todayAd, "ad", location.params),
    queryFn: () => fetchPanchangaDay(patroDayFetchFromApiDateAd(todayAd, AD_DISPLAY), location.params),
    staleTime: 1000 * 60 * 30,
  });
  const p = panchangaQ.data;
  const timezone = resolveTimeZone(p?.location?.timezone, location.params.timezone);

  return bilingualNode(lang, <>
      <Section kicker="०१" title="दिनका चौबीस होरा" en="Planetary hours">
        <Lede>
          प्रत्येक दिनलाई <b>चौबीस होरा</b> (ग्रहीय घण्टा) मा बाँडिन्छ — सूर्योदयदेखि अर्को
          सूर्योदयसम्म। हरेक होरालाई <span className="hl-amber">सात ग्रह</span> (आदित्य,
          शुक्र, बुध, चन्द्र, शनि, बृहस्पति, मङ्गल) ले पालैपालो शासन गर्छन्। सूर्योदयपछिको{" "}
          <b>पहिलो होरा</b> को स्वामी ग्रहले नै <span className="hl">दिनको नाम</span> दिन्छ।
        </Lede>
        {p ? (
          <div className="mt-5">
            <HoraRing p={p} isToday timezone={timezone} />
          </div>
        ) : (
          <div className={cn(tmCardPadLg, "flex min-h-[200px] items-center justify-center text-sm")}>
            लोड हुँदैछ…
          </div>
        )}
      </Section>

      <Section kicker="०२" title="कसरी पढ्ने" en="How to read it">
        <Keys
          items={[
            { h: "वलय = एक दिन", p: "भित्री वलय आइतबार, बाहिरी शनिबार — सात वलय सात दिन।" },
            { h: "होरा क्रम", p: "हरेक वलयभित्र चौबीस होरा; ग्रह आदित्य → शनि क्रममा घुम्छन्।" },
            { h: "दिनको स्वामी", p: "सूर्योदयको पहिलो होराको ग्रह = त्यो दिनको स्वामी (वार)।" },
            { h: "निरन्तर गणना", p: "आइतबारको अन्तिम होरा सोमबारमा गुड्छ — कहिल्यै रोकिँदैन।" },
          ]}
        />
      </Section>

      <Section kicker="०३" title="किन काम लाग्छ" en="Why it matters">
        <Lede>
          शुभ कार्यको मुहूर्त छान्दा होरा हेरिन्छ — जस्तै यात्रा वा व्यापारका लागि{" "}
          <b>बुध/बृहस्पति</b> होरा, स्थिर कामका लागि <b>शनि</b> होरा अनुकूल मानिन्छ। माथिको
          चक्र अहिलेको होरामा केन्द्रित छ; तल स्लाइडर चलाएर वा प्ले थिचेर हप्ताभरि होरा कसरी
          सर्छ हेर्नुहोस्।
        </Lede>
      </Section>
    </>,
    <>
      <Section kicker="01" title="The day's twenty-four horas" en="Planetary hours">
        <Lede>
          Each day is divided into <b>twenty-four horas</b> (planetary hours) — from sunrise to the
          next sunrise. Each hora is ruled in turn by the <span className="hl-amber">seven
          planets</span> (Sun, Venus, Mercury, Moon, Saturn, Jupiter, Mars). The lord of the{" "}
          <b>first hora</b> after sunrise gives the <span className="hl">day its name</span>.
        </Lede>
        {p ? (
          <div className="mt-5">
            <HoraRing p={p} isToday timezone={timezone} />
          </div>
        ) : (
          <div className={cn(tmCardPadLg, "flex min-h-[200px] items-center justify-center text-sm")}>
            Loading…
          </div>
        )}
      </Section>

      <Section kicker="02" title="How to read it" en="How to read it">
        <Keys
          items={[
            { h: "Ring = one day", p: "The inner ring is Sunday, the outer Saturday — seven rings, seven days." },
            { h: "Hora order", p: "Twenty-four horas within each ring; planets cycle Sun → Saturn." },
            { h: "Lord of the day", p: "The planet of the first hora at sunrise = that day's lord (vaara)." },
            { h: "Unbroken count", p: "Sunday's last hora rolls into Monday — it never stops." },
          ]}
        />
      </Section>

      <Section kicker="03" title="Why it matters" en="Why it matters">
        <Lede>
          A hora is checked when choosing a muhurta for auspicious work — e.g. a{" "}
          <b>Mercury/Jupiter</b> hora for travel or business, a <b>Saturn</b> hora for steady work.
          The wheel above is centred on the current hora; move the slider or press play to see how
          the hora shifts across the week.
        </Lede>
      </Section>
    </>,
  );
}
