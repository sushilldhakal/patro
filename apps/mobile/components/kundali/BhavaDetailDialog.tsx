import { useState } from "react";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { useBhavaDetail, useBhavaDialogCopy } from "@vedic-patro/features/kundali";
import { useThemeColors } from "@/lib/theme-context";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { cn } from "@vedic-patro/domain/utils";
import type { BhavaHouse } from "@vedic-patro/domain/bhava";
import type { BhavaReferencePayload } from "@/lib/api";
import { space, spaceUnit } from "@vedic-patro/design-tokens";

/** A compact, always-visible card within a tab. The `right` slot carries the
 * headline fact (a count, a badge) right in the card header. */
function Block({
  icon,
  title,
  right,
  children,
}: {
  icon: string;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View className={kundaliDetailClasses.bhavaDialog.block}>
      <View className={kundaliDetailClasses.bhavaDialog.blockHead}>
        <Text className="text-body">{icon}</Text>
        <Text className={kundaliDetailClasses.prose.headingBold}>{title}</Text>
        {right != null && <View className="ml-auto shrink-0">{right}</View>}
      </View>
      {children}
    </View>
  );
}

const ratingBadgeCls: Record<string, string> = {
  uttam: "border-emerald-500/30 bg-emerald-500/15",
  shubh: "border-emerald-500/30 bg-emerald-500/15",
  mishrit: "border-amber-500/30 bg-amber-500/15",
  kamjor: "border-destructive/20 bg-destructive/10",
};

const ratingTextCls: Record<string, string> = {
  uttam: "text-emerald-700 dark:text-emerald-300",
  shubh: "text-emerald-700 dark:text-emerald-300",
  mishrit: "text-amber-700 dark:text-amber-300",
  kamjor: "text-destructive",
};

/** A classical Sanskrit citation — book/label + shloka — as a distinct
 * quote card instead of small italic prose, so it reads at a glance rather
 * than blending into the surrounding text. `label` is the citation's own
 * kind (e.g. "कारकत्व श्लोक"); when omitted, `source` (the scripture name)
 * doubles as the badge text on its own, matching the saravali-citation use
 * where there's no separate kind to name. */
function ShlokaCard({
  label,
  source,
  shloka,
  small,
}: {
  label?: string;
  source: string;
  shloka: string;
  small: ReturnType<typeof nepaliTextStyle> | undefined;
}) {
  return (
    <View className={kundaliDetailClasses.bhavaDialog.citationBox}>
      <View className={cn(kundaliDetailClasses.bhavaDialog.citationRow, "flex-row")}>
        {label && <Text className={kundaliDetailClasses.prose.heading}>📜 {label}</Text>}
        <View className="rounded-full bg-secondary/15 px-2 py-0.5">
          <Text className="text-body font-medium text-secondary">
            {label ? source : `📜 ${source}`}
          </Text>
        </View>
      </View>
      <Text className="text-body font-bold leading-relaxed text-foreground" style={small}>
        {shloka}
      </Text>
    </View>
  );
}

/** Simple header + collapsible body, replacing the web shadcn Accordion. */
function Collapsible({
  title,
  right,
  defaultOpen,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const colors = useThemeColors();
  return (
    <View className="border-b border-border/60 py-1.5 last:border-b-0">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center justify-between gap-2 py-1.5 active:opacity-80"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text className="text-body flex-1 font-semibold text-foreground">{title}</Text>
        {right != null && <Text className={kundaliDetailClasses.prose.muted}>{right}</Text>}
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
      </Pressable>
      {open ? <View className="pb-2 pt-1">{children}</View> : null}
    </View>
  );
}

type Karakatva = ReturnType<typeof useBhavaDetail>["lord"]["karakatva"][number];
type Small = ReturnType<typeof nepaliTextStyle> | undefined;

function GrahaKarakatvaCard({ card, small }: { card: Karakatva; small: Small }) {
  return (
    <View className="gap-2">
      <Text className={kundaliDetailClasses.prose.headingBold} style={small}>{card.title}</Text>
      <ShlokaCard {...card.shloka} small={small} />
      <View>
        <Text className={kundaliDetailClasses.prose.heading}>📋 {card.subjectsLabel}</Text>
        <Text className={kundaliDetailClasses.prose.bodyMt1} style={small}>{card.subjects}</Text>
      </View>
      <View>
        <Text className={kundaliDetailClasses.prose.heading}>💡 {card.significanceLabel}</Text>
        <Text className={kundaliDetailClasses.prose.bodyMt1} style={small}>{card.significance}</Text>
      </View>
      <View className={kundaliDetailClasses.prose.quote}>
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-body flex-1 font-semibold text-foreground" style={small}>⬡ {card.placementTitle}</Text>
          {card.rating ? (
            <View className={cn(kundaliDetailClasses.bhavaDialog.pill, ratingBadgeCls[card.rating.kind])}>
              <Text className={cn("text-body font-semibold", ratingTextCls[card.rating.kind])}>{card.rating.label}</Text>
            </View>
          ) : null}
        </View>
        {card.summary != null ? (
          <View className="mt-2 gap-2.5">
            {card.citations.map((citation, i) => (
              <ShlokaCard key={i} {...citation} small={small} />
            ))}
            <Text className={kundaliDetailClasses.bhavaDialog.summary} style={small}>💡 {card.summary}</Text>
          </View>
        ) : (
          <Text className={kundaliDetailClasses.prose.mutedMt15} style={small}>{card.noShloka}</Text>
        )}
      </View>
    </View>
  );
}

type Props = {
  houses: BhavaHouse[];
  houseNumber: number | null;
  reference: BhavaReferencePayload | undefined;
  onClose: () => void;
};

export function BhavaDetailDialog({ houses, houseNumber, reference, onClose }: Props) {
  const copy = useBhavaDialogCopy();
  const house = houseNumber != null ? houses.find((h) => h.house === houseNumber) : undefined;
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  return (
    <BottomSheetModal
      visible={Boolean(house)}
      onClose={onClose}
      variant="bottom"
      maxHeight="90%"
      sheetStyle={{
        /* A definite height: the body below is a flex-1 ScrollView, which has
           nothing to fill (collapses to zero) inside a sheet that only has a
           max-height. */
        height: "88%",
        backgroundColor: colors.card,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      {house ? (
        reference ? (
          <BhavaDetailBody key={house.house} house={house} houses={houses} reference={reference} onClose={onClose} />
        ) : (
          <View className="px-4 py-6">
            <Text className={kundaliDetailClasses.prose.muted}>{copy.loading}</Text>
          </View>
        )
      ) : null}
    </BottomSheetModal>
  );
}

function BhavaDetailBody({
  house,
  houses,
  reference,
  onClose,
}: {
  house: BhavaHouse;
  houses: BhavaHouse[];
  reference: BhavaReferencePayload;
  onClose: () => void;
}) {
  const { lang } = useLocale();
  const d = useBhavaDetail({ house, houses, reference });
  const { header, summary, lord, drishti, rules, tab } = d;
  const body = lang === "en" ? undefined : nepaliTextStyle(13);
  const small = lang === "en" ? undefined : nepaliTextStyle(12);
  const attention = summary.health.tone === "attention";
  const verdictCls = attention ? "border-destructive/30 bg-destructive/10" : "border-emerald-500/30 bg-emerald-500/15";
  const verdictTextCls = attention ? "text-destructive" : "text-emerald-700 dark:text-emerald-300";

  return (
    <>
      <View className={kundaliDetailClasses.bhavaDialog.header}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row flex-wrap items-center gap-2">
            <View className={kundaliDetailClasses.bhavaDialog.headerBadge}>
              <Text className={kundaliDetailClasses.bhavaDialog.headerBadgeText}>{header.number}</Text>
            </View>
            <Text className={kundaliDetailClasses.prose.headingBold} style={lang === "en" ? undefined : nepaliTextStyle(16)}>
              {header.title}
              {header.classicalName ? (
                <Text className="text-body font-normal text-muted-foreground"> · {header.classicalName}</Text>
              ) : null}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={d.close}
            className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-muted/60"
          >
            <Text className={kundaliDetailClasses.prose.muted}>✕</Text>
          </Pressable>
        </View>
        <Text className={kundaliDetailClasses.prose.muted} style={small}>{header.themes}</Text>
      </View>

      {/* Only one group is on screen at a time. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        /* A ScrollView grows by default; in the fixed-height sheet that
           stretched the tab row to fill it. Pin it to its content height. */
        style={{ flexGrow: 0, flexShrink: 0 }}
        className={kundaliDetailClasses.bhavaDialog.tabBar}
        contentContainerStyle={{ paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.xs, alignItems: "center" }}
      >
        {d.tabs.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => d.setTab(t.id)}
            className={cn(
              kundaliDetailClasses.bhavaDialog.tab,
              tab === t.id ? kundaliDetailClasses.bhavaDialog.tabActive : kundaliDetailClasses.bhavaDialog.tabIdle,
            )}
          >
            <Text className={cn(kundaliDetailClasses.bhavaDialog.tabText, tab === t.id ? kundaliDetailClasses.bhavaDialog.tabActiveText : kundaliDetailClasses.bhavaDialog.tabIdleText)}>
              {t.icon} {t.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spaceUnit * 3.5, gap: space.md }}>
        {tab === "summary" && (
          <>
            <Block
              icon="🪐"
              title={summary.occupantsTitle}
              right={summary.occupantsRight ? <Text className={kundaliDetailClasses.prose.muted}>{summary.occupantsRight}</Text> : undefined}
            >
              <View className={cn(kundaliDetailClasses.bhavaDialog.rowWrap, "flex-row")}>
                <Text className="text-body" style={small}>
                  <Text className={kundaliDetailClasses.prose.heading}>{summary.sign}</Text> {summary.signLabel}
                </Text>
                <Text className="text-border">·</Text>
                <Text className="text-body" style={small}>
                  {summary.lordLabel} <Text className="text-body font-semibold text-secondary">{summary.lord}</Text>
                </Text>
                {summary.badge ? (
                  <>
                    <Text className="text-border">·</Text>
                    <Text className={kundaliDetailClasses.prose.muted}>{summary.badge}</Text>
                  </>
                ) : null}
              </View>
              {summary.occupants.length > 0 ? (
                <View className="gap-1.5">
                  {summary.occupants.map((p) => (
                    <View key={p.key}>
                      <Text className={kundaliDetailClasses.prose.heading} style={small}>{p.name}</Text>
                      {p.subjects ? <Text className={kundaliDetailClasses.prose.muted} style={small}>{p.subjects}</Text> : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Text className={kundaliDetailClasses.prose.bodyMuted} style={small}>{summary.noOccupants}</Text>
              )}
            </Block>

            <Block
              icon="🩺"
              title={summary.health.title}
              right={
                <View className={cn(kundaliDetailClasses.bhavaDialog.pillInline, "flex-row", verdictCls)}>
                  <Text className={cn("text-body font-semibold", verdictTextCls)}>{summary.health.verdict}</Text>
                </View>
              }
            >
              <Text className={kundaliDetailClasses.prose.body} style={small}>
                <Text className={kundaliDetailClasses.prose.heading}>{summary.health.partsLabel}</Text> {summary.health.parts}
              </Text>
              {summary.health.bodyPart ? (
                <Text className={kundaliDetailClasses.prose.mutedMt1} style={small}>{summary.health.bodyPart}</Text>
              ) : null}
              {summary.health.quiet ? (
                <Text className={kundaliDetailClasses.prose.mutedMt1} style={small}>{summary.health.quiet}</Text>
              ) : null}
            </Block>

            {summary.reference ? (
              <Block icon="📖" title={summary.reference.title}>
                <Text className={kundaliDetailClasses.prose.muted} style={small}>{summary.reference.titles}</Text>
                <Text className="text-body mt-1.5" style={small}>
                  {summary.reference.naturalLabel}: <Text className={kundaliDetailClasses.prose.heading}>{summary.reference.natural}</Text>
                </Text>
                <Text className={kundaliDetailClasses.prose.bodyMt2} style={body}>{summary.reference.description}</Text>
                {/* The Kalapurusha (natural zodiac, Mesha lagna) sign/lord — not this native's own. */}
                <Text className={kundaliDetailClasses.prose.mutedMt2} style={small}>{summary.reference.kalapurusha}</Text>
                <View className="mt-2">
                  <ShlokaCard {...summary.reference.shloka} small={small} />
                </View>
                <Text className={kundaliDetailClasses.prose.mutedMt2} style={small}>{summary.reference.effectNote}</Text>
                <Text className={kundaliDetailClasses.prose.bodyMt15} style={small}>
                  <Text className="text-body font-semibold text-emerald-600 dark:text-emerald-400">{summary.reference.benefic.label}</Text>{" "}
                  {summary.reference.benefic.text}
                </Text>
                <Text className={kundaliDetailClasses.prose.bodyMt1} style={small}>
                  <Text className="text-body font-semibold text-destructive">{summary.reference.malefic.label}</Text>{" "}
                  {summary.reference.malefic.text}
                </Text>
              </Block>
            ) : null}
          </>
        )}

        {tab === "lord" && (
          <>
            <Block
              icon="🪐"
              title={lord.grahasTitle}
              right={lord.grahasCount ? <Text className={kundaliDetailClasses.prose.muted}>{lord.grahasCount}</Text> : undefined}
            >
              {lord.karakatva.length > 0 ? (
                <View className="gap-4">
                  {lord.karakatva.map((card) => (
                    <GrahaKarakatvaCard key={card.key} card={card} small={small} />
                  ))}
                </View>
              ) : (
                <Text className={kundaliDetailClasses.prose.muted} style={small}>{lord.noGrahas}</Text>
              )}
            </Block>

            <Block
              icon="👑"
              title={lord.placementTitle}
              right={lord.placementRight ? <Text className={kundaliDetailClasses.prose.muted}>{lord.placementRight}</Text> : undefined}
            >
              {lord.placement ? (
                <Text className="text-body" style={small}>
                  <Text className={kundaliDetailClasses.prose.heading}>{lord.placement.title}</Text>{" "}
                  <Text className="text-body font-semibold text-secondary">{lord.placement.lord}</Text> → {lord.placement.where}
                </Text>
              ) : (
                <Text className={kundaliDetailClasses.prose.muted} style={small}>{lord.lordMissing}</Text>
              )}
              {lord.bhavesh ? (
                "comingSoon" in lord.bhavesh ? (
                  <Text className={kundaliDetailClasses.prose.mutedMt2} style={small}>🚧 {lord.bhavesh.comingSoon}</Text>
                ) : (
                  <View className="mt-2 gap-1.5">
                    {lord.bhavesh.shloka ? <ShlokaCard {...lord.bhavesh.shloka} small={small} /> : null}
                    <Text className={kundaliDetailClasses.prose.body} style={small}>{lord.bhavesh.text}</Text>
                    <Text className={kundaliDetailClasses.prose.muted} style={small}>{lord.bhavesh.source}</Text>
                  </View>
                )
              ) : null}
            </Block>

            {lord.yuti ? (
              <Block icon="👥" title={lord.yuti.title}>
                <View className="gap-3">
                  {lord.yuti.pair ? (
                    <View className={kundaliDetailClasses.prose.quote}>
                      <Text className={kundaliDetailClasses.prose.heading} style={small}>
                        {lord.yuti.pair.names}
                        {lord.yuti.pair.yoga ? (
                          <Text className="text-body font-normal text-muted-foreground"> ({lord.yuti.pair.yoga})</Text>
                        ) : null}
                      </Text>
                      <Text className={kundaliDetailClasses.prose.bodyMt1} style={small}>{lord.yuti.pair.text}</Text>
                    </View>
                  ) : null}
                  {lord.yuti.triples.map((entry) => (
                    <View key={entry.key} className={kundaliDetailClasses.prose.quote}>
                      <Text className={kundaliDetailClasses.prose.heading} style={small}>{entry.names}</Text>
                      <Text className={kundaliDetailClasses.prose.bodyMt1} style={small}>{entry.text}</Text>
                    </View>
                  ))}
                  {lord.yuti.generalRule ? (
                    <Text className={kundaliDetailClasses.prose.bodyMuted} style={small}>{lord.yuti.generalRule}</Text>
                  ) : null}
                  {lord.yuti.none ? <Text className={kundaliDetailClasses.prose.muted} style={small}>{lord.yuti.none}</Text> : null}
                </View>
              </Block>
            ) : null}
          </>
        )}

        {tab === "drishti" && (
          <Block icon="👁️" title={drishti.title}>
            {drishti.outgoing.length > 0 ? (
              <View className="gap-1.5">
                {drishti.outgoing.map((p) => (
                  <Text key={p.key} className="text-body" style={small}>
                    <Text className={kundaliDetailClasses.prose.heading}>{p.name}</Text>
                    {" → "}
                    {p.targets}
                  </Text>
                ))}
              </View>
            ) : (
              <Text className={kundaliDetailClasses.prose.muted} style={small}>{drishti.noOutgoing}</Text>
            )}
            <View className={kundaliDetailClasses.prose.divider}>
              <Text className={kundaliDetailClasses.prose.headingMb15} style={small}>{drishti.allTitle}</Text>
              {drishti.incoming.length > 0 ? (
                <View className="gap-2">
                  <Text className={kundaliDetailClasses.prose.heading} style={small}>{drishti.incomingTitle}</Text>
                  {drishti.incoming.map((g) => (
                    <View key={g.key}>
                      <Text className={kundaliDetailClasses.prose.heading} style={small}>{g.name}</Text>
                      {g.summary ? <Text className={kundaliDetailClasses.prose.bodyMutedMt05} style={small}>{g.summary}</Text> : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Text className={kundaliDetailClasses.prose.muted} style={small}>{drishti.noIncoming}</Text>
              )}
            </View>
          </Block>
        )}

        {tab === "rules" && (
          <Block icon="📚" title={rules.title}>
            <Collapsible title={rules.sutrasTitle} right={rules.sutrasCount}>
              {rules.sutras.length > 0 ? (
                <View className="gap-3">
                  {rules.sutras.map((s) => (
                    <View key={s.key} className={kundaliDetailClasses.prose.quote}>
                      <Text className={kundaliDetailClasses.prose.heading} style={small}>{s.title}</Text>
                      <Text className={kundaliDetailClasses.prose.muted} style={small}>{s.category}</Text>
                      <Text className={kundaliDetailClasses.prose.bodyMt1} style={small}>{s.body}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className={kundaliDetailClasses.prose.muted} style={small}>{rules.noSutras}</Text>
              )}
              <Text className={kundaliDetailClasses.prose.mutedMt2} style={small}>{rules.sutraSource}</Text>
            </Collapsible>

            <Collapsible title={rules.lalKitabTitle} right={rules.lalKitabCount}>
              {rules.lalKitab.length > 0 ? (
                <View className="gap-3">
                  {rules.lalKitab.map((e) => (
                    <View key={e.key}>
                      <Text className={kundaliDetailClasses.prose.heading} style={small}>{e.title}</Text>
                      <Text className={kundaliDetailClasses.prose.bodyMt05} style={small}>{e.text}</Text>
                      {e.tip ? <Text className={kundaliDetailClasses.prose.bodyMutedMt1} style={small}>{e.tip}</Text> : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Text className={kundaliDetailClasses.prose.bodyMuted} style={small}>{rules.noLalKitab}</Text>
              )}
              {rules.lalKitabYuti ? (
                <View className={kundaliDetailClasses.prose.quoteTop}>
                  <Text className={kundaliDetailClasses.prose.heading} style={small}>{rules.lalKitabYuti.title}</Text>
                  <Text className={kundaliDetailClasses.prose.bodyMt1} style={small}>{rules.lalKitabYuti.text}</Text>
                </View>
              ) : null}
              <Text className={kundaliDetailClasses.prose.mutedMt2} style={small}>{rules.lalKitabSource}</Text>
              <View className="mt-2">
                <Collapsible title={rules.susthaTitle}>
                  <View className="gap-1.5">
                    {rules.sustha.map((rule, i) => (
                      <Text key={i} className={kundaliDetailClasses.prose.body} style={small}>{rule}</Text>
                    ))}
                  </View>
                  <Text className={kundaliDetailClasses.prose.mutedMt2} style={small}>{rules.susthaSource}</Text>
                </Collapsible>
              </View>
            </Collapsible>
          </Block>
        )}
      </ScrollView>

      <View className={kundaliDetailClasses.bhavaDialog.footer}>
        <Button label={d.close} variant="outline" onPress={onClose} />
      </View>
    </>
  );
}
