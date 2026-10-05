import { join } from "node:path"
import { Elysia } from "elysia"
import type { components } from "./api/schema"
import * as S from "./api/schemas"
import { openEventTypeStore } from "./storage"

/** Пароль Владельца (SPEC §7): на фронте та же константа в route guard (админка). */
export const OWNER_PASSWORD = "secret"

/** Рабочий файл БД рядом с пакетом (ADR 0001); тесты передают свой временный. */
export const DEFAULT_DB_PATH = join(import.meta.dir, "..", "data.db")

/** Создание типа события — единственный эндпоинт, обязательный к паролю Владельца (§7). */
const EVENT_TYPES_PATH = "/api/event-types"

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

export function createApp(options: { dbPath?: string } = {}) {
  const store = openEventTypeStore(options.dbPath ?? DEFAULT_DB_PATH)

  // Роуты объявлены вручную и подставляют сгенерированные схемы
  // (body/params/ответы) как валидацию входа и сериализацию выхода — ADR 0002.
  return (
    new Elysia()
      .onError((ctx) => {
        if (ctx.code !== "VALIDATION") return

        ctx.set.status = 400
        return envelope("VALIDATION_ERROR", validationMessage(ctx.error))
      })
      .on("stop", () => store.close())
      // Пароль Владельца проверяется до валидации body: Elysia валидирует тело
      // раньше beforeHandle и хендлера, поэтому проверка живёт в самом раннем хуке —
      // неверный пароль даёт 401 даже при невалидном теле (§8), а 400 по схеме —
      // только при верном пароле. Сгенерированную схему заголовка
      // (S.parameters.EventTypes_create.header) не подставляем: она обязала бы
      // отвечать 400, а §8 требуют для отсутствующего или неверного пароля 401.
      .onRequest((ctx) => {
        const isOwnerEndpoint =
          ctx.request.method === "POST" && new URL(ctx.request.url).pathname === EVENT_TYPES_PATH
        if (!isOwnerEndpoint) return

        if (ctx.request.headers.get("X-Admin-Password") !== OWNER_PASSWORD) {
          ctx.set.status = 401
          return envelope("INVALID_ADMIN_PASSWORD", "Неверный пароль")
        }
      })
      // `/` API не принадлежит (в контракте его нет): главную отдаёт хост
      // (host.ts), в деве UI отдаёт Vite на 5173.
      .get(
        EVENT_TYPES_PATH,
        // TODO(#20): список типов из SQLite (ADR 0001)
        () => ({ eventTypes: [] }),
        { response: { 200: S.EventTypeList } },
      )
      .post(
        EVENT_TYPES_PATH,
        (ctx) => {
          const created = {
            id: crypto.randomUUID(),
            name: ctx.body.name,
            description: ctx.body.description,
            durationMinutes: ctx.body.durationMinutes,
          }
          store.insert(created)
          ctx.set.status = 201
          return created
        },
        {
          body: S.EventTypeCreate,
          response: { 201: S.EventType, 400: S.ErrorBody, 401: S.ErrorBody },
        },
      )
      .get(
        "/api/event-types/:id",
        // TODO(#20): выборка типа из SQLite; без хранилища типа не существует
        (ctx) => notFound(ctx),
        {
          params: S.parameters.EventTypes_get.path,
          response: { 200: S.EventType, 404: S.ErrorBody },
        },
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
  )
}
