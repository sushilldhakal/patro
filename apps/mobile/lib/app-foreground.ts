import { AppState } from "react-native";
import { setAppForeground } from "@vedic-patro/features/common";

/**
 * Reports the app's foreground state to the shared page hooks, whose live clocks pause in the
 * background (a chart redrawn while backgrounded is an Android ANR, Sentry PATRO-D). Imported
 * once by the root layout; the listener lives as long as the process.
 */
setAppForeground(AppState.currentState === "active" || AppState.currentState == null);
AppState.addEventListener("change", (next) => setAppForeground(next === "active"));
