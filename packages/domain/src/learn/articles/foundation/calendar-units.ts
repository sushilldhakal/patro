import type { ArticleData } from "../../article-schema";

/*
 * Figures: BS year lengths from the official 2000–2099 table
 * (apps/api/engine/calendar/constants.py) — 365 days in 73 of the 100 years,
 * 366 in 25, 364 and 367 once each; months 29–32 days. Gate 1 of a month is
 * the sankranti's day when the sankranti falls at or before that day's
 * Kathmandu sunrise, else the next day (engine/calendar/bikram_sambat.py,
 * `_sankranti_start_date`); 2000–2099 follow the published table.
 */
export const calendarUnits: ArticleData = {
  slug: "calendar-units",
  seeAlso: ["sayana-nirayana-year", "sankranti", "lunar-month", "vara"],
  sections: [
    {
      title: { ne: "वर्ष भनेको के हो?", en: "What is a year?" },
      eyebrow: "Mesha to Mesha",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "वि.सं.को एक वर्ष सूर्य निरयन मेषमा प्रवेश गरेदेखि फेरि मेषमा प्रवेश नगरेसम्मको अवधि हो — एक **मेष सङ्क्रान्ति** देखि अर्को मेष सङ्क्रान्तिसम्म। यो ताराले नापिने *निरयन वर्ष* हो, झन्डै `३६५.२५६` दिनको।",
            en: "A BS year runs from the Sun's entry into sidereal Mesha to its next entry — one **Mesha Sankranti** to the next. It is the *sidereal year*, measured by the stars, about `365.256` days long.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "तर पात्रोले दिनको अंश गन्न सक्दैन, त्यसैले वि.सं.को वर्ष पूर्णाङ्क दिनको हुन्छ — प्रायः `३६५`, कहिले `३६६`। आधिकारिक २०००–२०९९ तालिकामा १०० वर्षमध्ये ७३ वर्ष `३६५` दिनका, २५ वर्ष `३६६` का, र एक–एक वर्ष `३६४` र `३६७` का छन्। ग्रेगोरियनजस्तो लीप दिनको नियम छैन — दिनको सङ्ख्या सङ्क्रान्ति कहिले पर्छ भन्नेबाट आफैँ आउँछ।",
            en: "But a calendar cannot count a fraction of a day, so a BS year holds a whole number of days — usually `365`, sometimes `366`. In the official 2000–2099 table, 73 of the 100 years have `365` days, 25 have `366`, and one each has `364` and `367`. There is no Gregorian-style leap rule — the count falls out of when the sankrantis land.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "वर्ष ताराबाट कि ऋतुबाट नाप्ने — त्यो छनोट र त्यसको नतिजा [[sayana-nirayana-year|सायन र निरयन वर्ष]] मा छ।",
            en: "Whether to measure the year by the stars or by the seasons — and what that choice does — is in [[sayana-nirayana-year|the tropical and sidereal year]].",
          },
        },
      ],
    },
    {
      title: { ne: "महिना कसरी निर्धारण हुन्छ?", en: "How is a month fixed?" },
      eyebrow: "Two kinds of month",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "नेपाली पात्रोमा दुई किसिमका महिना सँगै चल्छन्, र दुवैको सीमा आकाशले तय गर्छ — घडी वा नियमले होइन।",
            en: "Two kinds of month run side by side in the Nepali calendar, and the sky sets the edges of both — not a clock or a rule.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "सौर महिना — बैशाख, जेठ…", en: "Solar month — Baisakh, Jestha…" },
              p: {
                ne: "एक सङ्क्रान्तिदेखि अर्को सङ्क्रान्तिसम्म — सूर्य एक राशिमा जति दिन बस्छ। यही वि.सं.को गते गन्ने महिना हो, `२९`–`३२` दिनको ([[month-lengths-apsides|किन फरक]])।",
                en: "From one sankranti to the next — as many days as the Sun spends in one rashi. This is the month BS counts its gates in, `29`–`32` days long ([[month-lengths-apsides|why it varies]]).",
              },
            },
            {
              h: { ne: "चान्द्र मास — चैत, बैशाख…", en: "Lunar month — Chait, Baisakh…" },
              p: {
                ne: "एक औंसीदेखि अर्को औंसीसम्म, झन्डै `२९.५` दिन। तिथि, पक्ष र चाडपर्व यसैमा चल्छन् ([[lunar-month|चान्द्र मास]])।",
                en: "From one new moon to the next, about `29.5` days. Tithis, pakshas and festivals run on it ([[lunar-month|the lunar month]]).",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "सौर महिनाको पहिलो गते कुन दिन हो भन्ने सूर्योदयले तय गर्छ: सङ्क्रान्ति त्यस दिनको काठमाडौँको सूर्योदयसम्म परे त्यही दिन १ गते, सूर्योदयपछि परे भोलिपल्ट। वि.सं. २०००–२०९९ का लागि आधिकारिक प्रकाशित तालिका नै मानिन्छ।",
            en: "Sunrise decides which day is gate 1 of a solar month: if the sankranti falls at or before that day's sunrise in Kathmandu, that day is gate 1; if after, the next day is. For BS 2000–2099 the official published table is followed.",
          },
        },
      ],
    },
    {
      title: { ne: "दिन र मिति एउटै हुन्?", en: "Are a day and a date the same?" },
      eyebrow: "Gate, vara and sunrise",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "होइनन्। **मिति** (गते) नागरिक गन्ती हो — मध्यरातमा फेरिन्छ, जसरी ई.सं.को मिति फेरिन्छ। **पञ्चाङ्गको दिन** भने सूर्योदयदेखि अर्को सूर्योदयसम्म चल्छ।",
            en: "No. The **date** (gate) is a civil count — it turns over at midnight, as an AD date does. The **panchanga day** runs from one sunrise to the next.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "त्यसैले बिहान `४` बजे गते फेरिइसकेको हुन्छ, तर वार, तिथि र नक्षत्र अझै हिजोकै — सूर्योदय नभएसम्म। कुनै गतेमा लेखिएका तिथि, वार र नक्षत्र त्यस दिनको सूर्योदयमा चलिरहेका हुन् ([[vara|वार कहिले बदलिन्छ]])।",
            en: "So at `4` in the morning the gate has already turned, but the vara, tithi and nakshatra are still yesterday's — until sunrise. The tithi, vara and nakshatra printed against a gate are the ones running at that day's sunrise ([[vara|when the vāra changes]]).",
          },
        },
      ],
    },
    {
      title: { ne: "खगोलीय घटना र पात्रोको सम्बन्ध", en: "Sky events and the calendar" },
      eyebrow: "Instant → day",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पात्रोको हरेक एकाइ कुनै खगोलीय **क्षण**बाट सुरु हुन्छ, र एउटा नियमले त्यसलाई **दिन**मा राख्छ।",
            en: "Every unit of the calendar starts from an astronomical **instant**, and a rule places it on a **day**.",
          },
        },
        {
          kind: "table",
          caption: { ne: "क्षणदेखि दिनसम्म — प्रत्येक एकाइ", en: "From instant to day — each unit" },
          headers: [
            { ne: "एकाइ", en: "Unit" },
            { ne: "कुन क्षणले तय गर्छ", en: "Set by which instant" },
            { ne: "दिनमा राख्ने नियम", en: "Rule that places it on a day" },
          ],
          rows: [
            [{ ne: "वर्ष", en: "Year" }, { ne: "मेष सङ्क्रान्ति", en: "Mesha Sankranti" }, { ne: "सङ्क्रान्ति र सूर्योदय → बैशाख १", en: "Sankranti against sunrise → Baisakh 1" }],
            [{ ne: "सौर महिना", en: "Solar month" }, { ne: "हरेक सङ्क्रान्ति", en: "Each sankranti" }, { ne: "सङ्क्रान्ति र सूर्योदय → १ गते", en: "Sankranti against sunrise → gate 1" }],
            [{ ne: "गते", en: "Gate" }, { ne: "— (नागरिक गन्ती)", en: "— (a civil count)" }, { ne: "१ गतेदेखि दिन–दिन थपिँदै", en: "Counted on day by day from gate 1" }],
            [{ ne: "चान्द्र मास", en: "Lunar month" }, { ne: "औंसीको क्षण", en: "The new-moon instant" }, { ne: "औंसीपछिको पहिलो सूर्योदय", en: "The first sunrise after the new moon" }],
            [{ ne: "तिथि", en: "Tithi" }, { ne: "सूर्य–चन्द्र कोण १२° पार", en: "Sun–Moon angle crosses 12°" }, { ne: "सूर्योदयमा चलिरहेको तिथि", en: "Whichever tithi runs at sunrise" }],
            [{ ne: "वार", en: "Vāra" }, { ne: "सूर्योदय", en: "Sunrise" }, { ne: "सूर्योदयदेखि सूर्योदयसम्म", en: "Sunrise to sunrise" }],
          ],
        },
        {
          kind: "note",
          text: {
            ne: "क्षण संसारभर एउटै हो, तर सूर्योदय ठाउँअनुसार फरक — त्यसैले पात्रो सधैँ कुनै ठाउँको हुन्छ ([[why-location-matters|स्थानअनुसार पञ्चाङ्ग किन फरक हुन्छ]])।",
            en: "The instant is the same the world over, but sunrise depends on place — which is why a calendar always belongs to somewhere ([[why-location-matters|why the panchanga changes with place]]).",
          },
        },
      ],
    },
  ],
};
