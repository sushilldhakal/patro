import { cn } from "@vedic-patro/domain/utils";
import { Box, Icon, Text } from "@vedic-patro/ui";
import { panchangaPageClasses as pg } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { chevronDownIcon } from "../icons";
import type { PanchangaSidebarSectionView } from "../sidebar-types";

export type { PanchangaSidebarItemView, PanchangaSidebarLinkArgs, PanchangaSidebarSectionView } from "../sidebar-types";

const s = pg.sidebar;

export function PanchangaSidebarNav({
  title,
  label,
  sections,
  className,
}: {
  title: string;
  label: string;
  sections: PanchangaSidebarSectionView[];
  className?: string;
}) {
  return (
    <Box
      as="nav"
      label={label}
      className={cn(s.nav, "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)]", className)}
    >
      <Text as="p" className={s.navTitle}>
        {title}
      </Text>
      <Box className={cn("flex max-h-[calc(100vh-6.5rem)] flex-col overflow-y-auto", s.navBody)}>
        {sections.map((section) => (
          <Box as="section" key={section.id} className={s.section}>
            <button
              type="button"
              onClick={section.onToggle}
              aria-expanded={section.expanded}
              className={cn(
                "flex text-left transition-colors",
                s.sectionHead,
                section.expanded || section.hasActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                section.hasActive && !section.expanded && "bg-secondary/6 text-secondary",
              )}
            >
              <Icon
                node={chevronDownIcon}
                size={16}
                tone={section.hasActive ? "secondary" : "muted"}
                className={cn("transition-transform duration-200", section.expanded ? "rotate-0" : "-rotate-90")}
              />
              <Text as="span" className={s.sectionTitle}>
                {section.title}
              </Text>
            </button>
            {section.items.length > 0 ? (
              <Box as="ul" className={cn("flex flex-col", s.list)}>
                {section.items.map((item) => {
                  const className = cn("block text-left transition-colors", s.link, item.active ? s.linkOn : s.linkOff);
                  const body = (
                    <>
                      <Text as="span" className={cn("block font-medium", s.linkLabel)}>
                        {item.label}
                      </Text>
                      {item.blurb ? (
                        <Text as="span" className={cn("block", s.linkBlurb)}>
                          {item.blurb}
                        </Text>
                      ) : null}
                    </>
                  );
                  return (
                    <Box as="li" key={item.id} className={cn("flex flex-col", s.item)}>
                      {item.renderLink ? (
                        item.renderLink({ className, onPrefetch: item.onPrefetch, children: body })
                      ) : (
                        <button type="button" onClick={item.onPress} className={className} aria-current={item.active ? "page" : undefined}>
                          {body}
                        </button>
                      )}
                      {item.trailing}
                    </Box>
                  );
                })}
              </Box>
            ) : null}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
