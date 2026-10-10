import type { ArticleData } from "../../article-schema";

export const tithiNot24Hours: ArticleData = {
  slug: "tithi-not-24-hours",
  seeAlso: ["tithi", "tithi-vriddhi-kshaya", "why-location-matters"],
  sections: [
    {
      title: { ne: "दिन र तिथि — दुई फरक परिभाषा", en: "A day and a tithi are defined differently" },
      eyebrow: "Rotation vs angle",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "ग्रेगोरियन दिन *पृथ्वीको घुर्णन* ले परिभाषित हुन्छ — एक फेरो, झन्डै `२४` घण्टा, सधैँ उही। तिथि भने *कोणले* परिभाषित हुन्छ — चन्द्र र सूर्यबीचको दूरी `१२°` बढ्नु।",
            en: "A Gregorian day is defined by *Earth's rotation* — one turn, about `24` hours, always the same. A tithi is defined by an *angle* — the Moon–Sun separation growing by `12°`.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "यी दुई फरक किसिमका नाप हुन्। घुर्णन झन्डै स्थिर छ; कोणीय गति भने छैन। त्यसैले तिथिको लम्बाइ स्थिर हुने कुनै कारण छैन — र वास्तवमा हुँदैन।",
            en: "These are two different kinds of measurement. Rotation is very nearly constant; angular motion is not. So there is no reason for a tithi to have a fixed length — and it does not.",
          },
        },
      ],
    },
    {
      title: { ne: "चन्द्र स्थिर गतिमा हिँड्दैन", en: "The Moon does not move at a constant speed" },
      eyebrow: "Elliptical orbit",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "चन्द्रको कक्ष वृत्ताकार होइन, ~अण्डाकार~ छ। पृथ्वीको नजिक (उपभू) हुँदा चन्द्र छिटो हिँड्छ, टाढा (अपभू) हुँदा ढिलो।",
            en: "The Moon's orbit is not circular but ~elliptical~. Near Earth (perigee) it moves faster; far from Earth (apogee) it moves slower.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "~11°",
              unit: { ne: "/ दिन", en: "/ day" },
              label: { ne: "न्यूनतम कोणीय गति", en: "Slowest daily motion" },
              desc: {
                ne: "अपभूमा चन्द्र सुस्त — १२° पूरा गर्न २४ घण्टाभन्दा बढी लाग्छ।",
                en: "At apogee the Moon dawdles — covering 12° takes more than 24 hours.",
              },
            },
            {
              big: "~15°",
              unit: { ne: "/ दिन", en: "/ day" },
              label: { ne: "अधिकतम कोणीय गति", en: "Fastest daily motion" },
              desc: {
                ne: "उपभूमा चन्द्र द्रुत — १२° पूरा गर्न २० घण्टा पनि लाग्दैन।",
                en: "At perigee the Moon races — 12° can take under 20 hours.",
              },
            },
            {
              big: "~1°",
              unit: { ne: "/ दिन", en: "/ day" },
              label: { ne: "सूर्यको गति", en: "The Sun's motion" },
              desc: {
                ne: "सूर्य पनि सर्छ, र त्यो पनि स्थिर छैन — कोणान्तर घट्ने–बढ्ने दर यसैले पनि बदलिन्छ।",
                en: "The Sun shifts too, and not at a constant rate either — which also changes how fast the gap grows.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "तिथिको लम्बाइ **चन्द्रको गति घटाउ सूर्यको गति** मा निर्भर हुन्छ। दुवै घटबढ हुने हुनाले परिणाम पनि घटबढ हुन्छ।",
            en: "A tithi's length depends on the **Moon's motion minus the Sun's**. Both vary, so the result varies.",
          },
        },
        {
          kind: "diagram",
          id: "tithi-elongation",
          caption: {
            ne: "कोणान्तर बढ्ने दर सधैँ उही हुँदैन — त्यही कारण तिथिको लम्बाइ फरक पर्छ।",
            en: "The separation does not grow at a steady rate — which is exactly why tithi lengths differ.",
          },
        },
      ],
    },
    {
      title: { ne: "व्यवहारमा कति फरक पर्छ", en: "How much it actually varies" },
      eyebrow: "19 to 26 hours",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "एउटा तिथि यीमध्ये कुनै पनि हुन सक्छ:",
            en: "A tithi can therefore be any of these:",
          },
        },
        {
          kind: "list",
          items: [
            { ne: "`२४` घण्टाभन्दा **छोटो** — प्रायः `१९`–`२२` घण्टा", en: "**shorter** than `24` hours — often `19`–`22` hours" },
            { ne: "झन्डै ठ्याक्कै `२४` घण्टा", en: "approximately `24` hours" },
            { ne: "`२४` घण्टाभन्दा **लामो** — `२६` घण्टासम्म", en: "**longer** than `24` hours — up to about `26`" },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यही कारण कुनै तिथि एउटै नागरिक मितिभित्र सुरु भई सकिन्छ, भने अर्को तिथि दुई मितिमा फैलिन्छ। दुई सूर्योदय छुने तिथि दुई दिनको हुन्छ (~तिथि वृद्धि~), र कुनै सूर्योदय नछुने तिथि पात्रोबाट हराउँछ (~तिथि क्षय~)।",
            en: "This is why one tithi can begin and end inside a single civil date while another spans two. A tithi that touches two sunrises occupies two days (~tithi vriddhi~); one that touches no sunrise drops out of the calendar entirely (~tithi kshaya~).",
          },
        },
        {
          kind: "note",
          text: {
            ne: "अर्थात् तिथि “दिन” होइन — यो **कोणीय अवस्था** हो, जसलाई पात्रोले सूर्योदयको सीमामा राखेर दिनमा बाँड्छ।",
            en: "A tithi, then, is not a \"day\" — it is an **angular state**, which the calendar distributes into days using the sunrise boundary.",
          },
        },
      ],
    },
  ],
};
