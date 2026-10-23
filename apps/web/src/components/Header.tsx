import { useState } from "react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Star,
  Sparkles,
  Sun,
  Moon,
  Menu,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CalendarSystemToggle } from "@vedic-patro/ui/kit/shell";
import { MobileNavMenu } from "@/components/MobileNavMenu";
import { isJyotishRoute, isPanchangaRoute } from "@/lib/app-routes";
import { useLocale } from "@/i18n/locale";
import { featureIcon } from "@/lib/nav-icons";
import { shellClasses } from "@vedic-patro/design-tokens/classes/shell-classes";

const PANCHANGA_LINKS = [
  { to: "/panchanga" as const, labelKey: "nav.surya_panchanga", icon: featureIcon("panchanga") },
  { to: "/suryakranti" as const, labelKey: "nav.suryakranti", icon: featureIcon("suryakranti") },
  { to: "/abhijit-muhurta" as const, labelKey: "nav.abhijit_muhurta", icon: featureIcon("abhijit") },
  { to: "/dainikkranti" as const, labelKey: "nav.dainikkranti", icon: featureIcon("dainikkranti") },
  { to: "/panchanga/avakahada-chakra" as const, labelKey: "nav.avakahada_chakra", icon: featureIcon("avakahada") },
] as const;

const JYOTISH_LINKS = [
  { to: "/kundali" as const, labelKey: "nav.jyotish_kundali", icon: featureIcon("kundali") },
  { to: "/jyotish/kundali-milan" as const, labelKey: "nav.jyotish_kundali_milan", icon: featureIcon("kundali-milan") },
  { to: "/jyotish/rashifal" as const, labelKey: "nav.jyotish_rashifal", icon: featureIcon("rashifal") },
] as const;

// Order matters — these render after the पञ्चाङ्ग and ज्योतिष dropdowns.
const NAV = [
  { to: "/vastu" as const, labelKey: "nav.vastu", icon: featureIcon("vastu") },
  { to: "/learn" as const, labelKey: "nav.learn", icon: featureIcon("learn") },
  { to: "/documents" as const, labelKey: "nav.documents", icon: featureIcon("documents") },
] as const;

const desktopLinkClass = cn(
  "flex transition-colors hover:text-foreground hover:bg-muted [&.active]:text-secondary [&.active]:bg-secondary/10",
  shellClasses.navLink,
);

const desktopSubLinkClass = cn(
  "flex hover:bg-muted hover:text-foreground [&.active]:bg-secondary/10 [&.active]:text-secondary",
  shellClasses.navSubLink,
);

function JyotishNavDropdown() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = isJyotishRoute(pathname);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(desktopLinkClass, isActive && "active")}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <Sparkles className="size-4" />
          {t("nav.jyotish")}
          <ChevronDown
            className={cn("size-3.5 opacity-60 transition-transform", open && "rotate-180")}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-52 p-1">
        {JYOTISH_LINKS.map(({ to, labelKey, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={desktopSubLinkClass}
            activeProps={{ className: "active" }}
            onClick={() => setOpen(false)}
          >
            <Icon className="size-4 shrink-0" />
            {t(labelKey)}
          </Link>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function PanchangaNavDropdown() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = isPanchangaRoute(pathname);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(desktopLinkClass, isActive && "active")}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <Star className="size-4" />
          {t("nav.surya_panchanga")}
          <ChevronDown
            className={cn("size-3.5 opacity-60 transition-transform", open && "rotate-180")}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-52 p-1">
        {PANCHANGA_LINKS.map(({ to, labelKey, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={desktopSubLinkClass}
            activeProps={{ className: "active" }}
            onClick={() => setOpen(false)}
          >
            <Icon className="size-4 shrink-0" />
            {t(labelKey)}
          </Link>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function BrandLogo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/favicon.svg"
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden
    />
  );
}

function BrandMark({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <Link to="/" className={cn("flex group", shellClasses.brand, className)}>
      <BrandLogo
        size={42}
      />
      <span className={cn("truncate", shellClasses.brandName)}>
        <span className={shellClasses.brandVedic}>{t("brand_vedic")}</span>
        <span className={shellClasses.brandPatro}> {t("brand_patro")}</span>
      </span>
    </Link>
  );
}

function ThemeToggle({ className, showLabel }: { className?: string; showLabel?: boolean }) {
  const { t } = useTranslation();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isDark = (resolvedTheme ?? theme) === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        showLabel
          ? "flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-semibold hover:bg-muted hover:text-foreground transition-colors shrink-0"
          : "size-9 rounded-lg border border-border flex items-center justify-center hover:text-foreground hover:bg-muted transition-colors shrink-0",
        className,
      )}
      aria-label={t("theme_toggle")}
    >
      <Sun className="size-4 hidden dark:block" />
      <Moon className="size-4 dark:hidden" />
      {showLabel ? (
        <span>{isDark ? t("theme_light") : t("theme_dark")}</span>
      ) : null}
    </button>
  );
}

function MenuPreferences() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-foreground">{t("language")}</span>
        <LanguageSwitcher />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-foreground">{t("calendar_system.label")}</span>
        <CalendarSystemToggle />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-foreground">{t("theme_toggle")}</span>
        <ThemeToggle showLabel />
      </div>
    </div>
  );
}

function DrawerBrandHeader() {
  const { t } = useTranslation();

  return (
    <DrawerHeader className={cn("text-left", shellClasses.drawerHeader)}>
      <div className={cn("flex", shellClasses.drawerBrandRow)}>
        <BrandLogo size={36} className="rounded-[22%] shadow" />
        <div>
          <DrawerTitle className={shellClasses.drawerTitle}>
            <span className={shellClasses.drawerTitleVedic}>{t("brand_vedic")}</span>
            <span className={shellClasses.drawerTitlePatro}> {t("brand_patro")}</span>
          </DrawerTitle>
          <DrawerDescription>{t("tagline")}</DrawerDescription>
        </div>
      </div>
    </DrawerHeader>
  );
}

export function Header() {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tabletOpen, setTabletOpen] = useState(false);

  return (
    <header
      lang={lang}
      className={cn("sticky top-0 z-50 backdrop-blur-md", shellClasses.header)}
    >
      <div className={cn("py-4 h-16 flex gap-3", shellClasses.headerInner)}>
        {/* Desktop — brand left, nav center, theme right */}
        <BrandMark className="hidden lg:flex" />

        <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
          <PanchangaNavDropdown />
          <JyotishNavDropdown />
          {NAV.map(({ to, labelKey, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={desktopLinkClass}
              activeProps={{ className: "active" }}
            >
              <Icon className="size-4" />
              {t(labelKey)}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <CalendarSystemToggle />
          <LanguageSwitcher />
          <ThemeToggle />
          <AccountMenu />
        </div>

        {/* Mobile (< 768px) — menu left, brand center, account right; sheet from left */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full md:hidden">
          <div className="flex justify-start">
            <Drawer direction="left" open={mobileOpen} onOpenChange={setMobileOpen}>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0" aria-label={t("menu_open")}>
                  <Menu className="size-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="flex h-full flex-col p-0">
                <DrawerBrandHeader />
                <div className="flex-1 overflow-y-auto">
                  <MobileNavMenu onNavigate={() => setMobileOpen(false)} />
                </div>
                <DrawerFooter className="border-t border-border gap-3">
                  <MenuPreferences />
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <Link to="/privacy" onClick={() => setMobileOpen(false)}>
                      {t("footer.privacy")}
                    </Link>
                    <Link to="/terms" onClick={() => setMobileOpen(false)}>
                      {t("footer.terms")}
                    </Link>
                  </div>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <BrandMark className="justify-center" />

          <div className="flex justify-end items-center shrink-0">
            <AccountMenu />
          </div>
        </div>

        {/* Tablet (768px–1023px) — menu left, brand center, lang/theme/account right */}
        <div className="hidden md:grid lg:hidden grid-cols-[1fr_auto_1fr] items-center w-full">
          <div className="flex justify-start">
            <Drawer direction="left" open={tabletOpen} onOpenChange={setTabletOpen}>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0" aria-label={t("menu_open")}>
                  <Menu className="size-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="flex h-full flex-col p-0">
                <DrawerBrandHeader />
                <div className="flex-1 overflow-y-auto">
                  <MobileNavMenu onNavigate={() => setTabletOpen(false)} />
                </div>
              </DrawerContent>
            </Drawer>
          </div>

          <BrandMark className="justify-center" />

          <div className="flex justify-end items-center gap-2">
            <CalendarSystemToggle />
            <LanguageSwitcher />
            <ThemeToggle />
            <AccountMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
