// Generated from apps/rust/crates/jyotish/src/kundali_detail.rs (the avakahada tables); do not edit.
/** Per nakshatra: name, English name, the four pada aksharas, the four charan rashis, yoni, gana. */
export const AVAKAHADA: readonly [string, string, string[], number[], string, string][] = [["अश्विनी", "Ashwini", ["चू", "चे", "चो", "ला"], [1, 1, 1, 1], "अश्व", "देव"], ["भरणी", "Bharani", ["ली", "लू", "ले", "लो"], [1, 1, 1, 1], "गज", "नर"], ["कृत्तिका", "Krittika", ["अ", "ई", "उ", "ए"], [1, 2, 2, 2], "अज", "राक्षस"], ["रोहिणी", "Rohini", ["ओ", "वा", "वी", "वू"], [2, 2, 2, 2], "सर्प", "नर"], ["मृगशिरा", "Mrigashira", ["वे", "वो", "का", "की"], [2, 2, 3, 3], "सर्प", "देव"], ["आर्द्रा", "Ardra", ["कु", "घ", "ङ", "छ"], [3, 3, 3, 3], "श्वान", "नर"], ["पुनर्वसु", "Punarvasu", ["के", "को", "हा", "ही"], [3, 3, 3, 4], "मार्जार", "देव"], ["पुष्य", "Pushya", ["हु", "हे", "हो", "डा"], [4, 4, 4, 4], "अज", "देव"], ["आश्लेषा", "Ashlesha", ["डी", "डू", "डे", "डो"], [4, 4, 4, 4], "मार्जार", "राक्षस"], ["मघा", "Magha", ["मा", "मी", "मू", "मे"], [5, 5, 5, 5], "मूषक", "राक्षस"], ["पूर्वाफाल्गुनी", "Purva Phalguni", ["मो", "टा", "टी", "टू"], [5, 5, 5, 5], "मूषक", "नर"], ["उत्तराफाल्गुनी", "Uttara Phalguni", ["टे", "टो", "पा", "पी"], [5, 6, 6, 6], "गौ", "नर"], ["हस्त", "Hasta", ["पू", "ष", "ण", "ठ"], [6, 6, 6, 6], "महिष", "देव"], ["चित्रा", "Chitra", ["पे", "पो", "रा", "री"], [6, 6, 7, 7], "व्याघ्र", "राक्षस"], ["स्वाती", "Swati", ["रू", "रे", "रो", "ता"], [7, 7, 7, 7], "महिष", "देव"], ["विशाखा", "Vishakha", ["ती", "तू", "ते", "तो"], [7, 7, 7, 8], "व्याघ्र", "राक्षस"], ["अनुराधा", "Anuradha", ["ना", "नी", "नू", "ने"], [8, 8, 8, 8], "मृग", "देव"], ["ज्येष्ठा", "Jyeshtha", ["नो", "या", "यी", "यू"], [8, 8, 8, 8], "मृग", "राक्षस"], ["मूल", "Mula", ["ये", "यो", "भा", "भी"], [9, 9, 9, 9], "श्वान", "राक्षस"], ["पूर्वाषाढा", "Purva Ashadha", ["भू", "धा", "फा", "ढा"], [9, 9, 9, 9], "वानर", "नर"], ["उत्तराषाढा", "Uttara Ashadha", ["भे", "भो", "जा", "जी"], [9, 10, 10, 10], "नकुल", "नर"], ["श्रवण", "Shravana", ["खी", "खू", "खे", "खो"], [10, 10, 10, 10], "वानर", "देव"], ["धनिष्ठा", "Dhanishta", ["गा", "गी", "गु", "गे"], [10, 10, 11, 11], "सिंह", "राक्षस"], ["शतभिषा", "Shatabhisha", ["गो", "सा", "सी", "सू"], [11, 11, 11, 11], "अश्व", "राक्षस"], ["पूर्वाभाद्रपदा", "Purva Bhadrapada", ["से", "सो", "दा", "दी"], [11, 11, 11, 12], "सिंह", "नर"], ["उत्तराभाद्रपदा", "Uttara Bhadrapada", ["दू", "थ", "झ", "ञ"], [12, 12, 12, 12], "गौ", "नर"], ["रेवती", "Revati", ["दे", "दो", "च", "ची"], [12, 12, 12, 12], "गज", "देव"]];
export const ELEM_NE = ["अग्नि", "पृथ्वी", "वायु", "जल"];
export const ELEM_EN = ["Fire", "Earth", "Air", "Water"];
export const VARNA_NE = ["क्षत्रिय", "वैश्य", "शूद्र", "विप्र"];
export const VARNA_EN = ["Kshatriya", "Vaishya", "Shudra", "Brahmin"];
export const PAYA_NE = ["सुवर्ण", "रजत", "ताम्र", "लोह"];
export const PAYA_EN = ["Gold", "Silver", "Copper", "Iron"];
export const NAKSHATRA_PAYA = [0, 0, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0];
export const YUNJA_NE = ["आदि", "मध्य", "अन्त्य"];
export const YUNJA_EN = ["Adi", "Madhya", "Antya"];
export const NADI_NE = ["आद्य", "मध्य", "अन्त्य"];
export const NADI_EN = ["Aadi", "Madhya", "Antya"];
export const VASHYA_NE = ["चतुष्पद", "चतुष्पद", "मानव", "जलचर", "वनचर", "मानव", "मानव", "कीट", "मानव", "जलचर", "मानव", "जलचर"];
export const VASHYA_EN = ["Quadruped", "Quadruped", "Manava", "Aquatic", "Wild", "Manava", "Manava", "Insect", "Manava", "Aquatic", "Manava", "Aquatic"];
export const ASANA_NE = ["खट्वाङ्ग", "मञ्च", "भद्रपीठ", "शयन"];
export const ASANA_EN = ["Khattvanga", "Mancha", "Bhadrasana", "Shayana"];
export const TARA_NE = ["जन्म", "सम्पत्", "विपत्", "क्षेम", "प्रत्यक्", "साधक", "निधन", "मित्र", "परम मित्र"];
export const TARA_EN = ["Janma", "Sampat", "Vipat", "Kshema", "Pratyak", "Sadhaka", "Naidhana", "Mitra", "Parama Mitra"];
