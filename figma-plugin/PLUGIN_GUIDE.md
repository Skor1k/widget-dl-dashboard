# Figma Plugin "Page to Figma" — Руководство по использованию

## Что делает плагин

Плагин создаёт страницы в Figma из JSON-описаний. Читает структуру компонентов, их пропсы и размещение, после чего импортирует компоненты из дизайн-библиотеки и выставляет нужные свойства.

**Основной сценарий использования:**
1. Написать/сгенерировать JSON-дескриптор страницы
2. Открыть плагин в Figma Desktop
3. Вставить JSON и нажать «Создать в Figma»

---

## Установка плагина

1. Собрать плагин:
   ```bash
   npm run build:plugin
   ```
   Создаётся `figma-plugin/dist/code.js` и копируется `ui.html`.

2. Открыть Figma Desktop → Меню → Plugins → Development → **Import plugin from manifest...**

3. Выбрать файл: `figma-plugin/manifest.json`

4. Плагин появится в меню: Plugins → Development → **Page to Figma**

> Пересобирать плагин (`npm run build:plugin`) нужно каждый раз после изменений в `figma-plugin/src/`.

---

## Интерфейс плагина

Плагин содержит три вкладки:

- **JSON** — вставить JSON-дескриптор страницы
- **Лог** — статус выполнения, ошибки, предупреждения
- **Пропсы** — результат сканирования компонентов

Кнопки:
- **Создать в Figma** — генерирует страницу из JSON
- **Сканировать** — сканирует propDefs компонентов из `component-map.ts`
- **Закрыть** — закрывает плагин

---

## Структура JSON-дескриптора

### Минимальный пример

```json
{
  "name": "MyPage",
  "page": {
    "width": 1440,
    "height": 900,
    "background": "#f0f2f5"
  },
  "card": {
    "width": 702,
    "paddingVertical": 28,
    "paddingHorizontal": 36,
    "gap": 16,
    "background": "#ffffff",
    "borderRadius": 14
  },
  "children": [
    {
      "type": "component",
      "component": "Header",
      "props": { "level": "h2" },
      "text": "Заголовок страницы"
    }
  ]
}
```

### Поля верхнего уровня

| Поле | Тип | Описание |
|------|-----|----------|
| `name` | string | Название frame на canvas |
| `page` | object | Размер и фон холста |
| `card` | object | Параметры карточки-контейнера |
| `children` | NodeDescriptor[] | Контент (если нет variants) |
| `variants` | PageVariant[] | Варианты страницы (несколько frame рядом) |

### `page`

```json
"page": {
  "width": 1440,
  "height": 900,
  "background": "#f0f2f5"
}
```

### `card`

```json
"card": {
  "width": 702,
  "paddingVertical": 28,
  "paddingHorizontal": 36,
  "gap": 16,
  "background": "#ffffff",
  "borderRadius": 14
}
```

### Варианты (`variants`)

Если нужно несколько вариантов страницы рядом:

```json
"variants": [
  {
    "name": "вариант-1",
    "children": [ ... ]
  },
  {
    "name": "вариант-2",
    "children": [ ... ]
  }
]
```

---

## Типы узлов (NodeDescriptor)

### `text` — текстовый блок

```json
{
  "type": "text",
  "text": "Любой текст",
  "style": {
    "fontFamily": "Inter",
    "fontSize": 16,
    "fontWeight": 400,
    "color": "#333333"
  },
  "width": "fill"
}
```

### `row` — горизонтальная строка

```json
{
  "type": "row",
  "gap": 16,
  "children": [
    { "type": "component", "component": "Button", "props": { "color": "accent", "size": "m" }, "text": "OK" },
    { "type": "component", "component": "Button", "props": { "color": "normal", "size": "m" }, "text": "Отмена" }
  ]
}
```

### `component` — компонент из дизайн-системы

```json
{
  "type": "component",
  "component": "Button",
  "props": {
    "color": "accent",
    "size": "m"
  },
  "text": "Нажать",
  "iconLeft": {
    "iconName": "Create",
    "category": "Actions"
  },
  "width": "fill"
}
```

Поля `component`:

| Поле | Тип | Описание |
|------|-----|----------|
| `component` | string | Название компонента (см. таблицу ниже) |
| `props` | object | Пропсы компонента (варианты) |
| `text` | string | Текст внутри компонента |
| `iconLeft` | object | Иконка слева: `{ iconName, category }` |
| `iconRight` | object | Иконка справа: `{ iconName, category }` |
| `resolvedIcons` | object | Прямые ключи компонентов иконок из Figma (приоритетнее iconLeft/iconRight) |
| `contentComponent` | NodeDescriptor | Вложенный компонент (для FormField) |
| `width` | "fill" \| number | Ширина: "fill" = растянуть, число = px |
| `propDefHints` | object | Подсказки для точной установки пропсов |

---

## Поддерживаемые компоненты и их пропсы

### Button

```json
{
  "type": "component",
  "component": "Button",
  "props": {
    "color": "accent",
    "size": "m"
  },
  "text": "Нажать"
}
```

| Проп | Значения |
|------|----------|
| `color` | `accent`, `normal`, `contrast`, `contour`, `text`, `text-supplementary`, `link` |
| `size` | `xs`, `s`, `m`, `l`, `xl` |

### MultiButton

```json
{
  "type": "component",
  "component": "MultiButton",
  "props": {
    "color": "gray",
    "size": "m",
    "width": "max"
  }
}
```

| Проп | Значения |
|------|----------|
| `color` | `accent`, `normal`, `gray` |
| `size` | `s`, `m`, `l` |
| `width` | `max`, `auto` |

### Header

```json
{
  "type": "component",
  "component": "Header",
  "props": { "level": "h2" },
  "text": "Заголовок"
}
```

| Проп | Значения |
|------|----------|
| `level` | `h1`, `h2`, `h3` |

### FormField

```json
{
  "type": "component",
  "component": "FormField",
  "props": {
    "label": "Название поля"
  },
  "contentComponent": {
    "type": "component",
    "component": "Select",
    "props": { "color": "contour", "size": "m" }
  }
}
```

| Проп | Значения |
|------|----------|
| `label` | string |
| `validationState` | `none`, `error`, `success`, `warning` |

### Select

```json
{
  "type": "component",
  "component": "Select",
  "props": {
    "color": "contour",
    "size": "m"
  }
}
```

| Проп | Значения |
|------|----------|
| `color` | `contour`, `contrast`, `normal` |
| `size` | `s`, `m`, `l` |

### TextInput

```json
{
  "type": "component",
  "component": "TextInput",
  "props": {
    "size": "m",
    "hasClearButton": true
  }
}
```

| Проп | Значения |
|------|----------|
| `size` | `s`, `m`, `l` |
| `hasClearButton` | `true` / `false` |

### Radiobox

```json
{
  "type": "component",
  "component": "Radiobox",
  "props": { "size": "m" }
}
```

| Проп | Значения |
|------|----------|
| `size` | `s`, `m`, `l` |

---

## Иконки

### Способ 1: через `iconLeft` / `iconRight`

Плагин сопоставляет `{ category, iconName }` через встроенный `ICON_MAP`.

```json
{
  "type": "component",
  "component": "Button",
  "props": { "color": "accent", "size": "m" },
  "text": "Создать",
  "iconLeft": { "iconName": "Create", "category": "Actions" }
}
```

### Способ 2: через `resolvedIcons` (точнее)

Прямой ключ component SET из Figma — берётся из `.figma-icons-sets-cache.json`.

```json
{
  "resolvedIcons": {
    "iconLeft": "33e1cb8efb9450c18a1634937f7de84235ffd9e0"
  }
}
```

---

## `propDefHints` — точная установка пропсов

Если плагин не может автоматически найти нужный prop-ключ в компоненте, можно указать подсказки:

```json
{
  "type": "component",
  "component": "Button",
  "props": { "color": "accent", "size": "m" },
  "text": "OK",
  "propDefHints": {
    "textPropKey": "TextContent#72462:15",
    "instanceSwapProps": {
      "iconleft(24)": "IconLeft (24)#69606:3124"
    },
    "boolProps": {
      "iconl": "IconL#24640:0"
    }
  }
}
```

Ключи (`TextContent#72462:15` и т.д.) берутся из результата сканирования (кнопка **Сканировать**).

---

## Режим сканирования

Нажать **Сканировать** — плагин пройдёт по всем компонентам из `component-map.ts` и покажет их `propDefs`:

```json
{
  "Button": {
    "textPropKey": "TextContent#72462:15",
    "instanceSwapProps": {
      "iconleft(24)": "IconLeft (24)#69606:3124"
    },
    "boolProps": {
      "iconl": "IconL#24640:0"
    }
  }
}
```

Этот результат сохранить как `.figma-propdefs-cache.json` в корне проекта — его использует `generate-page.ts` при генерации JSON.

---

## Автоматическая генерация JSON

Вместо ручного написания JSON можно сгенерировать его из TSX-файла:

```bash
npm run generate:figma -- src/MyPage.tsx
```

С обновлением кэша компонентов (делать при смене дизайн-библиотеки):

```bash
npm run generate:figma -- src/MyPage.tsx --refresh
```

Скрипт:
1. Парсит TSX через Babel AST
2. Находит все использования `@direct-frontend/components`
3. Строит JSON-дескриптор с вариантами (из тернарных веток)
4. Инжектирует `propDefHints` из кэша
5. Печатает JSON в stdout — вставить в плагин

---

## Необходимые переменные окружения (`.env`)

```env
FIGMA_ACCESS_TOKEN=<personal access token из Figma Settings → API>
FIGMA_FILE_KEY=<ключ целевого файла Figma>
FIGMA_LIBRARY_KEY=<ключ библиотеки компонентов>
FIGMA_ICONS_LIBRARY_KEY=<ключ библиотеки иконок>
```

Нужны только для `npm run generate:figma` — плагин в Figma Desktop работает без них (использует встроенный Plugin API).

---

## Известные ограничения

- **YS Text**: Plugin API не загружает YS Text из корпоративного font-сервера. Нужно установить шрифт системно: скопировать `.ttf` в `/Library/Fonts/` и перезапустить Figma Desktop.
- **INSTANCE_SWAP**: если ключ компонента иконки не совпадает с `componentKey` в `ICON_MAP` — иконка не подставится. Используйте `resolvedIcons` с прямым ключом.
- **setProperties**: если переданы некорректные значения пропсов — плагин попробует прямое редактирование текстового узла, но не откатит.

---

## Добавление нового компонента в плагин

Файл: `figma-plugin/src/component-map.ts`

```typescript
export const COMPONENT_MAP: Record<string, ComponentMapping> = {
  // ... существующие компоненты

  MyComponent: {
    componentKey: "хэш_из_figma_component_key",
    propAliases: {
      color: "Color",    // проп в коде → проп в Figma
      size: "Size",
    },
    valueAliases: {
      color: {
        primary: "Primary",
        secondary: "Secondary",
      },
      size: { s: "S", m: "M", l: "L" },
    },
  },
};
```

`componentKey` берётся через Figma API: `GET /v1/components?file_key=LIBRARY_KEY` или через MCP-инструмент `search_design_system`.

После изменений: `npm run build:plugin` → перезагрузить плагин в Figma (Plugins → Development → Page to Figma → Reload).
