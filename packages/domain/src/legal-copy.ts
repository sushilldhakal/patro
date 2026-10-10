/**
 * Canonical URLs: https://www.vedicpatro.com/privacy and /terms
 */
export const LEGAL_UPDATED = "27 August 2026";
export const LEGAL_CONTACT_EMAIL = "support@vedicpatro.com";
export const LEGAL_SITE = "https://www.vedicpatro.com";

export type LegalSection = { heading: { ne: string; en: string }; body: { ne: string; en: string }[] };

export const PRIVACY_INTRO = {
  ne: "यो नीति वैदिक पात्रो वेबसाइट र मोबाइल एप (iOS र Android) मा लागू हुन्छ। हामी तपाईंको डेटा बेच्दैनौं, विज्ञापनका लागि प्रयोग गर्दैनौं, र एपमा ट्र्याकिङ SDK राख्दैनौं। स्थान, क्यामेरा र गति सेन्सर ऐच्छिक हुन् — अस्वीकार गरे पनि पात्रो चल्छ।",
  en: "This policy applies to the Vedic Patro website and the iOS and Android apps. We do not sell your data, use it for advertising, or put tracking SDKs in the app. Location, camera and motion are optional — the calendar still works if you refuse them.",
};

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    heading: { ne: "खाता र प्रोफाइल", en: "Account and profiles" },
    body: [
      {
        ne: "खाता ऐच्छिक हो। सङ्कलन: इमेल, पासवर्डको ह्यास (पासवर्ड आफैं होइन), र Google, Apple वा Facebook बाट साइन-इन गर्दा प्रमाणित इमेल।",
        en: "An account is optional. We collect: email, a hash of your password (never the password itself), and the verified email from Google, Apple or Facebook when you sign in that way.",
      },
      {
        ne: "कुण्डली प्रोफाइल (ऐच्छिक): नाम, जन्म मिति/समय/स्थान, नोट। यी तपाईंको खातामा मात्र हुन्छन्।",
        en: "Kundali profiles (optional): name, birth date, time and place, and notes. These stay on your account only.",
      },
    ],
  },
  {
    heading: { ne: "स्थान (When In Use मात्र)", en: "Location (while using the app only)" },
    body: [
      {
        ne: "हामी पृष्ठभूमि स्थान माग्दैनौं। दुई कामका लागि मात्र, तपाईंले अनुमति दिएपछि:",
        en: "We never request background location. With your permission, and only while you use the app, location is used for two features:",
      },
      {
        ne: "१) पञ्चाङ्ग: सूर्योदय, तिथि, मुहूर्त तपाईंको ठाउँअनुसार गणना गर्न। अक्षांश/देशान्तर हाम्रो सर्भरमा HTTPS बाट पठाइन्छ — त्यो अनुरोध पूरा गर्न मात्र। खातामा बचत हुँदैन जबसम्म तपाईं कुण्डली प्रोफाइलमा जन्मस्थान राख्नुहुन्न।",
        en: "1) Panchanga: to calculate sunrise, tithi and muhurta for your place. Latitude and longitude are sent to our servers over HTTPS solely to complete that calculation. They are not stored on your account unless you save a birth place on a kundali profile.",
      },
      {
        ne: "२) आकाश गोचर: फोनले आकाशतिर तेर्साउँदा कम्पासलाई सही उत्तरमा मिलाउन (iOS ले यस API का लागि स्थान अनुमति चाहन्छ)। दिशा यसै उपकरणमा गणना हुन्छ; सर्भरमा पठाइँदैन।",
        en: "2) Aakash Gochar (3D sky): to align the compass with true north when you point the phone at the sky (iOS requires the location permission for that compass API). Heading is computed on this device and is not sent to our servers.",
      },
      {
        ne: "स्थान विज्ञापन, ट्र्याकिङ वा तेस्रो पक्षलाई बेच्न प्रयोग हुँदैन। सहरको नाम खोजेर पनि उही पञ्चाङ्ग पाउन सकिन्छ।",
        en: "Location is not used for advertising, tracking, or sale to third parties. You can get the same panchanga by searching a city name instead.",
      },
    ],
  },
  {
    heading: { ne: "क्यामेरा", en: "Camera" },
    body: [
      {
        ne: "पछाडिको क्यामेरा आकाश गोचरमा मात्र: आकाश नक्सा पछाडि तपाईंले देखिरहेको आकाशको लाइभ दृश्य (overlay)। फोटो खिचिँदैन, भिडियो रेकर्ड हुँदैन, फाइल बचत हुँदैन, केही अपलोड हुँदैन। माइक्रोफोन प्रयोग हुँदैन।",
        en: "The back camera is used only in Aakash Gochar: a live view of the sky behind the sky map (an overlay). We do not take photos, record video, save files, or upload camera data. The microphone is not used.",
      },
      {
        ne: "अनुमति अस्वीकार गरे पनि आकाश नक्सा र फोन तेर्साउने मोड चल्छ; overlay मात्र हुँदैन।",
        en: "If you refuse permission, the sky map and phone-pointing mode still work; only the live overlay is unavailable.",
      },
    ],
  },
  {
    heading: { ne: "गति, जाइरो र कम्पास", en: "Motion, gyroscope and compass" },
    body: [
      {
        ne: "आकाश गोचरमा फोन तेर्साउँदा र घुमाउँदा आकाश सँगै फर्न, र वास्तु चक्र ब्रह्मस्थानमा मिलाउन, एक्सेलेरोमिटर, जाइरो र कम्पास प्रयोग हुन्छ। यो स्ट्रिम यसै फोनमा रहन्छ — बचत हुँदैन, हाम्रो सर्भरमा पठाइँदैन।",
        en: "The accelerometer, gyroscope and compass turn the Aakash Gochar sky as you tilt the phone, and align the Vastu wheel when you stand in the Brahmasthan. This stream stays on the phone — it is not stored and is not sent to our servers.",
      },
      {
        ne: "सेन्सर नचलाए हातले आकाश तान्न सकिन्छ।",
        en: "You can drag the sky by hand instead of using the sensors.",
      },
    ],
  },
  {
    heading: { ne: "तपाईंका विकल्प", en: "Your choices" },
    body: [
      {
        ne: "प्रत्येक अनुमति प्रणाली संवादमा मागिन्छ, र सम्बन्धित बटन थिचेपछि मात्र। iOS/Android सेटिङबाट पछि काट्न सकिन्छ। स्थान बिना: सहर खोज्नुहोस्। क्यामेरा/गति बिना: आकाश नक्सा हातले घुमाउनुहोस्।",
        en: "Each permission is requested by the system dialog, and only after you tap the related control. You can turn it off later in iOS or Android Settings. Without location: search a city. Without camera or motion: drag the sky map by hand.",
      },
    ],
  },
  {
    heading: { ne: "हामी के गर्दैनौं", en: "What we do not do" },
    body: [
      {
        ne: "डेटा बेच्दैनौं। विज्ञापन नेटवर्क वा ब्रोकरसँग सेयर गर्दैनौं। एपमा IDFA/ATT ट्र्याकिङ छैन। पृष्ठभूमि स्थान छैन।",
        en: "We do not sell data. We do not share it with ad networks or brokers. The app has no IDFA/ATT tracking. There is no background location.",
      },
      {
        ne: "वेबसाइटमा मात्र पृष्ठ हेराइ मापन गर्न Google Analytics हुन सक्छ; मोबाइल एपमा छैन।",
        en: "The website may use Google Analytics only to measure page views. The mobile app does not.",
      },
    ],
  },
  {
    heading: { ne: "साइन-इन प्रदायक", en: "Sign-in providers" },
    body: [
      {
        ne: "Google, Apple र Facebook ले आफ्नै नीतिअनुसार पहिचान प्रमाणित गर्छन्। हामीलाई इमेल (Apple मा Hide My Email भए निजी-रिले) मात्र चाहिन्छ।",
        en: "Google, Apple and Facebook verify your identity under their own policies. We only receive an email (or an Apple Hide My Email private-relay address).",
      },
    ],
  },
  {
    heading: { ne: "राख्ने अवधि र मेटाउने", en: "Retention and deletion" },
    body: [
      {
        ne: "खाता रहँदासम्म प्रोफाइल र लग-इन सत्र राखिन्छ। एप वा वेबको खाता पृष्ठबाट खाता मेटाउँदा इमेल, प्रोफाइल र सेसन तुरुन्त हट्छन्।",
        en: "We keep profiles and login sessions while the account exists. Deleting the account in the app or on the website removes email, profiles and sessions immediately.",
      },
      {
        ne: "पञ्चाङ्ग गणनाका लागि पठाइएको स्थान त्यो अनुरोध पूरा गर्न प्रयोग हुन्छ; खाता मेट्दा प्रोफाइलमा बचत जन्मस्थान पनि जान्छ।",
        en: "Location sent for a panchanga calculation is used to fulfil that request. A birth place saved on a profile is removed when you delete the account.",
      },
      {
        ne: "मेटाउन नसकेमा support@vedicpatro.com। प्रमाणित अनुरोध ३० दिनभित्र पूरा गर्छौं।",
        en: "If you cannot use in-app deletion, email support@vedicpatro.com. We complete verified requests within 30 days.",
      },
    ],
  },
  {
    heading: { ne: "सुरक्षा", en: "Security" },
    body: [
      {
        ne: "पासवर्ड bcrypt ले ह्यास। एक्सेस टोकन छोटो JWT; रिफ्रेस टोकन ह्यास गरेर राखिन्छ। मोबाइलले टोकन उपकरणको सुरक्षित भण्डारमा राख्छ। API HTTPS मा छ।",
        en: "Passwords are hashed with bcrypt. Access tokens are short-lived JWTs; refresh tokens are stored hashed. The mobile app keeps tokens in the device secure store. The API is served over HTTPS.",
      },
    ],
  },
  {
    heading: { ne: "बालबालिका", en: "Children" },
    body: [
      {
        ne: "यो सेवा १३ वर्षमुनिका बालबालिकाका लागि होइन र हामी जानाजानी त्यस्तो डेटा माग्दैनौं।",
        en: "This service is not directed at children under 13, and we do not knowingly collect their data.",
      },
    ],
  },
  {
    heading: { ne: "सम्पर्क", en: "Contact" },
    body: [
      {
        ne: "प्रश्न वा डेटा अनुरोध: support@vedicpatro.com — Vedic Patro, https://www.vedicpatro.com",
        en: "Questions or data requests: support@vedicpatro.com — Vedic Patro, https://www.vedicpatro.com",
      },
    ],
  },
];

export const TERMS_INTRO = {
  ne: "वैदिक पात्रो प्रयोग गरेर तपाईं यी सर्तहरू मान्नुहुन्छ। सेवा निःशुल्क पञ्चाङ्ग, पात्रो र ज्योतिष उपकरण हो; यो कानुनी, चिकित्सा वा वित्तीय सल्लाह होइन।",
  en: "By using Vedic Patro you agree to these terms. The service is a free panchanga, calendar and jyotish toolkit. It is not legal, medical or financial advice.",
};

export const TERMS_SECTIONS: LegalSection[] = [
  {
    heading: { ne: "सेवा", en: "The service" },
    body: [
      {
        ne: "हामी नेपाली विक्रम संवत् पात्रो, दैनिक पञ्चाङ्ग, मुहूर्त, कुण्डली र सिकाइ सामग्री देखाउँछौं। गणना खगोलीय इन्जिनमा आधारित छन्; छापिएको पात्रोसँग फरक पर्न सक्छ।",
        en: "We show a Nepali Bikram Sambat calendar, daily panchanga, muhurta, kundali and learning material. Figures come from an astronomical engine and can differ from a printed almanac.",
      },
    ],
  },
  {
    heading: { ne: "उपकरण अनुमति", en: "Device permissions" },
    body: [
      {
        ne: "स्थान, क्यामेरा र गति ऐच्छिक हुन्। तपाईंले सम्बन्धित सुविधा चलाएपछि मात्र प्रणालीले अनुमति सोध्छ। अस्वीकार गरे: सहर खोजेर पञ्चाङ्ग हेर्न सकिन्छ; आकाश नक्सा हातले घुमाउन सकिन्छ। विस्तृत विवरण गोपनीयता नीतिमा छ।",
        en: "Location, camera and motion are optional. The system asks only after you turn on the related feature. If you refuse: you can still search a city for panchanga and drag the sky map by hand. Details are in the Privacy Policy.",
      },
    ],
  },
  {
    heading: { ne: "खाता", en: "Accounts" },
    body: [
      {
        ne: "खाता ऐच्छिक हो। तपाईं आफ्नो लग-इनको जिम्मेवार हुनुहुन्छ। एप वा वेबबाट जुनसुकै बेला खाता मेटाउन सकिन्छ।",
        en: "An account is optional. You are responsible for your login. You may delete the account at any time from the app or website.",
      },
    ],
  },
  {
    heading: { ne: "स्वीकार्य प्रयोग", en: "Acceptable use" },
    body: [
      {
        ne: "सेवालाई दुरुपयोग, स्वचालित स्क्र्यापिङले अति भार, वा अरूको खातामा प्रवेश नगर्नुहोस्।",
        en: "Do not abuse the service, overload it with automated scraping, or access someone else’s account.",
      },
    ],
  },
  {
    heading: { ne: "बौद्धिक सम्पत्ति", en: "Intellectual property" },
    body: [
      {
        ne: "एप, वेबसाइट र ब्रान्ड Vedic Patro का हुन्। पञ्चाङ्ग अंक व्यक्तिगत प्रयोगका लागि हेर्न र साझा गर्न सकिन्छ।",
        en: "The app, website and brand belong to Vedic Patro. You may view and share panchanga figures for personal use.",
      },
    ],
  },
  {
    heading: { ne: "अस्वीकरण", en: "Disclaimer" },
    body: [
      {
        ne: "ज्योतिष र मुहूर्त सामग्री सांस्कृतिक/शैक्षिक प्रयोजनका लागि हुन्। महत्त्वपूर्ण निर्णय आफ्नै विवेक वा योग्य सल्लाहकारसँग गर्नुहोस्। सेवा «जस्ताको तस्तै» उपलब्ध छ।",
        en: "Jyotish and muhurta content is cultural and educational. Make important decisions with your own judgement or a qualified adviser. The service is provided as is.",
      },
    ],
  },
  {
    heading: { ne: "परिवर्तन", en: "Changes" },
    body: [
      {
        ne: "हामी यी सर्त वा गोपनीयता नीति अद्यावधिक गर्न सक्छौं। यस पृष्ठको मिति नै पछिल्लो संस्करण हो।",
        en: "We may update these terms or the privacy policy. The date on this page is the current version.",
      },
    ],
  },
  {
    heading: { ne: "सम्पर्क", en: "Contact" },
    body: [
      {
        ne: "support@vedicpatro.com — https://www.vedicpatro.com",
        en: "support@vedicpatro.com — https://www.vedicpatro.com",
      },
    ],
  },
];
