import type { ArticleData } from "../../article-schema";

export const whatIsADay: ArticleData = {
  slug: "what-is-a-day",
  seeAlso: ["earth-rotation-day", "sauramana", "why-location-matters", "solar-year"],
  sections: [
    {
      title: { ne: "एक फेरो घुम्नु दिन होइन", en: "One turn is not a day" },
      eyebrow: "The extra turn",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पृथ्वी आफ्नो अक्षमा एक पूरा फेरो घुम्न `२३` घण्टा `५६` मिनेट लिन्छ। तर हाम्रो दिन `२४` घण्टाको हुन्छ। यी `४` मिनेट कहाँबाट आउँछन्?",
            en: "Earth takes `23` hours `56` minutes to turn once on its axis. But our day is `24` hours long. Where do those extra `4` minutes come from?",
          },
        },
        {
          kind: "para",
          text: {
            ne: "किनभने पृथ्वी घुम्दै मात्र छैन — सँगसँगै सूर्यको वरिपरि सर्दै पनि छ। एक फेरो पूरा हुँदासम्म पृथ्वी आफ्नो कक्षमा अलिकति अगाडि बढिसकेको हुन्छ, त्यसैले सूर्यलाई फेरि उही ठाउँमा ल्याउन **अलिकति बढी घुम्नुपर्छ**।",
            en: "Because Earth is not only turning — it is also moving along its orbit at the same time. By the time one turn is complete, Earth has carried on a little way around the Sun, so it must turn **a little further** to bring the Sun back to the same place in the sky.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "नाक्षत्र दिन", en: "The sidereal day" },
              p: {
                ne: "*ताराहरूको* सापेक्ष एक पूरा फेरो — `२३` घण्टा `५६` मिनेट। यो सधैँ उही हुन्छ।",
                en: "One full turn measured against the *fixed stars* — `23`h `56`m. This never varies.",
              },
            },
            {
              h: { ne: "सौर दिन", en: "The solar day" },
              p: {
                ne: "~सूर्य~ फेरि उही दिशामा आउन लाग्ने समय — एक फेरो **जोड अलिकति**।",
                en: "The time for the ~Sun~ to return to the same direction — one turn **plus a bit**.",
              },
            },
            {
              h: { ne: "किन ठ्याक्कै ४ मिनेट", en: "Why about four minutes" },
              p: {
                ne: "वर्षमा `३६५` सौर दिन छन् भने त्यही अवधिमा फेरो `३६६` लाग्छन् — एक बढी।",
                en: "A year holds `365` solar days but `366` turns — exactly one more.",
              },
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "यसैले वर्षमा नाक्षत्र दिनको सङ्ख्या सौर दिनभन्दा **ठ्याक्कै एक बढी** हुन्छ — कुनै संयोग होइन, यो त्यही एक परिक्रमाको हिसाब हो।",
            en: "So a year always contains **exactly one more** sidereal day than solar days — not a coincidence, but the single orbit itself, counted.",
          },
        },
        {
          kind: "diagram",
          id: "earth-rotation",
          caption: {
            ne: "एक फन्को पूरा गर्न पृथ्वीलाई २३ घण्टा ५६ मिनेट लाग्छ; सूर्य फेरि उही ठाउँमा आउन ~४ मिनेट थप।",
            en: "Earth takes 23h 56m for one turn; bringing the Sun back to the same place takes ~4 minutes more.",
          },
        },
      ],
    },
    {
      title: { ne: "आफैँ खेलेर हेर्नुहोस्", en: "Take it apart yourself" },
      eyebrow: "The playground",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "यो कुरा शब्दमा भन्दा हेरेर बुझ्न सजिलो छ। तलको नमुनामा वर्षमा जम्मा केही दिन मात्र राखिएको छ, त्यसैले “अलिकति बढी” ठूलो देखिन्छ।",
            en: "This is far easier to see than to say. The model below puts only a handful of days in a year, which blows that \"little bit further\" up until it is impossible to miss.",
          },
        },
        {
          kind: "list",
          items: [
            {
              ne: "**निलो चाप** ताराको सापेक्ष घुमाइ हो — नाक्षत्र दिन।",
              en: "The **blue arc** is rotation against the stars — the sidereal day.",
            },
            {
              ne: "**रातो चाप** माध्य सूर्यको सापेक्ष — घडीले मान्ने दिन।",
              en: "The **red arc** is measured against the mean sun — the day a clock keeps.",
            },
            {
              ne: "**पहेँलो चाप** साँचो सूर्यको सापेक्ष — घामले देखाउने दिन।",
              en: "The **gold arc** is measured against the true sun — the day a sundial shows.",
            },
            {
              ne: "बीचको ~फरक~ नै समयको समीकरण हो।",
              en: "The ~gap~ between the last two is the equation of time.",
            },
          ],
        },
      ],
    },
    {
      title: { ne: "घडी र घाम किन बाझिन्छन्", en: "Why the clock and the sundial disagree" },
      eyebrow: "Equation of time",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "त्यो “अलिकति बढी” स्थिर छैन। वर्षभरि यो घट्दै–बढ्दै जान्छ, र त्यसैले घामको समय घडीभन्दा कहिले अगाडि, कहिले पछाडि हुन्छ।",
            en: "That \"little bit further\" is not constant. It grows and shrinks across the year, which is why sundial time runs sometimes ahead of clock time and sometimes behind.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "यसका दुई कारण छन्, र दुवैलाई नमुनामा छुट्याएर हेर्न सकिन्छ।",
            en: "Two things cause it, and the playground can separate them.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "कक्ष वृत्त होइन", en: "The orbit is an ellipse" },
              p: {
                ne: "सूर्यको नजिक हुँदा पृथ्वी *छिटो* चल्छ, टाढा हुँदा *बिस्तारै* — वर्षमा एउटा लहर।",
                en: "Earth moves *faster* near the Sun and *slower* far from it — one wave per year.",
              },
            },
            {
              h: { ne: "अक्ष झुकेको छ", en: "The axis is tilted" },
              p: {
                ne: "सूर्य क्रान्तिवृत्तमा चल्छ तर घडीले विषुवत् रेखामा नाप्छ — वर्षमा दुइटा लहर।",
                en: "The Sun moves along the ecliptic while clocks measure along the equator — two waves per year.",
              },
            },
          ],
        },
        {
          kind: "formula",
          cards: [
            {
              big: "+१६",
              unit: { ne: "मिनेट", en: "min" },
              label: { ne: "कात्तिकको मध्यमा", en: "Around mid-Kartik" },
              desc: {
                ne: "घाम घडीभन्दा सबैभन्दा बढी अगाडि पुग्ने बिन्दु।",
                en: "The sundial's biggest lead over the clock.",
              },
            },
            {
              big: "−१४",
              unit: { ne: "मिनेट", en: "min" },
              label: { ne: "माघको अन्त्यतिर", en: "Around late Magh" },
              desc: {
                ne: "घाम घडीभन्दा सबैभन्दा बढी पछाडि पर्ने बिन्दु।",
                en: "The sundial's biggest lag behind the clock.",
              },
            },
            {
              big: "४",
              unit: { ne: "पटक", en: "times" },
              label: { ne: "वर्षमा शून्य", en: "Zero crossings a year" },
              desc: {
                ne: "जेठ, भदौ, पुष र चैतमा दुवै ठ्याक्कै मिल्छन्।",
                en: "In Jestha, Bhadra, Poush and Chaitra the two agree exactly.",
              },
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "यी दुई लहर जोडिँदा बन्ने आकृति नै **अनालेमा** हो — वर्षभरि हरेक दिन ठीक १२ बजे सूर्यको फोटो खिच्दा आकाशमा देखिने त्यही आठको अङ्क।",
            en: "The two waves added together are what draws the **analemma** — the figure-eight the Sun traces if you photograph it at clock noon every day for a year.",
          },
        },
      ],
    },
    {
      title: { ne: "पञ्चाङ्गमा यसको अर्थ", en: "What this means for the panchanga" },
      eyebrow: "Back to the calendar",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पात्रोको हरेक गणना कुनै न कुनै *दिन* मा अडेको हुन्छ — त्यसैले कुन दिन भन्ने कुराले फरक पार्छ।",
            en: "Every calculation in the calendar rests on some notion of a *day* — so which day it is matters.",
          },
        },
        {
          kind: "list",
          items: [
            {
              ne: "तिथि, वार र नक्षत्र ~सूर्योदय~ बाट गनिन्छन् — अर्थात् साँचो सौर दिनबाट, घडीको दिनबाट होइन।",
              en: "Tithi, vara and nakshatra are counted from ~sunrise~ — that is, from the true solar day, not the clock's day.",
            },
            {
              ne: "सूर्योदयको समय स्थानअनुसार फरक हुन्छ, र समयको समीकरणले त्यसलाई अझ सार्छ।",
              en: "Sunrise time varies by place, and the equation of time shifts it further still.",
            },
            {
              ne: "त्यसैले पञ्चाङ्ग बनाउन **अवलोकन स्थान** र **खगोलीय समय** दुवै चाहिन्छ।",
              en: "So building a panchanga needs both an **observer's location** and **astronomical time**.",
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "एउटा साधारण प्रश्न — “दिन के हो?” — को जवाफ खोज्दै जाँदा पात्रोका बाँकी सबै नियम आफैँ खुल्दै जान्छन्।",
            en: "Chase down one plain question — \"what is a day?\" — and the rest of the calendar's rules start to explain themselves.",
          },
        },
      ],
    },
  ],
};
