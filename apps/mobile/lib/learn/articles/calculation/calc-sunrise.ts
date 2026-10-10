import type { ArticleData } from "../../article-schema";

export const calcSunrise: ArticleData = {
  slug: "calc-sunrise",
  seeAlso: ["calc-sunset", "declination", "why-location-matters", "how-we-calculate"],
  sections: [
    {
      title: { ne: "सूर्योदय — “देखिनु” कहिले हो?", en: "Sunrise — when exactly does it count?" },
      eyebrow: "Defining the moment",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सूर्योदय गणना गर्नुअघि परिभाषा चाहिन्छ। सूर्यको **केन्द्र** क्षितिजमा आउँदा, कि **माथिल्लो किनारा** देखिँदा? र क्षितिज कहाँको — समुद्र सतहको कि तपाईं उभिएको ठाउँको?",
            en: "Before computing sunrise you need a definition. Is it when the Sun's **centre** meets the horizon, or when its **upper edge** appears? And whose horizon — sea level, or the one from where you stand?",
          },
        },
        {
          kind: "para",
          text: {
            ne: "मानक परिभाषा: **सूर्यको माथिल्लो किनारा वास्तविक क्षितिजमा देखा पर्ने क्षण**, वायुमण्डलीय अपवर्तन समेत गणना गरेर। वेदिक पात्रो यही प्रयोग गर्छ।",
            en: "The standard definition is **the instant the Sun's upper limb appears on the true horizon**, with atmospheric refraction accounted for. That is what Vedic Patro uses.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "बिम्बको अर्धव्यास", en: "The Sun's radius" },
              p: {
                ne: "सूर्य बिन्दु होइन — बिम्ब `~०.२७°` को हुन्छ, त्यसैले किनारा केन्द्रभन्दा अगाडि देखिन्छ।",
                en: "The Sun is not a point — its disc spans `~0.27°`, so the limb appears before the centre would.",
              },
            },
            {
              h: { ne: "वायुमण्डलीय अपवर्तन", en: "Atmospheric refraction" },
              p: {
                ne: "क्षितिजमा हावाले प्रकाश `~०.५७°` बङ्ग्याउँछ — सूर्य वास्तवमा तल हुँदै देखिन्छ।",
                en: "At the horizon the air bends light by `~0.57°` — the Sun is seen while still geometrically below.",
              },
            },
            {
              h: { ne: "क्षितिजको झुकाव", en: "Horizon dip" },
              p: {
                ne: "उचाइमा उभिँदा क्षितिज तल सर्छ — काठमाडौँ (`~१,४००` मि) मा सूर्योदय केही अगाडि हुन्छ।",
                en: "From altitude the horizon drops away — at Kathmandu's `~1,400` m the Sun rises slightly earlier.",
              },
            },
          ],
        },
        {
          kind: "diagram",
          id: "sunrise-vriddhi",
          caption: {
            ne: "सूर्योदयको क्षण स्थानसापेक्ष — अक्षांश, देशान्तर र उचाइ तीनैले सार्छ।",
            en: "The instant of sunrise is local — latitude, longitude and altitude all move it.",
          },
        },
      ],
    },
    {
      title: { ne: "आधारभूत सूत्र", en: "The underlying formula" },
      eyebrow: "Hour angle",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सिद्धान्ततः सूर्योदय **घण्टा कोण** बाट निस्कन्छ — अक्षांश र सूर्यको क्रान्ति दिइएपछि।",
            en: "In principle sunrise follows from the **hour angle**, once you have the latitude and the Sun's declination.",
          },
        },
        {
          kind: "calc",
          rule: [
            { ne: "cos(H) = ( sin(h₀) − sin(φ)·sin(δ) ) ÷ ( cos(φ)·cos(δ) )", en: "cos(H) = ( sin(h₀) − sin(φ)·sin(δ) ) ÷ ( cos(φ)·cos(δ) )" },
            { ne: "सूर्योदय = स्थानीय मध्याह्न − H", en: "sunrise = local noon − H" },
            { ne: "सूर्यास्त = स्थानीय मध्याह्न + H", en: "sunset = local noon + H" },
          ],
          where: [
            { sym: "φ", is: { ne: "स्थानको अक्षांश", en: "the observer's latitude" } },
            { sym: "δ", is: { ne: "सूर्यको क्रान्ति — वर्षभरि ±२३.४४° झुल्ने", en: "the Sun's declination, swinging ±23.44° through the year" } },
            { sym: "h₀", is: { ne: "−०.८३३° — सूर्यको बिम्ब र वायुमण्डलीय अपवर्तनको भत्ता", en: "−0.833° — the allowance for the Sun's disc and atmospheric refraction" } },
            { sym: "H", is: { ne: "घण्टा कोण — मध्याह्नदेखि उदय/अस्तसम्मको आधा दिन", en: "the hour angle — half a day, from noon out to rise or set" } },
          ],
          caption: {
            ne: "h₀ शून्य नभई ऋणात्मक हुनुले नै सूर्योदय ज्यामितीय क्षितिजभन्दा केही मिनेट अगाडि पार्छ।",
            en: "That h₀ is negative rather than zero is exactly what puts sunrise a few minutes ahead of the geometric horizon.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "तर यो सूत्र **अनुमानित** हो। सूर्यको क्रान्ति दिनभरि बदलिन्छ, त्यसैले “सूर्योदयको बेलाको क्रान्ति” जान्न सूर्योदयको समय नै चाहिन्छ — वृत्ताकार निर्भरता। यसैले पुनरावृत्ति आवश्यक हुन्छ।",
            en: "But that formula is an **approximation**. The Sun's declination changes through the day, so knowing \"the declination at sunrise\" requires knowing sunrise — a circular dependency. Hence iteration.",
          },
        },
      ],
    },
    {
      title: { ne: "वेदिक पात्रोले के गर्छ", en: "What Vedic Patro actually does" },
      eyebrow: "Swiss Ephemeris",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "सूत्र आफैँ लागू गर्नुको सट्टा engine ले **Swiss Ephemeris** को `rise_trans_true_hor` प्रयोग गर्छ — जसले वास्तविक क्षितिज, अपवर्तन र बिम्ब सबै एकैसाथ सम्हाल्छ।",
            en: "Rather than applying the formula itself, the engine calls **Swiss Ephemeris**'s `rise_trans_true_hor`, which handles the true horizon, refraction and the disc together.",
          },
        },
        {
          kind: "list",
          items: [
            {
              ne: "गणना **स्थानीय मध्यरात**बाट सुरु हुन्छ — अवलोकनकर्ताको समय क्षेत्रमा, र त्यसलाई जुलियन दिनमा बदलिन्छ।",
              en: "The search starts at **local midnight** in the observer's timezone, converted to a Julian Day.",
            },
            {
              ne: "इनपुट: देशान्तर, अक्षांश, **उचाइ**, वायुमण्डलीय **चाप** र **तापक्रम** — अपवर्तन यिनैले तय गर्छ।",
              en: "Inputs: longitude, latitude, **altitude**, and atmospheric **pressure** and **temperature** — which set the refraction.",
            },
            {
              ne: "उचाइबाट **क्षितिज झुकाव** निकालेर छुट्टै पठाइन्छ, ताकि पहाडी स्थानको सूर्योदय सही आओस्।",
              en: "The **horizon dip** is derived from altitude and passed separately, so hill locations get an accurate sunrise.",
            },
          ],
        },
        {
          kind: "note",
          text: {
            ne: "यही कारण वेदिक पात्रोमा स्थान छान्दा अक्षांश–देशान्तर मात्र होइन, **उचाइ र समय क्षेत्र** पनि चाहिन्छ। सूर्योदय पञ्चाङ्गको दिन–सीमा भएकाले यसको शुद्धताले तिथि, वार र पर्वको दिन सबै तय गर्छ।",
            en: "This is why choosing a location in Vedic Patro needs altitude and timezone, not just latitude and longitude. Sunrise is the panchanga's day boundary, so its accuracy decides the tithi, the vāra and the day a festival lands on.",
          },
        },
      ],
    },
  ],
};
