import { View } from "react-native";
import { resolveNavIcon } from "@vedic-patro/icons";
import { usePanchangaDirectory, type DirectoryLink } from "@vedic-patro/features/panchanga-details";
import { QuickLinkSection, type QuickLink } from "@/components/home/QuickLinkTile";
import { elementHref } from "@/lib/element-routes";

function href(link: DirectoryLink): string {
  if (link.kind === "element") return elementHref(link.id);
  if (link.kind === "graha") return link.path;
  return link.id === "vivah" ? "/vivah-sait" : `/sait/${link.id}`;
}

/** Categorised link grid — draws `usePanchangaDirectory` (@vedic-patro/features), as the website does. */
export function PanchangaDirectoryMobile() {
  const sections = usePanchangaDirectory();
  return (
    <View className="gap-8 pb-6">
      {sections.map((section) => (
        <QuickLinkSection
          key={section.id}
          title={section.title}
          links={section.links.map((link): QuickLink => ({ href: href(link), label: link.label, description: link.description, icon: resolveNavIcon(link.kind === "sait" ? "sait" : "graha", link.id) }))}
        />
      ))}
    </View>
  );
}
