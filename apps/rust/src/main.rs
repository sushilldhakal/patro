//! Vedic Patro API server (Rust). Local development only; see README.md.

use anyhow::Context;
use api::AppState;
use common::AppConfig;
use tracing_subscriber::EnvFilter;

/// Blocking threads: computing requests run there (`middleware::cpu_pool`), at most
/// the two load-shedding lanes' limits at once, each with room for one nested task.
const DEFAULT_BLOCKING_THREADS: usize = 96;

fn main() -> anyhow::Result<()> {
    let blocking = std::env::var("PATRO_RS_BLOCKING_THREADS")
        .ok()
        .and_then(|v| v.trim().parse::<usize>().ok())
        .filter(|n| *n > 0)
        .unwrap_or(DEFAULT_BLOCKING_THREADS);
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .max_blocking_threads(blocking)
        .build()
        .context("starting the runtime")?
        .block_on(serve())
}

async fn serve() -> anyhow::Result<()> {
    let config = AppConfig::load("config").context("loading configuration")?;

    let filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(&config.log_filter));
    tracing_subscriber::fmt().with_env_filter(filter).init();

    let addr = config.addr().context("host/port")?;
    let mut state = AppState::new(config);
    if let Some(settings) = accounts::AccountConfig::from_env() {
        let layer = accounts::Accounts::new(settings).context("account database URL")?;
        // As Python: a failed start-up DDL is logged; the routes stay mounted.
        match layer.init().await {
            Ok(()) => tracing::info!("Auth database ready"),
            Err(e) => tracing::error!(error = %e, "Failed to initialise auth database"),
        }
        state = state.with_accounts(layer);
    } else {
        tracing::warn!("PATRO_RS_DATABASE_URL not set — auth/profile routes are disabled");
    }
    let app = api::router(state);
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .with_context(|| format!("binding {addr}"))?;
    tracing::info!(%addr, "listening");

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await
    .context("serving")?;
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };
    #[cfg(unix)]
    let terminate = async {
        if let Ok(mut sig) =
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
        {
            sig.recv().await;
        }
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! { () = ctrl_c => {}, () = terminate => {} }
    tracing::info!("shutting down");
}
