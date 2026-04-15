# Улучшение модалки «Добавить виджет»
**Статус:** done
**Создан:** 2026-04-15

## Цель
Привести модалку к нужному виду: фиксированная ширина 480px, центрирование, MultiButton вместо Select.

## Шаги
- [x] Ширина 480px через `containerClassName="add-widget-modal"` + CSS
- [x] Центрирование через `position="center"` (проп Modal)
- [x] Select «Тип графика» заменён на MultiButton (`color="gray"`, `width="max"`)
- [x] Создан `AddWidgetModal.css`

## Контекст
- Modal не принимает числовые `width` — только `undefined` или `'max'`. Кастомная ширина задаётся через `containerClassName`.
- MultiButton в FormField не использует controlProps (они нужны только для интерактивных input-элементов с aria), поэтому render-prop вызывается с пустым деструктурингом.
