import { useMemo } from "react";
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
import type { InstantQuery } from "@vedic-patro/domain/instant-query";
import type { AyanamshaMode } from "@vedic-patro/domain/ayanamsha";
import {
  BALA_TAB_SECTIONS,
  contentSectionId,
  dashaSectionId,
  dashaSystemFromSection,
  type KundaliContentSectionId,
  type KundaliSectionId,
} from "@/lib/kundali/kundali-section-nav";
import { useLocale } from "@/lib/i18n";
import { kundaliLabel } from "@/lib/kundali/kundali-i18n";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@vedic-patro/domain/utils";
import { buildPresentYogaRefIds } from "@vedic-patro/domain/kundali/yoga-reference-map";
import { nepaliTextStyle } from "@/lib/nepali-text";

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
  const { lang, pick } = useLocale();
  const colors = useThemeColors();
  const d1Rows = detail.vargaCharts.entries["1"] ?? [];
  const go = onSectionChange ?? onNavigate;
  const show = (id: KundaliContentSectionId) => contentSectionId(section) === id;
  const dashaSystem = dashaSystemFromSection(section) ?? "vimshottari";
  const balaTabs = (
    <View className="mb-3 flex-row flex-wrap gap-1 rounded-xl border border-border/70 bg-muted/20 p-1">
      {BALA_TAB_SECTIONS.map((tab) => {
        const selected = section === tab.id;
        return (
          <Pressable
            key={tab.id}
            onPress={() => go?.(tab.id)}
            className={cn("rounded-lg px-3 py-1.5")}
            style={{
              backgroundColor: selected ? colors.card : "transparent",
              borderWidth: selected ? 1 : 0,
              borderColor: selected ? colors.border : "transparent",
            }}
          >
            <Text
              className={cn("text-body font-semibold", selected ? "text-foreground" : "text-muted-foreground")}
              style={nepaliTextStyle(13)}
            >
              {kundaliLabel(tab.i18nKey, lang)}
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
          title={pick("ग्रह विवरण", "Graha details")}
          subtitle={pick("जन्म क्षणको स्पष्ट स्थिति", "Positions at the birth instant")}
          icon="planet-outline"
        >
          <GrahaAstroTable
            d1Rows={d1Rows}
            points={detail.vargaCharts.points}
            combustion={detail.combustion}
          />
          {detail.upagrahas?.length ? (
            <View className="mt-3 border-t border-border px-3 pt-3">
              <Text
                className="text-caption mb-2 font-semibold uppercase tracking-wider text-muted-foreground"
                style={nepaliTextStyle(11)}
              >
                {pick("उपग्रह", "Upagrahas")}
              </Text>
              <UpagrahaTable rows={detail.upagrahas} />
            </View>
          ) : null}
        </KundaliSection>
      ) : null}

      {show("kundali-yoga") ? (
        <KundaliSection
          title={pick("कुण्डली योग", "Kundali yogas")}
          subtitle={pick("यस कुण्डलीमा बनेका योग", "Combinations formed in this chart")}
          icon="sparkles-outline"
        >
          {hasPresentYogas ? (
            <YogaList yogas={detail.yogas} />
          ) : (
            <Text className="text-body mb-1 text-muted-foreground" style={nepaliTextStyle(14)}>
              {pick("यस कुण्डलीमा कुनै प्रमुख योग भेटिएन।", "No major yogas found in this chart.")}
            </Text>
          )}
          <YogaReferenceCatalog excludeIds={presentRefIds} />
        </KundaliSection>
      ) : null}

      {show("kundali-yoga") ? <KundaliSources kind="yoga" /> : null}

      {show("kundali-dasha") &&
      (detail.dasha || detail.tribhagiDasha || detail.yoginiDasha) ? (
        <KundaliSection title={pick("दशा", "Dasha")} subtitle={pick("दशा प्रणाली", "Dasha systems")} icon="time-outline">
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
          title={pick("षड्बल", "Shadbala")}
          subtitle={pick("ग्रह बल — रूपमा", "Planetary strength in rupas")}
          icon="barbell-outline"
        >
          {balaTabs}
          <ShadbalaCard
            data={detail.shadbala}
            yuddha={detail.yuddha}
            bhavaBala={detail.bhavaBala}
            compactHeader
          />
        </KundaliSection>
      ) : null}

      {show("kundali-shadbala") ? <KundaliSources kind="shadbala" /> : null}

      {show("kundali-bhava-bala") ? (
        <KundaliSection title={pick("भाव बल", "Bhava bala")} icon="stats-chart-outline">
          {balaTabs}
          {detail.bhavaBala ? (
            <BhavaBalaCard
              data={detail.bhavaBala}
              compactHeader
              vargaCharts={detail.vargaCharts}
              combustion={detail.combustion}
            />
          ) : (
            <Text className="text-body py-8 text-center text-muted-foreground" style={nepaliTextStyle(14)}>
              {pick("यो खण्ड उपलब्ध छैन।", "This section is not available.")}
            </Text>
          )}
        </KundaliSection>
      ) : null}

      {show("kundali-bhava-bala") ? <KundaliSources kind="bhavabala" /> : null}

      {show("kundali-ashtakavarga") ? (
        <KundaliSection title={pick("अष्टकवर्ग", "Ashtakavarga")} icon="apps-outline">
          {balaTabs}
          {detail.ashtakavarga ? (
            <AshtakavargaCard data={detail.ashtakavarga} compactHeader />
          ) : (
            <Text className="text-body py-8 text-center text-muted-foreground" style={nepaliTextStyle(14)}>
              {pick("यो खण्ड उपलब्ध छैन।", "This section is not available.")}
            </Text>
          )}
        </KundaliSection>
      ) : null}

      {show("kundali-ashtakavarga") ? <KundaliSources kind="ashtakavarga" /> : null}

      {show("kundali-vimshopaka") ? (
        <KundaliSection
          title={pick("विंशोपक बल", "Vimshopaka Bala")}
          icon="grid-outline"
          edgeToEdgeContent
        >
          {balaTabs}
          {detail.vimshopaka && detail.vimshopaka.classifications.length > 0 ? (
            <VimshopakaCard data={detail.vimshopaka} compactHeader />
          ) : (
            <Text className="text-body py-8 text-center text-muted-foreground" style={nepaliTextStyle(14)}>
              {pick("यो खण्ड उपलब्ध छैन।", "This section is not available.")}
            </Text>
          )}
        </KundaliSection>
      ) : null}

      {show("kundali-vimshopaka") ? <KundaliSources kind="vimshopaka" /> : null}

      {show("kundali-shanti") ? (
        <KundaliSection
          title={pick("शान्ति विधि", "Shanti vidhi")}
          subtitle={pick("नवग्रह शान्ति उपाय", "Navagraha remedial measures")}
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
