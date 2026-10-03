# AGENTS.md

## Проект

Учебный проект Хекслета «Календарь звонков» — Bun-монорео (`workspaces: ["apps/*"]`), пока на уровне шаблонов:

- `apps/backend` — Elysia + Bun, слушает `:3000`. Entry: `src/index.ts` → `src/app.ts` (export `app`).
- `apps/frontend` — React 19 + Vite, entry: `src/main.tsx`.
- `apps/*/README.md` — шаблонные (Vite/Elysia), не источник правды; источник правды — `package.json`-скрипты и конфиги.
- `.env` и внешних сервисов (БД и т.п.) нет.

## Команды (из корня)

```bash
bun install --frozen-lockfile   # ставить только так — CI делает именно это
bun run lint                     # biome check по всему репо
bun run lint:fix                 # автоисправления
bun run test                     # все тесты (backend + frontend)
bun run test:backend             # только backend
bun run test:frontend            # только frontend
bun run dev:backend              # http://localhost:3000
bun run dev:frontend             # vite dev server
```

Один тест — через скрипт пакета, аргументы после `--`:

```bash
bun run test:backend -- test/smoke.test.ts
bun run test:frontend -- src/App.test.tsx
bun run test:frontend -- -t "Счётчик"   # по названию теста
```

Отдельного typecheck-скрипта нет; единственный — `cd apps/frontend && bun run build` (`tsc -b && vite build`).

Порядок проверки: `bun run lint` → `bun run test` (в CI: install → lint → test).

## Тесты: ловушки

- **Не запускайте тесты frontend из корня напрямую (`bun test ...`)**: preload из `apps/frontend/bunfig.toml` (happy-dom + jest-dom-матчеры) подхватывается только при cwd = `apps/frontend`, и тесты падают с `ReferenceError: document is not defined`. Из корня используйте `bun run test:frontend -- ...`.
- Тесты только на `bun:test` (не vitest/jest).
- Smoke-тест backend поднимает реальный HTTP-сервер на эфемерном порту (`app.listen(0)`) — внешние сервисы и ожидания не нужны.
- После изменения зависимостей не забудьте закоммитить обновлённый `bun.lock` — в CI стоит `--frozen-lockfile`.

## Линт и формат

- Единственный линтер — **Biome**; eslint и другие линтеры не используются.
- Корневой `biome.json` действует на весь репо, **проверяет и JSON** — новые `.json`-файлы форматировать по его правилам (2 пробела, без trailing commas).
- `apps/*/biome.json` наследуют корневой (`"extends": "//"`): frontend — кавычки одинарные (JSX — двойные), linter исключает `public/**`; backend — глобальные `Bun`, `process`.

## Git, CI, релизы

- Ветка по умолчанию — `master`.
- **Conventional Commits обязательны для всех коммитов, включая коммиты агента**:
  `type(scope)!: description`; типы `feat` `fix` `docs` `style` `refactor` `perf`
  `test` `build` `ci` `chore` `revert`; breaking change — `!` после типа или футер
  `BREAKING CHANGE: ...`. Подробности и примеры — в `CONTRIBUTING.md`. От формата
  зависят версии и `CHANGELOG.md`.
- Три workflow в `.github/workflows/`:
  - `ci.yml` — install (frozen) → lint → test на **каждый push**;
  - `hexlet-check.yml` — **генерируется Хекслетом: не редактировать, не удалять, не переименовывать** (то же касается репозитория);
  - `release-please.yml` — на push в `master` держит release-PR.
- Релизы: release-please (`release-please-config.json`, `release-type: node`, путь `.`) ведёт версию в `version` корневого `package.json` и `.release-please-manifest.json`, пишет `CHANGELOG.md`, ставит теги `vX.Y.Z`. Release-PR открывается только при наличии `feat:`/`fix:`/breaking-коммитов. Бамп версии не ломает `bun install --frozen-lockfile`.
- `.gitignore` в корне: `node_modules/`, `dist/` — не коммитить.
