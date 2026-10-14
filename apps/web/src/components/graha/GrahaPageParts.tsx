import { useTranslation } from "@vedic-patro/i18n/react";
import { useElementDescription, useGrahaDescription, type AboutCard } from "@vedic-patro/features/graha";
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

function AboutSection({ about }: { about: AboutCard | null }) {
  if (!about) return null;
  return (
    <section className={cn(patroCard, grahaClasses.aboutCard)} aria-label={about.title}>
      <h2 className={grahaClasses.aboutTitle}>{about.title}</h2>
      <div className={cn(grahaClasses.aboutBody, "flex flex-col")}>
        {about.blocks.map((b) => (
          <div key={b.section} className={cn(grahaClasses.aboutBlock, "flex flex-col")}>
            <h3 className={grahaClasses.aboutBlockTitle}>{b.heading}</h3>
            <p className={grahaClasses.aboutBlockText}>{b.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** "About" block — what it is · how it's calculated · what it means. */
export function GrahaDescription({ pageId }: { pageId: string }) {
  return <AboutSection about={useGrahaDescription(pageId)} />;
}

/** Element page "About" block — descriptions from i18n JSON. */
export function ElementDescription({ elementId }: { elementId: string }) {
  return <AboutSection about={useElementDescription(elementId)} />;
}
