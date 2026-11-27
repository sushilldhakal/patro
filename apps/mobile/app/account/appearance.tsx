import { Redirect } from "expo-router";

/** Old link: the theme now lives on Preferences → Appearance. */
export default function AppearanceRedirect() {
  return <Redirect href={"/account/preferences?tab=appearance" as never} />;
}
