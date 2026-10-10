import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Compass } from "lucide-react";
import { PageShell, PageHeader } from "../components/PageShell";
import { useRouteLoading } from "@/lib/route-loading";
import { PlotPlanner } from "@/components/vastu/PlotPlanner";
import { VastuPurushaWheel } from "@/components/vastu/VastuPurushaWheel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCompassHeading } from "@/lib/compass-heading";
import { useLocale } from "@/i18n/locale";
import {
  VASTU_DIRECTIONS,
  VASTU_DIR16,
  VASTU_ELEMENT_COLOR,
  VASTU_GUNA_COLOR,
  VASTU_INK,
  vastuDir16,
  vastuDir16AtBearing,
  vastuDir16ForPada,
  vastuPada,
  vastuSelection,
  type VastuGunaId,
  type VastuPadaId,
  type VastuSelectionId,
} from "@vedic-patro/domain/vastu";
import { cn } from "@/lib/utils";

function Chip({
  color,
  label,
  tone = "tint",
}: {
  color: string;
  label: string;
  tone?: "tint" | "sattva" | "tamas";
}) {
  const style =
    tone === "sattva"
      ? { backgroundColor: color, color: VASTU_INK.text }
      : tone === "tamas"
        ? { backgroundColor: color, color: VASTU_INK.background }
        : { backgroundColor: `${color}33`, color };
  return (
    <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={style}>
      {label}
    </span>
  );
}

function gunaTone(guna: VastuGunaId): "sattva" | "tamas" | "tint" {
  if (guna === "sattva") return "sattva";
  if (guna === "tamas") return "tamas";
  return "tint";
}

function PadaStatusMark({ status }: { status: "good" | "ok" | "bad" | "mixed" }) {
  if (status === "mixed") {
    return (
      <span className="ml-1 inline-flex flex-col items-center leading-[0.7] font-extrabold" aria-hidden>
        <span className="text-[9px] text-[#2f6b3c]">+</span>
        <span className="text-[9px] text-[#8f2f28]">−</span>
      </span>
    );
  }
  if (status === "good") {
    return <span className="ml-1 font-extrabold text-[#2f6b3c]">+</span>;
  }
  if (status === "bad") {
    return <span className="ml-1 font-extrabold text-[#8f2f28]">−</span>;
  }
  return null;
}

function PadaLinks({
  ids,
  selected,
  onSelect,
}: {
  ids: readonly VastuPadaId[];
  selected: VastuSelectionId;
  onSelect: (id: VastuSelectionId) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const pada = vastuPada(id);
        const active = selected === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            style={{
              borderColor: active ? VASTU_ELEMENT_COLOR[pada.element] : `${VASTU_ELEMENT_COLOR[pada.element]}66`,
              backgroundColor: active ? `${VASTU_ELEMENT_COLOR[pada.element]}2e` : undefined,
            }}
          >
            {pada.code} · {t(`vastu.pada.${id}.name`)}
            <PadaStatusMark status={pada.status} />
          </button>
        );
      })}
    </div>
  );
}

const VASTU_SOURCE_IDS = ["mayamata", "manasara", "vishvakarma", "samarangana", "aparajita"] as const;

function VastuSources() {
  const { t } = useTranslation();
  const { digits } = useLocale();
  return (
    <section className="rounded-xl border border-border bg-muted/40 p-3.5 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">{t("vastu.sources.heading")}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("vastu.sources.blurb")}</p>
      <ol className="mt-4 flex flex-col gap-4">
        {VASTU_SOURCE_IDS.map((id, i) => (
          <li key={id} className="flex gap-3 text-sm">
            <span className="w-5 shrink-0 font-semibold text-muted-foreground">{digits(i + 1)}.</span>
            <div className="min-w-0 flex flex-col gap-1">
              <p className="font-semibold text-foreground">{t(`vastu.sources.${id}.credit`)}</p>
              <p className="text-muted-foreground">{t(`vastu.sources.${id}.edition`)}</p>
              <p className="text-muted-foreground">{t(`vastu.sources.${id}.used`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ZoneDetail({
  id,
  onSelect,
}: {
  id: VastuSelectionId;
  onSelect: (next: VastuSelectionId) => void;
}) {
  const { t } = useTranslation();
  const zone = vastuSelection(id);
  const color = VASTU_ELEMENT_COLOR[zone.element];
  const gunaColor = VASTU_GUNA_COLOR[zone.guna];
  const parent16 = zone.kind === "pada" ? vastuDir16(vastuDir16ForPada(id as VastuPadaId)) : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5" style={{ borderColor: `${color}66` }}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xl font-bold text-foreground">
          {t(`${zone.copyPrefix}.name`)}
        </h3>
        <Chip color={VASTU_INK.line} label={t(`vastu.labels.kind.${zone.kind}`)} />
        {zone.padaCode ? <Chip color={color} label={zone.padaCode} /> : null}
        {zone.attrKey ? <Chip color={color} label={t(zone.attrKey)} /> : null}
        <Chip color={color} label={t(`vastu.element.${zone.element}`)} />
        <Chip color={gunaColor} label={t(`vastu.wheel.organ.${zone.guna}`)} tone={gunaTone(zone.guna)} />
        {zone.status === "mixed" ? (
          <>
            <Chip color="#2f6b3c" label={t("vastu.wheel.status.good")} />
            <Chip color="#8f2f28" label={t("vastu.wheel.status.bad")} />
          </>
        ) : zone.status ? (
          <Chip color={zone.status === "good" ? "#2f6b3c" : "#8f2f28"} label={t(`vastu.wheel.status.${zone.status}`)} />
        ) : null}
      </div>

      {zone.kind !== "dir16" && zone.kind !== "pada" ? (
        <p className="mt-3 text-sm leading-relaxed text-foreground">{t(`${zone.copyPrefix}.importance`)}</p>
      ) : null}

      <dl className="mt-4 space-y-3 text-sm">
        {zone.kind === "dir16" ? (
          <>
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 font-semibold text-muted-foreground">{t("vastu.labels.quality")}</dt>
              <dd className="min-w-0 text-foreground">{t(`${zone.copyPrefix}.quality`)}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 font-semibold text-muted-foreground">{t("vastu.labels.element")}</dt>
              <dd className="min-w-0 text-foreground">{t(`vastu.element.${zone.element}`)}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 font-semibold text-muted-foreground">{t("vastu.labels.guna")}</dt>
              <dd className="min-w-0 text-foreground">{t(`vastu.wheel.organ.${zone.guna}`)}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 font-semibold text-muted-foreground">{t("vastu.labels.description")}</dt>
              <dd className="min-w-0 text-foreground">{t(`${zone.copyPrefix}.importance`)}</dd>
            </div>
          </>
        ) : null}
        {zone.kind === "pada" ? (
          <>
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 font-semibold text-muted-foreground">{t("vastu.labels.deity")}</dt>
              <dd className="min-w-0 text-foreground">{t(`${zone.copyPrefix}.deity`)}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 font-semibold text-muted-foreground">{t("vastu.labels.element")}</dt>
              <dd className="min-w-0 text-foreground">{t(`vastu.element.${zone.element}`)}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 font-semibold text-muted-foreground">{t("vastu.labels.guna")}</dt>
              <dd className="min-w-0 text-foreground">{t(`vastu.wheel.organ.${zone.guna}`)}</dd>
            </div>
          </>
        ) : null}
        {zone.kind !== "pada" && zone.kind !== "inner4" ? (
          <div className="flex gap-3">
            <dt className="w-28 shrink-0 font-semibold text-muted-foreground">{t("vastu.labels.deity")}</dt>
            <dd className="min-w-0 text-foreground">{t(`${zone.copyPrefix}.deity`)}</dd>
          </div>
        ) : null}
        {zone.innerDeity ? (
          <div className="flex gap-3">
            <dt className="w-28 shrink-0 font-semibold text-muted-foreground">{t("vastu.labels.inner_deity")}</dt>
            <dd className="min-w-0 text-foreground">{t(`vastu.pada.${zone.innerDeity}.name`)}</dd>
          </div>
        ) : null}
        {zone.padas && zone.padas.length > 0 ? (
          <div className="flex gap-3">
            <dt className="w-28 shrink-0 font-semibold text-muted-foreground">{t("vastu.labels.pada")}</dt>
            <dd className="min-w-0">
              <PadaLinks ids={zone.padas} selected={id} onSelect={onSelect} />
            </dd>
          </div>
        ) : null}
        {parent16 ? (
          <div className="flex gap-3">
            <dt className="w-28 shrink-0 font-semibold text-muted-foreground">{t("vastu.labels.kind.dir16")}</dt>
            <dd className="min-w-0">
              <button
                type="button"
                onClick={() => onSelect(parent16.id)}
                className="rounded-md border px-2 py-0.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                style={{ borderColor: `${VASTU_ELEMENT_COLOR[parent16.element]}66` }}
              >
                {parent16.abbr} · {t(parent16.attrKey)}
              </button>
            </dd>
          </div>
        ) : null}
        <div className="flex gap-3">
          <dt className="w-28 shrink-0 font-semibold text-muted-foreground">{t("vastu.labels.best")}</dt>
          <dd className="min-w-0 text-foreground">{t(`${zone.copyPrefix}.best`)}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-28 shrink-0 font-semibold text-muted-foreground">{t("vastu.labels.avoid")}</dt>
          <dd className="min-w-0 text-danger">{t(`${zone.copyPrefix}.avoid`)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function Vastu() {
  const { t } = useTranslation();
  const { digits } = useLocale();
  const [selected, setSelected] = useState<VastuSelectionId>("northeast");
  const [alignOpen, setAlignOpen] = useState(false);
  const [compassLive, setCompassLive] = useState(false);
  const [compassError, setCompassError] = useState<string | null>(null);
  const compass = useCompassHeading(compassLive);

  useRouteLoading(false);

  useEffect(() => {
    if (!compassLive || compass.heading != null) return;
    const id = window.setTimeout(() => {
      setCompassLive(false);
      setAlignOpen(true);
      setCompassError(t("vastu.compass.unavailable"));
    }, 4000);
    return () => window.clearTimeout(id);
  }, [compassLive, compass.heading, t]);

  const facing = compass.heading != null ? vastuDir16(vastuDir16AtBearing(compass.heading)) : null;

  function onSelect(id: VastuSelectionId) {
    setSelected(id);
    if (id === "center" && !compassLive) {
      setCompassError(null);
      setAlignOpen(true);
    }
  }

  async function onAlignDone() {
    setCompassError(null);
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setCompassError(t("vastu.compass.unavailable"));
      return;
    }
    const ok = await compass.requestPermission();
    if (!ok) {
      setCompassError(t("vastu.compass.denied"));
      return;
    }
    setCompassLive(true);
    setAlignOpen(false);
  }

  return (
    <PageShell>
      <PageHeader
        icon={<Compass className="h-7 w-7 text-secondary" />}
        title={t("vastu.title")}
        subtitle={t("vastu.subtitle")}
      />

      <section className="rounded-2xl border border-border">
        <header className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-3">
          <Compass className="h-4 w-4 shrink-0 text-secondary" />
          <h2 className="text-sm font-semibold text-foreground">{t("vastu.plan.heading")}</h2>
          <span className="ml-auto text-sm">{t("vastu.plan.hint")}</span>
        </header>

        <div className="space-y-4 p-3 sm:p-4">
          <p className="text-sm">{t("vastu.wheel.blurb")}</p>
          <div className="space-y-5">
            <div className="-mx-1 sm:mx-0">
              <VastuPurushaWheel
                selected={selected}
                onSelect={onSelect}
                headingDeg={compassLive ? compass.heading : null}
              />
            </div>
            {compassLive ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">
                <Compass className="h-4 w-4 shrink-0 text-secondary" />
                <p className="min-w-0 flex-1 text-foreground">
                  {t("vastu.compass.live")}
                  {facing ? (
                    <>
                      {" "}
                      {t("vastu.compass.facing", {
                        name: t(`vastu.dir16.${facing.id}.name`),
                        abbr: facing.abbr,
                      })}
                      {compass.heading != null ? ` · ${digits(Math.round(compass.heading))}°` : null}
                    </>
                  ) : null}
                  {compass.drifting ? (
                    <span className="mt-1 block text-muted-foreground">{t("vastu.compass.drifting")}</span>
                  ) : null}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={() => setCompassLive(false)}>
                  {t("vastu.compass.stop")}
                </Button>
              </div>
            ) : null}
            <ZoneDetail id={selected} onSelect={onSelect} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {VASTU_DIRECTIONS.map((dir) => {
              const active = dir.id === selected;
              const color = VASTU_ELEMENT_COLOR[dir.element];
              return (
                <button
                  key={dir.id}
                  type="button"
                  onClick={() => onSelect(dir.id)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  style={{
                    borderColor: active ? color : `${color}55`,
                    backgroundColor: active ? `${color}2e` : undefined,
                  }}
                >
                  {t(`vastu.dir.${dir.id}.name`)}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {VASTU_DIR16.map((dir) => {
              const active = dir.id === selected;
              const color = VASTU_ELEMENT_COLOR[dir.element];
              return (
                <button
                  key={dir.id}
                  type="button"
                  onClick={() => onSelect(dir.id)}
                  aria-pressed={active}
                  title={t(`vastu.dir16.${dir.id}.name`)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition-colors",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                  style={{
                    borderColor: active ? color : `${color}55`,
                    backgroundColor: active ? `${color}2e` : undefined,
                  }}
                >
                  {dir.abbr}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <PlotPlanner />

      <p className="rounded-xl border border-border bg-muted/40 p-3.5 text-sm text-muted-foreground">
        {t("vastu.note")}
      </p>

      <VastuSources />

      <Dialog open={alignOpen} onOpenChange={setAlignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("vastu.compass.dialog_title")}</DialogTitle>
            <DialogDescription>{t("vastu.compass.dialog_body")}</DialogDescription>
          </DialogHeader>
          {compassError ? <p className="text-sm text-danger">{compassError}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAlignOpen(false)}>
              {t("vastu.compass.cancel")}
            </Button>
            <Button type="button" onClick={() => void onAlignDone()}>
              {t("vastu.compass.done")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

export default Vastu;
