# Календарь звонков

[![hexlet-check](https://github.com/AlexPanich/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/AlexPanich/ai-for-developers-project-386/actions)
[![CI](https://github.com/AlexPanich/ai-for-developers-project-386/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexPanich/ai-for-developers-project-386/actions/workflows/ci.yml)

Сервис, в котором гость без регистрации выбирает тип события и бронирует слот у единственного владельца. Гость оставляет имя и email; аккаунтов нет. Владелец создаёт типы событий и видит предстоящие встречи — они видны всем, входа нет.

Старты лежат на сетке с 09:00 до 18:00 по Москве с шагом 30 минут, а длительность задаёт тип события: 45 минут занимают два стартов и не помещаются на 17:30. Одно время бронируется не более одного раза, даже у разных типов событий. Выбор ограничен окном в 14 дней, отмены и изменения бронирования нет. Правила целиком — в [SPEC.md](SPEC.md), термины — в [GLOSSARY.md](GLOSSARY.md).

- Учебный проект Хекслета: <https://ru.hexlet.io/programs/ai-for-developers>
- Как это должно работать: <https://files.hexlet.app/a/2ipc5m>

## Статус

Проект в разработке. Инфраструктура готова и работает: монорео, линтер, тесты, CI на каждый push и автоматические релизы. Функциональность сервиса дорабатывается.

## Стек

| Слой | Технологии |
|---|---|
| Бекенд | Bun, TypeScript, [Elysia](https://elysiajs.com) |
| Фронтенд | React 19, TypeScript, [Vite](https://vite.dev) |
| Качество кода | [Biome](https://biomejs.dev) (линтер + форматтер), Bun Test |
| Автоматизация | GitHub Actions, release-please |

## Установка

Требуется [Bun](https://bun.sh) 1.4 или новее.

```bash
git clone https://github.com/AlexPanich/ai-for-developers-project-386.git
cd ai-for-developers-project-386
bun install
```

## Запуск

```bash
bun run dev            # бекенд и фронтенд одновременно
bun run dev:backend    # API  → http://localhost:3000
bun run dev:frontend   # SPA  → http://localhost:5173
```

## Команды

| Команда | Что делает |
|---|---|
| `bun run lint` | Проверка линтером и форматированием (Biome) |
| `bun run lint:fix` | Автоисправление замечаний линтера |
| `bun run format` | Форматирование кода |
| `bun run test` | Тесты бекенда и фронтенда |
| `bun run test:backend` | Только тесты бекенда |
| `bun run test:frontend` | Только тесты фронтенда |

Запуск одного теста — через скрипт пакета: `bun run test:frontend -- -t "Название теста"`.

## Структура репозитория

```
apps/
  backend/    # API на Elysia (порт 3000)
    src/app.ts      — само приложение (роуты)
    src/index.ts    — точка входа, запуск сервера
    test/           — интеграционные smoke-тесты
  frontend/   # SPA на React + Vite (порт 5173)
    src/            — компоненты, стили, тесты
```

Монорео на Bun workspaces: команды из корня выполняются во всех пакетах.

## Качество кода и CI

На каждый push GitHub Actions запускает:

- **CI** (`ci.yml`) — установка зависимостей (`--frozen-lockfile`), линтер, тесты;
- **hexlet-check** (`hexlet-check.yml`) — автотесты Хекслета.

То же самое локально, перед каждым коммитом:

```bash
bun run lint && bun run test
```

## Коммиты и релизы

- Сообщения коммитов — по спецификации
  [Conventional Commits](https://www.conventionalcommits.org/ru/v1.0.0/):
  `feat: добавить слоты`, `fix: починить часовой пояс`, `chore: обновить зависимости`.
  Полные правила — в [CONTRIBUTING.md](CONTRIBUTING.md).
- Релизы автоматические: **release-please** читает историю коммитов, считает версию
  по [семантическому версионированию](https://semver.org/lang/ru/), собирает
  `CHANGELOG.md` и держит release-PR открытым. Смержили release-PR — появляется
  тег `vX.Y.Z` и GitHub Release.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
