import { useRouter } from "expo-router";
import { Ionicons } from "@/components/icons/Ionicons";
import type { LearnIconKey } from "@vedic-patro/domain/learn/learn-library";
import { LearnMoreCard as LearnMoreCardView } from "@vedic-patro/ui/kit/learn";
import { LEARN_ICONS } from "@/lib/learn/learn-library";
import { hrefForLearnSlug } from "@/lib/learn/learn-href";
import { useThemeColors } from "@/lib/theme-context";

/** Binds the shared card to the app's icons and router. */
export function LearnMoreCard({ slugs, heading, className }: { slugs: string[]; heading?: string; className?: string }) {
  const router = useRouter();
  const colors = useThemeColors();
  return (
    <LearnMoreCardView
      slugs={slugs}
      heading={heading}
      className={className}
      headingIcon={<Ionicons name="book-outline" size={16} color={colors.secondary} />}
      renderIcon={(icon: LearnIconKey) => <Ionicons name={LEARN_ICONS[icon]} size={16} color={colors.secondary} />}
      hrefFor={(slug) => String(hrefForLearnSlug(slug))}
      onOpen={(slug) => router.push(hrefForLearnSlug(slug))}
    />
  );
}
