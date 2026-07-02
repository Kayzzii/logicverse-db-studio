use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

use ssh2::Session;
use tokio::sync::oneshot;

use crate::error::{AppError, AppResult};

pub enum SshAuth {
    Password(String),
    KeyFile(PathBuf),
}

pub struct SshTunnel {
    local_port: u16,
    shutdown: Arc<AtomicBool>,
    task: tokio::task::JoinHandle<()>,
}

impl SshTunnel {
    pub async fn open(
        ssh_host: &str,
        ssh_port: u16,
        ssh_user: &str,
        ssh_auth: SshAuth,
        remote_host: &str,
        remote_port: u16,
    ) -> AppResult<Self> {
        let ssh_host = ssh_host.to_string();
        let ssh_user = ssh_user.to_string();
        let remote_host = remote_host.to_string();
        let (port_tx, port_rx) = oneshot::channel();
        let shutdown = Arc::new(AtomicBool::new(false));
        let shutdown_worker = Arc::clone(&shutdown);

        let task = tokio::task::spawn_blocking(move || {
            if let Err(err) = run_tunnel(
                &ssh_host,
                ssh_port,
                &ssh_user,
                ssh_auth,
                &remote_host,
                remote_port,
                port_tx,
                shutdown_worker,
            ) {
                eprintln!("SSH tunnel error: {err}");
            }
        });

        let local_port = port_rx
            .await
            .map_err(|_| AppError::Message("SSH tunnel failed to start".into()))?;

        Ok(Self {
            local_port,
            shutdown,
            task,
        })
    }

    pub fn local_port(&self) -> u16 {
        self.local_port
    }

    pub async fn close(self) {
        self.shutdown.store(true, Ordering::Relaxed);
        let _ = self.task.await;
    }
}

fn run_tunnel(
    ssh_host: &str,
    ssh_port: u16,
    ssh_user: &str,
    ssh_auth: SshAuth,
    remote_host: &str,
    remote_port: u16,
    port_tx: oneshot::Sender<u16>,
    shutdown: Arc<AtomicBool>,
) -> AppResult<()> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| {
        AppError::Message(format!("Failed to bind local port for SSH tunnel: {e}"))
    })?;
    let local_port = listener.local_addr()?.port();
    port_tx
        .send(local_port)
        .map_err(|_| AppError::Message("Failed to publish SSH tunnel port".into()))?;

    let tcp = TcpStream::connect(format!("{ssh_host}:{ssh_port}"))
        .map_err(|e| AppError::Message(format!("SSH connection failed: {e}")))?;
    tcp.set_read_timeout(Some(Duration::from_secs(30)))?;
    tcp.set_write_timeout(Some(Duration::from_secs(30)))?;

    let mut session = Session::new().map_err(|e| AppError::Message(format!("SSH session: {e}")))?;
    session.set_tcp_stream(tcp);
    session
        .handshake()
        .map_err(|e| AppError::Message(format!("SSH handshake failed: {e}")))?;

    match ssh_auth {
        SshAuth::Password(password) => session
            .userauth_password(ssh_user, &password)
            .map_err(|e| AppError::Message(format!("SSH password auth failed: {e}")))?,
        SshAuth::KeyFile(path) => session
            .userauth_pubkey_file(ssh_user, None, &path, None)
            .map_err(|e| AppError::Message(format!("SSH key auth failed: {e}")))?,
    }

    if !session.authenticated() {
        return Err(AppError::Message("SSH authentication failed".into()));
    }

    let session = Arc::new(session);
    listener
        .set_nonblocking(true)
        .map_err(|e| AppError::Message(format!("SSH listener error: {e}")))?;

    while !shutdown.load(Ordering::Relaxed) {
        match listener.accept() {
            Ok((local_stream, _)) => {
                let session = Arc::clone(&session);
                let remote_host_owned = remote_host.to_string();
                thread::spawn(move || {
                    if let Err(err) = forward_connection(
                        session,
                        local_stream,
                        &remote_host_owned,
                        remote_port,
                    ) {
                        eprintln!("SSH forward error: {err}");
                    }
                });
            }
            Err(err) if err.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(25));
            }
            Err(err) => {
                return Err(AppError::Message(format!("SSH accept error: {err}")));
            }
        }
    }

    Ok(())
}

fn forward_connection(
    session: Arc<Session>,
    local: TcpStream,
    remote_host: &str,
    remote_port: u16,
) -> AppResult<()> {
    let mut channel = session
        .channel_direct_tcpip(remote_host, remote_port, None)
        .map_err(|e| AppError::Message(format!("SSH direct-tcpip failed: {e}")))?;

    let mut stream = local;
    let mut stream_reader = stream
        .try_clone()
        .map_err(|e| AppError::Message(e.to_string()))?;
    let mut channel_reader = channel.stream(0);

    let done = Arc::new(AtomicBool::new(false));
    let done_a = Arc::clone(&done);
    let done_b = Arc::clone(&done);

    let t1 = thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            if done_a.load(Ordering::Relaxed) {
                break;
            }
            match stream_reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    if channel.write_all(&buf[..n]).is_err() {
                        break;
                    }
                    let _ = channel.flush();
                }
                Err(_) => break,
            }
        }
        done_a.store(true, Ordering::Relaxed);
    });

    let t2 = thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            if done_b.load(Ordering::Relaxed) {
                break;
            }
            match channel_reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    if stream.write_all(&buf[..n]).is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
        done_b.store(true, Ordering::Relaxed);
    });

    let _ = t1.join();
    let _ = t2.join();

    Ok(())
}

pub fn ssh_auth_from_config(
    ssh_password: &str,
    ssh_key_path: &Option<String>,
) -> AppResult<SshAuth> {
    if let Some(path) = ssh_key_path {
        let trimmed = path.trim();
        if !trimmed.is_empty() {
            return Ok(SshAuth::KeyFile(PathBuf::from(trimmed)));
        }
    }
    Ok(SshAuth::Password(ssh_password.to_string()))
}
