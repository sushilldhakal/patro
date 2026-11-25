// Generated from apps/rust/crates/jyotish/src/rashifal/{tables,personal_tables}.rs by scripts/gen-rashifal-tables.py; do not edit.

export const GOCHAR_BENEFIC_HOUSES = [
    [3, 6, 10, 11],
    [1, 3, 6, 7, 10, 11],
    [3, 6, 11],
    [2, 4, 6, 8, 10, 11],
    [2, 5, 7, 9, 11],
    [1, 2, 3, 4, 5, 8, 9, 11, 12],
    [3, 6, 11],
    [3, 6, 10, 11],
    [3, 6, 11],
] as const;

export const VEDHA = [
    [0, 0, 0, 9, 10, 11, 12, 0, 0, 3, 4, 5, 6],
    [0, 5, 7, 9, 10, 1, 12, 2, 11, 3, 4, 8, 6],
    [0, 0, 0, 12, 0, 11, 9, 0, 0, 6, 0, 5, 3],
    [0, 8, 5, 4, 3, 2, 9, 10, 1, 6, 7, 12, 11],
    [0, 0, 12, 7, 5, 4, 0, 3, 11, 10, 9, 8, 2],
    [0, 8, 7, 1, 10, 9, 0, 0, 5, 11, 0, 3, 6],
    [0, 0, 0, 12, 0, 11, 9, 0, 0, 6, 0, 5, 3],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
] as const;

export const GRAHA_PERIOD_WEIGHT = [
    [1.2, 3.0, 1.0, 1.2, 0.8, 1.2, 0.8, 0.6, 0.6],
    [1.4, 2.0, 1.2, 1.4, 1.0, 1.4, 1.0, 0.7, 0.7],
    [2.0, 0.8, 1.5, 1.5, 1.4, 1.5, 1.3, 1.0, 1.0],
    [0.8, 0.2, 1.0, 0.6, 2.5, 0.8, 2.5, 1.5, 1.5],
] as const;

export const LAYER_WEIGHTS = [
    [0.3, 0.22, 0.1, 0.12, 0.12, 0.08, 0.04, 0.02],
    [0.34, 0.16, 0.07, 0.14, 0.13, 0.09, 0.07, 0.0],
    [0.38, 0.08, 0.04, 0.16, 0.14, 0.1, 0.1, 0.0],
    [0.4, 0.03, 0.02, 0.17, 0.14, 0.09, 0.15, 0.0],
] as const;

export const LAYER_KEYS = [
    "gochar",
    "chandrabala",
    "moorti",
    "ashtakavarga",
    "rashi_lord",
    "sudarshana",
    "cycle",
    "vaara_hora",
] as const;

export const LAYER_LABEL_NE = [
    "गोचर फल",
    "चन्द्रबल",
    "मूर्ति निर्णय",
    "अष्टकवर्ग",
    "राशिस्वामी",
    "सुदर्शन चक्र",
    "कालचक्र",
    "वार/होरा",
] as const;

export const LAYER_LABEL_EN = [
    "Gochar phala",
    "Chandrabala",
    "Moorti nirnaya",
    "Ashtakavarga",
    "Sign lord",
    "Sudarshana chakra",
    "Time cycle",
    "Vaara / hora",
] as const;

export const CYCLE_GRAHA = ["moon", "moon", "sun", "jupiter"] as const;

export const HOUSE_STANDING = [
    0.0, 0.45, 0.35, 0.25, 0.3, 0.6, -0.4, 0.2, -0.75, 0.7, 0.55, 0.75, -0.55,
] as const;

export const MOORTI_BY_HOUSE = [0, 0, 1, 2, 3, 1, 0, 2, 3, 1, 2, 0, 3] as const;

export const MOORTI_KEYS = ["swarna", "rajata", "tamra", "loha"] as const;

export const MOORTI_NE = ["स्वर्ण", "रजत", "ताम्र", "लोह"] as const;

export const MOORTI_EN = [
    "Swarna (gold)",
    "Rajata (silver)",
    "Tamra (copper)",
    "Loha (iron)",
] as const;

export const MOORTI_SCORE = [1.0, 0.5, -0.25, -1.0] as const;

export const LORD_NUMBER = [1, 2, 9, 5, 3, 6, 8, 4, 7] as const;

export const LORD_COLOR_NE = [
    "रक्तवर्ण",
    "सेतो",
    "हल्का रातो",
    "घाँसे हरियो",
    "पहेँलो",
    "विविधरङ्गी",
    "कालो",
    "धुम्र",
    "खैरो",
] as const;

export const LORD_COLOR_EN = [
    "Blood red",
    "White",
    "Pale red",
    "Grass green",
    "Yellow",
    "Variegated",
    "Dark",
    "Smoke grey",
    "Grey",
] as const;

export const LORD_DISHA_NE = [
    "पूर्व",
    "वायव्य",
    "दक्षिण",
    "उत्तर",
    "ईशान",
    "आग्नेय",
    "पश्चिम",
    "नैऋत्य",
    "नैऋत्य",
] as const;

export const LORD_DISHA_EN = [
    "East",
    "North-west",
    "South",
    "North",
    "North-east",
    "South-east",
    "West",
    "South-west",
    "South-west",
] as const;

export const REMEDY_NE = [
    "आदित्य हृदय स्तोत्र पाठ गर्नुहोस्; बिहान सूर्यलाई जल अर्घ्य दिनुहोस्।",
    "सोमबार शिवजीलाई जल चढाउनुहोस्; मनलाई अशान्त पार्ने कुराबाट टाढा रहनुहोस्।",
    "मङ्गलबार हनुमान चालीसा पाठ गर्नुहोस्; रिस र हतारो नियन्त्रण गर्नुहोस्।",
    "बुधबार गणेशजीको दर्शन गरी हरियो वस्तु दान गर्नुहोस्; लिखित कागजात ध्यानपूर्वक हेर्नुहोस्।",
    "बिहीबार गुरु/मान्यजनको सम्मान गर्नुहोस् र पहेँलो वस्तु दान गर्नुहोस्।",
    "शुक्रबार लक्ष्मीपूजा गर्नुहोस्; अनावश्यक खर्च र विलासितामा संयम राख्नुहोस्।",
    "शनिबार तेल दान वा कालो तिल अर्पण गर्नुहोस्; श्रमिक र वृद्धहरूको सेवा गर्नुहोस्।",
    "दुर्गा वा भैरवको स्मरण गर्नुहोस्; भ्रम फैलाउने सूचना र छोटो बाटोबाट बच्नुहोस्।",
    "गणेश वा भैरवको दर्शन गर्नुहोस्; ध्यान र एकाग्रता बढाउनुहोस्।",
] as const;

export const REMEDY_EN = [
    "Recite the Aditya Hridaya and offer water to the Sun at dawn.",
    "Offer water to Shiva on Monday; keep away from what unsettles the mind.",
    "Read the Hanuman Chalisa on Tuesday; hold anger and haste in check.",
    "Visit Ganesh on Wednesday and give something green; read documents carefully.",
    "Honour teachers and elders on Thursday and donate something yellow.",
    "Perform Lakshmi puja on Friday; restrain unnecessary spending and indulgence.",
    "Donate oil or black sesame on Saturday; serve workers and the elderly.",
    "Remember Durga or Bhairava; avoid rumour, shortcuts and unclear information.",
    "Visit Ganesh or Bhairava; strengthen meditation and focus.",
] as const;

export const DOMAIN_KEYS = ["career", "finance", "health", "love", "learning", "travel"] as const;

export const DOMAIN_NE = ["करियर", "आर्थिक", "स्वास्थ्य", "सम्बन्ध", "अध्ययन", "यात्रा"] as const;

export const DOMAIN_EN = [
    "Career",
    "Finance",
    "Health",
    "Relationships",
    "Learning",
    "Travel",
] as const;

export const DOMAIN_HOUSES = [
    [[10, 1.0], [6, 0.6], [3, 0.5], [11, 0.5]],
    [[2, 1.0], [11, 0.9], [9, 0.5], [5, 0.4]],
    [[1, 1.0], [6, 0.7], [8, 0.4], [12, 0.3]],
    [[7, 1.0], [5, 0.8], [4, 0.5], [12, 0.3]],
    [[5, 1.0], [4, 0.7], [9, 0.7], [2, 0.4]],
    [[3, 1.0], [9, 0.8], [12, 0.6], [7, 0.3]],
] as const;

export const DOMAIN_KARAKA = [
    ["saturn", "sun"],
    ["jupiter", "venus"],
    ["sun", "moon"],
    ["venus", "moon"],
    ["mercury", "jupiter"],
    ["mercury", "moon"],
] as const;

export const HOUSE_THEME_NE = [
    "",
    "शरीर र आत्मविश्वास",
    "धन, वाणी र परिवार",
    "साहस, प्रयास र भाइबहिनी",
    "घर, माता र मनको शान्ति",
    "बुद्धि, सिर्जना र सन्तान",
    "प्रतिस्पर्धा, सेवा र स्वास्थ्य",
    "साझेदारी र वैवाहिक जीवन",
    "परिवर्तन, गुप्त विषय र जोखिम",
    "भाग्य, धर्म र गुरु",
    "कर्म, पेशा र प्रतिष्ठा",
    "लाभ, नेटवर्क र आकांक्षा",
    "खर्च, विदेश र विश्राम",
] as const;

export const HOUSE_THEME_EN = [
    "",
    "body and self-confidence",
    "money, speech and family",
    "courage, effort and siblings",
    "home, mother and peace of mind",
    "intellect, creativity and children",
    "competition, service and health",
    "partnership and married life",
    "change, hidden matters and risk",
    "fortune, dharma and mentors",
    "work, profession and standing",
    "gains, networks and aspirations",
    "expenses, foreign lands and rest",
] as const;

export const PERIOD_NE = ["आज", "यो हप्ता", "यो महिना", "यो वर्ष"] as const;

export const PERIOD_EN = ["Today", "This week", "This month", "This year"] as const;

export const TONE_KEYS = ["worst", "bad", "neutral", "good", "best"] as const;

export const TONE_OPENER_NE = [
    "{period} अति प्रतिकूल — जोखिमपूर्ण कार्य नगर्नुहोस्; धैर्य, साधना र विश्राम श्रेय।",
    "{period} ग्रहस्थिति कमजोर — ठूला निर्णय स्थगित गर्नु र जोखिम टार्नु उचित।",
    "{period} मिश्र फल — सामान्य काम राम्रै चल्छ, ठूला दाउ नखेल्नुहोस्।",
    "{period} प्रायः अनुकूल — योजना र सम्बन्धमा स्थिर प्रगति हुनेछ।",
    "{period} ग्रहयोग बलियो छ — महत्त्वपूर्ण काम, यात्रा र नयाँ सुरुवातका लागि शुभ।",
] as const;

export const TONE_OPENER_EN = [
    "{period} is strongly adverse — avoid risky ventures; patience, practice and rest serve better.",
    "{period} the transits are weak — postpone major decisions and sidestep risk.",
    "{period} is mixed — routine work goes fine, but avoid large bets.",
    "{period} is broadly favourable — steady progress on plans and relationships.",
    "{period} the transits are strong — auspicious for important work, travel and new beginnings.",
] as const;

export const TONE_CLOSER_NE = [
    "यात्रा, विवाद र ठूलो लगानी सकेसम्म टार्नुहोस्; धैर्य नै यस अवधिको सबैभन्दा ठूलो उपाय हो।",
    "नयाँ लगानी र हस्ताक्षरका काम केही समय पछि सार्नुहोस्; स्वास्थ्य र वाणीमा संयम राख्नुहोस्।",
    "ठूलो अपेक्षा नराखी नियमित काममा ध्यान दिनुहोस् — साना निर्णय आफैँ मिल्दै जान्छन्।",
    "योजनाबद्ध रूपमा अघि बढ्दा नतिजा पक्षमा आउँछ; अनावश्यक विवादबाट टाढै रहनुहोस्।",
    "ठूला काम अघि बढाउने हो भने यही अवधि उपयुक्त छ; तर सर्त र कागजात स्पष्ट राख्नुहोस्।",
] as const;

export const TONE_CLOSER_EN = [
    "Defer travel, disputes and any large outlay where you can; patience is the strongest remedy this period has.",
    "Push new investment and anything requiring a signature further out; keep restraint over health and speech.",
    "Keep expectations modest and attend to routine work — the smaller decisions settle themselves.",
    "Planned, deliberate steps pay off; stay clear of avoidable disputes.",
    "If you mean to push something big forward, this is the window — keep terms and paperwork explicit.",
] as const;

export const DIGNITY_KEYS = [
    "exalted",
    "moolatrikona",
    "own",
    "friend",
    "neutral",
    "enemy",
    "debilitated",
] as const;

export const DIGNITY_NE = [
    "उच्च",
    "मूलत्रिकोण",
    "स्वगृही",
    "मित्रक्षेत्री",
    "समक्षेत्री",
    "शत्रुक्षेत्री",
    "नीच",
] as const;

export const DIGNITY_EN = [
    "Exalted",
    "Moolatrikona",
    "Own sign",
    "Friend's sign",
    "Neutral sign",
    "Enemy's sign",
    "Debilitated",
] as const;

export const RELATION_NE = ["स्वयं", "मित्र", "सम", "शत्रु"] as const;

export const RELATION_EN = ["the sign lord itself", "friendly", "neutral", "hostile"] as const;

export const GRADE_FLOOR = [
    [75, "full", "पूर्ण बल", "Full"],
    [50, "medium", "मध्यम बल", "Medium"],
    [25, "small", "अल्प बल", "Small"],
    [0, "nil", "निर्बल", "Nil"],
] as const;

export const PERSONAL_LAYER_WEIGHTS = [
    [0.3, 0.18, 0.08, 0.12, 0.11, 0.15, 0.04, 0.02],
    [0.32, 0.13, 0.06, 0.14, 0.12, 0.18, 0.05, 0.0],
    [0.34, 0.06, 0.03, 0.15, 0.13, 0.25, 0.04, 0.0],
    [0.32, 0.02, 0.01, 0.15, 0.11, 0.35, 0.04, 0.0],
] as const;

export const PERSONAL_LAYER_KEYS = [
    "gochar",
    "chandrabala",
    "moorti",
    "ashtakavarga",
    "rashi_lord",
    "dasha",
    "cycle",
    "vaara_hora",
] as const;

export const PERSONAL_LAYER_LABEL_NE = [
    "गोचर फल",
    "चन्द्रबल",
    "मूर्ति निर्णय",
    "अष्टकवर्ग",
    "राशिस्वामी",
    "विंशोत्तरी दशा",
    "कालचक्र",
    "वार/होरा",
] as const;

export const PERSONAL_LAYER_LABEL_EN = [
    "Gochar phala",
    "Chandrabala",
    "Moorti nirnaya",
    "Ashtakavarga",
    "Sign lord",
    "Vimshottari dasha",
    "Time cycle",
    "Vaara / hora",
] as const;

export const PERSONAL_TONE_OPENER_NE = [
    "{period} तपाईंको जन्मकुण्डलीका हिसाबले अति प्रतिकूल छ — जोखिमपूर्ण काम नगर्नुहोस्।",
    "{period} तपाईंको कुण्डलीअनुसार सावधानी आवश्यक छ — ठूला निर्णय स्थगित गर्नुहोस्।",
    "{period} मिश्र फल दिन्छ — सामान्य काम राम्रै चल्छ।",
    "{period} तपाईंको कुण्डलीका हिसाबले प्रायः अनुकूल छ।",
    "{period} तपाईंको जन्मकुण्डलीअनुसार अत्यन्त अनुकूल छ — महत्त्वपूर्ण काम अगाडि बढाउनुहोस्।",
] as const;

export const PERSONAL_TONE_OPENER_EN = [
    "{period} is strongly adverse by your birth chart — avoid risky ventures.",
    "{period} calls for care by your chart — postpone major decisions.",
    "{period} is mixed — routine work goes fine.",
    "{period} is broadly favourable by your chart.",
    "{period} reads very strong against your birth chart — a good window to push important work forward.",
] as const;

export const PERSONAL_TONE_CLOSER_NE = [
    "यात्रा, विवाद र ठूलो लगानी सकेसम्म टार्नुहोस्; धैर्य नै यस अवधिको सबैभन्दा ठूलो उपाय हो।",
    "नयाँ लगानी, ऋण र हस्ताक्षरका काम केही समय पछि सार्नुहोस्; स्वास्थ्य र वाणीमा संयम राख्नुहोस्।",
    "ठूलो अपेक्षा नराखी नियमित काममा ध्यान दिनुहोस् — साना निर्णय आफैँ मिल्दै जान्छन्।",
    "योजनाबद्ध रूपमा अघि बढ्दा नतिजा पक्षमा आउँछ; अनावश्यक विवाद र हतारो निर्णयबाट टाढै रहनुहोस्।",
    "जोखिम लिने हो भने यही अवधि उपयुक्त छ; तर लिखित सहमति र स्पष्ट सर्तमा मात्र अघि बढ्नुहोस्।",
] as const;

export const PERSONAL_TONE_CLOSER_EN = [
    "Defer travel, disputes and any large outlay where you can; patience is the strongest remedy this period has.",
    "Push new investment, borrowing and anything requiring a signature a little further out; keep restraint over health and speech.",
    "Keep expectations modest and attend to routine work — the smaller decisions settle themselves.",
    "Planned, deliberate steps pay off; stay clear of avoidable disputes and rushed decisions.",
    "If you are going to take a risk, this is the window for it — but move only on written agreements and clear terms.",
] as const;

export const NATAL_CHAKRA_WEIGHTS = [0.5, 0.3, 0.2] as const;

export const CHAKRA_NE = ["लग्न", "चन्द्र", "सूर्य"] as const;

export const CHAKRA_EN = ["Lagna", "Chandra", "Surya"] as const;

export const CHAKRA_GLOSS_NE = [
    "आफ्नै प्रयास, शरीर र आत्मविश्वास",
    "मन, भावना र घरेलु शान्ति",
    "प्रतिष्ठा, अधिकार र पदीय पक्ष",
] as const;

export const CHAKRA_GLOSS_EN = [
    "your own effort, body and confidence",
    "mind, emotion and domestic peace",
    "standing, authority and position",
] as const;

export const BENEFIC_HOUSES = [
    [
        [1, 2, 4, 7, 8, 9, 10, 11],
        [3, 6, 10, 11],
        [1, 2, 4, 7, 8, 9, 10, 11],
        [3, 5, 6, 9, 10, 11, 12],
        [5, 6, 9, 11],
        [6, 7, 12],
        [1, 2, 4, 7, 8, 9, 10, 11],
        [3, 4, 6, 10, 11, 12],
    ],
    [
        [3, 6, 7, 8, 10, 11],
        [1, 3, 6, 7, 10, 11],
        [2, 3, 5, 6, 9, 10, 11],
        [1, 3, 4, 5, 7, 8, 10, 11],
        [1, 4, 7, 8, 10, 11, 12],
        [3, 4, 5, 7, 9, 10, 11],
        [3, 5, 6, 11],
        [3, 6, 10, 11],
    ],
    [
        [3, 5, 6, 10, 11],
        [3, 6, 11],
        [1, 2, 4, 7, 8, 10, 11],
        [3, 5, 6, 11],
        [6, 10, 11, 12],
        [6, 8, 11, 12],
        [1, 4, 7, 8, 9, 10, 11],
        [1, 3, 6, 10, 11],
    ],
    [
        [5, 6, 9, 11, 12],
        [2, 4, 6, 8, 10, 11],
        [1, 2, 4, 7, 8, 9, 10, 11],
        [1, 3, 5, 6, 9, 10, 11, 12],
        [6, 8, 11, 12],
        [1, 2, 3, 4, 5, 8, 9, 11],
        [1, 2, 4, 7, 8, 9, 10, 11],
        [1, 2, 4, 6, 8, 10, 11],
    ],
    [
        [1, 2, 3, 4, 7, 8, 9, 10, 11],
        [2, 5, 7, 9, 11],
        [1, 2, 4, 7, 8, 10, 11],
        [1, 2, 4, 5, 6, 9, 10, 11],
        [1, 2, 3, 4, 7, 8, 10, 11],
        [2, 5, 6, 9, 10, 11],
        [3, 5, 6, 12],
        [1, 2, 4, 5, 6, 7, 9, 10, 11],
    ],
    [
        [8, 11, 12],
        [1, 2, 3, 4, 5, 8, 9, 11, 12],
        [3, 5, 6, 9, 11, 12],
        [3, 5, 6, 9, 11],
        [5, 8, 9, 10, 11],
        [1, 2, 3, 4, 5, 8, 9, 10, 11],
        [3, 4, 5, 8, 9, 10, 11],
        [1, 2, 3, 4, 5, 8, 9, 11],
    ],
    [
        [1, 2, 4, 7, 8, 10, 11],
        [3, 6, 11],
        [3, 5, 6, 10, 11, 12],
        [6, 8, 9, 10, 11, 12],
        [5, 6, 11, 12],
        [6, 11, 12],
        [3, 5, 6, 11],
        [1, 3, 4, 6, 10, 11],
    ],
    [
        [3, 4, 6, 10, 11, 12],
        [3, 6, 10, 11, 12],
        [1, 3, 6, 10, 11],
        [1, 2, 4, 6, 8, 10, 11],
        [1, 2, 4, 5, 6, 7, 9, 10, 11],
        [1, 2, 3, 4, 5, 8, 9],
        [1, 3, 4, 6, 10, 11],
        [3, 6, 10, 11],
    ],
] as const;

export const RASIMANA = [7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12] as const;

export const GRAHAMANA = [5, 5, 8, 5, 10, 7, 5] as const;
