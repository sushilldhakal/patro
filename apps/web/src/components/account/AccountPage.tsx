import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTheme } from "next-themes";
import { ChevronLeft, MailWarning } from "lucide-react";
import { useAccountPage } from "@vedic-patro/features/account";
import { useCalculationSystem, useCalendarSystem, useLocale } from "@vedic-patro/i18n/react";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { ListGroup, ListRow } from "@vedic-patro/ui/kit/account";
import { DataSection } from "./DataSection";
import { EventsSection } from "./EventsSection";
import { AppearanceSection, LanguageCalendarSection } from "./PreferenceSections";
import { ProfilesSection } from "./ProfilesSection";
import { useRouteLoading } from "@/lib/route-loading";
import { useAuth } from "@/lib/auth/AuthContext";

export type AccountSection = "events" | "profiles" | "language" | "appearance" | "data";

/**
 * The profile page, one page as in the app: who you are, then titled groups of rows — your calendar
 * (events, tasks, appointments and the Google / Apple link), your account (saved profiles, account
 * data), the settings (language and calendar, appearance) — and sign out at the foot. A row opens its
 * section in place, under a back row; deleting the account is one step further in, under Account data.
 */
export function AccountPage({ initialSection = null }: { initialSection?: AccountSection | null }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const { t, lang, digits } = useLocale();
  const { calendar } = useCalendarSystem();
  const { system } = useCalculationSystem();
  const { theme } = useTheme();
  const page = useAccountPage({ auth });
  const { status, user, copy, verification } = page;
  const [section, setSection] = useState<AccountSection | null>(initialSection);

  useEffect(() => {
    if (status === "signed-out") void navigate({ to: "/" });
  }, [status, navigate]);

  useRouteLoading(status !== "ready" || page.listStatus === "loading");

  if (status !== "ready" || !user) return null;

  const themeLabel = theme === "light" ? t("theme_light") : theme === "dark" ? t("theme_dark") : t("ui.settings.theme_system");
  const languageValue = `${lang === "en" ? t("ui.settings.language_en") : t("ui.settings.language_ne")} · ${calendar === "ad" ? t("calendar_system.ad") : t("calendar_system.bs")}`;
  const titles: Record<AccountSection, string> = {
    events: t("ui.account.events_and_sync"),
    profiles: copy.profilesTitle,
    language: t("ui.settings.language_calendar"),
    appearance: t("ui.settings.appearance"),
    data: t("ui.account.account_data"),
  };
  const content: Record<AccountSection, ReactNode> = {
    events: <EventsSection />,
    profiles: <ProfilesSection page={page} />,
    language: <LanguageCalendarSection />,
    appearance: <AppearanceSection />,
    data: <DataSection page={page} />,
  };

  if (section) {
    return (
      <div className={cn(accountClasses.pageInner, accountClasses.column)}>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setSection(null)}
            aria-label={t("ui.account.back")}
            className={accountClasses.pageBackLink}
          >
            <ChevronLeft className="size-5" />
            {t("ui.nav.profile")}
          </button>
          <h1 className={cn("m-0", accountClasses.title)}>{titles[section]}</h1>
        </div>
        {content[section]}
      </div>
    );
  }

  return (
    <div className={cn(accountClasses.pageList, accountClasses.column)}>
      {/* Who you are. */}
      <div className={cn("flex", accountClasses.identityCard)}>
        <span className={accountClasses.pageAvatar}>
          {(user.email[0] ?? "?").toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className={cn("m-0 truncate", accountClasses.title)}>{copy.title}</h1>
          <p className={cn("m-0 truncate", accountClasses.subtitle)}>{user.email}</p>
        </div>
      </div>

      {verification.needed ? (
        <div className={cn("flex", accountClasses.banner)}>
          <MailWarning className={cn("size-4 text-amber-600 dark:text-amber-400", accountClasses.bannerIcon)} />
          <div className="flex-1">
            <p className={accountClasses.bannerText}>{copy.verifyEmail}</p>
            <button
              type="button"
              disabled={verification.sent}
              className={cn("hover:underline disabled:opacity-60", accountClasses.bannerAction)}
              onClick={verification.resend}
            >
              {verification.label}
            </button>
          </div>
        </div>
      ) : null}

      <ListGroup title={t("ui.account.group_calendar")}>
        <ListRow icon="calendar" title={t("ui.account.events_and_sync")} onPress={() => setSection("events")} />
      </ListGroup>

      <ListGroup title={t("ui.account.group_account")}>
        <ListRow
          icon="people"
          title={copy.profilesTitle}
          value={page.profiles.length > 0 ? digits(page.profiles.length) : undefined}
          onPress={() => setSection("profiles")}
        />
        <ListRow icon="shield" title={t("ui.account.account_data")} onPress={() => setSection("data")} />
      </ListGroup>

      <ListGroup title={t("ui.settings.title")}>
        <ListRow
          icon="language"
          title={t("ui.settings.language_calendar")}
          subtitle={system === "drik" ? t("calculation_system.drik") : t("calculation_system.surya_siddhanta")}
          value={languageValue}
          onPress={() => setSection("language")}
        />
        <ListRow icon="palette" title={t("ui.settings.appearance")} value={themeLabel} onPress={() => setSection("appearance")} />
      </ListGroup>

      <ListGroup>
        <ListRow icon="logout" title={t("account_page.sign_out")} tone="danger" onPress={() => void auth.logout()} />
      </ListGroup>
    </div>
  );
}
