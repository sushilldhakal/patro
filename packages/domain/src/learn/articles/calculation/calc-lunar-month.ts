import type { ArticleData } from "../../article-schema";

/*
 * The method in apps/api/engine/panchanga: lunar_month.py (amanta windows,
 * `name_lunar_month`, civil first/last day by sunrise), adhik_maas.py
 * (`is_adhik_maas` — same solar rashi at both Aausi), kshaya_maas.py (two
 * sankrantis in one window; last BS 2039 = Jan–Feb 1983, Poush–Magh; next
 * 2124 CE; flanked by two adhik months, in 2039 Adhik Ashwin and Phalgun).
 */
export const calcLunarMonth: ArticleData = {
  slug: "calc-lunar-month",
  seeAlso: ["adhik-kshaya-maas", "lunar-month", "calc-tithi"],
  sections: [
    {
      title: { ne: "सीमा — औंसीदेखि औंसीसम्म", en: "The edges — new moon to new moon" },
      eyebrow: "Amanta window",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "गणनाको आधार *अमान्त* मास हो — एक औंसीको क्षणदेखि अर्को औंसीको क्षणसम्म। औंसीको क्षण भनेको कृष्ण पक्षको पन्ध्रौँ तिथि सकिने क्षण हो, त्यसैले यो [[calc-tithi|तिथिको सीमा]] जस्तै खोजीले भेटिन्छ।",
            en: "The computation works on the *amanta* month — from one new-moon instant to the next. The new-moon instant is the moment the fifteenth tithi of the dark half ends, so it is found by the same search as [[calc-tithi|a tithi's boundary]].",
          },
        },
        {
          kind: "list",
          items: [
            { ne: "पहिलो औंसीपछि **पूर्णिमा** (शुक्ल १५ सकिने क्षण) खोजिन्छ।", en: "After the opening new moon, the **full moon** is found (the end of Shukla 15)." },
            { ne: "पूर्णिमापछि **अर्को औंसी** — त्यहीँ मास टुङ्गिन्छ र अर्को सुरु हुन्छ।", en: "After the full moon, the **next new moon** — where the month closes and the next one opens." },
            { ne: "दिनमा राख्दा: मासको पहिलो दिन औंसीपछिको पहिलो सूर्योदय भएको दिन; अन्तिम दिन अर्को औंसीपछिको सूर्योदयभन्दा अघिल्लो दिन।", en: "On days: the month's first day is the first day whose sunrise follows the new moon; its last day is the day before the sunrise that follows the next one." },
          ],
        },
      ],
    },
    {
      title: { ne: "मासको नाम", en: "Naming the month" },
      eyebrow: "From the Sun's rashi",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "चान्द्र मासको नाम खुल्ने औंसीको क्षणमा सूर्य कुन निरयन राशिमा छ भन्नेबाट दिइन्छ — अर्थात् त्यस मासभित्र पर्ने सङ्क्रान्तिबाट। सूर्य मीनमा हुँदा खुल्ने र भित्र मेष सङ्क्रान्ति पर्ने मास **चैत** हो; त्यसपछिको **बैशाख**।",
            en: "A lunar month is named from the sidereal rashi the Sun is in at its opening new moon — that is, from the sankranti that falls inside it. The month that opens with the Sun in Meena, and holds the Mesha Sankranti, is **Chait**; the one after it is **Baisakh**.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "पूर्णिमाको बेला सूर्य कहाँ छ भनेर नाम दिँदा झन्डै आधा महिनाको नाम एक मास अगाडि सर्छ — सङ्क्रान्ति शुक्ल पक्षमा परे। त्यसैले खुल्ने औंसी नै आधार हो। पूर्णिमान्त नाम पनि यही अमान्त गणनाबाट निकालिन्छ ([[shukla-krishna-paksha|दुई परम्परा]])।",
            en: "Naming from where the Sun stands at the full moon pushes about half the months one name ahead — whenever the sankranti falls in the bright half. So the opening new moon is the anchor. The pūrṇimānta names are derived from this same amanta count ([[shukla-krishna-paksha|the two traditions]]).",
          },
        },
      ],
    },
    {
      title: { ne: "अधिक मासको जाँच", en: "Testing for an adhik maas" },
      eyebrow: "Same rashi at both ends",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "नियम [[adhik-kshaya-maas|अधिक मास र क्षय मास]] मा छ — जुन चान्द्र मासभित्र कुनै सङ्क्रान्ति पर्दैन, त्यो अधिक। गणनामा यसको जाँच सजिलो छ: दुवै औंसीको क्षणमा सूर्य **एउटै राशिमा** छ भने बीचमा सङ्क्रान्ति परेकै छैन।",
            en: "The rule is in [[adhik-kshaya-maas|the extra and the skipped month]] — a lunar month with no sankranti inside it is adhik. In computation the test is simple: if the Sun is in **the same rashi** at both new moons, no sankranti fell between them.",
          },
        },
        {
          kind: "calc",
          rule: [
            { ne: "राशि₁ = खुल्ने औंसीमा सूर्यको निरयन राशि", en: "rashi₁ = the Sun's sidereal rashi at the opening new moon" },
            { ne: "राशि₂ = टुङ्गिने औंसीमा सूर्यको निरयन राशि", en: "rashi₂ = the Sun's sidereal rashi at the closing new moon" },
            { ne: "राशि₁ = राशि₂ भए → अधिक मास", en: "rashi₁ = rashi₂ → adhik maas" },
          ],
          result: { ne: "अधिक मासले पछिको *निज* मासकै नाम लिन्छ — “अधिक X” पछि “निज X”।", en: "The adhik month takes the name of the *nija* month after it — “Adhik X” then “Nija X”." },
        },
        {
          kind: "para",
          text: {
            ne: "उदाहरण: वि.सं. २०८० मा साउन दोहोरियो — अधिक साउन (सन् २०२३ जुलाई–अगस्ट), त्यसपछि निज साउन।",
            en: "An example: in BS 2080 Saun came twice — Adhik Saun (July–August 2023), then Nija Saun.",
          },
        },
      ],
    },
    {
      title: { ne: "क्षय मासको जाँच", en: "Testing for a kshaya maas" },
      eyebrow: "Two sankrantis in one month",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "क्षय मासका लागि मासभित्रका सङ्क्रान्ति गनिन्छन् — औंसीदेखि अर्को औंसीअघिसम्म। **दुई** सङ्क्रान्ति परे एउटा मासको नाम हराउँछ।",
            en: "For a kshaya maas the sankrantis inside the month are counted — from one new moon up to (not including) the next. **Two** of them, and one month's name disappears.",
          },
        },
        {
          kind: "para",
          text: {
            ne: "पछिल्लो पटक यस्तो वि.सं. २०३९ मा भयो (सन् १९८३ जनवरी–फेब्रुअरी, पुष–माघ), र अघि–पछि अधिक असोज र अधिक फागुन थिए; अर्को सन् २१२४ तिर अपेक्षित छ। यो किन पुष–माघतिर मात्र र किन दुर्लभ भन्ने [[adhik-kshaya-maas|अधिक मास र क्षय मास]] मा छ।",
            en: "The last time was BS 2039 (January–February 1983, Poush–Magh), flanked by an Adhik Ashwin before and an Adhik Phalgun after; the next is expected around 2124 CE. Why only around Poush–Magh, and why so rarely, is in [[adhik-kshaya-maas|the extra and the skipped month]].",
          },
        },
        {
          kind: "note",
          text: {
            ne: "दुवै जाँच एउटै कुरामा टेक्छन्: औंसी र सङ्क्रान्तिका ठ्याक्कै क्षण। त्यसैले सङ्क्रान्ति औंसीको केही मिनेट वरपर परेको वर्षमा अधिक मास कुन हो भन्ने निर्णय गणनाको शुद्धतामा निर्भर हुन्छ — र फरक पद्धतिका पात्रो कहिलेकाहीँ फरक पर्छन्।",
            en: "Both tests rest on one thing: the exact instants of the new moons and the sankrantis. So in a year when a sankranti falls within minutes of a new moon, which month is adhik depends on the precision of the computation — and patros made by different methods occasionally disagree.",
          },
        },
      ],
    },
  ],
};
