# FIGMA_SYNC.md — Синхронизация Figma ↔ Производство

<!--
AGENT INSTRUCTIONS:
Этот документ описывает два workflow:
A) Figma → Код: реализовать дизайн из Figma в React-коде
B) Код → Figma: сгенерировать дизайн в Figma из существующего кода

Читай весь документ перед началом работы.
-->

---

## Направление A: Figma → Код

Пользователь даёт ссылку на Figma — нужно реализовать в коде.

### Шаг 1. Получить дизайн из Figma

Из URL извлечь `fileKey` и `nodeId`:
- URL: `figma.com/design/FILEKEY/Название?node-id=123-456`
- `fileKey` = `FILEKEY`
- `nodeId` = `123:456` (заменить `-` на `:`)

Вызвать MCP-инструмент:
```
get_design_context(fileKey, nodeId)
```

Инструмент вернёт:
- Скриншот экрана
- Код (React + Tailwind как справочный)
- Метаданные компонентов

### Шаг 2. Идентифицировать компоненты

Просмотреть скриншот и код. Для каждого UI-элемента найти соответствующий компонент из `@direct-frontend/components`.

**Таблица соответствий:**

| UI-элемент на скриншоте | Компонент библиотеки |
|------------------------|---------------------|
| Заголовок (h1/h2/h3) | `<Header level="h2">` |
| Поле ввода | `<TextInput size="m">` |
| Выпадающий список | `<Select color="contour" size="m">` |
| Кнопка | `<Button color="accent" size="m">` |
| Кнопка-переключатель (вкладки) | `<MultiButton>` |
| Форм-поле с лейблом | `<FormField label="...">` |
| Радиокнопка | `<Radiobox size="m">` |
| Загрузчик файлов | `<FileUploader>` |
| Строка-элемент | `<InfoItem>` |
| Ссылка | `<Link href="#">` |
| Иконка-кнопка | `<ClickableIcon icon={<IconX size="16" />}>` |

Если элемент не найден в таблице — поискать в библиотеке:
```
search_design_system(query="название компонента", fileKey)
```

Если в библиотеке нет ничего подходящего — **спросить у пользователя**, не изобретать HTML-вёрстку.

### Шаг 3. Реализовать TSX

Правила реализации:

1. **Использовать только `@direct-frontend/components`** — никаких `<div>`, `<h2>`, `<span>` без крайней необходимости
2. **Размеры**: подбирать ближайший size (`xs`/`s`/`m`/`l`/`xl`) визуально по скриншоту
3. **Цвета кнопок**: `accent` — синяя, `normal` — белая/серая, `contour` — с обводкой
4. **FormField** — всегда использовать render-prop:

```tsx
<FormField label="Название поля">
  {({ id, isDisabled, validationState,
      'aria-labelledby': ariaLabelledby,
      'aria-describedby': ariaDescribedby,
      'aria-errormessage': ariaErrorMessage }) => (
    <Select
      id={id}
      isDisabled={isDisabled}
      validationState={validationState}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      aria-errormessage={ariaErrorMessage}
      color="contour"
      size="m"
    >
      <Item key="1">Вариант</Item>
    </Select>
  )}
</FormField>
```

5. **Иконки** — импорт через subpath:
```tsx
import { IconCreate } from '@direct-frontend/components/icons/colorless/Actions/Create';
// size — строка: size="16", не size={16}
```

6. **App.tsx** должен содержать `RootThemeProvider` + `OverlayProvider`

### Шаг 4. Запустить и проверить визуально

```bash
npm start
```

Открыть http://localhost:3000, сравнить с Figma-скриншотом.

Если есть расхождения:
- Размер/отступ: проверить какой `size` или `padding` задан в Figma
- Цвет: пробовать другое значение пропа `color`
- Структура: перечитать скриншот внимательнее

### Шаг 5. Снять скриншот для сверки (опционально)

Если нужна точная сверка через Figma MCP:
```
get_screenshot(fileKey, nodeId)
```

Сравнить скриншот прода с Figma-скриншотом визуально.

---

## Направление B: Код → Figma

Реализованный React-код нужно отразить в Figma-дизайне.

### Шаг 1. Сгенерировать JSON-дескриптор

```bash
npm run generate:figma -- src/ИмяКомпонента.tsx
```

Скрипт парсит TSX через Babel AST и выводит JSON в stdout.

С обновлением кэша компонентов (если изменилась библиотека):
```bash
npm run generate:figma -- src/ИмяКомпонента.tsx --refresh
```

Требует заполненного `.env` с:
```
FIGMA_ACCESS_TOKEN=...
FIGMA_FILE_KEY=...
FIGMA_LIBRARY_KEY=...
FIGMA_ICONS_LIBRARY_KEY=...
```

### Шаг 2. Открыть Figma Plugin

1. Открыть Figma Desktop
2. Plugins → Development → **Page to Figma**
3. Если плагин не установлен: Plugins → Development → Import plugin from manifest → выбрать `figma-plugin/manifest.json`
4. Если код плагина изменился: `npm run build:plugin`, затем перезагрузить плагин в Figma

### Шаг 3. Вставить JSON и создать

1. Вкладка **JSON** → вставить вывод из шага 1
2. Нажать **Создать в Figma**
3. Плагин создаёт frame с компонентами из библиотеки

Проверить вкладку **Лог** на ошибки. Возможные проблемы:

| Сообщение | Решение |
|-----------|---------|
| `Unloaded font YS Text` | Установить `.ttf` файлы в `/Library/Fonts/`, перезапустить Figma Desktop |
| `Component not found` | Проверить `componentKey` в `figma-plugin/src/component-map.ts` |
| `Property does not exist` | Запустить **Сканировать** и обновить `propDefHints` в JSON |

### Шаг 4. Проверить совпадение

Сравнить визуально созданный frame с исходным дизайном.

Если нужна точная сверка через MCP:
```
get_screenshot(fileKey, nodeId)  → скриншот оригинала
```

---

## Маппинг пропсов: механизм и ограничения

### Типы Figma-пропсов и как они обрабатываются

| Figma prop type | Что делает | Как устанавливается |
|-----------------|-----------|-------------------|
| `VARIANT` | Управляет состоянием (Size, Color, Type) | `setProperties()` со значением из valueAliases |
| `BOOLEAN` | Показывает/скрывает слоты | `setProperties()` с boolean |
| `TEXT` | Текстовое содержимое в слоте | `setProperties()` с текстом (приоритет) или `textNode.characters` (fallback) |
| `INSTANCE_SWAP` | Меняет вложенный компонент (иконки) | `setProperties()` с key компонента или `swapComponent()` |

### Типы React-пропсов и захват ast-parser'ом

| Тип в TSX | Пример | Результат в JSON |
|-----------|--------|----------------|
| Строка | `color="warning"` | `"color": "warning"` |
| Boolean без значения | `isCompact` | `"isCompact": true` |
| Иконка iconLeft/iconRight | `iconLeft={<IconCreate/>}` | `iconLeft: { category, iconName }` + `resolvedIcons.iconLeft` |
| Иконка icon (generic) | `icon={IconInfo}` | `icon: { category, iconName }` + `resolvedIcons.icon` |
| JSX-элемент в пропе | `labelBlock={<Label/>}` | `"labelBlock": true` |
| Функция-коллбэк | `onClose={() => {}}` | `"onClose": true` |
| JSX-фрагмент в пропе | `buttons={<><Button>X</Button></>}` | `"buttons": true` + `slotChildren.buttons: [...]` |
| children строка | `<Button>Текст</Button>` | `text: "Текст"` |
| children вложенные | `<FileUploader><Link/></FileUploader>` | НЕ захватываются (limitation) |

### Правила маппинга в `component-map.ts`

1. `propAliases` — разница в именовании (React → Figma): `{ hasClearButton: "close" }`
2. `valueAliases` — разница в значениях: `{ color: { accent: "Accent" } }`
3. **True/False fallback** (автоматически) — если VARIANT имеет только [True, False] и передана непустая строка → "True"; текст слота также обновляется через поиск TEXT-узла по имени пропа
4. Для BOOLEAN-слотов (JSX-элемент/функция в пропе) — alias нужен: `{ labelBlock: "Label" }`

### Как добавить новый компонент

```typescript
// В figma-plugin/src/component-map.ts
NewComponent: {
  componentKey: "ключ из Figma",  // ComponentSet key из библиотеки
  propAliases: {
    reactPropName: "FigmaPropName",         // если имена разные
    labelBlock: "Label",                     // JSX-элемент → BOOLEAN слот
    onClose: "Close",                        // callback → BOOLEAN слот
  },
  valueAliases: {
    color: { "react-value": "FigmaValue" }, // если значения разные
  },
},
```

### Ограничения (что НЕ автоматизируется)

- Дочерние элементы вложенных контейнеров (`children` внутри `children`) — рекурсия не реализована
- Инлайн-стили (`style={{ ... }}`) — не захватываются
- Условный рендер вне верхнего тернара — не поддерживается
- Значения числовые (`size={16}`) — не захватываются, только строки и boolean
- Пропсы через spread (`{...props}`) — не захватываются

---

## Быстрый справочник

### Figma MCP инструменты

| Инструмент | Когда использовать |
|-----------|-------------------|
| `get_design_context(fileKey, nodeId)` | Главный инструмент. Получить код + скриншот фрейма |
| `get_screenshot(fileKey, nodeId)` | Только скриншот (без кода) |
| `get_metadata(fileKey, nodeId)` | Обзор структуры слоёв (имена, позиции, IDs) |
| `search_design_system(query, fileKey)` | Найти компонент в дизайн-системе |
| `get_variable_defs(fileKey, nodeId)` | Получить переменные (цвета, токены) |

### Ключи проекта (из `.env`)

```
FIGMA_ACCESS_TOKEN — личный токен
FIGMA_FILE_KEY     — целевой файл дизайна
FIGMA_LIBRARY_KEY  — библиотека компонентов
FIGMA_ICONS_LIBRARY_KEY — библиотека иконок
```

### Npm-команды

```bash
npm start                                    # Dev-сервер → http://localhost:3000
npm run build                                # Production-сборка
npm run build:plugin                         # Собрать Figma-плагин
npm run generate:figma -- src/MyPage.tsx     # TSX → JSON для плагина
```

---

## Чеклист синхронизации

**Figma → Код:**
- [ ] Получил дизайн через `get_design_context`
- [ ] Просмотрел скриншот и определил компоненты
- [ ] Все элементы mapped на `@direct-frontend/components`
- [ ] FormField использует render-prop (не спред)
- [ ] Иконки импортированы через subpath
- [ ] `npm start` запускается без ошибок
- [ ] Внешний вид совпадает с Figma визуально

**Код → Figma:**
- [ ] `.env` заполнен всеми ключами
- [ ] `npm run generate:figma` выполнен без ошибок
- [ ] JSON вставлен в плагин
- [ ] Плагин создал frame без ошибок в Лог
- [ ] Frame визуально совпадает с оригиналом
