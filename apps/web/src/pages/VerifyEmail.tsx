import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "@vedic-patro/i18n/react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouteLoading } from "@/lib/route-loading";
import { apiVerifyEmail } from "@/lib/auth/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/domain/utils";

export function VerifyEmail() {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const token = useMemo(
    () => new URLSearchParams(window.location.search).get("token"),
    [],
  );
  const [status, setStatus] = useState<"loading" | "ok" | "error">(() =>
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState(() =>
    token ? "" : t("auth.verify_missing_token"),
  );

  useEffect(() => {
    if (!token) return;
    apiVerifyEmail(token)
      .then(async () => {
        setStatus("ok");
        await refreshUser();
      })
      .catch(() => {
        setStatus("error");
        setMessage(t("auth.verify_failed"));
      });
  }, [refreshUser, t, token]);

  useRouteLoading(status === "loading");

  return (
    <div className={cn("flex min-h-[50vh] flex-col px-4", accountClasses.panelCentered)}>
      {status === "loading" && null}
      {status === "ok" && (
        <>
          <CheckCircle2 className="size-12 text-emerald-500" />
          <h1 className={accountClasses.statusTitle}>{t("auth.verify_ok_title")}</h1>
          <p className={accountClasses.statusBody}>{t("auth.verify_ok_body")}</p>
          <Button asChild className={accountClasses.statusAction}>
            <Link to="/account">{t("auth.go_to_account")}</Link>
          </Button>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle className="size-12 text-destructive" />
          <h1 className={accountClasses.statusTitle}>{t("auth.verify_fail_title")}</h1>
          <p className={accountClasses.statusBody}>{message}</p>
          <Button asChild variant="outline" className={accountClasses.statusAction}>
            <Link to="/account">{t("auth.back_to_account")}</Link>
          </Button>
        </>
      )}
    </div>
  );
}
