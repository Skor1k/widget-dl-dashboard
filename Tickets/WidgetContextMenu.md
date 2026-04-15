# Контекстное меню виджета (иконка ⋮ → Удалить)
**Статус:** done
**Создан:** 2026-04-14

## Цель
Добавить в виджет иконку вертикального меню (⋮), по клику на которую появляется выпадающий список с пунктом «Удалить», удаляющим виджет с дашборда.

## Шаги
- [x] Заменить `onMenuClick` на `onDelete` в `Widget.tsx`
- [x] Добавить `MenuTrigger` + `List` + `ListItem` из `@direct-frontend/components`
- [x] Добавить `handleDeleteWidget` в `DashboardPage.tsx`
- [x] Пробросить `onDelete` во все виджеты через `useMemo + cloneElement`

## Контекст
- Дизайн: https://www.figma.com/design/KQI6WuQNUIffxJ9A27HUKQ/...?node-id=42-94852
- `MenuTrigger` принимает render-prop `trigger`; `ref` приходит как `Ref<HTMLElement>` — кастуется в `Ref<HTMLButtonElement>` для `ClickableIcon`
- `placement="bottom-end"` (не `"bottom end"` — floating-ui формат)
- Виджеты хранятся в `widgetMap` как ReactNode → `onDelete` инжектируется через `React.cloneElement` в `widgetMapWithDelete`
