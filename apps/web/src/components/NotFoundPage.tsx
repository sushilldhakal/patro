import { Link } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "@vedic-patro/i18n/react";
import { Button } from "@/components/ui/button";

/**
 * Any address the router does not know. nginx answers every unknown path with the app's HTML and
 * status 200, so without this the page carried the route's default `index, follow` and Search
 * Console counted it as a duplicate of the home page. The later Helmet wins over RouteSeo's.
 */
export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Helmet>
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <h1 className="text-xl font-semibold">{t("common.not_found")}</h1>
      <Button asChild variant="outline">
        <Link to="/">{t("common.back_home")}</Link>
      </Button>
    </div>
  );
}
