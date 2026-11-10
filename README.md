# 🏠 Домовёнок

<div align="center">

**Командный центр вашего дома: задачи, комнаты, расходы и один честный «Индекс порядка».**

[![CI](https://github.com/rtynbirf/domovenok/actions/workflows/ci.yml/badge.svg)](https://github.com/rtynbirf/domovenok/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io)
[![Bun](https://img.shields.io/badge/Bun-1.3-f472b6?logo=bun)](https://bun.sh)
[![tests](https://img.shields.io/badge/tests-18%20passing-10b981)](../../actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

![Обзор дома](docs/screenshots/overview.png)

</div>

---

## Зачем это

У каждого дома есть хозяин, а у хозяина — список дел, который всегда длиннее, чем хотелось бы.
**Домовёнок** складывает весь дом в один экран и отвечает на главный вопрос:
*«в порядке ли жилище?»* — цифрой от 0 до 100, а не ощущением.

Всё зелёное — дом сияет. Что-то жёлтое — есть над чем поработать. Красное — тревога, хозяин!

## Что внутри

| Модуль | Умеет |
| --- | --- |
| **Обзор** | Спидометр «Индекс порядка дома», ключевые счётчики, «Сегодня в фокусе», касса дома |
| **Задачи** | Быстрое добавление, фильтры по статусу и комнате, просрочки, приоритеты, редактирование |
| **Комнаты** | Карточка каждой зоны: сколько открыто, сколько просрочено, «разобрано на N%», свой статус |
| **Расходы** | Месячный бюджет, разбивка по категориям, журнал трат с удалением |

### Индекс порядка дома

Честная формула, покрытая юнит-тестами:

```
100
 − 2 за каждую открытую задачу          (не более −30)
 − 6 за каждую просроченную             (не более −36)
 − до 20 за перерасход бюджета          (−5 за каждые 5% превышения)
 + 2 за каждую комнату без открытых дел (не более +10)
 = Индекс 0…100
```

| Диапазон | Вердикт |
| --- | --- |
| 90–100 | ✨ Дом сияет |
| 75–89 | 🏡 Порядок! |
| 50–74 | 🧹 Есть над чем поработать |
| 25–49 | 🌪️ Запущенно |
| 0–24 | 🚨 Тревога, хозяин! |

## Скриншоты

| Задачи | Комнаты |
| --- | --- |
| ![Задачи](docs/screenshots/tasks.png) | ![Комнаты](docs/screenshots/rooms.png) |

| Расходы | Тёмная тема |
| --- | --- |
| ![Расходы](docs/screenshots/expenses.png) | ![Тёмная тема](docs/screenshots/dark-desktop.png) |

## Стек

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript 5** (strict)
- **Tailwind CSS 4** + shadcn/ui (New York) + Lucide + Framer Motion
- **Prisma 6 + SQLite** — ноль внешних зависимостей, дом живёт в одном файле
- **Bun** — установка, запуск, тесты
- **Vitest** — юнит-тесты чистой логики
- **GitHub Actions** — линт, типы, тесты и сборка на каждый коммит

## Быстрый старт

```bash
# 1. Зависимости
bun install

# 2. База данных (создаст db/custom.db по схеме prisma/schema.prisma)
cp .env.example .env
bun run db:push

# 3. Запуск
bun run dev          # http://localhost:3000
```

При первом запросе дом сам засеется демо-данными: 6 комнат, задачи и траты — можно играть сразу.

## Скрипты

| Команда | Что делает |
| --- | --- |
| `bun run dev` | Дев-сервер на :3000 |
| `bun run build` | Прод-сборка (standalone) |
| `bun run lint` | ESLint (конфиг Next.js 16) |
| `bun run typecheck` | `tsc --noEmit`, strict |
| `bun run test` | Vitest, юнит-тесты |
| `bun run db:push` | Схема Prisma → база |

## Структура

```
src/
├── app/
│   ├── api/               # bootstrap, tasks, rooms, expenses, settings
│   ├── layout.tsx         # Inter + Manrope (кириллица), темы, тосты
│   └── page.tsx           # единственный экран приложения
├── components/
│   ├── home/              # overview / tasks / rooms / expenses + спидометр
│   └── ui/                # shadcn/ui
├── hooks/use-house.ts     # данные + мутации с авто-обновлением
└── lib/
    ├── home-index.ts      # чистая логика индекса (под тестами)
    ├── house.ts           # сид и сводка по дому
    ├── types.ts           # справочники и DTO
    └── db.ts              # Prisma client
tests/unit/                # Vitest
prisma/schema.prisma       # Room / Task / Expense / Setting
.github/workflows/ci.yml   # lint → types → tests → build
```

## API

| Метод | Маршрут | Назначение |
| --- | --- | --- |
| GET | `/api/bootstrap` | Всё состояние дома одной выборкой |
| GET/POST | `/api/tasks` | Список / создание задач |
| PATCH/DELETE | `/api/tasks/[id]` | Правка (статус, срок, приоритет) / удаление |
| GET/POST | `/api/rooms` | Список / создание комнат |
| PATCH/DELETE | `/api/rooms/[id]` | Переименование / удаление |
| GET/POST | `/api/expenses` | Список / добавление трат |
| DELETE | `/api/expenses/[id]` | Удаление траты |
| GET/PUT | `/api/settings` | Месячный бюджет |

## Устав дома 📜

Правила, по которым вылизан этот репозиторий:

1. **Всё зелёное** — CI (линт, типы, тесты, сборка) обязан быть зелёным на каждом коммите.
2. **Никаких секретов в коде** — `.env` в игноре, есть `.env.example`.
3. **Типы не обсуждаются** — TypeScript strict, `tsc --noEmit` проходит без ошибок.
4. **Логика отделена от интерфейса** — формулы живёт в `lib/` и покрыта тестами.
5. **Пользователь не должен догадываться** — русские тексты, тосты, скелетоны, состояния ошибок.
6. **Дома и на телефоне одинаково уютно** — адаптив обязательный.

## Дорожная карта

- [ ] Регулярные дела (расписание уборок)
- [ ] Инвентарь дома с фото чеков
- [ ] Экспорт расходов в CSV
- [ ] PWA и офлайн-режим

## Лицензия

[MIT](./LICENSE) — делайте с домом что хотите, главное — держите его в порядке.
