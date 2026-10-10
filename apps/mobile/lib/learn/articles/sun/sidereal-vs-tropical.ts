import type { ArticleData } from "../../article-schema";

export const siderealVsTropical: ArticleData = {
  slug: "sidereal-vs-tropical",
  seeAlso: ["ayanamsha", "ritu-drift", "precession", "equinox-solstice"],
  sections: [
    {
      title: { ne: "राशिचक्र कहाँबाट नाप्ने?", en: "Where do you start measuring the zodiac?" },
      eyebrow: "The zero-point problem",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "राशिचक्र `३६०°` को वृत्त हो। तर वृत्तको **शून्य कहाँ राख्ने**? यो एउटै प्रश्नले वैदिक र पश्चिमी पात्रोलाई अलग बनाउँछ।",
            en: "The zodiac is a `360°` circle. But **where do you put its zero**? That single question is what separates the Vedic and Western calendars.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "सायन राशिचक्र", en: "Tropical zodiac" },
              p: {
                ne: "शून्य = **वसन्त विषुव**। ऋतुसँग बाँधिएको; मेषको आरम्भ ग्रेगोरियन पात्रोमा सधैँ ~२१ मार्च।",
                en: "Zero = the **vernal equinox**. Tied to the seasons; the start of Aries is always ~21 March.",
              },
            },
            {
              h: { ne: "निरयन राशिचक्र", en: "Sidereal zodiac" },
              p: {
                ne: "शून्य = **ताराको एक निश्चित बिन्दु**। तारापुञ्जसँग बाँधिएको; ऋतुबाट बिस्तारै सर्छ।",
                en: "Zero = a **fixed point among the stars**. Tied to the constellations; slowly slips against the seasons.",
              },
            },
          ],
        },
        {
          kind: "diagram",
          id: "ayanamsha-wheel",
          caption: {
            ne: "दुई राशिचक्र एकमाथि अर्को — बीचको कोणीय फरक नै अयनांश हो।",
            en: "The two zodiacs superimposed — the angular gap between them is the ayanamsha.",
          },
        },
      ],
    },
    {
      title: { ne: "फरक किन बढ्दै जान्छ", en: "Why the gap keeps growing" },
      eyebrow: "Precession",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पृथ्वीको घुर्णन अक्ष स्थिर छैन — यो लट्टुझैँ बिस्तारै घुम्छ, र एक फेरो पूरा गर्न झन्डै `२६,०००` वर्ष लाग्छ। यसलाई ~अयन चलन~ भनिन्छ।",
            en: "Earth's axis of rotation is not fixed — it wobbles like a top, taking about `26,000` years for one full turn. This is ~precession~.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "अक्ष सर्दा विषुव बिन्दु पनि सर्छ, तर तारा आफ्नै ठाउँमा रहन्छन्। त्यसैले सायन शून्य तारापुञ्जको सापेक्ष बिस्तारै पछाडि हट्दै जान्छ — प्रति वर्ष `~५०` विकला, हरेक `७२` वर्षमा झन्डै `१°`।",
            en: "As the axis shifts so does the equinox point, while the stars stay put. The tropical zero therefore slides backwards against the constellations — about `50` arc-seconds a year, roughly `1°` every `72` years.",
          },
        },
        {
          kind: "diagram",
          id: "precession-cone",
        },
        {
          kind: "formula",
          cards: [
            {
              big: "~24°",
              label: { ne: "आजको अयनांश", en: "Ayanamsha today" },
              desc: { ne: "लाहिरी प्रणालीअनुसार — दुई राशिचक्रबीचको वर्तमान फरक।", en: "By the Lahiri system — the present gap between the two zodiacs." },
            },
            {
              big: "~2,160",
              unit: { ne: "वर्ष", en: "years" },
              label: { ne: "एक राशि सर्न", en: "To shift one full sign" },
              desc: { ne: "३०° ÷ (१° प्रति ७२ वर्ष) — त्यसैले “युग” को अवधारणा।", en: "30° ÷ (1° per 72 years) — hence the notion of an \"age\"." },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "कुन सही हो?", en: "Which one is correct?" },
      eyebrow: "Neither — they answer different questions",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "यो प्रश्न आफैँ गलत छ। दुवै **सही** छन्, किनभने दुवैले फरक कुरा नाप्छन्। प्रश्न यो होइन कि कुन सही हो, प्रश्न यो हो कि तपाईंलाई के चाहिएको छ।",
            en: "The question is itself misframed. Both are **correct**, because they measure different things. The real question is not which is right but what you need.",
          },
        },
        {
          kind: "list",
          items: [
            {
              ne: "**ऋतु कहिले आउँछ** जान्न चाहनुहुन्छ? सायन प्रयोग गर्नुहोस् — ग्रेगोरियन पात्रोले त्यही गर्छ।",
              en: "Want to know **when a season arrives**? Use the tropical frame — which is what the Gregorian calendar does.",
            },
            {
              ne: "**सूर्य कुन ताराको अगाडि छ** जान्न चाहनुहुन्छ? निरयन प्रयोग गर्नुहोस् — वैदिक पात्रोले त्यही गर्छ।",
              en: "Want to know **which stars the Sun stands before**? Use the sidereal frame — which is what the Vedic calendar does.",
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "समस्या तब मात्र आउँछ जब दुई प्रणाली मिसिन्छन् — जस्तै पश्चिमी पत्रिकाको राशिफल (सायन) र नेपाली जन्म राशि (निरयन) एउटै हो भनी ठान्नु। यी झन्डै एक राशि फरक हुन्छन्।",
            en: "Trouble comes only from mixing them — taking a Western newspaper horoscope (tropical) and a Nepali birth rashi (sidereal) to be the same thing. They differ by nearly a whole sign.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "अयनांशका कैयन् प्रणाली छन् — लाहिरी, रमन, केपी — र प्रत्येकले शून्य बिन्दु अलि फरक ठाउँमा राख्छ। नेपाल र भारतको सरकारी पात्रोले **लाहिरी** प्रयोग गर्छ।",
            en: "There are several ayanamsha systems — Lahiri, Raman, KP — each placing the zero slightly differently. The official calendars of Nepal and India use **Lahiri**.",
          },
        },
      ],
    },

    {
      title: { ne: "२० मिनेटको फरक", en: "Twenty minutes" },
      eyebrow: "365.2564 vs 365.2422",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "दुई किसिमका “वर्ष” छन्, र यीबीचको फरक प्रति वर्ष झन्डै `२०` मिनेटको मात्र छ। तर यही सानो फरकले वैदिक र पश्चिमी पात्रोलाई अलग बाटोमा लैजान्छ।",
            en: "There are two kinds of \"year\", and they differ by only about `20` minutes. Yet that small gap is what sends the Vedic and Western calendars down separate roads.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "365.2564",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "नाक्षत्र वर्ष", en: "Sidereal year" },
              desc: { ne: "पृथ्वी ताराको सापेक्ष उही स्थानमा — वास्तविक परिक्रमा काल।", en: "Earth back to the same place against the stars — the true orbital period." },
            },
            {
              big: "365.2422",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "सायन वर्ष", en: "Tropical year" },
              desc: { ne: "विषुवदेखि विषुव — ऋतुचक्रको वास्तविक अवधि।", en: "Equinox to equinox — the real period of the seasonal cycle." },
            },
            {
              big: "0.0142",
              unit: { ne: "दिन", en: "day" },
              label: { ne: "फरक", en: "The difference" },
              desc: { ne: "२० मिनेट २४ सेकेन्ड — अयन चलनको प्रत्यक्ष परिणाम।", en: "20 minutes 24 seconds — a direct consequence of precession." },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "किन फरक? किनभने विषुव बिन्दु आफैँ **पछाडि सर्दै** छ। पृथ्वीले तारासँग मेल खान पूरा परिक्रमा पूरा गर्नुपर्छ; तर विषुवसँग मेल खान त्योभन्दा **अलिकति कम** पुग्छ, किनभने विषुव आफैँ भेट्न आउँदै छ।",
            en: "Why the gap? Because the equinox point is itself **sliding backwards**. To meet the stars Earth must finish a full orbit; to meet the equinox it needs **slightly less**, since the equinox is coming to meet it.",
          },
        },
      ],
    },
    {
      title: { ne: "जम्मा हुँदै जाने", en: "How it accumulates" },
      eyebrow: "One day in 72 years",
      blocks: [
        {
          kind: "para",
          text: {
            ne: "यही कारण नेपाली नयाँ वर्ष बिस्तारै पछाडि सर्दै छ। `२८५` ई.मा यो विषुवकै दिन पर्थ्यो; आज `२४` दिन पछि; `४,४००` ई.तिर यो जुन महिनामा पुग्नेछ।",
            en: "This is why the Nepali new year keeps creeping later. In `285` CE it fell on the equinox itself; today it is `24` days after; by around `4,400` CE it will have reached June.",
          },
        },
        {
          kind: "diagram",
          id: "equinox-precession",
        },
      ],
    },
    {
      title: { ne: "कुन “सही” वर्ष हो", en: "Which is the \"real\" year" },
      eyebrow: "Depends what you want it for",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "भौतिक रूपमा **नाक्षत्र वर्ष** पृथ्वीको वास्तविक परिक्रमा काल हो। तर व्यावहारिक रूपमा **सायन वर्ष** ले ऋतु दिन्छ — र मानव जीवन ऋतुमा चल्छ।",
            en: "Physically the **sidereal year** is Earth's true orbital period. Practically the **tropical year** is the one that delivers the seasons — and human life runs on seasons.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "यदि तपाईंलाई चाहिन्छ", en: "If you want" },
            { ne: "प्रयोग गर्नुहोस्", en: "Use" },
          ],
          rows: [
            [
              { ne: "कहिले धान रोप्ने", en: "To know when to plant rice" },
              { ne: "सायन — ऋतुसँग बाँधिएको", en: "Tropical — it tracks the seasons" },
            ],
            [
              { ne: "सूर्य कुन ताराको अगाडि", en: "To know which stars the Sun is among" },
              { ne: "नाक्षत्र — ताराको सापेक्ष", en: "Sidereal — it tracks the stars" },
            ],
            [
              { ne: "पृथ्वीको वास्तविक परिक्रमा काल", en: "Earth's actual orbital period" },
              { ne: "नाक्षत्र — यही भौतिक उत्तर हो", en: "Sidereal — that is the physical answer" },
            ],
          ],
        },
        {
          kind: "note",
          text: {
            ne: "ग्रेगोरियनको लीप वर्ष नियम **सायन** वर्षलाई पछ्याउन बनाइएको हो। यदि यसले नाक्षत्र वर्ष पछ्याएको भए ऋतु बिस्तारै सर्दै जान्थे — ठ्याक्कै निरयन पात्रोमा भइरहेकोजस्तै।",
            en: "The Gregorian leap rule is tuned to the **tropical** year. Had it tracked the sidereal one, its seasons would drift — exactly as they do in a sidereal calendar.",
          },
        },
      ],
    },
  ],
};
