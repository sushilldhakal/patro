import { useTranslation } from "react-i18next";

import { useLocaleDigits } from "@/i18n/digits";
import {
  ComputationReferenceTables,
  EclipticBeltStudy,
  PrecessionSkyStudy,
} from "@/components/learn/ComputationSkyDiagrams";
import { ServerPipelineDiagram } from "@/components/learn/ServerPipelineDiagram";
import {
  learnRefCaption,
  learnRefHighlightRow,
  learnRefTable,
  learnRefWrap,
  tmFcard,
  tmFormula,
  tmKey,
  tmKeys,
  tmLede,
  tmNote,
  tmSecHead,
  tmSecKicker,
  tmSecTitle,
  tmSection,
} from "@/lib/learn-classes";

const K = "learn.study.calc.";

function Lede({ children }: { children: React.ReactNode }) {
  return <p className={tmLede}>{children}</p>;
}

function Section({
  kicker,
  titleKey,
  children,
}: {
  kicker: string;
  titleKey: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const num = useLocaleDigits();
  return (
    <section className={tmSection}>
      <div className={tmSecHead}>
        <span className={tmSecKicker}>{num(kicker)}</span>
        <h3 className={tmSecTitle}>{t(titleKey)}</h3>
      </div>
      {children}
    </section>
  );
}

function RefTable({
  captionKey,
  headerKeys,
  rows,
  highlightRow,
}: {
  captionKey: string;
  headerKeys: string[];
  rows: React.ReactNode[][];
  highlightRow?: number;
}) {
  const { t } = useTranslation();
  return (
    <div className={learnRefWrap}>
      <table className={learnRefTable}>
        <caption className={learnRefCaption}>{t(captionKey)}</caption>
        <thead>
          <tr>
            {headerKeys.map((h) => (
              <th key={h}>{t(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={highlightRow === i ? learnRefHighlightRow : undefined}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KeysBlock({ items }: { items: { h: string; p: string }[] }) {
  const { t } = useTranslation();
  return (
    <div className={tmKeys}>
      {items.map((k) => (
        <div className={tmKey} key={k.h}>
          <h4>{t(k.h)}</h4>
          <p>{t(k.p)}</p>
        </div>
      ))}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className={tmNote}>{children}</p>;
}

/** Step rows of the "one panchanga day" table: [what, how] catalogue keys. */
const PANCHANGA_STEPS: readonly [string, string][] = [
  [`${K}step_rise_what`, `${K}step_rise_how`],
  [`${K}step_moonrise_what`, `${K}step_moonrise_how`],
  [`${K}step_tithi_what`, `${K}step_tithi_how`],
  [`${K}step_daylen_what`, `${K}step_daylen_how`],
  [`${K}step_noon_what`, `${K}step_noon_how`],
  [`${K}step_limbs_what`, `${K}step_limbs_how`],
  [`${K}step_month_what`, `${K}step_month_how`],
  [`${K}step_grahas_what`, `${K}step_grahas_how`],
  [`${K}step_lagna_what`, `${K}step_lagna_how`],
  [`${K}step_muhurta_what`, `${K}step_muhurta_how`],
  [`${K}step_samvat_what`, `${K}step_samvat_how`],
];

/** Gochar table rows: [topic, calculation] catalogue keys. */
const GOCHAR_ROWS: readonly [string, string][] = [
  [`${K}gochar_position_topic`, `${K}gochar_position_calc`],
  [`${K}gochar_retro_topic`, `${K}gochar_retro_calc`],
  [`${K}gochar_combust_topic`, `${K}gochar_combust_calc`],
  [`${K}gochar_ingress_topic`, `${K}gochar_ingress_calc`],
  [`${K}gochar_nakshatra_topic`, `${K}gochar_nakshatra_calc`],
  [`${K}gochar_station_topic`, `${K}gochar_station_calc`],
  [`${K}gochar_events_topic`, `${K}gochar_events_calc`],
];

/** Eclipse table rows: [stage, what happens] catalogue keys. */
const ECLIPSE_ROWS: readonly [string, string][] = [
  [`${K}eclipse_global_stage`, `${K}eclipse_global_what`],
  ["learn.type", `${K}eclipse_type_what`],
  [`${K}eclipse_visibility_stage`, `${K}eclipse_visibility_what`],
  [`${K}eclipse_solar_local_stage`, `${K}eclipse_solar_local_what`],
  [`${K}eclipse_lunar_local_stage`, `${K}eclipse_lunar_local_what`],
  [`${K}eclipse_display_stage`, `${K}eclipse_display_what`],
];

export function HowWeCalculateStudy() {
  const { t } = useTranslation();
  const num = useLocaleDigits();

  return (
    <>
      <Section kicker="00" titleKey={`${K}summary_title`}>
        <Lede>
          {t(`${K}summary_lede_intro`)}{" "}
          <span className="hl">{t("learn.study.pipeline.api_name")}</span>{" "}
          {t(`${K}summary_lede_stack`)}{" "}
          <span className="hl-amber">{t(`${K}swiss_jpl`)}</span>
          {t(`${K}summary_lede_ayanamsha`)} <span className="hl">{t(`${K}vedic_patro`)}</span>{" "}
          {t(`${K}summary_lede_frontend`)}
        </Lede>
        <ServerPipelineDiagram />
      </Section>

      <Section kicker="01" titleKey={`${K}rashi_title`}>
        <Lede>
          <span className="hl">{t("learn.rashi")}</span> {t(`${K}rashi_lede_sectors`)}{" "}
          <span className="hl-amber">{num(30)}°</span> {t(`${K}rashi_lede_range`)}{" "}
          <span className="hl">{t(`${K}term_nirayana`)}</span> {t(`${K}rashi_lede_sidereal`)}
        </Lede>
        <KeysBlock
          items={[
            { h: `${K}key_ecliptic_h`, p: `${K}key_ecliptic_p` },
            { h: "nakshatra", p: `${K}key_nakshatra_p` },
            { h: "grahas.lagna", p: `${K}key_lagna_p` },
          ]}
        />
        <div className={tmFormula}>
          <div className={tmFcard}>
            <div className="big">
              floor(λ ÷ 30) <span className="u">→ {num("0–11")}</span>
            </div>
            <div className="lbl">{t(`${K}formula_rashi_index_lbl`)}</div>
            <div className="desc">{t(`${K}formula_rashi_index_desc`)}</div>
          </div>
          <div className={tmFcard}>
            <div className="big">
              floor(λ ÷ 13°20′) <span className="u">→ {num("0–26")}</span>
            </div>
            <div className="lbl">{t("nakshatra")}</div>
            <div className="desc">{t(`${K}formula_nakshatra_desc`)}</div>
          </div>
        </div>
      </Section>

      <Section kicker="02" titleKey={`${K}belt_title`}>
        <Lede>
          {t(`${K}belt_lede_intro`)} <span className="hl">{t(`${K}term_geocentric`)}</span>{" "}
          {t(`${K}belt_lede_scene`)}{" "}
          <span className="hl-amber">{t(`${K}belt_lede_grid`)}</span>{" "}
          {t(`${K}belt_lede_readouts`)}
        </Lede>
        <EclipticBeltStudy />
        <Note>{t(`${K}belt_note`)}</Note>
      </Section>

      <Section kicker="03" titleKey={`${K}precession_title`}>
        <Lede>
          {t(`${K}precession_lede_tilt`)} <span className="hl-amber">{num("≈ 23°26′")}</span>{" "}
          {t(`${K}precession_lede_seasons`)}{" "}
          <span className="hl">{t(`${K}precession_lede_cycle`)}</span>{" "}
          {t(`${K}precession_lede_ayanamsha`)}
        </Lede>
        <Lede>{t(`${K}precession_lede_diagrams`)}</Lede>
        <PrecessionSkyStudy />
      </Section>

      <Section kicker="04" titleKey={`${K}foundation_title`}>
        <Lede>
          {t(`${K}foundation_lede_intro`)}{" "}
          <span className="hl">{t(`${K}foundation_lede_place`)}</span>{" "}
          {t(`${K}foundation_lede_coords`)} <span className="hl">{t(`${K}term_civil_day`)}</span>{" "}
          {t(`${K}foundation_lede_calendars`)} <span className="hl-amber">{t(`${K}term_jd`)}</span>
          {t(`${K}foundation_lede_clock`)}
        </Lede>
        <KeysBlock
          items={[
            { h: `${K}key_swiss_h`, p: `${K}key_swiss_p` },
            { h: `${K}key_udaya_day_h`, p: `${K}key_udaya_day_p` },
            { h: `${K}key_sankranti_h`, p: `${K}key_sankranti_p` },
          ]}
        />
        <ComputationReferenceTables />
      </Section>

      <Section kicker="05" titleKey={`${K}panchanga_title`}>
        <Lede>
          <span className="hl">{t(`${K}panchanga_lede_limbs`)}</span>{" "}
          {t(`${K}panchanga_lede_source`)}{" "}
          <span className="hl-amber">{t(`${K}term_udaya_tithi`)}</span>{" "}
          {t(`${K}panchanga_lede_anchor`)}
        </Lede>
        <div className={tmFormula}>
          <div className={tmFcard}>
            <div className="big">
              {t(`${K}formula_tithi_big`)} <span className="u">{t(`${K}formula_tithi_range`)}</span>
            </div>
            <div className="lbl">{t("tithi")}</div>
            <div className="desc">{t(`${K}formula_tithi_desc`)}</div>
          </div>
          <div className={tmFcard}>
            <div className="big">
              {t(`${K}formula_nakshatra_big`)}{" "}
              <span className="u">{t(`${K}formula_nakshatra_range`)}</span>
            </div>
            <div className="lbl">{t("nakshatra")}</div>
            <div className="desc">{t(`${K}formula_nakshatra_grid_desc`)}</div>
          </div>
          <div className={tmFcard}>
            <div className="big">
              {t(`${K}formula_yoga_big`)} <span className="u">{t(`${K}formula_yoga_range`)}</span>
            </div>
            <div className="lbl">{t("learn.yoga")}</div>
            <div className="desc">{t(`${K}formula_yoga_desc`)}</div>
          </div>
          <div className={tmFcard}>
            <div className="big">
              {t(`${K}formula_karana_big`)}{" "}
              <span className="u">{t(`${K}formula_karana_range`)}</span>
            </div>
            <div className="lbl">{t("learn.karana")}</div>
            <div className="desc">{t(`${K}formula_karana_desc`)}</div>
          </div>
        </div>
        <Lede>
          <span className="hl-amber">{t(`${K}term_end_times`)}</span>
          {t(`${K}panchanga_lede_end_times`)}
        </Lede>
        <RefTable
          captionKey={`${K}steps_caption`}
          headerKeys={[`${K}col_step`, `${K}col_what`, `${K}col_how`]}
          rows={PANCHANGA_STEPS.map(([what, how], i) => [num(i + 1), t(what), t(how)])}
          highlightRow={0}
        />
        <Note>{t(`${K}panchanga_note`)}</Note>
      </Section>

      <Section kicker="06" titleKey={`${K}gochar_title`}>
        <Lede>
          <span className="hl">{t(`${K}term_gochar`)}</span> {t(`${K}gochar_lede_intro`)}{" "}
          <span className="hl-amber">{t(`${K}gochar_lede_slots`)}</span>{" "}
          {t(`${K}gochar_lede_snapshot`)}
        </Lede>
        <RefTable
          captionKey={`${K}gochar_caption`}
          headerKeys={[`${K}col_topic`, `${K}col_calc`]}
          rows={GOCHAR_ROWS.map(([topic, calc]) => [t(topic), t(calc)])}
        />
        <KeysBlock
          items={[
            { h: `${K}key_speed_h`, p: `${K}key_speed_p` },
            { h: `${K}key_patro_kundali_h`, p: `${K}key_patro_kundali_p` },
          ]}
        />
      </Section>

      <Section kicker="07" titleKey={`${K}eclipse_title`}>
        <Lede>
          <span className="hl">{t(`${K}term_solar_eclipse`)}</span> {t(`${K}eclipse_lede_and`)}{" "}
          <span className="hl">{t(`${K}term_lunar_eclipse`)}</span>{" "}
          {t(`${K}eclipse_lede_routines`)}
        </Lede>
        <RefTable
          captionKey={`${K}eclipse_caption`}
          headerKeys={[`${K}col_stage`, `${K}col_happens`]}
          rows={ECLIPSE_ROWS.map(([stage, what]) => [t(stage), t(what)])}
        />
        <Note>{t(`${K}eclipse_note`)}</Note>
      </Section>

      <Section kicker="08" titleKey={`${K}frontend_title`}>
        <Lede>
          <span className="hl">{t(`${K}vedic_patro`)}</span> {t(`${K}frontend_lede_intro`)}{" "}
          <span className="hl-amber">{t(`${K}frontend_lede_formats`)}</span>{" "}
          {t(`${K}frontend_lede_server`)}
        </Lede>
        <Note>{t(`${K}frontend_note`)}</Note>
      </Section>
    </>
  );
}

export function HowWeCalculateArticle() {
  return <HowWeCalculateStudy />;
}
