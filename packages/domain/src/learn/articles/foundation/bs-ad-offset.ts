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
            ne: "प्रायः भनिन्छ — “वि.सं. ई.सं.भन्दा ५६ वा ५७ वर्ष अगाडि छ।” यो **उपयोगी अनुमान** हो, तर पूर्ण पात्रो नियम होइन।",
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
                ne: "वि.सं.को महिना सङ्क्रान्तिले सुरु हुन्छ, ग्रेगोरियनको नियमले।",
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
            ne: "पृथ्वीको अक्ष बिस्तारै घुम्ने (~अयन चलन~) हुनाले यी दुई सन्दर्भको सम्बन्ध पनि बिस्तारै बदलिन्छ — अक्षको शङ्कुसहित [[sidereal-vs-tropical|एउटै आकाश, दुई राशिचक्र]] मा।",
            en: "Because Earth's axis slowly changes direction (~precession~), the relationship between those two references changes too — the axis cone is drawn in [[sidereal-vs-tropical|one sky, two zodiacs]].",
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
          kind: "para",
          text: {
            ne: "ऋतुबाट नापिने *सायन वर्ष* र ताराबाट नापिने *निरयन वर्ष* बीच वर्षमा झन्डै `२०` मिनेटको फरक छ — एक वर्षमा नदेखिने, तर शताब्दीऔँमा दिन र राशिसम्म जम्मा हुने। दुवै वर्ष र तिनको फरक [[sayana-nirayana-year|सायन र निरयन वर्ष]] मा छ।",
            en: "The *tropical year*, measured by the seasons, and the *sidereal year*, measured by the stars, differ by about `20` minutes a year — invisible in one year, yet over centuries it adds up to days and then whole signs. Both years and the gap between them are in [[sayana-nirayana-year|the tropical and sidereal year]].",
          },
        },
        {
          kind: "para",
          text: {
            ne: "त्यसैले शताब्दी र सहस्राब्दीको दायरामा चल्ने पात्रोमा **कुन खगोलीय सन्दर्भ चुन्ने** भन्ने प्रश्न अत्यन्तै महत्त्वपूर्ण हुन्छ — र वि.सं. र ई.सं.ले फरक सन्दर्भ चुनेका छन्।",
            en: "That is why, for a calendar meant to run for centuries or millennia, **which astronomical reference you choose** matters enormously — and BS and AD chose different ones.",
          },
        },
      ],
    },
  ],
};
