import { View } from "react-native";
import { QuickLinkSection, type QuickLink } from "@/components/home/QuickLinkTile";
import { CEREMONY_META, ELEMENT_META } from "@vedic-patro/domain/panchanga-elements";
import { elementHref } from "@/lib/element-routes";
import { useLocale } from "@/lib/i18n";

const GRAHA_PAGES: { href: string; key: string; icon: QuickLink["icon"] }[] = [
  { href: "/gochar", key: "gochar", icon: "route" },
  { href: "/panchanga/graha-asta", key: "graha-asta", icon: "sunrise" },
  { href: "/panchanga/graha-vakri", key: "graha-vakri", icon: "rotate-ccw" },
  { href: "/panchanga/chandra-grahan", key: "chandra-grahan", icon: "moon-star" },
  { href: "/panchanga/surya-grahan", key: "surya-grahan", icon: "eclipse" },
];

/** Categorised link grid — web `PanchangaDirectory`: transition elements → planets → daily tables → sait. */
export function PanchangaDirectoryMobile() {
  const { t, pick } = useLocale();

  const spans: QuickLink[] = ELEMENT_META.filter((e) => e.kind === "span").map((e) => ({
    href: elementHref(e.id),
    label: t(`panchanga_elements.${e.id}.title`),
    description: t(`panchanga_elements.${e.id}.blurb`),
    icon: "moon-star",
  }));
  const graha: QuickLink[] = GRAHA_PAGES.map((g) => ({
    href: g.href,
    label: t(`sidebar_nav.items.${g.key}.label`),
    description: t(`sidebar_nav.items.${g.key}.blurb`),
    icon: g.icon,
  }));
  const tables: QuickLink[] = ELEMENT_META.filter((e) => e.kind === "table").map((e) => ({
    href: elementHref(e.id),
    label: t(`panchanga_elements.${e.id}.title`),
    description: t(`panchanga_elements.${e.id}.blurb`),
    icon: "calendar-clock",
  }));
  const sait: QuickLink[] = CEREMONY_META.map((c) => ({
    href: c.id === "vivah" ? "/vivah-sait" : `/sait/${c.id}`,
    label: t(`sait.categories.${c.id}`),
    description: t("sidebar_nav.items.sait_moment.blurb"),
    icon: "heart-handshake",
  }));

  return (
    <View className="gap-8 pb-6">
      <QuickLinkSection title={t("sidebar_nav.sections.spans.title")} links={spans} />
      <QuickLinkSection title={t("sidebar_nav.sections.graha.title")} links={graha} />
      <QuickLinkSection title={t("sidebar_nav.sections.tables.title")} links={tables} />
      <QuickLinkSection title={t("sidebar_nav.sections.sait.title")} links={sait} />
    </View>
  );
}
