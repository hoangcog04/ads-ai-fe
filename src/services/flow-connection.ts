import httpRequest from "@/lib/axios"

export type FlowConnectionStatus =
  | "DISCONNECTED"
  | "CONNECTING"
  | "CONNECTED"
  | "REQUIRES_2FA"
  | "FAILED"

export type FlowConnection = {
  id: string
  email: string | null
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

export function getFlowConnection() {
  return httpRequest.get(
    "/flow-connection"
  ) as unknown as Promise<FlowConnection>
}

export function loginFlow(email: string, password: string) {
  return httpRequest.post("/flow-connection/login", {
    email,
    password,
  }) as unknown as Promise<FlowConnection>
}

export function logoutFlow() {
  return httpRequest.post(
    "/flow-connection/logout"
  ) as unknown as Promise<FlowConnection>
}
