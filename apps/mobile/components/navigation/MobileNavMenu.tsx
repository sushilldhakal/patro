import { View } from "react-native";
import { usePathname } from "expo-router";
import { useLocale } from "@/lib/i18n";
import { isNavActive, normalizeMobilePathname } from "@/lib/mobile-nav";
import { DRAWER_MAIN_LINKS, getMobileDrawerSections, type DrawerNavItem } from "@/lib/mobile-drawer-nav";
import { DrawerNavSection, NavDrawerLinkCard } from "./NavDrawerLinkCard";

function itemActive(pathname: string, item: DrawerNavItem): boolean {
  pathname = normalizeMobilePathname(pathname);
  if (item.href === "/") return pathname === "/" || pathname === "/index";
  return isNavActive(pathname, item.href);
}

export function MobileNavMenu({
  onNavigate,
}: {
  onNavigate: (href: string) => void;
}) {
  const { pick } = useLocale();
  const pathname = usePathname();
  const sections = getMobileDrawerSections();

  const renderItem = (item: DrawerNavItem) => (
    <NavDrawerLinkCard
      key={item.id}
      label={pick(item.labelNe, item.labelEn)}
      icon={item.icon}
      active={itemActive(pathname, item)}
      onPress={() => onNavigate(item.href)}
    />
  );

  return (
    <View className="gap-1 pb-2 pt-2">
      <DrawerNavSection first title={pick("मुख्य", "Main")}>
        {DRAWER_MAIN_LINKS.map(renderItem)}
      </DrawerNavSection>
      {sections.map((section) => (
        <DrawerNavSection key={section.id} title={pick(section.titleNe, section.titleEn)}>
          {section.items.map(renderItem)}
        </DrawerNavSection>
      ))}
    </View>
  );
}
