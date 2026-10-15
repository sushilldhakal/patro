import { useEffect, useState } from "react";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

/** True unless NetInfo has positively determined the device is offline. */
function isOnlineState(state: NetInfoState): boolean {
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

/** Live connectivity status — re-renders on every NetInfo change. */
export function useNetworkStatus(): { isOnline: boolean; isWifi: boolean } {
  const [state, setState] = useState<{ isOnline: boolean; isWifi: boolean }>({
    isOnline: true,
    isWifi: false,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((next) => {
      setState({ isOnline: isOnlineState(next), isWifi: next.type === "wifi" });
    });
    NetInfo.fetch().then((next) => {
      setState({ isOnline: isOnlineState(next), isWifi: next.type === "wifi" });
    });
    return unsubscribe;
  }, []);

  return state;
}

/**
 * Last state NetInfo reported. Every API request asks "am I online?" first, and
 * `NetInfo.fetch()` is a native round trip (slow on Android) — so one listener
 * keeps the answer and requests read it instantly instead of each awaiting a fetch.
 */
let lastState: NetInfoState | null = null;
let watching = false;

function watchConnectivity() {
  if (watching) return;
  watching = true;
  NetInfo.addEventListener((next) => {
    lastState = next;
  });
}

async function currentState(): Promise<NetInfoState> {
  watchConnectivity();
  if (lastState) return lastState;
  lastState = await NetInfo.fetch();
  return lastState;
}

/** One-off connectivity check for use outside components (query functions, background jobs). */
export async function isCurrentlyOnline(): Promise<boolean> {
  return isOnlineState(await currentState());
}

export async function isCurrentlyOnWifi(): Promise<boolean> {
  return (await currentState()).type === "wifi";
}
