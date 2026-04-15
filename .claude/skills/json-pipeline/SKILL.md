# Пайплайн генерации JSON из TSX для Figma-плагина

## Когда использовать
Когда нужно понять, как TSX-страница превращается в JSON-дескриптор для Figma-плагина, или добавить поддержку новой страницы, или отладить проблему в генерации.

## Обзор пайплайна

```
TSX-файл → ast-parser.ts (Babel AST) → ParseResult → descriptor-builder.ts → PageDescriptor
                                                                                      ↓
                                                            generate-page.ts (пост-обработка)
                                                                                      ↓
                                                            + propDefHints (Figma API кеш)
                                                            + resolvedIcons (Figma API кеш)
                                                                                      ↓
                                                            JSON-файл → figma-plugin/src/pages/
```

## Команда запуска

```bash
npm run generate:figma -- src/MyPage.tsx           # использовать кеш
npm run generate:figma -- src/MyPage.tsx --refresh  # обновить кеши через Figma API
```

**Важно**: скрипт запускается через ts-node с отдельным tsconfig:
`ts-node --project tsconfig.node.json scripts/generate-page.ts`

Если в проекте файл называется `tsconfig.scripts.json` — используйте его.
Главное: `module: CommonJS` и `moduleResolution: node`.

**Переменные окружения** (в `.env`):
- `FIGMA_ACCESS_TOKEN` — Personal Access Token из Figma
- `FIGMA_LIBRARY_KEY` — ключ файла библиотеки компонентов
- `FIGMA_ICONS_LIBRARY_KEY` — ключ файла библиотеки иконок

Без этих переменных кеши нельзя обновить через `--refresh`, но если кеш-файлы уже есть — они используются.

---

## Этап 1: Парсинг TSX (`scripts/lib/ast-parser.ts`)

### Вход
Исходный код TSX-файла (строка) + опции (`htmlElementMap`).

### Выход
`ParseResult`:
```typescript
interface ParseResult {
  sharedBefore: DescriptorNode[];  // узлы ДО тернара (общие для всех вариантов)
  sharedAfter: DescriptorNode[];   // узлы ПОСЛЕ тернара
  variants: Record<string, DescriptorNode[]>;  // { "variantName": nodes }
  defaultVariant: string;          // имя дефолтного варианта (из useState)
}
```

### Что делает
1. **Парсит Babel AST** из TSX
2. **Собирает импорты** из `@direct-frontend/components`:
   - Компоненты → `directComponents: Map<localName, exportedName>`
   - Иконки (`/icons/` в пути) → `iconImports: Map<localName, IconRef>`
3. **Находит useState** для тернарного переключателя: `const [tab, setTab] = useState("one")` → `defaultVariant = "one"`, `ternaryStateVar = "tab"`
4. **Находит тернарный оператор** в JSX: `tab === "one" ? <A/> : tab === "two" ? <B/> : <C/>` → разбивает на варианты
5. **Обрабатывает JSX-элементы** рекурсивно через `jsxElementToNode()`:
   - Компоненты из `directComponents` → `ComponentNode`
   - HTML-теги из `htmlElementMap` → `ComponentNode` (маппинг)
   - Нативные контейнеры (`<div>`, `<section>` с className) → `RowNode` с `children`
   - Текстовые ноды → `TextNode`

### Какие пропсы захватываются

| Тип в TSX | Пример | Результат |
|-----------|--------|-----------|
| Строка | `color="warning"` | `props.color = "warning"` |
| Boolean (без значения) | `isCompact` | `props.isCompact = true` |
| Boolean `{true}` / `{false}` | `isSelected={false}` | `props.isSelected = false` |
| Строка в `{}` | `size={"m"}` | `props.size = "m"` |
| Иконка iconLeft/iconRight/icon | `iconLeft={<IconCreate/>}` | `node.iconLeft = { category, iconName }` |
| JSX/функция в пропе | `labelBlock={<Label/>}` или `onClose={() => {}}` | `props.labelBlock = true` + `slotChildren` |
| JSX-фрагмент | `buttons={<><Button>X</></>}` | `props.buttons = true` + `slotChildren.buttons` |
| useState boolean | `isSelected={check1}` (где `useState(true)`) | `props.isSelected = true` |
| `children` текст | `<Button>Текст</Button>` | `node.text = "Текст"` |
| `options={ARRAY}` | `options={tabItems}` → массив `[{value, label}]` | `node.tabOptions` |

### Что НЕ захватывается
- Числовые значения: `size={16}` — только строки и boolean
- Inline стили: `style={{ color: "red" }}`
- Spread пропсы: `{...props}`
- Вложенные children-контейнеры (рекурсия только 1 уровень)
- Условный рендер вне верхнего тернара (кроме `{stateVar === 'x' && <Component/>}` в нативных контейнерах)

---

## Правила структуры TSX-файла (для корректной генерации)

### ✅ Обязательно

1. **Все компоненты — прямо в `return()`**, не в переменных/функциях вне return
2. **Массивы опций — на уровне модуля** (вне компонента):
   ```tsx
   const options = [{ value: 'a', content: 'Один' }]; // ✓ на уровне модуля
   export const Page = () => <Select options={options} />;
   ```
3. **Два отдельных `<Radiobox>`** вместо одного с двумя options
   (Figma Radiobox_V3 — одиночный элемент)
4. **Кнопки в `buttons` пропе** — inline JSX-фрагмент:
   ```tsx
   <InfoBlock buttons={<><Button>Действие</Button></>}>
   ```

### ❌ Запрещено

- **JSX в переменных/useCallback**: `const btns = <><Button/></>;` → попадёт как отдельный top-level узел
- **RootThemeProvider/OverlayProvider в файле**: парсер их не понимает → лишние узлы
- **Функции возвращающие JSX**: `const helpFn = () => <Help/>` → фантомный узел
- **Массивы внутри компонента**: `const Page = () => { const opts = [...]; }` → парсер не найдёт

### Отдельный файл для генерации

Рекомендуется: `MyPage.tsx` — чистая страница БЕЗ провайдеров.
`App.tsx` — провайдеры + импорт MyPage. Генерировать JSON из MyPage.

---

### Условные элементы (`&&` паттерн)

Паттерн `{stateVar === 'variantName' && <Component/>}` внутри нативного контейнера (Row) → сохраняется в `RowNode.variantExtras[variantName]`. Потом `descriptor-builder` добавляет их только в нужный вариант.

---

## Этап 2: Сборка дескриптора (`scripts/lib/descriptor-builder.ts`)

### Вход
`ParseResult` + `PageConfig` (имя страницы, размеры page/card).

### Выход
`PageDescriptor` — финальная структура с вариантами.

### Что делает
1. **Определяет порядок вариантов**: из `tabOptions` (если есть tab-контроллер) или из ключей `variants`
2. **Создаёт `PageVariant[]`**: для каждого варианта:
   - Клонирует `sharedBefore` с инжекцией `activeTabValue` в tab-контроллеры
   - Берёт контент варианта из тернара (или `defaultVariant` как fallback)
   - Применяет `variantExtras` из `sharedAfter` (условные элементы `&&`)
3. **Если нет вариантов**: один вариант из `sharedBefore + sharedAfter`

### Поведение без тернарного оператора

Если в TSX нет `{state === 'x' ? <A/> : <B/>}`:
- Создаётся **одна страница** (не массив вариантов)
- `activeTabValue` = первый элемент из `tabOptions[0].value`
- Tab-контроллер показывает первый таб как активный

Если есть тернар:
- Создаётся **по варианту на каждое условие**
- `activeTabValue` инжектируется per-variant

---

## Этап 3: Пост-обработка (`scripts/generate-page.ts`)

После `buildDescriptor()` скрипт обогащает JSON двумя проходами:

### 3a. `injectPropDefHints` — подсказки из Figma API

Для каждого `ComponentNode` в дескрипторе ищет в кеше `propDefsCache`:
- `textPropKey` — точный ключ TEXT-пропа (например `"Label#99:12"`)
- `instanceSwapProps` — ключи INSTANCE_SWAP пропов (для иконок)
- `boolProps` — ключи BOOLEAN пропов

Результат записывается в `node.propDefHints`. Плагин использует эти подсказки для точного `setProperties()`.

### 3b. `injectResolvedIcons` — резолв иконок в Figma component SET keys

Для каждого `ComponentNode` с `iconLeft`, `iconRight` или `icon`:
1. Нормализует категорию + имя иконки: `Actions/Create` → `actions/create`
2. Ищет в кеше `iconSetsCache`: `"actions/create"` → `"figmaSetKey123"`
3. Fuzzy fallback: если не найдено по категории — ищет только по имени
4. Записывает в `node.resolvedIcons.iconLeft` / `.iconRight` / `.icon`

Плагин использует `resolvedIcons` для `setProperties({ iconKey: resolvedKey })`.

---

## Этап 4: Сохранение JSON

Файл сохраняется в `figma-plugin/src/pages/{pagename}.json`.

---

## Кеши (в `scripts/`)

| Файл | Содержимое | API endpoint | Когда обновлять |
|------|-----------|-------------|----------------|
| `.figma-components-cache.json` | Компоненты из библиотеки (name, key) | `/v1/files/{key}/components` | При добавлении компонентов в Figma-библиотеку |
| `.figma-icons-cache.json` | Иконки из библиотеки (name, key) | `/v1/files/{key}/components` | При добавлении иконок в библиотеку |
| `.figma-propdefs-cache.json` | PropDefs для компонентов из COMPONENT_MAP | `/v1/component_sets/{key}` + `/v1/files/{key}/nodes` | При изменении пропов компонентов в Figma |
| `.figma-icons-sets-cache.json` | Component SET keys иконок | `/v1/files/{key}/component_sets` | При добавлении иконок |

Обновление: `npm run generate:figma -- src/Page.tsx --refresh`

**Важно**: propDefs-кеш строится на основе `COMPONENT_MAP` из `component-map.ts`. Если добавлен новый компонент в COMPONENT_MAP — нужен `--refresh` чтобы получить его propDefs.

⚠ **После добавления нового компонента в COMPONENT_MAP — обязательно:**
```bash
npm run generate:figma -- src/Page.tsx --refresh
```
Иначе `propDefHints` для нового компонента не появятся в JSON.

---

## Структура JSON (PageDescriptor)

```typescript
interface PageDescriptor {
  name: string;                    // имя страницы
  page: { width, height, background };  // размеры Figma-страницы
  card: { width, padding*, gap, background, borderRadius };  // размеры карточки
  variants: [                      // массив вариантов (вкладок)
    {
      name: "one",                 // имя варианта
      children: [                  // дерево нодов
        {
          type: "component",
          component: "TabControl",
          props: { ... },
          tabOptions: [...],
          activeTabValue: "one",
        },
        {
          type: "row",
          gap: 16,
          children: [
            { type: "component", component: "Button", text: "Создать", props: { color: "accent", size: "m" }, iconLeft: { category: "Actions", iconName: "Create" }, resolvedIcons: { iconLeft: "figmaKey..." }, propDefHints: { textPropKey: "Label#..." } },
            { type: "component", component: "Button", text: "Отмена", props: { color: "normal", size: "m" } },
          ]
        }
      ]
    }
  ]
}
```

---

## Типы нодов

| Тип | Описание | Ключевые поля |
|-----|----------|---------------|
| `ComponentNode` | Компонент из дизайн-системы | `component`, `props`, `text`, `iconLeft/Right/icon`, `resolvedIcons`, `propDefHints`, `slotChildren`, `tabOptions`, `activeTabValue` |
| `RowNode` | Горизонтальная группа (из нативного контейнера с className) | `children`, `gap`, `variantExtras` |
| `TextNode` | Текстовый блок | `text`, `style` |

---

## Как добавить новую страницу

### 1. Создать конфиг страницы

В `scripts/generate-page.ts`, добавить в `PAGE_CONFIGS`:

```typescript
NewPage: {
  name: "NewPage",
  htmlElementMap: {
    "h1": { component: "Header" },
    "h2": { component: "Header" },
  },
  page: { width: 1440, height: 900, background: "#f0f2f5" },
  card: { width: 702, paddingVertical: 28, paddingHorizontal: 36, gap: 16, background: "#ffffff", borderRadius: 14 },
},
```

### 2. Убедиться, что все компоненты в COMPONENT_MAP

Все `@direct-frontend/components` на странице должны быть в `figma-plugin/src/component-map.ts`. Если нет — добавить по инструкции из скила `map-component`.

### 3. Сгенерировать JSON

```bash
npm run generate:figma -- src/NewPage.tsx
# или с обновлением кешей:
npm run generate:figma -- src/NewPage.tsx --refresh
```

### 4. Проверить JSON

```bash
node -e "
const j = require('./figma-plugin/src/pages/newpage.json');
console.log('Variants:', j.variants?.map(v => v.name));
j.variants?.forEach(v => {
  const comps = [];
  const walk = (nodes) => nodes.forEach(n => {
    if (n.type === 'component') comps.push(n.component);
    if (n.children) walk(n.children);
  });
  walk(v.children);
  console.log(v.name + ':', comps.join(', '));
});
"
```

### 5. Собрать плагин и проверить в Figma

```bash
npm run build:plugin
# Открыть Figma → Plugins → Development → Page to Figma → загрузить JSON
```

---

## Отладка

### Компонент не попадает в JSON

1. Проверить, что компонент импортирован из `@direct-frontend/components`:
   ```bash
   grep "import.*ComponentName.*from.*@direct-frontend" src/Page.tsx
   ```
2. Проверить, что нет в `COMPLEX_PROP_BLACKLIST` ast-парсера
3. Запустить с `console.log` в `jsxElementToNode` для отладки

### Пропс не захватывается

1. Проверить тип значения — числа (`size={16}`) не поддерживаются
2. Spread пропсы (`{...rest}`) не поддерживаются
3. Для useState boolean — проверить, что `useState(true/false)` распознан в `stateInitials`

### Иконка не резолвится

1. Проверить кеш: `node -e "const c = require('./scripts/.figma-icons-sets-cache.json'); console.log(Object.keys(c.sets).filter(k => k.toLowerCase().includes('iconname')))"`
2. Если иконки нет в кеше — `npm run generate:figma -- src/Page.tsx --refresh`
3. Если всё равно нет — иконка отсутствует в Figma-библиотеке иконок

### Шрифты в Figma Plugin — `loadFontAsync` падает

Figma Plugin API не может загружать веб-шрифты (CDN). YS Text нужно установить системно:
1. Скачать `.ttf` файлы
2. Скопировать в `/Library/Fonts/` (macOS)
3. Перезапустить Figma Desktop

### Вариант содержит лишние/недостающие элементы

1. Проверить `ParseResult`: `sharedBefore` (общие ДО тернара), `sharedAfter` (общие ПОСЛЕ), `variants` (per-variant)
2. Элементы с `{stateVar === 'x' && <Comp/>}` должны попасть в `variantExtras`
3. Если элемент попадает во все варианты — он в `sharedAfter` без `variantExtras` → проверить AST-парсинг
