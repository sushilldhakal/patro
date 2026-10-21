import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useResetPasswordPage } from "@vedic-patro/features/account";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouteLoading } from "@/lib/route-loading";
import { useSearchToken } from "@/lib/use-search-token";

/** Set a new password — the website's drawing of `useResetPasswordPage` (@vedic-patro/features). */
export function ResetPassword() {
  useRouteLoading(false);
  const navigate = useNavigate();
  const token = useSearchToken();
  const page = useResetPasswordPage(token, () => void navigate({ to: "/" }));

  if (page.done) {
    return (
      <div className={cn("flex min-h-[50vh] flex-col px-4", accountClasses.panelCentered)}>
        <CheckCircle2 className="size-12 text-emerald-500" />
        <h1 className={accountClasses.statusTitle}>{page.copy.doneTitle}</h1>
        <p className={accountClasses.statusBody}>{page.copy.doneBody}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-[50vh] flex-col px-4", accountClasses.panel)}>
      <h1 className={accountClasses.formTitle}>{page.copy.title}</h1>
      <p className={accountClasses.statusBody}>{page.copy.description}</p>
      {token === null ? (
        <div className={cn("flex", accountClasses.loadingRow)}>
          <Loader2 className="size-4 animate-spin" /> {page.copy.loading}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void page.submit();
          }}
          className={cn("flex flex-col", accountClasses.form)}
        >
          <div className={cn("flex flex-col", accountClasses.field)}>
            <label className={accountClasses.label} htmlFor="new-password">
              {page.copy.newPassword}
            </label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={page.password}
              onChange={(e) => page.setPassword(e.target.value)}
              placeholder={page.copy.passwordHint}
              required
            />
          </div>
          <div className={cn("flex flex-col", accountClasses.field)}>
            <label className={accountClasses.label} htmlFor="confirm-password">
              {page.copy.confirmPassword}
            </label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={page.confirm}
              onChange={(e) => page.setConfirm(e.target.value)}
              required
            />
          </div>
          {page.error && <p className={accountClasses.formError}>{page.error}</p>}
          <Button type="submit" size="lg" disabled={page.busy} className={accountClasses.submit}>
            {page.copy.submit}
          </Button>
          <Link to="/" className={cn("hover:text-foreground", accountClasses.backLink)}>
            {page.copy.backHome}
          </Link>
        </form>
      )}
    </div>
  );
}
