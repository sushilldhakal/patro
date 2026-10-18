import type { ReactNode } from "react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { useElementDescription, useGrahaDescription, type AboutCard } from "@vedic-patro/features/graha";
import { cn } from "@vedic-patro/design-tokens/cn";
import { patroCard } from "@vedic-patro/design-tokens/classes/patro-classes";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";

export type GrahaBannerProps = {
  icon: ReactNode;
  title?: string;
  blurb?: string;
  titleKey?: string;
  blurbKey?: string;
};

export function GrahaBanner({ icon, title, blurb, titleKey, blurbKey }: GrahaBannerProps) {
  const { t } = useTranslation();
  const heading = title ?? (titleKey ? t(titleKey) : "");
  const text = blurb ?? (blurbKey ? t(blurbKey) : "");
  return (
    <header className={cn(patroCard, grahaClasses.banner, "bg-gradient-to-br from-secondary/10 via-card to-card dark:from-secondary/12")}>
      <div className={cn(grahaClasses.bannerRow, "flex")}>
        <div className={cn(grahaClasses.bannerIcon, "flex text-secondary ring-1 ring-secondary/20 [&_svg]:size-6")} aria-hidden>
          {icon}
        </div>
        <div className={grahaClasses.bannerText}>
          <h1 className={grahaClasses.bannerTitle}>{heading}</h1>
          <p className={grahaClasses.bannerBlurb}>{text}</p>
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
        {about.blocks.map((block) => (
          <div key={block.section} className={cn(grahaClasses.aboutBlock, "flex flex-col")}>
            <h3 className={grahaClasses.aboutBlockTitle}>{block.heading}</h3>
            <p className={grahaClasses.aboutBlockText}>{block.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function GrahaDescription({ pageId }: { pageId: string }) {
  return <AboutSection about={useGrahaDescription(pageId)} />;
}

export function ElementDescription({ elementId }: { elementId: string }) {
  return <AboutSection about={useElementDescription(elementId)} />;
}
