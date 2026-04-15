# MyProject — Инструкции для агентов

## 🔧 Первый запуск в новом окружении

Если плагин `superpowers` ещё не установлен — выполни:

```bash
claude plugin install superpowers@claude-plugins-official --scope local
```

Перезапусти Claude Code после установки. Без superpowers скилы (`systematic-debugging` и др.) работать не будут.

---

## ⛔ ПРАВИЛО №1: КАРТИНКА = ВОПРОС ПЕРВЫМ

**ЕСЛИ СООБЩЕНИЕ ПОЛЬЗОВАТЕЛЯ СОДЕРЖИТ КАРТИНКУ/СКРИНШОТ — ТВОЙ ЕДИНСТВЕННЫЙ ПЕРВЫЙ ОТВЕТ:**

> Что делаем с картинкой?
> 1. Сканировать и собрать интерфейс — распознать элементы и согласовать
> 2. Сгенерировать JSON для Figma-плагина — распознать, согласовать, создать JSON
> 3. Проработать баг — распознать контекст и начать дебаггинг

**ЗАПРЕЩЕНО начинать любые другие действия до получения ответа:**
- ❌ описывать что на картинке
- ❌ искать иконки
- ❌ писать верстку
- ❌ генерировать JSON
- ❌ дебажить

**Даже если пользователь написал "реализуй это" или "вот скриншот, сделай" — всё равно сначала только этот вопрос.**

После ответа «1»: опиши элементы текстом → согласуй → верстай (только `@direct-frontend/components`).
После ответа «2»: опиши → согласуй → создай JSON в `figma-plugin/src/pages/<имя>.json`.
После ответа «3»: опиши проблему → root cause → гипотеза → минимальный фикс.

---

> **Настройка проекта / первый запуск / новая задача → читай [`AGENTS.md`](AGENTS.md)**
> Там полный онбординг, Section 0 — пошаговый setup, Section 0.5 — ведение тикетов.

## Ведение задач (ОБЯЗАТЕЛЬНО)

Для любой нетривиальной задачи (настройка, новая страница, дебаг, Figma-синк):

**1. Claude Code** — используй `TaskCreate` / `TaskUpdate` для отслеживания прогресса в сессии.

**2. Все агенты** — создай папку `Tickets/` (если не существует), затем файл `Tickets/ИмяЗадачи.md`:

```markdown
# Название задачи
**Статус:** in_progress
**Создан:** YYYY-MM-DD

## Цель
Что делаем и зачем.

## Шаги
- [ ] Шаг 1
- [x] Выполненный шаг

## Контекст
Ключевые решения и ограничения.
```

**В начале каждой сессии** — читай `Tickets/` и подхватывай контекст.
**В конце сессии** — обновляй статус и прогресс.

Полная инструкция → [`AGENTS.md` Section 0.5](AGENTS.md)

---

## Скилы проекта

Специфичные для проекта инструкции лежат в `skills/`:

| Скил | Когда использовать |
|------|--------------------|
| [`.claude/skills/sync-figma-icons/SKILL.md`](.claude/skills/sync-figma-icons/SKILL.md) | Добавление новых иконок из библиотеки Figma в `ICON_MAP` |
| [`.claude/skills/map-component/SKILL.md`](.claude/skills/map-component/SKILL.md) | Маппинг React-компонента на Figma в `COMPONENT_MAP` |
| [`.claude/skills/json-pipeline/SKILL.md`](.claude/skills/json-pipeline/SKILL.md) | Как работает пайплайн TSX → JSON для Figma-плагина (`generate-page.ts`) |
| [`.claude/skills/project-setup/SKILL.md`](.claude/skills/project-setup/SKILL.md) | Настройка нового проекта на `@direct-frontend/components` с нуля |

---

## Цель проекта

React + TypeScript приложение на дизайн-системе `@direct-frontend/components`.
Дополнительно: Figma-плагин "Page to Figma" для автоматической генерации дизайн-макетов из JSON, и скрипт `generate-page.ts` для парсинга TSX → JSON.

---

## Правила разработки

- **Только компоненты из `@direct-frontend/components`** — никаких нативных HTML-тегов (`<h2>`, `<p>`, `<span>`, `<div>` и т.д.) там, где есть аналог в библиотеке.
- Если нужный компонент не найден в библиотеке — **спросить у пользователя**, не писать хардкод.
- Отвечать пользователю **только на русском языке**.
- **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО**: при получении картинки/скриншота с UI — начинать любые действия до того, как задан уточняющий вопрос пользователю.

---

## Обработка картинок с UI (ОБЯЗАТЕЛЬНЫЙ ПРОТОКОЛ)

**ТРИГГЕР:** пользователь прислал картинку/скриншот с интерфейсом.

**ШАГ 1 — ТОЛЬКО ЭТО, НИЧЕГО БОЛЬШЕ.** Задай вопрос через `AskUserQuestion`:

> Что делаем с картинкой?
> 1. Сканировать и собрать интерфейс — распознать элементы и согласовать
> 2. Сгенерировать JSON для Figma-плагина — распознать, согласовать, создать JSON
> 3. Проработать баг — распознать контекст и начать дебаггинг

**Не делай ничего до получения ответа.** Ни описания, ни поиска иконок, ни верстки.

### После ответа «1 — Сканировать»

1. Опиши структуру текстом (все элементы сверху вниз, заголовки/кнопки/поля/алерты)
2. Спроси: «Всё верно? Есть что уточнить?» — жди подтверждения
3. Реализуй верстку по правилам проекта (только `@direct-frontend/components`)

### После ответа «2 — JSON для Figma»

1. Опиши структуру текстом
2. Спроси: «Всё верно?» — жди подтверждения
3. Создай JSON-дескриптор:
   - Корень: `{ name, page, card, variants[] }` или `{ name, page, card, children[] }`
   - Элементы: `{ type: "component", component: "...", props: {...}, text: "..." }`
   - Строки: `{ type: "row", gap: 16, children: [...] }`
   - Только компоненты из `COMPONENT_MAP` (`figma-plugin/src/component-map.ts`)
   - Сохранить в `figma-plugin/src/pages/<имя>.json`

### После ответа «3 — Баг»

1. Опиши что именно видно как проблему (что ожидалось vs что на картинке)
2. Дебажь через `superpowers:systematic-debugging`

### Красные флаги — СТОП

- «Картинка понятная, начну сразу» → **СТОП**, сначала вопрос
- «Найду иконки пока» → **СТОП**, сначала вопрос
- «Сгенерирую JSON без согласования» → **СТОП**, сначала согласование

---

## Запуск

```bash
npm start         # dev-сервер → http://localhost:3000
npm run build     # production-сборка в dist/
npm run build:plugin   # собрать Figma-плагин
npm run generate:figma -- src/MyPage.tsx   # сгенерировать JSON для Figma
```

---

## Стек

| Технология | Версия | Назначение |
|------------|--------|-----------|
| React | 18.2.0 | UI |
| TypeScript | 5.2.2 | Типизация |
| Webpack | 5.88.2 | Сборка (babel-loader, НЕ ts-loader) |
| Babel | 7.29.x | Транспиляция + l10n плагин |
| @direct-frontend/components | 0.16.1 | Дизайн-система (BEM CSS, ESM bundle) |
| @adv-frontend/l10n | 1.4.1 | i18n, `setI18nLang('ru')` в `index.tsx` |
| esbuild | latest | Только для Figma-плагина |

**Почему babel-loader, не ts-loader**: `@adv-frontend/l10n/babelI18nPlugin` требует Babel.

---

## Структура файлов

```
src/
  App.tsx          — RootThemeProvider + OverlayProvider + MyPage
  MyPage.tsx       — стартовая страница (замените на свою)
  MyPage.css       — стили карточки страницы
  fonts.css        — @font-face для YS Text (CDN)
  index.tsx        — setI18nLang('ru') + ReactDOM.createRoot

figma-plugin/
  src/
    code.ts              — Plugin runtime (Figma Plugin API)
    ui.html              — Plugin UI (три вкладки: JSON, Лог, Пропсы)
    component-map.ts     — Маппинг компонентов React → Figma componentKey
    pages/               — JSON-дескрипторы (генерируются скриптом)
  dist/                  — Собранный плагин (после npm run build:plugin)
  manifest.json          — Метаданные плагина

scripts/
  generate-page.ts       — Главный скрипт: TSX → JSON-дескриптор
  lib/
    ast-parser.ts        — Парсинг TSX через Babel AST
    descriptor-builder.ts — Построение PageDescriptor из ParseResult
    component-resolver.ts — Нормализация имён компонентов
    icon-resolver.ts     — Маппинг иконок на Figma component SET keys
    types.ts             — TypeScript типы

public/
  index.html             — HTML-шаблон webpack
```

---

## webpack.config.js — важные детали

### babel-loader исключает node_modules

```js
{
  test: /\.tsx?$/,
  use: 'babel-loader',
  exclude: /node_modules/,
}
```

### Обработка изображений (asset/resource)

```js
{ test: /\.(png|jpg|jpeg|gif|svg)$/i, type: 'asset/resource' }
```

### IgnorePlugin — отсутствующие PNG в пакете

Пакет `@direct-frontend/components@0.16.1` содержит баг: файл `AiAnimatedIcon/utils.js` импортирует анимированные PNG, которых нет в сборке. Заглушить:

```js
new webpack.IgnorePlugin({
  resourceRegExp: /\/icons\/animated\//,
})
```

### resolve.alias — неправильный путь в SummaryCard

`SummaryCard.js` использует неверный относительный путь `../../../src/lib/...` вместо `../../../lib/...`. Исправить через alias:

```js
alias: {
  [path.resolve(__dirname, 'node_modules/@direct-frontend/components/desktop/src')]:
    path.resolve(__dirname, 'node_modules/@direct-frontend/components/desktop/esm'),
}
```

---

## babel.config.js — обязательные пресеты

```js
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { browsers: ['last 2 versions'] } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  plugins: [
    ['@adv-frontend/l10n/babelI18nPlugin', { lang: 'ru' }],
  ],
};
```

---

## tsconfig.json — paths для иконок

Для TypeScript-резолюции subpath-импортов иконок:

```json
{
  "compilerOptions": {
    "paths": {
      "@direct-frontend/components/icons/*": [
        "./node_modules/@direct-frontend/components/types/src/icons/*"
      ]
    }
  }
}
```

---

## Ключевые паттерны кода

### FormField render-prop

`FormField` использует паттерн render-prop. **Нельзя** спредить весь `controlProps` — это ломает react-aria. Нужно деструктурировать только нужные пропсы:

```tsx
<FormField label="Название">
  {({ id, isDisabled, validationState, 'aria-labelledby': ariaLabelledby, 'aria-describedby': ariaDescribedby, 'aria-errormessage': ariaErrorMessage }) => (
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
      <Item key="1">Вариант 1</Item>
    </Select>
  )}
</FormField>
```

### Иконки — импорт через subpath

```tsx
import { IconCreate } from '@direct-frontend/components/icons/colorless/Actions/Create';
import { IconClose } from '@direct-frontend/components/icons/colorless/Actions/Close';

// Использование — компонент-класс, НЕ JSX-элемент:
<Button color="accent" size="m" iconLeft={IconCreate}>Создать</Button>
```

⚠ **Иконки передаются как компонент-класс (без `<>`), НЕ как JSX-элемент:**
- ✓ `iconLeft={IconCreate}`
- ✗ `iconLeft={<IconCreate size="16" />}` → TypeError

`IconSize` (при самостоятельном использовании) — строковый union: `size="16"`, **не** `size={16}`.

### Select — обязательный проп color

```tsx
<Select color="contour" size="m">  {/* color обязателен */}
  <Item key="1">Вариант 1</Item>
</Select>
```

### Button — доступные цвета

```tsx
type ButtonColor = 'accent' | 'normal' | 'contrast' | 'contour' | 'text' | 'text-supplementary' | 'link';
```

### FileUploader

```tsx
<FileUploader
  isCompact
  multiple
  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles([...files, ...Array.from(e.target.files)]);
  }}
>
  Перетащите файлы или <Link href="#">выберите вручную</Link>
</FileUploader>
```

### InfoItem с превью файла

```tsx
<InfoItem
  as="div"
  hasImage
  addonLeft={<FileThumb file={f} className="" />}
  addonRight={<ClickableIcon icon={<IconClose size="16" />} onClick={() => removeFile(i)} />}
>
  {f.name}
</InfoItem>
```

`addonLeft` ожидает `ReactElement<{ className: string }>` — компонент должен принимать `className`.

---

## Переменные окружения (`.env`)

```env
FIGMA_ACCESS_TOKEN=<personal access token из Figma Settings → API>
FIGMA_FILE_KEY=<ключ целевого файла>
FIGMA_LIBRARY_KEY=<ключ библиотеки компонентов>
FIGMA_ICONS_LIBRARY_KEY=<ключ библиотеки иконок>
```

Нужны для скрипта `generate-page.ts`. Для запуска веб-приложения (`npm start`) не нужны.

---

## Figma — компоненты дизайн-системы

Библиотека: `d7j2JJCU0EBCujpo4S1r66`

| Компонент | componentKey |
|-----------|-------------|
| Header_V4 | `289b1c524876349082948a175c0499df92b7677b` |
| MultiButton_V5 | `73577ebc928c4dcdea49e0e33250ce5092a8987e` |
| FormField_V6 | `8266b3e6ba42e072128de1bd5e9e1bb14c1ac88a` |
| Radiobox_V3 | `46079d6cdeffbd4d319f4f83f9ed6adb7c8b3868` |
| Button_V5 | `a765d5679f10f13e5e369e4df617396acca6d397` |
| Select | `4984064d1faed9af4cdf733869ce710f9dfd94e6` |
| TextInput | `b272d94a2f29da0d7573f24254a6be4df9eccd85` |

### Цветовые переменные Figma

| Переменная | key |
|------------|-----|
| `Color/Basic/Background/Secondary` (фон #f0f2f5) | `78b0d61d5678e1d54277939af5b443b5aba20999` |
| `Color/Basic/Background/Primary` (карточка #ffffff) | `9b5df4720f0c7cc55ed7ec5baf34f78a84de41e9` |

### Варианты компонентов (для Figma Plugin API)

- **Header_V4**: `Level=h2, Help=false, Stub=false` — TEXT prop: `Content#40980:0`
- **MultiButton_V5**: `Size=m, Color=Normal, Width=Max` (код `color="gray"` → Figma `Color=Normal`)
- **FormField_V6**: `Size=m, HorizontalLayout=False, CustomContent=False`
- **Button_V5**: `Size=m, Color=Accent/Normal, Width=auto, Text=True`

---

## Figma MCP

- **Локальный** (Figma Desktop App): `http://127.0.0.1:3845/mcp` — работает автоматически
- **Удалённый**: `https://mcp.figma.com/mcp` — добавить через:
  ```bash
  claude mcp add --scope user --transport http figma https://mcp.figma.com/mcp
  ```
  Требует OAuth (открыть `/mcp` в новой сессии Claude Code).

### Проблема YS Text в Plugin API

YS Text загружается через корпоративный font-сервер — Plugin API его не видит. `loadFontAsync` падает.

**Решение**: установить YS Text системно — скопировать `.ttf` файлы в `/Library/Fonts/` и перезапустить Figma Desktop.

---

> Полный список известных ошибок и инструкция по воспроизведению с нуля — в `ONBOARDING.md` (секции 12 и скилл `project-setup`).
