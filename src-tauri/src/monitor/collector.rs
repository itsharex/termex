use std::collections::HashMap;

use tokio::sync::{mpsc, RwLock as TokioRwLock};
use tokio::time::Duration;

use super::types::*;
use crate::ssh::session::SshSession;

/// Collector control commands.
pub enum CollectorCommand {
    /// Change the collection interval.
    SetInterval(u64),
    /// Stop collecting.
    Stop,
}

/// Per-session collector state.
pub struct CollectorState {
    /// Control channel sender.
    pub cmd_tx: mpsc::UnboundedSender<CollectorCommand>,
    /// Background task handle.
    pub task_handle: tokio::task::JoinHandle<()>,
}

/// Ring buffer for metrics history (most recent 5 minutes).
pub struct MetricsHistory {
    buffer: Vec<SystemMetrics>,
    write_pos: usize,
    count: usize,
    capacity: usize,
}

impl MetricsHistory {
    /// Creates a new ring buffer with the given capacity.
    pub fn new(capacity: usize) -> Self {
        Self {
            buffer: Vec::with_capacity(capacity),
            write_pos: 0,
            count: 0,
            capacity,
        }
    }

    /// Pushes a metrics snapshot into the buffer.
    pub fn push(&mut self, metrics: SystemMetrics) {
        if self.buffer.len() < self.capacity {
            self.buffer.push(metrics);
        } else {
            self.buffer[self.write_pos] = metrics;
        }
        self.write_pos = (self.write_pos + 1) % self.capacity;
        self.count = (self.count + 1).min(self.capacity);
    }

    /// Returns the most recent snapshot.
    pub fn latest(&self) -> Option<&SystemMetrics> {
        if self.count == 0 {
            return None;
        }
        let idx = if self.write_pos == 0 {
            self.buffer.len() - 1
        } else {
            self.write_pos - 1
        };
        self.buffer.get(idx)
    }

    /// Returns snapshots within the given time range (ascending order).
    pub fn range(&self, duration_secs: u64) -> Vec<SystemMetrics> {
        let now_ms = time::OffsetDateTime::now_utc().unix_timestamp() * 1000;
        let cutoff = now_ms - (duration_secs as i64 * 1000);
        let mut result = Vec::new();

        let start = if self.count < self.capacity {
            0
        } else {
            self.write_pos
        };
        for i in 0..self.count {
            let idx = (start + i) % self.capacity;
            if self.buffer[idx].timestamp >= cutoff {
                result.push(self.buffer[idx].clone());
            }
        }
        result
    }
}

/// Executes a command via SSH exec channel with a timeout.
pub async fn exec_with_timeout(
    session: &SshSession,
    command: &str,
    timeout_ms: u64,
) -> Result<(String, u32), String> {
    tokio::time::timeout(
        Duration::from_millis(timeout_ms),
        session.exec_command(command),
    )
    .await
    .map_err(|_| "exec command timed out".to_string())?
    .map_err(|e| e.to_string())
}

/// Collects OS basic info (one-time) via sessions lock.
pub async fn collect_os_info_via_state(
    sessions: &TokioRwLock<HashMap<String, SshSession>>,
    session_id: &str,
    os_type: ServerOS,
) -> OsInfo {
    let cmd = match os_type {
        ServerOS::Linux => {
            "uname -srm && cat /etc/os-release 2>/dev/null | head -3 && echo '---CORES---' && nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo"
        }
        ServerOS::MacOS => {
            "uname -srm && sw_vers 2>/dev/null | head -2 && echo '---CORES---' && sysctl -n hw.ncpu"
        }
        ServerOS::FreeBSD => {
            "uname -srm && echo '---CORES---' && sysctl -n hw.ncpu"
        }
        ServerOS::Unknown => {
            "uname -srm && echo '---CORES---' && nproc 2>/dev/null || echo 1"
        }
    };

    let output = {
        let sessions_guard = sessions.read().await;
        let session = match sessions_guard.get(session_id) {
            Some(s) => s,
            None => {
                return OsInfo {
                    os_type,
                    kernel: String::new(),
                    distro: String::new(),
                    core_count: 1,
                };
            }
        };
        session.exec_command(cmd).await
    };

    let output = match output {
        Ok((stdout, _)) => stdout,
        Err(_) => {
            return OsInfo {
                os_type,
                kernel: String::new(),
                distro: String::new(),
                core_count: 1,
            };
        }
    };

    parse_os_info(os_type, &output)
}

/// Parses OS info from command output.
fn parse_os_info(os_type: ServerOS, output: &str) -> OsInfo {
    let mut kernel = String::new();
    let mut distro = String::new();
    let mut core_count: u32 = 1;
    let mut in_cores = false;

    for line in output.lines() {
        if line.contains("---CORES---") {
            in_cores = true;
            continue;
        }
        if in_cores {
            core_count = line.trim().parse().unwrap_or(1);
            in_cores = false;
            continue;
        }
        if kernel.is_empty() {
            kernel = line.trim().to_string();
            continue;
        }
        match os_type {
            ServerOS::Linux => {
                if let Some(name) = line.strip_prefix("PRETTY_NAME=") {
                    distro = name.trim_matches('"').to_string();
                } else if distro.is_empty() {
                    if let Some(name) = line.strip_prefix("NAME=") {
                        distro = name.trim_matches('"').to_string();
                    }
                }
            }
            ServerOS::MacOS => {
                if let Some(ver) = line.strip_prefix("ProductVersion:") {
                    distro = format!("macOS {}", ver.trim());
                }
            }
            _ => {}
        }
    }

    OsInfo {
        os_type,
        kernel,
        distro,
        core_count,
    }
}

/// Builds the batched collection command for the given OS.
pub fn build_batch_command(os: ServerOS) -> String {
    match os {
        ServerOS::Linux => {
            "echo '---CPU---' && cat /proc/stat | head -1 && \
             echo '---MEM---' && cat /proc/meminfo | head -8 && \
             echo '---DISK---' && df -B1 --output=target,size,used,avail / /home 2>/dev/null && \
             echo '---NET---' && cat /proc/net/dev && \
             echo '---LOAD---' && cat /proc/loadavg && \
             echo '---UPTIME---' && cat /proc/uptime && \
             echo '---PROCS_CPU---' && ps aux --sort=-%cpu | head -11 && \
             echo '---PROCS_MEM---' && ps aux --sort=-%mem | head -11"
                .to_string()
        }
        ServerOS::MacOS => {
            "echo '---CPU---' && top -l 1 -n 0 2>/dev/null | grep 'CPU usage' && \
             echo '---MEM---' && vm_stat | head -10 && echo '---MEMSIZE---' && sysctl -n hw.memsize && \
             echo '---DISK---' && df -b / && \
             echo '---NET---' && netstat -ib | grep -E 'en0|en1' && \
             echo '---LOAD---' && sysctl -n vm.loadavg && \
             echo '---UPTIME---' && sysctl -n kern.boottime && \
             echo '---PROCS_CPU---' && ps aux -r | head -11 && \
             echo '---PROCS_MEM---' && ps aux -m | head -11"
                .to_string()
        }
        ServerOS::FreeBSD => {
            "echo '---CPU---' && sysctl -n kern.cp_time && \
             echo '---MEM---' && sysctl -n hw.physmem hw.usermem vm.stats.vm.v_free_count vm.stats.vm.v_page_size && \
             echo '---DISK---' && df -b / /home 2>/dev/null && \
             echo '---NET---' && netstat -ib | head -20 && \
             echo '---LOAD---' && sysctl -n vm.loadavg && \
             echo '---UPTIME---' && sysctl -n kern.boottime && \
             echo '---PROCS_CPU---' && ps aux -r | head -11 && \
             echo '---PROCS_MEM---' && ps aux -m | head -11"
                .to_string()
        }
        ServerOS::Unknown => build_batch_command(ServerOS::Linux),
    }
}

/// Splits batched command output into named sections by `---SECTION---` markers.
pub fn split_sections(output: &str) -> HashMap<String, String> {
    let mut sections = HashMap::new();
    let mut current_section = String::new();
    let mut current_content = String::new();

    for line in output.lines() {
        if let Some(name) = line.strip_prefix("---").and_then(|s| s.strip_suffix("---")) {
            if !current_section.is_empty() {
                sections.insert(current_section.clone(), current_content.trim().to_string());
            }
            current_section = name.to_string();
            current_content.clear();
        } else {
            current_content.push_str(line);
            current_content.push('\n');
        }
    }
    if !current_section.is_empty() {
        sections.insert(current_section, current_content.trim().to_string());
    }
    sections
}
