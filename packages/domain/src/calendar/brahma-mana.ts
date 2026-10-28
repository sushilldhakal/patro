/**
 * Brahma Māna — the Surya Siddhanta's ladder of cosmic time, from Brahmā's whole life down to the
 * four Yugas, in solar years. Pure numbers; each app draws them as a tree.
 *
 * Surya Siddhanta 1.15–1.24: a Mahāyuga is 4,320,000 solar years; its tenth part (432,000, one pāda)
 * times 4, 3, 2 and 1 gives Kṛta, Tretā, Dvāpara and Kali, each including its dawn (sandhyā) and
 * dusk (sandhyāṃśa) of a twelfth of it apiece. A Manvantara is 71 Mahāyugas; a Kalpa — Brahmā's
 * day — is 14 Manvantaras and 15 junctions (sandhis), each as long as a Kṛta, which comes to
 * exactly 1,000 Mahāyugas. His night is as long again. 360 such day-nights make his year, and he
 * lives 100 of them, in two halves (parārdha) of 50.
 */

/** One pāda: a tenth of a Mahāyuga. */
export const PADA_YEARS = 432_000;
export const MAHAYUGA_YEARS = 10 * PADA_YEARS;
export const MAHAYUGAS_PER_MANVANTARA = 71;
export const MANVANTARA_YEARS = MAHAYUGAS_PER_MANVANTARA * MAHAYUGA_YEARS;
export const MANVANTARAS_PER_KALPA = 14;
/** The junctions between and around the 14 Manvantaras. */
export const KALPA_SANDHIS = 15;
/** Each junction is as long as a Kṛta Yuga. */
export const KALPA_SANDHI_YEARS = 4 * PADA_YEARS;
export const KALPA_YEARS = MANVANTARAS_PER_KALPA * MANVANTARA_YEARS + KALPA_SANDHIS * KALPA_SANDHI_YEARS;
export const MAHAYUGAS_PER_KALPA = KALPA_YEARS / MAHAYUGA_YEARS;
/** A day (Kalpa) and the night after it. */
export const AHORATRA_YEARS = 2 * KALPA_YEARS;
export const AHORATRAS_PER_MONTH = 30;
export const BRAHMA_MONTH_YEARS = AHORATRAS_PER_MONTH * AHORATRA_YEARS;
export const MONTHS_PER_BRAHMA_YEAR = 12;
export const BRAHMA_YEAR_YEARS = MONTHS_PER_BRAHMA_YEAR * BRAHMA_MONTH_YEARS;
export const BRAHMA_YEARS_PER_PARARDHA = 50;
export const PARARDHA_YEARS = BRAHMA_YEARS_PER_PARARDHA * BRAHMA_YEAR_YEARS;
export const BRAHMA_LIFESPAN_YEARS = 2 * PARARDHA_YEARS;

export type YugaId = "krta" | "treta" | "dvapara" | "kali";

export type Yuga = {
  id: YugaId;
  /** Pādas (tenths of a Mahāyuga): 4 : 3 : 2 : 1. */
  padas: number;
  years: number;
  /** Its dawn and its dusk, each a twelfth of it. */
  sandhya: number;
  /** The yuga proper, between the two. */
  core: number;
};

function yuga(id: YugaId, padas: number): Yuga {
  const years = padas * PADA_YEARS;
  const sandhya = years / 12;
  return { id, padas, years, sandhya, core: years - 2 * sandhya };
}

export const YUGAS: readonly Yuga[] = [yuga("krta", 4), yuga("treta", 3), yuga("dvapara", 2), yuga("kali", 1)];

/** One divya varṣa (a year of the gods) is 360 solar years. Every count below is in divya varṣa. */
export const SOLAR_YEARS_PER_DIVYA = 360;

export const DIVYA = {
  lifespan: BRAHMA_LIFESPAN_YEARS / SOLAR_YEARS_PER_DIVYA,
  parardha: PARARDHA_YEARS / SOLAR_YEARS_PER_DIVYA,
  varsha: BRAHMA_YEAR_YEARS / SOLAR_YEARS_PER_DIVYA,
  masa: BRAHMA_MONTH_YEARS / SOLAR_YEARS_PER_DIVYA,
  kalpa: KALPA_YEARS / SOLAR_YEARS_PER_DIVYA,
  /** Before the first Manvantara of a Kalpa. */
  adiSandhya: KALPA_SANDHI_YEARS / SOLAR_YEARS_PER_DIVYA,
  /** A Manvantara with the flood (jalaplāva) that closes it. */
  manvantaraFull: (MANVANTARA_YEARS + KALPA_SANDHI_YEARS) / SOLAR_YEARS_PER_DIVYA,
  manvantara: MANVANTARA_YEARS / SOLAR_YEARS_PER_DIVYA,
  jalaplava: KALPA_SANDHI_YEARS / SOLAR_YEARS_PER_DIVYA,
  mahayuga: MAHAYUGA_YEARS / SOLAR_YEARS_PER_DIVYA,
  /** One pāda of a yuga proper. */
  pada: 1000,
} as const;

/** Kalpas in a Brahma month, each followed by a pralaya as long. */
export const KALPAS_PER_MONTH = AHORATRAS_PER_MONTH;

export type TimeKind =
  | "lifespan"
  | "parardha"
  | "varsha"
  | "masa"
  | "kalpa"
  | "pralaya"
  | "adi_sandhya"
  | "manvantara_full"
  | "manvantara"
  | "jalaplava"
  | "mahayuga"
  | "yuga"
  | "yuga_sandhya"
  | "yuga_core"
  | "pada";

/** A real stretch of time in Brahmā's life: parārdha #2, its 1st year, …, Kali Yuga's pāda #1. */
export type TimeNode = {
  /** Path from the root, unique: "L/p2/v1/m1/k1/n7/m/y28/kali/core". */
  key: string;
  kind: TimeKind;
  /** 1-based position among its kind in the parent (parārdha #2, kalpa 1, mahāyuga #28). */
  index?: number;
  /** Yuga nodes and their parts: which of the four. */
  yuga?: YugaId;
  /** Length in divya varṣa. */
  divya: number;
  /** On the path to now. */
  current: boolean;
  hasChildren: boolean;
};

/** Now, by instance: parārdha #2, its year 1, month 1, kalpa 1 (Śveta), Manvantara 7, Mahāyuga 28, Kali. */
export const NOW_PATH = { parardha: 2, varsha: 1, masa: 1, kalpa: 1, manvantara: 7, mahayuga: 28, yuga: "kali" as YugaId } as const;

function node(parent: TimeNode | null, seg: string, kind: TimeKind, divya: number, current: boolean, extra: Partial<TimeNode> = {}): TimeNode {
  return {
    key: parent ? `${parent.key}/${seg}` : seg,
    kind,
    divya,
    current,
    hasChildren: !["pralaya", "adi_sandhya", "jalaplava", "yuga_sandhya", "pada"].includes(kind),
    ...extra,
  };
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
}

export const TIME_ROOT: TimeNode = node(null, "L", "lifespan", DIVYA.lifespan, true);

/**
 * The children of one stretch, built only when asked for: Brahmā's life holds 2 × 50 × 12 × 30
 * Kalpas and some 2.6 billion pādas, so nothing below an open node exists until it is opened.
 */
export function timeChildren(n: TimeNode): TimeNode[] {
  const cur = n.current;
  switch (n.kind) {
    case "lifespan":
      return range(2).map((i) => node(n, `p${i}`, "parardha", DIVYA.parardha, cur && i === NOW_PATH.parardha, { index: i }));
    case "parardha":
      return range(BRAHMA_YEARS_PER_PARARDHA).map((i) => node(n, `v${i}`, "varsha", DIVYA.varsha, cur && i === NOW_PATH.varsha, { index: i }));
    case "varsha":
      return range(MONTHS_PER_BRAHMA_YEAR).map((i) => node(n, `m${i}`, "masa", DIVYA.masa, cur && i === NOW_PATH.masa, { index: i }));
    case "masa":
      return range(KALPAS_PER_MONTH).flatMap((i) => [
        node(n, `k${i}`, "kalpa", DIVYA.kalpa, cur && i === NOW_PATH.kalpa, { index: i }),
        node(n, `r${i}`, "pralaya", DIVYA.kalpa, false, { index: i }),
      ]);
    case "kalpa":
      return [
        node(n, "s", "adi_sandhya", DIVYA.adiSandhya, false),
        ...range(MANVANTARAS_PER_KALPA).map((i) =>
          node(n, `n${i}`, "manvantara_full", DIVYA.manvantaraFull, cur && i === NOW_PATH.manvantara, { index: i }),
        ),
      ];
    case "manvantara_full":
      return [
        node(n, "m", "manvantara", DIVYA.manvantara, cur, { index: n.index }),
        node(n, "j", "jalaplava", DIVYA.jalaplava, false),
      ];
    case "manvantara":
      return range(MAHAYUGAS_PER_MANVANTARA).map((i) => node(n, `y${i}`, "mahayuga", DIVYA.mahayuga, cur && i === NOW_PATH.mahayuga, { index: i }));
    case "mahayuga":
      return YUGAS.map((y) => node(n, y.id, "yuga", y.padas * 1200, cur && y.id === NOW_PATH.yuga, { yuga: y.id }));
    case "yuga": {
      const padas = YUGAS.find((y) => y.id === n.yuga)!.padas;
      return [
        node(n, "dawn", "yuga_sandhya", padas * 100, false, { yuga: n.yuga }),
        node(n, "core", "yuga_core", padas * DIVYA.pada, cur, { yuga: n.yuga }),
        node(n, "dusk", "yuga_sandhya", padas * 100, false, { yuga: n.yuga }),
      ];
    }
    case "yuga_core": {
      const padas = YUGAS.find((y) => y.id === n.yuga)!.padas;
      return range(padas).map((i) => node(n, `d${i}`, "pada", DIVYA.pada, false, { index: i, yuga: n.yuga }));
    }
    default:
      return [];
  }
}

/** Keys of every node on the path to now — what the page opens with. */
export function nowPathKeys(): string[] {
  const keys: string[] = [];
  let at: TimeNode | undefined = TIME_ROOT;
  while (at && at.hasChildren) {
    keys.push(at.key);
    at = timeChildren(at).find((c) => c.current);
  }
  return keys;
}

/**
 * Where we stand, by the traditional reckoning: the first day of Brahmā's 51st year (the
 * Śvetavarāha Kalpa), the 7th (Vaivasvata) Manvantara, its 28th Mahāyuga, in the Kali Yuga that
 * began in 3102 BCE.
 */
export const NOW = {
  brahmaYear: 51,
  manvantara: 7,
  mahayuga: 28,
  /** Proleptic Gregorian year the Kali Yuga began (3102 BCE as an astronomical year). */
  kaliEpochYear: -3101,
} as const;

/** Whole Kali Yuga years elapsed by the start of `ceYear` (Common Era). */
export function kaliYearsElapsed(ceYear: number): number {
  return ceYear - NOW.kaliEpochYear;
}

/**
 * Solar years elapsed in this Kalpa by the start of `ceYear`: six Manvantaras and the seven
 * junctions that open and follow them, 27 Mahāyugas, the Kṛta, Tretā and Dvāpara of the 28th, and
 * the Kali years so far (Surya Siddhanta 1.21–1.23).
 */
export function kalpaYearsElapsed(ceYear: number): number {
  const before = NOW.manvantara - 1;
  return (
    before * MANVANTARA_YEARS +
    (before + 1) * KALPA_SANDHI_YEARS +
    (NOW.mahayuga - 1) * MAHAYUGA_YEARS +
    (YUGAS[0]!.years + YUGAS[1]!.years + YUGAS[2]!.years) +
    kaliYearsElapsed(ceYear)
  );
}
