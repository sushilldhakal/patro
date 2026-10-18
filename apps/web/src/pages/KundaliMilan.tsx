import { useRef } from "react";
import { Heart, LogIn, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AyanamshaSelector } from "@/components/kundali/AyanamshaSelector";
import {
  MilanProfilePicker,
  type MilanProfilePickerHandle,
} from "@/components/kundali/MilanProfilePicker";
import { KundaliMilanResult } from "@/components/kundali/KundaliMilanResult";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/lib/auth/AuthContext";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { useRouteLoading } from "@/lib/route-loading";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@vedic-patro/design-tokens/cn";
import { kundaliClasses } from "@vedic-patro/design-tokens/classes/kundali-classes";
import {
  AYANAMSHA_STORAGE_KEY,
  parseAyanamshaMode,
  useKundaliMilanPage,
  type MilanDetails,
} from "@vedic-patro/features/kundali";

const ayanamshaStorage = {
  load: () => parseAyanamshaMode(typeof localStorage !== "undefined" ? localStorage.getItem(AYANAMSHA_STORAGE_KEY) : null),
};

function BirthDetailsTable({ details }: { details: MilanDetails }) {
  return (
    <section className={kundaliClasses.detailsCard}>
      <div className={kundaliClasses.detailsHeader}>
        <h3 className={kundaliClasses.detailsHeading}>{details.heading}</h3>
      </div>
      <Table>
        <TableBody>
          {details.rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="w-[40%]">{row.label}</TableCell>
              <TableCell className="text-base">{row.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

export function KundaliMilan() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const pickerRef = useRef<MilanProfilePickerHandle>(null);
  const page = useKundaliMilanPage({ isAuthenticated, authLoading, ayanamshaStorage });
  const { status, authDialog, copy, boyProfile, girlProfile, matchStatus, milan } = page;

  useRouteLoading(authLoading);

  return (
    <PageShell className="space-y-0 pb-16">
      <div className={kundaliClasses.headerRow}>
        <div>
          <div className={kundaliClasses.eyebrow}>
            {copy.eyebrow}
          </div>
          <h1 className={cn(kundaliClasses.title, kundaliClasses.titleRow, "m-0")}>
            <Heart className="w-7 h-7 text-secondary shrink-0" />
            {copy.title}
          </h1>
          <p className={cn(kundaliClasses.subtitle, "max-w-2xl")}>
            {copy.subtitle}
          </p>
        </div>
        {page.canAddProfile ? (
          <Button className="shrink-0" onClick={() => pickerRef.current?.openAdd()}>
            <Plus className="size-4" /> {copy.addProfile}
          </Button>
        ) : null}
      </div>

      {status === "loading" ? (
        <div className={cn(kundaliClasses.emptyBox, kundaliClasses.emptyText)}>
          {copy.loading}
        </div>
      ) : status === "login" ? (
        <section className={cn(kundaliClasses.loginCard, "text-center shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_8%,transparent)]")}>
          <div className={cn(kundaliClasses.loginIcon, "mx-auto flex")}>
            <Heart className="h-7 w-7 text-secondary" />
          </div>
          <h2 className={kundaliClasses.loginTitle}>{copy.loginTitle}</h2>
          <p className={cn(kundaliClasses.loginBody, "mx-auto")}>
            {copy.loginBody}
          </p>
          <div className={kundaliClasses.loginActions}>
            <Button size="lg" onClick={authDialog.openLogin}>
              <LogIn className="size-4" /> {copy.login}
            </Button>
            <Button size="lg" variant="outline" onClick={authDialog.openSignup}>
              <UserPlus className="size-4" /> {copy.signup}
            </Button>
          </div>
        </section>
      ) : (
        <div className="flex flex-col gap-6">
          <p className={kundaliClasses.profileHint}>{copy.profileHint}</p>

          <MilanProfilePicker
            ref={pickerRef}
            boyId={boyProfile?.id ?? null}
            girlId={girlProfile?.id ?? null}
            onBoySelect={page.setBoyProfile}
            onGirlSelect={page.setGirlProfile}
          />

          {boyProfile && girlProfile ? (
            <>
              <AyanamshaSelector mode={page.ayanamsha} onModeChange={page.setAyanamsha} />

              {matchStatus === "missing-birth" ? (
                <div className={cn(kundaliClasses.warnBox, kundaliClasses.warnText)}>
                  {copy.missingBirth}
                </div>
              ) : null}

              {matchStatus === "loading" ? (
                <div className={cn(kundaliClasses.emptyBox, kundaliClasses.emptyText)}>
                  {copy.loading}
                </div>
              ) : null}

              {matchStatus === "error" ? (
                <div className={cn(kundaliClasses.errorBox, kundaliClasses.errorText)}>
                  {copy.error}
                </div>
              ) : null}

              {milan ? (
                <div className="flex flex-col gap-6">
                  <div className="grid gap-4 lg:grid-cols-2">
                    {page.details.map((details) => (
                      <BirthDetailsTable key={details.role} details={details} />
                    ))}
                  </div>

                  <KundaliMilanResult
                    boyName={boyProfile.full_name}
                    girlName={girlProfile.full_name}
                    result={milan.result}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <div className={cn(kundaliClasses.emptyBoxShort, kundaliClasses.emptyText)}>
              {copy.needTwoProfiles}
            </div>
          )}
        </div>
      )}

      <AuthDialog
        key={authDialog.mode}
        open={authDialog.open}
        onOpenChange={authDialog.setOpen}
        initialMode={authDialog.mode}
      />
    </PageShell>
  );
}
