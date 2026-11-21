//! Time for the patro: Julian Days, civil days, UTC instants and observer time zones.
//!
//! A port of the Python server's `jd_calendar.py`, the date parts of `engine.py`
//! (`julian_day`, `datetime_from_jd`) and the zone handling of `timescale.py` and
//! `ut_instant.py`. Numbers match the Python server bit for bit: Julian Days use
//! Swiss Ephemeris's own `swe_julday`/`swe_revjul` arithmetic, and [`UtcInstant`]
//! behaves like Python's `datetime` (microseconds, half-even halving, whole-second
//! truncation when built from a Julian Day).

mod civil;
mod instant;
mod jd_instant;
mod julian;
mod zone;

pub use civil::{CivilDay, GREGORIAN_CUTOVER, GREGORIAN_CUTOVER_JD};
pub use instant::{LocalDateTime, Moment, ParseInstantError, UtcInstant};
pub use jd_instant::{JdInstant, PyInstant, WallClock};
pub use julian::{Calendar, julday, revjul};
pub use zone::{UnknownZoneError, Zone};
