import { useNavigate } from "@tanstack/react-router";
import { Ellipsis, type LucideIcon } from "lucide-react";
import { PageHeader, PageShell } from "@/components/PageShell";
import { useLocale } from "@/i18n/locale";
import { LEARN_LIBRARY_BY_SLUG } from "@/lib/learn/learn-library";
import { NAV_ICONS, navEntryIcon } from "@/lib/nav-icons";
import { useRouteLoading } from "@/lib/route-loading";
import {
  SITEMAP_ELEMENT_IDS,
  SITEMAP_LEARN_SLUGS,
  SITEMAP_ROUTES,
  SITEMAP_SAIT_CATEGORIES,
  type SitemapRoute,
} from "@vedic-patro/features/common";
import { elementTitle } from "@vedic-patro/domain/panchanga/panchanga-i18n";
import { translateKey } from "@vedic-patro/domain/locale";
import { MobileNavMenu as MobileNavMenuView, type MobileNavItem, type MobileNavSection } from "@vedic-patro/ui/kit/shell";

const TILE_ICON = "shrink-0 text-danger dark:text-danger";

const GROUP_TITLE_KEY: Record<"main" | "panchanga" | "jyotish" | "tools", string> = {
  main: "ui.navigation.main",
  panchanga: "learn.diagrams.hierarchy_converge",
  jyotish: "nav.jyotish",
  tools: "ui.more.tools",
};

/** App paths that live at another address on the website. */
const WEB_PATH: Record<string, string> = { "/rashifal": "/jyotish/rashifal" };

const SPAN_IDS = new Set(["tithi", "nakshatra", "yoga", "karana", "chandra-rashi"]);

/** Every page in one place, as the app's More screen (Menu › Jyotish › More). */
export function More() {
  const { t, pick, lang } = useLocale();
  const navigate = useNavigate();
  useRouteLoading(false);

  const tile = (path: string, label: string, Icon: LucideIcon): MobileNavItem => ({
    key: path,
    label,
    icon: <Icon size={28} strokeWidth={1.75} className={TILE_ICON} aria-hidden />,
    onPress: () => void navigate({ to: path } as never),
  });
  const routeTile = (r: SitemapRoute) => tile(WEB_PATH[r.path] ?? r.path, pick(r.ne, r.en), NAV_ICONS[r.icon]);

  const sections: MobileNavSection[] = [
    ...(["main", "panchanga", "jyotish", "tools"] as const).map((group) => {
      const items = SITEMAP_ROUTES.filter((r) => r.group === group).map(routeTile);
      if (group === "tools") items.push(tile("/account", t("ui.common.account"), NAV_ICONS.user));
      return { id: group, title: t(GROUP_TITLE_KEY[group]), items };
    }),
    {
      id: "elements",
      title: t("ui.more.panchanga_elements"),
      items: SITEMAP_ELEMENT_IDS.map((id) =>
        tile(`/panchanga/element/${id}`, elementTitle(id, lang), navEntryIcon(SPAN_IDS.has(id) ? "spans" : "tables", id)),
      ),
    },
    {
      id: "sait",
      title: t("ui.more.ceremony_muhurta"),
      items: SITEMAP_SAIT_CATEGORIES.map((id) =>
        tile(id === "vivah" ? "/vivah-sait" : `/sait/${id}`, translateKey(`sait.categories.${id}`, lang), navEntryIcon("sait", id)),
      ),
    },
    {
      id: "learn",
      title: t("ui.more.learn_articles"),
      items: [
        tile("/learn/history", t("ui.more.history"), NAV_ICONS["calendar-clock"]),
        ...SITEMAP_LEARN_SLUGS.map((slug) => {
          const topic = LEARN_LIBRARY_BY_SLUG[slug];
          return tile(`/learn/${slug}`, topic ? pick(topic.title.ne, topic.title.en) : slug, topic?.icon ?? NAV_ICONS["book-open"]);
        }),
      ],
    },
  ].filter((s) => s.items.length > 0);

  return (
    <PageShell>
      <PageHeader icon={<Ellipsis className="size-7 text-secondary dark:text-primary" strokeWidth={1.8} />} title={t("ui.more.more")} />
      <MobileNavMenuView label={t("ui.more.more")} sections={sections} />
    </PageShell>
  );
}

export default More;
