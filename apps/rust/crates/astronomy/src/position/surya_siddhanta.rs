//! The Surya Siddhanta as an [`Ephemeris`]: the text's own true Sun and Moon.

use crate::{
    System,
    engine::{moon_longitude, sun_longitude},
};

use super::{Ephemeris, Pos};

/// Positions by the Surya Siddhanta (the server's default system).
#[derive(Debug, Clone, Copy, Default)]
pub struct SuryaSiddhanta;

impl Ephemeris for SuryaSiddhanta {
    fn name(&self) -> &'static str {
        "surya_siddhanta"
    }

    fn pos(&self, jd_ut: f64) -> Pos {
        Pos {
            sun: sun_longitude(System::SuryaSiddhanta, jd_ut),
            moon: moon_longitude(System::SuryaSiddhanta, jd_ut),
        }
    }

    fn index(&self) -> Option<&ephdata::Index> {
        crate::system::surya_index()
    }
}

/// The text's arithmetic answers for every date, so the event index builder may ask for any span.
impl ephdata::Source for SuryaSiddhanta {
    fn coverage_jd_ut(&self) -> (f64, f64) {
        (-1.0e9, 1.0e9)
    }

    fn sun_moon(&self, jd: f64) -> Result<(f64, f64), ephdata::kernel::KernelError> {
        let pos = Ephemeris::pos(self, jd);
        Ok((pos.sun, pos.moon))
    }

    fn graha_longitude(
        &self,
        graha: ephdata::index::Graha,
        jd: f64,
    ) -> Result<f64, ephdata::kernel::KernelError> {
        use crate::surya_siddhanta::Body;
        use ephdata::index::Graha;
        let body = match graha {
            Graha::Mercury => Body::Mercury,
            Graha::Venus => Body::Venus,
            Graha::Mars => Body::Mars,
            Graha::Jupiter => Body::Jupiter,
            Graha::Saturn => Body::Saturn,
            Graha::Rahu => Body::Rahu,
        };
        Ok(crate::engine::longitude(System::SuryaSiddhanta, body, jd))
    }
}
