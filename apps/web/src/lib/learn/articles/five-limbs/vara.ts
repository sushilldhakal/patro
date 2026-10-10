import type { ArticleData } from "../../article-schema";

export const vara: ArticleData = {
  slug: "vara",
  seeAlso: ["hora", "what-is-panchang", "five-limbs-together", "why-location-matters"],
  sections: [
    {
      title: { ne: "वार — पञ्चाङ्गको सबैभन्दा परिचित अङ्ग", en: "Vāra — the most familiar limb" },
      eyebrow: "The weekday",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पञ्चाङ्गका पाँच अङ्गमध्ये *वार* सबैभन्दा सजिलो छ — यो हामीले दैनिक प्रयोग गर्ने बार नै हो। तर यसका दुई विशेषता छन् जुन ग्रेगोरियन बारभन्दा फरक छन्।",
            en: "Of the five limbs, *vāra* is the easiest — it is simply the weekday we use every day. But it carries two features the Gregorian weekday does not.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "दिन सूर्योदयबाट सुरु", en: "The day starts at sunrise" },
              p: {
                ne: "वैदिक वार **सूर्योदयदेखि अर्को सूर्योदय**सम्म चल्छ, मध्यरातदेखि होइन।",
                en: "A Vedic vāra runs **from sunrise to sunrise**, not from midnight.",
              },
            },
            {
              h: { ne: "हरेक वारको ग्रह स्वामी", en: "Each vāra has a ruling graha" },
              p: {
                ne: "सातै वार सात ग्रहका नाममा — र यो क्रम सुन्दर गणितीय नियमबाट निस्कन्छ।",
                en: "All seven are named for the seven grahas — and the order follows from an elegant rule.",
              },
            },
          ],
        },
        {
          kind: "table",
          caption: { ne: "सात वार र तिनका स्वामी", en: "The seven vāras and their rulers" },
          headers: [
            { ne: "वार", en: "Vāra" },
            { ne: "स्वामी ग्रह", en: "Ruling graha" },
            { ne: "संस्कृत नाम", en: "English" },
          ],
          rows: [
            [{ ne: "आइतबार", en: "Sunday" }, { ne: "सूर्य", en: "Sun" }, { ne: "आदित्यवार", en: "Sunday" }],
            [{ ne: "सोमबार", en: "Monday" }, { ne: "चन्द्र", en: "Moon" }, { ne: "सोमवार", en: "Monday" }],
            [{ ne: "मंगलबार", en: "Tuesday" }, { ne: "मंगल", en: "Mars" }, { ne: "मंगलवार", en: "Tuesday" }],
            [{ ne: "बुधबार", en: "Wednesday" }, { ne: "बुध", en: "Mercury" }, { ne: "बुधवार", en: "Wednesday" }],
            [{ ne: "बिहीबार", en: "Thursday" }, { ne: "बृहस्पति", en: "Jupiter" }, { ne: "बृहस्पतिवार", en: "Thursday" }],
            [{ ne: "शुक्रबार", en: "Friday" }, { ne: "शुक्र", en: "Venus" }, { ne: "शुक्रवार", en: "Friday" }],
            [{ ne: "शनिबार", en: "Saturday" }, { ne: "शनि", en: "Saturn" }, { ne: "शनिवार", en: "Saturday" }],
          ],
        },
      ],
    },
    {
      title: { ne: "वारको क्रम किन यही हो", en: "Why the vāras run in this order" },
      eyebrow: "The hora rule",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "आइत, सोम, मंगल … यो क्रम मनपरी होइन। यो ~होरा~ — दिनका चौबीस ग्रहीय घण्टा — बाट निस्कन्छ।",
            en: "Sunday, Monday, Tuesday … this order is not arbitrary. It falls out of the ~hora~ system — the twenty-four planetary hours of a day.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "ग्रहलाई पृथ्वीबाट देखिने गतिको क्रममा — सबैभन्दा ढिलोदेखि छिटोसम्म — राखिन्छ: **शनि, बृहस्पति, मंगल, सूर्य, शुक्र, बुध, चन्द्र**। दिनको पहिलो होराको स्वामी नै त्यो दिनको स्वामी हुन्छ, र होरा यही क्रममा घुम्दै जान्छ।",
            en: "The grahas are ordered by apparent speed, slowest to fastest: **Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon**. Whichever rules the first hora of a day names that day, and the horas cycle on in that same order.",
          },
        },
        {
          kind: "diagram",
          id: "hora-weekday-cycle",
        },
        {
          kind: "diagram",
          id: "table-graha",
        },
      ],
    },
    {
      title: { ne: "वार कहिले बदलिन्छ", en: "When the vāra changes" },
      eyebrow: "Sunrise, not midnight",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "यो व्यवहारमा फरक पार्ने कुरा हो। बिहीबार बिहान `४:००` बजे — नागरिक पात्रोमा बिहीबार, तर पञ्चाङ्गमा **अझै बुधबार** (सूर्योदय `५:३०` मा मात्र हुने भए)।",
            en: "This matters in practice. At `4:00` on a Thursday morning the civil calendar says Thursday, but the panchanga still says **Wednesday** — if sunrise is not until `5:30`.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "व्रत, पूजा र मुहूर्तका लागि पञ्चाङ्गको वार नै मान्य हुन्छ। त्यसैले “शनिबारको व्रत” शुक्रबार राति सुरु हुँदैन — शनिबार सूर्योदयबाट सुरु हुन्छ, र आइतबार सूर्योदयमा सकिन्छ।",
            en: "For fasts, worship and muhurta it is the panchanga's vāra that counts. A Saturday fast therefore does not begin on Friday night — it begins at Saturday's sunrise and ends at Sunday's.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "सूर्योदय स्थानीय भएकाले वार पनि स्थानसापेक्ष हुन्छ — पञ्चाङ्गका पाँचै अङ्गमध्ये यो नै सबैभन्दा प्रत्यक्ष रूपमा स्थानमा निर्भर छ।",
            en: "Since sunrise is local, the vāra is local too — of the five limbs it is the one that depends on place most directly.",
          },
        },
      ],
    },
  ],
};
