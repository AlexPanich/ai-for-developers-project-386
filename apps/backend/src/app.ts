import { Elysia } from "elysia"
import type { components } from "./api/schema"
import * as S from "./api/schemas"

/** Пароль Владельца (SPEC §7): на фронте та же константа в route guard (тикет #19). */
export const OWNER_PASSWORD = "secret"

type ErrorEnvelope = components["schemas"]["ErrorBody"]

function envelope(code: ErrorEnvelope["error"]["code"], message: string): ErrorEnvelope {
  return { error: { code, message } }
}

function validationMessage(error: unknown): string {
  const path = (error as { valueError?: { path?: unknown } } | null)?.valueError?.path
  if (typeof path !== "string" || path === "") {
    return "Некорректные данные запроса"
  }
  return `Некорректное поле: ${path.replace(/^\//, "").replaceAll("/", ".")}`
}

/** §8: несуществующий тип события → 404 EVENT_TYPE_NOT_FOUND. */
function notFound(ctx: { set: { status?: number | string } }): ErrorEnvelope {
  ctx.set.status = 404
  return envelope("EVENT_TYPE_NOT_FOUND", "Тип события не найден")
}

// Каркас #26: роуты объявлены вручную и подставляют сгенерированные схемы
// (body/params/ответы) как валидацию входа и сериализацию выхода — ADR 0002.
// Хранилища ещё нет: где нужен факт из БД, роут честно отвечает по контракту
// (пустой список, 404), а создание отдаёт 500 с TODO на тикет-владелец.
export const app = new Elysia()
  .onError((ctx) => {
    if (ctx.code !== "VALIDATION") return

    ctx.set.status = 400
    return envelope("VALIDATION_ERROR", validationMessage(ctx.error))
  })
  .get("/", () => "Hello Elysia")
  .get(
    "/api/event-types",
    // TODO(#20): список типов из SQLite (ADR 0001)
    () => ({ eventTypes: [] }),
    { response: { 200: S.EventTypeList } },
  )
  .post(
    "/api/event-types",
    (ctx) => {
      // Сгенерированную схему заголовка (S.parameters.EventTypes_create.header) не
      // подставляем: она обязана отвечать 400, а SPEC §8 (и AC #19) требуют для
      // отсутствующего или неверного пароля 401 — поэтому проверяем сами.
      if (ctx.request.headers.get("X-Admin-Password") !== OWNER_PASSWORD) {
        ctx.set.status = 401
        return envelope("INVALID_ADMIN_PASSWORD", "Неверный пароль")
      }
      // TODO(#19): создание типа события в SQLite (ADR 0001)
      throw new Error("Создание типа события реализуется в #19")
    },
    { body: S.EventTypeCreate, response: { 201: S.EventType, 400: S.ErrorBody, 401: S.ErrorBody } },
  )
  .get(
    "/api/event-types/:id",
    // TODO(#20): выборка типа из SQLite; без хранилища типа не существует
    (ctx) => notFound(ctx),
    { params: S.parameters.EventTypes_get.path, response: { 200: S.EventType, 404: S.ErrorBody } },
  )
  .get(
    "/api/event-types/:id/availability",
    // TODO(#21): вычисление слотов по сетке и броням (SPEC §3–§4)
    (ctx) => notFound(ctx),
    {
      params: S.parameters.EventTypes_availability.path,
      response: { 200: S.Availability, 404: S.ErrorBody },
    },
  )
  .post(
    "/api/bookings",
    // Формат (email, UUID, даты) проверяет сгенерированная схема body (§8);
    // без хранилища типов событий не существует → 404 (честный ответ по контракту).
    // TODO(#22): проверка сетки/окна, хранение и 409 SLOT_TAKEN
    (ctx) => notFound(ctx),
    {
      body: S.BookingCreate,
      response: { 201: S.Booking, 400: S.ErrorBody, 404: S.ErrorBody, 409: S.ErrorBody },
    },
  )
  .get(
    "/api/bookings",
    // TODO(#23): предстоящие встречи из SQLite (SPEC §7)
    () => ({ bookings: [] }),
    { response: { 200: S.BookingList } },
  )
