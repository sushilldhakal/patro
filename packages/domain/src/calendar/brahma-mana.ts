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

export type BrahmaNodeId =
  | "lifespan"
  | "parardha"
  | "year"
  | "month"
  | "ahoratra"
  | "day"
  | "night"
  | "manvantara"
  | "kalpa_sandhi"
  | "mahayuga"
  | YugaId;

export type BrahmaNode = {
  id: BrahmaNodeId;
  /** Length of one of these, in solar years. */
  years: number;
  /** How many of these its parent holds. */
  count: number;
  /** On the path to now: the second parārdha, the 51st year, … the Kali Yuga. */
  current?: boolean;
  children?: readonly BrahmaNode[];
};

const yugaNodes: BrahmaNode[] = YUGAS.map((y) => ({ id: y.id, years: y.years, count: 1, current: y.id === "kali" }));

/** The whole ladder, Brahmā's life at the root. */
export const BRAHMA_TREE: BrahmaNode = {
  id: "lifespan",
  years: BRAHMA_LIFESPAN_YEARS,
  count: 1,
  current: true,
  children: [
    {
      id: "parardha",
      years: PARARDHA_YEARS,
      count: 2,
      current: true,
      children: [
        {
          id: "year",
          years: BRAHMA_YEAR_YEARS,
          count: BRAHMA_YEARS_PER_PARARDHA,
          current: true,
          children: [
            {
              id: "month",
              years: BRAHMA_MONTH_YEARS,
              count: MONTHS_PER_BRAHMA_YEAR,
              current: true,
              children: [
                {
                  id: "ahoratra",
                  years: AHORATRA_YEARS,
                  count: AHORATRAS_PER_MONTH,
                  current: true,
                  children: [
                    {
                      id: "day",
                      years: KALPA_YEARS,
                      count: 1,
                      current: true,
                      children: [
                        {
                          id: "manvantara",
                          years: MANVANTARA_YEARS,
                          count: MANVANTARAS_PER_KALPA,
                          current: true,
                          children: [
                            {
                              id: "mahayuga",
                              years: MAHAYUGA_YEARS,
                              count: MAHAYUGAS_PER_MANVANTARA,
                              current: true,
                              children: yugaNodes,
                            },
                          ],
                        },
                        { id: "kalpa_sandhi", years: KALPA_SANDHI_YEARS, count: KALPA_SANDHIS },
                      ],
                    },
                    { id: "night", years: KALPA_YEARS, count: 1 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

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
