import type { ArticleData } from "../../article-schema";

/** Chapter text — written once, read by the website and the app. */
export const rituDrift: ArticleData = {
  slug: "ritu-drift",
  sections: [
    {
      title: {
        ne: "ऋतु सायन, महिना निरयन",
        en: "Seasons are tropical, months are sidereal",
      },
      eyebrow: "Seasons are tropical, months are sidereal",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "ऋतु सायनमा अडिन्छ, वि.सं. का महिना निरयनमा। दुई शून्य र आजको ∼**२४°** अयनांश [[sidereal-vs-tropical|निरयन र सायन]] र [[ayanamsha|अयनांश]] पाठमा आइसकेका छन्। यहाँको विषय त्यसको परिणाम हो — दुवै सँगै मिलाउन नसकिने।",
            en: "The ṛtus stay tropical and the BS months stay sidereal. The two zeros, and today's ∼**24°** ayanamsha, are covered in [[sidereal-vs-tropical|sidereal and tropical]] and [[ayanamsha|the ayanamsha]]. What follows here is the consequence — you cannot keep both aligned.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "सूर्य दिनको झन्डै १° हिँड्ने हुनाले ऋतु निरयन महिनाको सापेक्ष ~हरेक ∼७१ वर्षमा १ दिन~ सर्छ।",
            en: "The Sun moves about 1° a day, so the season drifts ~by 1 day every ∼71 years~ against the sidereal months.",
          },
        },
      ],
    },
    {
      title: {
        ne: "दुई बाटो — दुवै सँगै सम्भव छैन",
        en: "The trade-off — you cannot fix both",
      },
      eyebrow: "The trade-off: you cannot fix both",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "महिना र ऋतु दुवैलाई सधैँभरि एकनासले मिलाइराख्न **सकिँदैन**, किनकि एउटा ताराको सापेक्ष स्थिर छ भने अर्को विषुवको। कुनै एउटा रोज्नैपर्छ — र अर्को बिस्तारै सर्छ।",
            en: "The months and the seasons **cannot** both be kept aligned forever, because one is fixed relative to a star and the other relative to the equinox. You must choose one — and the other slowly drifts.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: {
                ne: "महिनालाई राशिमा अडाए (अहिलेको प्रचलन)",
                en: "Anchor months to signs (current practice)",
              },
              p: {
                ne: "वैशाख सधैँ मेष सङ्क्रान्तिमै सुरु हुन्छ — कुण्डली, नक्षत्र र ग्रह-राशि **ताराका सापेक्ष स्थिर** रहन्छन्। तर ऋतु निरयनको सापेक्ष ∼**७१ वर्षमा १ दिन** (∼२,१५० वर्षमा पूरा १ महिना) सर्छ — धेरै शताब्दीपछि वैशाख वसन्त नभई अर्कै ऋतुमा पर्न सक्छ।",
                en: "Baisakh always starts at Mesha Sankranti — the chart, nakshatra and planet-signs stay **fixed relative to the stars**. But the season drifts ∼**1 day every 71 years** (a full month in ∼2,150 years) relative to the sidereal zodiac — after many centuries Baisakh may fall in a different season than spring.",
              },
            },
            {
              h: {
                ne: "महिनालाई ऋतुमा अडाए (सायन सुधार)",
                en: "Anchor months to seasons (tropical correction)",
              },
              p: {
                ne: "वैशाख सधैँ वसन्त-विषुवमै बस्छ — ऋतु **कहिल्यै सर्दैन**। तर बदलामा हरेक राशिको पछाडिको **तारापुञ्ज सर्छ** — कुण्डली, ग्रहको राशि, नक्षत्र र जन्म-चार्ट सबै ∼१°/७२ वर्षका दरले फरक पर्न थाल्छन्; आज मेषमा देखिने तारा भोलि अर्कै राशिमा पढिन्छ।",
                en: "Baisakh always stays at the vernal equinox — the season **never drifts**. But in exchange the **star-cluster behind each sign shifts** — the chart, planet signs, nakshatra and birth-chart all begin to differ at ∼1° / 72 years; a star in Mesha today would be read in a different sign later.",
              },
            },
          ],
        },
      ],
    },
    {
      title: {
        ne: "यस पात्रोले के गर्छ",
        en: "What this patro does",
      },
      eyebrow: "What this patro does",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "यो पात्रोले **दुवै** देखाउँछ — महिना/गते *निरयन सङ्क्रान्ति* ले (तारा स्थिर), अनि गृहपृष्ठको ~ऋतु पट्टी सायन~ (विषुव–अयनान्त) ले गणना गर्छ, ताकि ऋतु वास्तविक मौसमसँगै रहोस्। त्यसैले बैशाख कहिलेकाहीँ वसन्तसँग ठ्याक्क नमिल्न सक्छ — त्यो भुल होइन, अयन चलनको असर हो।",
            en: "This patro shows **both** — the month/gate is computed by *sidereal sankranti* (stars fixed), while the home-page ~ṛtu strip is tropical~ (equinox–solstice), so the season stays with the real weather. That's why Baisakh may not line up exactly with spring — that's not a bug, it's the effect of precession.",
          },
        },
      ],
    },
  ],
};
