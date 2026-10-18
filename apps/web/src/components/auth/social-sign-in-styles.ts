import { cn } from "@vedic-patro/design-tokens/cn";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";

/** Shared pill button — follows app background/border in light and dark. */
export const socialSignInButtonClass = cn(
  accountClasses.socialButton,
  accountClasses.socialButtonText,
  "w-[300px] shadow-none",
  "hover:bg-muted/60",
);
