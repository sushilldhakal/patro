import type { ReactNode } from "react";
import { cn } from "@vedic-patro/domain/utils";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";
import { PageShell } from "@/components/PageShell";
import { GrahaBanner, GrahaDescription } from "@/components/graha/GrahaPageParts";
import { PanchangaDetailsBackLink } from "@/components/panchanga/PanchangaDetailsBackLink";

type GrahaDetailPageFrameProps = {
  banner: {
    icon: ReactNode;
    titleKey: string;
    blurbKey: string;
  };
  nav?: ReactNode;
  descriptionPageId?: string;
  beforeDescription?: ReactNode;
  backLinkLabelKey?: string;
  children: ReactNode;
};

export function GrahaDetailPageFrame({
  banner,
  nav,
  descriptionPageId,
  beforeDescription,
  backLinkLabelKey,
  children,
}: GrahaDetailPageFrameProps) {
  return (
    <PageShell>
      <GrahaBanner
        icon={banner.icon}
        titleKey={banner.titleKey}
        blurbKey={banner.blurbKey}
      />

      {nav ? <div className={cn(grahaClasses.navStack, "flex flex-col")}>{nav}</div> : null}

      {children}

      {beforeDescription}

      {descriptionPageId ? <GrahaDescription pageId={descriptionPageId} /> : null}

      <PanchangaDetailsBackLink labelKey={backLinkLabelKey} />
    </PageShell>
  );
}
