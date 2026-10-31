import type { ArticleData } from "../../article-schema";

/*
 * Figures: JD 0 = noon UT, 1 January 4713 BCE (Julian calendar); J2000.0 =
 * JD 2451545.0 = 2000-01-01 12:00 TT; Unix epoch = JD 2440587.5; the first
 * Gregorian day 1582-10-15 = JD 2299160.5 (apps/api/engine/astronomy/
 * jd_calendar.py). TT = TAI + 32.184 s; UTC = TAI − 37 s since 2017, so
 * TT − UTC = 69.184 s; leap seconds keep |UT1 − UTC| < 0.9 s.
 */
export const julianDay: ArticleData = {
  slug: "julian-day",
  seeAlso: ["time-scales", "calc-sunrise", "calc-sankranti"],
  sections: [
    {
      title: { ne: "जुलियन डे — दिनको एउटै लामो गन्ती", en: "The Julian Day — one long count of days" },
      eyebrow: "JD",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "महिना, वर्ष, लीप दिन र पात्रो सुधार — मितिमा यी सबै झन्झट छन्। खगोलशास्त्रले त्यसैले मिति होइन, दिनको एउटै लामो गन्ती प्रयोग गर्छ: *जुलियन डे* (JD)। ईसापूर्व `४७१३` जनवरी १ को मध्याह्न (जुलियन पात्रो) देखि बितेका दिन — दिनको अंश दशमलवमा।",
            en: "Months, years, leap days and calendar reforms — a date carries all of that. So astronomy uses not a date but one long count of days: the *Julian Day* (JD). The days since noon on 1 January `4713` BCE (Julian calendar) — with the part of a day as a decimal.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "2451545.0",
              label: { ne: "J2000.0", en: "J2000.0" },
              desc: { ne: "सन् २००० जनवरी १, मध्याह्न (TT) — आधुनिक तालिकाको सन्दर्भ बिन्दु।", en: "1 January 2000 at noon (TT) — the reference point of modern tables." },
            },
            {
              big: "2440587.5",
              label: { ne: "युनिक्स शून्य", en: "Unix epoch" },
              desc: { ne: "सन् १९७० जनवरी १, मध्यरात (UTC) — कम्प्युटरको घडी यहीँबाट गन्छ।", en: "1 January 1970 at midnight (UTC) — where computer clocks count from." },
            },
            {
              big: "2299160.5",
              label: { ne: "ग्रेगोरियनको पहिलो दिन", en: "First Gregorian day" },
              desc: { ne: "सन् १५८२ अक्टोबर १५ — यसअघिका मिति जुलियन पात्रोमा पढिन्छन्।", en: "15 October 1582 — dates before it are read in the Julian calendar." },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यसको फाइदा सरल छ: दुई JD घटाउँदा सिधै दिनको फरक आउँछ — कुन महिना कति दिनको, कुन वर्ष लीप, वा १५८२ मा कति दिन हराए भन्ने सोच्नै पर्दैन। ईसापूर्वका मिति पनि यही गन्तीमा सहजै आउँछन्, जहाँ सामान्य कम्प्युटर मिति पुग्दैन।",
            en: "The gain is simple: subtract two JDs and you have the number of days between them — no need to ask how long a month is, which year is a leap year, or how many days 1582 lost. Dates before the Common Era fit the same count with ease, where ordinary computer dates cannot reach.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "सावधानी: १५८२ अघिका मितिलाई ग्रेगोरियन मानेर JD निकाल्दा मिति सर्छ — सन् १५८१ मा १० दिन, अझ पहिले झन् बढी। त्यति फरकले चन्द्रमा तिथि नै बदल्ने गरी सर्छ। वेदिक पात्रोले १५८२ अक्टोबर १५ अघि जुलियन र त्यसपछि ग्रेगोरियन मान्छ — ऐतिहासिक प्रचलन जस्तै।",
            en: "A caution: labelling a pre-1582 date as Gregorian before converting it shifts the day — by 10 days in 1581, more the further back you go. That moves the Moon far enough to change the tithi. Vedic Patro reads dates as Julian before 15 October 1582 and Gregorian from it on — the historical convention.",
          },
        },
      ],
    },
    {
      title: { ne: "समय क्षेत्र र स्थानीय समय", en: "Time zones and local time" },
      eyebrow: "Local → UTC",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "JD विश्वव्यापी छ, तर मानिसले घडी स्थानीय समयमा हेर्छ। स्थानीय समय = UTC + त्यस ठाउँको अफसेट। नेपालको अफसेट आज `+०५:४५` छ।",
            en: "The JD is worldwide, but people read clocks in local time. Local time = UTC + that place's offset. Nepal's offset today is `+05:45`.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "अफसेट सधैँ उही रहँदैन — नेपालमै तीन युग छन् (काठमाडौँ माध्य समय, भारतीय मानक समय, नेपाली मानक समय), जसको तालिका [[calc-sankranti|सङ्क्रान्तिको गणना]] मा छ। त्यसैले वेदिक पात्रो नेपालका सबै स्थानलाई `Asia/Kathmandu` क्षेत्रबाट चलाउँछ, जसले कुन मितिमा कुन अफसेट थियो भन्ने आफैँ थाहा पाउँछ। विदेशका स्थानलाई तिनकै क्षेत्र र ग्रीष्मकालीन समयसहित।",
            en: "The offset does not stay fixed — Nepal alone has had three eras (Kathmandu mean time, Indian Standard Time, Nepal Standard Time), tabled in [[calc-sankranti|computing the sankranti]]. So Vedic Patro runs every place in Nepal through the `Asia/Kathmandu` zone, which knows which offset applied on which date. Places abroad use their own zone, summer time included.",
          },
        },
      ],
    },
    {
      title: { ne: "UTC, UT1 र TT — कुन घडी के हो", en: "UTC, UT1 and TT — which clock is which" },
      eyebrow: "Leap seconds",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "माथिको अध्यायले UT (पृथ्वीको घुर्णन) र TT (एकनास परमाणु समय) छुट्यायो। हाम्रो घडीले देखाउने **UTC** यी दुईको बीचको सम्झौता हो।",
            en: "The chapter above separated UT (Earth's rotation) from TT (uniform atomic time). The **UTC** our clocks show is a compromise between the two.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "UT1", en: "UT1" },
              p: { ne: "पृथ्वी वास्तवमा कति घुम्यो — सूर्योदय र लग्न यसैमा निर्भर।", en: "How far Earth has actually turned — what sunrise and the lagna depend on." },
            },
            {
              h: { ne: "UTC", en: "UTC" },
              p: { ne: "परमाणु घडीको सेकेन्ड, तर कहिलेकाहीँ *लिप सेकेन्ड* थपेर UT1 बाट `०.९` सेकेन्डभन्दा टाढा जान नदिइने।", en: "Atomic seconds, but kept within `0.9` seconds of UT1 by an occasional *leap second*." },
            },
            {
              h: { ne: "TT", en: "TT" },
              p: { ne: "लिप सेकेन्डबिनाको एकनास समय — ग्रहपातले यसैमा गणना गर्छ। आज TT UTC भन्दा `६९.१८४` सेकेन्ड अगाडि।", en: "Uniform time with no leap seconds — what an ephemeris computes in. Today TT runs `69.184` seconds ahead of UTC." },
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "छोटोमा: घडी (UTC) र पृथ्वी (UT1) झन्डै सँगै हुन्छन्, ग्रहपात (TT) एक मिनेटभन्दा बढी अगाडि। यो फरक बेवास्ता गर्दा के बिग्रन्छ भन्ने माथि `ΔT` मा छ।",
            en: "In short: the clock (UTC) and the Earth (UT1) stay nearly together, the ephemeris (TT) more than a minute ahead. What goes wrong if you ignore that gap is above, under `ΔT`.",
          },
        },
      ],
    },
    {
      title: { ne: "वेदिक पात्रोमा — इनपुटदेखि JD सम्म", en: "In Vedic Patro — from input to JD" },
      eyebrow: "The chain",
      blocks: [
        {
          kind: "list",
          ordered: true,
          items: [
            { ne: "तपाईंले छान्नुभएको **मिति र स्थान** — अक्षांश, देशान्तर, उचाइ र समय क्षेत्र।", en: "The **date and place** you choose — latitude, longitude, altitude and time zone." },
            { ne: "त्यस मितिको **स्थानीय मध्यरात**, ठाउँको समय क्षेत्रबाट UTC मा।", en: "That date's **local midnight**, turned into UTC through the place's time zone." },
            { ne: "UTC बाट **JD** — पात्रोको हरेक दिन JD मा ठ्याक्कै `१.०` को फरकमा।", en: "UTC into a **JD** — consecutive calendar days sit exactly `1.0` apart on it." },
            { ne: "त्यही JD बाट स्विस एफेमेरिसमा सूर्योदय, सङ्क्रान्ति र तिथिको खोजी — `ΔT` भित्रैबाट मिलाइन्छ।", en: "From that JD, Swiss Ephemeris searches for sunrise, sankranti and tithi — `ΔT` is applied inside it." },
            { ne: "भेटिएका क्षण फेरि **स्थानीय समयमा**, र सूर्योदयको नियमले दिनमा।", en: "The instants found go back into **local time**, and the sunrise rule places them on days." },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यसैले ठाउँ छान्दा समय क्षेत्र र उचाइ दुवै चाहिन्छ — एउटा नभए दिनको सीमा नै गलत ठाउँमा पर्छ।",
            en: "This is why choosing a place needs both its time zone and its altitude — without either, the day boundary lands in the wrong place.",
          },
        },
      ],
    },
  ],
};
