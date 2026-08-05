import httpRequest from "@/lib/axios"

export type FlowConnectionStatus =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "REQUIRES_2FA"
  | "FAILED"

export type FlowConnection = {
  id: string
  email: string
  status: FlowConnectionStatus
  hasStorageState: boolean
  connectedAt: string | null
  lastError: string | null
  lastDebugScreenshotKey: string | null
  updatedAt: string | null
  loginOutput: "profile" | "storage-state"
  generationSession: "profile" | "storage-state"
  logoutTarget: "profile" | "storage-state"
}

export const FLOW_CONNECTIONS_QUERY_KEY = ["flow-connections"] as const

export function getFlowConnections() {
  return httpRequest.get(
    "/flow-connections"
  ) as unknown as Promise<FlowConnection[]>
}

export function loginFlow(email: string, password: string) {
  return httpRequest.post("/flow-connections/login", {
    email,
    password,
  }) as unknown as Promise<FlowConnection>
}

export function logoutFlow(flowConnectionId: string) {
  return httpRequest.post(
    `/flow-connections/${flowConnectionId}/logout`
  ) as unknown as Promise<FlowConnection>
}
