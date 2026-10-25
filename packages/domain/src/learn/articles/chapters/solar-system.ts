import type { ArticleData } from "../../article-schema";

/** Chapter text — written once, read by the website and the app. */
export const solarSystem: ArticleData = {
  slug: "solar-system",
  seeAlso: ["axial-tilt", "lunar-month", "tithi"],
  sections: [
    {
      title: {
        ne: "सूर्य केन्द्र, पृथ्वी परिक्रमा",
        en: "Sun at the centre, Earth orbiting",
      },
      eyebrow: "Heliocentric view",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "हाम्रो सौर्यमण्डलमा पृथ्वी सूर्यको वरिपरि झन्डै **३६५.२५ दिन** मा एक फेरो लगाउँछ — यही परिक्रमाले *वर्ष* बन्छ। ऋतु किन फेरिन्छन् भन्ने कुरा झुकावको हो, [[axial-tilt|अक्ष झुकाव]] मा।",
            en: "In our solar system the Earth completes one orbit around the Sun in about **365.25 days** — this revolution makes the *year*. Why the seasons change is the tilt, in [[axial-tilt|axial tilt]].",
          },
        },
        {
          kind: "diagram",
          id: "earth-orbit",
        },
      ],
    },
    {
      title: {
        ne: "चन्द्रको गति",
        en: "Lunar motion",
      },
      eyebrow: "Lunar motion",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "चन्द्रमा पृथ्वीको वरिपरि झन्डै **२७.३ दिन** (नाक्षत्र मास) मा एक फेरो लगाउँछ, तर सूर्यसमेत सर्ने हुनाले एक **औंसीदेखि अर्को औंसी** सम्म ∼२९.५ दिन लाग्छ (चान्द्र मास)। यी दुई लम्बाइ [[lunar-month|चान्द्र मास]] मा छन्; तिथि र पक्ष [[tithi|तिथि]] मा।",
            en: "The Moon completes one orbit of the Earth in about **27.3 days** (sidereal month), but because the Sun also moves, one **new moon to the next** takes ∼29.5 days (synodic month). Those two lengths are [[lunar-month|the lunar month]]; tithi and paksha are [[tithi|tithi]].",
          },
        },
      ],
    },
    {
      title: {
        ne: "चन्द्रका कला",
        en: "Phases of the Moon",
      },
      eyebrow: "Phases of the Moon",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "चन्द्रमा आफैं प्रकाश दिने वस्तु होइन। *सूर्यको प्रकाश* परावर्तित गरेर चम्किन्छ। कला कसरी तिथि र पक्ष बन्छन् भन्ने [[tithi|तिथि]] र [[lunar-month|चान्द्र मास]] मा छ।",
            en: "The Moon does not give off its own light. It shines by reflecting *the Sun's light*. How the phases become tithi and paksha is in [[tithi|tithi]] and [[lunar-month|the lunar month]].",
          },
        },
        {
          kind: "diagram",
          id: "moon-phases",
          heading: {
            ne: "मुख्य चरणहरू",
            en: "Main phases",
          },
          caption: {
            ne: "औंसीमा चन्द्र देखिँदैन; पूर्णिमामा पूरै चम्किन्छ।",
            en: "At new moon the Moon is not seen; at full moon it shines fully.",
          },
        },
      ],
    },
  ],
};
