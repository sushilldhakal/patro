import { FileText, Shield } from "lucide-react";
import { useLegalPage, type LegalKind } from "@vedic-patro/features/legal";
import { legalClasses } from "@vedic-patro/design-tokens/classes/legal-classes";
import { cn } from "@vedic-patro/domain/utils";
import { PageHeader, PageShell } from "@/components/PageShell";

/** Privacy / terms — the website's drawing of `useLegalPage` (@vedic-patro/features). */
function LegalPage({ kind }: { kind: LegalKind }) {
  const page = useLegalPage(kind);
  const Icon = kind === "privacy" ? Shield : FileText;
  return (
    <PageShell showRelatedLinks={false}>
      <PageHeader icon={<Icon className="h-6 w-6 text-secondary" />} title={page.title} subtitle={page.updated} />
      <div className={cn(legalClasses.wrap, legalClasses.text, "space-y-8")}>
        <p className={legalClasses.intro}>{page.intro}</p>
        {page.sections.map((section) => (
          <section key={section.key} className="space-y-3">
            <h2 className={legalClasses.heading}>{section.heading}</h2>
            {section.paragraphs.map((para) => (
              <p key={para.key} className={legalClasses.para}>
                {para.text}
              </p>
            ))}
          </section>
        ))}
      </div>
    </PageShell>
  );
}

export function Privacy() {
  return <LegalPage kind="privacy" />;
}

export function Terms() {
  return <LegalPage kind="terms" />;
}
