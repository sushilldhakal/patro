import { Redirect } from "expo-router";

/** Old link: the home screen sections now live on Preferences → Appearance. */
export default function HomeScreenRedirect() {
  return <Redirect href={"/account/preferences?tab=appearance" as never} />;
}
