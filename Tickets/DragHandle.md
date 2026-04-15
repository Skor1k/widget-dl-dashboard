# Drag handle иконка при наведении на виджет
**Статус:** done
**Создан:** 2026-04-14

## Цель
При наведении на виджет показывать иконку перетаскивания цвета supplementary.
Виджет можно тащить только за эту иконку.

## Шаги
- [x] Посмотреть иконку в Figma (node 41-57841) — Navigation/Menu, size=16
- [x] Listeners перенесены на иконку через React.cloneElement (dragHandleListeners/Attributes)
- [x] Иконка скрыта (opacity:0), появляется при .widget:hover (opacity:1)
- [x] Цвет: rgba(26, 43, 77, 0.4) — supplementary

## Контекст
- Figma: node 41-57841, file KQI6WuQNUIffxJ9A27HUKQ
- Listeners от useDraggable нужно переместить на иконку (drag handle), а setNodeRef оставить на контейнере
