import { cn } from "@vedic-patro/domain/utils";
import { patroNavataraRow } from "@vedic-patro/design-tokens/classes/patro-classes";
import { homeClasses as home } from "@vedic-patro/design-tokens/classes/home-classes";
import { useMuhurtaAside } from "@vedic-patro/features/home";
import { Grid, Box, Button, Pressable, Text } from "@vedic-patro/ui";
import type { MuhurtaAsidePanelProps } from "../contract";

/** Muhurta sub-tabs and slots. The hint icon and the full-table route come from the app. */
export function MuhurtaAsidePanel({ p, hintIcon, onOpenTable, className }: MuhurtaAsidePanelProps) {
  const aside = useMuhurtaAside(p);
  const { panel } = aside;
  return (
    <Box className={cn(home.muhurtaStack, className)}>
      <Grid cols={5} gap={4} label={aside.tabsLabel}>
        {aside.tabs.map((tab) => (
          <Pressable
            key={tab.id}
            role="tab"
            selected={tab.active}
            label={tab.label}
            onPress={tab.select}
            className={cn(
              "items-center justify-center",
              home.muhurtaSubTab,
              tab.active ? home.muhurtaSubTabActive : home.muhurtaSubTabIdle,
            )}
            webClassName={tab.active ? undefined : "hover:bg-tab-hover hover:text-foreground"}
          >
            <Text className={cn(home.muhurtaSubTabLabel, tab.active && home.muhurtaSubTabLabelActive)}>{tab.label}</Text>
          </Pressable>
        ))}
      </Grid>
      <Box className={home.muhurtaHint}>
        {hintIcon}
        <Text className={cn("min-w-0 flex-1", home.muhurtaHintText)}>{aside.hint}</Text>
      </Box>
      {panel.empty ? (
        <Text className={home.muhurtaEmpty}>{panel.empty}</Text>
      ) : (
        <Box>
          {panel.moonRef ? (
            <Text className={home.muhurtaMoonRef}>
              {panel.moonRef.label} <Text className={home.muhurtaMoonRefStrong}>{panel.moonRef.value}</Text>
            </Text>
          ) : null}
          <Grid cols={3} gap={4}>
            {panel.slots.map((slot) => (
              <Box key={slot.key} className={patroNavataraRow(slot.tone as "best" | "good" | "neutral" | "bad" | "worst", slot.isMoon)}>
                <Text className={home.muhurtaSlotTitle}>{slot.title}</Text>
                <Text className={home.muhurtaSlotValue}>
                  {slot.value}
                  <Text className={cn("mx-1", home.muhurtaSlotSep)}>/</Text>
                  {slot.quality}
                </Text>
              </Box>
            ))}
          </Grid>
        </Box>
      )}
      {onOpenTable ? (
        <Button label={aside.viewFullTable} variant="outline" onPress={() => onOpenTable(aside.elementId)} className="w-full" />
      ) : null}
    </Box>
  );
}
