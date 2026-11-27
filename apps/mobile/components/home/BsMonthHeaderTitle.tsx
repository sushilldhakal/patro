import { useLayoutMode } from "@/lib/responsive";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth/AuthContext";
import { HeaderButton, ViewMenuButton } from "@/components/AppHeader";
import { TopBarSlot } from "@/components/navigation/TopBarSlot";
import { usePageViewMenu } from "@/lib/page-view-menu";
import type { MonthBrowseEra } from "@/lib/api";
import { PatroCalendarHeader } from "@/components/patro-date/PatroCalendarHeader";
import { PatroHeaderLocation } from "@/components/patro-date/PatroHeaderLocation";
import type { PanchangaLocation } from "@/lib/use-panchanga-location";
import { useLocale } from "@/lib/i18n";
import { TABLET_HOME_VIEWS, homeViewsFor } from "@vedic-patro/features/events";
import { HOME_VIEW_ICONS } from "@vedic-patro/ui/kit/events";
import { CalendarSystemToggle } from "@vedic-patro/ui/kit/shell";
import { requestLocationPicker, requestSearch, requestSignIn } from "@/lib/menu-request";
import { homeHideIsInstant, useHomeStuck } from "@/lib/home-sticky";
import { useTabletHeader } from "@/lib/tablet-ui";
import { monthShortLabel } from "@vedic-patro/domain/calendar/patro-month-labels";
import { monthLengthInBrowseEra } from "@vedic-patro/domain/calendar/patro-browse-range";
import { HeaderDateTitle, usePatroYearLine } from "@/components/patro-date/HeaderDateTitle";
import type { HomePatroView } from "./PatroViewToggle";

type Props = {
  year: number;
  month: number;
  onToday: () => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  patroView: HomePatroView;
  onPatroViewChange: (view: HomePatroView) => void;
  location: PanchangaLocation;
  onLocationChange: (location: PanchangaLocation) => void;
  crossEraSubtitle?: string;
  browseEra: MonthBrowseEra;
  onBrowseEraChange?: (era: MonthBrowseEra) => void;
};

/**
 * Home calendar header, first row on a phone: month badge + year line + place +
 * search + view menu. The badge is the Today trigger (tap it to jump back to
 * today). The second row lives in `BsMonthHeaderRow2` below — it is a direct
 * child of the home scroll, so the scroll view pins it. AppHeader hides itself
 * on home, so this is the whole header there. Tablet and web keep the old
 * top-bar header.
 */
export function BsMonthHeaderTitle({
  year,
  month,
  onToday,
  onMonthChange,
  onYearChange,
  prevDisabled,
  nextDisabled,
  patroView,
  onPatroViewChange,
  location,
  onLocationChange,
  crossEraSubtitle,
  browseEra,
  onBrowseEraChange,
}: Props) {
  const { t, lang, digits } = useLocale();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  // Seven day columns need room: a phone gets Multi Day (two days) instead of Week.
  const { isLargeScreen } = useLayoutMode();
  const tablet = useTabletHeader();
  const yearLine = usePatroYearLine(browseEra, year);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Phone: month, day, multi day, year, panchanga, list in the menu. Tablet: Day | Week | Month |
  // Panchanga, four choices the top bar shows as a segmented switch like iPad Calendar's.
  const views = isLargeScreen ? TABLET_HOME_VIEWS : homeViewsFor(false);
  usePageViewMenu([
    {
      key: "view",
      options: views.map((view) => ({
        icon: HOME_VIEW_ICONS[view],
        key: view,
        label: view === "calendar" ? t("common.month") : t(view === "panchanga" ? "calendar.mode_panchanga" : `calendar.view_${view}`),
        active: patroView === view,
        onPress: () => onPatroViewChange(view),
      })),
    },
  ]);

  if (tablet || Platform.OS === "web") {
    return (
      <TopBarSlot>
        <View className="mb-3">
          <PatroCalendarHeader
            era={browseEra}
            onEraChange={(e) => onBrowseEraChange?.(e as MonthBrowseEra)}
            year={year}
            month={month}
            onChange={(next) => {
              if (next.year !== year) onYearChange(next.year);
              if (next.month !== month) onMonthChange(next.month);
            }}
            location={location}
            onLocationChange={onLocationChange}
            crossEraSubtitle={crossEraSubtitle}
            prevDisabled={prevDisabled}
            nextDisabled={nextDisabled}
          />
        </View>
      </TopBarSlot>
    );
  }

  // The badge: month name over the month's day range, and the year line beside
  // it — year + era + samvatsara (२०८३ वि.सं. युव), AD range underneath. The
  // samvatsara comes from the app's own table, so it agrees with the server.
  const badgeMonth = monthShortLabel(browseEra, month, lang);
  const daysInMonth = monthLengthInBrowseEra(browseEra, year, month);

  // No status-bar padding here: the home scroll itself starts below the status bar (so the
  // pull-to-refresh spinner shows there, as on every other page).
  return (
    <View>
      {/* Row 1: one split button — badge (jump to today) | year line (opens the
          month/year sheet) — then view menu and profile. Row 2 is
          `BsMonthHeaderRow2` below: place, BS | AD, search. */}
      <View className="flex-row items-center gap-2 pb-2">
        <HeaderDateTitle
          badgeTop={badgeMonth}
          badgeBottom={`${digits(1)}–${digits(daysInMonth)}`}
          title={yearLine}
          subtitle={crossEraSubtitle}
          onToday={onToday}
          onPick={() => setPickerOpen(true)}
        />
        <View className="ml-auto flex-row items-center gap-2">
          <ViewMenuButton />
          {/* Profile / login, rightmost. Signed in it opens the account;
              signed out it opens sign-in. */}
          <HeaderButton
            icon={isAuthenticated ? "person-circle-outline" : "person-outline"}
            label={isAuthenticated ? t("account_page.title") : t("auth.sign_in")}
            onPress={() => {
              if (isAuthenticated) router.push("/account" as never);
              else requestSignIn();
            }}
          />
        </View>
      </View>
      {/* The month/year sheet only; the year line above opens it. */}
      <PatroCalendarHeader
        buttonless
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        era={browseEra}
        onEraChange={(e) => onBrowseEraChange?.(e as MonthBrowseEra)}
        year={year}
        month={month}
        onChange={(next) => {
          if (next.year !== year) onYearChange(next.year);
          if (next.month !== month) onMonthChange(next.month);
        }}
      />
    </View>
  );
}

type Row2Props = {
  year: number;
  month: number;
  browseEra: MonthBrowseEra;
  onBrowseEraChange?: (era: MonthBrowseEra) => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  location: PanchangaLocation;
  onLocationChange: (location: PanchangaLocation) => void;
  /** Side padding, so the row lines up with the rest of the page (the
      mantra card and the other sections use the same inset). */
  horizontalInset: number;
  /**
   * Pinned at the top of the screen (the sticky copy, rendered outside the
   * scroll by index.tsx when the page is scrolled). A plain view, not an
   * animated one — see lib/home-sticky.ts for why.
   */
  fixed?: boolean;
  /** Only for the pinned copy: whether it is showing right now. It stays
      mounted and fades/slides in and out, so the takeover never pops. */
  visible?: boolean;
};

/**
 * The second row: month stepper + BS | AD. The month shows alone (the year
 * already sits in row 1) and the month title opens the same picker sheet as
 * before. The search icon lives only on the pinned copy — the in-page row has
 * none, so there is never a second search icon.
 *
 * It is rendered twice on a phone, with the same month and handlers: once in
 * the page, right under the first row, and once pinned at the top of the
 * screen (`fixed`). The pinned copy stays mounted and fades/slides in and out
 * on `visible` (React Native's own Animated on a plain view), so it takes over
 * from the in-page row without a pop or a flicker. It is a plain view — nothing
 * animated owns whether it shows, so it cannot go invisible the way an
 * animated overlay did.
 */
export function BsMonthHeaderRow2({
  location,
  onLocationChange,
  horizontalInset,
  fixed,
  visible: visibleProp,
}: Row2Props) {
  // The pinned copy follows the sticky flag itself, so a flip re-renders this row, not the home page.
  const stuck = useHomeStuck();
  const visible = visibleProp ?? (fixed ? stuck : true);
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  // 0 hidden, 1 shown. Only the pinned copy moves: scrolling up slides it
  // down from above the screen, scrolling down slides it back up — the
  // usual quick-return header. When the in-page row (or the pinned aside
  // tabs) reaches that spot it vanishes on the spot instead, since the row
  // underneath is already in the same place (homeHideIsInstant). It is
  // unmounted while hidden, so it never covers the pull-to-refresh spinner
  // or takes the pull-down gesture at the top of the page.
  const [mounted, setMounted] = useState(fixed ? visible : true);
  const [height, setHeight] = useState(160);
  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    if (!fixed) return;
    if (visible) {
      setMounted(true);
    } else if (homeHideIsInstant()) {
      anim.stopAnimation();
      anim.setValue(0);
      setMounted(false);
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [fixed, visible, anim]);
  useEffect(() => {
    if (!fixed || !mounted || !visible) return;
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fixed, mounted, visible, anim]);
  const row = (
    <View className="flex-row items-center gap-2 py-2" style={{ paddingHorizontal: horizontalInset }}>
      {/* The button only: it asks the root place picker to open (AppOverlays). A sheet
          owned by this row closed itself — the row is drawn twice and the pinned copy
          unmounts as the page scrolls. */}
      <PatroHeaderLocation
        className="min-w-0 shrink"
        location={location}
        onLocationChange={onLocationChange}
        open={false}
        onOpenChange={(next) => {
          if (next) requestLocationPicker();
        }}
      />
      <View className="flex-1" />
      <CalendarSystemToggle large />
      {/* Search lives on the second row now (in-page and pinned alike). */}
      <HeaderButton icon="search-outline" label={t("ui.search.search")} onPress={requestSearch} />
    </View>
  );
  if (!fixed) {
    return (
      <View className="border-b border-border bg-background">
        {row}
      </View>
    );
  }
  if (!mounted) return null;
  return (
    // Background and border sit in plain styles, not classes: NativeWind
    // classes on an animated view are dropped, which would leave the pinned
    // row see-through over the scrolling page.
    <Animated.View
      style={[
        { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, paddingTop: insets.top, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
        { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-height, 0] }) }] },
      ]}
      pointerEvents={visible ? "auto" : "none"}
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
    >
      {row}
    </Animated.View>
  );
}
