import type { ReactNode } from "react";

export type PanchangaSidebarLinkArgs = {
  className: string;
  onPrefetch?: () => void;
  children: ReactNode;
};

export type PanchangaSidebarItemView = {
  id: string;
  label: string;
  blurb?: string;
  active: boolean;
  onPress?: () => void;
  onPrefetch?: () => void;
  /** Website link so the row keeps its href. Receives the shared row classes and the label. */
  renderLink?: (args: PanchangaSidebarLinkArgs) => ReactNode;
  trailing?: ReactNode;
};

export type PanchangaSidebarSectionView = {
  id: string;
  title: string;
  expanded: boolean;
  hasActive: boolean;
  onToggle: () => void;
  items: PanchangaSidebarItemView[];
};
