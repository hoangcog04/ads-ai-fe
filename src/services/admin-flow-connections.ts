import httpRequest from "@/lib/axios"

export type AdminFlowConnectionUser = {
  id: string
  email: string | null
  username: string | null
  role: "ADMIN" | "USER"
}

export type AdminFlowStorageStateImportPayload = {
  userId: string
  email: string
  storageStateJson: string
  replaceExisting: boolean
}

export type AdminFlowStorageStateImportResult = {
  id: string
  userId: string
  userEmail: string | null
  email: string
  status: "CONNECTED"
  storageStateKey: string
  connectedAt: string
}

export function listAdminFlowConnectionUsers() {
  return httpRequest.get("/admin/flow-connections/users") as unknown as Promise<
    AdminFlowConnectionUser[]
  >
}

export function importAdminFlowStorageState(
  payload: AdminFlowStorageStateImportPayload
) {
  return httpRequest.post(
    "/admin/flow-connections/import-storage-state",
    payload
  ) as unknown as Promise<AdminFlowStorageStateImportResult>
}
