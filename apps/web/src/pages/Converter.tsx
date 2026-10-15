import { ArrowLeftRight, ArrowRight } from "lucide-react";
import { useConverterPage } from "@vedic-patro/features/converter";
import { PageShell, PageHeader } from "../components/PageShell";
import { SeoContentSection } from "../components/seo/SeoContentSection";
import { useRouteLoading } from "@/lib/route-loading";
import { StatCard } from "../components/StatCard";
import { cn } from "@vedic-patro/domain/utils";
import { converterClasses } from "@vedic-patro/design-tokens/classes/converter-classes";

/**
 * Date converter — the website's drawing of `useConverterPage`
 * (@vedic-patro/features). Inputs, conversion, result cards and copy are
 * shared with the app; this file only lays them out.
 */
export function Converter() {
  const page = useConverterPage();
  useRouteLoading(page.status === "loading");

  return (
    <PageShell>
      <PageHeader
        icon={<ArrowLeftRight className="w-6 h-6 text-secondary" />}
        title={page.copy.title}
        subtitle={page.copy.subtitle}
      />

      <div className={cn("flex w-fit", converterClasses.modeToggle)}>
        {page.modes.map((m) => (
          <button
            key={m.id}
            onClick={() => page.setMode(m.id)}
            className={cn(
              "flex transition-colors",
              converterClasses.modeButton,
              converterClasses.modeLabel,
              m.active
                ? cn(converterClasses.modeButtonActive, converterClasses.modeLabelActive)
                : cn(converterClasses.modeLabelIdle, "hover:bg-muted"),
            )}
          >
            {m.from} <ArrowRight className="w-3.5 h-3.5" /> {m.to}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          page.submit();
        }}
        className={cn("flex flex-wrap", converterClasses.form)}
      >
        <div className={cn("flex flex-col", converterClasses.field)}>
          <label className={converterClasses.label}>{page.copy.inputLabel}</label>
          <input
            type={page.mode === "ad-to-bs" ? "date" : "text"}
            value={page.input}
            onChange={(e) => page.setInput(e.target.value)}
            placeholder={page.copy.placeholder}
            className={cn(converterClasses.input, "focus:outline-none focus:ring-2 focus:ring-primary/40")}
          />
        </div>
        <button
          type="submit"
          className={cn(converterClasses.submit, converterClasses.submitLabel, "hover:bg-secondary/90 transition-colors")}
        >
          {page.copy.convert}
        </button>
      </form>

      {page.status === "error" && (
        <div className={cn(converterClasses.errorBox, converterClasses.errorText)}>{page.copy.error}</div>
      )}

      {page.result && (
        <div className="space-y-4">
          <div className={cn("flex", converterClasses.resultRow, converterClasses.resultText)}>
            <span className={converterClasses.resultValue}>{page.result.from}</span>
            <ArrowRight className="w-5 h-5" />
            <span className={converterClasses.resultValue}>{page.result.to}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {page.result.cards.map((card) => (
              <StatCard key={card.labelKey} label={card.label} value={card.value} highlight={card.highlight} />
            ))}
          </div>
        </div>
      )}

      <SeoContentSection route="converter" />
    </PageShell>
  );
}
