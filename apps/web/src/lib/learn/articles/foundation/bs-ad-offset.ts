import type { ArticleData } from "../../article-schema";

export const bsAdOffset: ArticleData = {
  slug: "bs-ad-offset",
  seeAlso: ["bs-vs-ad", "ayanamsha", "ritu-drift", "bikram-sambat"],
  sections: [
    {
      title: { ne: "“५६–५७ वर्ष अगाडि” — कति सही?", en: "\"56 or 57 years ahead\" — how true?" },
      eyebrow: "A useful approximation",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "प्रायः भनिन्छ — “बि.सं. ई.सं.भन्दा ५६ वा ५७ वर्ष अगाडि छ।” यो **उपयोगी अनुमान** हो, तर पूर्ण पात्रो नियम होइन।",
            en: "People often say: \"BS is 56 or 57 years ahead of AD.\" That is a **useful approximation**, but it is not a complete calendrical rule.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "दुई पात्रोबीचको सम्बन्ध कुनै एक स्थिराङ्क घटाउने काम मात्र होइन, किनभने मितिका कम्तीमा तीन अंश हुन्छन्:",
            en: "The relationship between two calendars involves more than subtracting a constant, because a date has at least three components:",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: { ne: "वर्ष", en: "Year" },
              label: { ne: "वर्षको सङ्ख्या", en: "The year number" },
              desc: {
                ne: "यहाँ मात्र ५६–५७ को फरक लागू हुन्छ — र त्यो पनि वर्षको कुन भागमा छ भन्नेमा निर्भर।",
                en: "Only here does the 56–57 offset apply — and even then it depends where in the year you are.",
              },
            },
            {
              big: { ne: "महिना", en: "Month" },
              label: { ne: "महिनाको सीमा", en: "The month boundary" },
              desc: {
                ne: "बि.सं.को महिना सङ्क्रान्तिले सुरु हुन्छ, ग्रेगोरियनको नियमले।",
                en: "A BS month starts at a sankranti; a Gregorian month starts by rule.",
              },
            },
            {
              big: { ne: "गते", en: "Day" },
              label: { ne: "गते–मिति नक्सा", en: "The day-to-date mapping" },
              desc: {
                ne: "महिनाको लम्बाइ फरक हुने हुनाले गते–मिति नक्सा हरेक वर्ष बदलिन्छ।",
                en: "Because month lengths differ, the day-to-date mapping shifts every year.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "वर्षको सङ्ख्या झन्डै ५६–५७ ले फरक भए पनि, **मितिको ठ्याक्कै सम्बन्ध** प्रत्येक पात्रोले आफ्नो महिना र वर्षको सीमा कसरी परिभाषित गर्छ भन्नेमा निर्भर हुन्छ। बैशाख १ अप्रिल मध्यमा पर्ने हुनाले जनवरी–अप्रिलमा फरक ५६ हुन्छ, अप्रिल–डिसेम्बरमा ५७।",
            en: "Even though the year numbers differ by roughly 56–57, the **exact relationship between dates** depends on how each calendar defines its month and year boundaries. Because Baisakh 1 falls in mid-April, the offset is 56 from January to April and 57 from April to December.",
          },
        },
      ],
    },
    {
      title: { ne: "गहिरो खगोलीय कारण", en: "The deeper astronomical reason" },
      eyebrow: "Precession",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "परम्परागत निरयन सौर पात्रोले सूर्यलाई **तारापुञ्जको सन्दर्भ**मा नाप्छ। आधुनिक सायन पात्रो मूलतः **ऋतु वर्ष**सँग बाँधिएको छ।",
            en: "A traditional sidereal solar calendar tracks the Sun against a **stellar reference frame**. A modern tropical calendar is fundamentally tied to the **seasonal year**.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "पृथ्वीको अक्ष बिस्तारै घुम्ने (अयन चलन) हुनाले यी दुई सन्दर्भ प्रणालीको सम्बन्ध पनि बिस्तारै बदलिन्छ। यो चक्र झन्डै `२६,०००` वर्षको हुन्छ — त्यसैले हजारौँ वर्षको दायरामा विषुवको स्थान तारा–राशिचक्रको सापेक्षमा उल्लेख्य रूपमा सर्छ।",
            en: "Because Earth's axis slowly changes orientation through precession, the relationship between those two reference systems changes too. The cycle runs about `26,000` years, so across millennia the equinox shifts significantly against the stellar zodiac.",
          },
        },
        {
          kind: "diagram",
          id: "precession-cone",
          caption: {
            ne: "पृथ्वीको अक्षले बनाउने शङ्कु — एक फेरो पूरा हुन झन्डै २६,००० वर्ष लाग्छ।",
            en: "The cone traced by Earth's axis — one full turn takes roughly 26,000 years.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "त्यसैले निरयन सौर पात्रो र सायन पात्रोबीचको फरकलाई “एउटा पात्रो ५६ वर्ष अगाडि छ” भनेर मात्र वर्णन गर्नु अपूर्ण हुन्छ। वास्तविक फरक = **सम्वत्को आरम्भ + खगोलीय सन्दर्भ + पात्रोका नियम**, तीनैको संयुक्त परिणाम हो।",
            en: "So describing the gap between a sidereal solar calendar and a tropical one as \"one calendar is 56 years ahead\" is incomplete. The real difference is the combined consequence of **calendar epoch + astronomical reference + calendar rules**.",
          },
        },
      ],
    },
    {
      title: { ne: "सौर वर्ष — एउटै परिभाषा छैन", en: "A solar year has more than one definition" },
      eyebrow: "Tropical vs sidereal year",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सौर वर्षले पृथ्वीको सूर्य वरिपरिको एक परिक्रमा जनाउँछ — तर “वर्ष” नाप्ने एउटै तरिका छैन। कुन सन्दर्भमा नाप्ने भन्नेमा उत्तर फरक पर्छ।",
            en: "A solar year represents one revolution of Earth around the Sun — but there is not only one possible definition of \"year\". The answer depends on the reference you measure against.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "365.2422",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "सायन वर्ष (tropical)", en: "Tropical year" },
              desc: {
                ne: "ऋतुचक्रसँग जोडिएको अवधि — विषुवदेखि विषुवसम्म। ग्रेगोरियन पात्रोले यही पछ्याउँछ।",
                en: "The period tied to the seasonal cycle, equinox to equinox. This is what the Gregorian calendar follows.",
              },
            },
            {
              big: "365.2564",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "नाक्षत्र वर्ष (sidereal)", en: "Sidereal year" },
              desc: {
                ne: "पृथ्वी टाढाका ताराको सापेक्ष उही स्थानमा फर्किन लाग्ने समय। निरयन पात्रोले यही पछ्याउँछ।",
                en: "The time for Earth to return to the same place against the distant stars. This is what a sidereal calendar follows.",
              },
            },
            {
              big: "0.0142",
              unit: { ne: "दिन / वर्ष", en: "day / year" },
              label: { ne: "फरक", en: "The difference" },
              desc: {
                ne: "झन्डै २० मिनेट प्रति वर्ष — देखिनसक्नु सानो, तर शताब्दीयौँमा जम्मा हुन्छ।",
                en: "Roughly 20 minutes a year — vanishingly small, yet it accumulates over centuries.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "प्रति वर्ष २० मिनेट भन्ने फरक `७२` वर्षमा झन्डै एक दिन, र `२,१६०` वर्षमा एक पूरै राशि (३०°) बन्छ। त्यसैले शताब्दी र सहस्राब्दीको दायरामा पात्रो बनाउँदा **कुन खगोलीय सन्दर्भ चुन्यो** भन्ने प्रश्न अत्यन्तै महत्त्वपूर्ण हुन्छ।",
            en: "Twenty minutes a year becomes about one day in `72` years, and a full sign of `30°` in `2,160` years. That is why, when building a calendar meant to last centuries or millennia, **which astronomical reference you choose** matters enormously.",
          },
        },
        {
          kind: "diagram",
          id: "equinox-precession",
          caption: {
            ne: "विषुव बिन्दु तारापुञ्जको सापेक्ष बिस्तारै सर्दै — सायन र निरयन वर्षबीचको फरकको मूल।",
            en: "The equinox point slowly sliding against the stars — the origin of the gap between the tropical and sidereal year.",
          },
        },
      ],
    },
  ],
};
