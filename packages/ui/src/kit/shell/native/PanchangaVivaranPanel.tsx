import { cn } from "@vedic-patro/domain/utils";
import { homeClasses as home } from "@vedic-patro/design-tokens/classes/home-classes";
import { patroAyanaNorth, patroAyanaSouth } from "@vedic-patro/design-tokens/classes/patro-classes";
import { usePanchangaVivaran, type VivaranCell } from "@vedic-patro/features/home";
import { Grid, Box, Button, Text } from "@vedic-patro/ui";
import type { PanchangaVivaranPanelProps } from "../contract";

function Cell({ label, value, hint, mono, ayana }: VivaranCell) {
  return (
    <Box className={cn(home.vivaranTile, "shadow-ring-soft")}>
      <Text className={home.vivaranLabel}>{label}</Text>
      <Text className={cn(home.vivaranValue, mono && home.vivaranValueMono)}>
        {value ?? "—"}
        {ayana ? <Text className={cn(ayana.north ? patroAyanaNorth : patroAyanaSouth, "mb-0 ml-1.5")}>{ayana.mark}</Text> : null}
      </Text>
      {hint ? <Text className={cn(home.vivaranHint, "break-words")}>{hint}</Text> : null}
    </Box>
  );
}

/** Panchanga detail tiles, planets and abhijit. Status badges and the detail route come from the app. */
export function PanchangaVivaranPanel({ p, selectedDay, loading, renderPlanetStatus, onOpenDetail, className }: PanchangaVivaranPanelProps) {
  const view = usePanchangaVivaran({ p, selectedDay });
  if (loading || !p || !view) {
    return (
      <Box className={cn("rounded-lg bg-card shadow-ring-soft", className)}>
        <Grid cols={2} gap={8} className={home.vivaranCells}>
          {Array.from({ length: 6 }, (_, i) => (
            <Box key={i} className={cn(home.vivaranTile, "shadow-ring-soft")}>
              <Text className={home.vivaranLabel}>…</Text>
              <Box className="mt-1.5 h-[18px] animate-pulse rounded-full bg-muted-foreground/20" />
            </Box>
          ))}
        </Grid>
        <Box className="mt-2.5 h-[120px] animate-pulse rounded-md bg-muted" />
      </Box>
    );
  }

  return (
    <Box className={cn("min-h-full rounded-lg bg-card", className)}>
      <Grid cols={2} gap={8} className={home.vivaranCells}>
        {view.cells.map((cell) => (
          <Cell key={cell.label} {...cell} />
        ))}
      </Grid>
      {view.planets.length > 0 ? (
        <Box className={home.gocharSection}>
          <Text className={home.gocharTitle}>{view.gocharTitle}</Text>
          <Grid cols={{ base: 2, sm: 3 }} gap={6}>
            {view.planets.map((planet) => (
              <Box key={planet.key} className={cn("flex-col", home.vivaranTile, home.gocharTile, "shadow-ring-soft")}>
                <Box className="flex-row flex-wrap items-center gap-x-1">
                  <Text className={home.gocharName}>
                    {planet.label}
                    {planet.rashi ? ` → ${planet.rashi}` : ""}
                  </Text>
                  {renderPlanetStatus?.({ key: planet.key, isRetrograde: planet.isRetrograde, isCombust: planet.isCombust })}
                </Box>
                <Text className={cn(home.gocharDegree, "tabular-nums")}>{planet.degree}</Text>
              </Box>
            ))}
          </Grid>
        </Box>
      ) : null}
      {view.solar.length > 0 ? (
        <Box className={view.planets.length > 0 ? home.solarWithPlanets : home.solarAlone}>
          <Grid cols={3} gap={6}>
            {view.solar.map((item) => (
              <Box key={item.label} className={cn("flex-col", home.vivaranTile, home.gocharTile, "shadow-ring-soft")}>
                <Text className={home.gocharName}>{item.label}</Text>
                <Text className={cn(home.solarValue, "tabular-nums")}>{item.value}</Text>
              </Box>
            ))}
          </Grid>
        </Box>
      ) : null}
      {onOpenDetail ? (
        <Box className={home.vivaranFooter}>
          {view.abhijit ? (
            <Text className={home.vivaranFooterText}>
              <Text className={home.vivaranFooterStrong}>{view.abhijit.title}</Text>{" "}
              <Text className={home.vivaranFooterNum}>{view.abhijit.range}</Text>
            </Text>
          ) : (
            <Text className="text-sm">{view.abhijitUnavailable}</Text>
          )}
          <Button label={view.detailLink} variant="outline" size="sm" onPress={onOpenDetail} className="mt-3 w-full" />
        </Box>
      ) : null}
    </Box>
  );
}
