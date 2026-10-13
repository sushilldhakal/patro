import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "@vedic-patro/i18n/react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiResetPassword, ApiError } from "@/lib/auth/client";
import { useRouteLoading } from "@/lib/route-loading";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/domain/utils";

export function ResetPassword() {
  useRouteLoading(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useMemo(
    () => new URLSearchParams(window.location.search).get("token"),
    [],
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t("auth.password_min"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.passwords_mismatch"));
      return;
    }
    if (!token) {
      setError(t("auth.reset_invalid_link"));
      return;
    }
    setBusy(true);
    try {
      await apiResetPassword(token, password);
      setDone(true);
      setTimeout(() => void navigate({ to: "/" }), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? t("auth.reset_failed") : t("auth.reset_failed"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className={cn("flex min-h-[50vh] flex-col px-4", accountClasses.panelCentered)}>
        <CheckCircle2 className="size-12 text-emerald-500" />
        <h1 className={accountClasses.statusTitle}>{t("auth.reset_done_title")}</h1>
        <p className={accountClasses.statusBody}>{t("auth.reset_done_body")}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-[50vh] flex-col px-4", accountClasses.panel)}>
      <h1 className={accountClasses.formTitle}>{t("auth.reset_page_title")}</h1>
      <p className={accountClasses.statusBody}>{t("auth.reset_page_desc")}</p>

      {token === null ? (
        <div className={cn("flex", accountClasses.loadingRow)}>
          <Loader2 className="size-4 animate-spin" /> {t("common.loading")}
        </div>
      ) : (
        <form onSubmit={onSubmit} className={cn("flex flex-col", accountClasses.form)}>
          <div className={cn("flex flex-col", accountClasses.field)}>
            <label className={accountClasses.label} htmlFor="new-password">
              {t("auth.new_password")}
            </label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.password_hint")}
              required
            />
          </div>
          <div className={cn("flex flex-col", accountClasses.field)}>
            <label className={accountClasses.label} htmlFor="confirm-password">
              {t("auth.confirm_password")}
            </label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error && <p className={accountClasses.formError}>{error}</p>}
          <Button type="submit" size="lg" disabled={busy} className={accountClasses.submit}>
            {busy ? t("auth.updating") : t("auth.update_password")}
          </Button>
          <Link to="/" className={cn("hover:text-foreground", accountClasses.backLink)}>
            {t("common.back_home")}
          </Link>
        </form>
      )}
    </div>
  );
}
