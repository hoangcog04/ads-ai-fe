import httpRequest from "@/lib/axios"

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export function login(email: string, password: string) {
  return httpRequest.post("/auth/login", {
    email,
    password,
  }) as unknown as Promise<AuthTokens>
}

export function changePassword(oldPassword: string, newPassword: string) {
  return httpRequest.patch("/auth/change-password", {
    oldPassword,
    newPassword,
  }) as unknown as Promise<void>
}
