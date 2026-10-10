import type { ArticleData } from "../../article-schema";

export const rightAscension: ArticleData = {
  slug: "right-ascension",
  seeAlso: ["celestial-equator", "sidereal-time", "declination", "celestial-sphere"],
  sections: [
    {
      title: { ne: "विषुवांश — घण्टामा नापिने देशान्तर", en: "Right ascension — longitude measured in hours" },
      eyebrow: "0h to 24h",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*विषुवांश* विषुवत् प्रणालीको देशान्तर हो — वसन्त विषुव बिन्दुबाट पूर्वतिर नापिने। यसको विचित्रता — यो प्रायः **अंशमा होइन, घण्टामा** दिइन्छ।",
            en: "*Right ascension* is longitude in the equatorial system, measured eastward from the vernal equinox. Its quirk is that it is usually given **in hours rather than degrees**.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "24h",
              label: { ne: "= ३६०°", en: "= 360°" },
              desc: { ne: "पूरै वृत्त — पृथ्वीको एक घुर्णनसँग मिल्ने गरी।", en: "The full circle, matched to one rotation of Earth." },
            },
            {
              big: "1h",
              label: { ne: "= १५°", en: "= 15°" },
              desc: { ne: "पृथ्वी एक घण्टामा यति घुम्छ।", en: "How far Earth turns in an hour." },
            },
            {
              big: "4m",
              label: { ne: "= १°", en: "= 1°" },
              desc: { ne: "यसैले नाक्षत्र दिन सौर दिनभन्दा ४ मिनेट छोटो हुन्छ।", en: "Which is why a sidereal day is four minutes short of a solar one." },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "घण्टामा किन? किनभने यसले **अवलोकनलाई सिधै काम लाग्ने** बनाउँछ — दुई ताराको विषुवांश `२` घण्टा फरक छ भने दोस्रो तारा याम्योत्तर पार गर्न `२` घण्टा पर्खनुपर्छ।",
            en: "Why hours? Because it makes the number **directly usable at the telescope** — two stars `2` hours apart in right ascension cross the meridian `2` hours apart.",
          },
        },
        {
          kind: "diagram",
          id: "ecliptic-belt",
          caption: {
            ne: "विषुवत् रेखामा नापिने देशान्तर नै विषुवांश — क्रान्तिवृत्तको देशान्तरभन्दा फरक ढाँचा।",
            en: "Longitude measured along the equator is right ascension — a different frame from ecliptic longitude.",
          },
        },
      ],
    },
    {
      title: { ne: "देशान्तर र विषुवांश — नमिसाउनुहोस्", en: "Longitude and right ascension are not the same" },
      eyebrow: "Different planes",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "दुवै वसन्त विषुवबाट सुरु हुन्छन्, त्यसैले भ्रम सजिलै हुन्छ। तर यी **फरक तलमा** नापिन्छन्।",
            en: "Both are counted from the vernal equinox, which invites confusion. But they are measured **in different planes**.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "", en: "" },
            { ne: "क्रान्तिवृत्तीय देशान्तर", en: "ecliptic longitude" },
            { ne: "विषुवांश", en: "Right ascension" },
          ],
          rows: [
            [
              { ne: "तल", en: "Plane" },
              { ne: "क्रान्तिवृत्त", en: "The ecliptic" },
              { ne: "खगोलीय विषुवत् रेखा", en: "The celestial equator" },
            ],
            [
              { ne: "एकाइ", en: "Unit" },
              { ne: "अंश (०–३६०°)", en: "Degrees (0–360°)" },
              { ne: "घण्टा (०–२४h)", en: "Hours (0–24h)" },
            ],
            [
              { ne: "जोडी समन्वय", en: "Paired with" },
              { ne: "शर (अक्षांश)", en: "ecliptic latitude" },
              { ne: "क्रान्ति", en: "Declination" },
            ],
            [
              { ne: "प्रयोग", en: "Used for" },
              { ne: "राशि, नक्षत्र, तिथि", en: "Rashi, nakshatra, tithi" },
              { ne: "उदय–अस्त, लग्न", en: "Rising, setting, lagna" },
            ],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "दुवै विषुवमा मिल्छन् (`०°` = `०h`) र `१८०°` = `१२h` मा पनि। बीचमा भने ती फरक हुन्छन् — अक्ष झुकावले गर्दा।",
            en: "They agree at the equinoxes (`0°` = `0h`) and again at `180°` = `12h`. In between they differ, because of the axial tilt.",
          },
        },
      ],
    },
    {
      title: { ne: "पञ्चाङ्गमा कहाँ चाहिन्छ", en: "Where a panchanga needs it" },
      eyebrow: "Lagna, mostly",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "तिथि र नक्षत्रका लागि विषुवांश चाहिँदैन। तर **लग्न** निकाल्न यो अनिवार्य हुन्छ।",
            en: "Tithi and nakshatra do not need right ascension. Computing the **lagna** does.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "कारण — लग्न भनेको क्षितिजमा उदाउँदै गरेको बिन्दु हो, र क्षितिज पृथ्वीको घुर्णनसँग जोडिएको छ, कक्षसँग होइन। त्यसैले प्रश्न विषुवत् प्रणालीमा सोध्नुपर्छ, अनि उत्तरलाई फेरि क्रान्तिवृत्तीय राशिमा बदल्नुपर्छ।",
            en: "The reason is that the lagna is a point on the horizon, and the horizon is governed by Earth's rotation rather than its orbit. The question must be asked in the equatorial system, and the answer converted back into an ecliptic rashi.",
          },
        },
        {
          kind: "diagram",
          id: "ecliptic-equator-cross",
        },
      ],
    },
  ],
};
