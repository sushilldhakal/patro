/**
 * The Indian sky culture's star figures beyond the 27 नक्षत्र — the twelve
 * राशि drawn as their own connect-the-dot shapes (मेष the ram, वृष the bull,
 * …), and the mythological groups (सप्तर्षि, शिंशुमारः, सारथिः, त्रिशङ्कुः,
 * यमुना, इन्वकाः, मृगव्याधः, शरवणम्, अभिजित्).
 *
 * Generated from the Stellarium "indian" sky-culture data
 * (`nepali-holiday-api/data/info.md`) — every star it names is looked up by
 * Hipparcos number against the HYG catalogue (astronexus/HYG-Database) for
 * its J2000 right ascension, declination and V magnitude. The 27 नक्षत्र
 * asterisms already have their own hand-placed catalogue — see
 * [[nakshatra-stars]] — so they are left out here; this file is only the
 * shapes that catalogue does not cover.
 *
 * Native names are the file's own `common_names`, which name only the stars
 * classical texts singled out (अग्नि for Capella, ब्रह्महृदयम् for its
 * neighbour, …). A member star with no entry there carries no label — not
 * even its Western proper name, so a rashi figure never mixes "Achernar"
 * into an otherwise Sanskrit sky — same convention as an unnamed नक्षत्र
 * companion.
 *
 * A handful of these stars — Aldebaran, Regulus, Spica, Antares, Castor,
 * Pollux — are *also* a नक्षत्र's own योगतारा (रोहिणी, मघा, चित्रा, ज्येष्ठा,
 * अदिति, दिति), already labelled by [[nakshatra-stars]] on the exact same
 * point. Their `ne`/`en`/`pronounce` are left off here on purpose — a
 * second, independent label on a star two layers already draw reads as a
 * third star that never existed. The member still carries its real
 * position, so the rashi's own lines still reach it; it just is not asked
 * to speak for itself a second time.
 */

/** One catalogued star, keyed by its Hipparcos number. */
export type SkyCultureStarData = {
  /** Right ascension, J2000, degrees. */
  ra: number;
  /** Declination, J2000, degrees. */
  dec: number;
  /** Apparent visual magnitude. */
  mag: number;
  /** Devanagari name — only set when the file names this star individually
   *  *and* no other layer already labels the same point. */
  ne?: string;
  /** IAST transliteration of {@link ne}. */
  pronounce?: string;
  /** English gloss of {@link ne} — not a Western star name. */
  en?: string;
};

/** Every star any figure below draws, by HIP number. */
export const SKY_CULTURE_STARS: Record<number, SkyCultureStarData> = {
  1645: { ra: 5.1494, dec: 8.1903, mag: 5.38 },
  3760: { ra: 12.0725, dec: 7.2999, mag: 5.92 },
  4889: { ra: 15.7046, dec: 31.8043, mag: 5.5 },
  4906: { ra: 15.7359, dec: 7.8901, mag: 4.27 },
  5742: { ra: 18.4373, dec: 24.5837, mag: 4.67 },
  6193: { ra: 19.8666, dec: 27.2641, mag: 4.74 },
  7007: { ra: 22.5463, dec: 6.1438, mag: 4.84 },
  7097: { ra: 22.8709, dec: 15.3458, mag: 3.62 },
  7588: { ra: 24.4283, dec: -57.2368, mag: 0.45 },
  7884: { ra: 25.3579, dec: 5.4876, mag: 4.45 },
  8198: { ra: 26.3485, dec: 9.1577, mag: 4.26 },
  8832: { ra: 28.3825, dec: 19.2939, mag: 3.88 },
  8833: { ra: 28.389, dec: 3.1875, mag: 4.61 },
  8903: { ra: 28.66, dec: 20.808, mag: 2.64 },
  9007: { ra: 28.9885, dec: -51.6089, mag: 3.69 },
  9153: { ra: 29.4822, dec: 23.5961, mag: 4.79 },
  9487: { ra: 30.5118, dec: 2.7638, mag: 3.82 },
  9884: { ra: 31.7933, dec: 23.4624, mag: 2.01 },
  10306: { ra: 33.2003, dec: 21.211, mag: 5.23 },
  10602: { ra: 34.1273, dec: -51.5122, mag: 3.56 },
  11407: { ra: 36.7463, dec: -47.7038, mag: 4.24 },
  12413: { ra: 39.9499, dec: -42.8917, mag: 4.74 },
  12486: { ra: 40.1667, dec: -39.8554, mag: 4.11 },
  12843: { ra: 41.2757, dec: -18.5726, mag: 4.47 },
  13061: { ra: 41.9772, dec: 29.2471, mag: 4.52 },
  13209: { ra: 42.4959, dec: 27.2605, mag: 3.61 },
  13701: { ra: 44.1069, dec: -8.8981, mag: 3.89 },
  13847: { ra: 44.5653, dec: -40.3047, mag: 2.88 },
  13914: { ra: 44.803, dec: 21.3404, mag: 4.63 },
  14146: { ra: 45.5979, dec: -23.6245, mag: 4.08 },
  14838: { ra: 47.9073, dec: 19.7267, mag: 4.35 },
  15197: { ra: 48.9584, dec: -8.8197, mag: 4.8 },
  15474: { ra: 49.8792, dec: -21.7579, mag: 3.7 },
  15510: { ra: 49.9792, dec: -43.0698, mag: 4.26 },
  15900: { ra: 51.2033, dec: 9.0289, mag: 3.61 },
  16369: { ra: 52.7182, dec: 12.9367, mag: 4.14 },
  16537: { ra: 53.2327, dec: -9.4583, mag: 3.72 },
  16611: { ra: 53.447, dec: -21.6329, mag: 4.26 },
  17378: { ra: 55.8121, dec: -9.7634, mag: 3.52 },
  17651: { ra: 56.7121, dec: -23.2497, mag: 4.22 },
  17797: { ra: 57.1494, dec: -37.6202, mag: 4.3 },
  17847: { ra: 57.2906, dec: 24.0534, mag: 3.62 },
  17874: { ra: 57.3636, dec: -36.2002, mag: 4.17 },
  18724: { ra: 60.1701, dec: 12.4903, mag: 3.41 },
  18907: { ra: 60.7891, dec: 5.9893, mag: 3.91 },
  20042: { ra: 64.4736, dec: -33.7983, mag: 3.55 },
  20205: { ra: 64.9483, dec: 15.6276, mag: 3.65 },
  20455: { ra: 65.7337, dec: 17.5425, mag: 3.77 },
  20535: { ra: 66.0092, dec: -34.0168, mag: 3.97 },
  20648: { ra: 66.3724, dec: 17.9279, mag: 4.3 },
  20889: { ra: 67.1541, dec: 19.1804, mag: 3.53 },
  20894: { ra: 67.1656, dec: 15.8709, mag: 3.4 },
  21393: { ra: 68.8877, dec: -30.5623, mag: 3.81 },
  21421: { ra: 68.9802, dec: 16.5093, mag: 0.87 },
  21444: { ra: 69.0798, dec: -3.3525, mag: 3.93 },
  21594: { ra: 69.5451, dec: -14.304, mag: 3.86 },
  21881: { ra: 70.5613, dec: 22.9569, mag: 4.27 },
  22109: { ra: 71.3756, dec: -3.2547, mag: 4.01 },
  22701: { ra: 73.2236, dec: -5.4527, mag: 4.36 },
  23015: { ra: 74.2484, dec: 33.1661, mag: 2.69 },
  23453: { ra: 75.6195, dec: 41.0758, mag: 3.69 },
  23875: { ra: 76.9624, dec: -5.0864, mag: 2.78 },
  23972: { ra: 77.2866, dec: -8.7541, mag: 4.25 },
  24608: { ra: 79.1723, dec: 45.998, mag: 0.08, ne: "ब्रह्महृदयम्", pronounce: "Bramha-hṛdaya", en: "Creator's heart" },
  25044: { ra: 80.4406, dec: -0.3825, mag: 4.72 },
  25428: { ra: 81.573, dec: 28.6075, mag: 1.65, ne: "अग्निः", pronounce: "Agni", en: "Fire" },
  25930: { ra: 83.0017, dec: -0.2991, mag: 2.25, ne: "चित्रलेखा", pronounce: "Chitralekhā", en: "Picturesque" },
  26311: { ra: 84.0534, dec: -1.2019, mag: 1.69, ne: "अनिरुद्धः", pronounce: "Aniruddha", en: "Unbounded" },
  26451: { ra: 84.4112, dec: 21.1425, mag: 2.97 },
  26727: { ra: 85.1897, dec: -1.9426, mag: 1.74, ne: "उषाः", pronounce: "Uṣā", en: "Dawn" },
  28360: { ra: 89.8822, dec: 44.9474, mag: 1.9 },
  28380: { ra: 89.9303, dec: 37.2126, mag: 2.65 },
  28734: { ra: 91.0301, dec: 23.2633, mag: 4.16 },
  29655: { ra: 93.7194, dec: 22.5068, mag: 3.31 },
  30122: { ra: 95.0783, dec: -30.0634, mag: 3.02 },
  30324: { ra: 95.6749, dec: -17.9559, mag: 1.98 },
  30343: { ra: 95.7401, dec: 22.5136, mag: 2.87 },
  30883: { ra: 97.2408, dec: 20.2121, mag: 4.13 },
  31416: { ra: 98.7641, dec: -22.9648, mag: 4.54 },
  31592: { ra: 99.171, dec: -19.2559, mag: 3.95 },
  31681: { ra: 99.4279, dec: 16.3993, mag: 1.93, ne: "अनलः", pronounce: "Anala", en: "Fire" },
  32246: { ra: 100.983, dec: 25.1311, mag: 3.06 },
  32349: { ra: 101.2872, dec: -16.7161, mag: -1.44, ne: "लुब्धकः", pronounce: "Lubdhaka", en: "Hunter" },
  32362: { ra: 101.3224, dec: 12.8956, mag: 3.35 },
  32759: { ra: 102.4602, dec: -32.5085, mag: 3.5 },
  33018: { ra: 103.1972, dec: 33.9613, mag: 3.6 },
  33152: { ra: 103.5331, dec: -24.1842, mag: 3.89 },
  33160: { ra: 103.5475, dec: -12.0386, mag: 4.08 },
  33347: { ra: 104.0343, dec: -17.0542, mag: 4.36 },
  33579: { ra: 104.6565, dec: -28.9721, mag: 1.5 },
  33646: { ra: 104.8443, dec: 25.2357, mag: 9.03 },
  33856: { ra: 105.4298, dec: -27.9348, mag: 3.49 },
  33977: { ra: 105.7561, dec: -23.8333, mag: 3.02 },
  34045: { ra: 105.9396, dec: -15.6333, mag: 4.11 },
  34088: { ra: 106.0272, dec: 20.5703, mag: 4.01 },
  34444: { ra: 107.0979, dec: -26.3932, mag: 1.83 },
  34693: { ra: 107.7849, dec: 30.2452, mag: 4.41 },
  35037: { ra: 108.7027, dec: -26.7727, mag: 4.01 },
  35350: { ra: 109.5232, dec: 16.5404, mag: 3.58 },
  35550: { ra: 110.0307, dec: 21.9823, mag: 3.5 },
  35904: { ra: 111.0238, dec: -29.3031, mag: 2.45 },
  36046: { ra: 111.4317, dec: 27.7981, mag: 3.78 },
  36850: { ra: 113.6495, dec: 31.8883, mag: 1.58 },
  36962: { ra: 113.9806, dec: 26.8957, mag: 4.06 },
  37740: { ra: 116.1119, dec: 24.398, mag: 3.57 },
  37826: { ra: 116.3292, dec: 28.0262, mag: 1.16 },
  40526: { ra: 124.1288, dec: 9.1855, mag: 3.53 },
  40843: { ra: 125.0161, dec: 27.2177, mag: 5.13 },
  41704: { ra: 127.5665, dec: 60.7182, mag: 3.35 },
  42806: { ra: 130.8215, dec: 21.4685, mag: 4.66 },
  42911: { ra: 131.1712, dec: 18.1543, mag: 3.94 },
  43103: { ra: 131.6743, dec: 28.7599, mag: 4.03 },
  44066: { ra: 134.6218, dec: 11.8577, mag: 4.26 },
  44127: { ra: 134.8024, dec: 48.0418, mag: 3.12 },
  44471: { ra: 135.9064, dec: 47.1565, mag: 3.57 },
  46733: { ra: 142.8818, dec: 63.0619, mag: 3.65 },
  46853: { ra: 143.2157, dec: 51.6773, mag: 3.17 },
  47508: { ra: 145.2876, dec: 9.8923, mag: 3.52 },
  47908: { ra: 146.4628, dec: 23.7743, mag: 2.97 },
  48319: { ra: 147.748, dec: 59.0387, mag: 3.78 },
  48402: { ra: 148.0265, dec: 54.0643, mag: 4.55 },
  48455: { ra: 148.191, dec: 26.007, mag: 3.88 },
  49583: { ra: 151.8331, dec: 16.7627, mag: 3.48 },
  49669: { ra: 152.093, dec: 11.9672, mag: 1.36 },
  50335: { ra: 154.1726, dec: 23.4173, mag: 3.43 },
  50372: { ra: 154.2743, dec: 42.9144, mag: 3.45 },
  50583: { ra: 154.9931, dec: 19.8415, mag: 2.01 },
  50801: { ra: 155.5823, dec: 41.4995, mag: 3.06 },
  53910: { ra: 165.4602, dec: 56.3824, mag: 2.34, ne: "पुलहः", pronounce: "Pulaha", en: "Pulaha" },
  54061: { ra: 165.9323, dec: 61.751, mag: 1.81, ne: "क्रतुः", pronounce: "Kratu", en: "Kratu" },
  54539: { ra: 167.4159, dec: 44.4985, mag: 3.0 },
  54872: { ra: 168.5271, dec: 20.5237, mag: 2.56 },
  54879: { ra: 168.56, dec: 15.4296, mag: 3.33 },
  55434: { ra: 170.2841, dec: 6.0293, mag: 4.05 },
  55642: { ra: 170.981, dec: 10.5295, mag: 4.0 },
  56211: { ra: 172.8511, dec: 69.3311, mag: 3.82 },
  57380: { ra: 176.4648, dec: 6.5294, mag: 4.04 },
  57399: { ra: 176.5127, dec: 47.7794, mag: 3.69 },
  57632: { ra: 177.2649, dec: 14.5721, mag: 2.14 },
  58001: { ra: 178.4575, dec: 53.6948, mag: 2.41, ne: "पुलस्तः", pronounce: "Pulasta", en: "Pulasta" },
  59747: { ra: 183.7864, dec: -58.7489, mag: 2.79 },
  59774: { ra: 183.8563, dec: 57.0326, mag: 3.32, ne: "अत्रिः", pronounce: "Atri", en: "Atri" },
  60030: { ra: 184.668, dec: -0.7872, mag: 5.9 },
  60718: { ra: 186.6497, dec: -63.0991, mag: 0.77 },
  61084: { ra: 187.7914, dec: -57.1132, mag: 1.59 },
  61281: { ra: 188.3709, dec: 69.7882, mag: 3.85 },
  61941: { ra: 190.4152, dec: -1.4494, mag: 2.74 },
  62434: { ra: 191.9304, dec: -59.6888, mag: 1.25 },
  62956: { ra: 193.5071, dec: 55.9598, mag: 1.76, ne: "अङ्गिराः", pronounce: "Angirā", en: "Angiras" },
  63090: { ra: 193.9009, dec: 3.3975, mag: 3.39 },
  63608: { ra: 195.5442, dec: 10.9591, mag: 2.85 },
  65378: { ra: 200.9812, dec: 54.9254, mag: 2.23, ne: "वसिष्ठः", pronounce: "Vaśisṭha", en: "Vaśisṭha" },
  65474: { ra: 201.2982, dec: -11.1613, mag: 0.98 },
  66249: { ra: 203.6733, dec: -0.5958, mag: 3.38 },
  67301: { ra: 206.8853, dec: 49.3133, mag: 1.85, ne: "मरीचिः", pronounce: "Mārīchi", en: "Mārīchi" },
  68520: { ra: 210.4116, dec: 1.5445, mag: 4.23 },
  68756: { ra: 211.0975, dec: 64.3758, mag: 3.67 },
  69427: { ra: 213.2239, dec: -10.2737, mag: 4.18 },
  69701: { ra: 214.0036, dec: -6.0005, mag: 4.07 },
  71957: { ra: 220.7651, dec: -5.6582, mag: 3.87 },
  72220: { ra: 221.5622, dec: 1.8929, mag: 3.73 },
  72622: { ra: 222.7197, dec: -16.0418, mag: 2.75 },
  73714: { ra: 226.0176, dec: -25.282, mag: 3.25 },
  74392: { ra: 228.0554, dec: -19.7917, mag: 4.54 },
  74785: { ra: 229.2517, dec: -9.3829, mag: 2.61 },
  75458: { ra: 231.2324, dec: 58.9661, mag: 3.29 },
  76333: { ra: 233.8816, dec: -14.7895, mag: 3.91 },
  76470: { ra: 234.256, dec: -28.1351, mag: 3.6 },
  76600: { ra: 234.6641, dec: -29.7778, mag: 3.66 },
  77853: { ra: 238.4564, dec: -16.7293, mag: 4.13 },
  78207: { ra: 239.5474, dec: -14.2794, mag: 4.95 },
  78265: { ra: 239.713, dec: -26.1141, mag: 2.89 },
  78401: { ra: 240.0834, dec: -22.6217, mag: 2.29 },
  78527: { ra: 240.473, dec: 58.5653, mag: 4.01 },
  78820: { ra: 241.3593, dec: -19.8055, mag: 2.56 },
  80112: { ra: 245.2971, dec: -25.5928, mag: 2.9 },
  80331: { ra: 245.9979, dec: 61.5142, mag: 2.73 },
  80763: { ra: 247.3519, dec: -26.432, mag: 1.06 },
  81266: { ra: 248.9706, dec: -28.216, mag: 2.82 },
  82396: { ra: 252.5412, dec: -34.2932, mag: 2.29 },
  82545: { ra: 253.0839, dec: -38.0175, mag: 3.56 },
  82729: { ra: 253.646, dec: -42.3613, mag: 3.62 },
  83895: { ra: 257.1967, dec: 65.7147, mag: 3.17 },
  84143: { ra: 258.0383, dec: -43.2392, mag: 3.32 },
  85670: { ra: 262.6082, dec: 52.3014, mag: 2.79 },
  85696: { ra: 262.691, dec: -37.2958, mag: 2.7 },
  85829: { ra: 263.0665, dec: 55.173, mag: 4.86 },
  85927: { ra: 263.4022, dec: -37.1038, mag: 1.62 },
  86228: { ra: 264.3297, dec: -42.9978, mag: 1.86 },
  86670: { ra: 265.622, dec: -39.03, mag: 2.39 },
  87073: { ra: 266.8962, dec: -40.127, mag: 2.99 },
  87585: { ra: 268.382, dec: 56.8726, mag: 3.73 },
  87833: { ra: 269.1516, dec: 51.4889, mag: 2.24 },
  88635: { ra: 271.452, dec: -30.4241, mag: 2.98 },
  89341: { ra: 273.4409, dec: -21.0588, mag: 3.84 },
  89642: { ra: 274.4069, dec: -36.7617, mag: 3.1 },
  89931: { ra: 275.2485, dec: -29.8281, mag: 2.72 },
  89937: { ra: 275.261, dec: 72.7328, mag: 3.55 },
  90185: { ra: 276.043, dec: -34.3846, mag: 1.79 },
  90496: { ra: 276.9927, dec: -25.4217, mag: 2.82 },
  91262: { ra: 279.2346, dec: 38.7837, mag: 0.03, ne: "अभिजित्", pronounce: "Abhijit", en: "Invincible" },
  91926: { ra: 281.0949, dec: 39.6127, mag: 4.59 },
  91971: { ra: 281.1931, dec: 37.6051, mag: 4.34 },
  92041: { ra: 281.4141, dec: -26.9908, mag: 3.17 },
  92855: { ra: 283.8163, dec: -26.2967, mag: 2.05 },
  93085: { ra: 284.4325, dec: -21.1067, mag: 3.52 },
  93506: { ra: 285.653, dec: -29.8801, mag: 2.6 },
  93683: { ra: 286.1707, dec: -21.7415, mag: 3.76 },
  93864: { ra: 286.7351, dec: -27.6704, mag: 3.32 },
  94141: { ra: 287.441, dec: -21.0236, mag: 2.88 },
  94376: { ra: 288.1384, dec: 67.6615, mag: 3.07 },
  94648: { ra: 288.8884, dec: 73.3555, mag: 4.45 },
  95168: { ra: 290.4182, dec: -17.8472, mag: 3.92 },
  97433: { ra: 297.0428, dec: 70.2679, mag: 3.84 },
  98162: { ra: 299.2368, dec: -27.1699, mag: 4.54 },
  98688: { ra: 300.6645, dec: -27.7098, mag: 4.43 },
  100064: { ra: 304.5136, dec: -12.5449, mag: 3.58 },
  100345: { ra: 305.2528, dec: -14.7814, mag: 3.05 },
  102485: { ra: 311.5239, dec: -25.2709, mag: 4.13 },
  102618: { ra: 311.919, dec: -9.4958, mag: 3.78 },
  102978: { ra: 312.9554, dec: -26.9191, mag: 4.12 },
  104139: { ra: 316.4868, dec: -17.2329, mag: 4.08 },
  104459: { ra: 317.3985, dec: -11.3717, mag: 4.5 },
  105515: { ra: 320.5616, dec: -16.8345, mag: 4.28 },
  105881: { ra: 321.6668, dec: -22.4113, mag: 3.77 },
  106278: { ra: 322.8897, dec: -5.5712, mag: 2.9 },
  106985: { ra: 325.0227, dec: -16.6623, mag: 3.69 },
  107556: { ra: 326.7602, dec: -16.1273, mag: 2.85 },
  109074: { ra: 331.446, dec: -0.3199, mag: 2.95 },
  109139: { ra: 331.6093, dec: -13.8697, mag: 4.29 },
  110003: { ra: 334.2085, dec: -7.7833, mag: 4.17 },
  110395: { ra: 335.4141, dec: -1.3873, mag: 3.86, ne: "शतभिषक्", pronounce: "Śatabhiṣak", en: "Satabhisak" },
  110960: { ra: 337.208, dec: -0.02, mag: 3.65 },
  111497: { ra: 338.8391, dec: -0.1175, mag: 4.04 },
  112716: { ra: 342.3979, dec: -13.5926, mag: 4.05 },
  112961: { ra: 343.1536, dec: -7.5796, mag: 3.73 },
  113136: { ra: 343.6626, dec: -15.8208, mag: 3.27 },
  114971: { ra: 349.2914, dec: 3.2823, mag: 3.7 },
  115738: { ra: 351.7331, dec: 1.2556, mag: 4.95 },
  115830: { ra: 351.9921, dec: 6.379, mag: 4.27 },
  116771: { ra: 354.9877, dec: 5.6263, mag: 4.13 },
  116928: { ra: 355.5117, dec: 1.78, mag: 4.49 },
  118268: { ra: 359.8279, dec: 6.8633, mag: 4.03 },
};

export type SkyCultureFigure = {
  /** Short id from the source file, e.g. "Meṣa", "Sapt". */
  id: string;
  ne: string;
  en: string;
  pronounce: string;
  /** HIP numbers of the figure's own members, in the order first drawn. */
  hips: number[];
  /** Index pairs into {@link hips} — the figure's own lines. */
  links: [number, number][];
};

export const SKY_CULTURE_FIGURES: SkyCultureFigure[] = [
  {
    id: "MṛVy",
    ne: "मृगव्याधः",
    en: "Deer Hunter",
    pronounce: "Mṛgavyādha",
    hips: [33160, 34045, 33347, 32349, 33977, 34444, 35037, 35904, 33579, 33856, 33152, 31592, 31416, 30324, 32759, 30122],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [8, 9], [9, 5], [10, 11], [11, 12], [11, 13], [11, 3], [8, 14], [15, 8], [2, 0], [10, 8]],
  },
  {
    id: "Inv",
    ne: "इन्वकाः",
    en: "Arrow",
    pronounce: "Invakā",
    hips: [26727, 26311, 25930],
    links: [[0, 1], [1, 2]],
  },
  {
    id: "Śara",
    ne: "शरवणम्",
    en: "Reed forest",
    pronounce: "Śaravaṇa",
    hips: [25044, 33646],
    links: [[0, 1]],
  },
  {
    id: "Abh",
    ne: "अभिजित्",
    en: "Victorious",
    pronounce: "Abhijit",
    hips: [91926, 91262, 91971],
    links: [[0, 1], [1, 2]],
  },
  {
    id: "Meṣa",
    ne: "मेषराशिः",
    en: "Aries",
    pronounce: "Meṣa Rāśi",
    hips: [13209, 9884, 8903, 9153, 13061, 13914, 14838, 10306, 8832],
    links: [[0, 1], [1, 2], [2, 3], [3, 1], [0, 4], [0, 5], [5, 6], [5, 7], [7, 1], [7, 8]],
  },
  {
    id: "Vṛṣa",
    ne: "वृषराशिः",
    en: "Taurus",
    pronounce: "Vṛṣa Rāśi",
    hips: [25428, 21881, 20889, 26451, 20205, 20455, 18724, 16369, 21421, 20894, 20648, 17847, 18907, 15900],
    links: [[0, 1], [1, 2], [2, 3], [4, 5], [4, 6], [6, 7], [8, 2], [8, 9], [9, 4], [2, 10], [10, 5], [5, 11], [11, 7], [12, 6], [7, 13]],
  },
  {
    id: "Mith",
    ne: "मिथुनराशिः",
    en: "Gemini",
    pronounce: "Mithuna Rāśi",
    hips: [31681, 34088, 35550, 35350, 32362, 36962, 37740, 37826, 36046, 34693, 36850, 33018, 32246, 30883, 30343, 29655, 28734],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [5, 7], [5, 8], [8, 9], [9, 10], [9, 11], [9, 12], [12, 13], [12, 14], [14, 15], [15, 16]],
  },
  {
    id: "Kark",
    ne: "कर्कटराशिः",
    en: "Cancer",
    pronounce: "Karkaṭa Rāśi",
    hips: [43103, 42806, 40843, 42911, 44066, 40526],
    links: [[0, 1], [1, 2], [1, 3], [3, 4], [5, 3]],
  },
  {
    id: "Simh",
    ne: "सिंहराशिः",
    en: "Leo",
    pronounce: "Simha Rāśi",
    hips: [55434, 55642, 54879, 49669, 49583, 50583, 54872, 57632, 50335, 48455, 47908, 47508],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [5, 8], [8, 9], [9, 10], [6, 2], [3, 11]],
  },
  {
    id: "Kany",
    ne: "कन्याराशिः",
    en: "Virgo",
    pronounce: "Kanyā Rāśi",
    hips: [57380, 60030, 61941, 65474, 69427, 69701, 71957, 66249, 68520, 72220, 63090, 63608],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [3, 7], [7, 8], [8, 9], [7, 10], [10, 11], [10, 2]],
  },
  {
    id: "Tulā",
    ne: "तुलाराशिः",
    en: "Libra",
    pronounce: "Tulā Rāśi",
    hips: [74785, 76333, 77853, 78207, 72622, 73714, 76600, 76470, 74392],
    links: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 5], [5, 6], [6, 7], [7, 5], [5, 8], [8, 0]],
  },
  {
    id: "Vṛśc",
    ne: "वृश्चिकराशिः",
    en: "Scorpius",
    pronounce: "Vṛścikā Rāśi",
    hips: [80112, 80763, 81266, 78401, 82396, 82545, 82729, 84143, 86228, 87073, 86670, 85927, 85696, 78265, 78820],
    links: [[0, 1], [1, 2], [3, 0], [0, 1], [1, 2], [2, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [1, 13], [1, 14]],
  },
  {
    id: "Dhan",
    ne: "धनूराशिः",
    en: "Bow",
    pronounce: "Dhanur Rāśi",
    hips: [94141, 93683, 93085, 93864, 92855, 93506, 89931, 92041, 88635, 89642, 90185, 90496, 89341, 95168, 98162, 98688],
    links: [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5], [6, 5], [4, 7], [7, 6], [6, 8], [9, 10], [10, 6], [6, 11], [11, 12], [3, 13], [13, 14], [14, 3], [14, 15]],
  },
  {
    id: "Makr",
    ne: "मकरराशिः",
    en: "Crocodile",
    pronounce: "Makara Rāśi",
    hips: [100064, 100345, 104139, 105515, 106985, 107556, 105881, 102485, 102978],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [3, 6], [6, 2], [1, 7], [2, 8]],
  },
  {
    id: "Kumbh",
    ne: "कुम्भराशिः",
    en: "Aquarius",
    pronounce: "Kumbha Rāśi",
    hips: [113136, 112716, 112961, 111497, 110960, 110395, 109074, 106278, 102618, 104459, 109139, 110003],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [7, 9], [7, 10], [11, 6], [11, 5]],
  },
  {
    id: "Mīna",
    ne: "मीनराशिः",
    en: "Pisces",
    pronounce: "Mīna Rāśi",
    hips: [4889, 5742, 6193, 7097, 8198, 9487, 8833, 7884, 7007, 4906, 3760, 1645, 118268, 116771, 116928, 115738, 114971, 115830],
    links: [[0, 1], [0, 2], [2, 1], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 13]],
  },
  {
    id: "Shim",
    ne: "शिंशुमारः",
    en: "Dolphin",
    pronounce: "Shiṁśumāra",
    hips: [87585, 87833, 85670, 85829, 94376, 97433, 94648, 89937, 83895, 80331, 78527, 75458, 68756, 61281, 56211],
    links: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14]],
  },
  {
    id: "R̥kṣa",
    ne: "ऋक्षः",
    en: "Ursa Major",
    pronounce: "R̥kṣa",
    hips: [67301, 65378, 62956, 59774, 54061, 53910, 58001, 57399, 54539, 50372, 50801, 48402, 46853, 44471, 44127, 48319, 41704, 46733],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3], [6, 7], [7, 8], [8, 9], [8, 10], [5, 11], [11, 12], [12, 13], [12, 14], [11, 15], [15, 16], [16, 17], [17, 4]],
  },
  {
    id: "Sapt",
    ne: "सप्तर्षयः",
    en: "7 Sages",
    pronounce: "Saptarṣi",
    hips: [54061, 53910, 58001, 59774, 62956, 65378, 67301],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
  },
  {
    id: "Sāra",
    ne: "सारथिः",
    en: "Charioteer",
    pronounce: "Sārathi",
    hips: [28380, 28360, 24608, 23453, 23015, 25428],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [5, 4], [5, 0]],
  },
  {
    id: "Tri",
    ne: "त्रिशङ्कुः",
    en: "Trishanku",
    pronounce: "Trishanku",
    hips: [61084, 60718, 62434, 59747],
    links: [[0, 1], [2, 3]],
  },
  {
    id: "Yam",
    ne: "यमुना",
    en: "River Yamunā",
    pronounce: "Yamunā",
    hips: [7588, 9007, 10602, 11407, 12413, 12486, 13847, 15510, 17797, 17874, 20042, 20535, 21393, 17651, 16611, 15474, 14146, 12843, 13701, 15197, 16537, 17378, 21444, 22109, 22701, 23875, 23972, 21594],
    links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 18], [18, 19], [19, 20], [20, 21], [21, 22], [22, 23], [23, 24], [24, 25], [25, 26], [26, 27]],
  },
];
/* ── flattening ────────────────────────────────────────────────────────── */

import { equatorialToeclipticJ2000 } from "@/lib/sky3d/nakshatra-stars";

/** One star, flattened out of the figure list and pre-converted, deduplicated by HIP. */
export type FlatCultureStar = {
  hip: number;
  /** Ecliptic longitude at J2000, degrees. */
  lon: number;
  /** Ecliptic latitude, degrees — treated as fixed. */
  lat: number;
  mag: number;
  /** Devanagari name, or null when this member carries no name of its own. */
  ne: string | null;
  /** English name, or null when this member carries no name of its own. */
  en: string | null;
};

export type FlatCultureFigure = {
  figure: SkyCultureFigure;
  /** Indices into the flattened `stars` array, in the figure's own hip order. */
  starIndices: number[];
};

/**
 * Every star any figure draws, deduplicated by HIP — सप्तर्षि and ऋक्षः share
 * four stars, and this is what keeps them as one dot each rather than two
 * stacked on top of each other — with the link pairs re-indexed onto it.
 */
export function flattenSkyCulture(): {
  stars: FlatCultureStar[];
  links: [number, number][];
  figures: FlatCultureFigure[];
} {
  const stars: FlatCultureStar[] = [];
  const links: [number, number][] = [];
  const figures: FlatCultureFigure[] = [];
  const indexByHip = new Map<number, number>();

  const starIndex = (hip: number): number => {
    const existing = indexByHip.get(hip);
    if (existing != null) return existing;
    const data = SKY_CULTURE_STARS[hip];
    const { lon, lat } = equatorialToeclipticJ2000(data.ra, data.dec);
    const i = stars.length;
    stars.push({ hip, lon, lat, mag: data.mag, ne: data.ne ?? null, en: data.en ?? null });
    indexByHip.set(hip, i);
    return i;
  };

  for (const figure of SKY_CULTURE_FIGURES) {
    const starIndices = figure.hips.map(starIndex);
    for (const [a, b] of figure.links) links.push([starIndices[a], starIndices[b]]);
    figures.push({ figure, starIndices });
  }

  return { stars, links, figures };
}

/** Overlay copy for one figure member. Members with no name of their own stay unlabeled. */
export function cultureStarLabel(
  star: Pick<FlatCultureStar, "ne" | "en">,
): { ne: string; en: string } | null {
  if (!star.ne && !star.en) return null;
  return { ne: star.ne ?? star.en!, en: star.en ?? star.ne! };
}
