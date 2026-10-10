import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiResetPassword, ApiError } from "@/lib/auth/client";
import { useRouteLoading } from "@/lib/route-loading";

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
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <CheckCircle2 className="size-12 text-emerald-500" />
        <h1 className="mt-4 text-xl font-bold text-foreground">{t("auth.reset_done_title")}</h1>
        <p className="mt-1 text-sm">{t("auth.reset_done_body")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col justify-center px-4">
      <h1 className="text-xl font-bold text-foreground">{t("auth.reset_page_title")}</h1>
      <p className="mt-1 text-sm">{t("auth.reset_page_desc")}</p>

      {token === null ? (
        <div className="mt-6 flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" /> {t("common.loading")}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-base text-foreground" htmlFor="new-password">
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
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-base text-foreground" htmlFor="confirm-password">
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={busy} className="mt-1">
            {busy ? t("auth.updating") : t("auth.update_password")}
          </Button>
          <Link to="/" className="text-center text-sm hover:text-foreground">
            {t("common.back_home")}
          </Link>
        </form>
      )}
    </div>
  );
}
