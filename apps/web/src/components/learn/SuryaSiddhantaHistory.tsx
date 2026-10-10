/**
 * The Surya Siddhanta history, as a chapter body.
 *
 * This used to be its own page at `/learn/history`. It now runs as the closing
 * chapter of the calendar-comparison guide, so everything that belonged to a
 * standalone page — the shell, the back link, the hero — is gone; the chapter
 * heading above it does that job. What remains is the material itself: the
 * milestones, the era note the dates need to be read with, the sections, and
 * the source attribution.
 *
 * The transcript itself stays Nepali, unlike the bilingual articles around it —
 * it is the wording of a Nepali documentary, not a translated explainer. The
 * chrome around it (lede, contents, era note, attribution) is translated, so an
 * English reader is at least told what they are looking at.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, History as HistoryIcon, ScrollText, Video } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  tmFcard,
  tmLede,
  tmSecHead,
  tmSecKicker,
  tmSecTitle,
  tmSection,
} from "@/lib/learn-classes";
import { cn } from "@/lib/utils";
import {
  HISTORY_ERA_NOTE,
  HISTORY_MILESTONES,
  HISTORY_SOURCE,
  SURYA_SIDDHANTA_HISTORY,
  type HistorySection,
} from "@/lib/history/surya-siddhanta-history";
import { formatBbse } from "@/lib/history/era-dates";
import { getCurrentBs } from "@/lib/bs-calendar";
import { useLocaleDigits } from "@/i18n/digits";

function SectionBody({ section }: { section: HistorySection }) {
  return (
    <div className="flex flex-col gap-4">
      {section.paragraphs.map((paragraph, i) => (
        <p key={i} className={cn(tmLede, "m-0")}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function SectionBlock({ section }: { section: HistorySection }) {
  return (
    <section id={section.id} className={cn(tmSection, "scroll-mt-24")}>
      <div className={tmSecHead}>
        <span className={tmSecKicker}>{section.kicker}</span>
        <h3 className={tmSecTitle}>{section.title}</h3>
      </div>
      <SectionBody section={section} />
    </section>
  );
}

export function SuryaSiddhantaHistory() {
  const { t } = useTranslation();
  const digits = useLocaleDigits();
  const [activeId, setActiveId] = useState(SURYA_SIDDHANTA_HISTORY[0]?.id ?? "");
  const currentBsYear = getCurrentBs().year;

  useEffect(() => {
    const sections = SURYA_SIDDHANTA_HISTORY.map((s) => document.getElementById(s.id)).filter(
      Boolean,
    ) as HTMLElement[];

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5] },
    );

    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <p className={tmLede}>{t("learn.study.history.lede", { epoch: formatBbse(6778) })}</p>

      <a
        href={HISTORY_SOURCE.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-sm text-foreground transition-colors hover:border-secondary/50 hover:bg-secondary/5"
      >
        <Video className="size-4 text-destructive" />
        {HISTORY_SOURCE.title}
        <ExternalLink className="size-3.5" />
      </a>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {HISTORY_MILESTONES.map((m) => (
          <div key={m.label} className={cn(tmFcard, "text-center")}>
            <div className="big">{m.year}</div>
            <div className="lbl">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2 rounded-xl border border-border bg-card/50 px-4 py-3 text-sm sm:flex-row sm:gap-6">
        <p className="m-0">
          <span className="font-semibold text-foreground">{t("learn.study.history.era_bbse")}</span>
          {" — "}
          {HISTORY_ERA_NOTE.bbse}
        </p>
        <p className="m-0">
          <span className="font-semibold text-foreground">{t("learn.study.history.era_bs")}</span>
          {" — "}
          {HISTORY_ERA_NOTE.bs} {t("learn.study.history.era_bs_today", { year: digits(currentBsYear) })}
        </p>
      </div>

      <div className="mt-10 hidden lg:grid lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)] lg:gap-12">
        <nav
          className="sticky top-20 self-start rounded-xl border border-border bg-card/60 p-3 backdrop-blur-sm"
          aria-label={t("learn.study.history.toc_aria")}
        >
          <p className="mb-2 px-2 text-sm font-semibold uppercase tracking-wider">
            {t("learn.study.history.toc_title")}
          </p>
          <ul className="flex flex-col gap-0.5">
            {SURYA_SIDDHANTA_HISTORY.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={cn(
                    "block rounded-lg px-2.5 py-2 text-sm leading-snug transition-colors",
                    activeId === section.id
                      ? "bg-secondary/10 text-secondary"
                      : "hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="mr-1.5 font-mono text-xs opacity-70">{section.kicker}</span>
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          {SURYA_SIDDHANTA_HISTORY.map((section) => (
            <SectionBlock key={section.id} section={section} />
          ))}
        </div>
      </div>

      <div className="mt-8 lg:hidden">
        <div className="mb-4 flex items-center gap-2 text-secondary">
          <ScrollText className="size-4" />
          <h3 className="text-sm font-semibold text-foreground">
            {t("learn.study.history.topics")}
          </h3>
        </div>
        <Accordion
          type="single"
          collapsible
          defaultValue={SURYA_SIDDHANTA_HISTORY[0]?.id}
          className="rounded-xl border border-border bg-card/40 px-3"
        >
          {SURYA_SIDDHANTA_HISTORY.map((section) => (
            <AccordionItem key={section.id} value={section.id} className="border-border">
              <AccordionTrigger className="py-3 text-left hover:no-underline">
                <span className="flex flex-col gap-0.5 pr-2">
                  <span className="font-mono text-xs">{section.kicker}</span>
                  <span className="text-base font-semibold text-foreground">{section.title}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <SectionBody section={section} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <div className={cn(tmSection, "mt-12 rounded-xl border border-border bg-card/50 p-6 text-center")}>
        <HistoryIcon className="mx-auto size-8 text-secondary" />
        <p className={cn(tmLede, "mx-auto mt-4 max-w-xl text-center")}>
          {t("learn.study.history.transcript_lead")}{" "}
          <a
            href={HISTORY_SOURCE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary underline-offset-2 hover:underline"
          >
            {t("learn.study.history.transcript_link")}
          </a>
          {t("learn.study.history.transcript_rest")}
        </p>
      </div>
    </>
  );
}

export default SuryaSiddhantaHistory;
