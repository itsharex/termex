import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { tauriInvoke } from "@/utils/tauri";
import type { Session, SessionStatus, Tab } from "@/types/session";

export const useSessionStore = defineStore("session", () => {
  // ── State ──────────────────────────────────────────────────

  const sessions = ref<Map<string, Session>>(new Map());
  const tabs = ref<Tab[]>([]);
  const activeSessionId = ref<string | null>(null);

  // ── Getters ────────────────────────────────────────────────

  const activeSession = computed(() => {
    if (!activeSessionId.value) return null;
    return sessions.value.get(activeSessionId.value) ?? null;
  });

  const activeTab = computed(() =>
    tabs.value.find((t) => t.sessionId === activeSessionId.value) ?? null,
  );

  // ── Actions ────────────────────────────────────────────────

  /** Opens an SSH connection and creates a tab. */
  async function connect(
    serverId: string,
    serverName: string,
    cols: number,
    rows: number,
  ): Promise<string> {
    const sessionId = await tauriInvoke<string>("ssh_connect", {
      serverId,
      cols,
      rows,
    });

    const session: Session = {
      id: sessionId,
      serverId,
      serverName,
      status: "connecting",
      startedAt: new Date().toISOString(),
    };
    sessions.value.set(sessionId, session);

    const tab: Tab = {
      id: sessionId,
      sessionId,
      title: serverName,
      active: true,
    };

    // Deactivate other tabs
    tabs.value.forEach((t) => (t.active = false));
    tabs.value.push(tab);
    activeSessionId.value = sessionId;

    // Mark as connected
    updateStatus(sessionId, "connected");

    return sessionId;
  }

  /** Disconnects an SSH session and removes the tab. */
  async function disconnect(sessionId: string): Promise<void> {
    await tauriInvoke("ssh_disconnect", { sessionId });
    closeTab(sessionId);
  }

  /** Updates the status of a session. */
  function updateStatus(sessionId: string, status: SessionStatus) {
    const session = sessions.value.get(sessionId);
    if (session) {
      session.status = status;
    }
  }

  /** Sets the active tab/session. */
  function setActive(sessionId: string) {
    tabs.value.forEach((t) => (t.active = t.sessionId === sessionId));
    activeSessionId.value = sessionId;
  }

  /** Closes a tab and cleans up the session. */
  function closeTab(sessionId: string) {
    sessions.value.delete(sessionId);
    const idx = tabs.value.findIndex((t) => t.sessionId === sessionId);
    if (idx !== -1) {
      tabs.value.splice(idx, 1);
    }

    // Activate the last remaining tab, or clear
    if (activeSessionId.value === sessionId) {
      const lastTab = tabs.value[tabs.value.length - 1];
      activeSessionId.value = lastTab?.sessionId ?? null;
      if (lastTab) lastTab.active = true;
    }
  }

  return {
    sessions,
    tabs,
    activeSessionId,
    activeSession,
    activeTab,
    connect,
    disconnect,
    updateStatus,
    setActive,
    closeTab,
  };
});
