import type { ArticleData } from "../../article-schema";

export const timeScales: ArticleData = {
  slug: "time-scales",
  seeAlso: ["calc-sankranti", "sidereal-time", "location-different-results", "how-we-calculate"],
  sections: [
    {
      title: { ne: "कुन घडीमा गणना गर्ने?", en: "Which clock do you compute in?" },
      eyebrow: "UT, TT and ΔT",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "खगोलीय गणनाका लागि “समय” एउटै कुरा होइन। कम्तीमा दुई फरक कालमान चाहिन्छ, र दुईबीचको फरक बेवास्ता गर्दा त्रुटि आउँछ।",
            en: "For astronomical computation \"time\" is not one thing. At least two different scales are needed, and ignoring the gap between them introduces error.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "UT — विश्वव्यापी समय", en: "UT — Universal Time" },
              p: {
                ne: "पृथ्वीको **घुर्णन**मा आधारित — हाम्रो नागरिक घडी यही हो। तर पृथ्वीको घुर्णन पूर्ण नियमित छैन।",
                en: "Based on Earth's **rotation** — the civil clock we live by. But Earth's rotation is not perfectly regular.",
              },
            },
            {
              h: { ne: "TT — स्थलीय समय", en: "TT — Terrestrial Time" },
              p: {
                ne: "परमाणु घडीमा आधारित **समान** कालमान — ग्रहपात (ephemeris) यही मान्छ।",
                en: "A **uniform** scale kept by atomic clocks — the scale an ephemeris expects.",
              },
            },
            {
              h: { ne: "ΔT — दुईबीचको फरक", en: "ΔT — the gap between them" },
              p: {
                ne: "`ΔT = TT − UT`। आज झन्डै `~६९` सेकेन्ड; `१७००` ई.मा झन्डै `९` सेकेन्ड; `१०००` ई.मा `~१,५७०` सेकेन्ड।",
                en: "`ΔT = TT − UT`. Today about `~69` seconds; around `1700` CE about `9`; around `1000` CE some `1,570`.",
              },
            },
          ],
        },
        {
          kind: "diagram",
          id: "earth-rotation",
          caption: {
            ne: "पृथ्वीको घुर्णनले UT दिन्छ, तर त्यो एकनास छैन — त्यसैले गणनाका लागि TT चाहिन्छ।",
            en: "Earth's rotation gives UT, but it is not uniform — which is why the computation needs TT.",
          },
        },
      ],
    },
    {
      title: { ne: "पृथ्वीको घुर्णन सुस्ताउँदै छ", en: "Earth's rotation is slowing" },
      eyebrow: "Why ΔT grows",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "चन्द्रको ज्वारीय घर्षणले पृथ्वीको घुर्णन बिस्तारै सुस्त पार्दै छ — शताब्दीमा झन्डै `१.७` मिलिसेकेन्ड प्रति दिन।",
            en: "Tidal friction from the Moon is gradually slowing Earth's spin — by roughly `1.7` milliseconds per day per century.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "प्रति दिन मिलिसेकेन्ड नगण्य देखिन्छ, तर यो **सञ्चित** हुन्छ। शताब्दीयौँमा जम्मा हुँदै यो घण्टौँमा पुग्छ — त्यसैले `ΔT` पुराना मितिमा ठूलो हुन्छ।",
            en: "Milliseconds a day sound negligible, but they **accumulate**. Over centuries the sum reaches hours — which is why `ΔT` is large for ancient dates.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "~69s",
              label: { ne: "आज / ΔT today", en: "ΔT today" },
              desc: { ne: "आधुनिक मितिका लागि सानो, तर शून्य होइन।", en: "Small for modern dates, but not zero." },
            },
            {
              big: "~1,570s",
              label: { ne: "१००० ई. / 1000 CE", en: "1000 CE" },
              desc: { ne: "झन्डै २६ मिनेट — ऐतिहासिक ग्रहण मिलाउन अनिवार्य।", en: "About 26 minutes — essential for matching historical eclipses." },
            },
            {
              big: "~5.7h",
              label: { ne: "२००० ई.पू. / 2000 BCE", en: "2000 BCE" },
              desc: { ne: "बेवास्ता गरे ग्रहण संसारको बिल्कुलै फरक भागमा देखिन्थ्यो।", en: "Ignore it and an eclipse lands on quite the wrong part of the world." },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "पञ्चाङ्गमा यसको असर", en: "What it means for a panchanga" },
      eyebrow: "Modern dates: small. Ancient: not.",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "आजका मितिका लागि `ΔT` को `~६९` सेकेन्डले तिथि वा सङ्क्रान्तिको दिन प्रायः बदल्दैन — तर सन्धि समय मध्यरात वा सूर्योदयको ठ्याक्कै सिमानामा परे बदल्न सक्छ।",
            en: "For today's dates `~69` seconds of `ΔT` rarely changes the day of a tithi or sankranti — though it can if the boundary sits right at midnight or sunrise.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "पुराना बि.सं. मितिका लागि भने यो निर्णायक हुन्छ। `ΔT` बेवास्ता गरेर `१०००` ई.को सङ्क्रान्ति गणना गर्दा `२६` मिनेटको त्रुटि आउँछ — र त्यो मध्यरात नजिक परे **गते नै एक दिन फरक** हुन्छ।",
            en: "For older BS dates it is decisive. Computing a `1000` CE sankranti without `ΔT` is off by `26` minutes — and near midnight that shifts the **gate by a full day**.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "Swiss Ephemeris ले `ΔT` भित्रै सम्हाल्छ, त्यसैले engine ले UT मा क्षण दिँदा पनि ग्रहपातले सही TT मा गणना गर्छ। तर यो मौन रूपमा हुने भएकाले बिर्सन सजिलो छ — र आफ्नै सूत्र लेख्दा यही चुक्ने सम्भावना सबैभन्दा बढी हुन्छ।",
            en: "Swiss Ephemeris handles `ΔT` internally, so an instant handed to it in UT is evaluated at the correct TT. Because that happens silently it is easy to forget — and it is the likeliest thing to get wrong when writing the formulas yourself.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "`ΔT` को भविष्यको मान **भविष्यवाणी गर्न सकिँदैन** — पृथ्वीको घुर्णन अनियमित छ, त्यसैले यो अवलोकनबाट मात्र थाहा हुन्छ। यसैले ग्रहपात तालिका समय–समयमा अद्यावधिक गरिन्छ।",
            en: "Future values of `ΔT` **cannot be predicted** — Earth's rotation is irregular, so it is known only from observation. This is why ephemeris tables are periodically updated.",
          },
        },
      ],
    },
  ],
};
