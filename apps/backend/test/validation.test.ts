import { describe, expect, test } from "bun:test"
import { app, OWNER_PASSWORD } from "../src/app"

const BASE = "http://localhost"

const VALID_EVENT_TYPE = {
  name: "Созвон",
  description: "Разговор по делу",
  durationMinutes: 45,
}

const VALID_BOOKING = {
  eventTypeId: "3f1d4f8a-1b7c-4f1e-9f3a-0b1c2d3e4f56",
  startAt: "2026-10-06T09:00:00+03:00",
  guestName: "Иван Петров",
  guestEmail: "ivan@example.com",
}

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return app.handle(
    new Request(`${BASE}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  )
}

async function errorEnvelope(response: Response): Promise<{ code: string; message: string }> {
  const body = (await response.json()) as { error?: { code: string; message: string } }
  if (!body.error) {
    throw new Error(
      `Ожидался конверт { error: { code, message } }, пришло: ${JSON.stringify(body)}`,
    )
  }
  return body.error
}

describe("§8 Валидация и ошибки", () => {
  test("§8: durationMinutes вне 1..540 → 400 VALIDATION_ERROR с по-русски message", async () => {
    const response = await post(
      "/api/event-types",
      { ...VALID_EVENT_TYPE, durationMinutes: 541 },
      { "X-Admin-Password": OWNER_PASSWORD },
    )

    expect(response.status).toBe(400)
    const error = await errorEnvelope(response)
    expect(error.code).toBe("VALIDATION_ERROR")
    expect(error.message).toContain("durationMinutes")
    expect(error.message).toMatch(/[а-яё]/i)
  })

  test("§8: durationMinutes не целое число → 400 VALIDATION_ERROR", async () => {
    const response = await post(
      "/api/event-types",
      { ...VALID_EVENT_TYPE, durationMinutes: 45.5 },
      { "X-Admin-Password": OWNER_PASSWORD },
    )

    expect(response.status).toBe(400)
    expect((await errorEnvelope(response)).code).toBe("VALIDATION_ERROR")
  })

  test("§8: durationMinutes меньше 1 → 400 VALIDATION_ERROR", async () => {
    const response = await post(
      "/api/event-types",
      { ...VALID_EVENT_TYPE, durationMinutes: 0 },
      { "X-Admin-Password": OWNER_PASSWORD },
    )

    expect(response.status).toBe(400)
    expect((await errorEnvelope(response)).code).toBe("VALIDATION_ERROR")
  })

  test("§8: отсутствующий X-Admin-Password → 401 INVALID_ADMIN_PASSWORD", async () => {
    const response = await post("/api/event-types", VALID_EVENT_TYPE)

    expect(response.status).toBe(401)
    expect((await errorEnvelope(response)).code).toBe("INVALID_ADMIN_PASSWORD")
  })

  test("§8: неверный пароль Владельца → 401 INVALID_ADMIN_PASSWORD", async () => {
    const response = await post("/api/event-types", VALID_EVENT_TYPE, {
      "X-Admin-Password": "wrong-password",
    })

    expect(response.status).toBe(401)
    expect((await errorEnvelope(response)).code).toBe("INVALID_ADMIN_PASSWORD")
  })

  test("§8: невалидный guestEmail → 400 VALIDATION_ERROR", async () => {
    const response = await post("/api/bookings", {
      ...VALID_BOOKING,
      guestEmail: "не-email",
    })

    expect(response.status).toBe(400)
    expect((await errorEnvelope(response)).code).toBe("VALIDATION_ERROR")
  })

  test("§8: eventTypeId не UUID → 400 VALIDATION_ERROR", async () => {
    const response = await post("/api/bookings", {
      ...VALID_BOOKING,
      eventTypeId: "не-uuid",
    })

    expect(response.status).toBe(400)
    expect((await errorEnvelope(response)).code).toBe("VALIDATION_ERROR")
  })

  test("§8: несуществующий тип события → 404 EVENT_TYPE_NOT_FOUND", async () => {
    const response = await post("/api/bookings", VALID_BOOKING)

    expect(response.status).toBe(404)
    expect((await errorEnvelope(response)).code).toBe("EVENT_TYPE_NOT_FOUND")
  })

  test("§8: GET несуществующего типа события → 404 EVENT_TYPE_NOT_FOUND", async () => {
    const response = await app.handle(
      new Request(`${BASE}/api/event-types/${VALID_BOOKING.eventTypeId}`),
    )

    expect(response.status).toBe(404)
    expect((await errorEnvelope(response)).code).toBe("EVENT_TYPE_NOT_FOUND")
  })
})
