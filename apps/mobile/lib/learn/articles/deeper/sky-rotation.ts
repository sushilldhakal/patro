import type { ArticleData } from "../../article-schema";

export const skyRotation: ArticleData = {
  slug: "sky-rotation",
  seeAlso: ["earth-rotation-day", "pole-star-changes", "celestial-sphere", "sidereal-time"],
  sections: [
    {
      title: { ne: "आकाश घुमेको देखिनु", en: "The sky appears to turn" },
      eyebrow: "15° an hour",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "रातभर आकाश हेर्दा सबै तारा पूर्वबाट पश्चिमतिर सर्दै गरेको देखिन्छ — प्रति घण्टा `१५°` का दरले। वास्तवमा घुम्ने पृथ्वी हो, तर देखिने प्रभाव उही हो।",
            en: "Watch the sky through a night and every star drifts east to west at `15°` an hour. It is Earth that turns, but the appearance is the same.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "सबै तारा **आकाशीय ध्रुव**को वरिपरि वृत्तमा घुमेको देखिन्छ। ध्रुव नजिकका तारा सानो वृत्त बनाउँछन्; टाढाका ठूलो।",
            en: "All of them circle the **celestial pole**. Stars near it trace small circles; those far from it, large ones.",
          },
        },
        {
          kind: "diagram",
          id: "earth-rotation",
        },
      ],
    },
    {
      title: { ne: "अक्षांशले दृश्य बदल्छ", en: "Latitude changes the view" },
      eyebrow: "Pole altitude = your latitude",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "एउटा सुन्दर नियम — **आकाशीय ध्रुवको उचाइ ठ्याक्कै तपाईंको अक्षांश बराबर हुन्छ**। काठमाडौँ (`२७.७°` उत्तर) मा ध्रुव तारा क्षितिजभन्दा `२७.७°` माथि देखिन्छ।",
            en: "There is a neat rule — **the altitude of the celestial pole equals your latitude**. From Kathmandu at `27.7°` N, Polaris stands `27.7°` above the horizon.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "स्थान", en: "Place" },
            { ne: "अक्षांश", en: "Latitude" },
            { ne: "आकाश कस्तो देखिन्छ", en: "How the sky behaves" },
          ],
          rows: [
            [
              { ne: "उत्तरी ध्रुव", en: "North Pole" },
              "90°N",
              { ne: "तारा क्षितिजसमानान्तर घुम्छन् — कुनै उदाउँदैन, अस्ताउँदैन।", en: "Stars circle parallel to the horizon — nothing rises or sets." },
            ],
            [
              { ne: "काठमाडौँ", en: "Kathmandu" },
              "27.7°N",
              { ne: "तारा छड्के उदाउँछन्; उत्तरका केही कहिल्यै अस्ताउँदैनन्।", en: "Stars rise at a slant; some northern ones never set." },
            ],
            [
              { ne: "विषुवत् रेखा", en: "Equator" },
              "0°",
              { ne: "तारा ठाडो उदाउँछन्; पूरै आकाश वर्षभरि देखिन्छ।", en: "Stars rise vertically; the whole sky is visible over a year." },
            ],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यसैले नाविकहरूले ध्रुव ताराको उचाइ नापेर आफ्नो अक्षांश पत्ता लगाउँथे — शताब्दीयौँसम्म यो नै सबैभन्दा भरपर्दो विधि थियो।",
            en: "This is how navigators found their latitude — by measuring the pole star's altitude, the most reliable method available for centuries.",
          },
        },
      ],
    },
    {
      title: { ne: "परिध्रुवीय तारा", en: "Circumpolar stars" },
      eyebrow: "The ones that never set",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "ध्रुव नजिकका केही तारा कहिल्यै अस्ताउँदैनन् — तिनको वृत्त पूरै क्षितिजभन्दा माथि पर्छ। यिनलाई *परिध्रुवीय* तारा भनिन्छ।",
            en: "Some stars near the pole never set — their whole circle lies above the horizon. These are the *circumpolar* stars.",
          },
        },
        {
          kind: "diagram",
          id: "circumpolar-sky",
        },
        {
          kind: "para",
          text: {
            ne: "यही कारण **सप्तर्षि** नेपालबाट वर्षभरि देखिन्छ भने **क्रक्स** कहिल्यै देखिँदैन। वैदिक परम्परामा सप्तर्षिको केन्द्रीय स्थान हुनुको कारण पनि यही हो।",
            en: "Which is why the **Saptarishi** — the Big Dipper — is visible from Nepal all year while the **Southern Cross** never is. It also explains the central place the Saptarishi holds in Vedic tradition.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "अयन चलनका कारण कुन तारा परिध्रुवीय हुन्छन् भन्ने पनि सहस्राब्दीमा बदलिन्छ — प्राचीन ग्रन्थमा उल्लेख भएका तारा आजको आकाशमा फरक स्थानमा हुन सक्छन्।",
            en: "Precession slowly changes which stars are circumpolar too, so a star named in an ancient text may sit differently in today's sky.",
          },
        },
      ],
    },
  ],
};
