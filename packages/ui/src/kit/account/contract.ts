import type { ReactNode } from "react";
import type { ACCOUNT_ICONS } from "./icons";

/** The profile page as a list, drawn the same on the website and in the app: titled groups of rows. */
export type AccountIconName = keyof typeof ACCOUNT_ICONS;

export type ListGroupProps = {
  title?: string;
  children: ReactNode;
};

export type ListRowProps = {
  icon: AccountIconName;
  title: string;
  /** A line under the title. */
  subtitle?: string;
  /** Shown on the right, in grey. */
  value?: string;
  onPress?: () => void;
  /** A control on the right instead of the chevron (a switch). */
  trailing?: ReactNode;
  /** "danger" tints the icon and title red (sign out, delete). */
  tone?: "default" | "danger";
};
