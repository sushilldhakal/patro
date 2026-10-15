import { useNavigate } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import type { LearnIconKey } from "@vedic-patro/domain/learn/learn-library";
import { LearnMoreCard as LearnMoreCardView } from "@vedic-patro/ui/kit/learn";
import { LEARN_ICONS } from "@/lib/learn/learn-library";

/** Binds the shared card to the website's icons and router. */
export function LearnMoreCard({ slugs, heading, className }: { slugs: string[]; heading?: string; className?: string }) {
  const navigate = useNavigate();
  return (
    <LearnMoreCardView
      slugs={slugs}
      heading={heading}
      className={className}
      headingIcon={<BookOpen className="size-4" />}
      renderIcon={(icon: LearnIconKey) => {
        const Icon = LEARN_ICONS[icon];
        return <Icon className="size-4" />;
      }}
      hrefFor={(slug) => `/learn/${slug}`}
      onOpen={(slug) => navigate({ to: "/learn/$slug", params: { slug } })}
    />
  );
}

export default LearnMoreCard;
