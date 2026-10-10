import type { ArticleData } from "../../article-schema";

export const fiveLimbsTogether: ArticleData = {
  slug: "five-limbs-together",
  seeAlso: ["what-is-panchang", "vara", "tithi", "nakshatra"],
  sections: [
    {
      title: { ne: "एउटै दिन, पाँच नाप", en: "One day, five measurements" },
      eyebrow: "Reading a panchanga line",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पञ्चाङ्गको एक पङ्क्तिमा पाँच अङ्ग सँगै लेखिन्छन्। प्रत्येकले सूर्य र चन्द्रको फरक सम्बन्ध नाप्छ — त्यसैले पाँचैले मिलेर दिनको पूरा खगोलीय चित्र दिन्छन्।",
            en: "A single panchanga line carries all five limbs. Each measures a different relationship between Sun and Moon, so together they give a complete astronomical picture of the day.",
          },
        },
        {
          kind: "table",
          caption: { ne: "पाँच अङ्ग — के नाप्छन्, कति हुन्छन्", en: "The five limbs — what each measures, how many there are" },
          headers: [
            { ne: "अङ्ग", en: "Limb" },
            { ne: "सूत्र", en: "Formula" },
            { ne: "एकाइ", en: "Unit" },
            { ne: "सङ्ख्या", en: "Count" },
          ],
          rows: [
            [
              { ne: "तिथि", en: "Tithi" },
              { ne: "चन्द्र − सूर्य", en: "Moon − Sun" },
              "12°",
              "30",
            ],
            [
              { ne: "वार", en: "Vāra" },
              { ne: "सूर्योदयदेखि सूर्योदय", en: "Sunrise to sunrise" },
              { ne: "१ दिन", en: "1 day" },
              "7",
            ],
            [
              { ne: "नक्षत्र", en: "Nakshatra" },
              { ne: "चन्द्रको देशान्तर", en: "Moon's longitude" },
              "13°20′",
              "27",
            ],
            [
              { ne: "योग", en: "Yoga" },
              { ne: "सूर्य + चन्द्र", en: "Sun + Moon" },
              "13°20′",
              "27",
            ],
            [
              { ne: "करण", en: "Karana" },
              { ne: "चन्द्र − सूर्य", en: "Moon − Sun" },
              "6°",
              { ne: "११ नाम, ६० खण्ड", en: "11 names, 60 slots" },
            ],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "ध्यान दिनुहोस् — पाँचमध्ये **चार** केवल दुई सङ्ख्याबाट निस्कन्छन्: सूर्यको देशान्तर र चन्द्रको देशान्तर। पाँचौँ (वार) स्थानीय सूर्योदयबाट।",
            en: "Note that **four** of the five come from just two numbers: the Sun's longitude and the Moon's. The fifth, vāra, comes from local sunrise.",
          },
        },
      ],
    },
    {
      title: { ne: "फरक कोणबाट एउटै आकाश", en: "The same sky from different angles" },
      eyebrow: "Difference, sum, position",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "किन एउटै दुई सङ्ख्याबाट चार फरक अङ्ग? किनभने प्रत्येकले ती सङ्ख्यालाई फरक तरिकाले जोड्छ।",
            en: "Why four different limbs from the same two numbers? Because each combines them differently.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "घटाउ — तिथि, करण", en: "Difference — tithi, karana" },
              p: {
                ne: "चन्द्र सूर्यभन्दा कति अगाडि — यसले **चन्द्रको कला** बताउँछ।",
                en: "How far the Moon leads the Sun — this tells you the **Moon's phase**.",
              },
            },
            {
              h: { ne: "जोड — योग", en: "Sum — yoga" },
              p: {
                ne: "दुवैको संयुक्त स्थिति — कला वा स्थान कुनैले नबताउने छुट्टै आवधिकता।",
                en: "Their combined position — a separate periodicity that neither phase nor place captures.",
              },
            },
            {
              h: { ne: "स्थान — नक्षत्र", en: "Position — nakshatra" },
              p: {
                ne: "चन्द्र कुन ताराको अगाडि — सूर्यसँग कुनै सरोकार छैन।",
                en: "Which stars the Moon stands before — nothing to do with the Sun at all.",
              },
            },
            {
              h: { ne: "घुर्णन — वार", en: "Rotation — vāra" },
              p: {
                ne: "पृथ्वी आफैँ कति घुम्यो — एक्लो अङ्ग जुन स्थानमा निर्भर छ।",
                en: "How far Earth itself has turned — the one limb that depends on where you stand.",
              },
            },
          ],
        },
        {
          kind: "diagram",
          id: "tithi-elongation",
          caption: {
            ne: "सूर्य र चन्द्रको कोणीय सम्बन्ध — तिथि, करण र योग सबै यहीँबाट निस्कन्छन्।",
            en: "The angular relationship of Sun and Moon — tithi, karana and yoga all come from here.",
          },
        },
      ],
    },
    {
      title: { ne: "व्यवहारमा सँगै कसरी पढ्ने", en: "How they are read together in practice" },
      eyebrow: "Muhurta",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "मुहूर्त (शुभ समय) छान्दा कुनै एक अङ्ग हेरेर पुग्दैन — संयोजन हेरिन्छ।",
            en: "Choosing a muhurta is never a matter of one limb — it is the combination that is weighed.",
          },
        },
        {
          kind: "list",
          items: [
            {
              ne: "**तिथि** ले सामान्य शुभाशुभ दिन्छ — जस्तै चतुर्थी, अष्टमी र अमावस्या धेरै कामका लागि टारिन्छन्।",
              en: "**Tithi** gives the broad tenor of a day — Caturthī, Aṣṭamī and Amāvasyā are avoided for many undertakings.",
            },
            {
              ne: "**नक्षत्र** ले कामको प्रकार तय गर्छ — यात्रा, विवाह वा गृहप्रवेशका लागि फरक नक्षत्र उपयुक्त हुन्छन्।",
              en: "**Nakshatra** suits the kind of act — travel, marriage and house-entry each favour different ones.",
            },
            {
              ne: "**वार** ले ग्रहको प्रभाव थप्छ — मंगलबार र शनिबार केही कामका लागि टारिन्छन्।",
              en: "**Vāra** adds the graha's colouring — Tuesday and Saturday are avoided for certain acts.",
            },
            {
              ne: "**योग** र **करण** ले सूक्ष्म समायोजन — विष्टि करण (भद्रा) मा शुभ कार्य गरिँदैन।",
              en: "**Yoga** and **karana** provide the fine adjustment — nothing auspicious is begun during Viṣṭi karana (Bhadrā).",
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "पाँचै अङ्ग एउटै क्षणका फरक नाप हुन्, र प्रत्येक आफ्नै गतिमा बदलिन्छ। त्यसैले पञ्चाङ्गमा दिनको एउटा सङ्ख्या होइन — **पाँच समानान्तर घडी** चलिरहेका हुन्छन्।",
            en: "All five are different readings of the same instant, and each turns at its own rate. A panchanga day is therefore not one number but **five parallel clocks** running at once.",
          },
        },
      ],
    },
  ],
};
