import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Star,
  Sparkles,
  BookOpen,
  BookMarked,
  Compass,
  Sun,
  Moon,
  Menu,
  ChevronDown,
  Sunrise,
  Grid3x3,
  Heart,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "../lib/utils";
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
import { MobileNavMenu } from "@/components/MobileNavMenu";
import { isJyotishRoute, isPanchangaRoute } from "@/lib/app-routes";
import { useLocale } from "@/i18n/locale";

const PANCHANGA_LINKS = [
  { to: "/panchanga" as const, labelKey: "nav.surya_panchanga", icon: Star },
  { to: "/suryakranti" as const, labelKey: "nav.suryakranti", icon: Sunrise },
  { to: "/abhijit-muhurta" as const, labelKey: "nav.abhijit_muhurta", icon: Sparkles },
  { to: "/dainikkranti" as const, labelKey: "nav.dainikkranti", icon: Moon },
  { to: "/panchanga/avakahada-chakra" as const, labelKey: "nav.avakahada_chakra", icon: Grid3x3 },
] as const;

const JYOTISH_LINKS = [
  { to: "/kundali" as const, labelKey: "nav.jyotish_kundali", icon: Sparkles },
  { to: "/jyotish/kundali-milan" as const, labelKey: "nav.jyotish_kundali_milan", icon: Heart },
  { to: "/jyotish/rashifal" as const, labelKey: "nav.jyotish_rashifal", icon: Sun },
] as const;

// Order matters — these render after the पञ्चाङ्ग and ज्योतिष dropdowns.
const NAV = [
  { to: "/vastu" as const, labelKey: "nav.vastu", icon: Compass },
  { to: "/learn" as const, labelKey: "nav.learn", icon: BookOpen },
  { to: "/documents" as const, labelKey: "nav.documents", icon: BookMarked },
] as const;

const desktopLinkClass =
  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors hover:text-foreground hover:bg-muted [&.active]:text-secondary [&.active]:bg-secondary/10";

const desktopSubLinkClass =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted hover:text-foreground [&.active]:bg-secondary/10 [&.active]:text-secondary";

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
    <Link to="/" className={cn("flex items-center gap-2.5 group min-w-0", className)}>
      <BrandLogo
        size={42}
      />
      <span className="font-bold text-base tracking-tight truncate">
        <span className="text-secondary dark:text-primary">{t("brand_vedic")}</span>
        <span className="text-foreground"> {t("brand_patro")}</span>
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
        <span className="text-sm text-foreground">{t("theme_toggle")}</span>
        <ThemeToggle showLabel />
      </div>
    </div>
  );
}

function DrawerBrandHeader() {
  const { t } = useTranslation();

  return (
    <DrawerHeader className="border-b border-border text-left">
      <div className="flex items-center gap-2.5">
        <BrandLogo size={36} className="rounded-[22%] shadow" />
        <div>
          <DrawerTitle className="text-base">
            <span className="text-secondary">{t("brand_vedic")}</span>
            <span className="text-foreground"> {t("brand_patro")}</span>
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
      className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md"
    >
      <div className="max-w-[1400px] py-4 mx-auto px-4 h-16 flex items-center gap-3">
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
            <LanguageSwitcher />
            <ThemeToggle />
            <AccountMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
