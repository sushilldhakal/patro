import type { ArticleData } from "../../article-schema";

export const whySeasons: ArticleData = {
  slug: "why-seasons",
  seeAlso: ["axial-tilt", "equinox-solstice", "uttarayana-dakshinayana", "ritu-drift"],
  sections: [
    {
      title: { ne: "दूरीले होइन, झुकावले", en: "Tilt, not distance" },
      eyebrow: "The commonest misconception",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "धेरैले सोच्छन् — गर्मीमा पृथ्वी सूर्यको नजिक हुन्छ, जाडोमा टाढा। यो **गलत** हो।",
            en: "Many assume Earth is nearer the Sun in summer and farther in winter. That is **wrong**.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "वास्तवमा पृथ्वी **पुषमा** सूर्यको सबैभन्दा नजिक (उपसौर) र **असारमा** सबैभन्दा टाढा (अपसौर) हुन्छ — अर्थात् उत्तरी गोलार्धको जाडोमा नजिक। दूरीले ऋतु बनाएको भए ठीक उल्टो हुनुपर्थ्यो।",
            en: "In fact Earth is closest to the Sun in **January** and farthest in **July** — that is, closest during the northern winter. If distance made the seasons, it would be the other way round.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "147.1",
              unit: { ne: "मि. किमी", en: "M km" },
              label: { ne: "उपसौर · पुष", en: "Perihelion · January" },
              desc: { ne: "सबैभन्दा नजिक — तर उत्तरी गोलार्धमा जाडो।", en: "Nearest — yet it is winter in the north." },
            },
            {
              big: "152.1",
              unit: { ne: "मि. किमी", en: "M km" },
              label: { ne: "अपसौर · असार", en: "Aphelion · July" },
              desc: { ne: "सबैभन्दा टाढा — तर उत्तरी गोलार्धमा गर्मी।", en: "Farthest — yet it is summer in the north." },
            },
            {
              big: "~3%",
              label: { ne: "दूरीको फरक", en: "Variation in distance" },
              desc: { ne: "ऋतु बनाउन यति सानो फरक पर्याप्त छैन।", en: "Far too small a difference to produce the seasons." },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "साँचो कारण — किरणको कोण", en: "The real cause — the angle of the light" },
      eyebrow: "Concentration of sunlight",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पृथ्वीको `२३.४४°` झुकावले वर्षभरि सूर्यको किरण पर्ने **कोण** बदल्छ। यही कोणले ऋतु बनाउँछ, दुई तरिकाले।",
            en: "Earth's `23.44°` tilt changes the **angle** at which sunlight strikes through the year. That angle makes the seasons, in two ways.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "किरणको सघनता", en: "Concentration" },
              p: {
                ne: "ठाडो किरण सानो क्षेत्रमा केन्द्रित हुन्छ — बढी ताप। छड्के किरण फराकिलो क्षेत्रमा फिँजिन्छ — कम ताप।",
                en: "Steep light concentrates on a small area — more heat. Slanting light spreads over a wide one — less heat.",
              },
            },
            {
              h: { ne: "दिनको लम्बाइ", en: "Length of day" },
              p: {
                ne: "गर्मीमा सूर्य लामो समय आकाशमा रहन्छ — ताप जम्मा हुने समय बढी।",
                en: "In summer the Sun stays up longer — more hours in which heat can accumulate.",
              },
            },
          ],
        },
        {
          kind: "diagram",
          id: "sun-ray-angle",
        },
        {
          kind: "para",
          text: {
            ne: "यसैले उत्तरी र दक्षिणी गोलार्धमा ऋतु **उल्टो** हुन्छन् — नेपालमा गर्मी हुँदा अस्ट्रेलियामा जाडो। दूरी दुवैका लागि उही छ; झुकाव फरक दिशामा काम गर्छ।",
            en: "It is also why the hemispheres have **opposite** seasons — summer in Nepal is winter in Australia. The distance is the same for both; the tilt works in opposite directions.",
          },
        },
      ],
    },
    {
      title: { ne: "छ ऋतु — वैदिक विभाजन", en: "Six ṛtus — the Vedic division" },
      eyebrow: "Two months each",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पश्चिमी परम्पराले वर्षलाई चार ऋतुमा बाँड्छ; वैदिक परम्पराले **छ** मा — प्रत्येक दुई महिनाको।",
            en: "The Western tradition divides the year into four seasons; the Vedic tradition into **six**, of two months each.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "ऋतु", en: "Ṛtu" },
            { ne: "महिना", en: "Months" },
            { ne: "अङ्ग्रेजी नाम", en: "English" },
          ],
          rows: [
            [{ ne: "वसन्त", en: "Vasanta" }, { ne: "चैत–बैशाख", en: "Chaitra–Baisakh" }, { ne: "वसन्त ऋतु", en: "Spring" }],
            [{ ne: "ग्रीष्म", en: "Grīṣma" }, { ne: "जेठ–असार", en: "Jestha–Asar" }, { ne: "ग्रीष्म ऋतु", en: "Summer" }],
            [{ ne: "वर्षा", en: "Varṣā" }, { ne: "साउन–भदौ", en: "Shrawan–Bhadra" }, { ne: "मनसुन", en: "Monsoon" }],
            [{ ne: "शरद्", en: "Śarad" }, { ne: "असोज–कात्तिक", en: "Ashwin–Kartik" }, { ne: "शरद् ऋतु", en: "Autumn" }],
            [{ ne: "हेमन्त", en: "Hemanta" }, { ne: "मंसिर–पुष", en: "Mangsir–Poush" }, { ne: "हेमन्त ऋतु", en: "Pre-winter" }],
            [{ ne: "शिशिर", en: "Śiśira" }, { ne: "माघ–फागुन", en: "Magh–Falgun" }, { ne: "शिशिर ऋतु", en: "Winter" }],
          ],
        },
        {
          kind: "diagram",
          id: "ritu-wheel",
        },
        {
          kind: "para",
          text: {
            ne: "तर ध्यान दिनुहोस् — ऋतुको **नाम** महिनाले दिन्छ, ऋतु **बनाउने** कुरा भने सूर्यको उत्तर–दक्षिण यात्रा हो। महिना निरयन ढाँचामा (राशि सीमा) चल्छन्, ऋतु सायन ढाँचामा (विषुव–अयनान्त) — र अयन चलनले दुईलाई हरेक `७२` वर्षमा `१°` का दरले छुट्याउँदै लैजान्छ।",
            en: "Note, though, that the months give a ṛtu its **name** while what **makes** a ṛtu is the Sun's north–south journey. The months run on the sidereal frame (sign boundaries), the ṛtus on the tropical one (equinox–solstice) — and precession parts the two by `1°` every `72` years.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "त्यसैले ऋतुको कुरा गर्दा भरपर्दो सन्दर्भ महिना होइन, ~उत्तरायण र दक्षिणायन~ हो — ती सूर्यको क्रान्तिले नै परिभाषित हुन्छन्, र ऋतुसँग कहिल्यै छुट्टिँदैनन्।",
            en: "So the dependable reference for a ṛtu is not the month but ~Uttarāyaṇa and Dakṣiṇāyana~ — those are defined by the Sun's declination itself, and never part company with the seasons.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "छ ऋतुको यो विभाजन दक्षिण एसियाको मौसमसँग राम्रोसँग मिल्छ — विशेष गरी **वर्षा** लाई छुट्टै ऋतु मान्नु, जुन चार–ऋतु ढाँचामा हराउँछ।",
            en: "This sixfold scheme fits South Asian weather well — above all in treating the **monsoon** as a season in its own right, which the fourfold scheme loses.",
          },
        },
      ],
    },
  ],
};
