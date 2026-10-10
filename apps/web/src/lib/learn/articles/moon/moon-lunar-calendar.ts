import type { ArticleData } from "../../article-schema";

export const moonLunarCalendar: ArticleData = {
  slug: "moon-lunar-calendar",
  seeAlso: ["lunar-month", "shukla-krishna-paksha", "chandramana", "lunar-solar-drift"],
  sections: [
    {
      title: { ne: "तिथिबाट पक्ष, पक्षबाट मास", en: "Tithi into paksha, paksha into month" },
      eyebrow: "The structure",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "चान्द्र पात्रोको संरचना सिधा छ — सबै एउटै कोणीय नापबाट क्रमशः बन्दै जान्छ।",
            en: "The lunar calendar's structure is straightforward — everything builds up in steps from a single angular measure.",
          },
        },
        {
          kind: "diagram",
          id: "tithi-elongation",
        },
        {
          kind: "para",
          text: {
            ne: "ध्यान दिनुहोस् — यहाँ कतै “दिन” आधार बनेको छैन। दिन पछि मात्र आउँछ, जब कोणीय अवस्थालाई सूर्योदयको सीमामा राखेर नागरिक मितिमा बाँडिन्छ।",
            en: "Note that \"day\" is nowhere the basis here. The day enters only afterwards, when these angular states are mapped onto civil dates using the sunrise boundary.",
          },
        },
        {
          kind: "diagram",
          id: "moon-phases",
        },
      ],
    },
    {
      title: { ne: "चन्द्रले के–के तय गर्छ", en: "What the Moon decides" },
      eyebrow: "In the Nepali calendar",
      blocks: [
        {
          kind: "keys",
          items: [
            {
              h: { ne: "चाडपर्व", en: "Festivals" },
              p: {
                ne: "दसैँ, तिहार, तीज, होली — प्रायः सबै तिथिमा आधारित। यसैले तिनका ग्रेगोरियन मिति हरेक वर्ष सर्छ।",
                en: "Dashain, Tihar, Teej, Holi — nearly all are tithi-based, which is why their Gregorian dates shift each year.",
              },
            },
            {
              h: { ne: "व्रत", en: "Fasts" },
              p: {
                ne: "एकादशी, पूर्णिमा, अमावस्या, चतुर्थी — व्रत तिथिले तय हुन्छ, गतेले होइन।",
                en: "Ekādaśī, Pūrṇimā, Amāvasyā, Caturthī — a fast is set by tithi, never by gate.",
              },
            },
            {
              h: { ne: "श्राद्ध", en: "Shraddha" },
              p: {
                ne: "मृत्युको तिथि सम्झना गरिन्छ — त्यसैले हरेक वर्ष फरक नागरिक मितिमा पर्छ।",
                en: "Observed on the tithi of a death, so it lands on a different civil date each year.",
              },
            },
            {
              h: { ne: "मुहूर्त", en: "Muhurta" },
              p: {
                ne: "शुभ समय छान्दा तिथि, नक्षत्र र करण सँगै हेरिन्छ — तीनै चन्द्रसँग जोडिएका।",
                en: "Choosing an auspicious time weighs tithi, nakshatra and karana together — all three tied to the Moon.",
              },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "शुद्ध चान्द्र पात्रोको सीमा", en: "The limit of a purely lunar calendar" },
      eyebrow: "Why Nepal is not purely lunar",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "यदि पात्रो पूरै चान्द्र भए के हुन्थ्यो? इस्लामी पात्रो त्यस्तै हो — `१२` चान्द्र मास, कुनै सुधार बिना।",
            en: "What if a calendar were purely lunar? The Islamic calendar is exactly that — `12` lunar months with no correction.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "परिणाम — त्यसका महिना हरेक वर्ष ऋतुभन्दा `११` दिन अगाडि सर्छन्, र झन्डै `३३` वर्षमा पूरै ऋतुचक्र घुमेर फर्किन्छन्। रमजान कहिले जाडोमा, कहिले गर्मीमा पर्छ।",
            en: "The consequence is that its months run `11` days ahead of the seasons each year and cycle through the whole seasonal round in about `33` years. Ramadan falls in winter in one era and in summer in another.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "नेपाली परम्पराका पर्व **ऋतुसँग बाँधिएका** छन् — दसैँ शरद्‌मा, होली वसन्तमा, माघे सङ्क्रान्ति जाडोमा। त्यसैले शुद्ध चान्द्र पात्रो काम लाग्दैन; चन्द्रलाई सूर्यसँग बाँध्नै पर्छ।",
            en: "Nepali observances, by contrast, are **bound to the seasons** — Dashain in autumn, Holi in spring, Maghe Sankranti in winter. A purely lunar calendar cannot serve them; the Moon has to be tied back to the Sun.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "त्यो बाँध्ने काम ~अधिक मास~ ले गर्छ — अर्को लेखको विषय।",
            en: "That tying-back is the job of ~adhika māsa~ — the subject of a later article.",
          },
        },
      ],
    },
  ],
};
