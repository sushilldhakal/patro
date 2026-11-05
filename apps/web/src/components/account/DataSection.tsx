import { useNavigate } from "@tanstack/react-router";
import type { useAccountPage } from "@vedic-patro/features/account";
import { useLocale } from "@vedic-patro/i18n/react";
import { ListGroup, ListRow } from "@vedic-patro/ui/kit/account";

/** Account → Account data: where deleting the account lives, out of the way of the main list. */
export function DataSection({ page }: { page: ReturnType<typeof useAccountPage> }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { copy } = page;
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 px-1 text-xs text-muted-foreground">{t("ui.account.account_data_body")}</p>
      <ListGroup>
        <ListRow
          icon="trash"
          title={copy.deleteAccount}
          tone="danger"
          onPress={async () => {
            if (!confirm(copy.deleteAccountConfirm)) return;
            if (await page.deleteAccount()) void navigate({ to: "/" });
            else alert(copy.deleteAccountError);
          }}
        />
      </ListGroup>
    </div>
  );
}
