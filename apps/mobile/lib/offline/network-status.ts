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

/** One-off connectivity check for use outside components (query functions, background jobs). */
export async function isCurrentlyOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return isOnlineState(state);
}

export async function isCurrentlyOnWifi(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.type === "wifi";
}
