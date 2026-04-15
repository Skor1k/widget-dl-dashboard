# Страница дашборда
**Статус:** in_progress
**Создан:** 2026-04-14

## Цель
Создать страницу дашборда с PageHead, фильтрами и перетаскиваемыми виджетами с графиками.

## Шаги
- [x] Настроить проект (npm install, порт 3011)
- [x] Создать `DashboardPage` с PageHead, MultiButton, Select, Button «Добавить»
- [x] Создать компонент `Widget` (title, chart slot, drag handle)
- [x] Создать `WidgetCanvas` с DraggableList (перетаскивание)
- [x] Создать `AddWidgetModal` для добавления виджетов
- [x] SVG-графики: LineChartWidget, SparklineChart, MetricWidget
- [x] Исправить API MultiButton (name, color="white", size="xs")
- [x] Исправить API Select (items=[{value,content}], color="contrast", size="xs")
- [x] Убрать верхний отступ перед PageHead
- [x] Адаптивная сетка виджетов: 1→100%, 2→50%, 3→33% (6-колоночный grid)
- [x] Ряды виджетов: row-based DnD через @dnd-kit/core (BetweenRowsZone + InRowSlot + DragOverlay)
- [x] Подсветка зон перетаскивания (between-zone и slot-zone с CSS-анимацией)
- [x] DashboardPage переведён на API rows/widgetMap
- [x] Исправить перетаскивание (listeners на контейнер вместо отдельного handle div)
- [x] Исправить баг группировки: ряд на flexbox, слоты flex-basis вместо grid span (overflow fix)
- [x] Стиль overlay из Figma: border 2px solid #7A45E5, полная непрозрачность
- [ ] Подключить реальные данные в графики
- [ ] Настроить содержимое виджетов через модалку

## Контекст
- Компоненты только из `@direct-frontend/components`
- `Select` и `MultiButton` принимают `items=[{value, content}]`, не `<Item>` children
- `MultiButton` требует обязательный проп `name` для aria
- Ряды виджетов: flexbox, виджеты flex:1 1 0, слоты flex:0 0 8px (расширяются при hover)
- DnD: listeners на весь контейнер виджета, activationConstraint distance:6
- Drop zones: new-row:{index} (между рядами), in-row:{rowId}:{slotIndex} (внутри ряда)
