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
      title: { ne: "वर्षलाई कसरी नापिन्छ?", en: "How is a year measured?" },
      eyebrow: "Start here",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "वर्ष, महिना र ऋतु हामी कसरी तय गर्छौँ? यो पाठ त्यही प्रश्नबाट सुरु हुन्छ। पृथ्वीको परिक्रमा एउटै हो, तर त्यसलाई नाप्ने घडी तीन किसिमका छन् — र तीनवटा छुट्याएर बुझेपछि मात्र वि.सं. किन निरयन छ, बैशाख १ किन अप्रिलमा पर्छ, र माघे सङ्क्रान्ति र उत्तरायण किन फरक छन् भन्ने कुरा आफैँ खुल्छ।",
            en: "How do we fix the year, the month and the seasons? This lesson starts from that question. The Earth's orbit is one, but there are three kinds of clock to measure it by — and only once the three are kept apart does it fall into place why BS is sidereal, why Baisakh 1 falls in April, and why Maghe Sankranti and Uttarayana differ.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "ऋतुको समय", en: "Season time" },
              p: {
                ne: "पृथ्वीको अक्षीय झुकाव र परिक्रमाले ल्याउने गर्मी–जाडो। एक वसन्त विषुवदेखि अर्कोसम्म — *सायन वर्ष*।",
                en: "Summer and winter, brought by Earth's tilted axis as it orbits. One vernal equinox to the next — the *tropical (sāyana) year*.",
              },
            },
            {
              h: { ne: "ताराको समय", en: "Star time" },
              p: {
                ne: "ताराहरूको तुलनामा सूर्य एक फेरो घुमेर उही ठाउँमा फर्किने। मेषको सुरुदेखि फेरि मेषसम्म — *निरयन वर्ष*।",
                en: "The Sun's return to the same place among the stars. From the start of Mesha back to Mesha — the *sidereal (nirayana) year*.",
              },
            },
            {
              h: { ne: "पात्रोको समय", en: "Calendar time" },
              p: {
                ne: "सूर्यको सङ्क्रान्ति, चन्द्रको तिथि र अधिक मास मिलाएर बनेको वास्तविक पात्रो। नेपाली पात्रोले सौर भाग ताराको घडीमा मिलाउँछ ([[lunar-month|चान्द्र मास]])।",
                en: "The working calendar, built from the Sun's sankrantis, the Moon's tithis and the adhik maas. The Nepali patro sets its solar part by the star clock ([[lunar-month|the lunar month]]).",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "सूर्य घुमेर उही ठाउँमा फर्किन लाग्ने समय नै एक वर्ष हो। तर “उही ठाउँ” दुई तरिकाले नाप्न सकिन्छ — **ऋतु**ले (वसन्त विषुव) वा **तारा**ले (मेष राशिको सुरु)। ऋतुले नापेको वर्ष *सायन*, ताराले नापेको *निरयन*। दुईबीच वर्षमा जम्मा `२०` मिनेटको फरक हुन्छ, तर १,७०० वर्षमा त्यो जम्मा भएर ~२४ दिन~ पुगिसकेको छ।",
            en: "A year is the time the Sun takes to come back to the same place. But \"the same place\" can be measured two ways — by the **seasons** (the vernal equinox) or by the **stars** (the start of Mesha). The year measured by the seasons is *sāyana* (tropical); the one measured by the stars is *nirayana* (sidereal). They differ by only `20` minutes a year, but over 1,700 years that has added up to ~24 days~.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "**यो पाठको क्रम:** पहिले प्रकृति, त्यसपछि गणित, अनि पात्रो, र अन्त्यमा हाम्रो जीवनमा पर्ने प्रभाव।",
            en: "**How this lesson runs:** nature first, then the arithmetic, then the calendar, and last what it means for our lives.",
          },
        },
        {
          kind: "list",
          ordered: true,
          items: [
            { ne: "**वर्षलाई कसरी नापिन्छ?** — ऋतु, तारा र पात्रोका तीन घडी।", en: "**How is a year measured?** — the three clocks: seasons, stars, calendar." },
            { ne: "**सायन र निरयन वर्ष** — परिभाषा, लम्बाइ, राम्रा र कमजोर पक्ष।", en: "**The tropical and sidereal year** — definitions, lengths, pros and cons." },
            { ne: "**२० मिनेटको फरक किन?** — पृथ्वीको अक्ष डगमगाउँदा विषुव सर्छ।", en: "**Why the 20-minute gap?** — Earth's wobbling axis moves the equinox." },
            { ne: "**एउटै ग्रह, दुई राशि** — सायन र निरयन राशिचक्र, अयनांश।", en: "**One planet, two rashis** — the two zodiacs and the ayanamsha." },
            { ne: "**वि.सं. कुन आधारमा?** — मेष सङ्क्रान्ति, बैशाख १ र ई.सं.।", en: "**What BS runs on** — Mesha Sankranti, Baisakh 1 and AD." },
            { ne: "**सूर्य, चन्द्र र ग्रह** — सबै एउटै ताराको नक्सामा।", en: "**Sun, Moon and planets** — all on one star map." },
            { ne: "**महिना २९–३२ दिनका किन?** — सूर्यको असमान गति, उपसौर–अपसौर कसरी सर्छन्, र हिमयुगसँग त्यसको नाता।", en: "**Why months run 29–32 days** — the Sun's uneven pace, how perihelion and aphelion move, and their link to the ice ages." },
            { ne: "**२४ दिनको ऐतिहासिक फरक** — अयनांश कसरी जम्मा भयो।", en: "**The 24-day historical gap** — how the ayanamsha built up." },
            { ne: "**चाडपर्व, उत्तरायण र ऋतु** — फरकले हाम्रो जीवनमा के गर्छ।", en: "**Festivals, Uttarayana and the seasons** — what the gap does to daily life." },
            { ne: "**भविष्यको वि.सं.** — सायन भएको भए के हुन्थ्यो, र हजारौँ वर्षपछि के हुन्छ।", en: "**BS in the future** — what a tropical BS would be, and where ours is heading." },
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
      title: { ne: "सायन र निरयन वर्ष", en: "The tropical and sidereal year" },
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
          kind: "note",
          text: {
            ne: "सम्झनुहोस्: **सायनले ऋतु स्थिर राख्छ, निरयनले तारा।** दुवै उत्तिकै सही नाप हुन् — फरक केवल के स्थिर राख्ने भन्नेमा छ।",
            en: "Remember: **sāyana holds the seasons fixed, nirayana the stars.** Both are equally correct measurements — they differ only in what they hold still.",
          },
        },
      ],
    },
    {
      title: { ne: "२० मिनेटको फरक किन हुन्छ?", en: "Why is there a 20-minute gap?" },
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
        {
          kind: "note",
          text: {
            ne: "सम्झनुहोस्: तारा सर्दैनन्, **विषुव बिन्दु सर्छ** — वर्षमा `५०″`। त्यही सानो सराइले हरेक वर्ष २० मिनेटको फरक ल्याउँछ। माथिका दुई गणना छुट्टै प्रणाली हुन्: आधुनिक मापन र सूर्य सिद्धान्तको परम्परागत वर्ष।",
            en: "Remember: the stars stay put; **the equinox point moves** — `50″` a year. That small slide makes the 20-minute gap every year. The two calculations above are separate systems: the modern measurement, and the traditional Surya Siddhanta year.",
          },
        },
      ],
    },
    {
      title: { ne: "एउटै ग्रह, दुई राशि", en: "One planet, two rashis" },
      eyebrow: "Two zodiacs",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "राशिचक्र `३६०°` को घेरा हो, १२ राशि × `३०°`। प्रश्न केवल **शून्य कहाँ राख्ने** भन्ने हो। सायन राशिचक्रले शून्य वसन्त विषुवमा राख्छ, निरयनले ताराको एउटा निश्चित बिन्दुमा (अश्विनीको सुरु)। दुई शून्यबीचको कोण नै ~अयनांश~ हो।",
            en: "The zodiac is a `360°` circle, 12 rashis × `30°`. The only question is **where to put zero**. The tropical zodiac puts it at the vernal equinox; the sidereal one at a fixed point among the stars (the start of Ashvini). The angle between the two zeros is the ~ayanamsha~.",
          },
        },
        {
          kind: "calc",
          rule: [
            { ne: "सायन देशान्तर = निरयन देशान्तर + अयनांश", en: "Tropical longitude = sidereal longitude + ayanamsha" },
          ],
          where: [
            { sym: "अयनांश", is: { ne: "दुई राशिचक्रको शून्यबीचको कोण — आज करिब `२४.२°` (लाहिरी)", en: "the angle between the two zodiacs' zeros — about `24.2°` today (Lahiri)" } },
          ],
          example: [
            { k: { ne: "ग्रह, निरयन (मीन १५°)", en: "Planet, sidereal (Meena 15°)" }, v: "330° + 15° = 345°" },
            { k: { ne: "+ अयनांश", en: "+ ayanamsha" }, v: "345° + 24.2° = 369.2°" },
            { k: { ne: "३६०° घटाउँदा (मेष ९°१२′)", en: "Less 360° (Mesha 9°12′)" }, v: "369.2° − 360° = 9.2°" },
          ],
          result: { ne: "एउटै ग्रह — निरयनमा **मीन**, सायनमा **मेष**। आकाशमा ग्रह एउटै ठाउँमा छ; फरक केवल नाप्ने शून्यमा।", en: "One planet — **Meena** in sidereal, **Mesha** in tropical. It sits in one place in the sky; only the zero it is measured from differs." },
          caption: { ne: "राशि बदल्ने सूत्र", en: "Turning one rashi into the other" },
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
              h: { ne: "अयनांश एउटै होइन", en: "There is more than one ayanamsha" },
              p: {
                ne: "निरयन शून्य कुन तारामा राख्ने भन्नेमा परम्परा फरक छन्। भारत सरकारको पञ्चाङ्ग र यो एपले *लाहिरी* प्रयोग गर्छन्; रमण, कृष्णमूर्ति आदि अरू अयनांश यसभन्दा बढीमा करिब `१½°` फरक पर्छन्। त्यसैले दुई निरयन पात्रोमा पनि सङ्क्रान्तिको समय केही घण्टा फरक हुन सक्छ।",
                en: "Traditions differ on which star fixes the sidereal zero. India's official panchanga and this app use *Lahiri*; others (Raman, Krishnamurti and more) differ from it by up to about `1½°`. So even two sidereal patros can give a sankranti a few hours apart.",
              },
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "सम्झनुहोस्: ग्रह आकाशमा एउटै ठाउँमा हुन्छ। आज सायन राशि धेरैजसो एक राशि पछिको हुन्छ — त्यसैले पत्रिकाको पश्चिमी राशिफल र तपाईंको वैदिक जन्म राशि फरक देखिन्छन्।",
            en: "Remember: a planet sits in one place in the sky. Today the tropical rashi is mostly one sign later — which is why a newspaper's Western horoscope and your Vedic birth rashi disagree.",
          },
        },
      ],
    },
    {
      title: { ne: "विक्रम सम्वत् कुन आधारमा चल्छ?", en: "What does Bikram Sambat run on?" },
      eyebrow: "Mesha Sankranti",
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
          kind: "para",
          text: {
            ne: "बैशाख भनेको सूर्य निरयन मेषमा रहने समय हो, साउन कर्कटमा रहने समय। सङ्क्रान्ति दिनको कुन बेला पर्छ भन्ने नियमले महिनाको पहिलो दिन तय गर्छ, त्यसैले महिनाको किनारा ठ्याक्कै सङ्क्रान्तिको क्षणसँग नभई एक दिनसम्म यता–उता पर्न सक्छ।",
            en: "Baisakh is the time the Sun spends in sidereal Mesha, Saun the time it spends in Karka. Which day counts as the 1st is set by a rule about when in the day the sankranti falls, so a month's edge can sit up to a day off the exact moment of the sankranti.",
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
      title: { ne: "निरयन प्रणालीमा सूर्य, चन्द्र र ग्रह", en: "Sun, Moon and planets in the sidereal system" },
      eyebrow: "One star map",
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
        {
          kind: "para",
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
              h: { ne: "चान्द्र मासको नाम पनि ताराबाट", en: "Lunar month names come from the stars too" },
              p: {
                ne: "पूर्णिमाको क्षणमा चन्द्र सूर्यबाट ठ्याक्कै `१८०°` टाढा, अर्थात् उल्टो राशिमा हुन्छ। सूर्य निरयन मेषमा हुँदा पूर्णिमा चित्रा–विशाखातिर पर्छ — त्यसैले *वैशाख*। सौर महिना र चान्द्र मासको यो नाता पनि निरयन आधारमै टिक्छ।",
                en: "At the moment of full Moon the Moon is exactly `180°` from the Sun — in the opposite rashi. With the Sun in sidereal Mesha, the full Moon falls near Chitra–Vishakha — hence *Vaishakha*. This bond between solar and lunar months also holds only on the sidereal footing.",
              },
            },
            {
              h: { ne: "सूर्योदयको लग्न = सूर्यको राशि", en: "Sunrise lagna = the Sun's rashi" },
              p: {
                ne: "पूर्वी क्षितिजमा उदाउने राशि नै *लग्न* हो। एक नाक्षत्र दिनमा बाह्रै लग्न उदाउँछन् — औसत करिब २ घण्टा प्रति लग्न। सूर्योदयको क्षणमा सूर्य आफैँ पूर्वी क्षितिजमा हुन्छ, त्यसैले उदाउँदो बिन्दु सूर्यकै अंश हो — सूर्य जुन राशिमा छ, सूर्योदयमा त्यही राशि उदाउँछ: बैशाखभरि सूर्योदय लग्न मेष, साउनभरि कर्कट। उही घडी-समयको लग्न भने हरेक दिन ४ मिनेट चाँडो, महिनामा एक राशि सर्छ — मुहूर्त गणना यही नियममा चल्छ।",
                en: "The rashi rising on the eastern horizon is the *lagna*. All twelve rise in one star day — about 2 hours each on average. At the moment of sunrise the Sun itself is on the eastern horizon, so the rising degree is the Sun's own — whatever rashi the Sun is in rises with it: the sunrise lagna is Mesha all through Baisakh, Karka all through Saun. The lagna at a fixed clock time comes 4 minutes earlier each day, a whole rashi in a month — the rule muhurta reckoning runs on.",
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
        {
          kind: "note",
          text: {
            ne: "सम्झनुहोस्: सौर दिन नाक्षत्र दिनभन्दा ४ मिनेट लामो छ — त्यही ४ मिनेट नै सूर्यको राशि यात्रा हो। निरयनमा सबै ग्रह एउटै ताराको नक्सामा नापिन्छन्।",
            en: "Remember: the solar day is 4 minutes longer than the star day — those 4 minutes are the Sun's walk through the rashis. In nirayana every graha is measured on the one star map.",
          },
        },
      ],
    },
    {
      title: { ne: "महिना २९–३२ दिनका किन? — उपसौर, अपसौर र हिमयुग", en: "Why months run 29–32 days — perihelion, aphelion and the ice ages" },
      eyebrow: "Perihelion · Aphelion",
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
            [{ ne: "सूर्यको नजिक (पुस १९ तिर)", en: "Nearest the Sun (early January)" }, "≈ 1.02°", { ne: "≈ २९.४ दिन", en: "≈ 29.4 days" }, { ne: "पुस–माघ: २९–३० दिन", en: "Push–Magh: 29–30 days" }],
            [{ ne: "सूर्यबाट टाढा (असार २० तिर)", en: "Farthest from the Sun (early July)" }, "≈ 0.95°", { ne: "≈ ३१.५ दिन", en: "≈ 31.5 days" }, { ne: "असार–साउन: ३१–३२ दिन", en: "Asar–Saun: 31–32 days" }],
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
        {
          kind: "para",
          text: {
            ne: "तर उपसौर र अपसौर सधैँ उही ठाउँमा रहँदैनन्। यहाँ दुई फरक कुरा छुट्याउनुपर्छ — **अयनान्त** पृथ्वीको अक्षले तय गर्छ, **उपसौर–अपसौर** कक्षाको आकार र दिशाले। दुवै बिस्तारै घुम्छन्, त्यसैले तिनको आपसी सम्बन्ध हजारौँ वर्षमा बदलिन्छ।",
            en: "But perihelion and aphelion do not stay in one place. Two different things have to be kept apart here — the **solstices** are set by Earth's axis, **perihelion and aphelion** by the shape and direction of its orbit. Both turn slowly, so the relation between them changes over thousands of years.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "अयनान्त — अक्षले तय गर्छ", en: "Solstices — set by the axis" },
              p: {
                ne: "पृथ्वीको अक्ष करिब `२३.४४°` झुकेको छ। ग्रीष्म अयनान्तमा (असार ७ तिर) उत्तरी गोलार्ध सूर्यतिर सबैभन्दा बढी ढल्किन्छ (सबैभन्दा लामो दिन), हेमन्त अयनान्तमा (पुस ६ तिर) सबैभन्दा टाढा। पृथ्वी नजिक होस् वा टाढा — अयनान्त यही झुकावले मात्र बन्छ।",
                en: "Earth's axis is tilted about `23.44°`. At the June solstice the northern hemisphere leans most toward the Sun (longest day), at the December solstice most away. Near or far, the solstices come from this tilt alone.",
              },
            },
            {
              h: { ne: "उपसौर–अपसौर — कक्षाले तय गर्छ", en: "Perihelion and aphelion — set by the orbit" },
              p: {
                ne: "कक्षा अलिकति अण्डाकार छ। *उपसौर*मा पृथ्वी सूर्यको सबैभन्दा नजिक, *अपसौर*मा सबैभन्दा टाढा हुन्छ। कक्षाको यो लामो अक्ष (~अपसौरीय चलन~) र पृथ्वीको अक्ष (~अयन चलन~) दुवै घुम्दा उपसौर ऋतुहरूबीच सर्दै जान्छ।",
                en: "The orbit is slightly oval. At *perihelion* Earth is closest to the Sun, at *aphelion* farthest. The orbit's long axis turns (~apsidal precession~) and so does Earth's axis (~precession~), so perihelion moves through the seasons.",
              },
            },
          ],
        },
        {
          kind: "table",
          caption: { ne: "आज — अयनान्त र उपसौर–अपसौर एउटै बिन्दु होइनन्, करिब १२–१३ दिनको फरकमा छन्", en: "Today — solstices and apsides are not the same points; they sit about 12–13 days apart" },
          headers: [
            { ne: "घटना", en: "Event" },
            { ne: "करिब मिति", en: "Approximate date" },
            { ne: "कक्षामा पृथ्वी", en: "Earth in its orbit" },
          ],
          rows: [
            [{ ne: "हेमन्त अयनान्त", en: "December solstice" }, { ne: "पुस ६", en: "21 December" }, { ne: "उपसौरतिर जाँदै", en: "Heading toward perihelion" }],
            [{ ne: "उपसौर", en: "Perihelion" }, { ne: "पुस १९", en: "3 January" }, { ne: "सूर्यको सबैभन्दा नजिक — १४.७ करोड किमी", en: "Closest to the Sun — 147.1 million km" }],
            [{ ne: "ग्रीष्म अयनान्त", en: "June solstice" }, { ne: "असार ७", en: "21 June" }, { ne: "अपसौरतिर जाँदै", en: "Heading toward aphelion" }],
            [{ ne: "अपसौर", en: "Aphelion" }, { ne: "असार २०", en: "4 July" }, { ne: "सूर्यको सबैभन्दा टाढा — १५.२ करोड किमी", en: "Farthest from the Sun — 152.1 million km" }],
          ],
        },
        {
          kind: "diagram",
          id: "apsides-seasons",
          caption: {
            ne: "स्लाइडर सार्नुहोस् वा चलाउनुहोस् — ऋतु स्थिर राखेर हेर्दा अण्डाकार कक्षा पूरै घुम्छ र उपसौर हेमन्त अयनान्तबाट वसन्त विषुव, ग्रीष्म अयनान्त हुँदै फेरि फर्किन्छ। उपसौर ग्रीष्म अयनान्तमा पुग्दा उत्तरी गर्मी कडा हुन्छ।",
            en: "Move or play the slider — with the seasons fixed the orbit's oval turns all the way round, carrying perihelion from the December solstice past the March equinox to the June solstice and back. When perihelion reaches the June solstice, northern summers turn sharp.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "उपसौर ऋतुको तुलनामा वर्षमा करिब `६२″` अगाडि सर्छ — हरेक **~५७ वर्षमा १ दिन** पछि। करिब १२५० ई.सं.तिर उपसौर ठ्याक्कै हेमन्त अयनान्तमै पर्थ्यो; आज १३ दिनपछि (पुस १९ तिर) पर्छ; करिब ११,७०० ई.सं.तिर ग्रीष्म अयनान्तमा पुग्नेछ। ऋतुहरूभरि एक फेरो पूरा गर्न करिब **२१,००० वर्ष** लाग्छ (वास्तविक अवधि १९,००० देखि २३,००० वर्षबीच घटबढ हुन्छ)। ध्यान दिनुहोस्: उपसौर सर्दा अयनान्त सर्दैन — दुई रेखाको आपसी कोण मात्र बदलिन्छ।",
            en: "Against the seasons perihelion moves about `62″` a year — **1 day later every ~57 years**. Around 1250 CE it fell exactly on the December solstice; today it comes 13 days after; around 11,700 CE it will reach the June solstice. One round through the seasons takes about **21,000 years** (the real period wanders between 19,000 and 23,000). Note: the solstices do not move because perihelion moves — only the angle between the two lines changes.",
          },
        },
        {
          kind: "table",
          caption: { ne: "उपसौर कहाँ पर्छ भन्नेले उत्तरी गोलार्धको ऋतुमा पार्ने असर", en: "What the timing of perihelion does to the northern seasons" },
          headers: [
            { ne: "", en: "" },
            { ne: "आज: गर्मीमा अपसौर", en: "Today: aphelion in summer" },
            { ne: "~११,७०० ई.सं.: गर्मीमा उपसौर", en: "~11,700 CE: perihelion in summer" },
          ],
          rows: [
            [{ ne: "ग्रीष्म अयनान्तमा घाम (औसतको तुलनामा)", en: "June sunlight (vs average)" }, "−3.3%", "+3.4%"],
            [{ ne: "उत्तरी गर्मी", en: "Northern summer" }, { ne: "कम तातो", en: "Cooler" }, { ne: "झन् तातो", en: "Hotter" }],
            [{ ne: "उत्तरी जाडो", en: "Northern winter" }, { ne: "कम चिसो", en: "Gentler" }, { ne: "झन् चिसो", en: "Colder" }],
            [{ ne: "दक्षिणी गोलार्ध", en: "Southern hemisphere" }, { ne: "ठीक उल्टो — कडा ऋतु", en: "The reverse — sharper seasons" }, { ne: "ठीक उल्टो — नरम ऋतु", en: "The reverse — milder seasons" }],
            [{ ne: "उत्तरमा लामो ऋतु", en: "Longer season in the north" }, { ne: "गर्मी (सूर्य ढिलो हिँड्छ)", en: "Summer (the Sun moves slowly)" }, { ne: "जाडो", en: "Winter" }],
          ],
        },
        {
          kind: "para",
          text: {
            ne: "तर ऋतुको मुख्य कारण दूरी होइन, **झुकाव** हो। अपसौर उत्तरी जाडोमा परे पनि जाडो चाहिँ उत्तरी गोलार्ध सूर्यबाट टाढा ढल्किएकैले हुन्छ — दूरीले त्यसलाई अलिकति कडा वा नरम मात्र बनाउँछ। आजको कक्षामा उपसौर र अपसौरबीच घामको फरक करिब `७%` छ; कक्षा सबैभन्दा अण्डाकार हुँदा (उत्केन्द्रता `०.०५८` सम्म, ~१,००,००० वर्षको चक्रमा) यो फरक `२०%` भन्दा बढी पुग्छ।",
            en: "Still, the main cause of the seasons is **tilt**, not distance. Even with aphelion in the northern winter, winter happens because the north leans away from the Sun — distance only makes it a little sharper or gentler. On today's orbit the sunlight differs by about `7%` between perihelion and aphelion; when the orbit is at its most oval (eccentricity up to `0.058`, on ~100,000-year cycles) the difference passes `20%`.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "हिमयुग कसरी सुरु हुन्छ", en: "How an ice age starts" },
              p: {
                ne: "हिमयुग जाडो धेरै चिसो भएर होइन, **गर्मी कम तातो** भएर सुरु हुन्छ। उत्तरी गर्मीमा अपसौर, कम झुकाव (`२२.१°` तिर) र अण्डाकार कक्षा एकै साथ परे उत्तरी क्यानडा र साइबेरियाको हिउँ गर्मीभरि पग्लँदैन — वर्षेनी थपिँदै हिउँको पाता बन्छ, र सेतो हिउँले घाम फर्काएर अझ चिसो बनाउँछ।",
                en: "An ice age starts not with colder winters but with **cooler summers**. When aphelion falls in the northern summer, the tilt is low (near `22.1°`) and the orbit is oval, snow in northern Canada and Siberia survives the summer — it piles up year on year into ice sheets, and the white ice reflects sunlight and cools things further.",
              },
            },
            {
              h: { ne: "हिमयुग कसरी अन्त्य हुन्छ", en: "How an ice age ends" },
              p: {
                ne: "उपसौर उत्तरी गर्मीमा आउँदा र झुकाव बढ्दा गर्मी कडा हुन्छ, हिउँका पाता पग्लिन थाल्छन्। करिब ११,००० वर्षअघि उपसौर ग्रीष्म अयनान्ततिर थियो — अन्तिम हिमयुग त्यही बेला सकियो। यी तीन चक्रलाई (२१,०००, ४१,००० र १,००,००० वर्ष) *मिलान्कोभिच चक्र* भनिन्छ।",
                en: "When perihelion comes in the northern summer and the tilt grows, summers turn strong and the ice sheets start to melt. About 11,000 years ago perihelion was near the June solstice — and that is when the last ice age ended. These three cycles (21,000, 41,000 and 100,000 years) are the *Milankovitch cycles*.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "आज उत्तरी गर्मी अपसौरतिरै छ, तर कक्षा लगभग गोलो (उत्केन्द्रता `०.०१७`, घट्दै) भएकाले यो असर कमजोर छ। अनुसन्धानअनुसार अर्को हिमयुग प्राकृतिक रूपमा पनि झन्डै ५०,००० वर्षसम्म आउने छैन, र मानिसले थपेको कार्बन डाइअक्साइडले त्यसलाई अझ पर धकेल्छ।",
            en: "Today the northern summer is near aphelion, but with the orbit almost round (eccentricity `0.017`, and falling) the effect is weak. Studies suggest that even naturally the next ice age would not come for about 50,000 years, and the carbon dioxide people have added pushes it further off.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "**वि.सं.मा यसको असर:** ताराको तुलनामा उपसौर वर्षमा जम्मा `~११.६″` सर्छ — एक राशि सर्न करिब ९,३०० वर्ष। आज अपसौर निरयन मिथुन `~१९°` मा छ, त्यसैले असार सबैभन्दा लामो महिना हो। करिब ८,००० वर्षपछि अपसौर कर्कट राशिको बीचमा पुग्दा साउन सबैभन्दा लामो र पुस–माघको सट्टा माघ–फागुन सबैभन्दा छोटा हुनेछन्।",
            en: "**What it means for BS:** against the stars perihelion moves only `~11.6″` a year — about 9,300 years per rashi. Today aphelion sits at sidereal Mithuna `~19°`, which is why Asar is the longest month. In about 8,000 years, with aphelion near the middle of Karka, Saun will be the longest month and Magh–Phagun rather than Push–Magh the shortest.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "सम्झनुहोस्: वि.सं.को महिना सूर्यको वास्तविक गतिले तय हुन्छ — सूर्य टाढा हुँदा ढिलो, त्यसैले असार–साउन लामा। **अयनान्त अक्षले, उपसौर–अपसौर कक्षाले** तय गर्छन्; दुईको सम्बन्ध २१,००० वर्षमा एक फेरो घुम्छ र त्यसले नै हिमयुग ल्याउने–लैजाने काममा भूमिका खेल्छ।",
            en: "Remember: a BS month is set by the Sun's real motion — slowest when farthest away, so Asar–Saun run long. **The axis sets the solstices, the orbit sets perihelion and aphelion**; their relation turns once in about 21,000 years, and that turning helps bring the ice ages and end them.",
          },
        },
      ],
    },
    {
      title: { ne: "अयनांश र २४ दिनको ऐतिहासिक फरक", en: "The ayanamsha and the 24-day gap" },
      eyebrow: "≈ 24°",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "यो एपले प्रयोग गर्ने लाहिरी अयनांशअनुसार करिब `२८५` ई.सं.मा दुई शून्य एकै ठाउँमा थिए — निरयन मेष सङ्क्रान्ति र वसन्त विषुव एकै दिन पर्थे (अरू अयनांशले यो वर्ष केही शताब्दी यता–उता राख्छन्)। त्यसपछि हरेक वर्ष २० मिनेट थपिँदै आज ~अयनांश~ झन्डै `२४.२°` पुगेको छ। सूर्य दिनको झन्डै `१°` हिँड्ने हुनाले यो **करिब २४ दिन** हो।",
            en: "By the Lahiri ayanamsha this app uses, the two zeros coincided around `285` CE — sidereal Mesha Sankranti and the vernal equinox fell on the same day (other ayanamshas put that year a few centuries either way). Adding 20 minutes a year since then, the ~ayanamsha~ is now about `24.2°`. With the Sun moving about `1°` a day, that is **roughly 24 days**.",
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
            { ne: "ऋतु घटनाको मिति", en: "Season date" },
            { ne: "निरयन सङ्क्रान्ति", en: "Sidereal sankranti" },
            { ne: "सङ्क्रान्तिको मिति", en: "Sankranti date" },
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
            ne: "**२४ दिन** भनेको `२४°` अयनांशलाई सूर्यको औसत दैनिक गति (`~१°`) ले भाग गर्दा आउने अनुमान हो। सूर्य वर्षभरि एकै गतिमा नहिँड्ने हुनाले (अध्याय ०७) माथिका जोडीबीच वास्तविक फरक २३ देखि २६ दिनसम्म पर्छ — जाडोमा छोटो, गर्मीमा लामो।",
            en: "**24 days** is the `24°` ayanamsha divided by the Sun's mean daily motion (`~1°`). Because the Sun does not move at one pace through the year (chapter 07), the real gap between the pairs above runs 23 to 26 days — shorter in winter, longer in summer.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "सम्झनुहोस्: अयनांश कोण हो, दिन होइन। आज करिब `२४.२°` छ र हरेक ७२ वर्षमा `१°` बढ्छ।",
            en: "Remember: the ayanamsha is an angle, not a number of days. It is about `24.2°` today and grows `1°` every 72 years.",
          },
        },
      ],
    },
    {
      title: { ne: "चाडपर्व, उत्तरायण र ऋतुमा पर्ने प्रभाव", en: "What it does to festivals, Uttarayana and the seasons" },
      eyebrow: "Daily life",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "अयनांशको फरक किताबको हिसाबमा मात्र सीमित छैन — यसले हाम्रा चाडपर्व र ऋतुको नाममा सिधै असर गर्छ।",
            en: "The ayanamsha gap is not just bookkeeping — it reaches straight into our festivals and the names of our seasons.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "सबैभन्दा चिनिने उदाहरण माघे सङ्क्रान्ति हो। यसलाई ~उत्तरायण~ को सुरु भनिन्छ, तर सूर्य वास्तवमा २१–२२ डिसेम्बरमै उत्तरतर्फ फर्किसकेको हुन्छ। १,७०० वर्षअघि यी दुई एकै दिन पर्थे; आज **निरयन नाम** र **सायन घटना**बीच तीन हप्ताभन्दा बढी छ ([[uttarayana-dakshinayana|उत्तरायण र दक्षिणायन]])।",
            en: "The best-known case is Maghe Sankranti. It is called the start of ~Uttarayana~, yet the Sun actually turns north on 21–22 December. Seventeen centuries ago the two fell on the same day; today more than three weeks separate the **sidereal name** from the **tropical event** ([[uttarayana-dakshinayana|Uttarayana and Dakshinayana]]).",
          },
        },
        {
          kind: "para",
          text: {
            ne: "दशैँ, तिहारजस्ता चाडपर्व चान्द्र तिथिमा पर्छन्, तर चान्द्र मास कुन हो भन्ने कुरा त्यसभित्र पर्ने **निरयन सङ्क्रान्ति**ले तय गर्छ, र सङ्क्रान्ति नपर्ने महिनालाई अधिक मास बनाइन्छ ([[lunar-month|चान्द्र मास]])। त्यसैले चाडपर्व पनि निरयन सङ्क्रान्तिसँगै बाँधिएका छन् र ऋतुको तुलनामा करिब ७१ वर्षमा १ दिनको दरले पछि सर्छन्।",
            en: "Festivals such as Dashain and Tihar fall on lunar tithis, but which lunar month it is gets decided by the **sidereal sankranti** that falls inside it, and a month with no sankranti becomes an adhik maas ([[lunar-month|the lunar month]]). So the festivals are tied to the sidereal sankrantis too, and move later against the seasons at about 1 day in 71 years.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "ऋतुका नाम पनि यसै कारण ढिलो देखिन्छन्। ग्रन्थमा “वसन्त = चैत–बैशाख” भनिएको छ, तर ऋतुको वसन्त (सूर्य सायन मीन–मेषमा) आज चैत लाग्नुभन्दा करिब तीन हप्ता अगाडि, फागुनको दोस्रो हप्तातिरै सुरु हुन्छ ([[ritu-drift|ऋतु किन सर्छ]])।",
            en: "The season names look late for the same reason. The texts say \"spring = Chait–Baisakh\", but the season of spring (the Sun in tropical Meena–Mesha) now begins about three weeks before Chait does, in the second week of Phagun ([[ritu-drift|why the ṛtus drift]]).",
          },
        },
        {
          kind: "note",
          text: {
            ne: "सम्झनुहोस्: **नाम** निरयन (तारा) बाट आउँछ, **ऋतु** सायन (पृथ्वीको झुकाव) बाट। माघे सङ्क्रान्ति र वास्तविक उत्तरायणबीचको तीन हप्ता यही दुईको फरक हो।",
            en: "Remember: the **names** come from nirayana (the stars), the **seasons** from sāyana (Earth's tilt). The three weeks between Maghe Sankranti and the real Uttarayana are exactly that difference.",
          },
        },
      ],
    },
    {
      title: { ne: "भविष्यमा विक्रम सम्वत् कहाँ पुग्छ?", en: "Where is Bikram Sambat heading?" },
      eyebrow: "Centuries ahead",
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
        {
          kind: "para",
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
