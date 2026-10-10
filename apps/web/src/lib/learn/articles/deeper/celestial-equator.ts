import type { ArticleData } from "../../article-schema";

export const celestialEquator: ArticleData = {
  slug: "celestial-equator",
  seeAlso: ["ecliptic", "declination", "equinox-solstice", "celestial-sphere"],
  sections: [
    {
      title: { ne: "पृथ्वीको विषुवत् रेखा आकाशमा", en: "Earth's equator, projected upward" },
      eyebrow: "The other great circle",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*खगोलीय विषुवत् रेखा* पृथ्वीको विषुवत् रेखालाई आकाशसम्म फैलाएर बनेको काल्पनिक वृत्त हो। यो पृथ्वीको **घुर्णन**सँग बाँधिएको छ, कक्षसँग होइन।",
            en: "The *celestial equator* is Earth's equator extended outward to the sky. It is tied to Earth's **rotation**, not to its orbit.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "क्रान्तिवृत्त", en: "ecliptic" },
              p: {
                ne: "पृथ्वीको **कक्ष**बाट — सूर्य यसैमा हिँड्छ। राशि, नक्षत्र, तिथि यहाँ नापिन्छन्।",
                en: "From Earth's **orbit** — the Sun travels along it. Rashi, nakshatra and tithi are measured here.",
              },
            },
            {
              h: { ne: "खगोलीय विषुवत् रेखा", en: "Celestial equator" },
              p: {
                ne: "पृथ्वीको **घुर्णन**बाट — तारा यसकै समानान्तर घुमेको देखिन्छ। उदय–अस्त र लग्न यहाँ नापिन्छन्।",
                en: "From Earth's **rotation** — the stars wheel parallel to it. Rising, setting and lagna are measured here.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "दुई वृत्त `२३.४४°` को कोणमा भेटिन्छन् — यही कोण अक्ष झुकाव हो, र यिनी काटिने दुई बिन्दु नै ~विषुव~ हुन्।",
            en: "The two circles meet at `23.44°` — the axial tilt — and the two points where they cross are the ~equinoxes~.",
          },
        },
        {
          kind: "diagram",
          id: "declination-year",
          caption: {
            ne: "क्रान्ति शून्य हुने रेखा नै खगोलीय विषुवत् रेखा — वर्षमा दुई पटक सूर्यले यसलाई काट्छ।",
            en: "The line where declination is zero is the celestial equator — the Sun crosses it twice a year.",
          },
        },
      ],
    },
    {
      title: { ne: "विषुव — दुई प्रणालीको जोड", en: "The equinox — where the systems join" },
      eyebrow: "The shared zero",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "वसन्त विषुव बिन्दु विशेष छ — यो **दुवै** समन्वय प्रणालीको शून्य बिन्दु हो। क्रान्तिवृत्तीय देशान्तर र विषुवांश दुवै यहीँबाट गनिन्छन्।",
            en: "The vernal equinox point is special — it is the zero of **both** coordinate systems. ecliptic longitude and right ascension are each counted from it.",
          },
        },
        {
          kind: "diagram",
          id: "ecliptic-equator-cross",
        },
        {
          kind: "para",
          text: {
            ne: "तर यो बिन्दु स्थिर छैन — अयन चलनका कारण यो ताराको सापेक्ष प्रति वर्ष `~५०` विकला सर्छ। यही सरणले सायन र निरयन प्रणालीलाई अलग गर्छ।",
            en: "But that point is not fixed — precession slides it `~50` arc-seconds a year against the stars. That slide is exactly what separates the tropical and sidereal systems.",
          },
        },
      ],
    },
    {
      title: { ne: "कुन कहाँ प्रयोग हुन्छ", en: "Which is used where" },
      eyebrow: "Both, at different steps",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पञ्चाङ्ग गणनाले दुवै प्रणाली प्रयोग गर्छ, फरक चरणमा — र बीच–बीचमा एउटाबाट अर्कोमा रूपान्तरण गर्दै।",
            en: "Panchanga computation uses both, at different steps, converting between them as it goes.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "काम", en: "Task" },
            { ne: "प्रणाली", en: "System" },
          ],
          rows: [
            [
              { ne: "तिथि, नक्षत्र, योग, करण", en: "Tithi, nakshatra, yoga, karana" },
              { ne: "क्रान्तिवृत्तीय — देशान्तर", en: "ecliptic — longitude" },
            ],
            [
              { ne: "राशि, सङ्क्रान्ति, गते", en: "Rashi, sankranti, gate" },
              { ne: "क्रान्तिवृत्तीय — निरयन देशान्तर", en: "ecliptic — sidereal longitude" },
            ],
            [
              { ne: "सूर्योदय, सूर्यास्त, दिनमान", en: "Sunrise, sunset, day length" },
              { ne: "विषुवत् — क्रान्ति", en: "Equatorial — declination" },
            ],
            [
              { ne: "लग्न, भाव", en: "Lagna, houses" },
              { ne: "विषुवत् — विषुवांश र नाक्षत्र काल", en: "Equatorial — right ascension and sidereal time" },
            ],
          ],
        },
        {
          kind: "note",
          text: {
            ne: "यसैले एउटै दिनको पञ्चाङ्ग बनाउन engine ले **दुवै समन्वय प्रणाली** र तिनबीचको रूपान्तरण चलाइरहेको हुन्छ — अक्ष झुकाव `२३.४४°` ले जोड्ने काम गर्छ।",
            en: "So building a single day's panchanga keeps the engine moving between **both coordinate systems**, with the `23.44°` tilt as the bridge.",
          },
        },
      ],
    },
  ],
};
