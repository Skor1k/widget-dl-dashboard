# Маппинг React-компонента на Figma (component-map.ts)

## Когда использовать
Когда нужно добавить новый компонент из `@direct-frontend/components` в `COMPONENT_MAP`, чтобы Figma-плагин мог его создавать.

## Необходимые данные

Для маппинга нужны два источника:

1. **Figma componentKey** — ключ ComponentSet из библиотеки Figma
2. **Figma propDefs** — свойства компонента в Figma (VARIANT, BOOLEAN, TEXT, INSTANCE_SWAP)

## Пошаговая инструкция

### Шаг 1: Найти componentKey

**Вариант A — из кеша** (предпочтительный):
```bash
# Поиск по имени компонента в кеше библиотеки
node -e "
const cache = require('./scripts/.figma-components-cache.json');
const hits = cache.filter(c => c.name.toLowerCase().includes('COMPONENT_NAME'.toLowerCase()));
hits.forEach(c => console.log(c.name, '→', c.key));
"
```

**Вариант B — через Figma REST API**:
```bash
# Нужен FIGMA_ACCESS_TOKEN и FIGMA_LIBRARY_KEY из .env
source .env
curl -s -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/$FIGMA_LIBRARY_KEY/components" | \
  jq '.meta.components[] | select(.name | test("COMPONENT_NAME"; "i")) | {name, key}'
```

**Вариант C — через Figma MCP**:
Используй `get_metadata` или `search_design_system` для поиска компонента в библиотеке.

### Шаг 2: Получить propDefs

Запусти плагин с временной диагностикой. Добавь в `code.ts` после строки `const propDefs = compSet?.componentPropertyDefinitions ?? {};`:

```typescript
if (descriptor.component === "COMPONENT_NAME") {
  const allKeys = Object.entries(propDefs)
    .map(([k, v]) => `${k}(${(v as any).type})${(v as any).variantOptions ? `[${(v as any).variantOptions.join(",")}]` : ""}`)
    .join(" | ");
  figma.ui.postMessage({ type: "warning", text: `DIAG ${descriptor.component}: ${allKeys}` });
}
```

Или используй вкладку "Пропсы" в UI плагина для интерактивного просмотра.

### Шаг 3: Составить маппинг

Открой `figma-plugin/src/component-map.ts` и добавь запись по шаблону:

```typescript
ComponentName: {
  componentKey: "ключ_из_шага_1",
  propAliases: {
    // reactPropName: "FigmaPropBaseName"
    // Нужен ТОЛЬКО если имена различаются
  },
  valueAliases: {
    // reactPropName: { "react-value": "FigmaValue" }
    // Нужен ТОЛЬКО если значения различаются (обычно из-за регистра)
  },
  implicitBooleans: {
    // "FigmaParentBool": ["triggerProp1", "triggerProp2"]
    // Нужен если включение дочернего BOOLEAN требует сначала включить родительский
  },
},
```

### Шаг 4: Правила заполнения полей

#### `propAliases` — когда нужен

| Ситуация | Пример | Alias |
|----------|--------|-------|
| Имена совпадают (с учётом нормализации) | `size` → `Size` | **НЕ нужен** (авто) |
| Имена совпадают case-insensitive | `isSelected` → `isSelected` | **НЕ нужен** (авто) |
| Имена различаются | `hasClearButton` → `close` | `hasClearButton: "close"` |
| React JSX-элемент → Figma BOOLEAN | `labelBlock={<Label/>}` → `labelBlock(BOOLEAN)` | **НЕ нужен** |
| React callback → Figma BOOLEAN | `onClose={() => {}}` → `onClose(BOOLEAN)` | **НЕ нужен** |

**Правило**: если `reactProp.toLowerCase().replace(/\s/g,"")` === `figmaKey.replace(/#.*$/,"").toLowerCase().replace(/\s/g,"")`, alias НЕ нужен — `findPropKey()` найдёт автоматически.

#### `valueAliases` — когда нужен

| Figma propDef | React код | Alias |
|---------------|-----------|-------|
| `Color(VARIANT)[Message,Warning,Error]` | `color="warning"` | `color: { warning: "Warning" }` |
| `Size(VARIANT)[S,M,L]` | `size="m"` | `size: { s: "S", m: "M", l: "L" }` |
| `Color(VARIANT)[warning,error,success]` (lowercase) | `color="warning"` | **НЕ нужен** (совпадает) |

**Правило**: `mapPropsToFigma` пробует candidates по порядку:
1. `valueAliases[codeProp][codeValue]` — прямой маппинг
2. `codeValue` как есть — `"warning"`
3. `capitalize(codeValue)` — `"Warning"`
4. `codeValue.toUpperCase()` — `"WARNING"`

Если один из candidates совпадает с `variantOptions` — alias НЕ нужен. Alias нужен только когда React-значение не совпадает ни с одним candidate (например `gray` → `Normal`).

##### Частые ошибки в valueAliases

| Компонент | React | Figma | Правильный alias |
|-----------|-------|-------|-----------------|
| Button | `"text-supplementary"` | `"Text-Supplementary"` | дефис, НЕ пробел |
| MultiButton | `"gray"` | `"Normal"` | `gray: "Normal"` |
| MultiButton | `"white"` | `"Normal"` | `white: "Normal"` — тот же Figma-вариант |

⚠ Проверяйте точное написание Figma-варианта (дефисы, регистр, пробелы).

#### `implicitBooleans` — когда нужен

Если в Figma BOOLEAN-слот B видим ТОЛЬКО когда родительский BOOLEAN-слот A включён:
```typescript
implicitBooleans: { "A": ["B1", "B2"] }
```
Пример: InfoBlock — `labelBlock` и `onClose` видны только при `AddonRight=true`.

**Как определить**: включи BOOLEAN B вручную в Figma. Если ничего не появилось — ищи родительский BOOLEAN, который нужно включить первым.

### Шаг 5: Типы Figma-пропсов и как они обрабатываются

| Figma prop type | Что передаёт код | Как устанавливается |
|-----------------|-----------------|---------------------|
| `VARIANT` (Size, Color) | Строковое значение | `setProperties({ key: "Value" })` через valueAliases |
| `VARIANT` (True/False) | Boolean или непустая строка | `setProperties({ key: "True"/"False" })` — автоматический fallback |
| `BOOLEAN` | `true`/`false` | `setProperties({ key: true/false })` |
| `TEXT` | Строка (children/label) | `setProperties({ key: "текст" })` или `textNode.characters` (fallback) |
| `INSTANCE_SWAP` | Ключ компонента (иконки) | `setProperties({ key: componentKey })` через resolvedIcons |

### Шаг 6: Специальные пропы (обрабатываются вне component-map)

Эти пропы обрабатываются автоматически в `code.ts` и `ast-parser.ts` — НЕ нужно добавлять в propAliases:

| React проп | Обработка |
|------------|-----------|
| `children` (текст) | → `descriptor.text` → TEXT prop или `textNode.characters` |
| `iconLeft={Icon}` | → `descriptor.iconLeft` → INSTANCE_SWAP через propDefHints |
| `iconRight={Icon}` | → `descriptor.iconRight` → INSTANCE_SWAP через propDefHints |
| `icon={Icon}` | → `descriptor.icon` → INSTANCE_SWAP (icon-only, Text=False) |

⚠ В React-коде иконки передаются как **компонент-класс** (без `<>`):
`iconLeft={IconCreate}` — НЕ `iconLeft={<IconCreate size="16" />}`.
AST-парсер распознаёт оба варианта, но в runtime работает только компонент-класс.

| `options={ARRAY}` | → `descriptor.tabOptions` → лейблы табов |
| `buttons={<><Button/></>}` | → `descriptor.slotChildren` → текст в дочерних инстансах |

### Шаг 7: Верификация

⚠ **После добавления компонента ОБЯЗАТЕЛЬНО запустить с `--refresh`:**
```bash
npm run generate:figma -- src/YOUR_PAGE.tsx --refresh
```

```bash
# 1. Пересобрать JSON (после --refresh выше можно без него)
npm run generate:figma -- src/YOUR_PAGE.tsx

# 2. Проверить JSON
node -e "
const j = require('./figma-plugin/src/pages/YOUR_PAGE.json');
// Найти компонент и проверить props
const find = (nodes) => nodes.flatMap(n => [
  ...(n.component === 'COMPONENT_NAME' ? [n] : []),
  ...(n.children ? find(n.children) : [])
]);
j.variants.forEach(v => {
  const found = find(v.children);
  if (found.length) console.log(v.name + ':', JSON.stringify(found.map(f => f.props)));
});
"

# 3. Собрать плагин
npm run build:plugin

# 4. Запустить в Figma и проверить визуально
```

## Чеклист для ревью маппинга

- [ ] `componentKey` существует в кеше/библиотеке
- [ ] Все VARIANT пропы с отличающимися именами имеют propAliases
- [ ] Все VARIANT пропы с отличающимися значениями имеют valueAliases
- [ ] BOOLEAN пропы с зависимостями имеют implicitBooleans
- [ ] Текст children передаётся через `descriptor.text` (не через propAliases)
- [ ] Иконки передаются через `descriptor.iconLeft`/`iconRight`/`icon` (не через propAliases)
- [ ] Плагин собирается без ошибок: `npm run build:plugin`
- [ ] JSON генерируется без ошибок: `npm run generate:figma`
- [ ] Визуальная проверка в Figma пройдена

## Пример: полный маппинг InfoBlock

React код:
```tsx
<InfoBlock
  type="icon"           // → VARIANT Type="Icon"
  icon={IconInfo}        // → INSTANCE_SWAP (через resolvedIcons.icon)
  color="warning"        // → VARIANT Color="Warning"
  caption="Описание"     // → VARIANT Caption="True" + TEXT CaptionContent="Описание"
  labelBlock={<Label/>}  // → BOOLEAN labelBlock=true (+ implicitBooleans → AddonRight=true)
  onClose={() => {}}     // → BOOLEAN onClose=true (+ implicitBooleans → AddonRight=true)
  buttons={<><Button>Действие</Button></>}  // → BOOLEAN Buttons=true + slotChildren
>
  Информационное сообщение  // → TEXT Content="Информационное сообщение"
</InfoBlock>
```

Маппинг:
```typescript
InfoBlock: {
  componentKey: "b86e5f656fe88429b08c1b9c2b0b96c887774736",
  propAliases: {
    type: "Type",
    color: "Color",
    caption: "Caption",
  },
  valueAliases: {
    type: { icon: "Icon", text: "Text", illustration: "Illustration", image: "Image", custom: "Custom" },
    color: { message: "Message", island: "Island", inverted: "Inverted", info: "Info", warning: "Warning", error: "Error", success: "Success", ai: "AI" },
  },
  implicitBooleans: { AddonRight: ["labelBlock", "onClose"] },
},
```
