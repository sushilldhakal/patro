import type { GocharGraha } from "@/lib/api";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { useGocharDeepDive } from "@vedic-patro/features/gochar";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { cn } from "@vedic-patro/domain/utils";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";

type Props = {
  gochar: Record<string, GocharGraha>;
  selected: GrahaKey;
  onSelect: (key: GrahaKey) => void;
};

export function GocharPlanetDeepDive({ gochar, selected, onSelect }: Props) {
  const { picker, detail, copy } = useGocharDeepDive(gochar, selected);
  if (!detail) return null;

  return (
    <section className={cn("shadow-ring-soft", gocharClasses.deepCard)}>
      <div className={gocharClasses.deepHead}>
        <p className={cn("m-0", gocharClasses.deepEyebrow)}>{copy.eyebrow}</p>
        <h2 className={cn("mb-0 break-words", gocharClasses.deepTitle)}>{copy.title}</h2>
        <p className={cn("mb-0 break-words", gocharClasses.deepSubtitle)}>{copy.subtitle}</p>
      </div>

      <div className={cn("grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9", gocharClasses.pickerGrid)}>
        {picker.map(({ key, name, active }) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={cn(
              "flex flex-col text-center transition-colors",
              gocharClasses.pickerButton,
              active
                ? cn(gocharClasses.pickerActive, gocharClasses.pickerLabelActive)
                : cn(gocharClasses.pickerIdle, gocharClasses.pickerLabelIdle, "hover:border-secondary/30"),
            )}
          >
            <GrahaPlanetIcon graha={key} size={28} />
            <span className={cn("w-full min-w-0 break-words", gocharClasses.pickerLabel)}>{name}</span>
          </button>
        ))}
      </div>

      <div className={gocharClasses.detail}>
        <div className={cn("flex flex-wrap", gocharClasses.detailTitleRow)}>
          <GrahaPlanetIcon graha={detail.key} size={36} />
          <h3 className={cn("m-0 min-w-0 break-words", gocharClasses.detailTitle)}>
            {detail.name}
            {detail.vedicName ? (
              <span className={cn("ml-2", gocharClasses.detailVedic)}>({detail.vedicName})</span>
            ) : null}
          </h3>
          {detail.exalted ? (
            <span className={cn(gocharClasses.detailBadge, gocharClasses.detailBadgeText)}>{copy.exalted}</span>
          ) : null}
        </div>

        <div className={cn("grid sm:grid-cols-2 lg:grid-cols-4", gocharClasses.factGrid)}>
          {detail.facts.map((fact) => (
            <Detail key={fact.key} label={fact.label} value={fact.value} />
          ))}
        </div>

        {detail.windows.length > 0 ? (
          <div className={gocharClasses.windowsBox}>
            <p className={cn("m-0", gocharClasses.windowsTitle)}>{copy.windowsTitle}</p>
            <ul className={cn("mb-0 list-disc space-y-1 pl-4", gocharClasses.windowsList, gocharClasses.windowsItem)}>
              {detail.windows.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className={gocharClasses.fact}>
      <p className={cn("m-0", gocharClasses.factLabel)}>{label}</p>
      <p className={cn("m-0", gocharClasses.factValue)}>{value}</p>
    </div>
  );
}
