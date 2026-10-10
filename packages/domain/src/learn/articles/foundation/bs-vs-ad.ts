import type { ArticleData } from "../../article-schema";

export const bsVsAd: ArticleData = {
  slug: "bs-vs-ad",
  seeAlso: ["bs-ad-offset", "bs-calendar", "calendar-differences", "why-location-matters"],
  sections: [
    {
      title: { ne: "दुई पात्रो, दुई आधार", en: "Two calendars, two foundations" },
      eyebrow: "Sidereal vs tropical",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "बि.सं. र ई.सं. (ग्रेगोरियन) दुवैले दिन गन्छन्, तर तिनको **आधार फरक** छ। ग्रेगोरियन पात्रो *सायन* वर्षमा टेकेको छ — ऋतुचक्रसँग बाँधिएको। बि.सं. का महिना *निरयन* सौर गतिमा टेकेका छन् — ताराको सन्दर्भमा सूर्यको स्थिति।",
            en: "BS and AD (Gregorian) both count days, but their **foundations differ**. The Gregorian calendar rests on the *tropical* year, tied to the seasonal cycle. The months of BS rest on *sidereal* solar motion — the Sun's position against the stars.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "यो एउटै फरकबाट तल देखाइएका बाँकी सबै फरक जन्मिन्छन्।",
            en: "Every other difference below follows from that single one.",
          },
        },
      ],
    },
    {
      title: { ne: "बिन्दुवार तुलना", en: "Point by point" },
      eyebrow: "Side by side",
      blocks: [
        {
          kind: "table",
          caption: {
            ne: "बि.सं. र ग्रेगोरियन पात्रोको संरचनात्मक तुलना",
            en: "A structural comparison of BS and the Gregorian calendar",
          },
          headers: [
            { ne: "पक्ष", en: "Aspect" },
            { ne: "विक्रम सम्वत् (बि.सं.)", en: "Bikram Sambat (BS)" },
            { ne: "ग्रेगोरियन (ई.सं.)", en: "Gregorian (AD)" },
          ],
          rows: [
            [
              { ne: "आधार", en: "Basis" },
              { ne: "निरयन सौर + चान्द्र मास नाम", en: "Sidereal solar, with lunar month names" },
              { ne: "सायन सौर", en: "Tropical solar" },
            ],
            [
              { ne: "वर्षारम्भ", en: "Year begins" },
              { ne: "मेष सङ्क्रान्ति — बैशाख १ गते", en: "Mesha Sankranti — Baisakh 1" },
              { ne: "१ जनवरी — खगोलीय अर्थ नभएको मिति", en: "1 January — a date with no astronomical meaning" },
            ],
            [
              { ne: "महिनाको लम्बाइ", en: "Month length" },
              { ne: "२९–३२ दिन, सूर्यको गतिले तय", en: "29–32 days, set by the Sun's motion" },
              { ne: "२८–३१ दिन, नियमले निर्धारित", en: "28–31 days, fixed by rule" },
            ],
            [
              { ne: "महिनाको लम्बाइ स्थिर?", en: "Month length stable?" },
              { ne: "हुँदैन — हरेक वर्ष फरक पर्न सक्छ", en: "No — it can differ year to year" },
              { ne: "हुन्छ — फेब्रुअरी बाहेक सधैँ उस्तै", en: "Yes — the same every year except February" },
            ],
            [
              { ne: "दिनको सीमा", en: "Day boundary" },
              { ne: "स्थानीय सूर्योदय (पञ्चाङ्ग परम्परा)", en: "Local sunrise (panchanga convention)" },
              { ne: "मध्यरात", en: "Midnight" },
            ],
            [
              { ne: "अतिरिक्त एकाइ", en: "Extra unit" },
              { ne: "अधिक मास — चान्द्र चक्र मिलाउन", en: "Adhika masa — to reconcile the lunar cycle" },
              { ne: "लीप दिन — अंश मिलाउन", en: "Leap day — to absorb the fractional remainder" },
            ],
            [
              { ne: "अघिल्लो वर्षको पात्रो", en: "Next year's calendar" },
              { ne: "खगोलीय गणना चाहिन्छ", en: "Requires astronomical computation" },
              { ne: "नियमबाट सिधै लेख्न सकिन्छ", en: "Can be written straight from a rule" },
            ],
          ],
        },
      ],
    },
    {
      title: { ne: "किन बि.सं. पहिल्यै लेख्न सकिँदैन", en: "Why BS cannot be tabulated in advance" },
      eyebrow: "Computed, not counted",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "ग्रेगोरियन पात्रोमा *जुलाईमा ३१ दिन* भन्ने कुरा नियम हो — कुनै गणना चाहिँदैन। बि.सं.मा *जेठमा कति दिन* भन्ने प्रश्नको उत्तर सूर्य वृषभ राशिमा कति बेर बस्छ भन्नेमा निर्भर छ।",
            en: "In the Gregorian calendar, *July has 31 days* is a rule — nothing to compute. In BS, *how many days Jestha has* depends on how long the Sun actually lingers in Vrishabha.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "पृथ्वीको कक्ष अण्डाकार भएकाले सूर्यको देखिने गति वर्षभरि घटबढ हुन्छ। उपसौर (perihelion) नजिक सूर्य छिटो हिँड्छ, अपसौर (aphelion) नजिक ढिलो। त्यसैले कुनै राशिमा `२९` दिन, कुनैमा `३२` दिनसम्म बस्छ।",
            en: "Because Earth's orbit is elliptical, the Sun's apparent speed varies through the year — faster near perihelion, slower near aphelion. So it spends as few as `29` and as many as `32` days in a sign.",
          },
        },
        {
          kind: "diagram",
          id: "earth-orbit",
          caption: {
            ne: "अण्डाकार कक्षमा पृथ्वीको गति — सूर्यसँगको दूरी घटबढ हुँदा देखिने कोणीय गति पनि बदलिन्छ।",
            en: "Earth on its elliptical orbit — as the distance to the Sun changes, so does the apparent angular speed.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "यसैले नेपाली पात्रो प्रत्येक वर्ष **गणना गरेर** बनाइन्छ, पुरानो पात्रो सारेर होइन। यो प्रणाली वेदिक पात्रोभित्र कसरी चल्छ भन्ने *हामी यो कसरी गणना गर्छौं* मा छ।",
            en: "This is why the Nepali calendar is **computed** each year rather than copied forward. How that computation runs inside Vedic Patro is covered in *How We Calculate It*.",
          },
        },
      ],
    },
  ],
};
