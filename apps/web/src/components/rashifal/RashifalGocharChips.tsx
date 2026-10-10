import { useTranslation } from "react-i18next";
import { useLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { RASHIFAL_FLAG_ICON, toNepaliDigits } from "@/lib/rashifal-ui";
import type { RashifalGocharRow } from "@/lib/api";

/**
 * The nine-graha gochar strip inside "why this reading?" — one chip per graha
 * with the house counted from the sign, plus the three transit flags.
 *
 * The flags are icon-only, so each one carries its own tooltip/aria-label and
 * the strip closes with a legend: वेध (Ban) on its own reads as a broken or
 * blocked glyph rather than "this transit is cancelled". वक्री and अस्त keep
 * the same colours as {@link GrahaStatusBadges} everywhere else in the app —
 * secondary for वक्री, destructive for अस्त — so one icon means one thing
 * across the whole site.
 */
export function RashifalGocharChips({
  rows,
  className,
}: {
  rows: RashifalGocharRow[];
  className?: string;
}) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const ne = lang === "ne";
  const Vedha = RASHIFAL_FLAG_ICON.vedha;
  const Retro = RASHIFAL_FLAG_ICON.retrograde;
  const Combust = RASHIFAL_FLAG_ICON.combust;

  if (!rows.length) return null;

  // Only explain the marks that are actually on screen today.
  const anyVedha = rows.some((row) => Boolean(row.vedha_by));
  const anyRetro = rows.some((row) => row.retrograde);
  const anyCombust = rows.some((row) => row.combust);

  return (
    <div className={cn("border-t border-border/60 pt-3", className)}>
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {rows.map((row) => {
          const grahaName = ne ? row.graha_ne : row.graha_en;
          const vedhaName = (ne ? row.vedha_by_ne : row.vedha_by) ?? row.vedha_by;
          const vedhaLabel = vedhaName
            ? t("rashifal.flags.vedha_by", { graha: vedhaName })
            : t("rashifal.flags.vedha");
          return (
            <li
              key={row.graha}
              className={cn(
                "m-0 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold",
                row.vedha_by ? "bg-tone-neutral" : row.favourable ? "bg-tone-good" : "bg-tone-bad",
              )}
              title={t("rashifal.gochar_hint", {
                graha: grahaName,
                house: toNepaliDigits(row.house, lang),
                sign: ne ? row.sign_ne : row.sign_en,
              })}
            >
              <span>{grahaName}</span>
              <span className="font-num tabular-nums opacity-80">
                {toNepaliDigits(row.house, lang)}
              </span>
              {row.vedha_by ? (
                <span className="inline-flex" title={vedhaLabel} aria-label={vedhaLabel}>
                  <Vedha className="size-3 text-muted-foreground" aria-hidden="true" />
                </span>
              ) : null}
              {row.retrograde ? (
                <span
                  className="inline-flex"
                  title={t("rashifal.flags.retrograde")}
                  aria-label={t("rashifal.flags.retrograde")}
                >
                  <Retro className="size-3 text-secondary" aria-hidden="true" />
                </span>
              ) : null}
              {row.combust ? (
                <span
                  className="inline-flex"
                  title={t("rashifal.flags.combust")}
                  aria-label={t("rashifal.flags.combust")}
                >
                  <Combust className="size-3 text-destructive" aria-hidden="true" />
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {anyVedha || anyRetro || anyCombust ? (
        <p className="m-0 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem] text-muted-foreground">
          {anyVedha ? (
            <span className="inline-flex items-center gap-1">
              <Vedha className="size-3 text-muted-foreground" aria-hidden="true" />
              {t("rashifal.flags.vedha")}
            </span>
          ) : null}
          {anyRetro ? (
            <span className="inline-flex items-center gap-1">
              <Retro className="size-3 text-secondary" aria-hidden="true" />
              {t("rashifal.flags.retrograde")}
            </span>
          ) : null}
          {anyCombust ? (
            <span className="inline-flex items-center gap-1">
              <Combust className="size-3 text-destructive" aria-hidden="true" />
              {t("rashifal.flags.combust")}
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
