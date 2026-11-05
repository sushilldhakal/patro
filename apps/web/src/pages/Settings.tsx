import { AccountPage } from "@/components/account/AccountPage";

/** `/account/settings`: the profile page with Language and calendar open. */
export function Settings() {
  return <AccountPage initialSection="language" />;
}
