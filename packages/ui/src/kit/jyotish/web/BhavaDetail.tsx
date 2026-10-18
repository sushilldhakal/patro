import { useState } from "react";
import type { BhavaHouse } from "@vedic-patro/domain/bhava";
import { cn } from "@vedic-patro/design-tokens/cn";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { useBhavaDetail, useBhavaDialogCopy, type BhavaShloka } from "@vedic-patro/features/kundali";
import { Box, Button, Pressable, Sheet, Text } from "@vedic-patro/ui";
import type { BhavaDetailDialogProps } from "../contract";

const b = kundaliDetailClasses.bhavaDialog;
const prose = kundaliDetailClasses.prose;
const RATING: Record<string, string> = {
  uttam: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  shubh: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  mishrit: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  kamjor: "border-destructive/20 bg-destructive/10 text-destructive",
};

function Citation({ label, source, shloka }: BhavaShloka) {
  return (
    <Box className={b.citationBox}>
      <Text className={prose.heading}>{label ? label : source}</Text>
      <Text className="text-sm text-secondary">{source}</Text>
      <Text className="whitespace-pre-line text-base font-bold text-foreground">{shloka}</Text>
    </Box>
  );
}

function Block({ icon, title, right, children }: { icon: string; title: string; right?: string; children: React.ReactNode }) {
  return (
    <Box className={b.block}>
      <Box className={b.blockHead} webClassName="flex">
        <Text>{icon}</Text>
        <Text className={prose.headingBold}>{title}</Text>
        {right ? <Text className={b.blockRight}>{right}</Text> : null}
      </Box>
      {children}
    </Box>
  );
}

function Body({ house, houses, reference, onClose }: { house: BhavaHouse; houses: BhavaHouse[]; reference: NonNullable<BhavaDetailDialogProps["reference"]>; onClose: () => void }) {
  const d = useBhavaDetail({ house, houses, reference });
  const [open, setOpen] = useState<Record<string, boolean>>({ naadi: true });
  const toggle = (key: string) => setOpen((v) => ({ ...v, [key]: !v[key] }));
  const verdict = d.summary.health.tone === "attention" ? "border-destructive/30 bg-destructive/10 text-destructive" : RATING.uttam;
  return (
    <Box className="gap-3">
      <Text className={prose.muted}>{d.header.themes}</Text>
      <Box className={b.tabBar} webClassName="flex">
        {d.tabs.map((tab) => (
          <Pressable key={tab.id} role="tab" selected={d.tab === tab.id} onPress={() => d.setTab(tab.id)} className={cn(b.tab, b.tabText, d.tab === tab.id ? cn(b.tabActive, b.tabActiveText) : cn(b.tabIdle, b.tabIdleText))}>
            <Text>{tab.icon} {tab.label}</Text>
          </Pressable>
        ))}
      </Box>
      {d.tab === "summary" ? (
        <Box className="gap-3">
          <Block icon="🪐" title={d.summary.occupantsTitle} right={d.summary.occupantsRight ?? undefined}>
            <Text>{d.summary.sign} {d.summary.signLabel} · {d.summary.lordLabel} {d.summary.lord}{d.summary.badge ? ` · ${d.summary.badge}` : ""}</Text>
            {d.summary.occupants.length > 0 ? d.summary.occupants.map((p) => <Text key={p.key} className={prose.heading}>{p.name}{p.subjects ? ` — ${p.subjects}` : ""}</Text>) : <Text className={prose.bodyMuted}>{d.summary.noOccupants}</Text>}
          </Block>
          <Block icon="🩺" title={d.summary.health.title} right={d.summary.health.verdict}>
            <Text className={verdict}>{d.summary.health.partsLabel} {d.summary.health.parts}</Text>
            {d.summary.health.bodyPart ? <Text className={prose.muted}>{d.summary.health.bodyPart}</Text> : null}
            {d.summary.health.quiet ? <Text className={prose.muted}>{d.summary.health.quiet}</Text> : null}
          </Block>
          {d.summary.reference ? (
            <Block icon="📖" title={d.summary.reference.title}>
              <Text className={prose.muted}>{d.summary.reference.titles}</Text>
              <Text>{d.summary.reference.naturalLabel}: {d.summary.reference.natural}</Text>
              <Text>{d.summary.reference.description}</Text>
              <Text className={prose.muted}>{d.summary.reference.kalapurusha}</Text>
              <Citation {...d.summary.reference.shloka} />
              <Text className={prose.muted}>{d.summary.reference.effectNote}</Text>
              <Text>{d.summary.reference.benefic.label} {d.summary.reference.benefic.text}</Text>
              <Text>{d.summary.reference.malefic.label} {d.summary.reference.malefic.text}</Text>
            </Block>
          ) : null}
        </Box>
      ) : null}
      {d.tab === "lord" ? (
        <Box className="gap-3">
          <Block icon="🪐" title={d.lord.grahasTitle} right={d.lord.grahasCount ?? undefined}>
            {d.lord.karakatva.length > 0 ? d.lord.karakatva.map((card) => (
              <Box key={card.key} className="gap-2 py-3">
                <Text className={prose.headingBold}>{card.title}</Text>
                <Citation {...card.shloka} />
                <Text className={prose.heading}>{card.subjectsLabel}</Text>
                <Text>{card.subjects}</Text>
                <Text className={prose.heading}>{card.significanceLabel}</Text>
                <Text>{card.significance}</Text>
                <Text className={prose.heading}>{card.placementTitle}</Text>
                {card.rating ? <Text className={cn(b.pill, RATING[card.rating.kind])}>{card.rating.label}</Text> : null}
                {card.summary != null ? card.citations.map((citation, i) => <Citation key={i} {...citation} />) : <Text className={prose.muted}>{card.noShloka}</Text>}
                {card.summary != null ? <Text>{card.summary}</Text> : null}
              </Box>
            )) : <Text className={prose.muted}>{d.lord.noGrahas}</Text>}
          </Block>
          <Block icon="👑" title={d.lord.placementTitle} right={d.lord.placementRight ?? undefined}>
            {d.lord.placement ? <Text>{d.lord.placement.title} {d.lord.placement.lord} → {d.lord.placement.where}</Text> : <Text className={prose.muted}>{d.lord.lordMissing}</Text>}
            {d.lord.bhavesh && "comingSoon" in d.lord.bhavesh ? <Text className={prose.muted}>{d.lord.bhavesh.comingSoon}</Text> : null}
            {d.lord.bhavesh && !("comingSoon" in d.lord.bhavesh) ? (
              <Box>
                {d.lord.bhavesh.shloka ? <Citation {...d.lord.bhavesh.shloka} /> : null}
                <Text>{d.lord.bhavesh.text}</Text>
                <Text className={prose.muted}>{d.lord.bhavesh.source}</Text>
              </Box>
            ) : null}
          </Block>
          {d.lord.yuti ? (
            <Block icon="👥" title={d.lord.yuti.title}>
              {d.lord.yuti.pair ? <Text>{d.lord.yuti.pair.names} {d.lord.yuti.pair.yoga ?? ""} {d.lord.yuti.pair.text}</Text> : null}
              {d.lord.yuti.triples.map((entry) => <Text key={entry.key}>{entry.names} {entry.text}</Text>)}
              {d.lord.yuti.generalRule ? <Text className={prose.bodyMuted}>{d.lord.yuti.generalRule}</Text> : null}
              {d.lord.yuti.none ? <Text className={prose.muted}>{d.lord.yuti.none}</Text> : null}
            </Block>
          ) : null}
        </Box>
      ) : null}
      {d.tab === "drishti" ? (
        <Block icon="👁" title={d.drishti.title}>
          {d.drishti.outgoing.length > 0 ? d.drishti.outgoing.map((p) => <Text key={p.key}>{p.name} → {p.targets}</Text>) : <Text className={prose.muted}>{d.drishti.noOutgoing}</Text>}
          <Text className={prose.heading}>{d.drishti.allTitle}</Text>
          <Text className={prose.heading}>{d.drishti.incomingTitle}</Text>
          {d.drishti.incoming.length > 0 ? d.drishti.incoming.map((item) => <Text key={item.key}>{item.name}{item.summary ? ` — ${item.summary}` : ""}</Text>) : <Text className={prose.muted}>{d.drishti.noIncoming}</Text>}
        </Block>
      ) : null}
      {d.tab === "rules" ? (
        <Block icon="📚" title={d.rules.title}>
          <Pressable onPress={() => toggle("naadi")}><Text>{d.rules.sutrasTitle} {d.rules.sutrasCount}</Text></Pressable>
          {open.naadi ? (
            <Box>
              {d.rules.sutras.length > 0 ? d.rules.sutras.map((s) => <Text key={s.key}>{s.title} {s.category} {s.body}</Text>) : <Text className={prose.muted}>{d.rules.noSutras}</Text>}
              <Text className={prose.muted}>{d.rules.sutraSource}</Text>
            </Box>
          ) : null}
          <Pressable onPress={() => toggle("lal")}><Text>{d.rules.lalKitabTitle} {d.rules.lalKitabCount}</Text></Pressable>
          {open.lal ? (
            <Box>
              {d.rules.lalKitab.length > 0 ? d.rules.lalKitab.map((e) => <Text key={e.key}>{e.title} {e.text} {e.tip ?? ""}</Text>) : <Text className={prose.bodyMuted}>{d.rules.noLalKitab}</Text>}
              {d.rules.lalKitabYuti ? <Text>{d.rules.lalKitabYuti.title} {d.rules.lalKitabYuti.text}</Text> : null}
              <Text className={prose.muted}>{d.rules.lalKitabSource}</Text>
              <Pressable onPress={() => toggle("sustha")}><Text>{d.rules.susthaTitle}</Text></Pressable>
              {open.sustha ? d.rules.sustha.map((rule, i) => <Text key={i}>{rule}</Text>) : null}
              {open.sustha ? <Text className={prose.muted}>{d.rules.susthaSource}</Text> : null}
            </Box>
          ) : null}
        </Block>
      ) : null}
      <Button label={d.close} onPress={onClose} variant="outline" />
    </Box>
  );
}

/** House detail. The website's dialog and the app's drawer are both the shared sheet. */
export function BhavaDetailDialog({ houses, houseNumber, reference, onClose }: BhavaDetailDialogProps) {
  const copy = useBhavaDialogCopy();
  const house = houseNumber != null ? houses.find((h) => h.house === houseNumber) : undefined;
  const title = house && reference ? `${house.house}` : copy.loading;
  return (
    <Sheet open={Boolean(house)} onClose={onClose} title={title}>
      {house && reference ? <Body house={house} houses={houses} reference={reference} onClose={onClose} /> : <Text>{copy.loading}</Text>}
    </Sheet>
  );
}
