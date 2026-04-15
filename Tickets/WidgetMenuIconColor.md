# Supplementary-цвет иконки меню в виджете
**Статус:** done
**Создан:** 2026-04-15

## Цель
Иконка ⋮ в виджете должна отображаться в supplementary-цвете дизайн-системы.

## Шаги
- [x] Убрать `color="current"` с `ClickableIcon` в `Widget.tsx`
- [x] Убрать хардкод `color: rgba(...)` из `.widget__menu-btn` в CSS

## Контекст
`ClickableIcon` по умолчанию имеет `color="gray"` и `role="supplementary"` — дизайн-система сама применяет нужный supplementary-цвет. Кастомный CSS переопределял это.
