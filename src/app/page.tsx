import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/header";
import { CitySearch } from "@/components/city-search";
import { EventsBrowser } from "@/components/events-browser";
import { LocationForm } from "@/components/location-form";
import { BTN_PRIMARY, BTN_SECONDARY, Footer, Well } from "@/components/ui";
import { EVENT_KINDS, type EventKind } from "@/lib/config";
import { currentSession } from "@/lib/current";
import { eventsNear, type SearchCentre } from "@/lib/events";
import { geocode } from "@/lib/geocode";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ kind?: string; edit?: string; city?: string; lat?: string; lng?: string }> }) {
  const { claims, locale, isAdmin } = await currentSession();
  const sp = await searchParams;
  const kind = (EVENT_KINDS as readonly string[]).includes(sp.kind ?? "") ? (sp.kind as EventKind) : null;
  const t = await getTranslations("home");
  // A searched city (?city=, with ?lat=&lng= when picked from the suggestions): the
  // list and the map centre on it; the saved city stays as it is.
  const searchCity = (sp.city ?? "").trim().slice(0, 80);
  let search: SearchCentre | null = null;
  let searchMissed = false;
  if (searchCity) {
    const lat = Number(sp.lat), lng = Number(sp.lng);
    if (sp.lat && sp.lng && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      search = { city: searchCity, lat, lng, radius_km: null };
    } else {
      const hit = await geocode(searchCity, "city");
      if (hit) search = { city: hit.city ?? hit.label, lat: hit.lat, lng: hit.lng, radius_km: null };
      else searchMissed = true;
    }
  }
  const near = await eventsNear(claims.sub, kind, search);
  const radius = near.location?.radius_km ?? 25;
  const centre = search ? { city: search.city, lat: search.lat, lng: search.lng, radius_km: radius } : near.location;
  const query = search ? `city=${encodeURIComponent(search.city)}&lat=${search.lat.toFixed(5)}&lng=${search.lng.toFixed(5)}` : "";
  const editing = !near.location || sp.edit === "1";
  const myCount = near.events.filter((e) => e.me_going).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-surface)" }}>
      <Header accountName={claims.orgName ?? claims.org ?? null} personName={claims.name ?? claims.email ?? "—"} locale={locale} isAdmin={isAdmin} />
      <Well>
        <div className="flex flex-wrap items-end justify-between gap-4" style={{ paddingBottom: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: 36, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: "40px" }}>{t("title")}</h1>
            {search ? (
              <p style={{ margin: 0, fontSize: 16, lineHeight: "24px", color: "var(--color-foreground-secondary)" }}>
                {t("searchSubtitle", { city: search.city, radius })}
                {near.location && (
                  <>
                    {" · "}
                    <Link href={kind ? `/?kind=${kind}` : "/"} style={{ color: "var(--color-foreground)", textDecoration: "underline", textUnderlineOffset: 3 }}>{t("backTo", { city: near.location.city })}</Link>
                  </>
                )}
              </p>
            ) : near.location ? (
              <p style={{ margin: 0, fontSize: 16, lineHeight: "24px", color: "var(--color-foreground-secondary)" }}>
                {t("subtitle", { city: near.location.city, radius: near.location.radius_km })} ·{" "}
                <Link href="/?edit=1" style={{ color: "var(--color-foreground)", textDecoration: "underline", textUnderlineOffset: 3 }}>{t("change")}</Link>
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 16, lineHeight: "24px", color: "var(--color-foreground-secondary)" }}>{t("noLocation")}</p>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/mine" style={BTN_SECONDARY}>{t("myRegistrations", { count: myCount })}</Link>
            <Link href="/events/new" style={BTN_PRIMARY}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              {t("propose")}
            </Link>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 32 }}>
          <CitySearch kind={kind} current={search?.city ?? null} />
          {searchMissed && <p role="alert" style={{ margin: 0, fontSize: 13, color: "var(--color-danger)" }}>{t("searchNotFound", { city: searchCity })}</p>}
        </div>

        {editing && !search && <LocationForm current={near.location} />}

        <EventsBrowser near={near} centre={centre} query={query} kind={kind} locale={locale} />
        <Footer />
      </Well>
    </div>
  );
}
