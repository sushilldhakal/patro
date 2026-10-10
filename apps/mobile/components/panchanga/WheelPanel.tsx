import { Pressable, ScrollView, View } from "react-native"
import { Text } from "@/components/ui/Text"
import { BottomSheetModal } from "@/components/ui/BottomSheetModal"
import { NAKSHATRA_ICONS } from "@vedic-patro/domain/nakshatra-icons";
import {
  bsMonthsForWheel,
  PADA_AKSHAR,
  RASHI_ELEM,
  RASHI_LORDS,
  WHEEL_RASHIS,
} from "@/lib/wheel-data";
import type { WheelPick } from "./WheelChart";
import { useLocale } from "@/lib/i18n";
import { NAK_LORD_EN as LORD_EN, TATTVA_EN } from "@vedic-patro/domain/wheel-locale";
import { BS_MONTHS_NE, BS_MONTH_NAMES } from "@/lib/bs-calendar";

function bsMonthEnOf(ne: string): string {
  const i = BS_MONTHS_NE.indexOf(ne);
  return i >= 0 ? BS_MONTH_NAMES[i]! : ne;
}

interface WheelPanelProps {
  sel: WheelPick | null;
  open: boolean;
  num: (n: number | string) => string | number;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3 border-b border-white/10 py-2.5">
      <Text className="text-caption text-[#c8e0e2]/65">{label}</Text>
      <Text className="text-body max-w-[58%] text-right font-semibold text-[#c8e0e2]">{value}</Text>
    </View>
  );
}

export function WheelPanel({ sel, open, num, onClose }: WheelPanelProps) {
  const { pick, isEnglish } = useLocale();
  let body: React.ReactNode = null;

  if (sel?.type === "nak") {
    const ico = NAKSHATRA_ICONS[sel.i]!;
    const L0 = sel.i * (360 / 27);
    const L1 = L0 + 360 / 27;
    const ri0 = Math.floor(L0 / 30);
    const ri1 = Math.floor((L1 - 0.01) / 30);
    const rashiSpan =
      ri0 === ri1
        ? pick(WHEEL_RASHIS[ri0]!.ne, WHEEL_RASHIS[ri0]!.en)
        : `${pick(WHEEL_RASHIS[ri0]!.ne, WHEEL_RASHIS[ri0]!.en)}–${pick(WHEEL_RASHIS[ri1]!.ne, WHEEL_RASHIS[ri1]!.en)}`;

    body = (
      <>
        <View className="flex-row items-start gap-3 border-b border-white/10 px-4 pb-3 pt-4">
          <View className="min-w-0 flex-1">
            <Text className="text-caption font-semibold uppercase tracking-widest text-[#4ecdc4]">
              {pick("नक्षत्र", "Nakshatra")} · {num(sel.i + 1)}
            </Text>
            <Text className="text-display mt-1 font-bold text-[#c8e0e2]">{pick(ico.ne, ico.en)}</Text>
            {isEnglish ? <Text className="text-caption mt-1 text-[#c8e0e2]/65">{ico.en}</Text> : null}
            <Text className="text-body mt-2 text-[#c8e0e2]/65">{ico.sym_ne}</Text>
          </View>
          <Pressable
            onPress={onClose}
            className="h-8 w-8 items-center justify-center rounded-lg border border-white/10"
            accessibilityLabel={pick("बन्द", "Close")}
          >
            <Text className="text-body text-[#c8e0e2]/65">✕</Text>
          </Pressable>
        </View>
        <ScrollView className="max-h-80 px-4 py-3">
          <Row label={pick("स्वामी ग्रह", "Lord planet")} value={pick(ico.lord_ne, LORD_EN[ico.lord_ne] ?? ico.lord_ne)} />
          <Row label={pick("चिन्ह", "Symbol")} value={ico.sym_ne} />
          <Row label={pick("राशि", "Rashi")} value={rashiSpan} />
          <Row
            label={pick("देशान्तर", "Longitude")}
            value={`${num(L0.toFixed(1))}°–${num(L1.toFixed(1))}°`}
          />
          <Row label={pick("पद अक्षर", "Pada syllables")} value={PADA_AKSHAR[sel.i]!.join(" · ")} />
        </ScrollView>
      </>
    );
  } else if (sel?.type === "rashi") {
    const rs = WHEEL_RASHIS[sel.i]!;
    const nakIn: string[] = [];
    for (let i = 0; i < 27; i++) {
      const L0 = i * (360 / 27);
      const L1 = (i + 1) * (360 / 27);
      if (L0 < (sel.i + 1) * 30 && L1 > sel.i * 30) {
        nakIn.push(pick(NAKSHATRA_ICONS[i]!.ne, NAKSHATRA_ICONS[i]!.en));
      }
    }
    const bsMonths = bsMonthsForWheel();

    body = (
      <>
        <View className="flex-row items-start gap-3 border-b border-white/10 px-4 pb-3 pt-4">
          <View className="min-w-0 flex-1">
            <Text className="text-caption font-semibold uppercase tracking-widest text-[#4ecdc4]">
              {pick("राशि", "Rashi")} · {num(sel.i + 1)}
            </Text>
            <Text className="text-display mt-1 font-bold text-[#c8e0e2]">{pick(rs.ne, rs.en)}</Text>
            {isEnglish ? <Text className="text-caption mt-1 text-[#c8e0e2]/65">{rs.en}</Text> : null}
          </View>
          <Pressable
            onPress={onClose}
            className="h-8 w-8 items-center justify-center rounded-lg border border-white/10"
            accessibilityLabel={pick("बन्द", "Close")}
          >
            <Text className="text-body text-[#c8e0e2]/65">✕</Text>
          </Pressable>
        </View>
        <ScrollView className="max-h-80 px-4 py-3">
          <Row
            label={pick("स्वामी ग्रह", "Lord planet")}
            value={pick(RASHI_LORDS[sel.i]!, LORD_EN[RASHI_LORDS[sel.i]!] ?? RASHI_LORDS[sel.i]!)}
          />
          <Row
            label={pick("तत्त्व", "Element")}
            value={pick(RASHI_ELEM[sel.i]!, TATTVA_EN[RASHI_ELEM[sel.i]!] ?? RASHI_ELEM[sel.i]!)}
          />
          <Row
            label={pick("देशान्तर", "Longitude")}
            value={`${num(sel.i * 30)}°–${num((sel.i + 1) * 30)}°`}
          />
          <Row
            label={pick("नेपाली महिना", "Nepali month")}
            value={pick(bsMonths[sel.i]?.ne ?? "", bsMonthEnOf(bsMonths[sel.i]?.ne ?? ""))}
          />
          <Row label={pick("पद", "Padas")} value={pick(`${num(9)} पद`, `${num(9)} padas`)} />
          <View className="mt-3 rounded-lg bg-black/25 p-3">
            <Text className="text-caption font-semibold text-[#c8e0e2]">{pick("नक्षत्रहरू", "Nakshatras")}</Text>
            <Text className="text-body mt-1 leading-5 text-[#c8e0e2]/70">{nakIn.join(" · ")}</Text>
          </View>
        </ScrollView>
      </>
    );
  }

  return (
    <BottomSheetModal
      visible={open && !!sel}
      onClose={onClose}
      maxHeight="70%"
      sheetStyle={{
        overflow: "hidden",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
        backgroundColor: "#0b1416",
      }}
    >
      <View onStartShouldSetResponder={() => true}>{body}</View>
    </BottomSheetModal>
  );
}
