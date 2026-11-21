//! One error type for handlers. Its JSON body is `{"detail": "..."}`, the shape
//! `FastAPI` uses, so the web and mobile apps read Rust errors the same way.

use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};

/// Result of a handler.
pub type AppResult<T> = Result<T, AppError>;

/// Everything a handler can fail with, each mapped to an HTTP status.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    /// 400: the request is invalid; the message says why.
    #[error("{0}")]
    BadRequest(String),
    /// 404: nothing at this address.
    #[error("{0}")]
    NotFound(String),
    /// 503: overloaded; the client retries.
    #[error("Server busy, please retry shortly.")]
    Busy,
    /// 500: a bug or a failed dependency; details go to the log, not the client.
    #[error("internal error")]
    Internal(#[source] Box<dyn std::error::Error + Send + Sync>),
}

impl AppError {
    /// Wraps any error as a 500.
    pub fn internal(err: impl std::error::Error + Send + Sync + 'static) -> Self {
        Self::Internal(Box::new(err))
    }

    /// The HTTP status this error is answered with.
    #[must_use]
    pub fn status(&self) -> StatusCode {
        match self {
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::NotFound(_) => StatusCode::NOT_FOUND,
            Self::Busy => StatusCode::SERVICE_UNAVAILABLE,
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let body = Json(serde_json::json!({ "detail": self.to_string() }));
        (self.status(), body).into_response()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn errors_use_fastapi_detail_shape_and_status() {
        let err = AppError::BadRequest("bs month must be 1..12".into());
        assert_eq!(err.status(), StatusCode::BAD_REQUEST);
        assert_eq!(err.to_string(), "bs month must be 1..12");
        assert_eq!(AppError::Busy.status(), StatusCode::SERVICE_UNAVAILABLE);
    }
}
