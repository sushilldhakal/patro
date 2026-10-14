import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@vedic-patro/domain/utils";
import { useMediaQuery, BELOW_MD_MQ } from "@/hooks/use-media-query";
import type { BhavaHouse } from "@vedic-patro/domain/bhava";
import type { BhavaReferencePayload } from "@/lib/api";
import { useBhavaDetail, useBhavaDialogCopy } from "@vedic-patro/features/kundali";

/** A compact, always-visible card within a tab — replaces the old
 * TopSection/AccordionItem pattern now that each tab already isolates its
 * content, so there's no need for a second layer of collapsing on top. The
 * `right` slot still carries the headline fact (a count, a badge) right in
 * the card header, same as before. */
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
    <div className={kundaliDetailClasses.bhavaDialog.block}>
      <div className={cn(kundaliDetailClasses.bhavaDialog.blockHead, "flex")}>
        <span aria-hidden>{icon}</span>
        <span className={kundaliDetailClasses.prose.headingBold}>{title}</span>
        {right && <span className={kundaliDetailClasses.bhavaDialog.blockRight}>{right}</span>}
      </div>
      {children}
    </div>
  );
}

const ratingBadgeCls: Record<string, string> = {
  uttam: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  shubh: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  mishrit: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  kamjor: "border-destructive/20 bg-destructive/10 text-destructive",
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
}: {
  label?: string;
  source: string;
  shloka: string;
}) {
  return (
    <div className={kundaliDetailClasses.bhavaDialog.citationBox}>
      <div className={cn(kundaliDetailClasses.bhavaDialog.citationRow, "flex")}>
        {label && <span className={kundaliDetailClasses.prose.heading}>📜 {label}</span>}
        <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-sm font-medium leading-none text-secondary">
          {label ? source : `📜 ${source}`}
        </span>
      </div>
      <p className="whitespace-pre-line text-base font-bold leading-relaxed text-foreground">{shloka}</p>
    </div>
  );
}

type Karakatva = ReturnType<typeof useBhavaDetail>["lord"]["karakatva"][number];

function GrahaKarakatvaCard({ card }: { card: Karakatva }) {
  return (
    <div className="space-y-2">
      <p className={kundaliDetailClasses.prose.headingBold}>{card.title}</p>

      <ShlokaCard {...card.shloka} />

      <div>
        <p className={kundaliDetailClasses.prose.heading}>📋 {card.subjectsLabel}</p>
        <p className={kundaliDetailClasses.prose.bodyMt1}>{card.subjects}</p>
      </div>

      <div>
        <p className={kundaliDetailClasses.prose.heading}>💡 {card.significanceLabel}</p>
        <p className={kundaliDetailClasses.prose.bodyMt1}>{card.significance}</p>
      </div>

      <div className={kundaliDetailClasses.prose.quote}>
        <div className="flex items-center justify-between gap-2">
          <p className={kundaliDetailClasses.prose.heading}>⬡ {card.placementTitle}</p>
          {card.rating && (
            <span
              className={cn(
                kundaliDetailClasses.bhavaDialog.pill, "text-sm font-semibold leading-none",
                ratingBadgeCls[card.rating.kind],
              )}
            >
              {card.rating.label}
            </span>
          )}
        </div>

        {card.summary != null ? (
          /* Every cited text's shloka for this placement first (each with its
             own source), then one combined meaning at the end. */
          <div className="space-y-2.5">
            {card.citations.map((citation, i) => (
              <ShlokaCard key={i} {...citation} />
            ))}
            <p className={kundaliDetailClasses.bhavaDialog.summary}>💡 {card.summary}</p>
          </div>
        ) : (
          <p className={kundaliDetailClasses.prose.mutedMt15}>{card.noShloka}</p>
        )}
      </div>
    </div>
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
  const isMobile = useMediaQuery(BELOW_MD_MQ);
  const open = Boolean(house);
  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  const content = house ? (
    reference ? (
      <BhavaDetailBody
        key={house.house}
        variant={isMobile ? "drawer" : "dialog"}
        house={house}
        houses={houses}
        reference={reference}
        onClose={onClose}
      />
    ) : isMobile ? (
      <DrawerHeader>
        <DrawerTitle>{copy.loading}</DrawerTitle>
      </DrawerHeader>
    ) : (
      <DialogHeader>
        <DialogTitle>{copy.loading}</DialogTitle>
      </DialogHeader>
    )
  ) : null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="flex flex-col gap-0 overflow-hidden">{content}</DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 overflow-hidden p-0">{content}</DialogContent>
    </Dialog>
  );
}

function BhavaDetailBody({
  variant,
  house,
  houses,
  reference,
  onClose,
}: {
  variant: "dialog" | "drawer";
  house: BhavaHouse;
  houses: BhavaHouse[];
  reference: BhavaReferencePayload;
  onClose: () => void;
}) {
  const d = useBhavaDetail({ house, houses, reference });
  const { header, summary, lord, drishti, rules, tab } = d;
  const verdictCls =
    summary.health.tone === "attention"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";

  const HeaderWrap = variant === "drawer" ? DrawerHeader : DialogHeader;
  const TitleWrap = variant === "drawer" ? DrawerTitle : DialogTitle;

  return (
    <>
      <HeaderWrap className={cn(kundaliDetailClasses.bhavaDialog.header, "text-left")}>
        <TitleWrap className="flex items-center gap-2 text-lg">
          <span className={cn(kundaliDetailClasses.bhavaDialog.headerBadge, kundaliDetailClasses.bhavaDialog.headerBadgeText, "flex")}>
            {header.number}
          </span>
          {header.title}
          {header.classicalName && (
            <span className={kundaliDetailClasses.prose.quiet}>· {header.classicalName}</span>
          )}
        </TitleWrap>
        <p className={kundaliDetailClasses.prose.muted}>{header.themes}</p>
      </HeaderWrap>

      {/* One group on screen at a time instead of one long stacked list. */}
      <div className={cn(kundaliDetailClasses.bhavaDialog.tabBar, "flex shrink-0 gap-1 overflow-x-auto px-3 py-2")}>
        {d.tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => d.setTab(t.id)}
            className={cn(
              kundaliDetailClasses.bhavaDialog.tab,
              kundaliDetailClasses.bhavaDialog.tabText,
              "whitespace-nowrap transition-colors",
              tab === t.id
                ? cn(kundaliDetailClasses.bhavaDialog.tabActive, kundaliDetailClasses.bhavaDialog.tabActiveText)
                : cn(kundaliDetailClasses.bhavaDialog.tabIdle, kundaliDetailClasses.bhavaDialog.tabIdleText, "hover:text-foreground"),
            )}
          >
            <span aria-hidden className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {tab === "summary" && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Block icon="🪐" title={summary.occupantsTitle} right={summary.occupantsRight ?? undefined}>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                  <span>
                    <span className={kundaliDetailClasses.prose.strong}>{summary.sign}</span> {summary.signLabel}
                  </span>
                  <span className="text-border">·</span>
                  <span>
                    {summary.lordLabel} <span className={kundaliDetailClasses.prose.accent}>{summary.lord}</span>
                  </span>
                  {summary.badge && (
                    <>
                      <span className="text-border">·</span>
                      <span className="text-muted-foreground">{summary.badge}</span>
                    </>
                  )}
                </div>
                {summary.occupants.length > 0 ? (
                  <div className="space-y-1.5">
                    {summary.occupants.map((p) => (
                      <div key={p.key}>
                        <p className={kundaliDetailClasses.prose.heading}>{p.name}</p>
                        {p.subjects && <p className={kundaliDetailClasses.prose.muted}>{p.subjects}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={kundaliDetailClasses.prose.bodyMuted}>{summary.noOccupants}</p>
                )}
              </Block>

              <Block
                icon="🩺"
                title={summary.health.title}
                right={
                  <span className={cn(kundaliDetailClasses.bhavaDialog.pillInline, "inline-flex text-sm font-semibold leading-none", verdictCls)}>
                    {summary.health.verdict}
                  </span>
                }
              >
                <p className={kundaliDetailClasses.prose.body}>
                  <span className={kundaliDetailClasses.prose.strong}>{summary.health.partsLabel}</span> {summary.health.parts}
                </p>
                {summary.health.bodyPart && <p className={kundaliDetailClasses.prose.mutedMt1}>{summary.health.bodyPart}</p>}
                {summary.health.quiet && <p className={kundaliDetailClasses.prose.mutedMt1}>{summary.health.quiet}</p>}
              </Block>
            </div>

            {summary.reference && (
              <Block icon="📖" title={summary.reference.title}>
                <p className={kundaliDetailClasses.prose.muted}>{summary.reference.titles}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span>
                    {summary.reference.naturalLabel}:{" "}
                    <span className={kundaliDetailClasses.prose.strong}>{summary.reference.natural}</span>
                  </span>
                </div>
                <p className={kundaliDetailClasses.prose.bodyMt2}>{summary.reference.description}</p>
                {/* The Kalapurusha (natural zodiac, Mesha lagna) sign/lord — not this native's own. */}
                <p className={kundaliDetailClasses.prose.mutedMt2}>{summary.reference.kalapurusha}</p>
                <div className="mt-2">
                  <ShlokaCard {...summary.reference.shloka} />
                </div>
                <p className={kundaliDetailClasses.prose.mutedMt2}>{summary.reference.effectNote}</p>
                <p className={kundaliDetailClasses.prose.bodyMt15}>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{summary.reference.benefic.label}</span>{" "}
                  {summary.reference.benefic.text}
                </p>
                <p className={kundaliDetailClasses.prose.bodyMt1}>
                  <span className="font-semibold text-destructive">{summary.reference.malefic.label}</span>{" "}
                  {summary.reference.malefic.text}
                </p>
              </Block>
            )}
          </div>
        )}

        {tab === "lord" && (
          <div className="space-y-3">
            <Block icon="🪐" title={lord.grahasTitle} right={lord.grahasCount ?? undefined}>
              {lord.karakatva.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {lord.karakatva.map((card) => (
                    <div key={card.key} className="py-3 first:pt-0 last:pb-0">
                      <GrahaKarakatvaCard card={card} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className={kundaliDetailClasses.prose.muted}>{lord.noGrahas}</p>
              )}
            </Block>

            {/* This house's real lord, where it sits, and the BPHS ch. 13 shloka for that pair. */}
            <Block icon="👑" title={lord.placementTitle} right={lord.placementRight ?? undefined}>
              {lord.placement ? (
                <p className={kundaliDetailClasses.prose.plain}>
                  <span className={kundaliDetailClasses.prose.strong}>{lord.placement.title}</span>{" "}
                  <span className={kundaliDetailClasses.prose.accent}>{lord.placement.lord}</span> → {lord.placement.where}
                </p>
              ) : (
                <p className={kundaliDetailClasses.prose.muted}>{lord.lordMissing}</p>
              )}
              {lord.bhavesh &&
                ("comingSoon" in lord.bhavesh ? (
                  <p className={kundaliDetailClasses.prose.mutedMt2}>🚧 {lord.bhavesh.comingSoon}</p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {lord.bhavesh.shloka && <ShlokaCard {...lord.bhavesh.shloka} />}
                    <p className={kundaliDetailClasses.prose.body}>{lord.bhavesh.text}</p>
                    <p className={kundaliDetailClasses.prose.muted}>{lord.bhavesh.source}</p>
                  </div>
                ))}
            </Block>

            {lord.yuti && (
              <Block icon="👥" title={lord.yuti.title}>
                <div className="space-y-3">
                  {lord.yuti.pair && (
                    <div className={kundaliDetailClasses.prose.quote}>
                      <p className={kundaliDetailClasses.prose.heading}>
                        {lord.yuti.pair.names}
                        {lord.yuti.pair.yoga && <span className={kundaliDetailClasses.prose.quiet}> ({lord.yuti.pair.yoga})</span>}
                      </p>
                      <p className={kundaliDetailClasses.prose.bodyMt1}>{lord.yuti.pair.text}</p>
                    </div>
                  )}
                  {lord.yuti.triples.map((entry) => (
                    <div key={entry.key} className={kundaliDetailClasses.prose.quote}>
                      <p className={kundaliDetailClasses.prose.heading}>{entry.names}</p>
                      <p className={kundaliDetailClasses.prose.bodyMt1}>{entry.text}</p>
                    </div>
                  ))}
                  {lord.yuti.generalRule && <p className={kundaliDetailClasses.prose.bodyMuted}>{lord.yuti.generalRule}</p>}
                  {lord.yuti.none && <p className={kundaliDetailClasses.prose.muted}>{lord.yuti.none}</p>}
                </div>
              </Block>
            )}
          </div>
        )}

        {tab === "drishti" && (
          <Block icon="👁️" title={drishti.title}>
            {drishti.outgoing.length > 0 ? (
              <div className="space-y-1.5">
                {drishti.outgoing.map((p) => (
                  <p key={p.key} className={kundaliDetailClasses.prose.plain}>
                    <span className={kundaliDetailClasses.prose.strong}>{p.name}</span>
                    {" → "}
                    {p.targets}
                  </p>
                ))}
              </div>
            ) : (
              <p className={kundaliDetailClasses.prose.muted}>{drishti.noOutgoing}</p>
            )}
            <div className={kundaliDetailClasses.prose.divider}>
              <p className={kundaliDetailClasses.prose.headingMb15}>{drishti.allTitle}</p>
              {drishti.incoming.length > 0 ? (
                <div className="space-y-2">
                  <p className={kundaliDetailClasses.prose.heading}>{drishti.incomingTitle}</p>
                  {drishti.incoming.map((g) => (
                    <div key={g.key}>
                      <p className={kundaliDetailClasses.prose.heading}>{g.name}</p>
                      {g.summary && <p className={kundaliDetailClasses.prose.bodyMutedMt05}>{g.summary}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={kundaliDetailClasses.prose.muted}>{drishti.noIncoming}</p>
              )}
            </div>
          </Block>
        )}

        {tab === "rules" && (
          <Block icon="📚" title={rules.title}>
            <Accordion type="multiple">
              <AccordionItem value="naadi">
                <AccordionTrigger className="text-sm hover:no-underline">
                  <span className="flex-1">{rules.sutrasTitle}</span>
                  <span className="text-muted-foreground">{rules.sutrasCount}</span>
                </AccordionTrigger>
                <AccordionContent>
                  {rules.sutras.length > 0 ? (
                    <div className="space-y-3">
                      {rules.sutras.map((s) => (
                        <div key={s.key} className={kundaliDetailClasses.prose.quote}>
                          <p className={kundaliDetailClasses.prose.heading}>{s.title}</p>
                          <p className={kundaliDetailClasses.prose.muted}>{s.category}</p>
                          <p className={kundaliDetailClasses.prose.bodyMt1}>{s.body}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={kundaliDetailClasses.prose.muted}>{rules.noSutras}</p>
                  )}
                  <p className={kundaliDetailClasses.prose.mutedMt2}>{rules.sutraSource}</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="lalkitab">
                <AccordionTrigger className="text-sm hover:no-underline">
                  <span className="flex-1">{rules.lalKitabTitle}</span>
                  <span className="text-muted-foreground">{rules.lalKitabCount}</span>
                </AccordionTrigger>
                <AccordionContent>
                  {rules.lalKitab.length > 0 ? (
                    <div className="space-y-3">
                      {rules.lalKitab.map((e) => (
                        <div key={e.key}>
                          <p className={kundaliDetailClasses.prose.heading}>{e.title}</p>
                          <p className={kundaliDetailClasses.prose.bodyMt05}>{e.text}</p>
                          {e.tip && <p className={kundaliDetailClasses.prose.bodyMutedMt1}>{e.tip}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={kundaliDetailClasses.prose.bodyMuted}>{rules.noLalKitab}</p>
                  )}
                  {rules.lalKitabYuti && (
                    <div className={kundaliDetailClasses.prose.quoteTop}>
                      <p className={kundaliDetailClasses.prose.heading}>{rules.lalKitabYuti.title}</p>
                      <p className={kundaliDetailClasses.prose.bodyMt1}>{rules.lalKitabYuti.text}</p>
                    </div>
                  )}
                  <p className={kundaliDetailClasses.prose.mutedMt2}>{rules.lalKitabSource}</p>
                  <Accordion type="single" collapsible className="mt-2">
                    <AccordionItem value="lalkitab-sustha-dustha" className="border-b-0">
                      <AccordionTrigger className="py-1.5 text-sm text-secondary hover:no-underline">
                        {rules.susthaTitle}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-1.5">
                          {rules.sustha.map((rule, i) => (
                            <p key={i} className={kundaliDetailClasses.prose.body}>{rule}</p>
                          ))}
                        </div>
                        <p className={kundaliDetailClasses.prose.mutedMt2}>{rules.susthaSource}</p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Block>
        )}
      </div>

      <div className={cn(kundaliDetailClasses.bhavaDialog.footer, "flex justify-end")}>
        <Button variant="outline" onClick={onClose}>
          {d.close}
        </Button>
      </div>
    </>
  );
}
