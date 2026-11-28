import { View } from "react-native";
import { AppShell } from "@/components/AppShell";
import { RituSeasons } from "@/components/RituSeasons";
import { PageBackBar } from "@/components/navigation/PageBackBar";
import { PatroHeaderLocation } from "@/components/patro-date/PatroHeaderLocation";
import { requestLocationPicker } from "@/lib/menu-request";
import { usePanchangaLocation } from "@/lib/use-panchanga-location";
import { useRituScreen } from "@vedic-patro/features/ritu";

export default function RituScreen() {
  const { location, setLocation } = usePanchangaLocation();
  const ritu = useRituScreen(location);

  return (
    <AppShell title="" showHeader={false}>
      <PageBackBar title={ritu.title} subtitle={ritu.subtitle} fallback="/" />

      {/* The seasons follow the place (hemisphere, latitude): pick it right here. */}
      <PatroHeaderLocation
        className="mb-4 self-start"
        location={location}
        onLocationChange={setLocation}
        open={false}
        onOpenChange={(next) => {
          if (next) requestLocationPicker();
        }}
      />
      <View className="mb-8">
        <RituSeasons location={location} />
      </View>
    </AppShell>
  );
}
