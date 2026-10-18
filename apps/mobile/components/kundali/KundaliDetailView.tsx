import { useMemo } from "react";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { KundaliBirthPanchangaCard } from "@/components/kundali/KundaliBirthPanchangaCard";
import { DashaSystemPanel } from "@/components/kundali/DashaSystemPanel";
import { DivisionalChartCompare } from "@/components/kundali/DivisionalChartCompare";
import { ShadbalaCard } from "@/components/kundali/ShadbalaCard";
import { AshtakavargaCard } from "@/components/kundali/AshtakavargaCard";
import { BhavaBalaCard } from "@/components/kundali/BhavaBalaCard";
import { VimshopakaCard } from "@/components/kundali/VimshopakaCard";
import { YogaReferenceCatalog } from "@/components/kundali/YogaReferenceCatalog";
import {
  GrahaAstroTable,
  KundaliSection,
  UpagrahaTable,
  YogaList,
} from "@/components/kundali/KundaliSections";
import { KundaliSources } from "@/components/kundali/KundaliSources";
import { ShantiVidhiPanel } from "@/components/kundali/ShantiVidhiPanel";
import { KundaliReport } from "@/components/kundali/KundaliReport";
import type { KundaliDetailResponse, LocationParams } from "@/lib/api";
import type { InstantQuery } from "@vedic-patro/domain/calendar/instant-query";
import type { AyanamshaMode } from "@vedic-patro/domain/astronomy/ayanamsha";
import {
  BALA_TAB_SECTIONS,
  contentSectionId,
  dashaSectionId,
  dashaSystemFromSection,
  type KundaliContentSectionId,
  type KundaliSectionId,
} from "@vedic-patro/features/kundali";
import { useLocale } from "@/lib/i18n";
import { cn } from "@vedic-patro/design-tokens/cn";
import { buildPresentYogaRefIds } from "@vedic-patro/read-models/jyotish/kundali/yoga-reference-map";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { kundaliClasses } from "@vedic-patro/design-tokens/classes/kundali-classes";

type Props = {
  detail: KundaliDetailResponse;
  section: KundaliSectionId;
  onSectionChange?: (id: KundaliSectionId) => void;
  ayanamshaMode: AyanamshaMode;
  timeZone?: string;
  birthMoment?: InstantQuery | null;
  birthLocation?: LocationParams;
  reportDisabled?: boolean;
  /** Jump to another section — wires DashaSystemPanel's own tabs into the nav. */
  onNavigate?: (id: KundaliSectionId) => void;
};

export function KundaliDetailView({
  detail,
  section,
  onSectionChange,
  ayanamshaMode,
  timeZone,
  birthMoment,
  birthLocation,
  reportDisabled,
  onNavigate,
}: Props) {
  const { t, lang } = useLocale();
  const d1Rows = detail.vargaCharts.entries["1"] ?? [];
  const go = onSectionChange ?? onNavigate;
  const show = (id: KundaliContentSectionId) => contentSectionId(section) === id;
  const dashaSystem = dashaSystemFromSection(section) ?? "vimshottari";
  const balaTabs = (
    <View className={cn(kundaliDetailClasses.subTabs.root, "self-start")}>
      {BALA_TAB_SECTIONS.map((tab) => {
        const selected = section === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => go?.(tab.id)}
            className={cn(
              "rounded-lg border px-3 py-1.5",
              selected ? "border-border/60 bg-card" : "border-transparent",
            )}
          >
            <Text className={kundaliDetailClasses.prose.heading} style={nepaliTextStyle(13)}>
              {t(tab.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
  const presentRefIds = useMemo(() => buildPresentYogaRefIds(detail.yogas), [detail.yogas]);
  const hasPresentYogas = detail.yogas.some((y) => y.present);

  return (
    <View>
      {show("kundali-overview") ? (
        <>
          <KundaliBirthPanchangaCard detail={detail} ayanamshaMode={ayanamshaMode} />
          {d1Rows.length > 0 ? (
            <DivisionalChartCompare vargaCharts={detail.vargaCharts} combustion={detail.combustion} />
          ) : null}
        </>
      ) : null}

      {show("kundali-graha") && d1Rows.length > 0 ? (
        <KundaliSection
          edgeToEdgeContent
          title={t("kundali.nav_graha_details")}
          subtitle={t("ui.kundali.positions_at_the_birth_instant")}
          icon="planet-outline"
        >
          <GrahaAstroTable
            d1Rows={d1Rows}
            points={detail.vargaCharts.points}
            combustion={detail.combustion}
          />
          {detail.upagrahas?.length ? (
            <View className="border-t border-border">
              <Text
                className={cn(kundaliDetailClasses.view.upagrahaTitle, "text-foreground")}
                style={nepaliTextStyle(11)}
              >
                {t("ui.kundali.upagrahas")}
              </Text>
              <UpagrahaTable rows={detail.upagrahas} />
            </View>
          ) : null}
        </KundaliSection>
      ) : null}

      {show("kundali-yoga") ? (
        <KundaliSection
          title={t("ui.kundali.kundali_yogas")}
          subtitle={t("ui.kundali.combinations_formed_in_this_chart")}
          icon="sparkles-outline"
        >
          {hasPresentYogas ? (
            <YogaList yogas={detail.yogas} />
          ) : (
            <Text className="mb-1 text-sm text-foreground" style={nepaliTextStyle(14)}>
              {t("ui.kundali.no_major_yogas_found_in_this")}
            </Text>
          )}
          <YogaReferenceCatalog excludeIds={presentRefIds} />
        </KundaliSection>
      ) : null}

      {show("kundali-yoga") ? <KundaliSources kind="yoga" /> : null}

      {show("kundali-dasha") &&
      (detail.dasha || detail.tribhagiDasha || detail.yoginiDasha) ? (
        <KundaliSection title={t("kundali.nav_dasha")} subtitle={t("ui.kundali.dasha_systems")} icon="time-outline">
          <DashaSystemPanel
            vimshottari={detail.dasha}
            tribhagi={detail.tribhagiDasha}
            yogini={detail.yoginiDasha}
            timeZone={timeZone ?? detail.panchanga.location?.timezone ?? "Asia/Kathmandu"}
            active={dashaSystem}
            onActiveChange={(system) => go?.(dashaSectionId(system))}
          />
        </KundaliSection>
      ) : null}

      {show("kundali-dasha") && (detail.dasha || detail.tribhagiDasha || detail.yoginiDasha) ? <KundaliSources kind="dasha" /> : null}

      {show("kundali-shadbala") ? (
        <KundaliSection
          title={t("kundali.nav_shadbala")}
          subtitle={t("ui.kundali.planetary_strength_in_rupas")}
          icon="barbell-outline"
        >
          {balaTabs}
          <ShadbalaCard
            data={detail.shadbala}
            yuddha={detail.yuddha}
            bhavaBala={detail.bhavaBala}
          />
        </KundaliSection>
      ) : null}

      {show("kundali-shadbala") ? <KundaliSources kind="shadbala" /> : null}

      {show("kundali-bhava-bala") ? (
        <KundaliSection title={t("kundali.nav_bhava_bala")} icon="stats-chart-outline">
          {balaTabs}
          {detail.bhavaBala ? (
            <BhavaBalaCard
              data={detail.bhavaBala}
              vargaCharts={detail.vargaCharts}
              combustion={detail.combustion}
            />
          ) : (
            <Text className={kundaliClasses.sectionUnavailable} style={nepaliTextStyle(14)}>
              {t("ui.kundali.this_section_is_not_available")}
            </Text>
          )}
        </KundaliSection>
      ) : null}

      {show("kundali-bhava-bala") ? <KundaliSources kind="bhavabala" /> : null}

      {show("kundali-ashtakavarga") ? (
        <KundaliSection title={t("kundali.nav_ashtakavarga")} icon="apps-outline">
          {balaTabs}
          {detail.ashtakavarga ? (
            <AshtakavargaCard data={detail.ashtakavarga} />
          ) : (
            <Text className={kundaliClasses.sectionUnavailable} style={nepaliTextStyle(14)}>
              {t("ui.kundali.this_section_is_not_available")}
            </Text>
          )}
        </KundaliSection>
      ) : null}

      {show("kundali-ashtakavarga") ? <KundaliSources kind="ashtakavarga" /> : null}

      {show("kundali-vimshopaka") ? (
        <KundaliSection
          title={t("kundali.nav_vimshopaka")}
          icon="grid-outline"
          edgeToEdgeContent
        >
          {balaTabs}
          {detail.vimshopaka && detail.vimshopaka.classifications.length > 0 ? (
            <VimshopakaCard data={detail.vimshopaka} />
          ) : (
            <Text className={kundaliClasses.sectionUnavailable} style={nepaliTextStyle(14)}>
              {t("ui.kundali.this_section_is_not_available")}
            </Text>
          )}
        </KundaliSection>
      ) : null}

      {show("kundali-vimshopaka") ? <KundaliSources kind="vimshopaka" /> : null}

      {show("kundali-shanti") ? (
        <KundaliSection
          title={t("nav.shanti_vidhi")}
          subtitle={t("ui.kundali.navagraha_remedial_measures")}
          icon="flame-outline"
        >
          <ShantiVidhiPanel grahaShanti={detail.grahaShanti} />
        </KundaliSection>
      ) : null}

      {show("kundali-shanti") ? <KundaliSources kind="shanti" /> : null}

      {show("kundali-report") && birthMoment ? (
        <KundaliReport
          moment={birthMoment}
          location={birthLocation}
          ayanamsha={ayanamshaMode}
          disabled={reportDisabled}
        />
      ) : null}
    </View>
  );
}
