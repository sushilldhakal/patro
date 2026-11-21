//! Text of the daily payload, generated from the Python modules by
//! `scripts/gen_text_tables.py`. Do not edit by hand.

/// `(name_ne, name_en, quality_ne, quality_en, bad)` per choghadiya, Udvega first.
pub(crate) const CHOGHADIYA: [(&str, &str, &str, &str, bool); 7] = [
    (
        "उद्वेग",
        "Udvega",
        "चिन्ता (महत्त्वपूर्ण काम टाढा राख्नुहोस्)",
        "Anxiety (Avoid Important Tasks)",
        true,
    ),
    (
        "चर",
        "Chara",
        "यात्रा र चलचलका लागि राम्रो",
        "Good for Movement & Travel",
        false,
    ),
    ("लाभ", "Labha", "लाभ", "Gain", false),
    (
        "अमृत",
        "Amrita",
        "उत्तम (अत्यन्त शुभ)",
        "Excellent (Highly Auspicious)",
        false,
    ),
    ("काल", "Kala", "अशुभ", "Inauspicious", true),
    ("शुभ", "Shubha", "शुभ", "Auspicious", false),
    (
        "रोग",
        "Roga",
        "रोग (महत्त्वपूर्ण काम टाढा राख्नुहोस्)",
        "Disease (Avoid Important Tasks)",
        true,
    ),
];
/// Choghadiya day/night start index per weekday (Sunday first).
pub(crate) const CHO_DAY_START: [usize; 7] = [0, 3, 6, 2, 5, 1, 4];
pub(crate) const CHO_NIGHT_START: [usize; 7] = [5, 1, 4, 0, 3, 6, 2];
/// Chaldean hora order.
pub(crate) const HORA_SEQUENCE: [&str; 7] = [
    "sun", "venus", "mercury", "moon", "saturn", "jupiter", "mars",
];

/// Weekday lords, Sunday first.
pub(crate) const DAY_LORD: [&str; 7] = [
    "sun", "moon", "mars", "mercury", "jupiter", "venus", "saturn",
];

/// `(key, planet_ne, planet_en, bad)` per hora lord.
pub(crate) const HORA_PLANETS: [(&str, &str, &str, bool); 7] = [
    ("sun", "आदित्य", "Sun", true),
    ("moon", "चन्द्र", "Moon", false),
    ("mars", "मङ्गल", "Mars", true),
    ("mercury", "बुध", "Mercury", false),
    ("jupiter", "बृहस्पति", "Jupiter", false),
    ("venus", "शुक्र", "Venus", false),
    ("saturn", "शनि", "Saturn", true),
];
/// `(number, name, name_sanskrit, name_ne, season)` per ritu, Vasanta first.
pub(crate) const RITU: [(u32, &str, &str, &str, &str); 6] = [
    (1, "Vasanta", "Vasanta", "वसन्त", "Spring"),
    (2, "Grishma", "Grishma", "ग्रीष्म", "Summer"),
    (3, "Varsha", "Varsha", "वर्षा", "Monsoon"),
    (4, "Sharad", "Sharad", "शरद", "Autumn"),
    (5, "Hemanta", "Hemanta", "हेमन्त", "Pre-winter"),
    (6, "Shishira", "Shishira", "शिशिर", "Winter"),
];
/// `(tara, tara_en, quality, quality_en, tone)` per navatara 1–9.
pub const NAVATARA: [(&str, &str, &str, &str, &str); 9] = [
    ("जन्म", "Janma", "मध्यम", "Medium", "neutral"),
    ("सम्पत्", "Sampat", "अति शुभ", "Very auspicious", "best"),
    ("विपत्", "Vipat", "अशुभ", "Inauspicious", "bad"),
    ("क्षेम", "Kshema", "अति शुभ", "Very auspicious", "best"),
    ("प्रत्यक्", "Pratyak", "अशुभ", "Inauspicious", "bad"),
    ("साधक", "Sadhaka", "अति शुभ", "Very auspicious", "best"),
    ("निधन", "Naidhana", "घातक", "Fatal", "worst"),
    ("मित्र", "Mitra", "शुभ", "Auspicious", "good"),
    (
        "परम मित्र",
        "Parama Mitra",
        "अति शुभ",
        "Very auspicious",
        "best",
    ),
];
/// Nama-rashi syllables, Mesha first.
pub const RASHI_NAMA_AKSHARAS_NE: [&str; 12] = [
    "चु चे चो ला लि लु ले लो अ",
    "इ उ ए ओ वा वि वु वे वो",
    "का कि कु घ ङ छ के को हा",
    "हि हु हे हो डा डि डु डे डो",
    "मा मि मु मे मो टा ति टु टे",
    "टो पा पि पु ष ण ठ पे पो",
    "रा रि रु रे रो ता ति तु ते",
    "तो ना नि नु ने नो या यि यु",
    "ये यो भा भि भु धा फा ढा भे",
    "भो जा जि जु जे जो ख खि खु खे खो गा गि",
    "गु गे गो सा सि सु से सो दा",
    "दि दु थ झ ञ दे दो चा चि",
];

/// Rashi titles for the rashifal.
pub const RASHI_TITLE_EN: [&str; 12] = [
    "Mesh",
    "Vrish",
    "Mithun",
    "Karkat",
    "Simha",
    "Kanya",
    "Tula",
    "Vrishchik",
    "Dhanu",
    "Makar",
    "Kumbha",
    "Meen",
];

/// `MOORTI_NE`, by moorti (swarna, rajata, tamra, loha).
pub(crate) const MOORTI_NE: [&str; 4] = ["स्वर्ण", "रजत", "ताम्र", "लोह"];

/// `MOORTI_EN`, by moorti (swarna, rajata, tamra, loha).
pub(crate) const MOORTI_EN: [&str; 4] = [
    "Swarna (gold)",
    "Rajata (silver)",
    "Tamra (copper)",
    "Loha (iron)",
];

/// `LUCKY_COLOR_NE`, by moorti (swarna, rajata, tamra, loha).
pub(crate) const LUCKY_COLOR_NE: [&str; 4] = ["पहेलो", "सेतो", "हरियो", "रातो"];

/// `LUCKY_COLOR_EN`, by moorti (swarna, rajata, tamra, loha).
pub(crate) const LUCKY_COLOR_EN: [&str; 4] = ["Yellow", "White", "Green", "Red"];

/// `MOORTI_PHALA_NE`, by moorti (swarna, rajata, tamra, loha).
pub(crate) const MOORTI_PHALA_NE: [&str; 4] = [
    "गोचर चन्द्रको मूर्ति स्वर्ण — फलदायी।",
    "मूर्ति रजत — शुभ फल प्राप्त हुनेछ।",
    "मूर्ति ताम्र — सामान्य; धैर्य र सावधानी राख्नुहोस्।",
    "मूर्ति लोह — फल कमजोर; उपाय र संयम अपनाउनुहोला।",
];

/// `MOORTI_PHALA_EN`, by moorti (swarna, rajata, tamra, loha).
pub(crate) const MOORTI_PHALA_EN: [&str; 4] = [
    "Transit Moorti is Swarna — highly fruitful.",
    "Rajata Moorti — favourable results.",
    "Tamra Moorti — average; stay patient and careful.",
    "Loha Moorti — results may fall short; remedies and restraint help.",
];

/// By tone (best, good, neutral, bad, worst).
pub(crate) const TONE_PHALA_NE: [&str; 5] = [
    "चन्द्रबल अनुकूल — महत्त्वपूर्ण काम, यात्रा र नयाँ सुरुवातका लागि शुभ।",
    "प्रायः अनुकूल दिन — योजना र सम्बन्धमा स्थिर प्रगति।",
    "मध्यम वा मिश्र फल — सावधानी अपनाउनुहोस्; दैनिक काम ठीक छ।",
    "चन्द्रबल कमजोर — ठूला निर्णय स्थगित गर्नुहोस्; जोखिम टाढा राख्नुहोला।",
    "अति अशुभ चन्द्रबल — जोखिमपूर्ण कार्य नगर्नुहोस्; साधना र विश्राम श्रेय।",
];

/// By tone (best, good, neutral, bad, worst).
pub(crate) const TONE_PHALA_EN: [&str; 5] = [
    "Strong chandrabala — auspicious for important work, travel and new beginnings.",
    "Generally favourable — steady progress on plans and relationships.",
    "Mixed or moderate — proceed with care; routine work is fine.",
    "Weak chandrabala — delay major decisions; avoid unnecessary risk.",
    "Very inauspicious chandrabala — avoid risky ventures; rest and spiritual practice help.",
];

/// Remedies for a weak day, by rashi.
pub(crate) const REMEDY_NE: [&str; 12] = [
    "सबै प्रकारका जोखिमपूर्ण कार्यबाट टाढै रहनुहोला।",
    "आफ्नो इष्टदेव वा कुलदेवताको स्मरण गरी दिनको प्रारम्भ गर्नुहोला।",
    "घरमा शान्ति कायम राख्न रिसलाई नियन्त्रण गर्नुहोला।",
    "नजिकको मन्दिरमा दियो बाल्नु वा दानपुण्य गर्नु शान्तिदायक हुनेछ।",
    "खानपानमा ध्यान दिनुहोला।",
    "भगवान गणेशको दर्शन गरी दान गर्नु शुभ रहनेछ।",
    "कार्यक्षेत्रमा सम्मानजनक व्यवहार गर्नुहोला।",
    "महामृत्युञ्जय जप वा शिवजीको उपासना गर्नुहोला।",
    "लगनशीलता र धैर्यता कायम राख्नुहोला।",
    "मान्यजन र गुरुहरूको सम्मान गर्नुहोला।",
    "पिपलमा जल चढाउनु वा विष्णुको दर्शन गर्नुहोला।",
    "सवारी साधनमा सावधानी अपनाउनुहोला।",
];

/// Remedies for a weak day, by rashi.
pub(crate) const REMEDY_EN: [&str; 12] = [
    "Stay away from all risky undertakings.",
    "Begin the day remembering your ishta or kuladevata.",
    "Keep peace at home and hold anger in check.",
    "Light a lamp at a nearby temple or give charity for calm.",
    "Mind what you eat.",
    "Visit Ganesh and give a small donation.",
    "Treat colleagues with respect.",
    "Chant Mahamrityunjaya or worship Shiva.",
    "Stay diligent and patient.",
    "Honour elders and teachers.",
    "Offer water at a pipal tree or visit Vishnu.",
    "Be careful in vehicles.",
];

/// Disha shool directions (E, W, N, S). Fields: `key`, `name_en`, `name_ne`.
pub(crate) const DIRECTIONS: [(&str, &str, &str); 4] = [
    ("E", "East", "पूर्व"),
    ("W", "West", "पश्चिम"),
    ("N", "North", "उत्तर"),
    ("S", "South", "दक्षिण"),
];
/// Rahu vasa by Python weekday (Monday first). Fields: `direction_key`, `name_en`, `name_ne`.
pub(crate) const RAHU_VASA: [(&str, &str, &str); 7] = [
    ("NW", "North-West", "वायव्य"),
    ("W", "West", "पश्चिम"),
    ("SW", "South-West", "नैऋत्य"),
    ("S", "South", "दक्षिण"),
    ("SE", "South-East", "आग्नेय"),
    ("E", "East", "पूर्व"),
    ("N", "North", "उत्तर"),
];
/// Agnivasa abodes. Fields: `name_en`, `name_ne`, `subtitle_en`, `subtitle_ne`, `is_auspicious`.
pub(crate) const AGNIVASA: [(&str, &str, &str, &str, bool); 3] = [
    ("Prithvi", "पृथ्वी", "Earth", "भूमि", true),
    ("Akasha", "आकाश", "Sky", "आकाश", false),
    ("Patala", "पाताल", "Nadir", "पाताल", false),
];
/// Shiva vasa abodes, Kailase first. Fields: `name_en`, `name_ne`, `is_auspicious`.
pub(crate) const SHIVAVASA: [(&str, &str, bool); 7] = [
    ("Kailase", "कैलास", true),
    ("Gauri-sannidhau", "गौरी सन्निधि", true),
    ("Vrishabhaarudha", "वृषभारूढ", true),
    ("Sabhayam", "सभा", false),
    ("Bhojane", "भोजन", false),
    ("Kridayam", "क्रीडा", false),
    ("Shmashane", "श्मशान", false),
];
/// Homahuti graha mukhas. Fields: `key`, `symbol`, `name_en`, `name_ne`, `is_auspicious`.
pub(crate) const HOMAHUTI_GRAHAS: [(&str, &str, &str, &str, bool); 9] = [
    ("sun", "☉", "Surya", "सूर्य", false),
    ("mercury", "☿", "Budha", "बुध", true),
    ("venus", "♀", "Shukra", "शुक्र", true),
    ("saturn", "♄", "Shani", "शनि", false),
    ("moon", "☽", "Chandra", "चन्द्र", true),
    ("mars", "♂", "Mangala", "मंगल", false),
    ("jupiter", "♃", "Guru", "गुरु", true),
    ("rahu", "☊", "Rahu", "राहु", false),
    ("ketu", "☋", "Ketu", "केतु", false),
];
/// Kumbha chakra parts. Fields: `name_en`, `name_ne`, `is_auspicious`.
pub(crate) const KUMBHACHAKRA_PARTS: [(&str, &str, bool); 7] = [
    ("Head", "शिर", false),
    ("Eyes", "नेत्र", false),
    ("Throat", "कण्ठ", false),
    ("Heart", "हृदय", false),
    ("Navel", "नाभि", false),
    ("Bottom", "अधोभाग", true),
    ("Thighs", "जङ्घा", false),
];
/// Bhadra loka (swarga, prithvi, patala). Fields: `name_en`, `name_ne`, `subtitle_en`, `subtitle_ne`, `is_auspicious`.
pub(crate) const BHADRA_LOKA: [(&str, &str, &str, &str, bool); 3] = [
    ("Swarga", "स्वर्ग", "Heaven", "स्वर्ग", true),
    ("Prithvi", "पृथ्वी", "Earth", "भूमि", false),
    ("Patala", "पाताल", "Nadir", "पाताल", true),
];
