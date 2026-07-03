import { HttpStatusCode } from "axios"

export interface ErrorResponse {
  message: string[]
  requestId: string
  statusCode: HttpStatusCode
  extra: Record<string, any>
}
