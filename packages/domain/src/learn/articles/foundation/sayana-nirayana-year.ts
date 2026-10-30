import type { ArticleData } from "../../article-schema";

/*
 * Figures: mean tropical year 365.242190 d, sidereal year 365.256363 d (the
 * value the BS engine extrapolates sankrantis with, engine/calendar/
 * bikram_sambat.py), Surya Siddhanta year 365.258756 d. Baisakh 1 dates are
 * from the official BS table (engine/calendar/constants.py). Lahiri ayanamsha
 * ≈ 24.2° in 2026, zero ≈ 285 CE.
 */
export const sayanaNirayanaYear: ArticleData = {
  slug: "sayana-nirayana-year",
  seeAlso: ["sidereal-vs-tropical", "year-begins-baisakh", "bs-ad-offset", "ritu-drift"],
  sections: [
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
              ne: "**राम्रो पक्ष:** राशि, नक्षत्र र ग्रहको स्थिति ताराको आकाशसँग सधैँ मेल खान्छ — ज्योतिष, मुहूर्त र नक्षत्रमा आधारित सबै गणना एउटै आधारमा रहन्छन्।",
              en: "**The gain:** rashi, nakshatra and planetary positions always match the starry sky — astrology, muhurta and everything built on the nakshatras stay on one footing.",
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
