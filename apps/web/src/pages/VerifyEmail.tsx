import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { useVerifyEmailPage } from "@vedic-patro/features/account";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Button } from "@/components/ui/button";
import { useRouteLoading } from "@/lib/route-loading";
import { useAuth } from "@/lib/auth/AuthContext";

/** Confirm an email address — the website's drawing of `useVerifyEmailPage` (@vedic-patro/features). */
export function VerifyEmail() {
  const { refreshUser } = useAuth();
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token"), []);
  const page = useVerifyEmailPage(token, refreshUser);
  useRouteLoading(page.status === "loading");

  return (
    <div className={cn("flex min-h-[50vh] flex-col px-4", accountClasses.panelCentered)}>
      {page.status === "ok" && (
        <>
          <CheckCircle2 className="size-12 text-emerald-500" />
          <h1 className={accountClasses.statusTitle}>{page.copy.okTitle}</h1>
          <p className={accountClasses.statusBody}>{page.copy.okBody}</p>
          <Button asChild className={accountClasses.statusAction}>
            <Link to="/account">{page.copy.goToAccount}</Link>
          </Button>
        </>
      )}
      {page.status === "error" && (
        <>
          <XCircle className="size-12 text-destructive" />
          <h1 className={accountClasses.statusTitle}>{page.copy.failTitle}</h1>
          <p className={accountClasses.statusBody}>{page.copy.failBody}</p>
          <Button asChild variant="outline" className={accountClasses.statusAction}>
            <Link to="/account">{page.copy.backToAccount}</Link>
          </Button>
        </>
      )}
    </div>
  );
}
