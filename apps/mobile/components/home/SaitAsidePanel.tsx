import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import type { LocationParams } from "@/lib/api";
import { SaitAsidePanel as Shared } from "@vedic-patro/ui/kit/jyotish";

type Props = {
  year: number;
  month: number;
  highlightDay?: number;
  location?: LocationParams;
};

/** Home aside. The row opens the ceremony; the list itself is shared. */
export function SaitAsidePanel({ year, month, highlightDay, location }: Props) {
  const router = useRouter();
  return (
    <Shared
      year={year}
      month={month}
      highlightDay={highlightDay}
      location={location}
      renderLink={({ id, className, children }) => (
        <Pressable
          onPress={() => router.push({ pathname: "/sait/[category]", params: { category: id } } as never)}
          accessibilityRole="link"
          className={className}
        >
          {children}
        </Pressable>
      )}
    />
  );
}
