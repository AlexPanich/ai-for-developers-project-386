import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { app } from "../src/app"

let baseUrl = ""

beforeAll(async () => {
  await app.listen(0)
  const url = app.server?.url
  if (!url) throw new Error("Server did not start")
  baseUrl = url.origin
})

afterAll(() => {
  app.stop()
})

describe("smoke", () => {
  test("server responds over HTTP", async () => {
    const response = await fetch(`${baseUrl}/`)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe("Hello Elysia")
  })

  test("unknown route returns 404", async () => {
    const response = await fetch(`${baseUrl}/definitely-missing`)

    expect(response.status).toBe(404)
  })
})
