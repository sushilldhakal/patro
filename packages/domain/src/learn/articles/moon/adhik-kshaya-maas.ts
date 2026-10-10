import type { ArticleData } from "../../article-schema";

/**
 * अधिक मास and क्षय मास together — one rule, read from both ends.
 *
 * They were two articles, and each opened by defining the other: the अधिक page
 * closed on "rarely, two सङ्क्रान्ति in one month drops it", and the क्षय page
 * opened with a keys block restating the अधिक rule so it had something to
 * mirror. There is only one rule here — count the सङ्क्रान्ति inside a चान्द्र
 * मास — and the two names are its two failure modes: none, and two.
 *
 * The अधिक half was hand-built JSX; converting it to data was what let the two
 * sit in one file.
 */
export const adhikKshayaMaas: ArticleData = {
  slug: "adhik-kshaya-maas",
  seeAlso: ["lunar-solar-drift", "lunar-month", "sankranti", "chandramana"],
  sections: [
    {
      title: { ne: "एउटै नियम, दुई नतिजा", en: "One rule, two outcomes" },
      eyebrow: "Count the sankrantis",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "एक **चान्द्र मास** `~२९.५` दिनको हुन्छ; एक **सौर मास** `~३०.४` दिनको। दुई लम्बाइ नमिल्ने भएकाले कहिलेकाहीँ एउटा चान्द्र मासभित्र सङ्क्रान्तिको गणना बिग्रन्छ — र त्यहीँबाट यी दुई नाम आउँछन्।",
            en: "A **lunar month** runs `~29.5` days; a **solar month** `~30.4`. Because the two lengths do not match, the count of sankrantis inside a lunar month occasionally goes wrong — and that is where both names come from.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "अधिक मास", en: "Adhika māsa" },
              p: {
                ne: "चान्द्र मासभित्र **कुनै सङ्क्रान्ति परेन** → मास दोहोरिन्छ। हरेक करिब तीन वर्षमा।",
                en: "A lunar month contains **no sankranti** → the month is doubled. Roughly every three years.",
              },
            },
            {
              h: { ne: "क्षय मास", en: "Kṣaya māsa" },
              p: {
                ne: "चान्द्र मासभित्र **दुई सङ्क्रान्ति परे** → एक मास घट्छ। `१४०`–`१९०` वर्षमा एक पटक।",
                en: "A lunar month contains **two sankrantis** → a month is dropped. Once in `140`–`190` years.",
              },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "थपिने महिना — अधिक मास", en: "The extra month — Adhika māsa" },
      eyebrow: "No sankranti inside",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "चान्द्र मास सौर मासभन्दा छोटो भएकाले बेलाबेला एउटा चान्द्र मास पूरै दुई सङ्क्रान्तिको बीचमा अटाउँछ — भित्र *कुनै सङ्क्रान्ति पर्दैन*। त्यही महिना ~अधिक मास~ कहलिन्छ र अघिल्लो महिनाको नाम दोहोर्‍याउँछ।",
            en: "Because a lunar month is the shorter of the two, one occasionally fits entirely between two sankrantis — with *none inside it*. That month is the ~adhika māsa~, and it repeats the previous month's name.",
          },
        },
        {
          kind: "diagram",
          id: "adhik-maas",
          caption: {
            ne: "मेष सौर मासभित्रै दुई औंसी परे — बीचको चान्द्र मासमा सङ्क्रान्ति नपरेकाले त्यो “अधिक वैशाख” बन्यो; त्यसपछिको नियमित महिना “निज वैशाख”।",
            en: "Two new moons fell within the Mesha solar month — because the lunar month between them had no sankranti, it became “Adhik Baisakh”; the regular month after it is “Nija Baisakh”.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "~३२.५ महिनामा एकपटक", en: "Once in ~32.5 months" },
              p: {
                ne: "जोडिँदै गएको फरकले झन्डै हरेक तीन वर्षमा एक अधिक मास बनाउँछ।",
                en: "The accumulating difference adds one adhika māsa roughly every three years.",
              },
            },
            {
              h: { ne: "अधिक र निज", en: "Adhika and Nija" },
              p: {
                ne: "सङ्क्रान्ति बिनाको महिना “अधिक”, त्यसपछिको “निज” (साँचो)।",
                en: "The month with no sankranti is “Adhika”, the one after it “Nija” (true).",
              },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "घट्ने महिना — क्षय मास", en: "The month that disappears — Kṣaya māsa" },
      eyebrow: "Two sankrantis inside",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "अधिक मास थपिन्छ भन्ने सबैलाई थाहा छ। तर विपरीत पनि सम्भव छ — कुनै चान्द्र मास पात्रोबाट **हराउन** सक्छ।",
            en: "That an extra month gets added is widely known. The opposite is also possible — a lunar month can **vanish** from the calendar.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "चान्द्र मास `२९.५३` दिनको हुन्छ। सौर मास सामान्यतया `३०`–`३१` दिनको — त्यसैले प्रायः एक चान्द्र मासमा एउटै सङ्क्रान्ति पर्छ। तर पुष–माघतिर पृथ्वी ~उपसौर~ नजिक हुन्छ। त्यसबेला सूर्य सबैभन्दा छिटो हिँड्छ र सौर मास घटेर `२९` दिनसम्म झर्छ — चान्द्र मासभन्दा छोटो। तब दुई सङ्क्रान्ति एउटै चान्द्र मासभित्र अटाउन सक्छन्।",
            en: "A lunar month runs `29.53` days and a solar month usually `30`–`31`, so normally exactly one sankranti falls inside each lunar month. Around पुष–माघ, though, Earth is near ~perihelion~. The Sun then moves at its fastest and a solar month shrinks to about `29` days — shorter than a lunar month. Two sankrantis can then fit inside one.",
          },
        },
      ],
    },
    {
      title: { ne: "क्षय मास कति दुर्लभ छ", en: "How rare a kṣaya māsa is" },
      eyebrow: "Once in a lifetime",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "क्षय मास अत्यन्तै दुर्लभ छ — औसतमा `१४०` देखि `१९०` वर्षमा एक पटक। अधिक मास हरेक करिब तीन वर्षमा आउने कुरासँग तुलना गर्नुहोस्।",
            en: "A kṣaya māsa is genuinely rare — on average once every `140` to `190` years. Compare that with an extra month roughly every three.",
          },
        },
        {
          kind: "list",
          items: [
            {
              ne: "यो सधैँ **कात्तिक, मंसिर वा पुष** मध्ये कुनै एक हुन्छ — उपसौर यही समयमा पर्ने भएकाले।",
              en: "It is always one of **कात्तिक, मंसिर or पुष** — because that is when perihelion falls.",
            },
            {
              ne: "क्षय मास पर्ने वर्षमा **सधैँ दुई अधिक मास** पनि हुन्छन् — एउटा अगाडि, एउटा पछाडि — जसले वर्षको सन्तुलन कायम राख्छ।",
              en: "A year containing a kṣaya māsa **always carries two adhika māsas** as well, one before and one after, which keeps the year in balance.",
            },
            {
              ne: "पृथ्वीको उपसौर बिन्दु आफैँ बिस्तारै सर्ने हुनाले, शताब्दीयौँपछि क्षय मास फरक महिनामा पर्न थाल्नेछ।",
              en: "Because Earth's perihelion itself slowly shifts, in future centuries the kṣaya māsa will start landing in different months.",
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "क्षय मास पात्रोको त्रुटि होइन — यो नियमको इमानदार परिणाम हो। सूर्य र चन्द्र दुवैको वास्तविक गति पछ्याउँदा यस्ता दुर्लभ अवस्था आउनु स्वाभाविक हो।",
            en: "A kṣaya māsa is not a calendar error but an honest consequence of the rule. Follow the true motion of both Sun and Moon and rare cases like this are bound to arise.",
          },
        },
      ],
    },
  ],
};
