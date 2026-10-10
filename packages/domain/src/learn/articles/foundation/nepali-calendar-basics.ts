import type { ArticleData } from "../../article-schema";

export const nepaliCalendarBasics: ArticleData = {
  slug: "nepali-calendar-basics",
  seeAlso: ["bikram-sambat", "sauramana", "chandramana", "what-is-panchang"],
  sections: [
    {
      title: { ne: "पात्रो — दिनको सूची होइन", en: "A calendar is not a list of days" },
      eyebrow: "Where it starts",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "नेपाली पात्रो दिनलाई नम्बर दिने प्रणाली मात्र होइन। यो *खगोलीय चक्रबाट बनेको पात्रो* हो — प्रत्येक गते, तिथि र महिना आकाशमा हुने कुनै वास्तविक गतिको नतिजा हो।",
            en: "The Nepali calendar is not simply a numbering system for days. It is a *calendar built from astronomical cycles* — every gate, tithi and month is the result of a real motion in the sky.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "यसको जगमा केही अवलोकनयोग्य गति छन्, र प्रत्येकले समयको फरक एकाइ दिन्छ।",
            en: "At its foundation are several observable motions, and each one hands us a different unit of time.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "पृथ्वीको घुर्णन", en: "Earth's rotation" },
              p: {
                ne: "आफ्नै अक्षमा एक फेरो — यसले **दिन** दिन्छ।",
                en: "One turn on its own axis — this gives us the **day**.",
              },
            },
            {
              h: { ne: "सूर्यको वार्षिक गति", en: "The Sun's annual path" },
              p: {
                ne: "राशिचक्रमा सूर्यको देखिने यात्राले **सौर वर्ष** दिन्छ।",
                en: "The Sun's apparent movement through the zodiac gives the **solar year**.",
              },
            },
            {
              h: { ne: "चन्द्र–सूर्य सम्बन्ध", en: "Moon against Sun" },
              p: {
                ne: "चन्द्र र सूर्यबीचको बदलिँदो कोणले **तिथि** र चान्द्र चक्र बनाउँछ।",
                en: "The Moon's changing relationship with the Sun produces **tithi** and the lunar cycle.",
              },
            },
            {
              h: { ne: "राशि परिवर्तन", en: "Sign to sign" },
              p: {
                ne: "सूर्य एक राशिबाट अर्कोमा जाँदा ~सङ्क्रान्ति~ बन्छ।",
                en: "The Sun's move from one rashi to the next creates a ~sankranti~.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "सौर र चान्द्र चक्रबीचको सम्बन्धले महिना र वर्षको संरचना तय गर्छ। यसको अर्थ — परम्परागत पात्रोले एकै समयमा समयका **कैयन् फरक मापन** बोक्न सक्छ।",
            en: "The relationship between the solar and lunar cycles then determines the structure of months and years. Which means a traditional calendar can carry **several different measurements of time** at once.",
          },
        },
      ],
    },
    {
      title: { ne: "दुई प्रमुख मापन प्रणाली", en: "The two major systems" },
      eyebrow: "Sauramāna · Chāndramāna",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "यी कैयन् मापनमध्ये दुई विशेष महत्त्वका छन्।",
            en: "Among those measurements, two are especially important.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "सौरमान", en: "Sauramāna (सौरमान)" },
              p: {
                ne: "राशिचक्रमा सूर्यको देखिने गतिमा आधारित *सौर* मापन।",
                en: "A *solar* measure of time based on the Sun's apparent movement through the zodiac.",
              },
            },
            {
              h: { ne: "चान्द्रमान", en: "Chāndramāna (चान्द्रमान)" },
              p: {
                ne: "चन्द्र र सूर्यको सम्बन्धमा आधारित *चान्द्र* मापन।",
                en: "A *lunar* measure of time based on the Moon's relationship with the Sun.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यी दुई छुट्टाछुट्टै **मापन प्रणाली** हुन्, तर परम्परागत पात्रोमा सूर्य र चन्द्र दुवैको सम्बन्ध प्रयोग हुन्छ — एउटैले अर्कोलाई बाँधेर राख्छ।",
            en: "These are two distinct **measurement frameworks**, but a traditional calendar uses the relationship between Sun and Moon together — each one anchors the other.",
          },
        },
      ],
    },
    {
      title: { ne: "यसले किन फरक पार्छ", en: "Why this matters" },
      eyebrow: "A number vs an event",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "आधुनिक पात्रोको मिति सोच्नुहोस् — जस्तै `१५ अगस्ट`। यहाँ “१५” आफैँले कुनै खगोलीय घटना बताउँदैन; यो केवल गणना हो।",
            en: "Consider a modern calendar date such as `15 August`. The number \"15\" does not itself describe an astronomical event; it is only a count.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "पञ्चाङ्गमा भने एउटै मितिले एकैसाथ यी सबै बताउन सक्छ:",
            en: "In a Panchanga, however, a single date can simultaneously tell us all of this:",
          },
        },
        {
          kind: "list",
          items: [
            { ne: "कुन सौर महिना चलिरहेको छ", en: "which solar month is active" },
            { ne: "कुन चान्द्र महिना चलिरहेको छ", en: "which lunar month is active" },
            { ne: "कुन तिथि चलिरहेको छ", en: "which tithi is active" },
            { ne: "चन्द्रमा कुन नक्षत्रमा छ", en: "which nakshatra the Moon occupies" },
            { ne: "कुन योग र कुन करण चलिरहेको छ", en: "which yoga and which karana are active" },
            { ne: "सूर्योदय र सूर्यास्त कति बजे हुन्छ", en: "when sunrise and sunset occur" },
            { ne: "सङ्क्रान्ति कतिबेला पर्छ", en: "when a sankranti occurs" },
            {
              ne: "र यी सबै घटना अवलोकन गर्ने स्थानसँग कसरी जोडिन्छन्",
              en: "and how these events relate to the observer's location",
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "त्यसैले पञ्चाङ्गलाई मितिको सूची भन्दा **खगोलीय समय प्रणाली** मान्नु बढी सही हुन्छ।",
            en: "This is why a Panchanga is better understood as an **astronomical time system** than as a list of dates.",
          },
        },
      ],
    },
    {
      title: { ne: "सबै कसरी जोडिन्छ", en: "How everything connects" },
      eyebrow: "The hierarchy",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पूरै प्रणालीलाई एक क्रमबद्ध संरचनाका रूपमा हेर्न सकिन्छ — आकाशीय गतिबाट सुरु भई पञ्चाङ्गमा पुग्ने।",
            en: "The entire system can be seen as one hierarchy — starting from celestial motion and arriving at the Panchanga.",
          },
        },
        {
          kind: "diagram",
          id: "calendar-hierarchy",
        },
        {
          kind: "para",
          text: {
            ne: "यही जगमा टेकेर बाँकी सबै विषय बुझ्न सकिन्छ। अब क्रमैसँग अघि बढ्नुहोस् — पहिले *विक्रम सम्वत् के हो*, त्यसपछि सूर्य, चन्द्र र पञ्चाङ्गका पाँच अङ्ग।",
            en: "Everything else in this library builds on this foundation. Move through it in order — first *what Bikram Sambat is*, then the Sun, the Moon, and the five limbs of the Panchanga.",
          },
        },
      ],
    },
  ],
};
