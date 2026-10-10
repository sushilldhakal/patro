import { NAKSHATRA_ICONS } from "@/lib/nakshatra-icons";
import {
  bsMonthsForWheel,
  PADA_AKSHAR,
  RASHI_ELEM,
  RASHI_LORDS,
  WHEEL_RASHIS,
} from "@/lib/wheel-data";
import type { WheelPick } from "./WheelChart";
import { useLocale } from "@/lib/i18n";
import { NAK_LORD_EN as LORD_EN, TATTVA_EN } from "@/lib/wheel-locale";
import { BS_MONTHS_NE, BS_MONTH_NAMES } from "@/lib/bs-calendar";
import {
  wheelDl,
  wheelDlK,
  wheelDlRow,
  wheelDlV,
  wheelDlVMono,
  wheelPanel,
  wheelPanelClose,
  wheelPanelCons,
  wheelPanelConsTxt,
  wheelPanelHead,
  wheelPanelIco,
  wheelPanelKind,
  wheelPanelBody,
  wheelPanelSub,
  wheelPanelTitle,
} from "@/lib/wheel-classes";

function bsMonthEnOf(ne: string): string {
  const i = BS_MONTHS_NE.indexOf(ne);
  return i >= 0 ? BS_MONTH_NAMES[i] : ne;
}

interface WheelPanelProps {
  sel: WheelPick | null;
  open: boolean;
  num: (n: number | string) => string | number;
  onClose: () => void;
}

export function WheelPanel({ sel, open, num, onClose }: WheelPanelProps) {
  const { pick, isEnglish } = useLocale();
  let body: React.ReactNode = null;

  if (sel?.type === "nak") {
    const ico = NAKSHATRA_ICONS[sel.i]!;
    const L0 = sel.i * (360 / 27);
    const L1 = L0 + 360 / 27;
    const ri0 = Math.floor(L0 / 30);
    const ri1 = Math.floor((L1 - 0.01) / 30);
    const rashiSpan =
      ri0 === ri1
        ? pick(WHEEL_RASHIS[ri0]!.ne, WHEEL_RASHIS[ri0]!.en)
        : `${pick(WHEEL_RASHIS[ri0]!.ne, WHEEL_RASHIS[ri0]!.en)}–${pick(WHEEL_RASHIS[ri1]!.ne, WHEEL_RASHIS[ri1]!.en)}`;

    body = (
      <>
        <div className={wheelPanelHead}>
          <div className={wheelPanelIco}>
            <svg
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              dangerouslySetInnerHTML={{ __html: ico.svg }}
            />
          </div>
          <div>
            <div className={wheelPanelKind}>{pick("नक्षत्र", "Nakshatra")} · {num(sel.i + 1)}</div>
            <h2 className={wheelPanelTitle}>{pick(ico.ne, ico.en)}</h2>
            {isEnglish ? <div className={wheelPanelSub}>{ico.en}</div> : null}
          </div>
          <button type="button" className={wheelPanelClose} onClick={onClose} aria-label={pick("बन्द", "Close")}>
            ✕
          </button>
        </div>
        <div className={wheelPanelBody}>
          <div className={wheelDl}>
            <div className={wheelDlRow}>
              <span className={wheelDlK}>{pick("स्वामी ग्रह", "Lord planet")}</span>
              <span className={wheelDlV}>
                {pick(ico.lord_ne, LORD_EN[ico.lord_ne] ?? ico.lord_ne)}
              </span>
            </div>
            <div className={wheelDlRow}>
              <span className={wheelDlK}>{pick("चिन्ह", "Symbol")}</span>
              <span className={wheelDlV}>{ico.sym_ne}</span>
            </div>
            <div className={wheelDlRow}>
              <span className={wheelDlK}>{pick("राशि", "Rashi")}</span>
              <span className={wheelDlV}>{rashiSpan}</span>
            </div>
            <div className={wheelDlRow}>
              <span className={wheelDlK}>{pick("देशान्तर", "Longitude")}</span>
              <span className={wheelDlVMono}>
                {num(L0.toFixed(1))}°–{num(L1.toFixed(1))}°
              </span>
            </div>
            <div className={wheelDlRow}>
              <span className={wheelDlK}>{pick("पद अक्षर", "Pada syllables")}</span>
              <span className={wheelDlV}>{PADA_AKSHAR[sel.i]!.join(" · ")}</span>
            </div>
          </div>
        </div>
      </>
    );
  } else if (sel?.type === "rashi") {
    const rs = WHEEL_RASHIS[sel.i]!;
    const nakIn: string[] = [];
    for (let i = 0; i < 27; i++) {
      const L0 = i * (360 / 27);
      const L1 = (i + 1) * (360 / 27);
      if (L0 < (sel.i + 1) * 30 && L1 > sel.i * 30) {
        nakIn.push(pick(NAKSHATRA_ICONS[i]!.ne, NAKSHATRA_ICONS[i]!.en));
      }
    }
    const bsMonths = bsMonthsForWheel();

    body = (
      <>
        <div className={wheelPanelHead}>
          <div>
            <div className={wheelPanelKind}>{pick("राशि", "Rashi")} · {num(sel.i + 1)}</div>
            <h2 className={wheelPanelTitle}>{pick(rs.ne, rs.en)}</h2>
            {isEnglish ? <div className={wheelPanelSub}>{rs.en}</div> : null}
          </div>
          <button type="button" className={wheelPanelClose} onClick={onClose} aria-label={pick("बन्द", "Close")}>
            ✕
          </button>
        </div>
        <div className={wheelPanelBody}>
          <div className={wheelDl}>
            <div className={wheelDlRow}>
              <span className={wheelDlK}>{pick("स्वामी ग्रह", "Lord planet")}</span>
              <span className={wheelDlV}>{pick(RASHI_LORDS[sel.i], LORD_EN[RASHI_LORDS[sel.i]] ?? RASHI_LORDS[sel.i])}</span>
            </div>
            <div className={wheelDlRow}>
              <span className={wheelDlK}>{pick("तत्त्व", "Element")}</span>
              <span className={wheelDlV}>{pick(RASHI_ELEM[sel.i], TATTVA_EN[RASHI_ELEM[sel.i]] ?? RASHI_ELEM[sel.i])}</span>
            </div>
            <div className={wheelDlRow}>
              <span className={wheelDlK}>{pick("देशान्तर", "Longitude")}</span>
              <span className={wheelDlVMono}>
                {num(sel.i * 30)}°–{num((sel.i + 1) * 30)}°
              </span>
            </div>
            <div className={wheelDlRow}>
              <span className={wheelDlK}>{pick("नेपाली महिना", "Nepali month")}</span>
              <span className={wheelDlV}>{pick(bsMonths[sel.i]?.ne ?? "", bsMonthEnOf(bsMonths[sel.i]?.ne ?? ""))}</span>
            </div>
            <div className={wheelDlRow}>
              <span className={wheelDlK}>{pick("पद", "Padas")}</span>
              <span className={wheelDlVMono}>{pick(`${num(9)} पद`, `${num(9)} padas`)}</span>
            </div>
          </div>
          <div className={wheelPanelCons}>
            <div className={wheelPanelConsTxt}>
              <b>{pick("नक्षत्रहरू", "Nakshatras")}</b>
              {nakIn.join(" · ")}
            </div>
          </div>
        </div>
      </>
    );
  }

  return <div className={wheelPanel(open)}>{body}</div>;
}
