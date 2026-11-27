//! The route table.

use axum::{
    Router,
    routing::{get, post},
};

use crate::{handlers, middleware, state::AppState};

/// Paths mirror the Python API (apps/api) exactly, so a client can point at either.
pub fn router(state: AppState) -> Router {
    let timeout = state.config.request_timeout();
    let mut routes = Router::new()
        .merge(panchanga())
        .merge(siddhanta())
        .merge(festivals())
        .merge(catalog())
        .merge(sait())
        .merge(graha())
        .merge(kundali())
        .merge(vastu());
    routes = routes.merge(weather()).merge(news()).merge(nepse());
    if state.accounts.is_some() {
        routes = routes.merge(accounts());
    }
    let routes = routes.with_state(state);
    middleware::apply(routes, timeout)
}

/// Shared cached forecasts for nearby locations.
fn weather() -> Router<AppState> {
    Router::new().route("/v1/weather/forecast", get(handlers::weather::forecast))
}

/// Publisher headlines from RSS, grouped into stories.
fn news() -> Router<AppState> {
    Router::new()
        .route("/v1/news/feed", get(handlers::news::feed))
        .route("/v1/news/stories/{id}", get(handlers::news::story))
}

/// NEPSE share prices: the live market, a day's ticks and long-term daily history.
fn nepse() -> Router<AppState> {
    Router::new()
        .route("/v1/nepse/live", get(handlers::nepse::live))
        .route("/v1/nepse/period", get(handlers::nepse::period))
        .route(
            "/v1/nepse/stocks/{symbol}/intraday",
            get(handlers::nepse::intraday),
        )
        .route(
            "/v1/nepse/stocks/{symbol}/daily",
            get(handlers::nepse::daily),
        )
}

/// The account layer (`app/routers/*`), mounted only with a database.
fn accounts() -> Router<AppState> {
    use axum::routing::{delete, put};
    use handlers::{account as a, analytics as an, events as ev};
    Router::new()
        .route("/auth/signup", post(a::signup))
        .route("/auth/login", post(a::login))
        .route("/auth/google", post(a::google))
        .route("/auth/facebook", post(a::facebook))
        .route("/auth/apple", post(a::apple))
        .route("/auth/refresh", post(a::refresh))
        .route("/auth/logout", post(a::logout))
        .route("/auth/me", get(a::me).delete(a::delete_me))
        .route("/auth/verify-email", post(a::verify_email))
        .route("/auth/resend-verification", post(a::resend_verification))
        .route("/auth/forgot-password", post(a::forgot_password))
        .route("/auth/reset-password", post(a::reset_password))
        .route("/profiles", get(a::list_profiles).post(a::create_profile))
        .route("/watchlist", get(a::get_watchlist).put(a::put_watchlist))
        .route("/places", get(a::get_places).put(a::put_places))
        .route(
            "/profiles/{profile_id}",
            get(a::get_profile)
                .patch(a::update_profile)
                .delete(a::delete_profile),
        )
        .route(
            "/profiles/{profile_id}/daily-guidance",
            get(handlers::guidance::daily_guidance),
        )
        .route("/devices", post(a::register_device))
        .route("/devices/{device_id}", delete(a::unregister_device))
        .route(
            "/reminders",
            get(a::list_reminders).post(a::create_reminder),
        )
        .route(
            "/reminders/{reminder_id}",
            put(a::update_reminder).delete(a::delete_reminder),
        )
        .route("/events", get(ev::list_events).post(ev::create_event))
        .route("/events/feed", get(ev::get_feed))
        .route("/events/feed/reset", post(ev::reset_feed))
        .route(
            "/events/{event_id}",
            put(ev::update_event).delete(ev::delete_event),
        )
        .route("/calendar/{file}", get(ev::calendar_feed))
        .route("/v1/analytics/install/register", post(an::register))
        .route("/v1/analytics/install/heartbeat", post(an::heartbeat))
        .route("/v1/analytics/install/ping", post(an::ping))
        .route("/v1/admin/analytics/installs/overview", get(an::overview))
        .route("/v1/admin/analytics/installs/daily", get(an::daily))
        .route("/v1/admin/analytics/installs/platforms", get(an::platforms))
        .route("/v1/admin/analytics/installs/live", get(an::live))
}

/// The offline Surya Siddhanta table: a lookup, no maths (see
/// `handlers::siddhanta`).
fn siddhanta() -> Router<AppState> {
    Router::new()
        .route("/v1/siddhanta/table", get(handlers::siddhanta::table))
        .route("/v1/siddhanta/cheb", get(handlers::client_data::surya_cheb))
        .route("/v1/drik/cheb", get(handlers::client_data::drik_cheb))
        .route(
            "/v1/shared/month/{key}",
            get(handlers::shared_results::get_month).put(handlers::shared_results::put_month),
        )
}

/// Health, the day and month panchanga, calendar header and date conversion.
fn panchanga() -> Router<AppState> {
    Router::new()
        .route(
            "/v1/panchanga/at-time",
            get(handlers::at_time::panchanga_at_time),
        )
        .route("/v1/panchanga/rashifal", get(handlers::rashifal::rashifal))
        .route(
            "/v1/panchanga/rashifal/janma",
            get(handlers::rashifal::janma),
        )
        .route(
            "/v1/panchanga/rashifal/personal",
            get(handlers::rashifal::personal),
        )
        .route(
            "/v1/panchanga/year/{bs_year}",
            get(handlers::panchanga::year),
        )
        .route(
            "/v1/panchanga/year/{bs_year}/sun",
            get(handlers::panchanga::year_sun),
        )
        .route(
            "/v1/panchanga/ad/{ad_year}/{ad_month}",
            get(handlers::panchanga::ad_month),
        )
        .route(
            "/v1/panchanga/bc/{bc_year}/{bc_month}",
            get(handlers::panchanga::bc_month),
        )
        .route("/health", get(handlers::health::health))
        .route("/openapi.json", get(handlers::openapi::openapi_json))
        .route("/docs", get(handlers::openapi::docs))
        .route(
            "/docs/oauth2-redirect",
            get(handlers::openapi::oauth2_redirect),
        )
        .route("/redoc", get(handlers::openapi::redoc))
        .route("/v1/panchanga", get(handlers::day::panchanga_day_query))
        .route(
            "/v1/panchanga/today",
            get(handlers::day::panchanga_day_today),
        )
        .route(
            "/v1/panchanga/jd/{jd_ut}",
            get(handlers::day::panchanga_day_jd),
        )
        .route(
            "/v1/panchanga/{date_key}",
            get(handlers::day::panchanga_day),
        )
        .route(
            "/v1/panchanga/{bs_year}/{bs_month}",
            get(handlers::panchanga::month),
        )
        .route(
            "/v1/nepal/panchanga/month/{bs_year}/{bs_month}",
            get(handlers::day::nepal_panchanga_month),
        )
        .route(
            "/v1/nepal/panchanga/{date_key}",
            get(handlers::day::nepal_panchanga_day),
        )
        .route(
            "/v1/calendar/header/{bs_year}/{bs_month}",
            get(handlers::day::calendar_header),
        )
        .route(
            "/v1/convert/ad-to-bs/{ad_date}",
            get(handlers::day::convert_ad_to_bs),
        )
        .route(
            "/v1/convert/bs-to-ad/{bs_date}",
            get(handlers::day::convert_bs_to_ad),
        )
}

/// Festivals, holidays, sankranti and special months.
fn festivals() -> Router<AppState> {
    Router::new()
        .route(
            "/v1/nepal/festivals",
            get(handlers::festivals::nepal_festivals),
        )
        .route(
            "/v1/nepal/festivals/upcoming",
            get(handlers::festivals::nepal_upcoming_festivals),
        )
        .route(
            "/v1/nepal/holidays",
            get(handlers::festivals::nepal_holidays),
        )
        .route(
            "/v1/nepal/special-months/{bs_year}",
            get(handlers::festivals::nepal_special_months),
        )
        .route(
            "/v1/nepal/month-kinds/{bs_year}",
            get(handlers::festivals::nepal_month_kinds),
        )
        .route(
            "/v1/nepal/sankranti/year/{ad_year}",
            get(handlers::festivals::nepal_sankranti_year),
        )
        .route(
            "/v1/nepal/sankranti/{date_key}",
            get(handlers::festivals::nepal_sankranti_day),
        )
        .route(
            "/v1/nepal/panchanga/year/{bs_year}",
            get(handlers::festivals::nepal_panchanga_year),
        )
        .route(
            "/v1/festivals/bs/{bs_year}",
            get(handlers::festivals::festivals_bs_year),
        )
        .route(
            "/v1/festivals/{date_key}",
            get(handlers::festivals::festivals_day),
        )
        .route(
            "/v1/holidays/{year}",
            get(handlers::festivals::holidays_year),
        )
}

/// Meta, cities, documents, veda and panchanga element routes.
fn catalog() -> Router<AppState> {
    Router::new()
        .route(
            "/meta/capabilities",
            get(handlers::catalog::meta_capabilities),
        )
        .route("/about", get(handlers::catalog::about))
        .route("/meta/provenance", get(handlers::share::provenance))
        .route("/og-image", get(handlers::share::og_image))
        .route("/share/panchanga", get(handlers::share::share_panchanga))
        .route("/v1/cities/search", get(handlers::catalog::cities_search))
        .route(
            "/v1/nepal/cities/search",
            get(handlers::catalog::cities_search),
        )
        .route("/v1/cities/nearest", get(handlers::catalog::cities_nearest))
        .route(
            "/v1/nepal/cities/nearest",
            get(handlers::catalog::cities_nearest),
        )
        .route("/v1/cities/popular", get(handlers::catalog::cities_popular))
        .route(
            "/v1/nepal/cities/popular",
            get(handlers::catalog::cities_popular),
        )
        .route(
            "/v1/panchanga/elements",
            get(handlers::catalog::panchanga_elements),
        )
        .route(
            "/v1/panchanga/element/{name}/day/{date_key}",
            get(handlers::catalog::panchanga_element_day),
        )
        .route(
            "/v1/panchanga/element/{name}/spans",
            get(handlers::catalog::panchanga_element_spans),
        )
        .route(
            "/v1/panchanga/element/{name}/month/{bs_year}/{bs_month}",
            get(handlers::catalog::panchanga_element_month),
        )
        .route("/v1/documents", get(handlers::catalog::documents_list))
        .route(
            "/v1/documents/{slug}",
            get(handlers::catalog::document_detail),
        )
        .route(
            "/v1/documents/{slug}/chapters/{chapter_number}",
            get(handlers::catalog::document_chapter_detail),
        )
        .route(
            "/v1/veda/details/{kind}",
            get(handlers::catalog::veda_details),
        )
        .route(
            "/v1/veda/details/{kind}/values",
            get(handlers::catalog::veda_detail_values),
        )
        .route("/v1/veda/daily", get(handlers::catalog::veda_daily))
        .route("/v1/asset/{*key}", get(handlers::catalog::asset_redirect))
}

/// Nepal sait (auspicious dates) routes.
fn sait() -> Router<AppState> {
    Router::new()
        .route("/v1/nepal/sait/categories", get(handlers::sait::categories))
        .route("/v1/nepal/sait/years", get(handlers::sait::years))
        .route("/v1/nepal/sait/about", get(handlers::sait::about_all))
        .route(
            "/v1/nepal/sait/{category}/about",
            get(handlers::sait::about_category),
        )
        .route(
            "/v1/nepal/sait/{bs_year}/month/{bs_month}",
            get(handlers::sait::month_all),
        )
        .route(
            "/v1/nepal/sait/{bs_year}/{category}/detail",
            get(handlers::sait::detail),
        )
        .route(
            "/v1/nepal/sait/{bs_year}/{category}/personalize",
            get(handlers::sait::personalize),
        )
        .route(
            "/v1/nepal/sait/{bs_year}/{category}",
            get(handlers::sait::listing),
        )
}

/// Gochar, graha and panchak routes (`api/patro.py`).
fn graha() -> Router<AppState> {
    Router::new()
        .route(
            "/v1/nepal/gochar/ingress",
            get(handlers::gochar::gochar_ingress_range),
        )
        .route(
            "/v1/nepal/gochar/year/{bs_year}",
            get(handlers::gochar::gochar_year_summary),
        )
        .route(
            "/v1/nepal/gochar/jd/{jd_ut}",
            get(handlers::gochar::gochar_jd),
        )
        .route(
            "/v1/nepal/gochar/{date_key}",
            get(handlers::gochar::gochar_day),
        )
        .route(
            "/v1/nepal/panchak/year/{year}",
            get(handlers::graha::panchak_year),
        )
        .route(
            "/v1/nepal/graha-asta/year/{year}",
            get(handlers::graha::graha_asta_year),
        )
        .route(
            "/v1/nepal/graha-vakri/year/{year}",
            get(handlers::graha::graha_vakri_year),
        )
        .route(
            "/v1/nepal/graha-sthiti/{date_key}",
            get(handlers::graha::graha_sthiti),
        )
        .route(
            "/v1/nepal/patro/{bs_year}/{bs_month}",
            get(handlers::panchanga::nepal_patro),
        )
        .route(
            "/v1/nepal/patro/ad/{ad_year}/{ad_month}",
            get(handlers::panchanga::nepal_patro_ad),
        )
        .route(
            "/v1/generate/{year}",
            post(handlers::generate::holiday_year),
        )
        .route(
            "/v1/generate/panchanga/{bs_year}",
            post(handlers::generate::panchanga_year),
        )
        .route(
            "/v1/generate/panchanga/popular/{bs_year}",
            post(handlers::generate::panchanga_popular),
        )
        .route(
            "/v1/nepal/eclipse/{kind}/year/{year}",
            get(handlers::graha::eclipse_year),
        )
}

/// Kundali routes (`api/kundali.py`).
fn kundali() -> Router<AppState> {
    Router::new()
        .route(
            "/v1/planetary/positions",
            get(handlers::kundali::planetary_positions),
        )
        .route(
            "/v1/kundali/vimshottari",
            get(handlers::kundali::vimshottari),
        )
        .route("/v1/shadbala", get(handlers::kundali::shadbala))
        .route(
            "/v1/kundali/yogas/reference",
            get(handlers::kundali::yoga_reference),
        )
        .route(
            "/v1/kundali/reference/bhava",
            get(handlers::kundali::bhava_reference),
        )
        .route("/v1/kundali/milan", get(handlers::kundali::milan))
        .route("/v1/kundali/detail", get(handlers::kundali::detail_route))
        .route("/v1/kundali/report", get(handlers::kundali::report_route))
        .route(
            "/v1/seasons/tropical",
            get(handlers::kundali::tropical_seasons),
        )
        .route(
            "/v1/kundali/dasha/expand",
            get(handlers::kundali::dasha_expand),
        )
        .route(
            "/v1/kundali/{date_key}",
            get(handlers::kundali::kundali_day),
        )
}

/// Vastu routes (`api/vastu.py`).
fn vastu() -> Router<AppState> {
    Router::new()
        .route("/v1/vastu/zones", get(handlers::vastu::zones))
        .route(
            "/v1/vastu/zones/{granularity}/{zone_id}",
            get(handlers::vastu::zone_detail),
        )
        .route("/v1/vastu/rooms", get(handlers::vastu::rooms))
        .route(
            "/v1/vastu/rooms/{subject}/detail",
            get(handlers::vastu::room_detail),
        )
        .route("/v1/vastu/analyze", post(handlers::vastu::analyze))
        .route("/v1/vastu/sketch", post(handlers::vastu::sketch_route))
        .route(
            "/v1/vastu/house-plan",
            post(handlers::vastu::house_plan_route),
        )
}
