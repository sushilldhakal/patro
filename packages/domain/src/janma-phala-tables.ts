/** Graha-in-house classical phala — Purusha & Stree janma tables (static śāstra reference). */

/** Minimal shape of react-i18next's `t`, so this data module stays hook-free. */
type TFn = (key: string, opts?: Record<string, unknown>) => string;

export type JanmaPhalaGrahaCol = { id: string; /** Catalogue key for the column header. */ labelKey: string };

export type JanmaPhalaRow = {
  /** Catalogue key for the house name. */
  houseKey: string;
  /** One Sanskrit phrase pair per column, same order as `grahas`. */
  phala: string[];
};

export const PURUSHA_JANMA_GRAHAS: JanmaPhalaGrahaCol[] = [
  { id: "sun", labelKey: "grahas.sun" },
  { id: "moon", labelKey: "grahas.moon" },
  { id: "mars", labelKey: "kundali.x.graha_bhauma" },
  { id: "mercury", labelKey: "grahas.mercury" },
  { id: "jupiter", labelKey: "kundali.x.graha_guru" },
  { id: "venus", labelKey: "grahas.venus" },
  { id: "saturn", labelKey: "grahas.saturn" },
  { id: "rahu", labelKey: "grahas.rahu" },
  { id: "ketu", labelKey: "grahas.ketu" },
  { id: "gulika", labelKey: "kundali.x.graha_gulika" },
];

export const STREI_JANMA_GRAHAS: JanmaPhalaGrahaCol[] = [
  { id: "sun", labelKey: "grahas.sun" },
  { id: "moon", labelKey: "grahas.moon" },
  { id: "mars", labelKey: "kundali.x.graha_bhauma" },
  { id: "mercury", labelKey: "grahas.mercury" },
  { id: "jupiter", labelKey: "kundali.x.graha_guru" },
  { id: "venus", labelKey: "grahas.venus" },
  { id: "saturn", labelKey: "grahas.saturn" },
  { id: "rahuKetu", labelKey: "kundali.x.graha_rahu_ketu" },
];

/** Split "word1 word2" pairs into two readable lines. */
export function splitJanmaPhala(cell: string): [string, string] {
  const parts = cell.trim().split(/\s+/);
  if (parts.length <= 1) return [cell, ""];
  const mid = Math.ceil(parts.length / 2);
  return [parts.slice(0, mid).join(" "), parts.slice(mid).join(" ")];
}

export const PURUSHA_JANMA_ROWS: JanmaPhalaRow[] = [
  {
    houseKey: "kundali.x.janma_house_tanu_1",
    phala: [
      "शूरः विकलनयनः",
      "सुरूपः अन्धः",
      "क्रूरः व्रणी",
      "विद्वान् सुखी",
      "चिरायुः विद्वान्",
      "सकामी सुखी",
      "निःस्वः रोगी",
      "सकामी रोगी",
      "गतायुः सकामः",
      "रोगार्तः मन्दधीः",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_dhana_2",
    phala: [
      "वक्त्ररोगी धनी",
      "कुटुम्बी धनी",
      "कोपी कुटिलः",
      "धनी गुणी",
      "सुवाक् धनी",
      "धनी सुवाक्यः",
      "वक्त्ररोगी धनी",
      "अधर्मी विरोधी",
      "खलः धर्महा",
      "क्रोधी विषयी",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_bhrata_3",
    phala: [
      "सुखी विक्रमी",
      "हिंस्रः सात्त्विकः",
      "विक्रमी सुधीः",
      "दुर्जनः अटन्",
      "कृपणः पापी",
      "पापी कृपणः",
      "अतिविक्रमवान्",
      "सुधीः विक्रमी",
      "शूरः पराक्रमी",
      "भ्रातृहीनः अशोकः",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_sukha_4",
    phala: [
      "असुखी उद्विग्नः",
      "सुखी सुशीलः",
      "विमुखः पीडितः",
      "पीडितः सुखी",
      "सुखी धनी",
      "सुखी सुधीः",
      "विमुखः दुःखी",
      "असुखी मातृहा",
      "मातृहा दुःखी",
      "रोगी पापकृत्",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_putra_5",
    phala: [
      "निःस्वः असुतः",
      "धनी पुत्रवान्",
      "असुतः दरिद्रः",
      "मन्त्री असुतः",
      "श्रीमान् प्रतापी",
      "सुखी धीमान्",
      "दरिद्री विपुत्रः",
      "कुमीनः दुर्भगः",
      "असुतः मूर्खः",
      "स्वल्पपुत्रः अभयः",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_shatru_6",
    phala: [
      "बलवान् शत्रुजित्",
      "अल्पायुः बहुशत्रुः",
      "अरिजित् सुखी",
      "अशत्रुः विशीलः",
      "अशत्रुः कामी",
      "रोगी अशत्रुः",
      "शत्रुजित् सुखी",
      "सबलः श्रीयुतः",
      "धनी सबीर्यः",
      "रिपुहन्ता विनोदी",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_stri_7",
    phala: [
      "स्त्रीजितः खलः",
      "ईर्ष्युस्तीव्रमदः",
      "दाराजितः रणरुचिः",
      "धर्मज्ञः सुकीर्तिः",
      "पितुरोधिकः",
      "कलहप्रियः",
      "स्त्रीजितः दुःखी",
      "सप्रमेहः अशुचिः",
      "प्रमेहरोगी दारहा",
      "कुदारः कृतघ्नः",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_mrityu_8",
    phala: [
      "नेत्ररोगी अल्पायुः",
      "व्याध्यर्दितः सुधीः",
      "अल्पपुत्रः रोगी",
      "सद्गुणी धनी",
      "नीचः",
      "नीचः दीर्घायुः",
      "नेत्ररोगी अल्पपुत्रः",
      "रोगी गतायुः",
      "क्लेशयुतः व्रणी",
      "निःस्वः दुःखार्तः",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_dharma_9",
    phala: [
      "सुतार्थसुखभाक्",
      "भाग्यवान् धनी",
      "पापरतः दुर्मनोरथः",
      "पुत्रार्थसुखभाक्",
      "तपस्वी पुत्रवान्",
      "प्रतापी तपस्वी",
      "सुतार्थसुखभाक्",
      "विकलः दैन्ययुतः",
      "पापी दुर्भगः",
      "पापकृत् निर्दयी",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_karma_10",
    phala: [
      "सुखशौर्यभाक्",
      "धर्मार्थशौर्ययुतः",
      "सुखशौर्यवान्",
      "सुखी पराक्रमी",
      "सधनः",
      "सुधर्मी मानवान्",
      "सुखी पराक्रमी",
      "मानी सुखी",
      "नष्टपितृकः",
      "सुकीर्तिमान्",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_labha_11",
    phala: [
      "बहुधनवान्",
      "ख्यातः सल्लाभः",
      "बहुधनी सुखी",
      "यशस्वी धनी",
      "सल्लाभः",
      "सुमीनः सल्लाभः",
      "प्रभूतधनवान्",
      "धनी पुत्रवान्",
      "ख्यातः धनी",
      "पुत्रहीनः",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_vyaya_12",
    phala: [
      "व्यङ्गः पतितः",
      "अङ्गहीनः हिंस्रः",
      "जातिभ्रष्टः",
      "अश्रमः पतितः",
      "खलः दरिद्रः",
      "खलः बन्धुनाशकः",
      "कुष्ठी पतितः",
      "दुर्जनः पतितः",
      "दुर्जनः पतितः",
      "हीनाङ्गः नीचरतः",
    ],
  },
];

export const STREI_JANMA_ROWS: JanmaPhalaRow[] = [
  {
    houseKey: "kundali.x.janma_house_tanu_1",
    phala: [
      "विधवा सक्रोधा",
      "अल्पायुषी",
      "विधवा दुःखार्ता",
      "सौभाग्यसमृद्धा",
      "सती सुभगा",
      "सुसुखा पतिव्रता",
      "बन्ध्या दरिद्रा",
      "पुत्रहा दुःखार्ता",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_dhana_2",
    phala: [
      "दरिद्रा दुःखार्ता",
      "बहुधनपुत्रान्विता",
      "बन्ध्या सरोगा",
      "धनाढ्या सती",
      "वित्तसौभाग्यान्विता",
      "साधना मुदान्विता",
      "निर्धना दुःखार्ता",
      "दरिद्रा दुःखार्ता",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_bhrata_3",
    phala: [
      "सुतधनान्विता",
      "सुखार्थयुक्ता",
      "सहजविरहिता",
      "धनाढ्या पुत्रवती",
      "सहजान्विता",
      "धनाढ्या परहन्त्री",
      "सुभगा सुदक्षा",
      "सवित्ता रोगाढ्या",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_sukha_4",
    phala: [
      "दरिद्रा सुपीडा",
      "सुभगार्थयुक्ता",
      "दुःखार्ता विधवा",
      "सुखगृहान्विता",
      "सौख्यार्थयुक्ता",
      "सुखकीर्तियुक्ता",
      "हृद्रोगार्ता बन्ध्या",
      "रोगार्ता मातृघ्नी",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_putra_5",
    phala: [
      "नष्टात्मजा",
      "सुपुत्रा सुखयुता",
      "अपुत्रा कुसङ्गता",
      "धीःकान्तियुक्ता",
      "साध्वी सगुणा",
      "सुखसुतान्विता",
      "विपुत्रा विसुखा",
      "सुतार्थरहिता",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_shatru_6",
    phala: [
      "सुखधनाढ्या",
      "सरोगा विधवा",
      "रोगादिरहिता",
      "गतायुषा सकोपा",
      "विपन्ना सत्यहन्त्री",
      "विसुखा दरिद्रा",
      "सगुणा सुभगा",
      "निरोगा अर्थयुक्ता",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_stri_7",
    phala: [
      "सर्वसुखविमुक्ता",
      "पतिप्रिया सुदेहा",
      "विधवा कुलटा",
      "पतिव्रता",
      "सौभाग्यकीर्तियुक्ता",
      "पतिप्रिया शास्त्रज्ञा",
      "विधवा सरोगा",
      "सदुःखा विधवा",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_mrityu_8",
    phala: [
      "विधवा दुःखार्ता",
      "रोगार्दिता कुनेत्रा",
      "विधर्मा रोगार्ता",
      "कृतघ्ना भीतियुक्ता",
      "सरोगा विशीला",
      "विसुखा प्रमत्ता",
      "विधवा दुःखार्ता",
      "सदुःखा विधवा",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_dharma_9",
    phala: [
      "धनधर्मान्विता",
      "सुखपुत्रान्विता",
      "विधर्मा दुःखिनी",
      "सुभोगा सुधर्मा",
      "कृतज्ञा पुत्राढ्या",
      "धर्मपरा सुभगा",
      "बन्ध्या शोकार्ता",
      "बन्ध्या शोकार्ता",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_karma_10",
    phala: [
      "सुकर्मरता",
      "धनधर्मयुक्ता",
      "कुकर्मरता कुपुत्रा",
      "सत्कर्मबुद्धियुक्ता",
      "साध्वी सुभगा",
      "सुकर्मार्थयुक्ता",
      "पापरता साधना",
      "कुकर्मरता",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_labha_11",
    phala: [
      "सुलाभा बहुपुत्रा",
      "भव्या विधिज्ञा",
      "साधना",
      "सुलाभा पतिव्रता",
      "सुपुत्रा सुरूपा",
      "पुत्रार्थलाभयुक्ता",
      "सुलाभा विपुत्रा",
      "निरोगा सुभगा",
    ],
  },
  {
    houseKey: "kundali.x.janma_house_vyaya_12",
    phala: [
      "सरोगा विधवा",
      "हीनाङ्गी व्ययाढ्या",
      "खला रुगार्ता",
      "कृशाङ्गी सुपुत्रा",
      "सरुजा सुव्यया",
      "सुव्यया दुःखार्ता",
      "रोगार्ता मूढा",
      "खला सरोगा",
    ],
  },
];

const JANMA_PHALA_HINT_GRAHAS_PURUSHA = PURUSHA_JANMA_GRAHAS.map((g) => ({
  grahaKey: g.id,
  colId: g.id,
  labelKey: g.labelKey,
}));

/** Rahu and Ketu share one Stree column, so the hint list splits them back out. */
const JANMA_PHALA_HINT_GRAHAS_STREE = [
  ...STREI_JANMA_GRAHAS.filter((g) => g.id !== "rahuKetu").map((g) => ({
    grahaKey: g.id,
    colId: g.id,
    labelKey: g.labelKey,
  })),
  { grahaKey: "rahu", colId: "rahuKetu", labelKey: "grahas.rahu" },
  { grahaKey: "ketu", colId: "rahuKetu", labelKey: "grahas.ketu" },
];

export type JanmaPhalaHintPart = {
  grahaKey: string;
  grahaLabel: string;
  house: number;
  houseLabel: string;
  bhavaTag: string;
  phala: string;
};

function janmaPhalaHintGrahas(tab: "male" | "female") {
  return tab === "male" ? JANMA_PHALA_HINT_GRAHAS_PURUSHA : JANMA_PHALA_HINT_GRAHAS_STREE;
}

/** One entry per graha placed in this D1 chart (Purush includes Gulika when computed). */
export function buildJanmaPhalaHintParts(
  planetBhavas: Partial<Record<string, number>>,
  tab: "male" | "female",
  t: TFn,
  digits: (v: string | number) => string = String,
): JanmaPhalaHintPart[] {
  const rows = tab === "male" ? PURUSHA_JANMA_ROWS : STREI_JANMA_ROWS;
  const grahaCols = tab === "male" ? PURUSHA_JANMA_GRAHAS : STREI_JANMA_GRAHAS;
  const grahas = janmaPhalaHintGrahas(tab);

  const parts: JanmaPhalaHintPart[] = [];
  for (const g of grahas) {
    if (g.grahaKey === "gulika" && tab === "female") continue;
    const house = planetBhavas[g.grahaKey];
    if (house == null) continue;
    const row = rows[house - 1];
    if (!row) continue;
    const colIdx = grahaCols.findIndex((c) => c.id === g.colId);
    if (colIdx < 0) continue;
    const phala = row.phala[colIdx]?.trim();
    if (!phala) continue;
    parts.push({
      grahaKey: g.grahaKey,
      grahaLabel: t(g.labelKey),
      house,
      houseLabel: houseHintLabel(house, tab, t),
      bhavaTag: t("kundali.x.bhava_tag", { n: digits(house) }),
      phala,
    });
  }
  return parts;
}

/** Chart-specific summary: every graha in D1 + matching janma-phala cell. */
export function buildJanmaPhalaHintLine(
  planetBhavas: Partial<Record<string, number>>,
  tab: "male" | "female",
  t: TFn,
  digits: (v: string | number) => string = String,
): string | null {
  const parts = buildJanmaPhalaHintParts(planetBhavas, tab, t, digits);
  if (parts.length === 0) return null;
  return `→ ${parts.map((p) => `${p.grahaLabel}: ${p.houseLabel} (${p.bhavaTag}) — ${p.phala}`).join(" | ")}`;
}

/** Catalogue key for each house's short name, 1st house first. */
const HOUSE_HINT_KEYS = [
  "kundali.x.house_hint_tanu",
  "kundali.x.house_hint_dhana",
  "kundali.x.house_hint_bhrata",
  "kundali.x.house_hint_sukha",
  "kundali.x.house_hint_putra",
  "kundali.x.house_hint_ripu",
  "kundali.x.house_hint_kalatra",
  "kundali.x.house_hint_ayus",
  "kundali.x.house_hint_dharma",
  "kundali.x.house_hint_karma",
  "choghadiya.types.labha.name",
  "samvatsara_names.vyaya",
] as const;

function houseHintLabel(house: number, tab: "male" | "female", t: TFn): string {
  if (house === 7 && tab === "female") return t("kundali.x.house_hint_stri");
  return t(HOUSE_HINT_KEYS[house - 1]!);
}

/** Purusha-table terse classical phala for one graha occupying one house (1-12). */
export function janmaPhalaFor(grahaKey: string, house: number): string | undefined {
  const colIdx = PURUSHA_JANMA_GRAHAS.findIndex((c) => c.id === grahaKey);
  if (colIdx < 0) return undefined;
  const row = PURUSHA_JANMA_ROWS[house - 1];
  return row?.phala[colIdx]?.trim() || undefined;
}
