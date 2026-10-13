// design-ok-file: fixed-size share-image canvases (pixel geometry for the OG screenshot), not page layout.
import { useMemo, type ReactNode } from "react";
import type { PanchangaDay } from "@/lib/api";
import { D1Chart } from "@/components/kundali/D1Chart";
import { GrahaStatusLegend } from "@/components/graha/GrahaStatusBadges";
import { buildPanchangaD1Houses } from "@vedic-patro/domain/panchanga-sunrise-d1";
import { buildDayTimelineData, dualTimeAtGhati } from "@vedic-patro/domain/day-timeline-data";
import { getPlanetRows, getPlanetsAnchorLabel } from "@vedic-patro/domain/panchanga-format";
import { useLocale, bilingualText } from "@/i18n/locale";
import { brand, illustration, neutral } from "@vedic-patro/design-tokens";

const DANGER = "#b4412f";
const SUCCESS = "#2f7d4f";

/**
 * Bottom strip shared by the new cards. The right-hand slot is reserved for the
 * mobile-app link: it keeps its width (so nothing shifts when the link is added)
 * and stays blank until `?app=<text>` is passed.
 */
export function OgFooter({ appLink }: { appLink: string }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ height: 40, flex: "0 0 auto", borderTop: `1px solid ${illustration.amber89b}`, paddingTop: 6 }}
    >
      <span className="text-base font-semibold text-ill-gray46">vedicpatro.com</span>
      <span
        data-slot="app-link"
        className="text-right text-base font-bold text-ill-brand-blue"
        style={{ minWidth: 360 }}
      >
        {appLink}
      </span>
    </div>
  );
}

type PeriodRow = { n: string; label: string; time: string };

function PeriodColumn({ title, color, rows }: { title: string; color: string; rows: PeriodRow[] }) {
  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 0,
        borderRadius: 14,
        border: `1px solid ${neutral.silverBase}`,
        background: brand.offWhite,
        padding: "8px 14px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ color, fontSize: 24, fontWeight: 800, paddingBottom: 4 }}>{title}</div>
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column" }}>
        {rows.map((r) => (
          <li
            key={`${r.n}-${r.time}`}
            className="flex items-center justify-between"
            style={{ gap: 10, borderTop: `1px solid ${illustration.amber89b}`, padding: "5px 0" }}
          >
            <span className="flex items-center" style={{ gap: 8, minWidth: 0 }}>
              <span
                className="inline-flex items-center justify-center text-white"
                style={{ width: 24, height: 24, borderRadius: 12, background: color, fontSize: 14, fontWeight: 700, flex: "0 0 auto" }}
              >
                {r.n}
              </span>
              <span className="font-bold text-ill-teal15" style={{ fontSize: 21, lineHeight: 1.15 }}>
                {r.label}
              </span>
            </span>
            <span className="font-semibold text-ill-gray46" style={{ fontSize: 20, whiteSpace: "nowrap" }}>
              {r.time}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** अशुभ समय | शुभ समय — the same lists the /panchanga page shows, as two columns. */
export function PeriodsCard({ p, appLink }: { p: PanchangaDay | undefined; appLink: string }) {
  const { lang, digits } = useLocale();
  const data = useMemo(() => (p ? buildDayTimelineData(p) : null), [p]);
  if (!data) return null;
  const clock = (g: number) => dualTimeAtGhati(g, data.sunriseMin).clock;
  const ashubha: PeriodRow[] = data.ashubhaAll.map((a, i) => ({
    n: digits(i + 1),
    label: bilingualText(lang, a.detailNe, a.detailEn),
    time: `${clock(a.startG)} – ${clock(a.endG)}`,
  }));
  const shubha: PeriodRow[] = data.shubha.map((s, i) => ({
    n: digits(i + 1),
    label: bilingualText(lang, s.name, s.nameEn),
    time: `${clock(s.startG)} – ${clock(s.endG)}`,
  }));
  return (
    <>
      <div style={{ display: "flex", gap: 14, flex: "1 1 auto", minHeight: 0, paddingTop: 6 }}>
        <PeriodColumn title={bilingualText(lang, "अशुभ समय", "Inauspicious periods")} color={DANGER} rows={ashubha} />
        <PeriodColumn title={bilingualText(lang, "शुभ समय", "Auspicious periods")} color={SUCCESS} rows={shubha} />
      </div>
      <OgFooter appLink={appLink} />
    </>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 0,
        borderRadius: 14,
        border: `1px solid ${neutral.silverBase}`,
        background: brand.offWhite,
        padding: "10px 16px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </div>
  );
}

/** D1 चक्र + the planets behind it, anchored to the sunrise instant. */
export function D1Card({ p, appLink }: { p: PanchangaDay | undefined; appLink: string }) {
  const { lang } = useLocale();
  const houses = useMemo(() => buildPanchangaD1Houses(p), [p]);
  if (!p || !houses) return null;
  const retro = houses.some((h) => h.planets.some((pl) => pl.isRetrograde || pl.isCombust));
  const rows = getPlanetRows(p);
  return (
    <>
      <div style={{ display: "flex", gap: 14, flex: "1 1 auto", minHeight: 0, paddingTop: 6 }}>
        <Panel>
          <div className="text-xl font-extrabold text-ill-teal15">{bilingualText(lang, "D1 चक्र", "D1 chart")}</div>
          <div className="text-base font-medium text-ill-gray58b" style={{ paddingBottom: 4 }}>
            {getPlanetsAnchorLabel(p, lang)}
          </div>
          <div style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <D1Chart houses={houses} size={385} />
          </div>
          {retro ? <GrahaStatusLegend className="mt-1" /> : null}
        </Panel>
        <Panel>
          <div className="text-xl font-extrabold text-ill-teal15" style={{ paddingBottom: 4 }}>
            {bilingualText(lang, "ग्रह स्थिति", "Planet positions")}
          </div>
          <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", flex: "1 1 auto", justifyContent: "space-between" }}>
            {rows.map((r) => (
              <li
                key={r.key}
                className="flex items-center justify-between"
                style={{ gap: 10, borderTop: `1px solid ${illustration.amber89b}`, padding: "3px 0" }}
              >
                <span className="font-bold text-ill-teal15" style={{ fontSize: 21 }}>
                  {bilingualText(lang, r.label, r.labelEn ?? r.label)}
                </span>
                <span className="text-right font-semibold text-ill-gray46" style={{ fontSize: 19 }}>
                  <span className="text-ill-teal15">{bilingualText(lang, r.rashiNe, r.rashiEn ?? r.rashiNe)}</span> {r.coords}
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
      <OgFooter appLink={appLink} />
    </>
  );
}
