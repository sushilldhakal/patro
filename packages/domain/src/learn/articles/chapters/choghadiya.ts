import type { ArticleData } from "../../article-schema";

/**
 * Choghadiya is not one of the five angas. It divides the daytime and the
 * night. The sequence matches `apps/api/engine/panchanga/choghadiya.py`:
 * vaara 0 is Sunday; a day slot steps one name forward, a night slot five.
 */
export const choghadiya: ArticleData = {
  slug: "choghadiya",
  seeAlso: ["what-is-panchang", "vara", "hora", "tithi"],
  sections: [
    {
      title: { ne: "चौघडिया के हो", en: "What choghadiya is" },
      eyebrow: "A division of the day",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "चौघडिया पञ्चाङ्गको छैटौँ अङ्ग होइन। तिथि, वार, नक्षत्र, योग र करण आकाशको कोण हुन्। चौघडिया भनेको *दिन र रातलाई टुक्र्याउने घडी* हो — शुभ काम छान्न सजिलो मुहूर्त।",
            en: "Choghadiya is not a sixth limb of the panchanga. Tithi, vara, nakshatra, yoga and karana are angles on the sky. Choghadiya is a *clock that splits day and night* — a simple muhurta for choosing when to act.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "दिनका ८", en: "8 of the day" },
              p: {
                ne: "सूर्योदयदेखि सूर्यास्तसम्मको उज्यालो **आठ बराबर भाग**।",
                en: "Daylight, from sunrise to sunset, split into **eight equal parts**.",
              },
            },
            {
              h: { ne: "रातका ८", en: "8 of the night" },
              p: {
                ne: "सूर्यास्तदेखि अर्को सूर्योदयसम्मको रात पनि **आठ बराबर भाग**। जम्मा १६ खण्ड।",
                en: "Night, from sunset to the next sunrise, is also **eight equal parts**. Sixteen slots in all.",
              },
            },
            {
              h: { ne: "सात नाम", en: "Seven names" },
              p: {
                ne: "उद्वेग, चर, लाभ, अमृत, काल, शुभ, रोग — यही क्रम दोहोरिन्छ, त्यसैले आठौँ खण्ड फेरि पहिलो नाम हुन्छ।",
                en: "Udvega, Chara, Labha, Amrita, Kala, Shubha, Roga — that order repeats, so the eighth slot is the first name again.",
              },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "यो कसरी बन्छ", en: "How it is formed" },
      eyebrow: "Weekday, then the sequence",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पहिले दिनको उज्यालो र रातको लम्बाइ चाहिन्छ — दुवै सूर्योदय र सूर्यास्तबाट। त्यसपछि वारले *कुन नामबाट सुरु गर्ने* तय गर्छ। दिनमा नाम क्रमैसँग अघि बढ्छन् — उद्वेग, चर, लाभ, अमृत, काल, शुभ, रोग। रातमा भने हरेक खण्डमा पाँच नाम अघि सर्छन् (दुई पछाडि), त्यसैले आइतबार राति शुभ, अमृत, चर, रोग, काल, लाभ, उद्वेग, शुभ पर्छ।",
            en: "First you need the length of daylight and of night — both from sunrise and sunset. The weekday then decides *which name starts*. By day the names advance in order — Udvega, Chara, Labha, Amrita, Kala, Shubha, Roga. By night each slot jumps five names ahead (two back), so Sunday night runs Shubha, Amrita, Chara, Roga, Kala, Labha, Udvega, Shubha.",
          },
        },
        {
          kind: "table",
          caption: {
            ne: "वारले दिन र रातको पहिलो चौघडिया छान्छ",
            en: "The weekday picks the first choghadiya of day and of night",
          },
          headers: [
            { ne: "वार", en: "Vāra" },
            { ne: "दिन सुरु", en: "Day starts" },
            { ne: "रात सुरु", en: "Night starts" },
          ],
          rows: [
            [
              { ne: "आइतबार", en: "Sunday" },
              { ne: "उद्वेग", en: "Udvega" },
              { ne: "शुभ", en: "Shubha" },
            ],
            [
              { ne: "सोमबार", en: "Monday" },
              { ne: "अमृत", en: "Amrita" },
              { ne: "चर", en: "Chara" },
            ],
            [
              { ne: "मङ्गलबार", en: "Tuesday" },
              { ne: "रोग", en: "Roga" },
              { ne: "काल", en: "Kala" },
            ],
            [
              { ne: "बुधबार", en: "Wednesday" },
              { ne: "लाभ", en: "Labha" },
              { ne: "उद्वेग", en: "Udvega" },
            ],
            [
              { ne: "बिहीबार", en: "Thursday" },
              { ne: "शुभ", en: "Shubha" },
              { ne: "अमृत", en: "Amrita" },
            ],
            [
              { ne: "शुक्रबार", en: "Friday" },
              { ne: "चर", en: "Chara" },
              { ne: "रोग", en: "Roga" },
            ],
            [
              { ne: "शनिबार", en: "Saturday" },
              { ne: "काल", en: "Kala" },
              { ne: "लाभ", en: "Labha" },
            ],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "दिनको हरेक खण्ड `दिनमान ÷ ८` लामो हुन्छ, रातको `रात्रिमान ÷ ८`। गर्मीमा दिनका खण्ड लामा र रातका छोटा हुन्छन्; जाडोमा उल्टो। चौघडिया कहिल्यै स्थिर ९० मिनेटको हुँदैन।",
            en: "Each daytime slot is `daylight ÷ 8` long, each night slot `night ÷ 8`. In summer the day slots are long and the night slots short; in winter it reverses. A choghadiya is never a fixed 90 minutes.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "वार सूर्योदयमा बदलिन्छ, त्यसैले चौघडिया पनि त्यही सूर्योदयबाट गनिन्छ — मध्यरातबाट होइन। वारको लेखले त्यो नियम राख्छ।",
            en: "The vāra changes at sunrise, so choghadiya is counted from that same sunrise — not from midnight. The vāra article keeps that rule.",
          },
        },
      ],
    },
    {
      title: { ne: "कुन खण्ड केका लागि", en: "What each slot is for" },
      eyebrow: "Good, mixed, avoid",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "नामले गुण बताउँछ। शुभ काम अमृत, शुभ वा लाभमा थालिन्छ। चर यात्राका लागि हो। उद्वेग, काल र रोगमा नयाँ काम टारिन्छ।",
            en: "The name is the quality. Auspicious work is begun in Amrita, Shubha or Labha. Chara is for travel. Udvega, Kala and Roga are avoided for anything new.",
          },
        },
        {
          kind: "table",
          caption: { ne: "सात चौघडिया", en: "The seven choghadiyas" },
          headers: [
            { ne: "नाम", en: "Name" },
            { ne: "गुण", en: "Quality" },
          ],
          rows: [
            [
              { ne: "अमृत", en: "Amrita" },
              { ne: "उत्तम — अत्यन्त शुभ", en: "Excellent — highly auspicious" },
            ],
            [
              { ne: "शुभ", en: "Shubha" },
              { ne: "शुभ कार्य", en: "Auspicious work" },
            ],
            [
              { ne: "लाभ", en: "Labha" },
              { ne: "व्यापार र आम्दानी", en: "Trade and gain" },
            ],
            [
              { ne: "चर", en: "Chara" },
              { ne: "यात्रा र चलचल", en: "Travel and movement" },
            ],
            [
              { ne: "उद्वेग", en: "Udvega" },
              { ne: "चिन्ता — महत्त्वपूर्ण काम टाढा", en: "Anxiety — keep important work away" },
            ],
            [
              { ne: "काल", en: "Kala" },
              { ne: "अशुभ — नयाँ काम नथाल्ने", en: "Inauspicious — start nothing new" },
            ],
            [
              { ne: "रोग", en: "Roga" },
              { ne: "रोग — महत्त्वपूर्ण काम टाढा", en: "Illness — keep important work away" },
            ],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "[[hora|होरा]] पनि दिन बाँड्छ, तर चौबीस ग्रहीय घण्टामा — र त्यसको पहिलो घण्टाले बारको नाम दिन्छ। चौघडिया होरा होइन: आठ जोडी खण्ड, र नाम वारबाट सुरु हुने एउटा छोटो क्रम।",
            en: "[[hora|Hora]] also divides the day, but into twenty-four planetary hours — and its first hour names the weekday. Choghadiya is not hora: eight pairs of slots, and a short sequence that starts from the weekday.",
          },
        },
      ],
    },
  ],
};
