import { Redirect } from "expo-router";

/** Old link: deleting the account now lives at the foot of My profile. */
export default function AccountDataRedirect() {
  return <Redirect href={"/account/me" as never} />;
}
