import httpRequest from "@/lib/axios"

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export type AuthUser = {
  id: string
  email: string | null
  username: string | null
  firstname: string | null
  lastname: string | null
  role: "ADMIN" | "USER"
}

export function login(identifier: string, password: string) {
  return httpRequest.post("/auth/login", {
    identifier,
    password,
  }) as unknown as Promise<AuthTokens>
}

export function getCurrentUser() {
  return httpRequest.get("/auth/me") as unknown as Promise<AuthUser>
}

export function changePassword(oldPassword: string, newPassword: string) {
  return httpRequest.patch("/auth/change-password", {
    oldPassword,
    newPassword,
  }) as unknown as Promise<void>
}
