import type { ReactNode } from "react";
import { cn } from "@vedic-patro/design-tokens/cn";
import { grahaClasses } from "@vedic-patro/design-tokens/classes/graha-classes";
import { PageShell } from "@/components/PageShell";
import { GrahaDescription } from "@vedic-patro/ui/kit/panchanga";
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
  nav,
  descriptionPageId,
  beforeDescription,
  backLinkLabelKey,
  children,
}: GrahaDetailPageFrameProps) {
  return (
    <PageShell>
      {/* The page starts at the year header, like every dated page: no banner above it. */}

      {nav ? <div className={cn(grahaClasses.navStack, "flex flex-col")}>{nav}</div> : null}

      {children}

      {beforeDescription}

      {descriptionPageId ? <GrahaDescription pageId={descriptionPageId} /> : null}

      <PanchangaDetailsBackLink labelKey={backLinkLabelKey} />
    </PageShell>
  );
}
