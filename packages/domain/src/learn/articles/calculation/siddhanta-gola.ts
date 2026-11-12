import type { ArticleData } from "../../article-schema";

/**
 * The Golādhyāya of the Siddhānta-śiromaṇi (Wilkinson and Bāpū Deva Śāstrī,
 * Calcutta, 1861), walked one calculation at a time.
 *
 * The book does not reprint the Sūrya-siddhānta. It shows why those rules
 * give the numbers they give: the day, the months, the ahargaṇa, the sine,
 * the two equations, and the eclipse. Each section is one page.
 *
 * Lengths below are the book's own (IV.8–12). The radius 3438′ is the one
 * the book uses when it corrects the orbit (V.42). The Sun's manda
 * periphery of 14° is the scale the worked sum uses so the proportion in
 * V.27 can be seen; the book says to take that periphery from the Gaṇitādhyāya.
 */
export const siddhantaGola: ArticleData = {
  slug: "siddhanta-gola",
  paged: true,
  seeAlso: ["ancient-planetary-motion", "solar-longitude", "surya-siddhanta", "eclipses", "calc-sunrise"],
  sections: [
    {
      title: { ne: "कुमालेको चक्र", en: "The potter's wheel" },
      eyebrow: "Goladhyaya IV.4",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "यो अध्याय एउटै किताब होइन। *सिद्धान्तशिरोमणिको गोलाध्याय* ले सूर्य सिद्धान्तका नियम किन मिल्छन् भनेर देखाउँछ, र हामी त्यो कारण एक पृष्ठमा एउटा गणना गरेर हेर्छौँ। अर्को पृष्ठ त्यतिबेला खुल्छ जब तपाईं अर्को नियम हेर्न तयार हुनुहुन्छ।",
            en: "This chapter is not the book in one scroll. The *Goladhyaya of the Siddhanta Shiromani* shows why the rules of the Surya Siddhanta come out as they do, and we follow that reason one calculation to a page. The next page opens when you are ready for the next rule.",
          },
        },
        {
          kind: "diagram",
          id: "ss-potter-wheel",
          caption: {
            ne: "चक्र पश्चिमतिर दौडिन्छ। ग्रह पूर्वतिर सुस्त हिँड्छ, त्यसैले कीरा चक्रमा उल्टो हिँडे पनि अडिएझैँ देखिन्छ।",
            en: "The wheel runs west. The planet creeps east, so like an insect crawling the wrong way on a spinning wheel it looks almost still.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "गोलाध्यायको चौथो अध्याय यही चित्रबाट सुरु हुन्छ। *प्रवह* वायुले तारा र ग्रहसहितको गोललाई हरेक दिन पश्चिमतिर एकनासले घुमाउँछ। ग्रह आफैँ पूर्वतिर ढिलो हिँड्छन्। छिटो पश्चिमी गतिले ढिलो पूर्वी गतिलाई ढाकिदिन्छ — त्यसैले ग्रह आकाशमा अडिएझैँ देखिन्छन्।",
            en: "Chapter four of the Goladhyaya starts from this picture. The *pravaha* wind carries the sphere of stars and planets west, uniformly, once a day. The planets themselves walk slowly east. The fast westward motion hides the slow eastward one — which is why a planet looks almost fixed in the sky.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "अर्को पृष्ठले त्यो ढिलो पूर्वी गतिलाई समयमा बदल्छ: सूर्य अलि पूर्व सर्दा बिहान किन ढिलो हुन्छ।",
            en: "The next page turns that slow eastward step into time: why morning comes late once the Sun has moved a little east.",
          },
        },
      ],
    },
    {
      title: { ne: "नाक्षत्र दिन र सौर दिन", en: "The sidereal day and the solar day" },
      eyebrow: "Goladhyaya IV.5–7",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "कुनै तारा र सूर्य सँगै उदाए भने त्यो तारा भोलि फेरि *६० घटी* मा उदाउँछ। सूर्य त्यतिबेला अझ पूर्वतिर पुगिसकेको हुन्छ, त्यसैले उसलाई क्षितिजमा ल्याउन पृथ्वीले अलि बढी घुम्नुपर्छ।",
            en: "If a star and the Sun rise together, that star rises again in *60 ghatis*. By then the Sun has walked further east, so Earth must turn a little further to bring him to the horizon.",
          },
        },
        {
          kind: "diagram",
          id: "ss-solar-day",
          caption: {
            ne: "तारा फेरि मध्यान्हमा आउँदा सूर्य अघि बढिसकेको हुन्छ। थपिएको चाप नै सौर दिनको अतिरिक्त हो।",
            en: "When the star is back on the meridian the Sun has already moved on. That extra arc is what the solar day adds.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "विषुवत् रेखामा एउटा कला उदाउन *१ असु* लाग्छ, र एउटा राशिमा *१८००* कला हुन्छन्। त्यसैले अतिरिक्त समय यो अनुपात हो: सूर्यको दैनिक गति (कलामा) × त्यो राशि उदाउन लाग्ने असु ÷ १८००। विषुवमा राशि आफैँ १८०० असुमा उदाउँछ, त्यसैले अतिरिक्त असु सूर्यको दैनिक कलासँग बराबर हुन्छ।",
            en: "On the equator one minute of arc takes *1 asu* to rise, and a sign holds *1800* minutes. The extra time is this proportion: the Sun's daily motion in minutes, times the asus that sign takes to rise, divided by 1800. On the equator a sign itself rises in 1800 asus, so the extra asus equal the Sun's daily minutes.",
          },
        },
        {
          kind: "calc",
          rule: [
            {
              ne: "अतिरिक्त असु = सूर्यको दैनिक कला × राशिको उदय-असु ÷ `१८००`",
              en: "extra asus = Sun's daily minutes × the sign's rising asus ÷ `1800`",
            },
            {
              ne: "सौर दिन = `६०` घटी + अतिरिक्त असु",
              en: "solar day = `60` ghatis + the extra asus",
            },
          ],
          where: [
            { sym: "असु", is: { ne: "नाक्षत्र कलाको छैटौँ भाग; विषुवमा १ कला = १ असु", en: "a sixth of a sidereal minute; on the equator 1′ = 1 asu" } },
            { sym: "१ घटी", is: { ne: "३६० असु, अर्थात् २४ मिनेट", en: "360 asus, which is 24 minutes" } },
          ],
          example: [
            { k: { ne: "मध्यम दैनिक गति", en: "mean daily motion" }, v: "59′" },
            { k: { ne: "विषुवमा राशिको उदय", en: "a sign rising on the equator" }, v: "1800 asu" },
            { k: { ne: "५९ × १८०० ÷ १८००", en: "59 × 1800 ÷ 1800" }, v: "59 asu" },
            { k: { ne: "५९ ÷ ३६० घटी", en: "59 ÷ 360 ghati" }, v: "0.164 ghati" },
            { k: { ne: "०.१६४ × ६० पल", en: "0.164 × 60 pala" }, v: "≈ 10 pala" },
          ],
          result: {
            ne: "मध्यम सौर दिन = **६० घटी १० पल**। १० पल भनेको ४ मिनेट हो — नाक्षत्र दिनभन्दा सौर दिन त्यति नै लामो।",
            en: "The mean solar day is **60 ghatis 10 pala**. Ten pala is 4 minutes — that is how much longer the solar day is than the sidereal day.",
          },
          caption: {
            ne: "वर्षको लम्बाइले दैनिक गति ५९′ ८″ दिन्छ। ५९′ ले यही अनुपात देखाइदिन्छ।",
            en: "The length of the year gives a daily motion of 59′ 8″. 59′ is enough to see the proportion.",
          },
        },
      ],
    },
    {
      title: { ne: "वर्ष र तीन मास", en: "The year and the three months" },
      eyebrow: "Goladhyaya IV.8–9",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "एउटा सौर वर्ष *३६५ दिन १५ घटी ३० पल २२½ विपल* हो। त्यसको बाह्रौँ भाग सौर मास हो। चन्द्रले सूर्यलाई एक पटक उछिनेर फेरि भेट्न लाग्ने समय चान्द्र मास हो। तीस सावन दिन एउटा सावन मास हो।",
            en: "A solar year is *365 days, 15 ghatis, 30 pala, 22½ vipala*. A twelfth of that is a solar month. The time the Moon takes to catch the Sun again is a lunar month. Thirty savana days make a savana month.",
          },
        },
        {
          kind: "diagram",
          id: "ss-month-bars",
          caption: {
            ne: "तीन मास एउटै स्केलमा। सावन ३० दिनको पट्टी हो। सौर अलि लामो, चान्द्र अलि छोटो। दुई फरक नै पछिका दुई पृष्ठ हुन्।",
            en: "The three months on one scale. The savana month is the bar of 30 days. The solar month is a little longer, the lunar month a little shorter. Those two gaps are the next two pages.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: { ne: "३६५ दि.", en: "365 d" },
              unit: { ne: "१५ घ. ३० प.", en: "15 gh 30 p" },
              label: { ne: "सौर वर्ष", en: "Solar year" },
              desc: { ne: "सावन दिनमा गनिएको। नाक्षत्र घुमाइभन्दा एक कम।", en: "Counted in savana days. One fewer than the revolutions of the stars." },
            },
            {
              big: { ne: "३० दि.", en: "30 d" },
              unit: { ne: "२६ घ. १७ प.", en: "26 gh 17 p" },
              label: { ne: "सौर मास", en: "Solar month" },
              desc: { ne: "वर्षको बाह्रौँ भाग। ३१ विपल ५२½ प्रतिविपल बाँकी।", en: "A twelfth of the year. 31 vipala and 52½ prativipala remain." },
            },
            {
              big: { ne: "२९ दि.", en: "29 d" },
              unit: { ne: "३१ घ. ५० प.", en: "31 gh 50 p" },
              label: { ne: "चान्द्र मास", en: "Lunar month" },
              desc: { ne: "चन्द्रले सूर्यलाई एक चक्रले उछिनेर फेरि भेट्दा।", en: "Until the Moon, gaining one lap on the Sun, meets him again." },
            },
          ],
        },
        {
          kind: "calc",
          rule: [
            { ne: "सौर मास = सौर वर्ष ÷ `१२`", en: "solar month = solar year ÷ `12`" },
          ],
          where: [
            { sym: "१ दिन", is: { ne: "६० घटी", en: "60 ghatis" } },
            { sym: "१ घटी", is: { ne: "६० पल", en: "60 pala" } },
            { sym: "१ पल", is: { ne: "६० विपल", en: "60 vipala" } },
          ],
          example: [
            { k: { ne: "३६५ ÷ १२", en: "365 ÷ 12" }, v: "30 d, rem 5 d" },
            { k: { ne: "५ दिन + १५ घटी", en: "5 days + 15 ghati" }, v: "315 ghati" },
            { k: { ne: "३१५ ÷ १२", en: "315 ÷ 12" }, v: "26 gh, rem 3 gh" },
            { k: { ne: "३ घटी + ३० पल", en: "3 ghati + 30 pala" }, v: "210 pala" },
            { k: { ne: "२१० ÷ १२", en: "210 ÷ 12" }, v: "17 pala, rem 6 pala" },
            { k: { ne: "६ पल + २२½ विपल", en: "6 pala + 22½ vipala" }, v: "382.5 vipala" },
            { k: { ne: "३८२.५ ÷ १२", en: "382.5 ÷ 12" }, v: "31 vip, 52½ prativip" },
          ],
          result: {
            ne: "सौर मास = **३० दिन २६ घटी १७ पल ३१ विपल ५२½ प्रतिविपल**। यही लम्बाइलाई दिनमा लेख्दा ३०.४३८ दिन हुन्छ।",
            en: "The solar month is **30 days, 26 ghatis, 17 pala, 31 vipala, 52½ prativipala**. Written in days that is 30.438.",
          },
        },
      ],
    },
    {
      title: { ne: "अधिक मासको अनुपात", en: "The proportion for an adhik month" },
      eyebrow: "Goladhyaya IV.10",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सौर मास चान्द्र मासभन्दा लामो हुन्छ। प्रत्येक सौर मासमा अलि समय बाँकी रहन्छ। त्यो बाँकी जम्मा भएर एउटा पूरै चान्द्र मास बन्दा *अधिक मास* हुन्छ — एउटै सौर मासभित्र दुई औंसी।",
            en: "A solar month is longer than a lunar month. Each solar month leaves a little time over. When that leftover has grown into a whole lunar month there is an *adhik month* — two new moons inside one solar month.",
          },
        },
        {
          kind: "diagram",
          id: "ss-adhik-slip",
          caption: {
            ne: "हरेक सौर मासले एउटा सानो ढिक्का थप्छ। ढिक्काको थुप्रो एउटा चान्द्र मास बराबर हुँदा त्यो महिना अतिरिक्त हुन्छ।",
            en: "Every solar month adds one small block. When the pile equals a lunar month, that month is the extra one.",
          },
        },
        {
          kind: "calc",
          rule: [
            {
              ne: "अन्तराल = चान्द्र मास ÷ (सौर मास − चान्द्र मास)",
              en: "interval = lunar month ÷ (solar month − lunar month)",
            },
          ],
          where: [
            { sym: "सौर मास", is: { ne: "३०.४३८ दिन", en: "30.438 days" } },
            { sym: "चान्द्र मास", is: { ne: "२९ दिन ३१ घटी ५० पल = २९.५३१ दिन", en: "29 days 31 ghati 50 pala = 29.531 days" } },
          ],
          example: [
            { k: { ne: "सौर − चान्द्र", en: "solar − lunar" }, v: "0.908 day" },
            { k: { ne: "घटी–पलमा", en: "in ghati and pala" }, v: "54 gh 27 p" },
            { k: { ne: "२९.५३१ ÷ ०.९०८", en: "29.531 ÷ 0.908" }, v: "32.53" },
            { k: { ne: "०.५३ × ३०.४४ दिन", en: "0.53 × 30.44 days" }, v: "16 days" },
          ],
          result: {
            ne: "एउटा अधिक मास **३२ सौर मास र १६ दिन** मा आउँछ। गोलाध्यायको टिप्पणीले यही अनुपातलाई ३२ मास १६ दिन लेखेको छ।",
            en: "One adhik month arrives in **32 solar months and 16 days**. The Goladhyaya's note writes this same proportion as 32 months and 16 days.",
          },
        },
      ],
    },
    {
      title: { ne: "अवम दिन", en: "The avama, the day left out" },
      eyebrow: "Goladhyaya IV.12",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "चान्द्र मास ३० तिथिको हुन्छ, तर सावन मास ३० सूर्योदयको। तिथि छोटो भएकाले ऊ सूर्योदयभन्दा अगाडि सकिन्छ। त्यो बाँकी बढ्दै गएर पूरै ६० घटी पुग्दा एक सावन दिन गणनाबाट झर्छ। त्यसलाई *अवम* भनिन्छ।",
            en: "A lunar month has 30 tithis, a savana month 30 sunrises. A tithi is shorter, so it ends before sunrise. That remainder grows, and when it fills 60 ghatis one savana day drops out of the count. That day is an *avama*.",
          },
        },
        {
          kind: "diagram",
          id: "ss-avama-fill",
          caption: {
            ne: "प्रत्येक दिन तिथि सूर्योदयभन्दा अघि टुङ्गिन्छ। पहेँलो बाँकी बढेर एक पूरै दिन हुँदा त्यो दिन अवम हो।",
            en: "Each day the tithi ends before sunrise. When the amber remainder has grown into a whole day, that day is the avama.",
          },
        },
        {
          kind: "calc",
          rule: [
            {
              ne: "अवम आउने तिथि = ३० ÷ (सावन मास − चान्द्र मास)",
              en: "tithis per avama = 30 ÷ (savana month − lunar month)",
            },
          ],
          where: [
            { sym: "सावन मास", is: { ne: "३० दिन", en: "30 days" } },
            { sym: "फरक", is: { ne: "३० − २९.५३१ = ०.४६९ दिन = २८ घटी १० पल", en: "30 − 29.531 = 0.469 day = 28 ghati 10 pala" } },
          ],
          example: [
            { k: { ne: "फरक", en: "difference" }, v: "28 gh 10 p" },
            { k: { ne: "दिनमा", en: "in days" }, v: "0.469" },
            { k: { ne: "३० ÷ ०.४६९", en: "30 ÷ 0.469" }, v: "63.9" },
          ],
          result: {
            ne: "लगभग **६४ तिथि** मा एक अवम दिन पर्छ। पुस्तकले यही भागलाई «लगभग ६४» भनेको छ।",
            en: "One avama day falls in about **64 tithis**. The book calls this same division “nearly 64”.",
          },
        },
      ],
    },
    {
      title: { ne: "अहर्गण — बाँकी किन छोडिन्छ", en: "The ahargana — why the remainder is dropped" },
      eyebrow: "Goladhyaya IV.15–18",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*अहर्गण* कल्पको सुरुदेखि चाहिएको सूर्योदयसम्मका सावन दिन हुन्। बाटो सौर दिनबाट सुरु हुन्छ, अधिक मास जोडेर चान्द्र दिन बनाइन्छ, अनि अवम घटाएर सावन दिनमा फर्किन्छ। दुवै ठाउँमा पूर्ण सङ्ख्या मात्र लिइन्छ। बाँकी जानीजानी छोडिन्छ।",
            en: "The *ahargana* is the savana days from the start of the kalpa to the sunrise you want. The path starts in solar days, adds the adhik months to make lunar days, then subtracts the avamas to come back to savana days. At both steps only the whole number is kept. The remainder is left out on purpose.",
          },
        },
        {
          kind: "diagram",
          id: "ss-ahargana",
          caption: {
            ne: "सानो उदाहरण, कल्पको ठूलो सङ्ख्या होइन। अनुपात उही हो: बाँकी जोडिएन, बाँकी घटिएन, र उत्तर सूर्योदयमा अडिन्छ।",
            en: "A small example, not a kalpa's huge count. The proportion is the same: the fraction was not added, the fraction was not subtracted, and the answer stands at sunrise.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "अधिकमासको बाँकी औंसी र त्यसपछिको सङ्क्रान्तिका *बीच* मा पर्छ। हामीलाई तिथिको अन्त्यसम्म चाहिने भएकाले त्यो बाँकी जोडिँदैन। अवमको बाँकी तिथि अन्त्य र अर्को सूर्योदयको *बीच* मा पर्छ। सूर्योदयको अहर्गण चाहिने भएकाले त्यो बाँकी घटाइँदैन। घटाइदिएको भए उत्तर तिथि अन्त्यको हुन्थ्यो, सूर्योदयको होइन।",
            en: "The adhik remainder falls *between* the new moon and the sankranti that follows it. We want the count up to the end of the tithi, so that remainder is not added. The avama remainder falls *between* the end of the tithi and the next sunrise. We want the ahargana at sunrise, so that remainder is not subtracted. Had it been subtracted, the answer would belong to the end of the tithi, not to sunrise.",
          },
        },
        {
          kind: "calc",
          rule: [
            { ne: "अधिक = सौर दिन ÷ एक अधिक मास बन्ने सौर दिन, पूर्ण भाग मात्र", en: "adhik = solar days ÷ the solar days in one adhik month, whole part only" },
            { ne: "चान्द्र दिन = सौर दिन + त्यो पूर्ण भाग", en: "lunar days = solar days + that whole part" },
            { ne: "अवम = चान्द्र दिन ÷ ६४, पूर्ण भाग मात्र", en: "avama = lunar days ÷ 64, whole part only" },
            { ne: "अहर्गण = चान्द्र दिन − त्यो पूर्ण भाग", en: "ahargana = lunar days − that whole part" },
          ],
          example: [
            { k: { ne: "भेटिएका सौर दिन", en: "solar days in hand" }, v: "65" },
            { k: { ne: "एक अधिकका सौर दिन", en: "solar days per adhik" }, v: "975" },
            { k: { ne: "६५ ÷ ९७५", en: "65 ÷ 975" }, v: "0 adhik, rem kept out" },
            { k: { ne: "चान्द्र दिन", en: "lunar days" }, v: "65" },
            { k: { ne: "६५ ÷ ६४", en: "65 ÷ 64" }, v: "1 avama, rem kept out" },
            { k: { ne: "६५ − १", en: "65 − 1" }, v: "64" },
          ],
          result: {
            ne: "सूर्योदयको अहर्गण = **६४ दिन**। ९७५ भनेको ३२.५ सौर मास × ३० हो — अघिल्लो पृष्ठको अधिक अन्तराल।",
            en: "The ahargana at sunrise is **64 days**. 975 is 32.5 solar months × 30 — the adhik interval from the previous page.",
          },
        },
      ],
    },
    {
      title: { ne: "देशान्तर र उदयान्तर", en: "Place, and the equation of time" },
      eyebrow: "Goladhyaya IV.22–23",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "अहर्गणले ग्रहको स्थान *लङ्काको मध्यम सूर्योदय* मा दिन्छ। लङ्का भनेको उज्जयिनीको मध्यान्ह रेखा हो। पूर्वको सहरमा सूर्य अघि उदाउँछ, त्यसैले त्यहाँको सूर्योदयसम्म ग्रहले अलि कम बाटो काटेको हुन्छ। त्यो शोधन *देशान्तर* हो।",
            en: "The ahargana gives a planet's place at *mean sunrise on the Lanka meridian* — the meridian of Ujjayini. In a city to the east the Sun rises earlier, so by that sunrise the planet has travelled a little less. That correction is the *deshantara*.",
          },
        },
        {
          kind: "diagram",
          id: "ss-meridian",
          caption: {
            ne: "पूर्वतिर १०° सरेको ठाउँमा सूर्य अघि उदाउँछ। त्यो चापलाई ग्रहको दैनिक गतिले गुणा गर्दा देशान्तर शोधन निस्कन्छ।",
            en: "Ten degrees further east, sunrise comes sooner. Multiply that arc by the planet's daily motion and the deshantara comes out.",
          },
        },
        {
          kind: "calc",
          rule: [
            {
              ne: "देशान्तर (कला) = दैनिक गति × देशान्तरको असु ÷ दिनका असु",
              en: "deshantara (minutes) = daily motion × asus of longitude ÷ asus in a day",
            },
          ],
          where: [
            { sym: "१° देशान्तर", is: { ne: "६० कला = ६० असु", en: "60 minutes = 60 asus" } },
            { sym: "१ दिन", is: { ne: "लगभग २१६०० असु", en: "about 21600 asus" } },
          ],
          example: [
            { k: { ne: "लङ्काभन्दा पूर्व", en: "east of Lanka" }, v: "10°" },
            { k: { ne: "असु", en: "asus" }, v: "600" },
            { k: { ne: "सूर्यको गति", en: "Sun's motion" }, v: "59′" },
            { k: { ne: "५९ × ६०० ÷ २१६००", en: "59 × 600 ÷ 21600" }, v: "1.64′" },
          ],
          result: {
            ne: "शोधन = **१′ ३८″**, र पूर्वमा यो *घटाइन्छ* — सूर्योदय लङ्काभन्दा अघि भएकाले। पश्चिममा जोडिन्छ।",
            en: "The correction is **1′ 38″**, and in the east it is *subtracted* — sunrise there is earlier than at Lanka. In the west it is added.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "*उदयान्तर* अर्को सानो शोधन हो। मध्यम दिन सधैँ उस्तै लामो हुँदैन, किनकि सूर्य विषुवत्मा होइन क्रान्तिवृत्तमा हिँड्छ र ऊ एकनासले पनि हिँड्दैन। मध्यम सूर्यको विषुवांशका असु र उसको देशान्तरका कलाको फरकलाई दैनिक गतिले गुणा गरेर दिनका असुले भाग गर्दा यही शोधन कलामा आउँछ। सूर्यको मन्द फलबाट आउने भाग पनि यही परिवारको हो: मन्द फल ऋणात्मक हुँदा वास्तविक सूर्योदय मध्यमभन्दा अघि पर्छ।",
            en: "The *udayantara* is the other small correction. A mean day is not always the same length, because the Sun walks the ecliptic rather than the equator, and he does not walk evenly. The difference between the asus of the mean Sun's right ascension and the minutes of his longitude, multiplied by the daily motion and divided by the asus in a day, is this correction in minutes. The part that comes from the Sun's manda phala belongs to the same family: when the manda phala is subtractive, true sunrise falls before mean sunrise.",
          },
        },
      ],
    },
    {
      title: { ne: "ज्या — भुज र कोटि", en: "The sine — bhuja and koti" },
      eyebrow: "Goladhyaya V.1–6",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "स्पष्ट स्थान निकाल्नुअघि गोलाध्यायले *ज्या* सिकाउँछ। कुनै चापको भुजज्या आधार हो, कोटिज्या त्रिज्या र आधारको वर्गान्तरको वर्गमूल हो। तीन वटा बीउबाट आधा-आधा चाप काट्दै एउटा पादमा ३, ६, १२, २४ ज्या बनाइन्छ।",
            en: "Before the true place, the Goladhyaya teaches the *sine*. The bhuja-jya of an arc is the base, and the koti-jya is the square root of the difference of the squares of the radius and the base. From three seeds, halving the arc again and again, a quadrant is filled with 3, 6, 12, then 24 sines.",
          },
        },
        {
          kind: "diagram",
          id: "ss-sine-circle",
          caption: {
            ne: "त्रिज्या ३४३८′। ३०° को भुजज्या आधा त्रिज्या हो। कोटिज्या बाँकी उभ्या रेखा हो। उक्त ज्या भनेको धनुषको बाण हो।",
            en: "Radius 3438′. The bhuja-jya of 30° is half the radius. The koti-jya is the upright that remains. The versed sine is the arrow of the bow.",
          },
        },
        {
          kind: "calc",
          rule: [
            { ne: "ज्या ३०° = त्रिज्या ÷ `२`", en: "sin 30° = radius ÷ `2`" },
            { ne: "ज्या ४५° = √(त्रिज्या² ÷ `२`)", en: "sin 45° = √(radius² ÷ `2`)" },
            { ne: "ज्या ६०° = √(त्रिज्या² − ज्या ३०°²)", en: "sin 60° = √(radius² − sin 30°²)" },
          ],
          where: [
            { sym: "R", is: { ne: "३४३८′ — पुस्तकले कक्षा शोधनमा यही त्रिज्या लेखेको छ", en: "3438′ — the radius the book uses when it corrects the orbit" } },
          ],
          example: [
            { k: { ne: "३४३८ ÷ २", en: "3438 ÷ 2" }, v: "1719′" },
            { k: { ne: "३४३८ ÷ √२", en: "3438 ÷ √2" }, v: "2431′" },
            { k: { ne: "√(३४३८² − १७१९²)", en: "√(3438² − 1719²)" }, v: "2977′" },
          ],
          result: {
            ne: "तीन बीउ: **१७१९′, २४३१′, २९७७′**। आधा चापको ज्या निकाल्न पुस्तक भन्छ — ज्या र उत्क्रमज्याको वर्गको जोडको आधाको वर्गमूल। यही तीनबाट २४ ज्या भरिन्छन्।",
            en: "The three seeds: **1719′, 2431′, 2977′**. For the sine of half an arc the book says: the square root of half the sum of the squares of the sine and the versed sine. Those three seeds fill all 24 sines.",
          },
        },
      ],
    },
    {
      title: { ne: "मध्यमबाट स्पष्ट — मन्द फल", en: "From mean to true — the manda phala" },
      eyebrow: "Goladhyaya V.7–29",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "राशिचक्रको केन्द्र पृथ्वीको केन्द्र हो। ग्रह घुम्ने वृत्तको केन्द्र त्यहाँ पर्दैन। त्यसैले पृथ्वीमा बसेको मान्छेले ग्रहलाई मध्यम स्थानमा देख्दैन। त्यो फरक *भुजफल* हो, र सूर्य तथा चन्द्रमाका लागि यही एउटा शोधन नै स्पष्ट स्थान हो।",
            en: "The centre of the zodiac is the centre of the Earth. The centre of the circle a planet revolves in is not. So an observer on Earth does not find the planet at its mean place. That difference is the *bhuja phala*, and for the Sun and the Moon this one correction is already the true place.",
          },
        },
        {
          kind: "diagram",
          id: "ss-manda",
          caption: {
            ne: "कोण चित्रमा ठूलो छ, ताकि देखियोस्। गणनाले निस्केको फल ६७′ हो, अर्थात् एक डिग्रीभन्दा अलि बढी।",
            en: "The angle is drawn large enough to see. The sum itself comes out at 67′, a little over one degree.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "अनुपात पुस्तकको आफ्नै हो। समकेन्द्र वृत्तको त्रिज्या र त्यहाँको केन्द्रज्याको अनुपात, मन्द परिधिसँग, भुजफल दिन्छ। केन्द्र मन्दोच्चबाट नापिन्छ। मेषादि आधा (०° देखि १८०°) मा फल *घटाइन्छ* — मन्दोच्च पार गरेपछि स्पष्ट ग्रह मध्यमभन्दा पछाडि हुन्छ।",
            en: "The proportion is the book's own. The radius of the concentric is to the sine of the kendra as the manda periphery is to the bhuja phala. The kendra is measured from the mandocca. In the first half, from 0° to 180°, the phala is *subtracted* — once past the apogee the true planet lags the mean.",
          },
        },
        {
          kind: "calc",
          rule: [
            {
              ne: "भुजफल = ज्या(केन्द्र) × मन्द परिधि ÷ `३६०`",
              en: "bhuja phala = sine(kendra) × manda periphery ÷ `360`",
            },
            {
              ne: "स्पष्ट = मध्यम − भुजफल, जब केन्द्र ०° र १८०° को बीचमा छ",
              en: "true = mean − bhuja phala, while the kendra is between 0° and 180°",
            },
          ],
          where: [
            { sym: "ज्या ३०°", is: { ne: "१७१९′", en: "1719′" } },
            { sym: "मन्द परिधि", is: { ne: "१४° — अनुपात देखाउन लिइएको सूर्यको परिधि; नाप गणिताध्यायबाट आउँछ", en: "14° — the Sun's periphery used so the proportion can be seen; the measure comes from the Ganitadhyaya" } },
          ],
          example: [
            { k: { ne: "मन्दोच्च", en: "mandocca" }, v: "78°" },
            { k: { ne: "मध्यम सूर्य", en: "mean Sun" }, v: "108°" },
            { k: { ne: "केन्द्र", en: "kendra" }, v: "30°" },
            { k: { ne: "१७१९ × १४", en: "1719 × 14" }, v: "24066" },
            { k: { ne: "२४०६६ ÷ ३६०", en: "24066 ÷ 360" }, v: "66.9′" },
          ],
          result: {
            ne: "भुजफल = **१° ७′**। स्पष्ट सूर्य = १०८° − १° ७′ = **१०६° ५३′**।",
            en: "The bhuja phala is **1° 7′**. The true Sun is 108° − 1° 7′ = **106° 53′**.",
          },
        },
      ],
    },
    {
      title: { ne: "शीघ्र फल र वक्री गति", en: "The shighra phala and retrograde motion" },
      eyebrow: "Goladhyaya V.24–34",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सूर्य र चन्द्रमा मन्द फलले नै स्पष्ट हुन्छन्। मंगल, बुध, बृहस्पति, शुक्र र शनिको मन्द स्पष्ट स्थान पृथ्वीको केन्द्रबाट होइन, अर्को ठाउँबाट देखिन्छ। त्यसैले दोस्रो वृत्त चाहिन्छ — *शीघ्र* — र दोस्रो फल।",
            en: "The Sun and the Moon are true once the manda phala is applied. For Mars, Mercury, Jupiter, Venus and Saturn the manda-corrected place is seen not from the Earth's centre but from another point. So a second circle is required — the *shighra* — and a second phala.",
          },
        },
        {
          kind: "diagram",
          id: "ss-shighra",
          caption: {
            ne: "शीघ्र वृत्तको नजिकको छेउमा ग्रह पछाडि हिँडेको देखिन्छ। त्यो पछिल्तिरको चाल मध्यम चालभन्दा छिटो हुँदा ग्रह वक्री हुन्छ।",
            en: "On the near side of the shighra circle the planet is seen moving backward. When that backward step outruns the mean motion, the planet is retrograde.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "मंगल, बृहस्पति, शनि", en: "Mars, Jupiter, Saturn" },
              p: {
                ne: "मन्द वृत्तमा उनीहरूको आफ्नै परिक्रमा हुन्छ। शीघ्रोच्च भने सूर्यसँगै घुम्छ।",
                en: "The revolution in the manda circle is their own. The shighrochcha revolves with the Sun.",
              },
            },
            {
              h: { ne: "बुध र शुक्र", en: "Mercury and Venus" },
              p: {
                ne: "मन्द वृत्त सूर्यसँगै घुम्छ। शीघ्रोच्चको परिक्रमा नै उनीहरूको आफ्नै परिक्रमा हो।",
                en: "The manda circle revolves with the Sun. The revolutions of the shighrochcha are their own revolutions.",
              },
            },
          ],
        },
        {
          kind: "calc",
          caption: { ne: "वक्री कहिले देखिन्छ", en: "When retrogression appears" },
          rule: [
            {
              ne: "देखिने गति = मध्यम अघिल्तिरको चाल − शीघ्र वृत्तको पछिल्तिरको चाल",
              en: "apparent motion = forward mean motion − backward motion on the shighra circle",
            },
          ],
          example: [
            { k: { ne: "मन्द स्पष्ट, अघि", en: "manda-true, forward" }, v: "40′ / day" },
            { k: { ne: "नजिकको छेउ, पछाडि", en: "near side, backward" }, v: "55′ / day" },
            { k: { ne: "४० − ५५", en: "40 − 55" }, v: "−15′ / day" },
          ],
          result: {
            ne: "ऋणात्मक गति भनेको **वक्री** हो। पुस्तकको चित्रमा ग्रह तल्लो चापमा हुँदा यही देखिन्छ; माथिल्लो चापमा चाल सोझो र छिटो देखिन्छ। यी ४०′ र ५५′ चित्रका हुन्, कुनै एक दिनको पञ्चाङ्ग होइनन्।",
            en: "A negative rate is **retrograde** motion. That is what the book's figure shows while the planet is on the lower arc; on the upper arc the motion looks direct and fast. The 40′ and 55′ belong to the picture, not to one day's panchanga.",
          },
        },
      ],
    },
    {
      title: { ne: "ग्रहण — छाया र लम्बन", en: "The eclipse — shadow and parallax" },
      eyebrow: "Goladhyaya VIII.2–5",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पूर्णिमामा पृथ्वीको छायाले चन्द्रमालाई ढाक्छ। औंसीमा चन्द्रमाले सूर्यलाई ढाक्न सक्छ। दुवैमा चन्द्र पातको नजिक हुनुपर्छ, नत्र उचाइ मिल्दैन। अनि एउटा कुरा सूर्य ग्रहणमा मात्र जोडिन्छ: *लम्बन*।",
            en: "At full moon the Earth's shadow covers the Moon. At new moon the Moon can cover the Sun. Both require the Moon to be near her node, or the heights do not meet. And one thing is added for a solar eclipse only: *parallax*.",
          },
        },
        {
          kind: "diagram",
          id: "ss-eclipse-cone",
          caption: {
            ne: "बायाँ: चन्द्रमा पूर्वतिर हिँड्दै शङ्कु छायामा पस्छ, पूर्वी किनार पहिले अँध्यारो हुन्छ। दायाँ: केन्द्रको दर्शकले सूर्य ढाकिएको देख्छ, सतहको दर्शकले चन्द्रमालाई तल झरेको देख्छ।",
            en: "Left: the Moon walks east into the conical shadow, and her eastern limb darkens first. Right: an observer at the centre sees the Sun covered; an observer on the surface sees the Moon depressed.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "चन्द्र ग्रहण", en: "Lunar eclipse" },
              p: {
                ne: "चन्द्रमा साँच्चै छायाभित्र पस्छ। छाया र चन्द्रमा पृथ्वीबाट उही टाढा हुन्, त्यसैले लम्बन चाहिँदैन। जसको क्षितिजमाथि छ, उसले उही ग्रहण देख्छ।",
                en: "The Moon really enters the shadow. The shadow and the Moon are at the same distance from Earth, so parallax is not required. Everyone who has her above the horizon sees the same eclipse.",
              },
            },
            {
              h: { ne: "सूर्य ग्रहण", en: "Solar eclipse" },
              p: {
                ne: "पृथ्वीको केन्द्रमा बसेको मान्छेले सूर्यलाई चन्द्रमाले ढाकेको देख्न सक्छ, सतहमा बसेकोले चन्द्रमालाई दृष्टि रेखाभन्दा तल देख्छ। त्यसैले देशान्तर र विक्षेप दुवैको लम्बन चाहिन्छ।",
                en: "Someone at the Earth's centre may see the Moon cover the Sun, while someone on the surface sees the Moon below the line of sight. Parallax in both longitude and latitude is required.",
              },
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "सूर्य ठूलो छ, पृथ्वी सानो। त्यसैले छाया शङ्कु हुन्छ र टुप्पोमा साँघुरिन्छ, अनि चन्द्रमाको कक्षभन्दा परसम्म पुग्छ। चन्द्रमा पूर्वतिर हिँड्दै त्यो छायामा पस्ने भएकाले उसको *पूर्वी* किनार पहिले अँध्यारो हुन्छ र पश्चिमी किनार अन्तिममा निस्कन्छ।",
            en: "The Sun is vast and the Earth small, so the shadow is a cone, narrowing to a point, and it reaches well beyond the Moon's orbit. Because the Moon walks east into that shadow, her *eastern* limb darkens first and her western limb is the last to come out.",
          },
        },
        {
          kind: "list",
          ordered: true,
          items: [
            {
              ne: "पूर्णिमा हो, र चन्द्रमा पात नजिक छ भने चन्द्र ग्रहण जाँच्ने ठाउँ यही हो। लम्बन जोड्नु पर्दैन।",
              en: "If it is full moon and the Moon is near her node, this is where a lunar eclipse is tested. No parallax is added.",
            },
            {
              ne: "औंसी हो, र चन्द्रमा पात नजिक छ भने सूर्य ग्रहण सम्भव छ — तर सतहको दर्शकका लागि लम्बन जोडेपछि मात्र।",
              en: "If it is new moon and the Moon is near her node, a solar eclipse is possible — but only after parallax is added for an observer on the surface.",
            },
          ],
        },
      ],
    },
    {
      title: { ne: "अब के निकाल्न सकिन्छ", en: "What you can now compute" },
      eyebrow: "The order of the work",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "बाह्र पृष्ठले एउटा क्रम बनायो। यही क्रम गोलाध्यायको गणना क्रम हो: पहिले दिन र मास, त्यसपछि अहर्गण, त्यसपछि ज्या, त्यसपछि स्पष्ट स्थान, अनि ग्रहण।",
            en: "Twelve pages made one order. It is the Goladhyaya's order of work: first the day and the months, then the ahargana, then the sine, then the true place, and then the eclipse.",
          },
        },
        {
          kind: "list",
          ordered: true,
          items: [
            { ne: "नाक्षत्र दिन ६० घटी। सौर दिनमा सूर्यको दैनिक कला जति असु थपिन्छ — विषुवमा लगभग १० पल।", en: "A sidereal day is 60 ghatis. A solar day adds as many asus as the Sun's daily minutes — about 10 pala on the equator." },
            { ne: "सौर मास वर्षको बाह्रौँ भाग। चान्द्र मास २९ दिन ३१ घटी ५० पल। फरकबाट अधिक मास ३२ सौर मास १६ दिनमा।", en: "A solar month is a twelfth of the year. A lunar month is 29 days 31 ghati 50 pala. From the gap, an adhik month falls in 32 solar months and 16 days." },
            { ne: "अवम लगभग ६४ तिथिमा एक। अहर्गणमा दुवै बाँकी छोडिन्छ, किनकि एउटा सङ्क्रान्ति अघि पर्छ र अर्को सूर्योदय पछि।", en: "An avama falls about once in 64 tithis. Both remainders are dropped from the ahargana, because one falls before the sankranti and the other after sunrise." },
            { ne: "पूर्व १०° मा सूर्यको देशान्तर शोधन १′ ३८″ घट्छ।", en: "Ten degrees east, the Sun's deshantara is 1′ 38″ subtracted." },
            { ne: "ज्याका तीन बीउ १७१९′, २४३१′, २९७७′। मन्द फल = ज्या(केन्द्र) × परिधि ÷ ३६०।", en: "The three sine seeds are 1719′, 2431′, 2977′. The manda phala is sine(kendra) × periphery ÷ 360." },
            { ne: "पाँच ग्रहमा शीघ्र फल थपिन्छ। नजिकको छेउको पछिल्तिरको चाल मध्यम चालभन्दा छिटो हुँदा वक्री देखिन्छ।", en: "The five planets take a shighra phala as well. When the backward step on the near side outruns the mean motion, the planet is seen retrograde." },
            { ne: "चन्द्र ग्रहणमा लम्बन छैन। सूर्य ग्रहणमा सतहको दर्शकका लागि लम्बन चाहिन्छ।", en: "A lunar eclipse needs no parallax. A solar eclipse needs parallax for an observer on the surface." },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "यही पुस्तक अघि बढेर उदयको *चर* (क्षितिज र षड्श रेखाको बीचको चाप), यन्त्र, र ऋतु पनि देखाउँछ। ती गणना [[calc-sunrise|सूर्योदय]] र [[why-seasons|ऋतु]] का पृष्ठमा आधुनिक रूपमा छन्। मन्द र शीघ्रको अर्थ [[ancient-planetary-motion|परम्परागत ग्रहगति]] मा छ, र मयासुरको ग्रन्थको इतिहास [[surya-siddhanta|मूल ग्रन्थ]] मा।",
            en: "The same book goes on to the *chara* of rising — the arc between the horizon and the six-o'clock line — and to instruments and the seasons. Those calculations are in modern form on the pages for [[calc-sunrise|sunrise]] and [[why-seasons|the seasons]]. What the manda and shighra mean is in [[ancient-planetary-motion|traditional planetary motion]], and the history of Mayasura's text is in [[surya-siddhanta|the founding texts]].",
          },
        },
        {
          kind: "note",
          text: {
            ne: "कुनै पनि पृष्ठ एक्लै पढ्न मिल्छ। `#page-9` जस्तो ठेगानाले तपाईं सीधै त्यो गणनामा फर्किन सक्नुहुन्छ।",
            en: "Any page can be read on its own. An address such as `#page-9` brings you straight back to that calculation.",
          },
        },
      ],
    },
  ],
};
