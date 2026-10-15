/**
 * Navagraha shanti panel logic, shared by the website's and the app's
 * `components/kundali/ShantiVidhiPanel.tsx` (the shanti vidhi page and the
 * shanti section of every kundali): the chart's findings grouped by tier
 * (open/closed), the graha selector, the selected graha's detail (mantras,
 * japa, stotram, yantra, tiles, daan), the reference table, and copy. The
 * findings come from the server's classical 4-step decision; the app passes
 * how to scroll to the detail.
 */
import { useState } from "react";
import type { GrahaShantiFinding, GrahaShantiRecommendation } from "@vedic-patro/api-client";
import { bilingualText } from "@vedic-patro/domain/locale";
import { NAVAGRAHA_SHANTI, getGrahaShanti } from "@vedic-patro/domain/shanti/navagraha-shanti";
import { useLocale } from "@vedic-patro/i18n/react";

export type ShantiTier = "critical" | "core";

export type ShantiFindingCard = {
  key: string;
  graha: string;
  step: string;
  remedy: GrahaShantiFinding["remedy"];
  remedyLabel: string;
  name: string;
  reason: string;
  viewLabel: string;
};

export function useShantiVidhiPanel({
  grahaShanti,
  isError = false,
  scrollToDetail,
}: {
  grahaShanti?: GrahaShantiRecommendation;
  isError?: boolean;
  /** Bring the selected graha's detail into view (after a finding's "view" button). */
  scrollToDetail?: () => void;
}) {
  const { t, lang, digits } = useLocale();
  const pick = (ne?: string | null, en?: string | null) => bilingualText(lang, ne, en);
  const [selectedKey, setSelectedKey] = useState("saturn");
  const [openTiers, setOpenTiers] = useState<Partial<Record<ShantiTier, boolean>>>({});
  const graha = getGrahaShanti(selectedKey) ?? NAVAGRAHA_SHANTI[0]!;
  const findings = grahaShanti?.findings ?? [];

  const selectFinding = (key: string) => {
    setSelectedKey(key);
    if (scrollToDetail) requestAnimationFrame(scrollToDetail);
  };

  const card = (finding: GrahaShantiFinding, idx: number): ShantiFindingCard => {
    const g = getGrahaShanti(finding.graha);
    const nameNe = g?.nameNe ?? finding.grahaNe;
    const nameEn = g?.nameEn ?? finding.graha;
    return {
      key: `${finding.step}-${finding.graha}-${finding.remedy}-${idx}`,
      graha: finding.graha,
      step: pick(finding.stepTitleNe, finding.stepTitleEn),
      remedy: finding.remedy,
      remedyLabel: t(`kundali.x.shanti_remedy_${finding.remedy}`),
      name: pick(nameNe, nameEn),
      reason: pick(finding.reasonNe, finding.reasonEn),
      viewLabel: t("kundali.x.shanti_view", { name: pick(nameNe, nameEn) }),
    };
  };

  const critical = findings.filter((f) => f.tier === "critical");
  const core = findings.filter((f) => f.tier === "core");
  const group = (tier: ShantiTier, list: GrahaShantiFinding[], defaultOpen: boolean) => {
    const open = openTiers[tier] ?? defaultOpen;
    return {
      tier,
      title: `${t(`kundali.x.shanti_tier_${tier}`)} (${digits(list.length)})`,
      cards: list.map(card),
      open,
      toggle: () => setOpenTiers((prev) => ({ ...prev, [tier]: !open })),
    };
  };
  const groups = [group("critical", critical, true), group("core", core, critical.length === 0)].filter((g) => g.cards.length > 0);

  const status: "error" | "findings" | "empty" = isError ? "error" : findings.length > 0 ? "findings" : "empty";

  return {
    status,
    groups,
    selectedKey,
    select: setSelectedKey,
    selectFinding,
    selector: NAVAGRAHA_SHANTI.map((g) => ({ key: g.key, name: pick(g.nameNe, g.nameEn), active: g.key === selectedKey })),
    detail: {
      key: graha.key,
      colorHex: graha.colorHex,
      title: t("kundali.x.shanti_title", { name: pick(graha.nameNe, graha.nameEn) }),
      subtitle: pick(graha.nameEn, graha.nameNe),
      vaara: pick(graha.vaaraNe, graha.vaaraEn),
      samaya: pick(graha.shubhSamayaNe, graha.shubhSamayaEn),
      color: pick(graha.colorNe, graha.colorEn),
      beejMantra: graha.beejMantra,
      vedicMantra: graha.vedicMantra,
      tantrikMantra: graha.tantrikMantra,
      /** `Trans` key; <v> wraps the counts. */
      japaLine: {
        i18nKey: "kundali.x.shanti_japa_line",
        values: { japa: digits(graha.japa), japa4: digits(graha.japa * 4), kaliyuga: t("kundali.x.shanti_kaliyuga_japa") },
      },
      stotram: graha.stotram,
      yantra: graha.yantraGrid.map((n) => digits(n)),
      tiles: [
        { key: "samidha", label: t("kundali.x.shanti_samidha_heading"), value: pick(graha.samidhaNe, graha.samidhaEn) },
        { key: "gem", label: t("kundali.x.shanti_gem"), value: pick(graha.gemNe, graha.gemEn) },
        { key: "metal", label: t("kundali.x.shanti_metal"), value: pick(graha.metalNe, graha.metalEn) },
        { key: "deity", label: t("kundali.x.shanti_deity"), value: pick(graha.adhidevataNe, graha.adhidevataEn) },
        { key: "pratyadhidevata", label: t("kundali.x.shanti_pratyadhidevata"), value: pick(graha.pratyadhidevataNe, graha.pratyadhidevataEn) },
        { key: "disha", label: t("kundali.x.shanti_disha"), value: pick(graha.dishaNe, graha.dishaEn) },
        { key: "pooja", label: t("kundali.x.shanti_pooja"), value: pick(graha.poojaNe, graha.poojaEn) },
      ] as { key: "samidha" | "gem" | "metal" | "deity" | "pratyadhidevata" | "disha" | "pooja"; label: string; value: string }[],
      gemDetail: pick(graha.gemDetailNe, graha.gemDetailEn),
      daan: lang === "en" ? (graha.daanEn ?? graha.daan) : graha.daan,
      remedy: pick(graha.remedyNe, graha.remedyEn),
    },
    reference: {
      columns: [
        t("learn.playground.planet"),
        t("kundali.day"),
        t("kundali.x.shanti_beeja_mantra_column"),
        t("kundali.x.shanti_japa_column"),
        t("kundali.x.shanti_samidha_column"),
        t("kundali.x.shanti_gem"),
        t("kundali.x.shanti_metal"),
        t("kundali.x.shanti_daan_column"),
      ],
      rows: NAVAGRAHA_SHANTI.map((g) => ({
        key: g.key,
        active: g.key === selectedKey,
        name: pick(g.nameNe, g.nameEn),
        vaara: pick(g.vaaraNe, g.vaaraEn),
        beejMantra: g.beejMantra,
        japa: digits(g.japa),
        samidha: pick(g.samidhaNe, g.samidhaEn),
        gem: pick(g.gemNe, g.gemEn),
        metal: pick(g.metalNe, g.metalEn),
        daan: lang === "en" ? (g.daanEn ?? g.daan).join(", ") : g.daan.join(", "),
      })),
    },
    copy: {
      loadError: t("kundali.x.shanti_load_error"),
      empty: t("kundali.x.shanti_findings_empty"),
      basisNote: t("kundali.x.shanti_basis_note"),
      beejaHeading: t("kundali.x.shanti_beeja_mantra_heading"),
      vedicHeading: t("kundali.x.shanti_vedic_mantra_heading"),
      tantrikHeading: t("kundali.x.shanti_tantrik_mantra_heading"),
      stotramHeading: t("kundali.x.shanti_stotram_heading"),
      yantraHeading: t("kundali.x.shanti_yantra_heading"),
      gemDetailLabel: t("kundali.x.shanti_gem_detail_label"),
      donationItems: t("kundali.x.shanti_donation_items"),
      useLabel: t("kundali.x.shanti_use_label"),
      referenceTitle: t("kundali.x.shanti_reference_table"),
      disclaimer: t("kundali.x.shanti_disclaimer"),
    },
  };
}
