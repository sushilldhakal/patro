/**
 * Jyotish kit props — one contract for the website and the app.
 * `web/` draws these with HTML, `native/` with React Native. Both indexes
 * satisfy `JyotishKit`.
 */
import type { ComponentType, ReactNode } from "react";
import type {
  BratabandhaNakshatraMode,
  AshtakutaResult,
  DocumentSummary,
  ProfileInput,
  LocationParams,
  Profile,
  AshtakavargaData,
  BhavaBalaData,
  BhavaReferencePayload,
  DashaSystem,
  DashaTreeNode,
  DashaTreeResponse,
  GrahaShantiRecommendation,
  ShadbalaPlanet,
  ShadbalaResponse,
  VargaCharts,
  VimshopakaData,
  YuddhaData,
  RashifalGocharRow,
  RashifalPeriod,
  RashifalPersonal,
  RashifalSignBlock,
  SaitDetailDay,
  SaitPersonalizeDay,
  SaitSuitability,
  Shloka,
} from "@vedic-patro/api-client";
import type { AyanamshaMode } from "@vedic-patro/domain/ayanamsha";
import type { BhavaHouse } from "@vedic-patro/domain/bhava";
import type { ShadbalaScale } from "@vedic-patro/domain/kundali/shadbala-chart";
import type { GrahaDetailsInput, KundaliNavIcon, KundaliSectionId, DivisionalPanelConfig } from "@vedic-patro/features/kundali";
import type { InstantQuery } from "@vedic-patro/domain/instant-query";
import type { PanchangaLocation } from "@vedic-patro/read-models/panchanga-location";
import type { SaitCategoryId } from "@vedic-patro/domain/sait-data";
import type { CardinalWall, VastuSelectionId } from "@vedic-patro/domain/vastu";
import type { HousePlan, PlotSize, SpaceAssignment } from "@vedic-patro/domain/vastu-plan";
import type { FetchCivilDay, VastuPlannerStorage, VastuSketchOffline } from "@vedic-patro/features/vastu";
import type { ProfilePlace } from "@vedic-patro/features/account";
import type { SaitRuleEntry } from "@vedic-patro/domain/sait-rules-content";
import type { useRashifalSignCard } from "@vedic-patro/features/rashifal";

export type SaitSourcesProps = {
  category: SaitCategoryId;
};

export type SuitabilityBadgeProps = {
  suitability: SaitSuitability;
  className?: string;
};

export type SuitabilityLegendProps = {
  counts?: { favourable: number; neutral: number; avoid: number } | null;
};

/** A ceremony rule row. Same shape the rules catalogue already uses. */
export type SaitRule = SaitRuleEntry;

export type SaitRulesSectionProps = {
  method?: { ne?: string; en?: string } | null;
  rules?: SaitRule[] | null;
  engineVersion?: string;
  defaultOpen?: boolean;
  /** Ids currently applied. A toggleable rule not listed here is treated as ON. */
  enabledRuleIds?: Set<string> | null;
  onToggleRule?: (id: string, enabled: boolean) => void;
  /** Recomputing indicator while a custom-rule fetch is in flight. */
  busy?: boolean;
};

export type DocumentJumpFormProps = {
  chapterNumbers: number[];
  /** On a chapter page the chapter field is hidden and fixed to this. */
  currentChapter?: number;
  /** Open the chapter, or scroll to the verse. Return false when it cannot be found. */
  onJump: (chapter: number, verse: string) => boolean;
};

export type DocumentCardProps = {
  doc: DocumentSummary;
  /** List-page group, carried into the website link so Back returns there. */
  category?: string;
  topic?: string;
  /** App navigation. The website renders a link from `doc.slug`. */
  onPress?: () => void;
};

/** Fields both rashifal cards hand to the shared meter, domains, lucky row and details. */
export type RashifalCardView = Pick<
  ReturnType<typeof useRashifalSignCard>,
  "open" | "toggle" | "stars" | "tone" | "percent" | "percentLabel" | "domains" | "whyLabel" | "components" | "gochar" | "lucky"
>;

export type RashifalMeterProps = { card: RashifalCardView };
export type RashifalDomainsProps = { card: RashifalCardView };
/** Two columns on a sign card. Three on a personal card (two until the sm breakpoint on the website). */
export type RashifalLuckyProps = { card: RashifalCardView; columns: 2 | 3 };
export type RashifalWhyButtonProps = { card: RashifalCardView; detailsId: string };
export type RashifalComponentsProps = { card: RashifalCardView };

export type RashifalGocharChipsProps = {
  rows: RashifalGocharRow[];
  className?: string;
};

/** The rashi glyph the card asks the app to draw (Agent 2 owns the glyph component). */
export type RashifalGlyph = { name: string; number: number };

export type RashifalSignCardProps = {
  sign: RashifalSignBlock;
  period: RashifalPeriod;
  taraLine?: string;
  renderGlyph: (glyph: RashifalGlyph) => ReactNode;
};

export type RashifalPersonalCardProps = {
  name: string;
  personal: RashifalPersonal;
  renderGlyph: (glyph: RashifalGlyph) => ReactNode;
};

export type RashifalProfilePickerProps = {
  selectedId: string | null;
  onSelect: (profile: Profile | null) => void;
  isAuthenticated: boolean;
  /** Sign-in dialog. The kit does not import the app auth screen. */
  renderAuth: (props: { open: boolean; onOpenChange: (open: boolean) => void }) => ReactNode;
};

export type SaitDayCardProps = {
  d: SaitDetailDay;
  /** Staggers the website's entrance animation. */
  index?: number;
  suitability?: SaitSuitability;
  personalize?: SaitPersonalizeDay;
};

export type SaitProfilePickerProps = {
  selectedId: string | null;
  onSelect: (profile: Profile | null) => void;
  isAuthenticated: boolean;
  renderAuth: (props: { open: boolean; onOpenChange: (open: boolean) => void }) => ReactNode;
};

export type SaitCeremonyLayoutProps = {
  year: number;
  method?: { ne?: string; en?: string } | null;
  rules?: SaitRule[] | null;
  engineVersion?: string;
  enabledRuleIds?: Set<string> | null;
  onToggleRule?: (id: string, enabled: boolean) => void;
  rulesBusy?: boolean;
  nakshatraMode?: BratabandhaNakshatraMode | null;
  onNakshatraModeChange?: (mode: BratabandhaNakshatraMode) => void;
  days?: SaitDetailDay[];
  count?: number;
  profileControl?: ReactNode;
  suitabilityByDay?: Map<string, SaitSuitability>;
  personalizeByDay?: Map<string, SaitPersonalizeDay>;
  loading: boolean;
  notice?: ReactNode;
  children?: ReactNode;
  emptyLabel?: string;
  countLabel?: (count: number, year: number) => string;
  footer?: ReactNode;
  /** Page shell (website PageShell, app AppShell). */
  renderShell: (children: ReactNode) => ReactNode;
  renderHeader: () => ReactNode;
  /** Year and place controls. Those widgets stay in the app. */
  renderYearNav: () => ReactNode;
  /** Link back to every ceremony. */
  renderBack: () => ReactNode;
};

export type SaitAsideLinkArgs = { id: string; className: string; children: ReactNode };

export type SaitAsidePanelProps = {
  year: number;
  month: number;
  highlightDay?: number;
  adYear?: number;
  adMonth?: number;
  location?: LocationParams;
  renderLink: (args: SaitAsideLinkArgs) => ReactNode;
};

export type ShlokaCardProps = {
  shloka: Shloka;
  isActive: boolean;
  isPlaying: boolean;
  progress: number;
  meaningOpen: boolean;
  playsFromFull: boolean;
  clip?: { currentTime: number; duration: number };
  onPlay: () => void;
  onToggleMeaning: () => void;
  /** Website scroll-into-view registration. The app list does not use it. */
  registerRef?: (node: unknown) => void;
};

export type PlaybackSeekArgs = {
  value: number;
  max: number;
  fillPct: number;
  label: string;
  onChange: (value: number) => void;
};

export type PlaybackBarProps = {
  mode: "full" | "verse" | null;
  hasFullRecording: boolean;
  documentTitle: string;
  onStartFull: () => void;
  onPlayThrough?: () => void;
  fullPlaying: boolean;
  fullCurrentTime: number;
  fullDuration: number;
  onToggleFull: () => void;
  onSeekFull: (time: number) => void;
  activeShloka: Shloka | null;
  versePlaying: boolean;
  verseCurrentTime: number;
  verseDuration: number;
  hasNext: boolean;
  hasPrev: boolean;
  onToggleVerse: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSwitchToFull: () => void;
  /** App: distance from the bottom of the screen, above the tab bar. */
  dockBottom?: number;
  /** App slider. The website draws a range input. */
  renderSeek?: (args: PlaybackSeekArgs) => ReactNode;
};

export type AyanamshaSelectorProps = {
  mode: AyanamshaMode;
  onModeChange: (mode: AyanamshaMode) => void;
};

export type ProfileFormProps = {
  initial: ProfileInput;
  existing?: Profile;
  onCancel: () => void;
  onSaved: (saved: Profile) => void;
  afterSave?: (isNew: boolean) => void;
  renderPlace: (args: {
    value: string;
    onSelect: (place: ProfilePlace) => void;
    onSelectLabel: (label: string, lat: number | undefined, lon: number | undefined, timezone?: string) => void;
  }) => ReactNode;
};

export type HouseSelectArgs = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
};

export type HouseRequirementsFormProps = {
  plan: HousePlan;
  onChange: (plan: HousePlan) => void;
  /** App bottom-sheet select. The website draws a select element. */
  renderSelect?: (args: HouseSelectArgs) => ReactNode;
};

export type OwnerCompatibilityProps = {
  fetchDay: FetchCivilDay;
  renderProfile: (args: { selectedId: string | null; onSelect: (profile: Profile | null) => void }) => ReactNode;
  renderPlace: (args: { location: PanchangaLocation; onChange: (location: PanchangaLocation) => void }) => ReactNode;
  renderSelect?: (args: HouseSelectArgs) => ReactNode;
};

export type KundaliMilanResultProps = {
  boyName: string;
  girlName: string;
  result: AshtakutaResult;
};

export type KundaliProfileFormArgs = {
  initial: ProfileInput;
  existing?: Profile;
  onCancel: () => void;
  onSaved: (saved: Profile) => void;
};

export type KundaliProfilePickerProps = {
  selectedId?: string | null;
  onSelect: (profile: Profile) => void;
  bindOpen?: (openAdd: () => void) => void;
  onPrefetch?: (id: string) => void;
  renderForm: (args: KundaliProfileFormArgs) => ReactNode;
};

/** Planet glyph. The kit cannot import the app icon. */
export type GrahaSlot = (props: { graha: string; size?: number }) => ReactNode;
export type RashiSlot = (props: { number: number; name?: string; size?: number }) => ReactNode;

export type VimshopakaCardProps = { data: VimshopakaData; renderGraha: GrahaSlot };

export type YogaReferenceCatalogProps = { excludeIds?: ReadonlySet<string> };

export type GrahaDetailsListProps = GrahaDetailsInput & { renderGraha: GrahaSlot };

export type AshtakavargaCardProps = { data: AshtakavargaData; renderGraha: GrahaSlot; renderRashi: RashiSlot };

export type BhavaBalaCardProps = {
  data: BhavaBalaData;
  vargaCharts?: VargaCharts;
  combustion?: Record<string, boolean | null>;
  renderGraha: GrahaSlot;
  /** The wheel stays a sibling drawing (family of charts). */
  renderChart: (props: {
    data: BhavaBalaData;
    selectedHouse: number;
    onSelectHouse: (house: number) => void;
    vargaCharts?: VargaCharts;
    combustion?: Record<string, boolean | null>;
  }) => ReactNode;
};

export type D1MarkArgs = {
  planetKey: string;
  isRetrograde: boolean | undefined;
  isCombust: boolean | undefined;
  x: number;
  y: number;
  size: number;
};

/**
 * North-Indian D1. `houses` is the only data prop. `size` is a max width on
 * the website and the SVG edge in the app. `renderMarks` draws the vakri / asta
 * glyphs inside the SVG (website `<svg>` children, app `react-native-svg` nodes).
 * The bhava sheet is the kit `BhavaDetailDialog`.
 */
export type D1ChartProps = {
  houses: BhavaHouse[];
  size?: number;
  renderMarks: (args: D1MarkArgs) => ReactNode;
};

export type VastuCenter = { cx: number; cy: number };

export type VastuInk = { text: string; background: string };

export type VastuMarks = { good: string; bad: string };

export type ShadbalaChartProps = {
  planets: ShadbalaPlanet[];
  selectedKey: string;
  onSelect: (key: string) => void;
  yuddha?: YuddhaData;
  scale: ShadbalaScale;
  onScaleChange: (scale: ShadbalaScale) => void;
  renderGraha: GrahaSlot;
};

export type BhavaBalaChartProps = {
  data: BhavaBalaData;
  selectedHouse: number;
  onSelectHouse: (house: number) => void;
  vargaCharts?: VargaCharts;
  combustion?: Record<string, boolean | null>;
  renderGraha: GrahaSlot;
};

export type HouseSketchProps = {
  plot: PlotSize;
  facing: CardinalWall;
  assignments: SpaceAssignment[];
  ink: VastuInk;
  center: VastuCenter;
  marks: VastuMarks;
  /** App edge length. The website stretches the drawing to its container. */
  size?: number;
};

export type PlotSelectArgs = {
  value: string;
  label: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

export type PlotPlannerProps = {
  storage: VastuPlannerStorage;
  offline?: VastuSketchOffline;
  /** App picker. The website draws a `<select>`. */
  renderSelect?: (args: PlotSelectArgs) => ReactNode;
  /** App sketch edge in points. The website fills the container. */
  sketchSize?: number;
  renderOwner: () => ReactNode;
  renderRequirements: (args: { plan: HousePlan; onChange: (plan: HousePlan) => void }) => ReactNode;
};

export type VastuPurushaWheelProps = {
  selected: VastuSelectionId;
  onSelect: (id: VastuSelectionId) => void;
  centerContent?: ReactNode;
  /** Compass heading (0 = north, clockwise). The facing wall sits at the top. */
  headingDeg?: number | null;
  /** Wheel centre in the shared viewBox. The ring passes the same point. */
  center: VastuCenter;
  ink: VastuInk;
  marks: VastuMarks;
  /** App edge length. The website stretches with `className`. */
  size?: number;
  className?: string;
};

export type VastuCompassRingProps = {
  center: VastuCenter;
  ink: VastuInk;
  marks: VastuMarks;
  size?: number;
  className?: string;
};

export type ShadbalaCardProps = {
  data: ShadbalaResponse;
  yuddha?: YuddhaData;
  bhavaBala?: BhavaBalaData | null;
  renderGraha: GrahaSlot;
  renderChart: (props: {
    planets: ShadbalaPlanet[];
    selectedKey: string;
    onSelect: (key: string) => void;
    yuddha?: YuddhaData;
    scale: ShadbalaScale;
    onScaleChange: (scale: ShadbalaScale) => void;
  }) => ReactNode;
};

export type DashaTreeProps = {
  tree: DashaTreeNode[];
  timeZone?: string;
  system?: DashaSystem;
  maxLevel?: number;
  cycleYears?: number;
  renderGraha: GrahaSlot;
};

export type DashaSystemPanelProps = {
  vimshottari: DashaTreeResponse | null | undefined;
  tribhagi: DashaTreeResponse | null | undefined;
  yogini: DashaTreeResponse | null | undefined;
  timeZone?: string;
  active?: DashaSystem;
  onActiveChange?: (id: DashaSystem) => void;
  renderGraha: GrahaSlot;
};

export type ShantiVidhiPanelProps = {
  grahaShanti?: GrahaShantiRecommendation;
  isError?: boolean;
  renderGraha: GrahaSlot;
  /** App scroll helper. The website scrolls the detail block itself. */
  scrollIntoView?: (node: unknown) => void;
};

export type BhavaDetailDialogProps = {
  houses: BhavaHouse[];
  houseNumber: number | null;
  reference: BhavaReferencePayload | null | undefined;
  onClose: () => void;
};

export type KundaliSectionNavProps = {
  activeId: KundaliSectionId;
  onNavigate: (id: KundaliSectionId) => void;
  className?: string;
  variant?: "sidebar" | "horizontal";
  renderIcon?: (name: KundaliNavIcon) => ReactNode;
};

export type KundaliSidebarLinkArgs = {
  hash: string;
  label: string;
  active: boolean;
  onPress?: () => void;
  className: string;
};

export type KundaliSidebarSubnavProps = {
  activeSectionId: KundaliSectionId;
  renderLink: (args: KundaliSidebarLinkArgs) => ReactNode;
};

export type KundaliReportProps = {
  moment: InstantQuery;
  location?: LocationParams;
  ayanamsha?: string;
  disabled?: boolean;
  renderShell: (args: { title: string; children: ReactNode }) => ReactNode;
};

export type DivisionalChartCompareProps = {
  vargaCharts: VargaCharts;
  combustion?: Record<string, boolean | null>;
  defaultLeft?: DivisionalPanelConfig;
  defaultRight?: DivisionalPanelConfig;
  renderSelect?: (args: HouseSelectArgs) => ReactNode;
  renderChart: (houses: BhavaHouse[]) => ReactNode;
  renderLegend?: () => ReactNode;
  renderBhava: (args: { division: number; anchorKey: string; vargaCharts: VargaCharts }) => ReactNode;
  renderGraha: GrahaSlot;
  renderShell?: (args: { title: string; subtitle: string; children: ReactNode }) => ReactNode;
};

export type JyotishKit = {
  SaitSources: ComponentType<SaitSourcesProps>;
  SuitabilityBadge: ComponentType<SuitabilityBadgeProps>;
  SuitabilityLegend: ComponentType<SuitabilityLegendProps>;
  SaitRulesSection: ComponentType<SaitRulesSectionProps>;
  DocumentJumpForm: ComponentType<DocumentJumpFormProps>;
  DocumentCard: ComponentType<DocumentCardProps>;
  RashifalMeter: ComponentType<RashifalMeterProps>;
  RashifalDomains: ComponentType<RashifalDomainsProps>;
  RashifalLucky: ComponentType<RashifalLuckyProps>;
  RashifalWhyButton: ComponentType<RashifalWhyButtonProps>;
  RashifalComponents: ComponentType<RashifalComponentsProps>;
  RashifalGocharChips: ComponentType<RashifalGocharChipsProps>;
  RashifalSignCard: ComponentType<RashifalSignCardProps>;
  RashifalPersonalCard: ComponentType<RashifalPersonalCardProps>;
  RashifalProfilePicker: ComponentType<RashifalProfilePickerProps>;
  SaitDayCard: ComponentType<SaitDayCardProps>;
  SaitProfilePicker: ComponentType<SaitProfilePickerProps>;
  SaitCeremonyLayout: ComponentType<SaitCeremonyLayoutProps>;
  SaitAsidePanel: ComponentType<SaitAsidePanelProps>;
  ShlokaCard: ComponentType<ShlokaCardProps>;
  PlaybackBar: ComponentType<PlaybackBarProps>;
  AyanamshaSelector: ComponentType<AyanamshaSelectorProps>;
  ProfileForm: ComponentType<ProfileFormProps>;
  HouseRequirementsForm: ComponentType<HouseRequirementsFormProps>;
  OwnerCompatibility: ComponentType<OwnerCompatibilityProps>;
  KundaliMilanResult: ComponentType<KundaliMilanResultProps>;
  KundaliProfilePicker: ComponentType<KundaliProfilePickerProps>;
  VimshopakaCard: ComponentType<VimshopakaCardProps>;
  YogaReferenceCatalog: ComponentType<YogaReferenceCatalogProps>;
  GrahaDetailsList: ComponentType<GrahaDetailsListProps>;
  AshtakavargaCard: ComponentType<AshtakavargaCardProps>;
  BhavaBalaCard: ComponentType<BhavaBalaCardProps>;
  BhavaBalaChart: ComponentType<BhavaBalaChartProps>;
  ShadbalaCard: ComponentType<ShadbalaCardProps>;
  ShadbalaChart: ComponentType<ShadbalaChartProps>;
  VastuPurushaWheel: ComponentType<VastuPurushaWheelProps>;
  VastuCompassRing: ComponentType<VastuCompassRingProps>;
  HouseSketch: ComponentType<HouseSketchProps>;
  PlotPlanner: ComponentType<PlotPlannerProps>;
  D1Chart: ComponentType<D1ChartProps>;
  DashaTree: ComponentType<DashaTreeProps>;
  DashaSystemPanel: ComponentType<DashaSystemPanelProps>;
  ShantiVidhiPanel: ComponentType<ShantiVidhiPanelProps>;
  BhavaDetailDialog: ComponentType<BhavaDetailDialogProps>;
  KundaliSectionNav: ComponentType<KundaliSectionNavProps>;
  KundaliSidebarSubnav: ComponentType<KundaliSidebarSubnavProps>;
  KundaliReport: ComponentType<KundaliReportProps>;
  DivisionalChartCompare: ComponentType<DivisionalChartCompareProps>;
};
