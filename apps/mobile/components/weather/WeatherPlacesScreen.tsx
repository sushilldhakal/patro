import { useEffect, useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type PressableProps } from "react-native";
import Animated, { FadeIn, LinearTransition, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { cssInterop } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { WeatherPage } from "@vedic-patro/features/weather";
import { cn } from "@vedic-patro/design-tokens/cn";
import { weatherClasses as wc } from "@vedic-patro/design-tokens/classes/weather-classes";
import { CSS_EASE_OUT, DURATION, PRESS_SCALE, useReducedMotionPref } from "@vedic-patro/ui/motion";
import { UiIcon, WeatherGlyph } from "@vedic-patro/ui/kit/weather";
import { Input, Sheet } from "@vedic-patro/ui";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { LocationSearchSheet } from "@/components/search/LocationSearchSheet";
import { Text } from "@/components/ui/Text";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { __iconNode as Trash2Node } from "lucide-react/dist/esm/icons/trash-2";
import { __iconNode as PencilNode } from "lucide-react/dist/esm/icons/pencil";
import { SwipeableRow } from "@/components/ui/SwipeableRow";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";

/**
 * The weather page's places screen and its parts, shared with the app header's place picker
 * (components/search/LocationPlacesScreen), so both are the same screen.
 */

const ScalePressable = cssInterop(Animated.createAnimatedComponent(Pressable), {
  className: "style",
});

/** Buttons scale to 0.97 on press-in (ease-out, the app's fast duration); full-width rows highlight instead. */
export function PressScale({
  className,
  children,
  ...rest
}: PressableProps & { className?: string; children: ReactNode }) {
  const reduced = useReducedMotionPref();
  const [pressed, setPressed] = useState(false);
  return (
    <ScalePressable
      {...rest}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      pressRetentionOffset={16}
      className={className}
      style={{
        transform: [{ scale: !reduced && pressed ? PRESS_SCALE : 1 }],
        transitionProperty: "transform",
        transitionDuration: reduced ? 0 : DURATION.fast,
        transitionTimingFunction: CSS_EASE_OUT,
      }}
    >
      {children}
    </ScalePressable>
  );
}

/** Saved places: on the device, and on the account when signed in (lib/places-sync). */
export { placesStorage } from "@/lib/places-sync";

/** "+ search": the city search, then "make it primary?". Drawn inside the places screen while it is open, so it stacks above it. */
export function AddFlow({ page }: { page: WeatherPage }) {
  const { places, copy } = page;
  return (
    <>
      <LocationSearchSheet
        open={places.addOpen}
        onClose={() => places.setAddOpen(false)}
        onPick={places.pick}
      />
      <Sheet
        open={places.pending != null}
        onClose={places.cancel}
        title={copy.primaryAsk}
        closeLabel={copy.close}
        placement="center"
      >
        <Text className={wc.infoBody} style={nepaliTextStyle()}>
          {copy.primaryAskBody}
        </Text>
        <View className={cn("flex-row", wc.dialogActions)}>
          <PressScale
            accessibilityRole="button"
            onPress={() => places.confirm(false)}
            className={wc.chip}
          >
            <Text className={wc.chipText} style={nepaliTextStyle()}>
              {copy.justAdd}
            </Text>
          </PressScale>
          <PressScale
            accessibilityRole="button"
            onPress={() => places.confirm(true)}
            className={wc.chipActive}
          >
            <Text className={wc.chipTextActive} style={nepaliTextStyle()}>
              {copy.makePrimary}
            </Text>
          </PressScale>
        </View>
      </Sheet>
    </>
  );
}

function MenuItem({
  label,
  onPress,
  checked,
  chevron,
}: {
  label: string;
  onPress: () => void;
  checked?: boolean;
  chevron?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={checked == null ? undefined : { checked }}
      onPress={onPress}
      className={wc.menuItem}
    >
      <Text className={wc.menuItemText} style={nepaliTextStyle()}>
        {label}
      </Text>
      {checked ? <UiIcon name="check" size={18} /> : null}
      {chevron ? <UiIcon name="chevron-right" size={18} /> : null}
    </Pressable>
  );
}

/** Units: temperature, wind and rain, each a list with a tick. */
function UnitsSheet({
  page,
  open,
  onClose,
}: {
  page: WeatherPage;
  open: boolean;
  onClose: () => void;
}) {
  const { units, copy } = page;
  const groups = [
    ["temp", copy.unitsTemp],
    ["wind", copy.unitsWind],
    ["rain", copy.unitsRain],
    ["dist", copy.unitsDist],
    ["pressure", copy.unitsPressure],
  ] as const;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={copy.units}
      closeLabel={copy.close}
    >
      {groups.map(([key, title]) => (
        <View key={key}>
          <Text className={wc.unitGroupTitle} style={nepaliTextStyle()}>
            {title}
          </Text>
          {units.options[key].map((o) => (
            <MenuItem
              key={o.id}
              label={o.label}
              checked={units.value[key] === o.id}
              onPress={() => units.set({ [key]: o.id })}
            />
          ))}
        </View>
      ))}
    </Sheet>
  );
}

/** A saved place's edit sheet (swipe-left pencil, or a long press): its name, make it primary, remove it. */
function EditPlaceSheet({ page, id, onClose }: { page: WeatherPage; id: string | null; onClose: () => void }) {
  const { places, copy } = page;
  const place = places.pages.find((p) => p.id === id);
  const [name, setName] = useState("");
  useEffect(() => {
    if (place) setName(place.name);
    // Only when a different place opens: typing must not be reset by a re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const save = () => {
    if (place && name.trim() && name.trim() !== place.name) places.rename(place.id, name);
    onClose();
  };
  return (
    <Sheet open={place != null} onClose={onClose} title={copy.editPlace} closeLabel={copy.close} placement="center">
      <Text className={accountClasses.label} style={nepaliTextStyle()}>
        {copy.placeName}
      </Text>
      <Input value={name} onChange={setName} onSubmit={save} className={accountClasses.input} />
      <View className={cn("flex-row", wc.dialogActions)}>
        <PressScale
          accessibilityRole="button"
          onPress={() => {
            if (place) places.remove(place.id);
            onClose();
          }}
          className={wc.chip}
        >
          <Text className={wc.chipText} style={nepaliTextStyle()}>
            {copy.remove}
          </Text>
        </PressScale>
        {place && !place.primary ? (
          <PressScale
            accessibilityRole="button"
            onPress={() => {
              places.makePrimary(place.id);
              save();
            }}
            className={wc.chip}
          >
            <Text className={wc.chipText} style={nepaliTextStyle()}>
              {copy.makePrimary}
            </Text>
          </PressScale>
        ) : null}
        <PressScale accessibilityRole="button" onPress={save} className={wc.chipActive}>
          <Text className={wc.chipTextActive} style={nepaliTextStyle()}>
            {copy.save}
          </Text>
        </PressScale>
      </View>
    </Sheet>
  );
}

/** One saved place: name, local time, temperature now, condition and today's low / high. */
function PlaceCard({
  page,
  place,
  index,
  onChoose,
  onEdit,
}: {
  page: WeatherPage;
  place: WeatherPage["places"]["pages"][number];
  index: number;
  onChoose?: (index: number) => void;
  onEdit: (id: string) => void;
}) {
  const { places, copy } = page;
  const p = place;
  const s = p.summary;
  const card = (
      <Pressable
        accessibilityRole="button"
        disabled={places.editing}
        // Hold for the place's edit sheet (name, primary, remove); "here" is the GPS city, nothing to edit.
        onLongPress={p.here ? undefined : () => onEdit(p.id)}
        onPress={() => {
          if (onChoose) return onChoose(index);
          places.select(index);
          places.setListOpen(false);
        }}
        className={cn(
          wc.placeCard,
          index === places.index && wc.placeCardActive,
          "active:opacity-80",
        )}
      >
        <View className="flex-row items-start gap-3">
          <View className="flex-1 gap-0.5">
            <View className="flex-row items-center gap-2">
              {p.here ? <UiIcon name="arrow" size={14} /> : null}
              <Text
                className={cn("shrink", wc.placeCardName)}
                numberOfLines={1}
                style={nepaliTextStyle()}
              >
                {p.name}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className={wc.placeCardTime} style={nepaliTextStyle()}>
                {s?.time ?? " "}
              </Text>
              {p.primary ? (
                <Text className={wc.primaryBadge} style={nepaliTextStyle()}>
                  {copy.primary}
                </Text>
              ) : null}
            </View>
          </View>
          {places.editing ? (
            <View className="flex-row">
              {p.primary ? null : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${copy.makePrimary}: ${p.name}`}
                  onPress={() => places.makePrimary(p.id)}
                  hitSlop={6}
                  className="size-11 items-center justify-center"
                >
                  <UiIcon name="star" size={22} />
                </Pressable>
              )}
              {p.here ? null : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${copy.remove}: ${p.name}`}
                  onPress={() => places.remove(p.id)}
                  hitSlop={6}
                  className="size-11 items-center justify-center"
                >
                  <UiIcon name="x" size={22} />
                </Pressable>
              )}
            </View>
          ) : (
            <Text className={wc.placeCardTemp}>{s?.temperature ?? "–"}</Text>
          )}
        </View>
        {s ? (
          <View className="flex-row items-center gap-2">
            <WeatherGlyph glyph={s.glyph} size={24} />
            <Text
              className={cn("flex-1", wc.placeCardMeta)}
              numberOfLines={1}
              style={nepaliTextStyle()}
            >
              {s.glyph.label}
            </Text>
            <Text className={wc.placeCardMeta}>
              L:{s.low} H:{s.high}
            </Text>
          </View>
        ) : null}
      </Pressable>
  );
  return (
    <Animated.View layout={LinearTransition.duration(200)}>
      {/* Swipe left for edit and the bin, or all the way across to remove; "here" can't be removed. */}
      {p.here || places.editing ? (
        card
      ) : (
        <SwipeableRow
          actionLabel={`${copy.remove}: ${p.name}`}
          icon={Trash2Node}
          fullSwipe
          onAction={() => places.remove(p.id)}
          secondary={{ label: `${copy.editPlace}: ${p.name}`, icon: PencilNode, onAction: () => onEdit(p.id) }}
        >
          {card}
        </SwipeableRow>
      )}
    </Animated.View>
  );
}

/**
 * The places screen (the ☰ in the sky): every saved place with its temperature now, today's
 * low / high and its local time; a search bar at the bottom adds one; ⋯ holds edit list and units.
 */
export function PlacesScreen({
  page,
  title,
  onChoose,
}: {
  page: WeatherPage;
  /** The header's picker names it "Location"; the weather page keeps its own title. */
  title?: string;
  /** Tapping a place: by default it shows that place's forecast. */
  onChoose?: (index: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const { places, copy, units } = page;
  const [menuOpen, setMenuOpen] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  // Pushed like any settings page: slides in from the right, follows the finger on a right swipe and
  // slides back out (the page under it shows through the transparent modal).
  const { width } = useWindowDimensions();
  const reduced = useReducedMotionPref();
  const x = useSharedValue(width);
  useEffect(() => {
    if (places.listOpen) x.set(withTiming(0, { duration: reduced ? 0 : DURATION.slow }));
    else x.set(width);
  }, [places.listOpen, reduced, width, x]);
  const finish = () => places.setListOpen(false);
  const close = () => x.set(withTiming(width, { duration: reduced ? 0 : DURATION.standard }, (done) => done && runOnJS(finish)()));
  const swipeBack = Gesture.Pan()
    .activeOffsetX(24)
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      x.set(Math.max(0, e.translationX));
    })
    .onEnd((e) => {
      const out = e.translationX > width / 3 || e.velocityX > 600;
      x.set(withTiming(out ? width : 0, { duration: DURATION.standard }, (done) => done && out && runOnJS(finish)()));
    });
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  return (
    <Modal
      visible={places.listOpen}
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={close}
    >
      {/* A Modal is its own root: gestures need their own root view inside it. A swipe to the right
          goes back, like a pushed page's edge swipe. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={swipeBack}>
      <Animated.View className="flex-1 bg-background" style={[{ paddingTop: insets.top }, slide]}>
        <View className={cn("flex-row", wc.topBar, "pr-3")}>
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={copy.back}
            onPress={close}
            hitSlop={8}
            className="size-11 items-center justify-center"
          >
            <UiIcon name="arrow-left" size={24} tone="foreground" />
          </PressScale>
          <Text
            className={wc.placesTitle}
            numberOfLines={1}
            style={nepaliTextStyle()}
          >
            {title ?? copy.placesTitle}
          </Text>
          {places.editing ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => places.setEditing(false)}
              hitSlop={8}
              className="min-h-11 justify-center px-2"
            >
              <Text className={wc.chipText} style={nepaliTextStyle()}>
                {copy.done}
              </Text>
            </Pressable>
          ) : (
            <PressScale
              accessibilityRole="button"
              accessibilityLabel={copy.moreOptions}
              onPress={() => setMenuOpen(true)}
              hitSlop={8}
              className={wc.roundButton}
            >
              <UiIcon name="ellipsis" size={22} tone="foreground" />
            </PressScale>
          )}
        </View>

        <ScrollView contentContainerClassName="gap-3 px-2.5 pb-4 pt-2">
          {places.pages.map((p, i) => (
            <PlaceCard key={p.id} page={page} place={p} index={i} onChoose={onChoose} onEdit={setEditId} />
          ))}
        </ScrollView>

        <View
          className="px-4 pt-2"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          <Pressable
            accessibilityRole="search"
            accessibilityLabel={copy.searchPlace}
            onPress={() => places.setAddOpen(true)}
            className={cn(wc.searchBar, "active:opacity-80")}
          >
            <UiIcon name="search" size={20} />
            <Text className={wc.searchBarText} style={nepaliTextStyle()}>
              {copy.searchPlace}
            </Text>
          </Pressable>
        </View>

        {menuOpen ? (
          <Pressable
            accessibilityLabel={copy.close}
            onPress={() => setMenuOpen(false)}
            style={StyleSheet.absoluteFill}
          >
            <Animated.View
              entering={FadeIn.duration(150)}
              className={wc.menuCard}
              style={{ top: insets.top + 52 }}
            >
              <MenuItem
                label={copy.editList}
                onPress={() => {
                  setMenuOpen(false);
                  places.setEditing(true);
                }}
              />
              {units.options.temp.map((o) => (
                <MenuItem
                  key={o.id}
                  label={o.label}
                  checked={units.value.temp === o.id}
                  onPress={() => {
                    setMenuOpen(false);
                    units.set({ temp: o.id });
                  }}
                />
              ))}
              <MenuItem
                label={copy.units}
                chevron
                onPress={() => {
                  setMenuOpen(false);
                  setUnitsOpen(true);
                }}
              />
            </Animated.View>
          </Pressable>
        ) : null}
      </Animated.View>
      </GestureDetector>
      </GestureHandlerRootView>
      <UnitsSheet
        page={page}
        open={unitsOpen}
        onClose={() => setUnitsOpen(false)}
      />
      <EditPlaceSheet page={page} id={editId} onClose={() => setEditId(null)} />
      <AddFlow page={page} />
    </Modal>
  );
}
