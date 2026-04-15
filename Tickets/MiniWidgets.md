# Мини-виджеты: раздельная компоновка
**Статус:** done
**Создан:** 2026-04-14

## Цель
Мини-виджеты (MetricWidget) не могут стоять в одном ряду с обычными.
Мини-ряд вмещает до 6 виджетов, обычный — до 3.

## Шаги
- [x] Добавить `type: 'regular' | 'mini'` в WidgetRow
- [x] Добавить `widgetTypes: Record<string, 'regular' | 'mini'>` в WidgetCanvasProps
- [x] canAcceptSlot: проверять совпадение типа и лимит (6 vs 3)
- [x] handleDragEnd: новый ряд получает тип перетаскиваемого виджета
- [x] DashboardPage: w4, w5, w8 → mini; row-2=[w4,w5,w8], row-4=[w7,w9]
- [x] AddWidgetModal: chartType=metric → mini, иначе regular

## Контекст
- w4 Расход, w5 CR, w8 CPA → mini
- w1–w3 Показы/Клики/CTR, w6 Конверсии, w7 CPC, w9 Охват → regular
- Новый INITIAL_ROWS: row-2 = [w4, w5, w8] (mini), row-4 = [w7, w9] (regular)
