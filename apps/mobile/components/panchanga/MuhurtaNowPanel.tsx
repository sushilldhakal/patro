import { View } from "react-native"
import { Text } from "@/components/ui/Text"
import type { MuhurtaNowBlock, PanchangaDay } from "@/lib/api";
import { formatTimeShort } from "@vedic-patro/domain/panchanga-format";
import { cn } from "@vedic-patro/domain/utils";
import { panchangaPageClasses } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { useLocale } from "@/lib/i18n";
import { windowLabel } from "@vedic-patro/domain/muhurta-now";
import { tFor } from "@vedic-patro/i18n/runtime";

const ROWS: { key: keyof NonNullable<PanchangaDay["muhurta_now"]>; label: string; labelEn: string }[] =
  [
    { key: "rahu_kalam", get label() { return tFor("ne", "ui.panchanga.rahu_kalam"); }, get labelEn() { return tFor("en", "ui.panchanga.rahu_kalam"); } },
    { key: "yamaganda", get label() { return tFor("ne", "ui.panchanga.yamaganda"); }, get labelEn() { return tFor("en", "ui.panchanga.yamaganda"); } },
    { key: "gulika", get label() { return tFor("ne", "kundali.x.graha_gulika"); }, get labelEn() { return tFor("en", "kundali.x.graha_gulika"); } },
    { key: "abhijit", get label() { return tFor("ne", "ui.panchanga.abhijit"); }, get labelEn() { return tFor("en", "ui.panchanga.abhijit"); } },
  ];

type Props = {
  p: PanchangaDay;
  clock?: string;
};

export function MuhurtaNowPanel({ p, clock }: Props) {
  const { t, pick, digits } = useLocale();
  const now = p.muhurta_now;
  if (!now) return null;

  const instantLabel = p.query_instant_local ?? clock;
  const instantTime = instantLabel ? (instantLabel.split(" ")[1] ?? instantLabel) : "";

  return (
    <View className={panchangaPageClasses.aside.card}>
      <Text className={panchangaPageClasses.aside.muhurtaEyebrow}>
        {t("ui.panchanga.muhurta_now")}
      </Text>
      {instantLabel ? (
        <Text className={panchangaPageClasses.aside.muhurtaInstant}>
          {t("ui.panchanga.status_at_instanttime", { instantTime: digits(instantTime) })}
        </Text>
      ) : null}
      <View className={panchangaPageClasses.aside.muhurtaList}>
        {ROWS.map(({ key, label, labelEn }) => {
          const block = now[key];
          const active = block?.active;
          const range = windowLabel(block, digits);
          return (
            <View
              key={key}
              className={cn(
                "flex-row",
                panchangaPageClasses.aside.muhurtaRow,
                active ? panchangaPageClasses.aside.muhurtaRowActive : panchangaPageClasses.aside.muhurtaRowIdle,
              )}
            >
              <Text className={panchangaPageClasses.aside.muhurtaLabel}>{pick(label, labelEn)}</Text>
              <Text className={panchangaPageClasses.aside.muhurtaValue}>
                {active ? (
                  <Text className={panchangaPageClasses.aside.muhurtaActive}>
                    {t("panchanga.muhurta_now.active")}
                  </Text>
                ) : (
                  <Text className={panchangaPageClasses.aside.muhurtaRange}>{range ?? "—"}</Text>
                )}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function EphemerisModeBanner({ p, clock }: Props) {
  const { t, pick, digits } = useLocale();
  const time = p.query_instant_local?.split(" ")[1] ?? clock;
  const civil = p.before_sunrise_of_civil_day;
  return (
    <View className={panchangaPageClasses.aside.banner}>
      <Text className={panchangaPageClasses.aside.bannerTitle}>
        {t("panchanga.muhurta_now.time_based_reading")}
      </Text>
      <Text className={panchangaPageClasses.aside.bannerBody}>
        {time
          ? t("ui.panchanga.tithi_nakshatra_yoga_and_karana_from", { time: digits(time) })
          : t("panchanga.muhurta_now.ephemeris_no_time")}
        {civil
          ? t("ui.panchanga.this_time_is_before_today_s")
          : null}
      </Text>
    </View>
  );
}
