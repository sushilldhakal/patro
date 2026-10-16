import type { ReactNode } from "react";
import { cn } from "@vedic-patro/domain/utils";
import { homeClasses as home } from "@vedic-patro/design-tokens/classes/home-classes";
import { patroAyanaNorth, patroAyanaSouth } from "@vedic-patro/design-tokens/classes/patro-classes";
import { usePanchangaVivaran, type VivaranCell } from "@vedic-patro/features/home";
import { Grid, Box, Button, Text } from "@vedic-patro/ui";
import type { PanchangaVivaranPanelProps } from "../contract";

/* iOS paints a one-sided border (`border-t`) as a stretched image, and once the
   view grows after its first layout that image can fill the whole box (the
   dark band behind the planet tiles). So these sections carry no border at all
   (not even a border colour) and a 1px view draws the rule. */

function Rule({ className }: { className?: string }) {
  return <Box className={cn("h-px bg-foreground/10", className)} />;
}

/* The tiles' gold outline is drawn the same way: a 1px frame of fill around the
   tile, not a border. Bordered, the planet tiles' outline colour spread into a
   gold band behind the gochar title and the first row in the light theme. */
function Tile({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Box className="rounded-lg bg-gold/25 p-px">
      <Box className={cn(home.vivaranTile, "rounded-md", className)}>{children}</Box>
    </Box>
  );
}

function Cell({ label, value, hint, mono, ayana }: VivaranCell) {
  return (
    <Tile>
      <Text className={home.vivaranLabel}>{label}</Text>
      <Text className={cn(home.vivaranValue, mono && home.vivaranValueMono)}>
        {value ?? "—"}
        {ayana ? <Text className={cn(ayana.north ? patroAyanaNorth : patroAyanaSouth, "mb-0 ml-1.5")}>{ayana.mark}</Text> : null}
      </Text>
      {hint ? <Text className={cn(home.vivaranHint, "break-words")}>{hint}</Text> : null}
    </Tile>
  );
}

/** Panchanga detail tiles, planets and abhijit. Status badges and the detail route come from the app. */
export function PanchangaVivaranPanel({ p, selectedDay, loading, renderPlanetStatus, onOpenDetail, className }: PanchangaVivaranPanelProps) {
  const view = usePanchangaVivaran({ p, selectedDay });
  if (loading || !p || !view) {
    return (
      <Box className={cn("rounded-lg bg-card", className)}>
        <Grid cols={3} minCellWidth={96} gap={8} className={home.vivaranCells}>
          {Array.from({ length: 6 }, (_, i) => (
            <Tile key={i}>
              <Text className={home.vivaranLabel}>…</Text>
              <Box className="mt-1.5 h-[18px] animate-pulse rounded-full bg-muted-foreground/20" />
            </Tile>
          ))}
        </Grid>
        <Box className="mt-2.5 h-[120px] animate-pulse rounded-md bg-muted" />
      </Box>
    );
  }

  return (
    <Box className={cn("rounded-lg bg-card", className)}>
      <Grid cols={3} minCellWidth={96} gap={8} className={home.vivaranCells}>
        {view.cells.map((cell) => (
          <Cell key={cell.label} {...cell} />
        ))}
      </Grid>
      {view.planets.length > 0 ? (
        <Box className="mt-2.5">
          <Rule className="mb-2" />
          <Text className={home.gocharTitle}>{view.gocharTitle}</Text>
          <Grid cols={5} minCellWidth={96} gap={6}>
            {view.planets.map((planet) => (
              <Tile key={planet.key} className={cn("flex-col", home.gocharTile)}>
                <Box className="min-w-0 flex-row flex-wrap items-center gap-x-1 gap-y-0.5">
                  <Text className={cn("min-w-0 shrink", home.gocharName)}>
                    {planet.label}
                    {planet.rashi ? ` → ${planet.rashi}` : ""}
                  </Text>
                  {renderPlanetStatus?.({ key: planet.key, isRetrograde: planet.isRetrograde, isCombust: planet.isCombust })}
                </Box>
                <Text className={cn(home.gocharDegree, "tabular-nums")}>{planet.degree}</Text>
              </Tile>
            ))}
          </Grid>
        </Box>
      ) : null}
      {view.solar.length > 0 ? (
        <Box className={view.planets.length > 0 ? "mt-1.5" : "mt-2.5"}>
          <Rule className="mb-2" />
          <Grid cols={3} gap={6}>
            {view.solar.map((item) => (
              <Tile key={item.label} className={cn("flex-col", home.gocharTile)}>
                <Text className={home.gocharName}>{item.label}</Text>
                <Text className={cn(home.solarValue, "tabular-nums")}>{item.value}</Text>
              </Tile>
            ))}
          </Grid>
        </Box>
      ) : null}
      {onOpenDetail ? (
        <Box className="mt-2.5">
          <Rule className="mb-2.5" />
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
