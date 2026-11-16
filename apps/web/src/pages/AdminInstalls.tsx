import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ApiError, authFetch } from "@vedic-patro/api-client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth/AuthContext";
import { useRouteLoading } from "@/lib/route-loading";

/**
 * App install numbers for the site's admin (`/admin/installs`). Not linked from anywhere and
 * English only: it is a private read-out, not a page of the product. The server decides who may
 * see it (a signed-in, verified account listed in ADMIN_EMAILS); this page only draws the answer.
 */
type Overview = {
  total_installations: number;
  active_24h: number;
  active_7d: number;
  active_30d: number;
  android: number;
  ios: number;
  new_today: number;
  signed_in: number;
  as_of: string;
};
type Day = { date: string; new_installations: number; active_installations: number; app_updates: number };
type Split = { value: string; installations: number; active_30d: number };
type Platforms = { platforms: Split[]; app_versions: Split[]; countries: Split[] };
type Stats = { overview: Overview; days: Day[]; platforms: Platforms };

const BASE = "/v1/admin/analytics/installs";
const DAYS = 30;

async function fetchStats(): Promise<Stats> {
  const [overview, daily, platforms] = await Promise.all([
    authFetch<Overview>(`${BASE}/overview`),
    authFetch<{ days: Day[] }>(`${BASE}/daily?days=${DAYS}`),
    authFetch<Platforms>(`${BASE}/platforms`),
  ]);
  return { overview, days: daily.days, platforms };
}

function Notice({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums">{value.toLocaleString("en")}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function SplitTable({ title, heading, rows }: { title: string; heading: string; rows: Split[] }) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{heading}</TableHead>
            <TableHead className="text-right">Installs</TableHead>
            <TableHead className="text-right">Active 30 days</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-muted-foreground">
                Nothing reported yet.
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => (
            <TableRow key={row.value}>
              <TableCell>{row.value}</TableCell>
              <TableCell className="text-right tabular-nums">{row.installations.toLocaleString("en")}</TableCell>
              <TableCell className="text-right tabular-nums">{row.active_30d.toLocaleString("en")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

function DailyTable({ days }: { days: Day[] }) {
  const peak = Math.max(1, ...days.map((d) => d.active_installations));
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="mb-2 text-base font-semibold">Last {DAYS} days</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Day (UTC)</TableHead>
            <TableHead className="text-right">New</TableHead>
            <TableHead className="text-right">Active</TableHead>
            <TableHead className="w-1/2" aria-hidden />
            <TableHead className="text-right">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...days].reverse().map((day) => (
            <TableRow key={day.date}>
              <TableCell className="tabular-nums">{day.date}</TableCell>
              <TableCell className="text-right tabular-nums">{day.new_installations}</TableCell>
              <TableCell className="text-right tabular-nums">{day.active_installations}</TableCell>
              <TableCell aria-hidden>
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${(day.active_installations / peak) * 100}%` }}
                />
              </TableCell>
              <TableCell className="text-right tabular-nums">{day.app_updates}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

export function AdminInstalls() {
  const { user, loading: authLoading } = useAuth();
  const query = useQuery({
    queryKey: ["admin", "installs", user?.id],
    queryFn: fetchStats,
    enabled: Boolean(user),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  useRouteLoading(authLoading || query.isLoading);

  if (authLoading) return null;
  if (!user) {
    return (
      <Notice title="Sign in to continue" body="This page is for the site's admin.">
        <Button asChild>
          <Link to="/account">Sign in</Link>
        </Button>
      </Notice>
    );
  }
  if (query.data === undefined) {
    if (!query.error) return null;
    const status = query.error instanceof ApiError ? query.error.status : 0;
    if (status === 403 || status === 404) {
      return <Notice title="Not available" body={`${user.email} is not an admin account.`} />;
    }
    return (
      <Notice title="Could not load the numbers" body="The server did not answer. Try again in a moment.">
        <Button variant="outline" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </Notice>
    );
  }

  const { overview, days, platforms } = query.data;
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">App installs</h1>
          <p className="text-sm text-muted-foreground">
            Installs that opened the app, counted by an anonymous id. An uninstall sends nothing, so these are not
            the number of phones that still have it. As of {new Date(overview.as_of).toLocaleString()}.
          </p>
        </div>
        <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>
          {query.isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      {query.error && <p className="text-sm text-destructive">Could not refresh. Showing the last numbers.</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Total installs" value={overview.total_installations} hint="ever seen" />
        <Tile label="New today" value={overview.new_today} hint="UTC day" />
        <Tile label="Active 24 hours" value={overview.active_24h} />
        <Tile label="Active 7 days" value={overview.active_7d} />
        <Tile label="Active 30 days" value={overview.active_30d} />
        <Tile label="iOS" value={overview.ios} />
        <Tile label="Android" value={overview.android} />
        <Tile label="Signed in" value={overview.signed_in} hint="installs with an account" />
      </div>

      <DailyTable days={days} />

      <div className="grid gap-4 md:grid-cols-3">
        <SplitTable title="Platform" heading="Platform" rows={platforms.platforms} />
        <SplitTable title="App version" heading="Version" rows={platforms.app_versions} />
        <SplitTable title="Country" heading="Country" rows={platforms.countries} />
      </div>
    </div>
  );
}
