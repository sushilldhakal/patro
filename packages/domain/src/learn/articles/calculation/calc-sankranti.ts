import type { ArticleData } from "../../article-schema";

export const calcSankranti: ArticleData = {
  slug: "calc-sankranti",
  seeAlso: ["sankranti", "solar-longitude", "how-we-calculate", "calc-tithi"],
  sections: [
    {
      title: { ne: "समस्या — कोण कहिले ठ्याक्कै ३०° को गुणाङ्क हुन्छ?", en: "The problem — when is the angle exactly a multiple of 30°?" },
      eyebrow: "Root finding",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सङ्क्रान्ति खोज्नु भनेको **मूल खोज्नु** हो। हामीसँग एउटा फलन छ — कुनै क्षणमा सूर्यको निरयन देशान्तर — र हामी त्यो `३०°` को गुणाङ्क छुने क्षण खोज्दै छौँ।",
            en: "Finding a sankranti is a **root-finding** problem. We have a function — the Sun's sidereal longitude at an instant — and we want the moment it crosses a multiple of `30°`.",
          },
        },
        {
          kind: "calc",
          rule: [
            { ne: "f(t) = सूर्यको निरयन देशान्तर(t) − लक्ष्य कोण", en: "f(t) = sidereal solar longitude(t) − target degree" },
            { ne: "सङ्क्रान्ति = त्यो t जहाँ f(t) = `०`", en: "the sankranti is the t at which f(t) = `0`" },
          ],
          where: [
            { sym: "t", is: { ne: "समय — सामान्यतया जुलियन दिनमा", en: "time, usually as a Julian day" } },
            { sym: "0°", is: { ne: "मेष सङ्क्रान्ति — बैशाख १", en: "Mesha Sankranti — बैशाख १" } },
            { sym: "270°", is: { ne: "मकर सङ्क्रान्ति — माघ १", en: "Makara Sankranti — माघ १" } },
          ],
          result: {
            ne: "सूर्यको देशान्तर एकनासले बढ्ने भएकाले f(t) एकदिशीय हुन्छ — त्यसैले जरा एउटै हुन्छ र **द्विभाजन** वा **न्यूटन** विधिले केही पुनरावृत्तिमै सेकेन्डको शुद्धतामा भेटिन्छ।",
            en: "Because solar longitude increases monotonically, f(t) crosses zero exactly once — so **bisection** or **Newton's method** finds the root to second-level precision in a handful of iterations.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "कोण `३६०°` मा बेरिने हुनाले सिधै घटाउ काम लाग्दैन — `३५९°` र `१°` बीचको फरक `−३५८°` होइन, `+२°` हो। त्यसैले engine ले **कोणीय त्रुटि** गणना गर्छ, जसले यो बेरिने समस्या सम्हाल्छ।",
            en: "Because angles wrap at `360°`, a plain subtraction fails — the gap between `359°` and `1°` is `+2°`, not `−358°`. The engine therefore computes an **angular error** that handles the wrap.",
          },
        },
      ],
    },
    {
      title: { ne: "ब्रेन्ट विधि, द्विभाजन सहित", en: "Brent's method, with bisection behind it" },
      eyebrow: "How the engine solves it",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "वेदिक पात्रोको इन्जिनले **ब्रेन्टको विधि** प्रयोग गर्छ — द्विभाजनको निश्चित अभिसरण र सेकेन्ट विधिको गतिलाई जोड्ने एक मानक अङ्कगणितीय विधि।",
            en: "The Vedic Patro engine uses **Brent's method** — a standard numerical technique combining the guaranteed convergence of bisection with the speed of the secant method.",
          },
        },
        {
          kind: "list",
          items: [
            {
              ne: "पहिले एउटा **कोष्ठ** (bracket) चाहिन्छ — दुई क्षण जहाँ फलनको चिन्ह विपरीत होस्, अर्थात् बीचमा सङ्क्रान्ति निश्चित छ।",
              en: "First a **bracket** is needed — two instants where the function has opposite signs, guaranteeing a crossing between them.",
            },
            {
              ne: "चिन्ह विपरीत नभेटिए engine **द्विभाजनमा फर्किन्छ** — ढिलो, तर सधैँ काम गर्ने।",
              en: "If opposite signs are not found the engine **falls back to bisection** — slower, but always works.",
            },
            {
              ne: "पुनरावृत्ति **`६०` सेकेन्ड**को सहनशीलतामा रोकिन्छ; JD-आधारित संस्करणले `१` सेकेन्डसम्म जान्छ।",
              en: "Iteration stops at a tolerance of **`60` seconds**; the JD-based variant refines to `1` second.",
            },
            {
              ne: "अधिकतम `५०`–`६०` पुनरावृत्ति — व्यवहारमा दर्जनभन्दा कम लाग्छ।",
              en: "A cap of `50`–`60` iterations, though in practice it converges in fewer than a dozen.",
            },
          ],
        },
        {
          kind: "para",
          text: {
            ne: "हरेक पुनरावृत्तिमा त्यो क्षणको सूर्यको निरयन देशान्तर Swiss Ephemeris बाट निकालिन्छ। अर्थात् गणना **एउटै सूत्र समाधान** होइन — यो पटक–पटक आकाश सोध्ने प्रक्रिया हो।",
            en: "Each iteration asks Swiss Ephemeris for the Sun's sidereal longitude at that instant. So the computation is not the solving of a single formula — it is a process of repeatedly interrogating the sky.",
          },
        },
      ],
    },
    {
      title: { ne: "क्षणबाट गतेसम्म", en: "From an instant to a gate" },
      eyebrow: "The last step",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सङ्क्रान्तिको ठ्याक्कै क्षण भेटिएपछि अन्तिम चरण बाँकी रहन्छ — त्यसलाई **कुन गतेमा राख्ने**।",
            en: "Once the exact instant is in hand one step remains — deciding **which gate it belongs to**.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "यसका लागि क्षणलाई स्थानीय समयमा बदल्नुपर्छ, र नेपालका लागि त्यो `Asia/Kathmandu` हो — **ऐतिहासिक अफसेट सहित**, किनभने नेपालको समय क्षेत्र सधैँ `+०५:४५` थिएन।",
            en: "That means converting the instant to local time, which for Nepal is `Asia/Kathmandu` — **with its historical offsets**, because Nepal's zone was not always `+05:45`.",
          },
        },
        {
          kind: "table",
          caption: { ne: "नेपालको समय क्षेत्रका तीन युग", en: "The three eras of Nepali civil time" },
          headers: [
            { ne: "अवधि", en: "Period" },
            { ne: "अफसेट", en: "Offset" },
            { ne: "के थियो", en: "What it was" },
          ],
          rows: [
            ["≤ 1919", "UTC+05:41:16", { ne: "काठमाडौँको माध्य सौर समय", en: "Kathmandu mean solar time" }],
            ["1920–1985", "UTC+05:30", { ne: "भारतीय मानक समय", en: "Indian Standard Time" }],
            ["≥ 1986", "UTC+05:45", { ne: "नेपाली मानक समय", en: "Nepal Standard Time" }],
          ],
        },
        {
          kind: "note",
          text: {
            ne: "पुराना बि.सं. मितिको गणना गर्दा यो फरक पर्छ — `१९८५` अघिको सङ्क्रान्ति `+०५:४५` मान्दा `१५` मिनेट चुक्छ, र त्यो मध्यरातको सिमानामा परे **गते नै एक दिन फरक** हुन सक्छ।",
            en: "This matters for older BS dates — assuming `+05:45` before `1985` is off by `15` minutes, and near the midnight boundary that can shift the **gate by a whole day**.",
          },
        },
      ],
    },
  ],
};
