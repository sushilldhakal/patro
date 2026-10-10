import type { ArticleData } from "../../article-schema";

export const retrogradeMotion: ArticleData = {
  slug: "retrograde-motion",
  seeAlso: ["geocentric-heliocentric", "mean-vs-true-motion", "ancient-planetary-motion", "zodiac-belt"],
  sections: [
    {
      title: { ne: "वक्री — ग्रह पछाडि हिँडेको देखिनु", en: "Vakri — when a planet appears to walk backwards" },
      eyebrow: "Apparent, not real",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "ग्रह सामान्यतया राशिचक्रमा पूर्वतिर (अग्रगामी) हिँड्छन्। तर बेला–बेला तिनी रोकिएर **उल्टो दिशामा** हिँडेको देखिन्छ, अनि फेरि सामान्य गतिमा फर्किन्छन्। यसलाई *वक्री गति* भनिन्छ।",
            en: "Planets normally move eastward through the zodiac. Now and then one halts, appears to travel **backwards**, then resumes. This is *retrograde motion*, or vakri.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "महत्त्वपूर्ण कुरा — ग्रह वास्तवमा पछाडि हिँड्दैन। यो पूर्णतः **देखिने प्रभाव** हो, जुन पृथ्वी र त्यो ग्रहको सापेक्ष गतिबाट उत्पन्न हुन्छ।",
            en: "Crucially, the planet does not actually reverse. The effect is entirely **apparent**, arising from the relative motion of Earth and that planet.",
          },
        },
        {
          kind: "diagram",
          id: "two-systems",
          caption: {
            ne: "एउटै गति दुई दृष्टिबाट — सूर्यकेन्द्रित चित्रमा कुनै ग्रह पछाडि हिँड्दैन।",
            en: "One motion from two viewpoints — in the heliocentric picture no planet ever moves backwards.",
          },
        },
      ],
    },
    {
      title: { ne: "उछिन्ने कारले जस्तै", en: "Like overtaking on a road" },
      eyebrow: "The geometry",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "छेउको लेनमा गुडिरहेको ढिलो कारलाई तपाईंले उछिन्दा त्यो केही क्षण **पछाडि जाँदैछ जस्तो** देखिन्छ — पृष्ठभूमिको सापेक्ष। ग्रहमा पनि ठ्याक्कै यही हुन्छ।",
            en: "When you overtake a slower car it seems for a moment to **slide backwards** against the background. Exactly the same thing happens with planets.",
          },
        },
        {
          kind: "diagram",
          id: "retrograde-loop",
        },
        {
          kind: "para",
          text: {
            ne: "भित्री ग्रह (बुध, शुक्र) मा उल्टो हुन्छ — तिनले पृथ्वीलाई उछिन्दा वक्री देखिन्छ। त्यसैले बुध वर्षमा तीन–चार पटक वक्री हुन्छ, शनि झन्डै हरेक वर्ष एक पटक तर लामो अवधिका लागि।",
            en: "For the inner planets — Mercury and Venus — it is the reverse: they retrograde while overtaking Earth. Mercury therefore turns retrograde three or four times a year, Saturn about once a year but for far longer.",
          },
        },
      ],
    },
    {
      title: { ne: "सिद्धान्तले यसलाई कसरी सम्हाल्यो", en: "How the siddhantas handled it" },
      eyebrow: "The shighra correction",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "भूकेन्द्रित ढाँचामा वक्री गति व्याख्या गर्न गाह्रो देखिन्छ — तर सिद्धान्त ग्रन्थहरूले यो **शीघ्र फल**बाट सही रूपमा निकाले।",
            en: "Retrogression looks awkward to explain in a geocentric frame — yet the siddhantas derived it correctly from the **shighra correction**.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "किनभने शीघ्र फल वास्तवमा पृथ्वीको कक्षीय गतिको छाप हो, र वक्री गति पनि त्यही गतिको परिणाम हो। दुई फरक ढाँचा, तर उही ज्यामिति — त्यसैले भविष्यवाणी मिल्थ्यो।",
            en: "Because the shighra term is in effect the imprint of Earth's orbital motion, and retrogression is a consequence of that same motion. Different frames, identical geometry — so the predictions matched.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "ज्योतिषमा वक्री ग्रहलाई विशेष अर्थ दिइन्छ। खगोलीय दृष्टिले भने यो ग्रहको कुनै परिवर्तन होइन — यो **हामी कहाँबाट हेर्दै छौँ** भन्ने कुराको मात्र परिणाम हो।",
            en: "Jyotish reads significance into a retrograde graha. Astronomically nothing about the planet has changed — the appearance is purely a consequence of **where we are watching from**.",
          },
        },
      ],
    },
  ],
};
