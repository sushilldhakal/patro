import type { ArticleData } from "../../article-schema";

/**
 * Transcribed from web's hand-written `HowWeCalculateStudy` — see
 * `what-is-panchang.ts` header note. That component is entirely i18n-key
 * driven (`learn.study.calc.*`); the strings below are the resolved en/ne
 * catalogue values as of the transcription date, assembled in the same
 * order the JSX concatenated them.
 */
export const howWeCalculate: ArticleData = {
  slug: "how-we-calculate",
  sections: [
    {
      title: { ne: "सारांश", en: "Summary" },
      eyebrow: "Summary",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "भारी खगोलशास्त्र र पञ्चाङ्ग गणना *नेपाली-होलिडे-एपीआई* (फास्टएपीआई + ~स्विस एफेमेरिस / जेपीएल~, लाहिरी अयनांश) मा हुन्छ। रियाक्ट एप *वेदिक पात्रो* एपीआई बोलाएर लेबल देखाउँछ — उही ग्रहपात फेरि चलाउँदैन।",
            en: "Heavy astronomy and panchanga math runs in *nepali-holiday-api* (FastAPI + ~Swiss Ephemeris / JPL~, Lahiri ayanamsa). *Vedic Patro* calls the API and formats the labels — it does not re-run the ephemeris.",
          },
        },
        { kind: "diagram", id: "server-pipeline" },
      ],
    },
    {
      title: { ne: "राशि भनेको के?", en: "What is rashi?" },
      eyebrow: "What is rashi?",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*राशि* भनेको क्रान्तिवृत्त मार्गमा बाँडिएका १२ बराबर खण्ड, प्रत्येक ~३०°~ — मेष ०° देखि मीन ३५०°–३६०° सम्म। यो *निरयन* चक्र तारापुञ्जसँग जोडिएको छ; पश्चिमी राशिफलको \"सूर्य राशि\" प्रायः सायन हुन्छ, नेपाली पात्रो/पञ्चाङ्ग निरयन।",
            en: "*Rashi* is one of twelve equal sectors along the ecliptic, each ~30°~ wide — from Mesha 0° to Meena 350°–360°. This *sidereal (nirayana)* zodiac is tied to the star clusters; the \"Sun sign\" of Western horoscopes is usually tropical (sayana), while Nepali patro and panchanga are sidereal.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "कक्षा (क्रान्तिवृत्त)", en: "Ecliptic plane" },
              p: {
                ne: "सूर्य, चन्द्र र ग्रहहरू प्रायः एउटै तल्लो कक्षीय तलमा हिँड्छन् — पृथ्वीको वरिपरि \"राशि पट्टी\" यही कक्षाको ३६०° कोठा हो।",
                en: "The Sun, Moon and planets move near one flat plane — the \"rashi belt\" around Earth is how we partition that 360° circle.",
              },
            },
            {
              h: { ne: "नक्षत्र", en: "Nakshatra" },
              p: {
                ne: "उही कक्षामा २७ भाग, प्रत्येक १३°२०′ — चन्द्रको नक्षत्र यही सूक्ष्म जालबाट।",
                en: "The same circle split into 27 parts of 13°20′ each — the Moon's nakshatra comes from this finer grid.",
              },
            },
            {
              h: { ne: "लग्न", en: "Lagna" },
              p: {
                ne: "पूर्व क्षितिजमा उदाउँदै गरेको कक्षीय बिन्दु — तपाईंको अक्षांश, देशान्तर र घण्टाअनुसार ग्रहपातबाट लग्न कोण निकालिन्छ।",
                en: "The ecliptic point rising on the eastern horizon — computed from your latitude, longitude, and clock time via the ephemeris ascendant.",
              },
            },
          ],
        },
        {
          kind: "formula",
          cards: [
            {
              big: "floor(λ ÷ 30)",
              unit: { ne: "→ ०–११", en: "→ 0–11" },
              label: { ne: "राशि सूचकाङ्क", en: "Rashi index" },
              desc: {
                ne: "लाहिरी निरयन देशान्तर λ लाई ३०° मा भाग — मेष ०° देखि मीन सम्म",
                en: "Lahiri sidereal longitude λ split into 30° sectors — Mesha 0° through Meena",
              },
            },
            {
              big: "floor(λ ÷ 13°20′)",
              unit: { ne: "→ ०–२६", en: "→ 0–26" },
              label: { ne: "नक्षत्र", en: "Nakshatra" },
              desc: {
                ne: "चन्द्रको λ; पद = नक्षत्र भित्रको बाँकी ÷ ३°२०′",
                en: "Moon λ; pada = remainder inside the nakshatra ÷ 3°20′",
              },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "पृथ्वी, कक्षा र राशि–नक्षत्र पट्टी", en: "Earth, ecliptic & the rashi belt" },
      eyebrow: "Earth, ecliptic & the rashi belt",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "तलको चित्र *भूकेन्द्रित* दृश्य हो: पृथ्वी बीचमा, सूर्य दूर (दिशा मात्र), चन्द्रको कक्ष, र बाहिर ~१२ राशि + २७ नक्षत्र~ को जाल — सूर्यको निरयन देशान्तर अनुसार कुन खण्ड उज्यालो हुन्छ हेर्नुहोस्। वर्ष स्लाइडर / चलाउनुहोस् ले सूर्यलाई पट्टीमा सार्छ; पढाइमा सूर्य राशि, नक्षत्र, तिथि कोण (चन्द्र−सूर्य) देखिन्छ — यही कोण सर्भरमा तिथि बनाउँछ।",
            en: "The diagram below is a *geocentric* teaching view: Earth at the centre, the Sun as a direction only, the Moon's orbit, and an outer ~12-rashi + 27-nakshatra~ grid — watch which sector lights up from the Sun's sidereal longitude. The year slider and play button move the Sun along the belt; the readouts show the Sun sign, the nakshatra, and the tithi angle (Moon − Sun) — the same angle the server turns into a tithi.",
          },
        },
        { kind: "diagram", id: "ecliptic-belt" },
        {
          kind: "note",
          text: {
            ne: "यो चित्र शिक्षाका लागि सरलीकृत कक्ष हो; उत्पादनमा स्विस एफेमेरिसले जेपीएल ग्रहपात, अपवर्तन र अवलोककको उचाइ प्रयोग गर्छ।",
            en: "The orbits here are simplified for teaching; in production Swiss Ephemeris uses the JPL ephemeris, refraction, and the observer's elevation.",
          },
        },
      ],
    },
    {
      title: { ne: "झुकाव, विषुव र अयन चलन", en: "Tilt, equinox & precession" },
      eyebrow: "Tilt, equinox & precession",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "पृथ्वीको धुरी ~≈ २३°२६′~ ले कक्षासँग झुकिएको छ — त्यसैले वसन्त/शरद विषुव र ग्रीष्म/हेमन्त अयनान्त बन्छन्। अक्ष लट्टु झैँ *२६,००० वर्ष* को शंकुमा डुल्दा विषुव बिन्दु तारापुञ्ज माथि पछाडि सर्छ — अयनांश (लाहिरी)। एपीआईमा प्रत्येक क्षणको लाहिरी अयनांश स्विस एफेमेरिसबाट; दैनिक पेलोडमा उदय जुलियन दिनमा पनि लेखिन्छ।",
            en: "Earth's axis is tilted ~≈ 23°26′~ to the ecliptic — that is what creates the spring and autumn equinoxes and the summer and winter solstices. The axis wobbles like a top on a *26,000-year* cone, so the equinox point drifts backward against the star clusters — the Lahiri ayanamsha. The API reads Lahiri ayanamsha from Swiss Ephemeris for each instant; the daily payload also stores it at the sunrise Julian Day.",
          },
        },
        {
          kind: "lede",
          text: {
            ne: "पहिलो ठूलो चित्र: निरयन राशि चक्र स्थिर, विषुवत् रेखा र विषुव काट अयन चलन सँग घुम्छ। दोस्रो: ध्रुव तारा बदल्दै अक्ष शंकु — अयनांश किन वर्षेनि बढ्छ।",
            en: "First large diagram: the sidereal rashi ring stays fixed while the equator and the equinox cross rotate with precession. Second: the axis cone changing pole stars — why ayanamsha grows every year.",
          },
        },
        { kind: "diagram", id: "precession-sky" },
      ],
    },
    {
      title: { ne: "आधार — स्थान, समय, ग्रहपात", en: "Foundation — place, time, ephemeris" },
      eyebrow: "Foundation — place, time, ephemeris",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "हरेक गणना एउटै सूत्रबाट सुरु हुन्छ: *अवलोककको स्थान* (अक्षांश, देशान्तर, समय क्षेत्र, उचाइ), *नागरिक दिन* (ग्रेगोरियन, ई.पू., वा बि.सं. ठेगाना), र त्यो दिनको ~जुलियन दिन~। स्थानीय घडी आईएएनए समय क्षेत्रबाट; उदय/अस्तका लागि साँचो क्षितिज, अपवर्तन र क्षितिज झुकाव समावेश।",
            en: "Every run starts the same way: the *observer's place* (latitude, longitude, timezone, elevation), the chosen *civil day* (Gregorian, BCE, or BS from the URL), and its ~Julian Day~. The local clock comes from the IANA timezone; rise and set include the true horizon, refraction, and horizon dip.",
          },
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "स्विस एफेमेरिस (जेपीएल)", en: "Swiss Ephemeris (JPL)" },
              p: {
                ne: "सूर्य, चन्द्र, ग्रह, पातका ज्यामितीय स्थान — गति, उदय/अस्त, अयनांश सहित। सबै निरयन देशान्तर लाहिरी अयनांश घटाएर।",
                en: "Geometric positions for Sun, Moon, planets, and nodes — speeds, rise/set, ayanamsa. Sidereal longitudes subtract Lahiri ayanamsa.",
              },
            },
            {
              h: { ne: "उदय–आधारित दिन", en: "Sunrise-anchored day" },
              p: {
                ne: "पात्रो/पञ्चाङ्गको मुख्य दिन = स्थानीय सूर्योदयदेखि अर्को सूर्योदयसम्म (वैकल्पिक: नागरिक मध्यरातको झलक)।",
                en: "Patro/panchanga days usually run from local sunrise to the next sunrise (optional civil-midnight snapshot).",
              },
            },
            {
              h: { ne: "सङ्क्रान्ति", en: "Sankranti" },
              p: {
                ne: "निरयन सूर्य जब ०°, ३०°, ६०°… काट्छ — द्विभाजनले काट्ने क्षण खोजिन्छ; मेष/मकर वर्षारम्भ र ऋतु यहीबाट।",
                en: "When the sidereal Sun crosses 0°, 30°, 60°… — bisection finds the crossing instant; Mesha/Makara year starts and the ritus follow from it.",
              },
            },
          ],
        },
        { kind: "diagram", id: "computation-reference" },
      ],
    },
    {
      title: { ne: "पञ्चाङ्ग कसरी गणना हुन्छ", en: "How panchanga is computed" },
      eyebrow: "How panchanga is computed",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*पञ्चाङ्गका अङ्ग* सबै निरयन देशान्तरबाट — चन्द्र र सूर्यको कोणीय अन्तर वा जोड। ~उदय तिथि~ = तपाईंको स्थानमा सूर्योदय भएको क्षणमा; नक्षत्र/योग/करण पनि उही निरयन देशान्तरबाट।",
            en: "*Panchanga limbs* all come from sidereal longitudes — the angular difference or sum of Moon and Sun. ~Udaya tithi~ is the tithi at the moment of sunrise at your place; nakshatra, yoga, and karana come from the same sidereal longitudes.",
          },
        },
        {
          kind: "formula",
          cards: [
            {
              big: "(चन्द्र − सूर्य) ÷ 12°",
              unit: { ne: "→ तिथि १–३०", en: "→ tithi 1–30" },
              label: { ne: "तिथि", en: "Tithi" },
              desc: { ne: "१२° = एक तिथि; शुक्ल/कृष्ण पक्ष चन्द्रको कोणान्तरबाट", en: "12° per tithi; shukla/krishna paksha from the lunar elongation" },
            },
            {
              big: "चन्द्र ÷ (360/27)",
              unit: { ne: "→ नक्षत्र + पद", en: "→ nakshatra + pada" },
              label: { ne: "नक्षत्र", en: "Nakshatra" },
              desc: { ne: "२७ नक्षत्र, प्रत्येक १३°२०′, ४ पद", en: "27 nakshatras of 13°20′, four padas each" },
            },
            {
              big: "(सूर्य + चन्द्र) ÷ (360/27)",
              unit: { ne: "→ योग", en: "→ yoga" },
              label: { ne: "योग", en: "Yoga" },
              desc: { ne: "२७ योग — देशान्तर जोड ३६०° मा बेरेर", en: "27 yogas — the longitude sum wrapped to 360°" },
            },
            {
              big: "(चन्द्र − सूर्य) ÷ 6°",
              unit: { ne: "→ करण", en: "→ karana" },
              label: { ne: "करण", en: "Karana" },
              desc: { ne: "तिथिको आधा — ११ नाम + अन्तिम स्थिर करणहरू", en: "Half of a tithi — eleven names plus the fixed tail karanas" },
            },
          ],
        },
        {
          kind: "lede",
          text: {
            ne: "~अङ्ग समाप्ति समय~: ग्रहपातमा चन्द्र−सूर्य (वा चन्द्र मात्र) कोण सीमा काट्ने क्षण द्विआधारी खोज — चक्र र समयरेखा यही सीमा जुलियन दिन प्रयोग गर्छ।",
            en: "~Limb end times~: a binary search on the ephemeris for the instant Moon−Sun (or the Moon alone) crosses the next boundary — the wheels and timelines use those boundary Julian Days.",
          },
        },
        {
          kind: "table",
          caption: { ne: "एक पञ्चाङ्ग दिन — गणनाको क्रम (विधि)", en: "One panchanga day — calculation order (method)" },
          headers: [
            { ne: "क्रम", en: "Step" },
            { ne: "के गणना", en: "What" },
            { ne: "कसरी", en: "How" },
          ],
          rows: [
            [{ ne: "१", en: "1" }, { ne: "सूर्योदय, सूर्यास्त, अर्को उदय", en: "Sunrise, sunset, next sunrise" }, { ne: "स्विस उदय/अस्त — अवलोककको अक्षांश/देशान्तर, अपवर्तन", en: "Swiss rise/set for the observer's lat/lon, with refraction" }],
            [{ ne: "२", en: "2" }, { ne: "चन्द्र उदय/अस्त", en: "Moonrise / moonset" }, { ne: "उदयपछिको चन्द्र उदय/अस्त", en: "Lunar rise/set after today's sunrise" }],
            [{ ne: "३", en: "3" }, { ne: "उदय तिथि, वार", en: "Udaya tithi, vara" }, { ne: "उदय जुलियन दिनमा चन्द्र−सूर्य → तिथि सूचकाङ्क", en: "Moon−Sun at the sunrise JD → tithi index" }],
            [{ ne: "४", en: "4" }, { ne: "दिनमान · रात्रिमान", en: "Dinamana · ratrimana" }, { ne: "उदय–अस्त–अर्को उदयको अवधि", en: "Durations between sunrise, sunset, and next sunrise" }],
            [{ ne: "५", en: "5" }, { ne: "मध्याह्न, लाहिरी अयनांश", en: "Madhyahna, Lahiri ayanamsa" }, { ne: "स्थानीय मध्याह्न जुलियन दिन; सूर्योदयमा अयनांश", en: "Local noon JD; ayanamsa stored at sunrise" }],
            [{ ne: "६", en: "6" }, { ne: "पक्ष; तिथि/नक्षत्र/योग/करण + अन्त", en: "Paksha; limbs + end times" }, { ne: "निरयन सूत्र + सीमा खोज", en: "Sidereal formulas + boundary search" }],
            [{ ne: "७", en: "7" }, { ne: "चान्द्र/पूर्णिमान्त मास", en: "Amanta / purnimanta month" }, { ne: "सूर्य–चन्द्र पक्ष नियम; अधिक/क्षय मास", en: "Sun–Moon phase rules; adhik/kshaya maas" }],
            [{ ne: "८", en: "8" }, { ne: "९ ग्रह उदयमा", en: "Nine grahas at sunrise" }, { ne: "प्रत्येक ग्रहको देशान्तर, राशि, नक्षत्र, पद, गति", en: "Each graha's longitude, rashi, nakshatra, pada, and speed" }],
            [{ ne: "९", en: "9" }, { ne: "लग्न अवधि", en: "Lagna spans" }, { ne: "दिनभर लग्नले ३०° राशि सीमा काट्ने", en: "The ascendant crossing 30° rashi boundaries through the day" }],
            [{ ne: "१०", en: "10" }, { ne: "मुहूर्त, चौघडी, होरा", en: "Muhurta, choghadiya, hora" }, { ne: "उदय–अर्को उदय विभाजन — परम्परागत खण्ड", en: "Sunrise→next sunrise divided by traditional rules" }],
            [{ ne: "११", en: "11" }, { ne: "सम्वत्सर, बि.सं./ने.सं.", en: "Samvatsara, BS/NS labels" }, { ne: "सङ्क्रान्ति वर्ष + चान्द्र मास नियम", en: "Sankranti year + lunar month conventions" }],
          ],
        },
        {
          kind: "note",
          text: {
            ne: "कुनै घण्टामा झलक चाहिन्छ भने उही ग्रहपात क्षणमा अङ्ग पुन: गणना — नागरिक मध्यरात दिन भने दुई उदय पेलोड बीच मिलाइन्छ (देखाउन मात्र, दोस्रो ग्रहपात पास होइन)।",
            en: "A snapshot at a given clock time recomputes the limbs at that instant — a civil-midnight day interpolates between two sunrise payloads for display only, not as a second ephemeris pass.",
          },
        },
      ],
    },
    {
      title: { ne: "ग्रह गोचर कसरी गणना हुन्छ", en: "How graha gochar is computed" },
      eyebrow: "How graha gochar is computed",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*गोचर* = कुनै क्षणमा प्रत्येक ग्रह कुन ~निरयन राशि / नक्षत्र / पद~ मा छ र कहिले अर्को मा प्रवेश गर्छ। पात्रो गोचर सामान्यतः स्थानीय सूर्योदय मा झलक; प्रवेश सूची महिनाभरका काट्ने घटना।",
            en: "*Gochar* is where each graha sits in the ~sidereal rashi / nakshatra / pada~ at a chosen instant, and when it enters the next one. The patro gochar page is normally a snapshot at local sunrise (udaya); ingress lists collect the boundary crossings through the browsed month.",
          },
        },
        {
          kind: "table",
          caption: { ne: "गोचर — मुख्य चरण", en: "Gochar — main steps" },
          headers: [
            { ne: "विषय", en: "Topic" },
            { ne: "गणना", en: "Calculation" },
          ],
          rows: [
            [{ ne: "वर्तमान स्थिति", en: "Current position" }, { ne: "प्रत्येक ग्रहको लाहिरी निरयन देशान्तर → राशि (÷३०°), नक्षत्र (÷१३°२०′), पद (÷३°२०′); केतु = राहु + १८०°", en: "Lahiri sidereal longitude per graha → rashi (÷30°), nakshatra (÷13°20′), pada (÷3°20′); Ketu = Rahu + 180°" }],
            [{ ne: "वक्री / मार्गी", en: "Retrograde / direct" }, { ne: "क्रान्तिवृत्तीय देशान्तरको गति चिन्ह — मंगल…शनि; राहु/केतु सधैँ वक्री परम्परा", en: "Sign of the ecliptic speed — Mars through Saturn; Rahu/Ketu retrograde by convention" }],
            [{ ne: "अस्त", en: "Combust (asta)" }, { ne: "ग्रह सूर्य नजिक — कोणीय दूरीको सीमा (ग्रहअनुसार फरक)", en: "Graha close to the Sun — angular separation limits that differ per graha" }],
            [{ ne: "अर्को राशि प्रवेश", en: "Next sign entry" }, { ne: "देशान्तर ०°, ३०°, … काट्ने — पहिले मोटो समय खोज, त्यसपछि द्विभाजन (करिब १५ मिनेट सहिष्णुता)", en: "Longitude crossing 0°, 30°, … — a coarse time scan, then bisection (about 15 minute tolerance)" }],
            [{ ne: "अर्को नक्षत्र / पद", en: "Next nakshatra / pada" }, { ne: "उही द्विभाजन — नक्षत्र सूचकाङ्क वा पद खण्ड परिवर्तन", en: "The same bisection, for when the nakshatra index or pada slot changes" }],
            [{ ne: "वक्री/मार्गी स्थान", en: "Retrograde stations" }, { ne: "गति चिन्ह फेरिने क्षणको खोज (प्रवेश दायराभित्र)", en: "Search for the instant the speed changes sign inside the ingress window" }],
            [{ ne: "आगामी घटना सूची", en: "Upcoming event list" }, { ne: "चयनित महिनाका ई.सं. सीमाभित्र सबै प्रवेश/स्थान घटना → स्थानीय समय + बि.सं. दिन", en: "Every ingress/station event inside the browsed month's AD bounds → local time + BS day" }],
          ],
        },
        {
          kind: "keys",
          items: [
            {
              h: { ne: "ढिलो र छिटो ग्रह", en: "Slow vs fast grahas" },
              p: {
                ne: "चन्द्र/बुध छिटो — राशि बदल्न दिन/हप्ता; शनि/राहु महिना/वर्ष। खोज सञ्झ्याल ग्रहअनुसार ठूलो राखिन्छ ताकि वक्री घुम्ती पनि नछुटोस्।",
                en: "Moon/Mercury change signs in days; Saturn/Rahu in months or years. Search windows are widened so retrograde loops are not missed.",
              },
            },
            {
              h: { ne: "पात्रो र कुण्डली", en: "Patro vs kundali" },
              p: {
                ne: "गोचर पृष्ठ = यात्रा तालिका + प्रवेश; कुण्डली = जन्म क्षण / वर्गीय चार्ट — उही निरयन इन्जिन, फरक अङ्कुर समय।",
                en: "Gochar pages show transits and ingress; kundali uses birth time and divisional charts — same sidereal engine, different anchor.",
              },
            },
          ],
        },
      ],
    },
    {
      title: { ne: "ग्रहण कसरी गणना हुन्छ", en: "How eclipses are computed" },
      eyebrow: "How eclipses are computed",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*सूर्यग्रहण* र *चन्द्रग्रहण* स्विस एफेमेरिसका समर्पित ग्रहण विधिबाट — ज्यामितीय युति र छाया शंकु, जेपीएल ग्रहपातमाथि। पर्व/पञ्चाङ्ग दृश्यले वर्षभरि गएका र आउने सूची देखाउँछ।",
            en: "*Solar eclipses* and *lunar eclipses* use the dedicated Swiss Ephemeris eclipse routines on the JPL ephemeris — geometric syzygy and shadow cones. The festival and panchanga views list the past and upcoming eclipses of the year.",
          },
        },
        {
          kind: "table",
          caption: { ne: "ग्रहण — विधि", en: "Eclipse — method" },
          headers: [
            { ne: "चरण", en: "Stage" },
            { ne: "के हुन्छ", en: "What happens" },
          ],
          rows: [
            [{ ne: "विश्वव्यापी चरम", en: "Global maximum" }, { ne: "अर्को/अघिल्लो ग्रहणको चरम जुलियन दिन — सूर्य: सूर्य–चन्द्र पङ्क्ति; चन्द्र: पूर्णिमा पृथ्वीको छायाँबाट", en: "Maximum JD of the next/previous eclipse — solar: Sun–Moon alignment; lunar: Full Moon in Earth's shadow" }],
            [{ ne: "प्रकार", en: "Type" }, { ne: "सूर्य: पूर्ण, वलयाकार, मिश्र, आंशिक; चन्द्र: पूर्ण, आंशिक, उपछाया — ग्रहपातको सङ्केतबाट", en: "Solar: total, annular, hybrid, partial; lunar: total, partial, penumbral — from the ephemeris flags" }],
            [{ ne: "स्थानीय दृश्यता", en: "Local visibility" }, { ne: "अवलोकक (देशान्तर, अक्षांश, उचाइ) दिएपछि स्थानीय सम्पर्क समय — केही ठाउँमा आंशिक/पूर्ण देखिन्छ कि छैन", en: "Given the observer (lon, lat, elevation): local contact times, and whether the eclipse is visible at all" }],
            [{ ne: "स्थानीय सूर्य खोज", en: "Solar local search" }, { ne: "विश्वव्यापी चरम नजिक स्थानीय चरम — नदेखिए अर्को ग्रहणसम्म अगाडि", en: "Local maximum near the global maximum — if it is invisible, advance to the next eclipse" }],
            [{ ne: "स्थानीय चन्द्र", en: "Lunar local" }, { ne: "चरम / उपछाया सुरुमा चन्द्र क्षितिजमाथि — देखिने झण्डा", en: "Moon above the horizon at maximum / penumbral start → the visible flag" }],
            [{ ne: "पात्रो प्रदर्शन", en: "Patro display" }, { ne: "नेपाली लेबल, बि.सं./ई.सं. मिति, त्यो नागरिक दिनको दैनिक पञ्चाङ्ग लिङ्क", en: "Nepali labels, BS/AD dates, and a link to that civil day's panchanga" }],
          ],
        },
        {
          kind: "note",
          text: {
            ne: "ग्रहण समय विश्वव्यापी समय/जुलियन दिनमा शुद्ध; स्थानीय पात्रो मिति = तपाईंको समय क्षेत्र + वैदिक सूर्योदय नियम (उदयअघिको रात्रि घटना अघिल्लो पञ्चाङ्ग दिनमा) जहाँ लागू हुन्छ।",
            en: "Eclipse instants are exact in UT/JD; the local patro date applies your timezone plus the vedic sunrise rule (a night event before sunrise belongs to the previous panchanga day) where that applies.",
          },
        },
      ],
    },
    {
      title: { ne: "यो वेबसाइट के देखाउँछ", en: "What this site displays" },
      eyebrow: "What this site displays",
      blocks: [
        {
          kind: "lede",
          text: {
            ne: "*वेदिक पात्रो* मुख्यतया एपीआईबाट आएको गणित ~स्वरूप~ गर्छ — नेपाली अङ्क, ठेगाना ब्राउज, लेआउट। तिथि/नक्षत्र समय, उदय/अस्त, ग्रह, गोचर प्रवेश, ग्रहण, मुहूर्त, पर्व, साइत, कुण्डली बल — उत्पादनमा सर्भर-पक्ष ग्रहपातबाट; ब्राउजरले स्थान फेरि गणना गर्दैन।",
            en: "*Vedic Patro* mostly ~formats~ the numbers that come from the API — Nepali digits, URL browsing, layout. Tithi/nakshatra times, rise and set, grahas, gochar ingress, eclipses, muhurtas, festivals, sait, and kundali strengths all come from the server-side ephemeris in production; the browser does not recompute positions.",
          },
        },
        {
          kind: "note",
          text: {
            ne: "क्यास भएको वर्ष/दिनपछि सादा प्राप्ति छिटो हुन सक्छ — गणना पहिले नै भइसकेको पेलोड।",
            en: "Once a year or a day is cached, plain GETs can be fast — the payload has already been computed.",
          },
        },
      ],
    },
  ],
};
