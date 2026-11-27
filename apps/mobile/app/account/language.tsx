import { Redirect } from "expo-router";

/** Old link: language and calendar now live on Preferences → General. */
export default function LanguageRedirect() {
  return <Redirect href={"/account/preferences?tab=general" as never} />;
}
