export type SessionStatus = "connecting" | "connected" | "disconnected" | "error";

export interface Session {
  id: string;
  serverId: string;
  serverName: string;
  status: SessionStatus;
  startedAt: string;
}

export interface Tab {
  id: string;
  sessionId: string;
  title: string;
  active: boolean;
}
