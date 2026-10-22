import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

/** How long a screen has to stay out of sight before its GL scenes give their memory back. */
const RELEASE_AFTER_MS = 12_000;

/**
 * Whether the screen this runs in is showing: focused in its navigator and the app in the
 * foreground. `released` turns true once it has been out of sight for a while, which is when a
 * heavy resource (a WebGL canvas: framebuffers, textures, a render loop) should be torn down and
 * rebuilt on return. Tab screens stay mounted after you leave them, so without this every 3D scene
 * you ever opened kept its GL context and kept drawing frames in the background.
 */
export function useScreenActive(): { active: boolean; released: boolean } {
  const [focused, setFocused] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [released, setReleased] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => setForeground(state === "active"));
    return () => sub.remove();
  }, []);

  const active = focused && foreground;

  useEffect(() => {
    if (active) {
      setReleased(false);
      return;
    }
    const timer = setTimeout(() => setReleased(true), RELEASE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [active]);

  return { active, released };
}
