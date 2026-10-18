import { useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import type { BhavaHouse } from "@vedic-patro/domain/bhava";
import { cn } from "@vedic-patro/design-tokens/cn";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { space, spaceUnit } from "@vedic-patro/design-tokens";
import { useBhavaDetail, useBhavaDialogCopy, type BhavaShloka } from "@vedic-patro/features/kundali";
import { Button, Icon, Text } from "@vedic-patro/ui";
import { kitIcons, sheetClass } from "../../../classes";
import type { BhavaDetailDialogProps } from "../contract";

const b = kundaliDetailClasses.bhavaDialog;
const prose = kundaliDetailClasses.prose;

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

/** A compact card within a tab; `right` carries the headline fact (a count, a badge). */
function Block({ icon, title, right, children }: { icon: string; title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View className={b.block}>
      <View className={b.blockHead}>
        <Text>{icon}</Text>
        <Text className={prose.headingBold}>{title}</Text>
        {right != null ? <View className="ml-auto shrink-0">{right}</View> : null}
      </View>
      {children}
    </View>
  );
}

/** A classical citation as a quote card: its kind, the book as a badge, then the shloka. */
function ShlokaCard({ label, source, shloka }: BhavaShloka) {
  return (
    <View className={b.citationBox}>
      <View className={cn(b.citationRow, "flex-row")}>
        {label ? <Text className={prose.heading}>📜 {label}</Text> : null}
        <View className="rounded-full bg-secondary/15 px-2 py-0.5">
          <Text className="text-body font-medium text-secondary">{label ? source : `📜 ${source}`}</Text>
        </View>
      </View>
      <Text className="text-body font-bold leading-relaxed text-foreground">{shloka}</Text>
    </View>
  );
}

function Collapsible({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View className="border-b border-border/60 py-1.5 last:border-b-0">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center justify-between gap-2 py-1.5 active:opacity-80"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text className="text-body flex-1 font-semibold text-foreground">{title}</Text>
        {right != null ? <Text className={prose.muted}>{right}</Text> : null}
        <Icon node={open ? kitIcons.chevronUp : kitIcons.chevronDown} size="sm" tone="muted" />
      </Pressable>
      {open ? <View className="pb-2 pt-1">{children}</View> : null}
    </View>
  );
}

type Karakatva = ReturnType<typeof useBhavaDetail>["lord"]["karakatva"][number];

function GrahaKarakatvaCard({ card }: { card: Karakatva }) {
  return (
    <View className="gap-2">
      <Text className={prose.headingBold}>{card.title}</Text>
      <ShlokaCard {...card.shloka} />
      <View>
        <Text className={prose.heading}>📋 {card.subjectsLabel}</Text>
        <Text className={prose.bodyMt1}>{card.subjects}</Text>
      </View>
      <View>
        <Text className={prose.heading}>💡 {card.significanceLabel}</Text>
        <Text className={prose.bodyMt1}>{card.significance}</Text>
      </View>
      <View className={prose.quote}>
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-body flex-1 font-semibold text-foreground">⬡ {card.placementTitle}</Text>
          {card.rating ? (
            <View className={cn(b.pill, ratingBadgeCls[card.rating.kind])}>
              <Text className={cn("text-body font-semibold", ratingTextCls[card.rating.kind])}>{card.rating.label}</Text>
            </View>
          ) : null}
        </View>
        {card.summary != null ? (
          <View className="mt-2 gap-2.5">
            {card.citations.map((citation, i) => (
              <ShlokaCard key={i} {...citation} />
            ))}
            <Text className={b.summary}>💡 {card.summary}</Text>
          </View>
        ) : (
          <Text className={prose.mutedMt15}>{card.noShloka}</Text>
        )}
      </View>
    </View>
  );
}

function Body({ house, houses, reference, onClose }: { house: BhavaHouse; houses: BhavaHouse[]; reference: NonNullable<BhavaDetailDialogProps["reference"]>; onClose: () => void }) {
  const d = useBhavaDetail({ house, houses, reference });
  const { header, summary, lord, drishti, rules, tab } = d;
  const attention = summary.health.tone === "attention";
  const verdictCls = attention ? "border-destructive/30 bg-destructive/10" : "border-emerald-500/30 bg-emerald-500/15";
  const verdictTextCls = attention ? "text-destructive" : "text-emerald-700 dark:text-emerald-300";

  return (
    <>
      <View className={b.header}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row flex-wrap items-center gap-2">
            <View className={b.headerBadge}>
              <Text className={b.headerBadgeText}>{header.number}</Text>
            </View>
            <Text className={prose.headingBold}>
              {header.title}
              {header.classicalName ? <Text className="text-body font-normal text-muted-foreground"> · {header.classicalName}</Text> : null}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={d.close}
            className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-muted/60"
          >
            <Icon node={kitIcons.x} size="sm" tone="muted" />
          </Pressable>
        </View>
        <Text className={prose.muted}>{header.themes}</Text>
      </View>

      {/* Pinned to its content height: a ScrollView grows by default and would stretch the tab row. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0 }}
        className={b.tabBar}
        contentContainerStyle={{ paddingHorizontal: space.md, paddingVertical: space.sm, gap: space.xs, alignItems: "center" }}
      >
        {d.tabs.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => d.setTab(t.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.id }}
            className={cn(b.tab, tab === t.id ? b.tabActive : b.tabIdle)}
          >
            <Text className={cn(b.tabText, tab === t.id ? b.tabActiveText : b.tabIdleText)}>
              {t.icon} {t.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spaceUnit * 3.5, gap: space.md }}>
        {tab === "summary" ? (
          <>
            <Block icon="🪐" title={summary.occupantsTitle} right={summary.occupantsRight ? <Text className={prose.muted}>{summary.occupantsRight}</Text> : undefined}>
              <View className={cn(b.rowWrap, "flex-row")}>
                <Text>
                  <Text className={prose.heading}>{summary.sign}</Text> {summary.signLabel}
                </Text>
                <Text className="text-border">·</Text>
                <Text>
                  {summary.lordLabel} <Text className="text-body font-semibold text-secondary">{summary.lord}</Text>
                </Text>
                {summary.badge ? (
                  <>
                    <Text className="text-border">·</Text>
                    <Text className={prose.muted}>{summary.badge}</Text>
                  </>
                ) : null}
              </View>
              {summary.occupants.length > 0 ? (
                <View className="gap-1.5">
                  {summary.occupants.map((p) => (
                    <View key={p.key}>
                      <Text className={prose.heading}>{p.name}</Text>
                      {p.subjects ? <Text className={prose.muted}>{p.subjects}</Text> : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Text className={prose.bodyMuted}>{summary.noOccupants}</Text>
              )}
            </Block>

            <Block
              icon="🩺"
              title={summary.health.title}
              right={
                <View className={cn(b.pillInline, "flex-row", verdictCls)}>
                  <Text className={cn("text-body font-semibold", verdictTextCls)}>{summary.health.verdict}</Text>
                </View>
              }
            >
              <Text className={prose.body}>
                <Text className={prose.heading}>{summary.health.partsLabel}</Text> {summary.health.parts}
              </Text>
              {summary.health.bodyPart ? <Text className={prose.mutedMt1}>{summary.health.bodyPart}</Text> : null}
              {summary.health.quiet ? <Text className={prose.mutedMt1}>{summary.health.quiet}</Text> : null}
            </Block>

            {summary.reference ? (
              <Block icon="📖" title={summary.reference.title}>
                <Text className={prose.muted}>{summary.reference.titles}</Text>
                <Text className="text-body mt-1.5">
                  {summary.reference.naturalLabel}: <Text className={prose.heading}>{summary.reference.natural}</Text>
                </Text>
                <Text className={prose.bodyMt2}>{summary.reference.description}</Text>
                {/* The Kalapurusha (natural zodiac, Mesha lagna) sign/lord — not this native's own. */}
                <Text className={prose.mutedMt2}>{summary.reference.kalapurusha}</Text>
                <View className="mt-2">
                  <ShlokaCard {...summary.reference.shloka} />
                </View>
                <Text className={prose.mutedMt2}>{summary.reference.effectNote}</Text>
                <Text className={prose.bodyMt15}>
                  <Text className="text-body font-semibold text-emerald-600 dark:text-emerald-400">{summary.reference.benefic.label}</Text> {summary.reference.benefic.text}
                </Text>
                <Text className={prose.bodyMt1}>
                  <Text className="text-body font-semibold text-destructive">{summary.reference.malefic.label}</Text> {summary.reference.malefic.text}
                </Text>
              </Block>
            ) : null}
          </>
        ) : null}

        {tab === "lord" ? (
          <>
            <Block icon="🪐" title={lord.grahasTitle} right={lord.grahasCount ? <Text className={prose.muted}>{lord.grahasCount}</Text> : undefined}>
              {lord.karakatva.length > 0 ? (
                <View className="gap-4">
                  {lord.karakatva.map((card) => (
                    <GrahaKarakatvaCard key={card.key} card={card} />
                  ))}
                </View>
              ) : (
                <Text className={prose.muted}>{lord.noGrahas}</Text>
              )}
            </Block>

            <Block icon="👑" title={lord.placementTitle} right={lord.placementRight ? <Text className={prose.muted}>{lord.placementRight}</Text> : undefined}>
              {lord.placement ? (
                <Text>
                  <Text className={prose.heading}>{lord.placement.title}</Text> <Text className="text-body font-semibold text-secondary">{lord.placement.lord}</Text> → {lord.placement.where}
                </Text>
              ) : (
                <Text className={prose.muted}>{lord.lordMissing}</Text>
              )}
              {lord.bhavesh ? (
                "comingSoon" in lord.bhavesh ? (
                  <Text className={prose.mutedMt2}>🚧 {lord.bhavesh.comingSoon}</Text>
                ) : (
                  <View className="mt-2 gap-1.5">
                    {lord.bhavesh.shloka ? <ShlokaCard {...lord.bhavesh.shloka} /> : null}
                    <Text className={prose.body}>{lord.bhavesh.text}</Text>
                    <Text className={prose.muted}>{lord.bhavesh.source}</Text>
                  </View>
                )
              ) : null}
            </Block>

            {lord.yuti ? (
              <Block icon="👥" title={lord.yuti.title}>
                <View className="gap-3">
                  {lord.yuti.pair ? (
                    <View className={prose.quote}>
                      <Text className={prose.heading}>
                        {lord.yuti.pair.names}
                        {lord.yuti.pair.yoga ? <Text className="text-body font-normal text-muted-foreground"> ({lord.yuti.pair.yoga})</Text> : null}
                      </Text>
                      <Text className={prose.bodyMt1}>{lord.yuti.pair.text}</Text>
                    </View>
                  ) : null}
                  {lord.yuti.triples.map((entry) => (
                    <View key={entry.key} className={prose.quote}>
                      <Text className={prose.heading}>{entry.names}</Text>
                      <Text className={prose.bodyMt1}>{entry.text}</Text>
                    </View>
                  ))}
                  {lord.yuti.generalRule ? <Text className={prose.bodyMuted}>{lord.yuti.generalRule}</Text> : null}
                  {lord.yuti.none ? <Text className={prose.muted}>{lord.yuti.none}</Text> : null}
                </View>
              </Block>
            ) : null}
          </>
        ) : null}

        {tab === "drishti" ? (
          <Block icon="👁️" title={drishti.title}>
            {drishti.outgoing.length > 0 ? (
              <View className="gap-1.5">
                {drishti.outgoing.map((p) => (
                  <Text key={p.key}>
                    <Text className={prose.heading}>{p.name}</Text>
                    {" → "}
                    {p.targets}
                  </Text>
                ))}
              </View>
            ) : (
              <Text className={prose.muted}>{drishti.noOutgoing}</Text>
            )}
            <View className={prose.divider}>
              <Text className={prose.headingMb15}>{drishti.allTitle}</Text>
              {drishti.incoming.length > 0 ? (
                <View className="gap-2">
                  <Text className={prose.heading}>{drishti.incomingTitle}</Text>
                  {drishti.incoming.map((g) => (
                    <View key={g.key}>
                      <Text className={prose.heading}>{g.name}</Text>
                      {g.summary ? <Text className={prose.bodyMutedMt05}>{g.summary}</Text> : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Text className={prose.muted}>{drishti.noIncoming}</Text>
              )}
            </View>
          </Block>
        ) : null}

        {tab === "rules" ? (
          <Block icon="📚" title={rules.title}>
            <Collapsible title={rules.sutrasTitle} right={rules.sutrasCount}>
              {rules.sutras.length > 0 ? (
                <View className="gap-3">
                  {rules.sutras.map((s) => (
                    <View key={s.key} className={prose.quote}>
                      <Text className={prose.heading}>{s.title}</Text>
                      <Text className={prose.muted}>{s.category}</Text>
                      <Text className={prose.bodyMt1}>{s.body}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className={prose.muted}>{rules.noSutras}</Text>
              )}
              <Text className={prose.mutedMt2}>{rules.sutraSource}</Text>
            </Collapsible>

            <Collapsible title={rules.lalKitabTitle} right={rules.lalKitabCount}>
              {rules.lalKitab.length > 0 ? (
                <View className="gap-3">
                  {rules.lalKitab.map((e) => (
                    <View key={e.key}>
                      <Text className={prose.heading}>{e.title}</Text>
                      <Text className={prose.bodyMt05}>{e.text}</Text>
                      {e.tip ? <Text className={prose.bodyMutedMt1}>{e.tip}</Text> : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Text className={prose.bodyMuted}>{rules.noLalKitab}</Text>
              )}
              {rules.lalKitabYuti ? (
                <View className={prose.quoteTop}>
                  <Text className={prose.heading}>{rules.lalKitabYuti.title}</Text>
                  <Text className={prose.bodyMt1}>{rules.lalKitabYuti.text}</Text>
                </View>
              ) : null}
              <Text className={prose.mutedMt2}>{rules.lalKitabSource}</Text>
              <View className="mt-2">
                <Collapsible title={rules.susthaTitle}>
                  <View className="gap-1.5">
                    {rules.sustha.map((rule, i) => (
                      <Text key={i} className={prose.body}>{rule}</Text>
                    ))}
                  </View>
                  <Text className={prose.mutedMt2}>{rules.susthaSource}</Text>
                </Collapsible>
              </View>
            </Collapsible>
          </Block>
        ) : null}
      </ScrollView>

      <View className={cn(b.footer, "pb-8")}>
        <Button label={d.close} variant="outline" onPress={onClose} />
      </View>
    </>
  );
}

/** House detail as a bottom drawer: numbered header, tab chips, the chosen tab scrolling, and a close footer. */
export function BhavaDetailDialog({ houses, houseNumber, reference, onClose }: BhavaDetailDialogProps) {
  const copy = useBhavaDialogCopy();
  const house = houseNumber != null ? houses.find((h) => h.house === houseNumber) : undefined;
  return (
    <Modal visible={Boolean(house)} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable
          className={cn("absolute bottom-0 left-0 right-0 top-0", sheetClass.backdrop)}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={copy.close}
        />
        {/* A definite height: the body is a flex-1 ScrollView, which collapses inside a max-height-only panel. */}
        <View className="overflow-hidden rounded-t-2xl border border-border bg-card" style={{ height: "88%" }} accessibilityViewIsModal>
          <View className={cn(sheetClass.handle, "mt-2 mb-0")} />
          {house ? (
            reference ? (
              <Body key={house.house} house={house} houses={houses} reference={reference} onClose={onClose} />
            ) : (
              <View className="px-4 py-6">
                <Text className={prose.muted}>{copy.loading}</Text>
              </View>
            )
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
