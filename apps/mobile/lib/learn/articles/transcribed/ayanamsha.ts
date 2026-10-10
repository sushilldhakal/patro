import type { ArticleData } from "../../article-schema";

/** Transcribed from web's hand-written `Ayanamsha` — see `what-is-panchang.ts` header note. */
export const ayanamsha: ArticleData = {
  slug: "ayanamsha",
  sections: [
    {
      title: { ne: "सायन र निरयन — एउटै आकाश, दुई शून्य", en: "Tropical vs sidereal — one sky, two zeros" },
      eyebrow: "Tropical vs sidereal zero",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "राशिचक्रको **शून्य अंश** कहाँबाट सुरु गर्ने? दुई जवाफ छन्। ~सायन (tropical)~ ले **वसन्त-विषुव** — जुन दिन सूर्य भूमध्यरेखा काटेर उत्तर लाग्छ — लाई शून्य मान्छ, त्यसैले यो **ऋतु** मा अडिन्छ। *निरयन (sidereal)* ले साँचो **तारापुञ्ज** (मेष राशिको आरम्भ) लाई शून्य मान्छ। यी दुई शून्यबीचको कोणीय फरक नै **अयनांश** हो।",
            en: "Where do you start the **zero degree** of the zodiac? There are two answers. ~Tropical (sayana)~ takes the **vernal equinox** — the day the Sun crosses the equator heading north — as zero, so it stays anchored to the **seasons**. *Sidereal (nirayana)* takes the actual **star-cluster** (the start of Mesha) as zero. The angular gap between these two zeros is the **ayanamsha**.",
          },
        },
      ],
    },
    {
      title: { ne: "अयनांश चक्र", en: "The ayanamsha wheel" },
      eyebrow: "Interactive: the precessing equinox",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "तलको चक्रमा बाहिरी **१२ राशि तारापुञ्जमा अडिएका** छन् (निरयन)। **▶ चलाउनुहोस्** — वर्ष अघि बढ्दा पृथ्वीको अक्ष-चलनले ~सायन शून्य (विषुव)~ लाई ताराका सापेक्ष पछाडि सार्छ; बढ्दै जाने ~अम्बर खाँडो~ नै अयनांश हो। तल्लो स्लाइडरले एउटै *ग्रह* लाई सार्छ — हेर्नुहोस् कसरी त्यही आकाश-स्थान निरयन र सायनमा फरक राशिमा पढिन्छ।",
            en: "In the wheel below the outer **12 signs are fixed to the star-clusters** (sidereal). Press **▶ play** — as the years advance, Earth's axial precession drags the ~tropical zero (equinox)~ backward relative to the stars; the growing ~amber wedge~ is the ayanamsha. The lower slider moves a single *planet* — see how the same sky position reads as a different sign in sidereal vs tropical.",
          },
        },
        { kind: "diagram", id: "ayanamsha-wheel" },
      ],
    },
    {
      title: { ne: "किन सर्छ — अयन चलन", en: "Why it drifts — precession" },
      eyebrow: "Precession of the equinoxes",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पृथ्वी ठ्याक्क सिधा घुम्दैन — लठ्ठा (lattu) झैँ यसको अक्ष ठूलो वृत्तमा बिस्तारै *डुल्छ*। एक फेरो पूरा गर्न झन्डै **२५,८०० वर्ष** लाग्छ, अर्थात् विषुव बिन्दु प्रति वर्ष करिब **५०.३″** (हरेक **७२ वर्ष** मा १°) पछाडि सर्छ। त्यसैले अयनांश पनि वर्षेनि बढ्छ — आज लाहिरीमा झन्डै **२४°**।",
            en: "The Earth does not spin perfectly upright — like a spinning top its axis slowly *wobbles* in a large circle. One full loop takes about **25,800 years**, i.e. the equinox point moves back about **50.3″** per year (1° every **72 years**). So the ayanamsha grows year by year — today about **24°** in Lahiri.",
          },
        },
        { kind: "diagram", id: "precession-cone" },
      ],
    },
    {
      title: { ne: "तीन प्रमुख प्रणाली", en: "Three main systems" },
      eyebrow: "Lahiri · Raman · KP",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "निरयन शून्य ठ्याक्क कुन ताराबाट गन्ने भन्नेमा मतभेद हुनाले फरक–फरक प्रणाली छन् — मूल फरक केही अंश/कलाको मात्र हो, तर ग्रह राशि-सन्धिमा परेमा त्यही सानो फरकले *राशि नै बदल्न* सक्छ। चक्रमाथिका बटनले प्रणाली बदलेर फरक हेर्नुहोस्।",
            en: "Because there is disagreement over exactly which star to count the sidereal zero from, different systems exist — the core difference is only a few degrees/arc-minutes, but if a planet sits at a sign boundary that small gap can *change the sign* itself. Use the buttons above the wheel to switch systems and see the difference.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "लाहिरी (Lahiri)", en: "Lahiri" },
              p: {
                ne: "भारत सरकारको आधिकारिक (चित्रा-पक्ष) — धेरैजसो पञ्चाङ्गको पूर्वनिर्धारित; आज करिब २४°।",
                en: "India's official system (Chitra-paksha) — the default in most almanacs; about 24° today.",
              },
            },
            {
              h: { ne: "रमन (Raman)", en: "Raman" },
              p: {
                ne: "बी.वी. रमनद्वारा प्रचलित — लाहिरीभन्दा झन्डै १.३° कम।",
                en: "Popularised by B. V. Raman — about 1.3° less than Lahiri.",
              },
            },
            {
              h: { ne: "कृष्णमूर्ति (KP)", en: "Krishnamurti (KP)" },
              p: {
                ne: "के.एस. कृष्णमूर्ति पद्धति — लाहिरीभन्दा अति थोरै (करिब ६′) कम; सूक्ष्म भविष्यवाणीमा।",
                en: "The K. S. Krishnamurti system — a tiny amount (about 6′) less than Lahiri; used in fine prediction.",
              },
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "पश्चिमी ज्योतिष प्रायः **सायन** चलाउँछ, नेपाली–वैदिक ज्योतिष **निरयन**। यस एपको कुण्डली पृष्ठमा तपाईं आफैँ अयनांश प्रणाली रोज्न सक्नुहुन्छ र फरक आफ्नै आँखाले हेर्न सक्नुहुन्छ।",
            en: "Western astrology mostly uses **tropical**, Nepali–Vedic astrology uses **sidereal**. On this app's kundali page you can pick the ayanamsha system yourself and see the difference with your own eyes.",
          },
        },
      ],
    },
  ],
};
