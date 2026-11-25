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
        // Without it every access token would be signed with the public fallback in
        // AccountConfig, so anyone could sign in as anyone: refuse to start instead.
        anyhow::ensure!(
            std::env::var("JWT_SECRET").is_ok_and(|s| !s.trim().is_empty()),
            "JWT_SECRET must be set when the account database is on"
        );
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
    let listener = if let Some(inherited) = systemd_listener()? {
        tracing::info!(addr = ?inherited.local_addr().ok(), "listening on the systemd socket");
        inherited
    } else {
        let bound = tokio::net::TcpListener::bind(addr)
            .await
            .with_context(|| format!("binding {addr}"))?;
        tracing::info!(%addr, "listening");
        bound
    };

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal())
    .await
    .context("serving")?;
    Ok(())
}

/// The socket `patro-rust.socket` hands over (systemd socket activation), if any.
///
/// systemd keeps that socket open across restarts, so connections that arrive while a new
/// binary starts wait in its backlog instead of failing with a 502.
fn systemd_listener() -> anyhow::Result<Option<tokio::net::TcpListener>> {
    let for_us = std::env::var("LISTEN_PID")
        .ok()
        .and_then(|pid| pid.trim().parse::<u32>().ok())
        .is_some_and(|pid| pid == std::process::id());
    let count = std::env::var("LISTEN_FDS")
        .ok()
        .and_then(|n| n.trim().parse::<u32>().ok())
        .unwrap_or(0);
    if !for_us || count == 0 {
        return Ok(None);
    }
    anyhow::ensure!(count == 1, "expected one systemd socket, got {count}");
    inherited_listener()
        .map(Some)
        .context("using the systemd socket")
}

#[cfg(unix)]
fn inherited_listener() -> anyhow::Result<tokio::net::TcpListener> {
    use std::os::fd::FromRawFd;
    /// `SD_LISTEN_FDS_START`: the first descriptor systemd passes.
    const FIRST_FD: i32 = 3;
    // SAFETY: LISTEN_PID names this process and LISTEN_FDS is 1, so systemd passed exactly
    // one open listening socket at descriptor 3 and nothing else in this process owns it.
    let std_listener = unsafe { std::net::TcpListener::from_raw_fd(FIRST_FD) };
    std_listener.set_nonblocking(true)?;
    Ok(tokio::net::TcpListener::from_std(std_listener)?)
}

#[cfg(not(unix))]
fn inherited_listener() -> anyhow::Result<tokio::net::TcpListener> {
    anyhow::bail!("systemd sockets are Unix only")
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
