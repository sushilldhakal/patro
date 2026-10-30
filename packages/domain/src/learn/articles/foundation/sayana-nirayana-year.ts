import type { ArticleData } from "../../article-schema";

/*
 * Figures: mean tropical year 365.242190 d, sidereal year 365.256363 d (the
 * value the BS engine extrapolates sankrantis with, engine/calendar/
 * bikram_sambat.py), Surya Siddhanta year 365.258756 d. Baisakh 1 dates are
 * from the official BS table (engine/calendar/constants.py). Lahiri ayanamsha
 * ≈ 24.2° in 2026, zero ≈ 285 CE. Sidereal day 86,164.09 s; Sun's mean motion
 * 0.9856°/d, 1.019° at perihelion and 0.953° at aphelion.
 */
export const sayanaNirayanaYear: ArticleData = {
  slug: "sayana-nirayana-year",
  seeAlso: ["sidereal-vs-tropical", "year-begins-baisakh", "bs-ad-offset", "ritu-drift"],
  sections: [
    {
      title: { ne: "छोटकरीमा — यो विषय के हो?", en: "In brief — what this topic is about" },
      eyebrow: "Overview",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सूर्य घुमेर उही ठाउँमा फर्किन लाग्ने समय नै एक वर्ष हो। तर “उही ठाउँ” दुई तरिकाले नाप्न सकिन्छ — **ऋतु**ले (वसन्त विषुव) वा **तारा**ले (मेष राशिको सुरु)। ऋतुले नापेको वर्ष *सायन*, ताराले नापेको *निरयन*। दुईबीच वर्षमा जम्मा `२०` मिनेटको फरक हुन्छ, तर १,७०० वर्षमा त्यो जम्मा भएर ~२४ दिन~ पुगिसकेको छ।",
            en: "A year is the time the Sun takes to come back to the same place. But \"the same place\" can be measured two ways — by the **seasons** (the vernal equinox) or by the **stars** (the start of Mesha). The year measured by the seasons is *sāyana* (tropical); the one measured by the stars is *nirayana* (sidereal). They differ by only `20` minutes a year, but over 1,700 years that has added up to ~24 days~.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "सायन = ऋतुको घडी", en: "Sāyana = the clock of the seasons" },
              p: {
                ne: "मौसम कहिल्यै नसर्ने गरी बनेको वर्ष। ई.सं. (अङ्ग्रेजी) क्यालेन्डर र पश्चिमी राशिफल यसैमा चल्छन्। त्यसैले २१ मार्च सधैँ वसन्तको सुरु हुन्छ।",
                en: "A year built so the seasons never move. The AD (Gregorian) calendar and Western sun signs run on it — which is why 21 March always opens spring.",
              },
            },
            {
              h: { ne: "निरयन = ताराको घडी", en: "Nirayana = the clock of the stars" },
              p: {
                ne: "तारा र नक्षत्र कहिल्यै नसर्ने गरी बनेको वर्ष। विक्रम सम्वत्, सङ्क्रान्ति, वैदिक ज्योतिष र पञ्चाङ्ग यसैमा चल्छन्। त्यसैले बैशाखभर सूर्य सधैँ मेष राशिमै हुन्छ।",
                en: "A year built so the stars and nakshatras never move. Bikram Sambat, the sankrantis, Vedic jyotish and the panchanga run on it — which is why the Sun is in Mesha all through Baisakh.",
              },
            },
          ],
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "✓ सायनको राम्रो पक्ष", en: "✓ Sāyana — pros" },
              p: {
                ne: "महिना र ऋतु सधैँ मेल खान्छन्। खेती, मौसम र ई.सं. मितिसँग जोड्न सजिलो — बैशाख सधैँ वसन्तमै पर्थ्यो।",
                en: "Months always match the seasons. Easy to tie to farming, weather and AD dates — Baisakh would always open spring.",
              },
            },
            {
              h: { ne: "✓ निरयनको राम्रो पक्ष", en: "✓ Nirayana — pros" },
              p: {
                ne: "राशि, नक्षत्र र ग्रहको स्थिति आकाशमा देखिने तारासँग मेल खान्छ। ज्योतिष, मुहूर्त र चन्द्र महिनाको नाम सबै एउटै आधारमा रहन्छन्।",
                en: "Rashi, nakshatra and planet positions match the stars you can see. Jyotish, muhurta and the lunar month names all stand on one footing.",
              },
            },
          ],
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "✗ सायनको कमजोर पक्ष", en: "✗ Sāyana — cons" },
              p: {
                ne: "राशि ताराबाट टाढिँदै जान्छ — “मेष” लेखिएको ठाउँमा आज धेरैजसो मीनका तारा छन्, र नक्षत्रसँग मेल रहँदैन।",
                en: "The signs drift off the stars — where \"Aries\" is written, mostly Meena's stars stand today, and the nakshatras no longer fit.",
              },
            },
            {
              h: { ne: "✗ निरयनको कमजोर पक्ष", en: "✗ Nirayana — cons" },
              p: {
                ne: "महिना ऋतुबाट बिस्तारै छुट्छन् — करिब ७१ वर्षमा १ दिन। माघे सङ्क्रान्ति वास्तविक उत्तरायणभन्दा करिब २४ दिन पछि पर्छ।",
                en: "Months slowly slip off the seasons — 1 day in about 71 years. Maghe Sankranti now falls about 24 days after the real turn north.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "**तपाईंमा असर:** तपाईंको जन्म राशि, बैशाख १ (१३–१५ अप्रिल) र चाडपर्वका मिति निरयनबाट आउँछन्। पत्रिकाको पश्चिमी राशिफल सायनमा चल्छ — त्यसैले धेरैजसो मानिसको पश्चिमी राशि वैदिक राशिभन्दा एक राशि पछिको हुन्छ (जस्तै वैदिक मेष → पश्चिमी वृष)।",
            en: "**What it means for you:** your birth rashi, Baisakh 1 (13–15 April) and festival dates come from nirayana. Newspaper Western horoscopes run on sāyana — which is why most people's Western sign is one sign later than their Vedic rashi (Vedic Mesha → Western Taurus, for example).",
          },
        },
        {
          kind: "list",
          ordered: true,
          items: [
            { ne: "**दुई वर्षको परिभाषा** र लम्बाइ — किन मिनेटको फरक मात्र।", en: "**The two years** defined, and their lengths — why the gap is only minutes." },
            { ne: "**फरक किन** — पृथ्वीको अक्ष डगमगाउँदा विषुव बिन्दु सर्छ (अयन चलन)।", en: "**Why they differ** — Earth's wobbling axis moves the equinox (precession)." },
            { ne: "**वि.सं.ले कुन मान्छ** — र बैशाख १ ई.सं.मा किन सर्दै जान्छ।", en: "**Which one BS keeps** — and why Baisakh 1 creeps later in AD." },
            { ne: "**१,७०० वर्षको फरक** — अयनांश, र माघे सङ्क्रान्ति उत्तरायणबाट किन टाढा।", en: "**The 1,700-year gap** — the ayanamsha, and why Maghe Sankranti left the solstice." },
            { ne: "**वि.सं. सायन भए** बैशाख, चाडपर्व र राशिमा के बदलिन्थ्यो।", en: "**If BS were tropical** — what would change for Baisakh, festivals and your rashi." },
            { ne: "**निरयनको बलियो पक्ष** — सूर्य, चन्द्र र ग्रह एउटै ताराको नक्सामा।", en: "**The strength of nirayana** — Sun, Moon and planets on one star map." },
            { ne: "**महिना २९–३२ दिनका किन** — र शताब्दीपछि बैशाख कहाँ पुग्छ।", en: "**Why months run 29–32 days** — and where Baisakh will be centuries from now." },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "एक वाक्यमा सम्झनुहोस्: **सायन = ऋतु, निरयन = तारा।** कुनै गलत होइन — प्रश्न केवल “के स्थिर राख्ने?” भन्ने हो। नेपाली पात्रोले तारा स्थिर राखेको छ।",
            en: "Remember it in one line: **sāyana = seasons, nirayana = stars.** Neither is wrong — the only question is \"what do we hold fixed?\" The Nepali patro holds the stars fixed.",
          },
        },
      ],
    },
    {
      title: { ne: "एउटै परिक्रमा, दुई किसिमको वर्ष", en: "One orbit, two kinds of year" },
      eyebrow: "Sāyana · Nirayana",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "“सूर्य वरिपरि पृथ्वीको एक फेरो” — वर्षको यो परिभाषा अधुरो छ। फेरो पूरा भयो भनेर **कुन बिन्दुमा फर्केपछि** भन्ने? त्यही बिन्दुको छनोटले दुई फरक वर्ष बनाउँछ: *सायन वर्ष* र *निरयन वर्ष*।",
            en: "\"One trip of the Earth around the Sun\" is only half a definition. Complete **back at which point**? The choice of that point gives two different years: the *tropical (sāyana) year* and the *sidereal (nirayana) year*.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "सायन वर्ष (Tropical)", en: "Tropical year (sāyana)" },
              p: {
                ne: "सूर्य एक **वसन्त विषुव**बाट अर्को वसन्त विषुवसम्म। “सायन” = अयनसहित — विषुव बिन्दु सर्दै जाने कुरा गणनामा समेटिएको। यो **ऋतुको वर्ष** हो।",
                en: "The Sun from one **vernal equinox** to the next. \"Sāyana\" = with the ayana — the moving equinox point is built in. It is the **year of the seasons**.",
              },
            },
            {
              h: { ne: "निरयन वर्ष (Sidereal)", en: "Sidereal year (nirayana)" },
              p: {
                ne: "सूर्य **ताराको एउटै बिन्दु**बाट फेरि त्यही बिन्दुसम्म — जस्तै निरयन मेषको आरम्भ (अश्विनीको सुरु)। “निरयन” = अयनरहित। यो **ताराको वर्ष** हो।",
                en: "The Sun from **one point among the stars** back to the same point — such as the start of sidereal Mesha (the start of Ashvini). \"Nirayana\" = without the ayana. It is the **year of the stars**.",
              },
            },
          ],
        },
        {
          kind: "formula",
          cards: [
            {
              big: "365.2422",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "सायन वर्ष", en: "Tropical year" },
              desc: { ne: "३६५ दिन ५ घण्टा ४८ मिनेट ४५ सेकेन्ड। ग्रेगोरियन (ई.सं.) पात्रो यसैमा मिलाइएको छ।", en: "365 d 5 h 48 min 45 s. The Gregorian (AD) calendar is built to follow it." },
            },
            {
              big: "365.2564",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "निरयन वर्ष", en: "Sidereal year" },
              desc: { ne: "३६५ दिन ६ घण्टा ९ मिनेट १० सेकेन्ड। आधुनिक मापन; विक्रम सम्वत्का सङ्क्रान्ति यसैमा चल्छन्।", en: "365 d 6 h 9 min 10 s. The modern measurement; Bikram Sambat's sankrantis keep to it." },
            },
            {
              big: "365.2588",
              unit: { ne: "दिन", en: "days" },
              label: { ne: "सूर्य सिद्धान्तको वर्ष", en: "Surya Siddhanta year" },
              desc: { ne: "३६५ दिन ६ घण्टा १२ मिनेट ३६ सेकेन्ड। परम्परागत सिद्धान्त गणितको निरयन वर्ष।", en: "365 d 6 h 12 min 36 s. The sidereal year of traditional siddhantic reckoning." },
            },
          ],
        },
        {
          kind: "diagram",
          id: "year-length-ladder",
          caption: {
            ne: "वर्षका विभिन्न लम्बाइ एउटै भर्याङमा — फरक मिनेटको हो, तर हरेक वर्ष थपिँदै जान्छ।",
            en: "The year lengths on one ladder — the gaps are minutes, but they add up every year.",
          },
        },
      ],
    },
    {
      title: { ne: "फरक किन? — विषुव बिन्दु सर्छ", en: "Why they differ — the equinox moves" },
      eyebrow: "Precession",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "तारा आफ्नै ठाउँमा छन्, तर वसन्त विषुव बिन्दु स्थिर छैन। पृथ्वीको अक्ष लट्टुझैँ बिस्तारै घुम्छ (~अयन चलन~, एक फेरो ≈ `२६,०००` वर्ष), र विषुव बिन्दु हरेक वर्ष तारापुञ्जको सापेक्ष करिब `५०″` पछाडि सर्छ।",
            en: "The stars stay put, but the vernal equinox does not. Earth's axis wobbles slowly like a top (~precession~, one turn ≈ `26,000` years), and the equinox point slides about `50″` a year backwards against the constellations.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "विषुव बिन्दु सूर्यलाई **भेट्न अगाडि आउँछ**, त्यसैले सूर्य विषुवमा अलि चाँडै पुग्छ — ताराको बिन्दुसम्म पुग्न भने पूरै फेरो लगाउनुपर्छ। त्यही `५०″` पार गर्न सूर्यलाई करिब `२०` मिनेट लाग्छ, र सायन वर्ष निरयन वर्षभन्दा त्यति नै छोटो हुन्छ।",
            en: "The equinox point **comes forward to meet the Sun**, so the Sun reaches the equinox a little early — while to reach the star point it must go the whole way round. Covering those `50″` takes the Sun about `20` minutes, and the tropical year is that much shorter than the sidereal.",
          },
        },
        {
          kind: "cases",
          items: [
            {
              kind: "calc",
              caption: { ne: "आधुनिक निरयन र सायन", en: "Modern sidereal vs tropical" },
              rule: [
                { ne: "फरक = निरयन वर्ष − सायन वर्ष", en: "Gap = sidereal year − tropical year" },
                { ne: "एक दिन जम्मा हुन = १ ÷ फरक", en: "Years to build one day = 1 ÷ gap" },
              ],
              example: [
                { k: { ne: "निरयन − सायन", en: "Sidereal − tropical" }, v: "365.256363 − 365.242190" },
                { k: { ne: "फरक", en: "Gap" }, v: "0.014173 d ≈ 20 min 25 s" },
                { k: { ne: "१ ÷ ०.०१४१७३", en: "1 ÷ 0.014173" }, v: "≈ 71" },
              ],
              result: { ne: "हरेक **~७१ वर्ष**मा निरयन मिति ऋतुभन्दा **१ दिन** पछि पर्छ।", en: "Every **~71 years** a sidereal date falls **1 day** later against the seasons." },
            },
            {
              kind: "calc",
              caption: { ne: "सूर्य सिद्धान्त र सायन", en: "Surya Siddhanta vs tropical" },
              rule: [
                { ne: "फरक = सिद्धान्त वर्ष − सायन वर्ष", en: "Gap = Siddhanta year − tropical year" },
              ],
              example: [
                { k: { ne: "सिद्धान्त − सायन", en: "Siddhanta − tropical" }, v: "365.258756 − 365.242190" },
                { k: { ne: "फरक", en: "Gap" }, v: "0.016566 d ≈ 23 min 51 s" },
                { k: { ne: "१ ÷ ०.०१६५६६", en: "1 ÷ 0.016566" }, v: "≈ 60" },
              ],
              result: { ne: "सिद्धान्त गणितमा यो सर्ने दर **~६० वर्षमा १ दिन** हुन्छ — आधुनिक निरयनभन्दा पनि करिब ३½ मिनेट लामो वर्ष।", en: "In siddhantic reckoning the slip is **~1 day in 60 years** — a year about 3½ minutes longer even than the modern sidereal one." },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "विक्रम सम्वत्ले कुन वर्ष मान्छ?", en: "Which year does Bikram Sambat follow?" },
      eyebrow: "Nirayana",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "विक्रम सम्वत् **निरयन सौर पात्रो** हो। हरेक महिना सूर्य निरयन राशिमा पस्ने क्षण (*सङ्क्रान्ति*) बाट सुरु हुन्छ, र वर्ष निरयन मेषमा पस्ने क्षण (~मेष सङ्क्रान्ति~) बाट। अनि ई.सं. *सायन* पात्रो हो। त्यसैले दुई पात्रोबीचको सम्बन्ध हरेक वर्ष अलिकति सर्छ।",
            en: "Bikram Sambat is a **sidereal solar calendar**. Every month begins when the Sun enters a sidereal rashi (a *sankranti*), and the year when it enters sidereal Mesha (~Mesha Sankranti~). AD is a *tropical* calendar. So the relation between the two slides a little every year.",
          },
        },
        {
          kind: "table",
          caption: {
            ne: "आधिकारिक वि.सं. तालिकाअनुसार बैशाख १ गते — दशकमा प्रायः पर्ने मिति",
            en: "Baisakh 1 by the official BS table — the usual date in each decade",
          },
          headers: [
            { ne: "ई.सं. दशक", en: "AD decade" },
            { ne: "बैशाख १ प्रायः", en: "Baisakh 1 usually" },
            { ne: "टिप्पणी", en: "Note" },
          ],
          rows: [
            ["1950s–60s", { ne: "१३ अप्रिल", en: "13 April" }, { ne: "१० मा ७–८ वर्ष", en: "7–8 years in 10" }],
            ["1970s–90s", { ne: "१३ वा १४ अप्रिल", en: "13 or 14 April" }, { ne: "झन्डै आधा–आधा", en: "About half and half" }],
            ["2000s–20s", { ne: "१४ अप्रिल", en: "14 April" }, { ne: "१० मा ७–८ वर्ष", en: "7–8 years in 10" }],
            ["2030s", { ne: "१५ अप्रिल", en: "15 April" }, { ne: "१४ र १६ पनि", en: "Some 14 and 16" }],
          ],
          highlightRow: 2,
        },
        {
          kind: "para",
          text: {
            ne: "ई.सं.को लीप वर्षले गर्दा मिति वर्षैपिच्छे १३–१५ बीच उफ्रिन्छ, तर **औसत** एकातिर मात्र सर्छ: करिब ७० वर्षमा एक दिन पछि। माथिको हिसाबले भनेको ठ्याक्कै यही हो — निरयन वर्ष ई.सं.को सायन वर्षभन्दा हरेक वर्ष ~२० मिनेट लामो। वि.सं. र ई.सं.बीच स्थिर फरक किन छैन भन्ने एउटा कारण यही हो ([[bs-ad-offset|स्थिर फरक किन हुँदैन]])।",
            en: "AD leap years make the date hop between 13 and 15 from year to year, but the **average** only moves one way: about one day later in 70 years. That is exactly what the arithmetic above says — the sidereal year is ~20 minutes longer than AD's tropical one, every year. It is one reason BS and AD have no fixed offset ([[bs-ad-offset|why there is no fixed offset]]).",
          },
        },
        {
          kind: "note",
          text: {
            ne: "परम्परागत पात्रो सूर्य सिद्धान्तको वर्ष (३६५.२५८८ दिन) ले, र आधुनिक *दृक्* पात्रो (यो एपसहित, लाहिरी अयनांशमा) मापन गरिएको निरयन वर्षले चल्छन्। दुवै निरयन हुन् — फरक सङ्क्रान्तिको समयमा केही घण्टाको मात्र पर्छ, ऋतुसँगको सम्बन्धमा होइन।",
            en: "Traditional patros run on the Surya Siddhanta year (365.2588 days) and modern *drik* patros (this app among them, with the Lahiri ayanamsha) on the measured sidereal year. Both are sidereal — they differ by a few hours in a sankranti's time, not in their relation to the seasons.",
          },
        },
      ],
    },
    {
      title: { ne: "१,७०० वर्षमा जम्मा भएको फरक", en: "The gap 1,700 years have built" },
      eyebrow: "≈ 24 days",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "करिब `२८५` ई.सं.मा दुई शून्य एकै ठाउँमा थिए — निरयन मेष सङ्क्रान्ति र वसन्त विषुव एकै दिन पर्थे। त्यसपछि हरेक वर्ष २० मिनेट थपिँदै आज ~अयनांश~ झन्डै `२४.२°` पुगेको छ। सूर्य दिनको झन्डै `१°` हिँड्ने हुनाले यो **करिब २४ दिन** हो।",
            en: "Around `285` CE the two zeros coincided — sidereal Mesha Sankranti and the vernal equinox fell on the same day. Adding 20 minutes a year since then, the ~ayanamsha~ is now about `24.2°`. With the Sun moving about `1°` a day, that is **roughly 24 days**.",
          },
        },
        {
          kind: "table",
          caption: {
            ne: "सायन घटना र त्यसको निरयन “जोडी” — आज करिब २४ दिनको फरक",
            en: "Each tropical event and its sidereal \"partner\" — about 24 days apart today",
          },
          headers: [
            { ne: "सायन (ऋतु) घटना", en: "Tropical (season) event" },
            { ne: "मिति", en: "Date" },
            { ne: "निरयन सङ्क्रान्ति", en: "Sidereal sankranti" },
            { ne: "मिति", en: "Date" },
          ],
          rows: [
            [{ ne: "वसन्त विषुव", en: "Vernal equinox" }, { ne: "२०–२१ मार्च", en: "20–21 Mar" }, { ne: "मेष (बैशाख १)", en: "Mesha (Baisakh 1)" }, { ne: "१३–१५ अप्रिल", en: "13–15 Apr" }],
            [{ ne: "ग्रीष्म अयनान्त", en: "Summer solstice" }, { ne: "२१ जुन", en: "21 Jun" }, { ne: "कर्कट (साउन १)", en: "Karka (Saun 1)" }, { ne: "१६–१७ जुलाई", en: "16–17 Jul" }],
            [{ ne: "शरद विषुव", en: "Autumn equinox" }, { ne: "२२–२३ सेप्टेम्बर", en: "22–23 Sep" }, { ne: "तुला (कात्तिक १)", en: "Tula (Kartik 1)" }, { ne: "१७–१८ अक्टोबर", en: "17–18 Oct" }],
            [{ ne: "शिशिर अयनान्त", en: "Winter solstice" }, { ne: "२१–२२ डिसेम्बर", en: "21–22 Dec" }, { ne: "मकर (माघ १)", en: "Makara (Magh 1)" }, { ne: "१४–१५ जनवरी", en: "14–15 Jan" }],
          ],
        },
        {
          kind: "diagram",
          id: "ayanamsha-wheel",
          caption: {
            ne: "दुई शून्यबीचको खाँडो नै अयनांश — यही कोण दिनमा बदल्दा माथिको २४ दिन आउँछ।",
            en: "The wedge between the two zeros is the ayanamsha — turned into days, it is the 24 days above.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "सबैभन्दा चिनिने उदाहरण माघे सङ्क्रान्ति हो। यसलाई ~उत्तरायण~ को सुरु भनिन्छ, तर सूर्य वास्तवमा २१–२२ डिसेम्बरमै उत्तरतर्फ फर्किसकेको हुन्छ। १,७०० वर्षअघि यी दुई एकै दिन पर्थे; आज **निरयन नाम** र **सायन घटना**बीच तीन हप्ताभन्दा बढी छ ([[uttarayana-dakshinayana|उत्तरायण र दक्षिणायन]])।",
            en: "The best-known case is Maghe Sankranti. It is called the start of ~Uttarayana~, yet the Sun actually turns north on 21–22 December. Seventeen centuries ago the two fell on the same day; today more than three weeks separate the **sidereal name** from the **tropical event** ([[uttarayana-dakshinayana|Uttarayana and Dakshinayana]]).",
          },
        },
      ],
    },
    {
      title: { ne: "वि.सं. सायन भएको भए के हुन्थ्यो?", en: "What if Bikram Sambat were tropical?" },
      eyebrow: "Two results side by side",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "एउटै पात्रो दुई तरिकाले चलाउँदा नतिजा कति फरक हुन्छ? तलको तालिकाले आजको वि.सं. (निरयन) लाई सायन वर्षमा चलाइएको काल्पनिक वि.सं.सँग दाँज्छ।",
            en: "How different are the results when the same calendar runs on each year? The table compares today's BS (sidereal) with an imagined BS run on the tropical year.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "कुरा", en: "Aspect" },
            { ne: "सायन वर्ष मानेमा", en: "If tropical (sāyana)" },
            { ne: "निरयन वर्ष (आजको वि.सं.)", en: "Sidereal (today's BS)" },
          ],
          rows: [
            [
              { ne: "वर्षको लम्बाइ", en: "Year length" },
              { ne: "३६५.२४२२ दिन", en: "365.2422 days" },
              { ne: "३६५.२५६४ दिन (सिद्धान्तमा ३६५.२५८८)", en: "365.2564 days (365.2588 in Siddhanta)" },
            ],
            [
              { ne: "बैशाख १ गते", en: "Baisakh 1" },
              { ne: "सधैँ २०–२१ मार्च, शताब्दीऔँसम्म नसर्ने", en: "Always 20–21 March, unmoving for centuries" },
              { ne: "आज १३–१५ अप्रिल, ~७१ वर्षमा १ दिन पछि सर्दै", en: "13–15 April today, 1 day later every ~71 years" },
            ],
            [
              { ne: "ऋतुसँग सम्बन्ध", en: "Tie to the seasons" },
              { ne: "स्थिर — बैशाख सधैँ वसन्तको सुरु", en: "Fixed — Baisakh always opens spring" },
              { ne: "सर्दै — आज झन्डै २४ दिन ढिला", en: "Drifting — about 24 days late today" },
            ],
            [
              { ne: "तारा र नक्षत्रसँग सम्बन्ध", en: "Tie to the stars and nakshatras" },
              { ne: "सर्दै — ७२ वर्षमा १°", en: "Drifting — 1° in 72 years" },
              { ne: "स्थिर — बैशाख १ मा सूर्य सधैँ अश्विनीको सुरुमा", en: "Fixed — on Baisakh 1 the Sun is always at the start of Ashvini" },
            ],
            [
              { ne: "माघे सङ्क्रान्ति", en: "Maghe Sankranti" },
              { ne: "२१–२२ डिसेम्बर — वास्तविक उत्तरायणकै दिन", en: "21–22 December — on the real turn north" },
              { ne: "१४–१५ जनवरी — अयनान्तभन्दा ~२४ दिन पछि", en: "14–15 January — ~24 days after the solstice" },
            ],
            [
              { ne: "चाडपर्व (दशैँ, तिहार…)", en: "Festivals (Dashain, Tihar…)" },
              { ne: "सङ्क्रान्ति २४ दिन चाँडो हुँदा धेरैजसो वर्ष (करिब ५ मा ४) एक चान्द्र मास अघि", en: "With sankrantis 24 days earlier, most years (about 4 in 5) one lunar month earlier" },
              { ne: "आजकै समय — असोज–कात्तिकतिर", en: "Where they are now — around Asoj–Kartik" },
            ],
            [
              { ne: "जन्म राशि", en: "Birth rashi" },
              { ne: "पश्चिमी (सायन) राशि — धेरैको एक राशि पछि", en: "The Western (tropical) sign — one sign later for most people" },
              { ne: "वैदिक (निरयन) राशि", en: "The Vedic (sidereal) sign" },
            ],
            [
              { ne: "ई.सं.सँगको नक्सा", en: "Mapping to AD" },
              { ne: "झन्डै स्थिर — भारतको राष्ट्रिय (शक) पात्रोजस्तै", en: "Nearly fixed — like India's national (Saka) calendar" },
              { ne: "हरेक वर्ष फरक, बिस्तारै सर्दै", en: "Different every year, slowly sliding" },
            ],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "सायन सौर पात्रो काल्पनिक मात्र होइन। इरानको सौर पात्रोको नयाँ वर्ष (नौरोज) वसन्त विषुवमै पर्छ, र भारतले १९५७ मा अपनाएको राष्ट्रिय पात्रोको चैत्र १ सधैँ २२ मार्च (लीप वर्षमा २१) मा पर्छ। दुवैले ऋतु स्थिर राखे, तर ताराको सम्बन्ध छाडे।",
            en: "A tropical solar calendar is not just hypothetical. Iran's solar calendar opens its year (Nowruz) at the vernal equinox, and the national calendar India adopted in 1957 puts Chaitra 1 on 22 March (21 in leap years) every year. Both fixed the seasons and let go of the stars.",
          },
        },
      ],
    },
    {
      title: { ne: "निरयनको बलियो पक्ष — सूर्य राशिमा कसरी हिँड्छ", en: "The strength of nirayana — how the Sun walks the rashis" },
      eyebrow: "23 h 56 min 4 s",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "राशि ताराको आकाशका बाह्र स्थिर टुक्रा हुन् — हरेक `३०°`। सूर्य कुन राशिमा छ भनेर नाप्न ताराकै सापेक्ष नाप्नुपर्छ। आकाश आफैँले हरेक दिन यो नाप दिन्छ: **ताराको दिन** र **सूर्यको दिन**बीचको फरकमा।",
            en: "The rashis are twelve fixed slices of the starry sky — `30°` each. To know which one the Sun is in, you have to measure against the stars. The sky gives that measurement every day: in the gap between the **star day** and the **Sun's day**.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "नाक्षत्र दिन — २३ घ ५६ मि ४ से", en: "Sidereal day — 23 h 56 min 4 s" },
              p: {
                ne: "ताराको सापेक्ष पृथ्वीको एक पूरा फेरो। कुनै तारा फेरि ठ्याक्कै उही ठाउँमा आउन यति समय लाग्छ, र यो सधैँ उही रहन्छ।",
                en: "One full turn of the Earth against the stars. It is the time a star takes to return to exactly the same place, and it never varies.",
              },
            },
            {
              h: { ne: "सौर दिन — २४ घण्टा", en: "Solar day — 24 hours" },
              p: {
                ne: "सूर्य एक मध्याह्नबाट अर्को मध्याह्नसम्म। त्यो बीचमा पृथ्वी आफ्नो कक्षामा अलि अगाडि बढ्छ, त्यसैले सूर्यलाई फेरि माथि ल्याउन `~१°` थप घुम्नुपर्छ — त्यही `३` मि `५६` से।",
                en: "The Sun from one noon to the next. Meanwhile the Earth moves a little along its orbit, so it must turn `~1°` more to bring the Sun overhead again — those `3` min `56` s.",
              },
            },
            {
              h: { ne: "त्यो १° नै राशिको यात्रा", en: "That 1° is the walk through the rashis" },
              p: {
                ne: "सूर्य ताराको सापेक्ष हरेक दिन `~१°` पूर्वतिर सर्छ। `३०` दिनमा एक राशि, `३६५` दिनमा बाह्रै राशि — यही हो *सङ्क्रान्ति*, महिना र निरयन वर्ष।",
                en: "Against the stars the Sun shifts `~1°` east every day. One rashi in `30` days, all twelve in `365` — this is the *sankranti*, the month and the sidereal year.",
              },
            },
          ],
        },
        {
          kind: "diagram",
          id: "sidereal-solar-day",
          caption: {
            ne: "ताराको हिसाबले फेरो २३ घ ५६ मि मै पूरा हुन्छ; सूर्य फेरि माथि आउन ~४ मिनेट थप — त्यो थप कोण नै सूर्यको दैनिक राशि-यात्रा हो।",
            en: "Against the stars the turn is done in 23 h 56 min; bringing the Sun back overhead takes ~4 minutes more — that extra angle is the Sun's daily step through the rashis.",
          },
        },
        {
          kind: "calc",
          caption: { ne: "४ मिनेटबाट राशिसम्म", en: "From 4 minutes to a rashi" },
          rule: [
            { ne: "दैनिक फरक = सौर दिन − नाक्षत्र दिन", en: "Daily gap = solar day − sidereal day" },
            { ne: "सूर्यको दैनिक गति = ३६०° × फरक ÷ नाक्षत्र दिन", en: "Sun's daily motion = 360° × gap ÷ sidereal day" },
            { ne: "एक राशिका दिन = ३०° ÷ दैनिक गति", en: "Days per rashi = 30° ÷ daily motion" },
          ],
          example: [
            { k: { ne: "८६,४०० − ८६,१६४.१ से", en: "86,400 − 86,164.1 s" }, v: "235.9 s ≈ 3 min 56 s" },
            { k: { ne: "३६०° × २३५.९ ÷ ८६,१६४.१", en: "360° × 235.9 ÷ 86,164.1" }, v: "≈ 0.9856°" },
            { k: { ne: "३०° ÷ ०.९८५६°", en: "30° ÷ 0.9856°" }, v: "≈ 30.4 d" },
            { k: { ne: "३६०° ÷ ०.९८५६°", en: "360° ÷ 0.9856°" }, v: "≈ 365.26 d" },
          ],
          result: {
            ne: "दिनको ४ मिनेट जम्मा हुँदा महिनामा **२ घण्टा = एक राशि**, वर्षमा **२४ घण्टा = पूरा एक फेरो**। त्यसैले एक निरयन वर्षमा `३६५.२६` सौर दिन तर `३६६.२६` नाक्षत्र दिन हुन्छन्।",
            en: "Four minutes a day add up to **2 hours = one rashi** in a month and **24 hours = one whole extra turn** in a year. So a sidereal year holds `365.26` solar days but `366.26` star days.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "उल्टो सोचौँ। सूर्यको दिन पनि ताराको दिनजत्तै २३ घ ५६ मि ४ से हुन्थ्यो भने सूर्य हरेक दिन ताराको ठ्याक्कै उही बिन्दुमा फर्कन्थ्यो — ऊ **सधैँ मेषमै** रहन्थ्यो। न सङ्क्रान्ति, न महिना, न वर्ष। हाम्रो २४ घण्टे घडी सूर्यसँग बाँधिएको छ, त्यसैले त्यो घडीमा सूर्य हरेक दिन उही ठाउँ (मध्याह्न) मा देखिन्छ र सर्दैन जस्तो लाग्छ। सर्ने कुरा ताराको घडीमा मात्र देखिन्छ — र राशि त्यही घडीले नापिन्छ।",
            en: "Turn it around. If the Sun's day were as short as the star day, 23 h 56 min 4 s, the Sun would come back to exactly the same point among the stars every day — it would **stay in Mesha forever**. No sankranti, no month, no year. Our 24-hour clock is tied to the Sun, so on that clock the Sun is in the same place (noon) every day and seems not to move. Its motion only shows on the star clock — and the rashis are measured on that clock.",
          },
        },
        {
          kind: "table",
          caption: {
            ne: "हरेक राति उही घडी-समयमा (जस्तै ९ बजे) आकाश हेर्दा — तारा हरेक दिन ४ मिनेट चाँडो आउँछन्",
            en: "Looking at the sky at the same clock time every night (say 9 pm) — the stars arrive 4 minutes earlier each day",
          },
          headers: [
            { ne: "दिनपछि", en: "After" },
            { ne: "तारा कति चाँडो", en: "Stars earlier by" },
            { ne: "आकाश सरेको", en: "Sky turned" },
            { ne: "सूर्य कहाँ", en: "Where the Sun is" },
          ],
          rows: [
            [{ ne: "१ दिन", en: "1 day" }, "3 min 56 s", "≈ 1°", { ne: "उही राशिमा १° अगाडि", en: "1° further in the same rashi" }],
            [{ ne: "१५ दिन", en: "15 days" }, { ne: "≈ १ घण्टा", en: "≈ 1 hour" }, "≈ 15°", { ne: "राशिको आधा बाटो", en: "Halfway through the rashi" }],
            [{ ne: "३०.४ दिन", en: "30.4 days" }, { ne: "≈ २ घण्टा", en: "≈ 2 hours" }, "30°", { ne: "अर्को राशि — सङ्क्रान्ति", en: "Next rashi — a sankranti" }],
            [{ ne: "१८२.६ दिन", en: "182.6 days" }, { ne: "≈ १२ घण्टा", en: "≈ 12 hours" }, "180°", { ne: "मेषबाट तुला — आधा वर्ष", en: "Mesha to Tula — half a year" }],
            [{ ne: "३६५.२६ दिन", en: "365.26 days" }, { ne: "२४ घण्टा", en: "24 hours" }, "360°", { ne: "फेरि मेष — नयाँ वर्ष", en: "Mesha again — a new year" }],
          ],
          highlightRow: 2,
        },
        {
          kind: "para",
          text: {
            ne: "निरयन वर्ष भनेको यही यात्राको पूरा फेरो हो: सूर्य ताराको एउटै बिन्दुबाट फेरि त्यही बिन्दुसम्म। त्यसैले वि.सं.मा **महिनाको नाम, सूर्यको राशि र आकाशका तारा** तीनै सधैँ एउटै कुरा भन्छन्। बैशाखभरि सूर्य मेषमा, साउनभरि कर्कटमा — आज पनि, हजार वर्षपछि पनि।",
            en: "The sidereal year is exactly one full round of this walk: the Sun from one point among the stars back to the same point. That is why in BS the **month's name, the Sun's rashi and the stars in the sky** always say the same thing. All through Baisakh the Sun is in Mesha, all through Saun in Karka — today, and a thousand years from now.",
          },
        },
      ],
    },
    {
      title: { ne: "सबै ग्रह एउटै ताराको नक्सामा", en: "Every graha on one star map" },
      eyebrow: "One frame",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सूर्यमात्र होइन — चन्द्र, मङ्गल, गुरु, शनि सबै ताराको पृष्ठभूमिमा आ-आफ्नो गतिमा राशि पार गर्छन्। निरयनमा सबैको स्थिति **एउटै स्थिर नक्सा**मा नापिन्छ, त्यसैले कुनै पनि दुई ग्रहको सम्बन्ध, नक्षत्र र राशि सिधै दाँज्न मिल्छ।",
            en: "Not just the Sun — the Moon, Mars, Jupiter and Saturn all cross the rashis against the stars, each at its own pace. In nirayana every position is measured on **one fixed map**, so any two grahas, nakshatras and rashis can be compared directly.",
          },
        },
        {
          kind: "table",
          caption: { ne: "ताराको सापेक्ष औसत गति — सबै उही निरयन राशिचक्रमा", en: "Mean motion against the stars — all on the same sidereal zodiac" },
          headers: [
            { ne: "ग्रह", en: "Graha" },
            { ne: "दिनको गति", en: "Per day" },
            { ne: "एक राशिमा", en: "In one rashi" },
            { ne: "पूरा चक्र", en: "Full round" },
          ],
          rows: [
            [{ ne: "सूर्य", en: "Sun" }, "≈ 0°59′", { ne: "≈ ३०.४ दिन (एक महिना)", en: "≈ 30.4 days (a month)" }, { ne: "१ वर्ष", en: "1 year" }],
            [{ ne: "चन्द्र", en: "Moon" }, "≈ 13°11′", { ne: "≈ २¼ दिन", en: "≈ 2¼ days" }, { ne: "२७.३ दिन", en: "27.3 days" }],
            [{ ne: "मङ्गल", en: "Mars" }, "≈ 0°31′", { ne: "≈ ५७ दिन", en: "≈ 57 days" }, { ne: "≈ १.९ वर्ष", en: "≈ 1.9 years" }],
            [{ ne: "गुरु", en: "Jupiter" }, "≈ 0°5′", { ne: "≈ १ वर्ष", en: "≈ 1 year" }, { ne: "≈ १२ वर्ष", en: "≈ 12 years" }],
            [{ ne: "शनि", en: "Saturn" }, "≈ 0°2′", { ne: "≈ २½ वर्ष", en: "≈ 2½ years" }, { ne: "≈ २९½ वर्ष", en: "≈ 29½ years" }],
            [{ ne: "राहु–केतु", en: "Rahu–Ketu" }, { ne: "≈ 0°3′ (उल्टो)", en: "≈ 0°3′ (backwards)" }, { ne: "≈ १½ वर्ष", en: "≈ 1½ years" }, { ne: "≈ १८.६ वर्ष", en: "≈ 18.6 years" }],
          ],
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "राशि र नक्षत्र ठ्याक्कै मिल्छन्", en: "Rashi and nakshatra fit exactly" },
              p: {
                ne: "२७ नक्षत्र × `१३°२०′` = `३६०°`, एक राशिमा `२¼` नक्षत्र। मेष = अश्विनी + भरणी + कृत्तिकाको पहिलो पाद। निरयनमा यो जोड कहिल्यै सर्दैन; सायन मेषको सुरु भने आज उत्तर भाद्रपदमा (निरयन मीन `~५°४८′`) पर्छ र हरेक ७२ वर्षमा `१°` थप सर्छ।",
                en: "27 nakshatras × `13°20′` = `360°`, `2¼` nakshatras to a rashi. Mesha = Ashvini + Bharani + the first pada of Krittika. In nirayana this fit never moves; the start of tropical Mesha already falls in Uttara Bhadrapada (sidereal Meena `~5°48′`) and slides `1°` more every 72 years.",
              },
            },
            {
              h: { ne: "चान्द्र मासको नाम पनि ताराबाट", en: "Lunar month names come from the stars too" },
              p: {
                ne: "पूर्णिमाको चन्द्र सूर्यको ठीक उल्टो राशिमा हुन्छ। सूर्य निरयन मेषमा हुँदा पूर्णिमा चित्रा–विशाखातिर पर्छ — त्यसैले *वैशाख*। सौर महिना र चान्द्र मासको यो नाता पनि निरयन आधारमै टिक्छ।",
                en: "The full Moon stands in the rashi opposite the Sun. With the Sun in sidereal Mesha, the full Moon falls near Chitra–Vishakha — hence *Vaishakha*. This bond between solar and lunar months also holds only on the sidereal footing.",
              },
            },
            {
              h: { ne: "सूर्योदयको लग्न = सूर्यको राशि", en: "Sunrise lagna = the Sun's rashi" },
              p: {
                ne: "पूर्वी क्षितिजमा उदाउने राशि नै *लग्न* हो। एक नाक्षत्र दिनमा बाह्रै लग्न उदाउँछन् — औसत करिब २ घण्टा प्रति लग्न। सूर्य जुन राशिमा छ, सूर्योदयमा त्यही राशि उदाउँछ: बैशाखभरि सूर्योदय लग्न मेष, साउनभरि कर्कट। उही घडी-समयको लग्न भने हरेक दिन ४ मिनेट चाँडो, महिनामा एक राशि सर्छ — मुहूर्त गणना यही नियममा चल्छ।",
                en: "The rashi rising on the eastern horizon is the *lagna*. All twelve rise in one star day — about 2 hours each on average. Whatever rashi the Sun is in rises with it at sunrise: the sunrise lagna is Mesha all through Baisakh, Karka all through Saun. The lagna at a fixed clock time comes 4 minutes earlier each day, a whole rashi in a month — the rule muhurta reckoning runs on.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यसको सबैभन्दा ठूलो फाइदा भनेको **आकाशमा आफैँ जाँच्न मिल्नु** हो। मध्यरातमा टाउकोमाथि देखिने राशि सूर्यको ठीक उल्टो हुन्छ, र बिहानीअघि पूर्वमा उदाउने तारा सूर्यको राशितिर देखाउँछन्। निरयन पात्रोले भनेको सूर्य, चन्द्र र ग्रहको राशि रातको आकाशमा तारा हेरेरै पुष्टि हुन्छ — सायन राशि भने आज करिब एक राशि अगाडि लेखिन्छ, र तारासँग मेल खाँदैन।",
            en: "The biggest gain is that **you can check it in the sky yourself**. The rashi overhead at midnight is the one opposite the Sun, and the stars rising in the east before dawn point to the Sun's rashi. The rashi a sidereal patro gives for the Sun, the Moon and the planets is confirmed by simply looking at the stars — a tropical rashi is written nearly one rashi ahead today and does not match them.",
          },
        },
      ],
    },
    {
      title: { ne: "महिना किन २९ देखि ३२ दिनका?", en: "Why months run 29 to 32 days" },
      eyebrow: "The Sun's real pace",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "निरयन सौर पात्रोले सूर्यको **वास्तविक** गति पछ्याउँछ, औसत होइन। पृथ्वीको कक्षा अलि अण्डाकार छ, त्यसैले सूर्य ताराको सापेक्ष कहिले छिटो, कहिले ढिलो हिँड्छ — र महिनाको लम्बाइ त्यसै अनुसार बदलिन्छ।",
            en: "A sidereal solar calendar follows the Sun's **true** motion, not an average. Earth's orbit is slightly oval, so against the stars the Sun walks sometimes faster, sometimes slower — and the months grow and shrink with it.",
          },
        },
        {
          kind: "table",
          headers: [
            { ne: "पृथ्वी", en: "Earth" },
            { ne: "सूर्यको दैनिक गति", en: "Sun's daily motion" },
            { ne: "३०° पार गर्न", en: "To cross 30°" },
            { ne: "वि.सं. महिना", en: "BS month" },
          ],
          rows: [
            [{ ne: "सूर्यको नजिक (जनवरी सुरु)", en: "Nearest the Sun (early January)" }, "≈ 1.02°", { ne: "≈ २९.४ दिन", en: "≈ 29.4 days" }, { ne: "पुस–माघ: २९–३० दिन", en: "Push–Magh: 29–30 days" }],
            [{ ne: "सूर्यबाट टाढा (जुलाई सुरु)", en: "Farthest from the Sun (early July)" }, "≈ 0.95°", { ne: "≈ ३१.५ दिन", en: "≈ 31.5 days" }, { ne: "असार–साउन: ३१–३२ दिन", en: "Asar–Saun: 31–32 days" }],
          ],
        },
        {
          kind: "diagram",
          id: "solar-month-lengths",
          caption: {
            ne: "सूर्य ढिलो हिँड्दा राशि पार गर्न धेरै दिन — गर्मीका महिना लामा, जाडोका छोटा।",
            en: "When the Sun walks slowly it needs more days per rashi — the summer months are long, the winter ones short.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "वि.सं.को महिना ३२ दिनको हुनु गल्ती होइन, आकाशको सही प्रतिबिम्ब हो। ई.सं.ले महिनाका दिन नियमले तोक्छ; वि.सं.ले सूर्यलाई नै सोध्छ। यो पनि निरयन (सङ्क्रान्तिमा आधारित) पात्रोको एउटा राम्रो नतिजा हो।",
            en: "A 32-day month in BS is not an error but a faithful picture of the sky. AD fixes a month's days by rule; BS asks the Sun. This too is a good result of a sidereal, sankranti-based calendar.",
          },
        },
      ],
    },
    {
      title: { ne: "निरयन मान्दाको लामो नतिजा", en: "The long result of staying sidereal" },
      eyebrow: "Centuries ahead",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "वि.सं. निरयन नै रहे बैशाख १ ई.सं.मा पछि सर्दै जान्छ। अयन चलनको दर अलि बदलिने हुनाले यी मिति अनुमान हुन्, तर दिशा निश्चित छ।",
            en: "If BS stays sidereal, Baisakh 1 keeps moving later in AD. The rate of precession itself varies a little, so these dates are estimates — but the direction is certain.",
          },
        },
        {
          kind: "table",
          caption: { ne: "बैशाख १ — ~७१ वर्षमा १ दिनको दरले", en: "Baisakh 1 — at ~1 day per 71 years" },
          headers: [
            { ne: "ई.सं.", en: "AD" },
            { ne: "बैशाख १ करिब", en: "Baisakh 1 around" },
            { ne: "वसन्त विषुवदेखि", en: "After the vernal equinox" },
          ],
          rows: [
            ["285", { ne: "२० मार्च वरिपरि", en: "about 20 March" }, { ne: "एकै दिन", en: "Same day" }],
            ["2026", { ne: "१४ अप्रिल", en: "14 April" }, { ne: "~२४ दिन", en: "~24 days" }],
            ["2500", { ne: "२०–२१ अप्रिल", en: "20–21 April" }, { ne: "~३१ दिन", en: "~31 days" }],
            ["3000", { ne: "२७–२८ अप्रिल", en: "27–28 April" }, { ne: "~३८ दिन", en: "~38 days" }],
            ["4200", { ne: "मे मध्य", en: "mid-May" }, { ne: "~५५ दिन — पूरा एक महिना थप", en: "~55 days — a whole month more" }],
            ["~13,000", { ne: "सेप्टेम्बर–अक्टोबर", en: "September–October" }, { ne: "आधा वर्ष — बैशाख शरदमा", en: "Half a year — Baisakh in autumn" }],
          ],
          highlightRow: 1,
        },
        {
          kind: "list",
          items: [
            {
              ne: "**राम्रो पक्ष:** राशि, नक्षत्र र ग्रहको स्थिति ताराको आकाशसँग सधैँ मेल खान्छ — ज्योतिष, मुहूर्त र नक्षत्रमा आधारित सबै गणना एउटै आधारमा रहन्छन्। महिनाको नाम, सूर्यको राशि र आकाशका तारा सधैँ एउटै कुरा भन्छन्।",
              en: "**The gain:** rashi, nakshatra and planetary positions always match the starry sky — astrology, muhurta and everything built on the nakshatras stay on one footing. The month's name, the Sun's rashi and the stars overhead always agree.",
            },
            {
              ne: "**मूल्य:** महिना र ऋतुको जोडी बिस्तारै छुट्छ। ग्रन्थमा “वसन्त = चैत–बैशाख” भनिएको अहिले नै करिब तीन हप्ता ढिलो छ ([[ritu-drift|ऋतु किन सर्छ]])।",
              en: "**The cost:** months slowly come apart from the seasons. The texts' \"spring = Chait–Baisakh\" is already about three weeks late ([[ritu-drift|why the ṛtus drift]]).",
            },
            {
              ne: "**दैनिक जीवनमा:** मानिसको जीवनकालभर यो फरक एक दिनभन्दा कम हुन्छ, त्यसैले कसैले महसुस गर्दैन — तर शताब्दीमा हिसाब गर्ने पात्रोकारले यसलाई बेवास्ता गर्न सक्दैन।",
              en: "**In daily life:** over a human lifetime the slip is under a day, so nobody feels it — but a calendar-maker reckoning in centuries cannot ignore it.",
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "कुनै वर्ष “गलत” होइन — सायन वर्षले **ऋतु** नाप्छ, निरयन वर्षले **तारा**। नेपाली पात्रोले तारा रोजेको छ, त्यसैले ऋतुको हिसाब चाहिँदा पञ्चाङ्गले अलग्गै सायन विषुव र अयनान्त देखाउँछ।",
            en: "Neither year is \"wrong\" — the tropical year measures the **seasons**, the sidereal year the **stars**. The Nepali patro has chosen the stars, which is why a panchanga lists the tropical equinoxes and solstices separately when the seasons are wanted.",
          },
        },
      ],
    },
  ],
};
