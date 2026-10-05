import { postJson, request } from './client'
import type { operations } from './schema'

type Responses<Op> = Op extends { responses: infer R } ? R : never

/** Ключи успешных (2xx) ответов операции: `200`, `201`, … */
type SuccessStatus<R> = keyof R extends never ? never : ExtractStatus<keyof R>

type ExtractStatus<Status> = Status extends number | string
  ? `${Status}` extends `2${string}`
    ? Status
    : never
  : never

type Json<Response> = Response extends { content: infer Content }
  ? Content extends { 'application/json': infer Body }
    ? Body
    : never
  : never

/** Тело успешного ответа операции, выведенное из контракта. */
export type ResponseBody<Op> = Json<Responses<Op>[SuccessStatus<Responses<Op>>]>

/** Тело запроса операции (`application/json`), выведенное из контракта. */
export type RequestBody<Op> = Op extends { requestBody: { content: infer Body } } ? Body : never

export function listEventTypes(): Promise<ResponseBody<operations['EventTypes_list']>> {
  return request('/api/event-types')
}

export function createEventType(
  body: RequestBody<operations['EventTypes_create']>,
  adminPassword: string,
): Promise<ResponseBody<operations['EventTypes_create']>> {
  return postJson('/api/event-types', body, { 'X-Admin-Password': adminPassword })
}

export function getEventType(id: string): Promise<ResponseBody<operations['EventTypes_get']>> {
  return request(`/api/event-types/${id}`)
}

export function getAvailability(
  id: string,
): Promise<ResponseBody<operations['EventTypes_availability']>> {
  return request(`/api/event-types/${id}/availability`)
}

export function listBookings(): Promise<ResponseBody<operations['Bookings_list']>> {
  return request('/api/bookings')
}

export function createBooking(
  body: RequestBody<operations['Bookings_create']>,
): Promise<ResponseBody<operations['Bookings_create']>> {
  return postJson('/api/bookings', body)
}
