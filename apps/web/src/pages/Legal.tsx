import { FileText, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader, PageShell } from "@/components/PageShell";
import { useLocale } from "@/i18n/locale";
import {
  LEGAL_UPDATED,
  PRIVACY_INTRO,
  PRIVACY_SECTIONS,
  TERMS_INTRO,
  TERMS_SECTIONS,
  type LegalSection,
} from "@vedic-patro/domain/legal-copy";

function LegalBody({ intro, sections }: { intro: { ne: string; en: string }; sections: LegalSection[] }) {
  const { lang } = useLocale();
  const pick = (v: { ne: string; en: string }) => (lang === "en" ? v.en : v.ne);
  return (
    <div className="mx-auto max-w-2xl space-y-8 text-base leading-relaxed">
      <p className="text-foreground">{pick(intro)}</p>
      {sections.map((section) => (
        <section key={section.heading.en} className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">{pick(section.heading)}</h2>
          {section.body.map((para) => (
            <p key={para.en} className="text-muted-foreground">
              {pick(para)}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}

export function Privacy() {
  const { t } = useTranslation();
  return (
    <PageShell showRelatedLinks={false}>
      <PageHeader
        icon={<Shield className="h-6 w-6 text-secondary" />}
        title={t("legal.privacy_title")}
        subtitle={t("legal.updated", { date: LEGAL_UPDATED })}
      />
      <LegalBody intro={PRIVACY_INTRO} sections={PRIVACY_SECTIONS} />
    </PageShell>
  );
}

export function Terms() {
  const { t } = useTranslation();
  return (
    <PageShell showRelatedLinks={false}>
      <PageHeader
        icon={<FileText className="h-6 w-6 text-secondary" />}
        title={t("legal.terms_title")}
        subtitle={t("legal.updated", { date: LEGAL_UPDATED })}
      />
      <LegalBody intro={TERMS_INTRO} sections={TERMS_SECTIONS} />
    </PageShell>
  );
}
