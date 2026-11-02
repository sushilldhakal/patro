import { createContext, useContext } from "react";

/**
 * True inside a page pushed over the tabs on the iPhone Duo (DuoPageFrame). A tab scene is false: iOS
 * adds the tab bar's inset to its scroll view itself, a pushed page gets no such inset.
 */
const DuoPushedPageContext = createContext(false);

export const DuoPushedPageProvider = DuoPushedPageContext.Provider;

export function useDuoPushedPage(): boolean {
  return useContext(DuoPushedPageContext);
}
