//! Saved events and reminders, one record shaped like Apple Calendar's form
//! (`services/identity/events.py`), with RFC 5545 invitations and the private
//! subscription feed (`/calendar/<token>.ics`).

use jiff::{SignedDuration, Timestamp, tz::TimeZone};
use serde_json::{Map, Value, json};
use tokio_postgres::Row;

use crate::{
    AccountError, Accounts,
    db::{iso_z, new_id, now, sys, ts},
    pydt::PyDateTime,
};

const REPEATS: [&str; 10] = [
    "never",
    "daily",
    "weekdays",
    "weekends",
    "weekly",
    "fortnightly",
    "monthly",
    "quarterly",
    "half_yearly",
    "yearly",
];
const KINDS: [&str; 4] = ["event", "task", "appointment", "reminder"];
const MAX_ALERTS: usize = 2;
const MAX_INVITEES: usize = 20;
const FEED_PAST_DAYS: i64 = 365;

fn rrule(repeat: &str) -> Option<&'static str> {
    Some(match repeat {
        "daily" => "FREQ=DAILY",
        "weekdays" => "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
        "weekends" => "FREQ=WEEKLY;BYDAY=SA,SU",
        "weekly" => "FREQ=WEEKLY",
        "fortnightly" => "FREQ=WEEKLY;INTERVAL=2",
        "monthly" => "FREQ=MONTHLY",
        "quarterly" => "FREQ=MONTHLY;INTERVAL=3",
        "half_yearly" => "FREQ=MONTHLY;INTERVAL=6",
        "yearly" => "FREQ=YEARLY",
        _ => return None,
    })
}

/// iCalendar `PRIORITY`: 1 high, 5 medium, 9 low.
fn ics_priority(p: i32) -> Option<i32> {
    match p {
        3 => Some(1),
        2 => Some(5),
        1 => Some(9),
        _ => None,
    }
}

/// `EMAIL_RE = ^[^@\s]+@[^@\s]+\.[^@\s]+$`.
fn email_like(s: &str) -> bool {
    let ok = |c: char| c != '@' && !c.is_whitespace();
    let Some((local, domain)) = s.split_once('@') else {
        return false;
    };
    if local.is_empty() || !local.chars().all(ok) || !domain.chars().all(ok) {
        return false;
    }
    domain
        .char_indices()
        .any(|(i, c)| c == '.' && i > 0 && i + 1 < domain.len())
}

/// An event's `STATUS`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Status {
    Confirmed,
    Cancelled,
}

/// Whether [`Accounts::feed_token`] keeps the current secret or makes a new one.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FeedToken {
    /// The current secret (made on first use).
    Current,
    /// A new secret; the old link stops working.
    Replace,
}

/// A validated, cleaned event (`_clean`).
#[derive(Debug, Clone)]
struct Clean {
    kind: String,
    priority: i32,
    title: String,
    location: Option<String>,
    notes: Option<String>,
    all_day: bool,
    starts_at: Timestamp,
    ends_at: Timestamp,
    timezone: String,
    repeat: String,
    alerts: String,
    source_kind: Option<String>,
    source_key: Option<String>,
    invitees: String,
    profile_id: Option<String>,
}

fn bad(msg: impl Into<String>) -> AccountError {
    AccountError::Unprocessable(msg.into())
}

fn text(body: &Map<String, Value>, key: &str) -> Option<String> {
    body.get(key).and_then(Value::as_str).map(str::to_owned)
}

fn clip(s: &str, n: usize) -> String {
    s.chars().take(n).collect()
}

/// `_clean`. `starts` / `ends` are the validated `datetime`s.
fn clean(
    body: &Map<String, Value>,
    starts: PyDateTime,
    ends: Option<PyDateTime>,
) -> Result<Clean, AccountError> {
    let ends = ends.unwrap_or(starts);
    let (PyDateTime::Aware(starts_at), PyDateTime::Aware(ends_at)) = (starts, ends) else {
        return Err(bad("Times must carry a timezone"));
    };
    if ends_at < starts_at {
        return Err(bad("An event cannot end before it starts"));
    }
    let repeat = text(body, "repeat")
        .filter(|r| !r.is_empty())
        .unwrap_or_else(|| "never".to_owned());
    if !REPEATS.contains(&repeat.as_str()) {
        return Err(bad(format!("Unknown repeat: {repeat}")));
    }
    let mut alerts: Vec<i64> = body
        .get("alerts")
        .and_then(Value::as_array)
        .map(|a| {
            a.iter()
                .filter_map(Value::as_i64)
                .filter(|m| (0..=60 * 24 * 14).contains(m))
                .collect()
        })
        .unwrap_or_default();
    alerts.sort_unstable();
    alerts.dedup();
    if alerts.len() > MAX_ALERTS {
        return Err(bad("At most two alerts"));
    }
    let mut invitees: Vec<String> = Vec::new();
    for raw in body
        .get("invitees")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        let raw = raw.as_str().unwrap_or_default();
        let email = raw.trim().to_lowercase();
        if !email_like(&email) {
            return Err(bad(format!("Not an email address: {raw}")));
        }
        if !invitees.contains(&email) {
            invitees.push(email);
        }
    }
    if invitees.len() > MAX_INVITEES {
        return Err(bad("Too many invitees"));
    }
    let kind = text(body, "kind")
        .filter(|k| !k.is_empty())
        .unwrap_or_else(|| "event".to_owned());
    if !KINDS.contains(&kind.as_str()) {
        return Err(bad(format!("Unknown kind: {kind}")));
    }
    let priority = body.get("priority").and_then(Value::as_i64).unwrap_or(0);
    if !(0..=3).contains(&priority) {
        return Err(bad(format!("Unknown priority: {priority}")));
    }
    let title = text(body, "title").unwrap_or_default();
    let title = title.trim();
    if title.is_empty() {
        return Err(bad("A title is needed"));
    }
    let trimmed = |key: &str| {
        text(body, key)
            .map(|s| s.trim().to_owned())
            .filter(|s| !s.is_empty())
    };
    Ok(Clean {
        kind,
        priority: i32::try_from(priority).unwrap_or(0),
        title: clip(title, 200),
        location: trimmed("location")
            .map(|s| clip(&s, 200))
            .filter(|s| !s.is_empty()),
        notes: trimmed("notes"),
        all_day: body
            .get("all_day")
            .and_then(Value::as_bool)
            .unwrap_or(false),
        starts_at,
        ends_at,
        timezone: text(body, "timezone")
            .filter(|t| !t.is_empty())
            .unwrap_or_else(|| "Asia/Kathmandu".to_owned()),
        repeat,
        alerts: alerts
            .iter()
            .map(i64::to_string)
            .collect::<Vec<_>>()
            .join(","),
        source_kind: text(body, "source_kind"),
        source_key: text(body, "source_key"),
        invitees: invitees.join(","),
        profile_id: text(body, "profile_id"),
    })
}

/// A stored event.
#[derive(Debug, Clone)]
pub struct Event {
    id: String,
    user_id: String,
    profile_id: Option<String>,
    title: String,
    location: Option<String>,
    notes: Option<String>,
    all_day: bool,
    starts_at: Timestamp,
    ends_at: Timestamp,
    timezone: String,
    kind: String,
    priority: i32,
    repeat: String,
    alerts: String,
    source_kind: Option<String>,
    source_key: Option<String>,
    invitees: String,
    created_at: Timestamp,
    updated_at: Timestamp,
}

const COLUMNS: &str = "id, user_id, profile_id, title, location, notes, all_day, starts_at, ends_at, timezone, \
     kind, priority, repeat, alerts, source_kind, source_key, invitees, created_at, updated_at";

impl Event {
    fn from_row(r: &Row) -> Self {
        Self {
            id: r.get(0),
            user_id: r.get(1),
            profile_id: r.get(2),
            title: r.get(3),
            location: r.get(4),
            notes: r.get(5),
            all_day: r.get(6),
            starts_at: ts(r.get(7)),
            ends_at: ts(r.get(8)),
            timezone: r.get(9),
            kind: r.get(10),
            priority: r.get(11),
            repeat: r.get(12),
            alerts: r.get(13),
            source_kind: r.get(14),
            source_key: r.get(15),
            invitees: r.get(16),
            created_at: ts(r.get(17)),
            updated_at: ts(r.get(18)),
        }
    }

    fn alert_list(&self) -> Vec<i64> {
        self.alerts
            .split(',')
            .filter(|a| !a.is_empty())
            .filter_map(|a| a.parse().ok())
            .collect()
    }

    fn invitee_list(&self) -> Vec<String> {
        self.invitees
            .split(',')
            .filter(|e| !e.is_empty())
            .map(str::to_owned)
            .collect()
    }

    /// `EventOut` JSON.
    #[must_use]
    pub fn out(&self) -> Value {
        json!({
            "kind": self.kind,
            "priority": self.priority,
            "title": self.title,
            "location": self.location,
            "notes": self.notes,
            "all_day": self.all_day,
            "starts_at": iso_z(self.starts_at),
            "ends_at": iso_z(self.ends_at),
            "timezone": self.timezone,
            "repeat": self.repeat,
            "alerts": self.alert_list(),
            "source_kind": self.source_kind,
            "source_key": self.source_key,
            "invitees": self.invitee_list(),
            "profile_id": self.profile_id,
            "id": self.id,
            "created_at": iso_z(self.created_at),
            "updated_at": iso_z(self.updated_at),
        })
    }
}

/// An invitation (or cancellation) to mail.
#[derive(Debug, Clone)]
pub struct Invite {
    /// Recipient.
    pub to: String,
    /// The event title (subject line).
    pub title: String,
    /// The `.ics` body.
    pub ics: String,
    /// Who invited (the organizer's email).
    pub organizer_name: String,
    /// A `CANCEL` instead of a `REQUEST`.
    pub cancelled: bool,
}

// ── iCalendar ────────────────────────────────────────────────────────────────

fn ics_text(v: &str) -> String {
    v.replace('\\', "\\\\")
        .replace(';', "\\;")
        .replace(',', "\\,")
        .replace('\n', "\\n")
}

/// RFC 5545 folding: at most 74 octets a line, continued after CRLF + space.
fn fold(line: &str) -> String {
    let mut out: Vec<String> = Vec::new();
    let mut cur = String::new();
    for ch in line.chars() {
        if cur.len() + ch.len_utf8() > 74 {
            out.push(std::mem::take(&mut cur));
            cur.push(' ');
        }
        cur.push(ch);
    }
    out.push(cur);
    out.join("\r\n")
}

fn stamp(t: Timestamp) -> String {
    t.strftime("%Y%m%dT%H%M%SZ").to_string()
}

fn dates(e: &Event) -> (String, String) {
    if e.all_day {
        let zone = TimeZone::get(&e.timezone).unwrap_or(TimeZone::UTC);
        let first = e.starts_at.to_zoned(zone.clone()).date();
        let last = first.max(e.ends_at.to_zoned(zone).date());
        let end = last.tomorrow().unwrap_or(last);
        (
            format!("DTSTART;VALUE=DATE:{}", first.strftime("%Y%m%d")),
            format!("DTEND;VALUE=DATE:{}", end.strftime("%Y%m%d")),
        )
    } else {
        (
            format!("DTSTART:{}", stamp(e.starts_at)),
            format!("DTEND:{}", stamp(e.ends_at)),
        )
    }
}

fn vevent(
    e: &Event,
    start: String,
    end: String,
    dtstamp: &str,
    sequence: i64,
    status: Status,
) -> Vec<String> {
    let cancelled = status == Status::Cancelled;
    let mut lines = vec![
        "BEGIN:VEVENT".to_owned(),
        format!("UID:{}@vedicpatro.com", e.id),
        format!("DTSTAMP:{dtstamp}"),
        format!("SEQUENCE:{sequence}"),
        start,
        end,
        format!("SUMMARY:{}", ics_text(&e.title)),
    ];
    if let Some(loc) = e.location.as_deref().filter(|s| !s.is_empty()) {
        lines.push(format!("LOCATION:{}", ics_text(loc)));
    }
    if let Some(notes) = e.notes.as_deref().filter(|s| !s.is_empty()) {
        lines.push(format!("DESCRIPTION:{}", ics_text(notes)));
    }
    if let Some(rule) = rrule(&e.repeat) {
        lines.push(format!("RRULE:{rule}"));
    }
    if let Some(p) = ics_priority(e.priority) {
        lines.push(format!("PRIORITY:{p}"));
    }
    lines.push(format!(
        "STATUS:{}",
        if cancelled { "CANCELLED" } else { "CONFIRMED" }
    ));
    for minutes in e.alert_list() {
        lines.extend([
            "BEGIN:VALARM".to_owned(),
            "ACTION:DISPLAY".to_owned(),
            format!("DESCRIPTION:{}", ics_text(&e.title)),
            format!("TRIGGER:-PT{minutes}M"),
            "END:VALARM".to_owned(),
        ]);
    }
    lines.push("END:VEVENT".to_owned());
    lines
}

fn join(lines: &[String]) -> String {
    let mut out: String = lines
        .iter()
        .map(|l| fold(l))
        .collect::<Vec<_>>()
        .join("\r\n");
    out.push_str("\r\n");
    out
}

/// `build_ics`: an invitation `REQUEST` or `CANCEL` from `organizer`.
fn build_ics(e: &Event, organizer: Option<&str>, method: &str, sequence: i64) -> String {
    let (start, end) = dates(e);
    let org_email = organizer
        .filter(|o| !o.is_empty())
        .unwrap_or("noreply@vedicpatro.com");
    let name = organizer_name(organizer);
    let mut lines = vec![
        "BEGIN:VCALENDAR".to_owned(),
        "VERSION:2.0".to_owned(),
        "PRODID:-//Vedic Patro//Events//EN".to_owned(),
        "CALSCALE:GREGORIAN".to_owned(),
        format!("METHOD:{method}"),
    ];
    let status = if method == "CANCEL" {
        Status::Cancelled
    } else {
        Status::Confirmed
    };
    lines.extend(vevent(e, start, end, &stamp(now()), sequence, status));
    lines.push("END:VCALENDAR".to_owned());
    let summary = format!("SUMMARY:{}", ics_text(&e.title));
    if let Some(at) = lines.iter().position(|l| *l == summary) {
        let mut extra = vec![format!(
            "ORGANIZER;CN={}:mailto:{org_email}",
            ics_text(&name)
        )];
        extra.extend(e.invitee_list().iter().map(|m| {
            format!("ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:{m}")
        }));
        lines.splice(at + 1..=at, extra);
    }
    join(&lines)
}

/// `_name`: the organizer's email, or `Vedic Patro`.
fn organizer_name(email: Option<&str>) -> String {
    email
        .map(str::trim)
        .filter(|e| !e.is_empty())
        .unwrap_or("Vedic Patro")
        .to_owned()
}

/// `calendar_app`: which calendar fetched the feed, from its user agent.
#[must_use]
pub fn calendar_app(user_agent: &str) -> Option<&'static str> {
    let ua = user_agent.to_lowercase();
    if ua.contains("google-calendar") {
        Some("google")
    } else if ua.contains("calendaragent") || ua.contains("dataaccessd") {
        Some("apple")
    } else {
        None
    }
}

impl Accounts {
    async fn owned_event(&self, owner: &str, id: &str) -> Result<Event, AccountError> {
        let c = self.client().await?;
        let row = c
            .query_opt(
                &format!("SELECT {COLUMNS} FROM calendar_events WHERE id = $1"),
                &[&id],
            )
            .await?;
        row.as_ref()
            .map(Event::from_row)
            .filter(|e| e.user_id == owner)
            .ok_or_else(|| AccountError::NotFound("Event not found".to_owned()))
    }

    async fn organizer_email(&self, owner: &str) -> Result<Option<String>, AccountError> {
        Ok(self.user(owner).await?.map(|u| u.email))
    }

    /// The owner's events, by start; with `since`, those ending after it plus every repeating one.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn list_events(
        &self,
        owner: &str,
        since: Option<Timestamp>,
    ) -> Result<Vec<Event>, AccountError> {
        let c = self.client().await?;
        let rows = match since {
            None => {
                c.query(
                    &format!("SELECT {COLUMNS} FROM calendar_events WHERE user_id = $1 ORDER BY starts_at"),
                    &[&owner],
                )
                .await?
            }
            Some(t) => {
                c.query(
                    &format!(
                        "SELECT {COLUMNS} FROM calendar_events WHERE user_id = $1 \
                         AND (ends_at >= $2 OR repeat != 'never') ORDER BY starts_at"
                    ),
                    &[&owner, &sys(t)],
                )
                .await?
            }
        };
        Ok(rows.iter().map(Event::from_row).collect())
    }

    /// Saves an event; invitations to mail come back with it.
    ///
    /// # Errors
    ///
    /// A bad event (422), a foreign profile (404), or the database failed.
    pub async fn create_event(
        &self,
        owner: &str,
        body: &Map<String, Value>,
        starts: PyDateTime,
        ends: Option<PyDateTime>,
    ) -> Result<(Event, Vec<Invite>), AccountError> {
        let c = clean(body, starts, ends)?;
        if let Some(pid) = &c.profile_id {
            self.get_profile(owner, pid).await?;
        }
        let client = self.client().await?;
        let row = client
            .query_one(
                &format!(
                    "INSERT INTO calendar_events (id, user_id, kind, priority, title, location, notes, all_day, \
                     starts_at, ends_at, timezone, repeat, alerts, source_kind, source_key, invitees, profile_id) \
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING {COLUMNS}"
                ),
                &[
                    &new_id(),
                    &owner,
                    &c.kind,
                    &c.priority,
                    &c.title,
                    &c.location,
                    &c.notes,
                    &c.all_day,
                    &sys(c.starts_at),
                    &sys(c.ends_at),
                    &c.timezone,
                    &c.repeat,
                    &c.alerts,
                    &c.source_kind,
                    &c.source_key,
                    &c.invitees,
                    &c.profile_id,
                ],
            )
            .await?;
        drop(client);
        let event = Event::from_row(&row);
        let organizer = self.organizer_email(owner).await?;
        let invites = invites(&event, organizer.as_deref(), 0, &[]);
        Ok((event, invites))
    }

    /// Replaces an event; invitations (and cancellations for removed invitees) come back.
    ///
    /// # Errors
    ///
    /// Not the owner's (404), a bad event (422), a foreign profile (404).
    pub async fn update_event(
        &self,
        owner: &str,
        id: &str,
        body: &Map<String, Value>,
        starts: PyDateTime,
        ends: Option<PyDateTime>,
    ) -> Result<(Event, Vec<Invite>), AccountError> {
        let existing = self.owned_event(owner, id).await?;
        let previous = existing.invitee_list();
        let c = clean(body, starts, ends)?;
        if let Some(pid) = &c.profile_id {
            self.get_profile(owner, pid).await?;
        }
        let client = self.client().await?;
        let row = client
            .query_one(
                &format!(
                    "UPDATE calendar_events SET kind = $2, priority = $3, title = $4, location = $5, notes = $6, \
                     all_day = $7, starts_at = $8, ends_at = $9, timezone = $10, repeat = $11, alerts = $12, \
                     source_kind = $13, source_key = $14, invitees = $15, profile_id = $16, updated_at = $17 \
                     WHERE id = $1 RETURNING {COLUMNS}"
                ),
                &[
                    &id,
                    &c.kind,
                    &c.priority,
                    &c.title,
                    &c.location,
                    &c.notes,
                    &c.all_day,
                    &sys(c.starts_at),
                    &sys(c.ends_at),
                    &c.timezone,
                    &c.repeat,
                    &c.alerts,
                    &c.source_kind,
                    &c.source_key,
                    &c.invitees,
                    &c.profile_id,
                    &sys(now()),
                ],
            )
            .await?;
        drop(client);
        let event = Event::from_row(&row);
        let organizer = self.organizer_email(owner).await?;
        let invites = invites(&event, organizer.as_deref(), now().as_second(), &previous);
        Ok((event, invites))
    }

    /// Deletes an event; cancellations to mail come back.
    ///
    /// # Errors
    ///
    /// Not the owner's (404), or the database failed.
    pub async fn delete_event(&self, owner: &str, id: &str) -> Result<Vec<Invite>, AccountError> {
        let event = self.owned_event(owner, id).await?;
        let invitees = event.invitee_list();
        let mut out = Vec::new();
        if !invitees.is_empty() {
            let organizer = self.organizer_email(owner).await?;
            let ics = build_ics(&event, organizer.as_deref(), "CANCEL", now().as_second());
            for to in invitees {
                out.push(Invite {
                    to,
                    title: event.title.clone(),
                    ics: ics.clone(),
                    organizer_name: organizer_name(organizer.as_deref()),
                    cancelled: true,
                });
            }
        }
        let c = self.client().await?;
        c.execute("DELETE FROM calendar_events WHERE id = $1", &[&id])
            .await?;
        Ok(out)
    }

    /// The owner's feed secret, made on first use; `reset` replaces it.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn feed_token(&self, owner: &str, mode: FeedToken) -> Result<String, AccountError> {
        let reset = mode == FeedToken::Replace;
        let c = self.client().await?;
        let existing: Option<String> = c
            .query_opt(
                "SELECT token FROM calendar_feeds WHERE user_id = $1",
                &[&owner],
            )
            .await?
            .map(|r| r.get(0));
        match existing {
            Some(token) if !reset => Ok(token),
            Some(_) => {
                let token = crate::credentials::opaque_token();
                c.execute(
                    "UPDATE calendar_feeds SET token = $2, synced_at = NULL, synced_app = NULL WHERE user_id = $1",
                    &[&owner, &token],
                )
                .await?;
                Ok(token)
            }
            None => {
                let token = crate::credentials::opaque_token();
                c.execute(
                    "INSERT INTO calendar_feeds (user_id, token) VALUES ($1, $2)",
                    &[&owner, &token],
                )
                .await?;
                Ok(token)
            }
        }
    }

    /// `FeedOut` JSON for `token`.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn feed_out(&self, owner: &str, token: &str) -> Result<Value, AccountError> {
        let c = self.client().await?;
        let row = c
            .query_opt(
                "SELECT synced_at, synced_app FROM calendar_feeds WHERE user_id = $1",
                &[&owner],
            )
            .await?;
        let (synced_at, synced_app) = row.map_or((None, None), |r| {
            (
                r.get::<_, Option<std::time::SystemTime>>(0).map(ts),
                r.get::<_, Option<String>>(1),
            )
        });
        Ok(json!({
            "token": token,
            "path": format!("/calendar/{token}.ics"),
            "synced_at": synced_at.map(iso_z),
            "synced_app": synced_app,
        }))
    }

    /// The owner of a feed token.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn feed_owner(&self, token: &str) -> Result<Option<String>, AccountError> {
        if token.is_empty() || token.chars().count() > 64 {
            return Ok(None);
        }
        let c = self.client().await?;
        Ok(c.query_opt(
            "SELECT user_id FROM calendar_feeds WHERE token = $1",
            &[&token],
        )
        .await?
        .map(|r| r.get(0)))
    }

    /// Records that Google or Apple Calendar fetched the feed.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn mark_feed_fetched(
        &self,
        owner: &str,
        user_agent: &str,
    ) -> Result<(), AccountError> {
        let Some(app) = calendar_app(user_agent) else {
            return Ok(());
        };
        let c = self.client().await?;
        c.execute(
            "UPDATE calendar_feeds SET synced_at = $2, synced_app = $3 WHERE user_id = $1",
            &[&owner, &sys(now()), &app],
        )
        .await?;
        Ok(())
    }

    /// The subscribed calendar: a year back and everything ahead, without
    /// events imported from the phone's own calendars.
    ///
    /// # Errors
    ///
    /// The database failed.
    pub async fn build_feed(&self, owner: &str) -> Result<String, AccountError> {
        let at = now();
        let since = at - SignedDuration::from_hours(24 * FEED_PAST_DAYS);
        let dtstamp = stamp(at);
        let mut lines = vec![
            "BEGIN:VCALENDAR".to_owned(),
            "VERSION:2.0".to_owned(),
            "PRODID:-//Vedic Patro//Events//EN".to_owned(),
            "CALSCALE:GREGORIAN".to_owned(),
            "METHOD:PUBLISH".to_owned(),
            format!("X-WR-CALNAME:{}", ics_text("Vedic Patro")),
            "REFRESH-INTERVAL;VALUE=DURATION:PT1H".to_owned(),
            "X-PUBLISHED-TTL:PT1H".to_owned(),
        ];
        for e in self.list_events(owner, Some(since)).await? {
            if e.source_kind.as_deref() == Some("device") {
                continue;
            }
            let (start, end) = dates(&e);
            lines.extend(vevent(
                &e,
                start,
                end,
                &dtstamp,
                e.updated_at.as_second(),
                Status::Confirmed,
            ));
        }
        lines.push("END:VCALENDAR".to_owned());
        Ok(join(&lines))
    }
}

/// `_send_invites`: a `REQUEST` to every invitee, a `CANCEL` to the removed ones.
fn invites(e: &Event, organizer: Option<&str>, sequence: i64, previous: &[String]) -> Vec<Invite> {
    let current = e.invitee_list();
    let name = organizer_name(organizer);
    let mut out = Vec::new();
    if !current.is_empty() {
        let ics = build_ics(e, organizer, "REQUEST", sequence);
        out.extend(current.iter().map(|to| Invite {
            to: to.clone(),
            title: e.title.clone(),
            ics: ics.clone(),
            organizer_name: name.clone(),
            cancelled: false,
        }));
    }
    let removed: Vec<&String> = previous.iter().filter(|p| !current.contains(p)).collect();
    if !removed.is_empty() {
        let ics = build_ics(e, organizer, "CANCEL", sequence);
        out.extend(removed.into_iter().map(|to| Invite {
            to: to.clone(),
            title: e.title.clone(),
            ics: ics.clone(),
            organizer_name: name.clone(),
            cancelled: true,
        }));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn folding_and_escapes() {
        assert_eq!(ics_text("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
        let long = "x".repeat(80);
        assert_eq!(
            fold(&long),
            format!("{}\r\n {}", "x".repeat(74), "x".repeat(6))
        );
        assert!(email_like("a@b.co"));
        assert!(!email_like("a@b."));
        assert!(!email_like("a@.b"));
        assert!(!email_like("a b@c.d"));
        assert_eq!(calendar_app("Google-Calendar-Importer"), Some("google"));
        assert_eq!(calendar_app("macOS/14 (CalendarAgent)"), Some("apple"));
        assert_eq!(calendar_app("Mozilla"), None);
    }
}
