import type { ArticleData } from "../../article-schema";

export const calcMoonrise: ArticleData = {
  slug: "calc-moonrise",
  seeAlso: ["calc-sunrise", "lunar-longitude", "amavasya-purnima", "moon-lunar-calendar"],
  sections: [
    {
      title: { ne: "चन्द्रोदय — सूर्योदयभन्दा गाह्रो", en: "Moonrise is harder than sunrise" },
      eyebrow: "Three complications",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "गणनाको ढाँचा सूर्यकै हो, तर चन्द्रले तीन थप जटिलता ल्याउँछ।",
            en: "The computation follows the same shape as the Sun's, but the Moon adds three complications.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "छिटो गति", en: "It moves fast" },
              p: {
                ne: "चन्द्र दिनको `१३°` सर्छ — उदयको खोजी गर्दै गर्दा लक्ष्य आफैँ सर्दै हुन्छ।",
                en: "The Moon shifts `13°` a day — the target moves while you are searching for it.",
              },
            },
            {
              h: { ne: "लम्बन", en: "Parallax" },
              p: {
                ne: "चन्द्र नजिक भएकाले पृथ्वीको कुन ठाउँबाट हेर्ने भन्नेले स्थान `~१°` सम्म फरक पार्छ।",
                en: "Being close, where on Earth you stand shifts its apparent place by up to `~1°`.",
              },
            },
            {
              h: { ne: "कक्ष झुकाव", en: "Orbital tilt" },
              p: {
                ne: "चन्द्र क्रान्तिवृत्तबाट `±५°` भड्किन्छ, त्यसैले क्रान्ति सूर्यको भन्दा फराकिलो दायरामा चल्छ।",
                en: "It strays `±5°` from the ecliptic, so its declination ranges wider than the Sun's.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यी तीनैका कारण चन्द्रोदयको समय Swiss Ephemeris को उही `rise_trans_true_hor` ले निकालिन्छ — तर पिण्डका रूपमा चन्द्र दिएर, र engine ले लम्बन र झुकाव भित्रै सम्हाल्छ।",
            en: "For all three reasons moonrise is obtained from the same Swiss Ephemeris `rise_trans_true_hor` call — passing the Moon as the body, with parallax and tilt handled internally.",
          },
        },
      ],
    },
    {
      title: { ne: "कुनै दिन चन्द्रोदय हुँदैन", en: "Some days have no moonrise at all" },
      eyebrow: "A 24h50m day",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "चन्द्र हरेक दिन झन्डै `५०` मिनेट ढिलो उदाउँछ, किनभने यो आफ्नै कक्षमा अघि बढिसकेको हुन्छ। अर्थात् चन्द्रको “दिन” `२४` घण्टा `५०` मिनेटको हुन्छ।",
            en: "The Moon rises about `50` minutes later each day, because it has moved along its own orbit. Its \"day\" is therefore `24` hours `50` minutes long.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "यसको परिणाम रोचक छ — महिनामा एक पटक कुनै नागरिक दिनमा **चन्द्रोदय नै हुँदैन**, र अर्को दिन दुई पटक हुन सक्छ। `२४` घण्टाको सञ्झ्यालमा `२४` घण्टा `५०` मिनेटको चक्र अटाउन खोज्दाको स्वाभाविक परिणाम।",
            en: "The consequence is neat: once a month a civil day has **no moonrise at all**, and another can have two. That is what happens when a `24`-hour `50`-minute cycle is forced into a `24`-hour window.",
          },
        },
        {
          kind: "diagram",
          id: "moonrise-slip",
        },
        {
          kind: "para",
          text: {
            ne: "यसैले engine ले “यो मितिको चन्द्रोदय” भन्ने प्रश्नलाई कहिलेकाहीँ **“सूर्योदयपछिको पहिलो चन्द्रोदय”** मा बदल्छ — पहिलो प्रश्नको उत्तर सधैँ हुँदैन, दोस्रोको सधैँ हुन्छ।",
            en: "So the engine sometimes recasts \"the moonrise on this date\" as **\"the first moonrise after sunrise\"** — the first question does not always have an answer, the second always does.",
          },
        },
      ],
    },
    {
      title: { ne: "पर्वमा चन्द्रोदयको भूमिका", en: "Moonrise in festivals" },
      eyebrow: "When it is the observance",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "कतिपय व्रतमा चन्द्रोदयको ठ्याक्कै समय नै मुख्य कुरा हुन्छ — तिथि होइन।",
            en: "In some observances the exact moment of moonrise is the point of the ritual, not the tithi.",
          },
        },
        {
          kind: "list",
          items: [
            {
              ne: "**तीज** र **करवा चौथ** जस्ता व्रतमा चन्द्र दर्शनपछि मात्र व्रत तोडिन्छ।",
              en: "In fasts such as **Teej** and **Karwa Chauth** the fast is broken only after the Moon is seen.",
            },
            {
              ne: "**पूर्णिमा** मा चन्द्रोदय सूर्यास्तसँगै हुन्छ — यही कारण पूर्णिमाको चन्द्र रातभर आकाशमा रहन्छ।",
              en: "At **Pūrṇimā** moonrise coincides with sunset — which is why the full moon stays up all night.",
            },
            {
              ne: "**औंसी** मा चन्द्र सूर्यसँगै उदाउँछ र अस्ताउँछ — त्यसैले देखिँदैन।",
              en: "At **Amāvasyā** the Moon rises and sets with the Sun — which is why it cannot be seen.",
            },
          ],
        },
        {
          kind: "diagram",
          id: "moon-phases",
        },
      ],
    },
  ],
};
