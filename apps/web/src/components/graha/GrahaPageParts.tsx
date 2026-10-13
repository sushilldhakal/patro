import { useTranslation } from "@vedic-patro/i18n/react";
import { useLocale, bilingualText } from "@/i18n/locale";
import {
  GRAHA_PAGE_DESCRIPTIONS,
  type GrahaPageDescription,
} from "@vedic-patro/domain/graha-detail-descriptions";
import { elementDescriptionBlocks } from "@vedic-patro/domain/panchanga-i18n";
import { patroCard } from "@/lib/patro-classes";
import { cn } from "@vedic-patro/domain/utils";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";

export function GrahaBanner({
  icon,
  titleKey,
  blurbKey,
}: {
  icon: React.ReactNode;
  titleKey: string;
  blurbKey: string;
}) {
  const { t } = useTranslation();
  return (
    <header
      className={cn(
        patroCard,
        grahaClasses.banner,
        "bg-gradient-to-br from-secondary/10 via-card to-card dark:from-secondary/12",
      )}
    >
      <div className={cn(grahaClasses.bannerRow, "flex")}>
        <div
          className={cn(
            grahaClasses.bannerIcon,
            "flex text-secondary ring-1 ring-secondary/20 [&_svg]:size-6",
          )}
          aria-hidden
        >
          {icon}
        </div>
        <div className={grahaClasses.bannerText}>
          <h1 className={grahaClasses.bannerTitle}>
            {t(titleKey)}
          </h1>
          <p className={grahaClasses.bannerBlurb}>{t(blurbKey)}</p>
        </div>
      </div>
    </header>
  );
}

/** "About" block — what it is · how it's calculated · what it means. */
export function GrahaDescription({ pageId }: { pageId: string }) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const desc: GrahaPageDescription | undefined = GRAHA_PAGE_DESCRIPTIONS[pageId];
  if (!desc) return null;

  const blocks = [
    { section: "what" as const, body: desc.what },
    { section: "how" as const, body: desc.how },
    { section: "meaning" as const, body: desc.meaning },
  ];

  return (
    <section className={cn(patroCard, grahaClasses.aboutCard)} aria-label={t("common.about")}>
      <h2 className={grahaClasses.aboutTitle}>
        {t("common.about")}
      </h2>
      <div className={cn(grahaClasses.aboutBody, "flex flex-col")}>
        {blocks.map((b) => (
          <div key={b.section} className={cn(grahaClasses.aboutBlock, "flex flex-col")}>
            <h3 className={grahaClasses.aboutBlockTitle}>
              {t(`element_page.section_${b.section}`)}
            </h3>
            <p className={grahaClasses.aboutBlockText}>
              {bilingualText(lang, b.body.ne, b.body.en)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Element page "About" block — descriptions from i18n JSON. */
export function ElementDescription({ elementId }: { elementId: string }) {
  const { t, i18n } = useTranslation();
  const blocks = elementDescriptionBlocks(elementId, i18n.language);

  if (!blocks.some((b) => b.body)) return null;

  return (
    <section className={cn(patroCard, grahaClasses.aboutCard)} aria-label={t("common.about")}>
      <h2 className={grahaClasses.aboutTitle}>
        {t("common.about")}
      </h2>
      <div className={cn(grahaClasses.aboutBody, "flex flex-col")}>
        {blocks.map((b) => (
          <div key={b.section} className={cn(grahaClasses.aboutBlock, "flex flex-col")}>
            <h3 className={grahaClasses.aboutBlockTitle}>
              {t(`element_page.section_${b.section}`)}
            </h3>
            <p className={grahaClasses.aboutBlockText}>{b.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
