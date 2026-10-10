import type { ArticleData } from "../../article-schema";

/** Transcribed from web's hand-written `RituDrift` — see `what-is-panchang.ts` header note. */
export const rituDrift: ArticleData = {
  slug: "ritu-drift",
  seeAlso: ["ayanamsha"],
  sections: [
    {
      title: { ne: "ऋतु सायन, महिना निरयन", en: "Seasons are tropical, months are sidereal" },
      eyebrow: "Seasons are tropical, months are sidereal",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "एउटै सूर्यलाई **दुई फरक शून्य** बाट नापिन्छ। ~ऋतु~ लाई **सायन** ले नाप्छ — शून्य अंश भनेको **वसन्त-विषुव** (सूर्य भूमध्यरेखा काटेर उत्तर लाग्ने क्षण), त्यसैले ऋतु सधैँ विषुव र अयनान्तमा अडिन्छ। तर बि.सं. का *महिना* लाई **निरयन** ले नाप्छ — शून्य भनेको आकाशको साँचो **मेष तारापुञ्ज**, र महिनाको पहिलो गते भनेको **सङ्क्रान्ति** (सूर्य नयाँ राशिमा पस्ने क्षण) हो। यी दुई शून्यबीचको कोण नै **अयनांश** — आज **करिब २४°**।",
            en: "The same Sun is measured from **two different zeros**. The ~ṛtu (season)~ is measured by the **tropical** zodiac — zero degree is the **vernal equinox** (the moment the Sun crosses the equator heading north), so the seasons stay anchored to the equinoxes and solstices. But the BS *months* are measured by the **sidereal** zodiac — zero is the true **Mesha star-cluster**, and the first day of a month is the **sankranti** (the moment the Sun enters a new sign). The angle between these two zeros is the **ayanamsha** — today **about 24°**.",
          },
        },
        { kind: "diagram", id: "equinox-precession" },
      ],
    },
    {
      title: { ne: "किन सर्छ — अयन चलन", en: "Why it drifts — precession" },
      eyebrow: "Why it drifts: precession",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पृथ्वी लट्टु झैँ अक्षमा बिस्तारै *डुल्छ*। एक फेरो पूरा हुन **करिब २५,८०० वर्ष** लाग्छ, अर्थात् विषुव बिन्दु प्रति वर्ष **करिब ५०.३″** — हरेक **७२ वर्ष** मा ठ्याक्क **१°** — पछाडि सर्छ। सूर्य दिनमा **करिब १°** हिँड्ने हुनाले, यो **१° = झन्डै १ दिन**। त्यसैले निरयन महिनाको सापेक्ष ऋतु ~हरेक ७२ वर्षमा १ दिन~ सर्दै जान्छ।",
            en: "The Earth wobbles slowly on its axis like a spinning top. One full loop takes **about 25,800 years**, i.e. the equinox point moves back **about 50.3″** per year — exactly **1°** every **72 years**. Since the Sun moves **about 1°** per day, this **1° ≈ 1 day**. So relative to the sidereal months, the season drifts ~by 1 day every 72 years~.",
          },
        },
        { kind: "diagram", id: "precession-cone" },
      ],
    },
    {
      title: { ne: "दुई बाटो — दुवै सँगै सम्भव छैन", en: "The trade-off — you cannot fix both" },
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
              h: { ne: "महिनालाई राशिमा अडाए (अहिलेको प्रचलन)", en: "Anchor months to signs (current practice)" },
              p: {
                ne: "वैशाख सधैँ मेष सङ्क्रान्तिमै सुरु हुन्छ — कुण्डली, नक्षत्र र ग्रह-राशि **ताराका सापेक्ष स्थिर** रहन्छन्। तर ऋतु निरयनको सापेक्ष ~७२ वर्षमा १ दिन~ (करिब २१६० वर्षमा पूरा १ महिना) सर्छ — धेरै शताब्दीपछि वैशाख वसन्त नभई अर्कै ऋतुमा पर्न सक्छ।",
                en: "Baisakh always starts at Mesha Sankranti — the chart, nakshatra and planet-signs stay **fixed relative to the stars**. But the season drifts ~1 day every 72 years~ (a full month in about 2,160 years) relative to the sidereal zodiac — after many centuries Baisakh may fall in a different season than spring.",
              },
            },
            {
              h: { ne: "महिनालाई ऋतुमा अडाए (सायन सुधार)", en: "Anchor months to seasons (tropical correction)" },
              p: {
                ne: "वैशाख सधैँ वसन्त-विषुवमै बस्छ — ऋतु **कहिल्यै सर्दैन**। तर बदलामा हरेक राशिको पछाडिको **तारापुञ्ज सर्छ** — कुण्डली, ग्रहको राशि, नक्षत्र र जन्म-चार्ट सबै करिब १°/७२ वर्षका दरले फरक पर्न थाल्छन्; आज मेषमा देखिने तारा भोलि अर्कै राशिमा पढिन्छ।",
                en: "Baisakh always stays at the vernal equinox — the season **never drifts**. But in exchange the **star-cluster behind each sign shifts** — the chart, planet signs, nakshatra and birth-chart all begin to differ at about 1° / 72 years; a star in Mesha today would be read in a different sign later.",
              },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "यस पात्रोले के गर्छ", en: "What this patro does" },
      eyebrow: "What this patro does",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "यो पात्रोले **दुवै** देखाउँछ — महिना/गते *निरयन सङ्क्रान्ति* ले (तारा स्थिर), अनि गृहपृष्ठको ~ऋतु पट्टी सायन~ (विषुव–अयनान्त) ले गणना गर्छ, ताकि ऋतु वास्तविक मौसमसँगै रहोस्। त्यसैले बैशाख कहिलेकाहीँ वसन्तसँग ठ्याक्क नमिल्न सक्छ — त्यो भुल होइन, अयन चलनको असर हो।",
            en: "This patro shows **both** — the month/gate is computed by *sidereal sankranti* (stars fixed), while the home-page ~ṛtu strip is tropical~ (equinox–solstice), so the season stays with the real weather. That's why Baisakh may not line up exactly with spring — that's not a bug, it's the effect of precession.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "पश्चिमी ज्योतिष प्रायः **सायन** (ऋतु-केन्द्रित) चलाउँछ, नेपाली–वैदिक ज्योतिष **निरयन** (तारा-केन्द्रित)। अयनांशको गहिराइ *अयनांश* लेखमा छ।",
            en: "Western astrology mostly uses **tropical** (season-centred), Nepali–Vedic astrology uses **sidereal** (star-centred). The depth of ayanamsha is in the *Ayanamsha* article.",
          },
        },
      ],
    },
  ],
};
