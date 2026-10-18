import type { GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import { useGocharDeepDive } from "@vedic-patro/features/gochar";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Box, Pressable, Text } from "@vedic-patro/ui";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";
import { GrahaPlanetIcon } from "./GrahaPlanetIcon";

type Props = {
  gochar: Parameters<typeof useGocharDeepDive>[0];
  selected: GrahaKey;
  onSelect: (key: GrahaKey) => void;
};

export function GocharPlanetDeepDive({ gochar, selected, onSelect }: Props) {
  const { picker, detail, copy } = useGocharDeepDive(gochar, selected);
  if (!detail) return null;

  return (
    <Box as="section" className={cn("shadow-ring-soft", gocharClasses.deepCard)}>
      <Box className={gocharClasses.deepHead}>
        <Text as="p" className={cn("m-0", gocharClasses.deepEyebrow)}>
          {copy.eyebrow}
        </Text>
        <Text as="h2" className={cn("mb-0 break-words", gocharClasses.deepTitle)}>
          {copy.title}
        </Text>
        <Text as="p" className={cn("mb-0 break-words", gocharClasses.deepSubtitle)}>
          {copy.subtitle}
        </Text>
      </Box>

      <Box className={cn("grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9", gocharClasses.pickerGrid)}>
        {picker.map(({ key, name, active }) => (
          <Pressable
            key={key}
            onPress={() => onSelect(key)}
            className={cn(
              "flex flex-col text-center transition-colors",
              gocharClasses.pickerButton,
              active
                ? cn(gocharClasses.pickerActive, gocharClasses.pickerLabelActive)
                : cn(gocharClasses.pickerIdle, gocharClasses.pickerLabelIdle, "hover:border-secondary/30"),
            )}
          >
            <GrahaPlanetIcon graha={key} size={28} />
            <Text as="span" className={cn("w-full min-w-0 break-words", gocharClasses.pickerLabel)}>
              {name}
            </Text>
          </Pressable>
        ))}
      </Box>

      <Box className={gocharClasses.detail}>
        <Box className={cn("flex flex-wrap", gocharClasses.detailTitleRow)}>
          <GrahaPlanetIcon graha={detail.key} size={36} />
          <Text as="h3" className={cn("m-0 min-w-0 break-words", gocharClasses.detailTitle)}>
            {detail.name}
            {detail.vedicName ? (
              <Text as="span" className={cn("ml-2", gocharClasses.detailVedic)}>
                ({detail.vedicName})
              </Text>
            ) : null}
          </Text>
          {detail.exalted ? (
            <Text as="span" className={cn(gocharClasses.detailBadge, gocharClasses.detailBadgeText)}>
              {copy.exalted}
            </Text>
          ) : null}
        </Box>

        <Box className={cn("grid sm:grid-cols-2 lg:grid-cols-4", gocharClasses.factGrid)}>
          {detail.facts.map((fact) => (
            <Detail key={fact.key} label={fact.label} value={fact.value} />
          ))}
        </Box>

        {detail.windows.length > 0 ? (
          <Box className={gocharClasses.windowsBox}>
            <Text as="p" className={cn("m-0", gocharClasses.windowsTitle)}>
              {copy.windowsTitle}
            </Text>
            <Box as="ul" className={cn("mb-0 list-disc space-y-1 pl-4", gocharClasses.windowsList, gocharClasses.windowsItem)}>
              {detail.windows.map((w) => (
                <Box as="li" key={w}>
                  {w}
                </Box>
              ))}
            </Box>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Box className={gocharClasses.fact}>
      <Text as="p" className={cn("m-0", gocharClasses.factLabel)}>
        {label}
      </Text>
      <Text as="p" className={cn("m-0", gocharClasses.factValue)}>
        {value}
      </Text>
    </Box>
  );
}
