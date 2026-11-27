import { Redirect } from "expo-router";

/** Old link: the settings are on the profile page now. */
export default function SettingsRedirect() {
  return <Redirect href={"/account" as never} />;
}
