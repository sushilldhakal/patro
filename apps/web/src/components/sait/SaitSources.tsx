import { cn } from "@vedic-patro/domain/utils";
import { useSaitSources } from "@vedic-patro/features/sait";
import type { SaitCategoryId } from "@vedic-patro/domain/sait-data";
import { saitClasses } from "@vedic-patro/design-tokens/classes/sait-classes";

export function SaitSources({ category }: { category: SaitCategoryId }) {
  const src = useSaitSources(category);
  return (
    <section className={saitClasses.sourcesCard}>
      <h2 className={saitClasses.sourcesHeading}>{src.heading}</h2>
      <p className={saitClasses.sourcesBlurb}>{src.blurb}</p>
      <ol className={saitClasses.sourcesList}>
        {src.sources.map((s) => (
          <li key={s.id} className={cn(saitClasses.sourceItem, "flex", saitClasses.sourceText)}>
            <span className={saitClasses.sourceNum}>{s.num}</span>
            <div className={saitClasses.sourceBody}>
              <p className={saitClasses.sourceCredit}>{s.credit}</p>
              <p className={saitClasses.sourceDetail}>{s.edition}</p>
              <p className={saitClasses.sourceDetail}>{s.used}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default SaitSources;
