import { Database } from "bun:sqlite"
import { rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/** Минимальный интерфейс приложения для тестов (без типовых параметров Elysia). */
export interface AppLike {
  handle(input: Request | string): Promise<Response>
}

/** Фикстура §7: валидное тело создания типа события. */
export const VALID_EVENT_TYPE = {
  name: "Созвон",
  description: "Разговор по делу",
  durationMinutes: 45,
}

const tempDbs: string[] = []

/** Временный файл БД на прогон: рабочий `data.db` тесты не трогают (AC #19). */
export function tempDbPath(): string {
  const path = join(tmpdir(), `calendar-test-${crypto.randomUUID()}.db`)
  tempDbs.push(path)
  return path
}

/** Удаляет временные файлы БД, созданные в этом прогоне; вызывать в afterAll. */
export function removeTempDbs(): void {
  for (const path of tempDbs.splice(0)) {
    rmSync(path, { force: true })
  }
}

/** Сколько типов событий лежит в файле БД: читает тот же файл, что и приложение. */
export function countEventTypes(dbPath: string): number {
  const db = new Database(dbPath, { readonly: true })
  try {
    const row = db.query("SELECT COUNT(*) AS count FROM event_types").get() as { count: number }
    return row.count
  } finally {
    db.close()
  }
}

/**
 * Вставляет строку в `bookings` напрямую в файл БД: `POST /bookings` ещё нет
 * (#22), а тесту занятости §4 нужен существующий факт бронирования. Setup через
 * фикстуру, проверка — через HTTP-шов.
 */
export function insertBooking(
  dbPath: string,
  booking: { id: string; eventTypeId: string; startAt: string },
): void {
  const db = new Database(dbPath)
  try {
    // Гость тестовой фикстуры: гостя API-то ещё не принимает (#22)
    db.query(
      "INSERT INTO bookings (id, event_type_id, start_at, guest_name, guest_email) VALUES (?, ?, ?, ?, ?)",
    ).run(booking.id, booking.eventTypeId, booking.startAt, "Иван Петров", "ivan@example.com")
  } finally {
    db.close()
  }
}

export function post(
  app: AppLike,
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return app.handle(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  )
}

export function get(app: AppLike, path: string): Promise<Response> {
  return app.handle(new Request(`http://localhost${path}`))
}

export async function errorEnvelope(
  response: Response,
): Promise<{ code: string; message: string }> {
  const body = (await response.json()) as { error?: { code: string; message: string } }
  if (!body.error) {
    throw new Error(
      `Ожидался конверт { error: { code, message } }, пришло: ${JSON.stringify(body)}`,
    )
  }
  return body.error
}
