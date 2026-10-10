import type { ArticleData } from "../../article-schema";

export const ecliptic: ArticleData = {
  slug: "ecliptic",
  seeAlso: ["celestial-sphere", "zodiac-belt", "celestial-equator", "solar-longitude"],
  sections: [
    {
      title: { ne: "क्रान्तिवृत्त — सूर्यको बाटो", en: "The ecliptic — the Sun's road" },
      eyebrow: "One line, everything on it",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*क्रान्तिवृत्त* आकाशमा सूर्यले वर्षभरि पछ्याउने मार्ग हो। वास्तवमा यो पृथ्वीको कक्षीय तललाई आकाशमा प्रक्षेपित गरेको रेखा हो।",
            en: "The *ecliptic* is the path the Sun traces across the sky through the year. It is really the plane of Earth's orbit projected onto the sky.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "पञ्चाङ्गका झन्डै सबै नाप यही रेखामा हुन्छन् — राशि यसैलाई `१२` भाग गरेर, नक्षत्र `२७` भाग गरेर, र तिथि यसैमा दुई पिण्डको दूरी नापेर।",
            en: "Nearly every panchanga measurement lives on this line — the rashis divide it by `12`, the nakshatras by `27`, and a tithi measures the separation of two bodies along it.",
          },
        },
        {
          kind: "diagram",
          id: "ecliptic-belt",
          caption: {
            ne: "क्रान्तिवृत्त र त्यसमा बाँडिएका राशि खण्ड।",
            en: "The ecliptic and the rashi divisions laid along it.",
          },
        },
      ],
    },
    {
      title: { ne: "नाम कहाँबाट आयो", en: "Where the name comes from" },
      eyebrow: "Eclipse line",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "अङ्ग्रेजी *ecliptic* शब्द *eclipse* सँग जोडिएको छ — र यो संयोग होइन।",
            en: "The word *ecliptic* is related to *eclipse* — and that is no accident.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "ग्रहण त्यतिबेला मात्र लाग्छ जब चन्द्र क्रान्तिवृत्तमै हुन्छ। चन्द्रको कक्ष `~५°` ढल्केको भएकाले यो प्रायः क्रान्तिवृत्तभन्दा माथि वा तल हुन्छ; क्रान्तिवृत्त छुने दुई बिन्दु नै ~पात~ (राहु–केतु) हुन्।",
            en: "An eclipse can occur only when the Moon lies on the ecliptic. Its orbit tilts `~5°`, so usually it is above or below; the two points where it touches are the ~nodes~, Rāhu and Ketu.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "संस्कृत नाम *क्रान्तिवृत्त* पनि अर्थपूर्ण छ — “क्रान्ति” को वृत्त, अर्थात् जुन रेखामा हिँड्दा सूर्यको क्रान्ति बदलिन्छ।",
            en: "The Sanskrit *krāntivṛtta* is equally apt — the circle of *krānti* (declination), the line along which the Sun's declination changes.",
          },
        },
      ],
    },
    {
      title: { ne: "सबै ग्रह यसकै नजिक", en: "Every planet stays close to it" },
      eyebrow: "A flat solar system",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सूर्य ठ्याक्कै क्रान्तिवृत्तमा हिँड्छ। चन्द्र र ग्रह **यसको नजिक** रहन्छन् — किनभने सौर्यमण्डल झन्डै समतल छ।",
            en: "The Sun runs exactly along the ecliptic. The Moon and planets stay **close to it**, because the solar system is nearly flat.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "पिण्ड", en: "Body" },
            { ne: "क्रान्तिवृत्तबाट विचलन", en: "Deviation from the ecliptic" },
          ],
          rows: [
            [{ ne: "सूर्य", en: "Sun" }, "0° (परिभाषाबाटै / by definition)"],
            [{ ne: "चन्द्र", en: "Moon" }, "±5.1°"],
            [{ ne: "बुध", en: "Mercury" }, "±7.0°"],
            [{ ne: "शुक्र", en: "Venus" }, "±3.4°"],
            [{ ne: "मंगल", en: "Mars" }, "±1.9°"],
            [{ ne: "बृहस्पति", en: "Jupiter" }, "±1.3°"],
            [{ ne: "शनि", en: "Saturn" }, "±2.5°"],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यसैले क्रान्तिवृत्तको दुवैतिर `~९°` को पट्टीभित्र सबै परम्परागत ग्रह अटाउँछन् — त्यही पट्टी ~राशि पट्टी~ (zodiac belt) हो।",
            en: "A band of `~9°` either side of the ecliptic therefore contains all the traditional grahas — and that band is the ~zodiac belt~.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "यही समतलपनले पञ्चाङ्गलाई सम्भव बनाउँछ। यदि ग्रह जताततै छरिएका हुन्थे भने एउटै रेखीय राशिचक्रले तिनको स्थान वर्णन गर्न सकिँदैनथ्यो।",
            en: "That flatness is what makes a panchanga possible. Were the planets scattered across the sky, no single linear zodiac could describe where they are.",
          },
        },
      ],
    },
  ],
};
