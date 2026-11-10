#!/usr/bin/env bash
# Дымовая проверка дома: страницы, PWA, CSV-экспорт и рождение повторяшек.
# Запуск при поднятом дев-сервере: bash scripts/smoke.sh [base-url]
set -euo pipefail

BASE="${1:-http://localhost:3000}"
fail() { echo "✗ $1"; exit 1; }
ok() { echo "✓ $1"; }
code() { curl -s -o /dev/null -w "%{http_code}" "$1"; }

[[ "$(code "$BASE/")" == 200 ]] || fail "главная не отвечает"
ok "главная отвечает"

[[ "$(code "$BASE/manifest.webmanifest")" == 200 ]] || fail "PWA-манифест недоступен"
ok "PWA-манифест доступен"

[[ "$(code "$BASE/sw.js")" == 200 ]] || fail "service worker недоступен"
ok "service worker доступен"

[[ "$(code "$BASE/icons/icon-192.png")" == 200 ]] || fail "иконка PWA недоступна"
ok "иконки PWA на месте"

CSV="$(curl -s "$BASE/api/expenses/export")"
[[ "$CSV" == $'\xef\xbb\xbf'* ]] || fail "в CSV-экспорте нет BOM"
[[ "$CSV" == *"Дата;Категория;Название;Сумма"* ]] || fail "у CSV нет шапки"
ok "CSV-экспорт живой (BOM + шапка)"

# Повторяшка: завершаем задачу с repeatDays — должно родиться следующее повторение
# (берём повторяшку не в статусе done — дым можно запускать повторно)
TASK_ID="$(curl -s "$BASE/api/tasks" | jq -r '[.tasks[] | select(.repeatDays != null and .status != "done")][0].id // empty')"
[[ -n "$TASK_ID" ]] || fail "в доме нет повторяшек — сид не сработал"
SPAWNED="$(curl -s -X PATCH "$BASE/api/tasks/$TASK_ID" \
  -H 'Content-Type: application/json' -d '{"status":"done"}' | jq -r '.spawned.id // empty')"
[[ -n "$SPAWNED" ]] || fail "завершение повторяшки не породило следующее повторение"
ok "повторяшка завершилась и родила следующее повторение"

echo "Дымовая проверка пройдена: дом зелёный."
