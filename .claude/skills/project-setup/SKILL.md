# Настройка проекта на @direct-frontend/components

## Когда использовать
Когда нужно создать новое React-приложение на дизайн-системе `@direct-frontend/components` с нуля, или подключить библиотеку к существующему проекту.

## Главное правило

**Только компоненты из `@direct-frontend/components`** — никаких нативных HTML-тегов (`<h2>`, `<p>`, `<span>`, `<div>` и т.д.) там, где есть аналог в библиотеке. Если нужный компонент не найден — спросить у пользователя.

---

## Шаг 1: Инициализация и зависимости

```bash
npm init -y
```

### Runtime-зависимости

```bash
npm install react@18 react-dom@18 @direct-frontend/components @adv-frontend/l10n
```

| Пакет | Зачем |
|-------|-------|
| `react@18` + `react-dom@18` | UI-фреймворк |
| `@direct-frontend/components` | Дизайн-система (BEM CSS, ESM bundle) |
| `@adv-frontend/l10n` | i18n, **обязателен** — компоненты библиотеки используют его внутри |

### Dev-зависимости

```bash
npm install --save-dev \
  typescript \
  webpack webpack-cli webpack-dev-server \
  @babel/core @babel/preset-env @babel/preset-react @babel/preset-typescript \
  babel-loader css-loader style-loader html-webpack-plugin \
  @types/react @types/react-dom
```

**Почему babel-loader, а НЕ ts-loader**: пакет `@adv-frontend/l10n` содержит Babel-плагин `babelI18nPlugin`, который подставляет переводы на этапе компиляции. Без Babel — тексты компонентов будут пустыми.

### Dev-зависимости для Figma-плагина и генерации JSON (опционально)

```bash
# Если нужна генерация JSON для Figma-плагина:
npm install --save-dev ts-node @babel/parser @babel/traverse @babel/types dotenv esbuild @figma/plugin-typings
```

---

## Шаг 2: webpack.config.js

```js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      // ОБЯЗАТЕЛЬНО: Фикс бага в @direct-frontend/components@0.16.x
      // SummaryCard.js использует неверный путь ../../../src/lib/... вместо ../../../lib/...
      [path.resolve(__dirname, 'node_modules/@direct-frontend/components/desktop/src')]:
        path.resolve(__dirname, 'node_modules/@direct-frontend/components/desktop/esm'),
    },
  },
  module: {
    rules: [
      { test: /\.tsx?$/, use: 'babel-loader', exclude: /node_modules/ },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.(woff|woff2)$/, type: 'asset/resource', generator: { filename: 'fonts/[name][ext]' } },
      { test: /\.(png|jpg|jpeg|gif|svg)$/i, type: 'asset/resource' },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './public/index.html' }),
    // ОБЯЗАТЕЛЬНО: Фикс бага в @direct-frontend/components@0.16.x
    // AiAnimatedIcon/utils.js импортирует PNG из icons/animated/, которых нет в сборке
    new webpack.IgnorePlugin({ resourceRegExp: /\/icons\/animated\// }),
  ],
  devServer: { port: PORT, hot: true },  // PORT — спросить у пользователя (см. ниже)
};
```

### Критичные workaround'ы (без них сборка сломается)

| Workaround | Ошибка без него | Причина |
|------------|----------------|---------|
| `resolve.alias: desktop/src → desktop/esm` | `Can't resolve '../../../src/lib/css/className'` | Баг в `SummaryCard.js` — неверный относительный путь |
| `IgnorePlugin: /\/icons\/animated\//` | `Can't resolve AiAnimatedIcon/*.png` | Баг — импортирует PNG, которых нет в пакете |

---

## Шаг 3: babel.config.js

```js
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { browsers: 'last 2 versions' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  plugins: [
    // ОБЯЗАТЕЛЬНО: без этого плагина тексты компонентов будут пустыми
    [require.resolve('@adv-frontend/l10n/babelI18nPlugin'), { lang: 'ru' }],
  ],
};
```

**`lang: 'ru'`** — язык по умолчанию. Можно менять на `'en'` и другие поддерживаемые.

---

## Шаг 4: tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@direct-frontend/components/icons/*": [
        "./node_modules/@direct-frontend/components/types/src/icons/*"
      ]
    }
  },
  "include": ["src"]
}
```

### Критично: paths для иконок

Без `paths` TypeScript не найдёт типы для subpath-импортов иконок:
```
Cannot find module '@direct-frontend/components/icons/colorless/Actions/Create'
```

---

## Шаг 4b: tsconfig.node.json (для scripts/ и generate:figma)

Если в проекте есть папка `scripts/` (генерация JSON для Figma), нужен **отдельный** tsconfig:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node"
  },
  "include": ["scripts"]
}
```

Без него: `Unknown file extension ".ts"` при запуске `npm run generate:figma`.
**Причина**: основной tsconfig использует `module: ESNext`, а ts-node требует CommonJS.

---

## Шаг 4c (опц.): .env для Figma API

Если проект использует генерацию JSON (`scripts/generate-page.ts`):

```env
FIGMA_ACCESS_TOKEN=figd_...      # Personal Access Token из Figma Settings → API
FIGMA_LIBRARY_KEY=d7j2...       # ключ файла библиотеки компонентов (из URL)
FIGMA_ICONS_LIBRARY_KEY=KOTh... # ключ файла библиотеки иконок
```

Как найти ключ: открыть библиотеку в Figma → URL: `figma.com/file/{КЛЮЧ}/...`

Без `paths` TypeScript не найдёт типы для subpath-импортов иконок:
```
Cannot find module '@direct-frontend/components/icons/colorless/Actions/Create'
```

---

## Шаг 5: Точка входа — public/index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

---

## Шаг 6: src/index.tsx — инициализация i18n

```tsx
import { setI18nLang } from '@adv-frontend/l10n';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ОБЯЗАТЕЛЬНО: вызвать ДО рендера — иначе компоненты библиотеки не найдут переводы
setI18nLang('ru');

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Порядок важен**: `setI18nLang` должен быть вызван до первого `render()`.

---

## Шаг 7: src/App.tsx — обёртки провайдеров

```tsx
import { OverlayProvider, RootThemeProvider, defaultAdvLightTheme } from '@direct-frontend/components';
import React from 'react';

const App: React.FC = () => (
  <RootThemeProvider theme={defaultAdvLightTheme}>
    <OverlayProvider className="app__overlay-provider">
      {/* Здесь контент приложения */}
    </OverlayProvider>
  </RootThemeProvider>
);

export default App;
```

### Обязательные обёртки

| Провайдер | Зачем | Что сломается без него |
|-----------|-------|----------------------|
| `RootThemeProvider` | Подключает CSS-переменные темы | Все компоненты без стилей (цвета, шрифты) |
| `OverlayProvider` | Контейнер для оверлеев (Select, Tooltip, Dialog) | Выпадающие списки и модалки не откроются |

**`defaultAdvLightTheme`** — светлая тема по умолчанию. Импортируется из корня пакета.

---

## Шаг 8: Шрифт YS Text

Библиотека использует шрифт `YS Text`. Без него текст отрисуется системным шрифтом (видно по дизайну).

### Вариант A: CDN yastatic.net (рекомендуется — не нужны локальные файлы)

Создать `src/fonts.css` со ссылками на CDN:

```css
/* YS Text — CDN: https://yastatic.net/s3/home/fonts/ys/4/ */

/* Regular (400) */
@font-face {
  font-family: 'YS Text';
  src: url('https://yastatic.net/s3/home/fonts/ys/4/text-regular.woff2') format('woff2'),
       url('https://yastatic.net/s3/home/fonts/ys/4/text-regular.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'YS Text';
  src: url('https://yastatic.net/s3/home/fonts/ys/4/text-regular-italic.woff2') format('woff2'),
       url('https://yastatic.net/s3/home/fonts/ys/4/text-regular-italic.woff') format('woff');
  font-weight: 400;
  font-style: italic;
  font-display: swap;
}

/* Thin (100) */
@font-face {
  font-family: 'YS Text';
  src: url('https://yastatic.net/s3/home/fonts/ys/4/text-thin.woff2') format('woff2'),
       url('https://yastatic.net/s3/home/fonts/ys/4/text-thin.woff') format('woff');
  font-weight: 100;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'YS Text';
  src: url('https://yastatic.net/s3/home/fonts/ys/4/text-thin-italic.woff2') format('woff2'),
       url('https://yastatic.net/s3/home/fonts/ys/4/text-thin-italic.woff') format('woff');
  font-weight: 100;
  font-style: italic;
  font-display: swap;
}

/* Light (300) */
@font-face {
  font-family: 'YS Text';
  src: url('https://yastatic.net/s3/home/fonts/ys/4/text-light.woff2') format('woff2'),
       url('https://yastatic.net/s3/home/fonts/ys/4/text-light.woff') format('woff');
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'YS Text';
  src: url('https://yastatic.net/s3/home/fonts/ys/4/text-light-italic.woff2') format('woff2'),
       url('https://yastatic.net/s3/home/fonts/ys/4/text-light-italic.woff') format('woff');
  font-weight: 300;
  font-style: italic;
  font-display: swap;
}

/* Medium (500) */
@font-face {
  font-family: 'YS Text';
  src: url('https://yastatic.net/s3/home/fonts/ys/4/text-medium.woff2') format('woff2'),
       url('https://yastatic.net/s3/home/fonts/ys/4/text-medium.woff') format('woff');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'YS Text';
  src: url('https://yastatic.net/s3/home/fonts/ys/4/text-medium-italic.woff2') format('woff2'),
       url('https://yastatic.net/s3/home/fonts/ys/4/text-medium-italic.woff') format('woff');
  font-weight: 500;
  font-style: italic;
  font-display: swap;
}

/* Bold (700) */
@font-face {
  font-family: 'YS Text';
  src: url('https://yastatic.net/s3/home/fonts/ys/4/text-bold.woff2') format('woff2'),
       url('https://yastatic.net/s3/home/fonts/ys/4/text-bold.woff') format('woff');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'YS Text';
  src: url('https://yastatic.net/s3/home/fonts/ys/4/text-bold-italic.woff2') format('woff2'),
       url('https://yastatic.net/s3/home/fonts/ys/4/text-bold-italic.woff') format('woff');
  font-weight: 700;
  font-style: italic;
  font-display: swap;
}

/* Heavy (800) */
@font-face {
  font-family: 'YS Text';
  src: url('https://yastatic.net/s3/home/fonts/ys/4/text-heavy.woff2') format('woff2'),
       url('https://yastatic.net/s3/home/fonts/ys/4/text-heavy.woff') format('woff');
  font-weight: 800;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'YS Text';
  src: url('https://yastatic.net/s3/home/fonts/ys/4/text-heavy-italic.woff2') format('woff2'),
       url('https://yastatic.net/s3/home/fonts/ys/4/text-heavy-italic.woff') format('woff');
  font-weight: 800;
  font-style: italic;
  font-display: swap;
}

/* Black (900) */
@font-face {
  font-family: 'YS Text';
  src: url('https://yastatic.net/s3/home/fonts/ys/4/text-black.woff2') format('woff2'),
       url('https://yastatic.net/s3/home/fonts/ys/4/text-black.woff') format('woff');
  font-weight: 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'YS Text';
  src: url('https://yastatic.net/s3/home/fonts/ys/4/text-black-italic.woff2') format('woff2'),
       url('https://yastatic.net/s3/home/fonts/ys/4/text-black-italic.woff') format('woff');
  font-weight: 900;
  font-style: italic;
  font-display: swap;
}
```

CDN базовый путь: `https://yastatic.net/s3/home/fonts/ys/4/`

Также доступны семейства **YS Text Wide** и **YS Text Cond** по тому же паттерну:
- Wide: `text-wide-regular.woff2`, `text-wide-bold.woff2` и т.д.
- Cond: `text-cond-regular.woff2`, `text-cond-bold.woff2` и т.д.

### Вариант B: Локальные файлы (если CDN недоступен)

1. Скачать woff/woff2 файлы с CDN выше и положить в `public/fonts/`
2. Заменить URL в `fonts.css` на локальные пути:
```css
src: url('../public/fonts/text-regular.woff2') format('woff2'),
     url('../public/fonts/text-regular.woff') format('woff');
```

### index.css

Создать `src/index.css`:
```css
@import './fonts.css';

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'YS Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f0f2f5;
}
```

**Минимум**: Regular (400), Medium (500), Bold (700). Остальные начертания — опционально.

### Шрифты в Figma Plugin API

CDN-шрифты работают только в браузере. Figma Plugin API **не может** загружать веб-шрифты.
Для корректной работы плагина: установить YS Text системно — скопировать `.ttf` файлы
в `/Library/Fonts/` (macOS) и перезапустить Figma Desktop.
Без этого `loadFontAsync('YS Text', ...)` упадёт с ошибкой.

---

## Шаг 9: Порт dev-сервера

**ОБЯЗАТЕЛЬНО спросить у пользователя**, на каком порту запускать dev-сервер. Предложить варианты:

| Порт | Когда выбирать |
|------|---------------|
| `3000` | Стандартный для React-проектов (рекомендуется) |
| `8080` | Если порт 3000 занят другим проектом |
| `4200` | Если работаете параллельно с Angular-проектом |

После выбора — подставить порт в `webpack.config.js` (поле `devServer.port`) и в `package.json`.

---

## Шаг 10: Скрипты в package.json

```json
{
  "scripts": {
    "start": "webpack serve --mode development",
    "build": "webpack --mode production",
    "generate:figma": "ts-node --project tsconfig.node.json scripts/generate-page.ts",
    "build:plugin": "esbuild figma-plugin/src/code.ts --bundle --platform=browser --target=es6 --outfile=figma-plugin/dist/code.js && cp figma-plugin/src/ui.html figma-plugin/dist/ui.html"
  }
}
```

**Последние два скрипта** — только если есть `scripts/` и `figma-plugin/` (см. Шаг 4b).

---

## Шаг 11: Проверка

```bash
npm start
# Открыть http://localhost:{PORT}
# Должна быть пустая страница без ошибок в консоли
```

Если в консоли ошибки — см. раздел "Типичные ошибки" ниже.

---

## Паттерны использования компонентов

### Импорт компонентов

```tsx
import { Button, Select, Item, FormField, Header, TextInput } from '@direct-frontend/components';
```

### Импорт иконок (subpath)

```tsx
import { IconCreate } from '@direct-frontend/components/icons/colorless/Actions/Create';
import { IconClose } from '@direct-frontend/components/icons/colorless/Actions/Close';

// Использование:
<Button color="accent" size="m" iconLeft={IconCreate}>Создать</Button>
```

⚠ **Иконки передаются как компонент-класс (без `<>`), НЕ как JSX-элемент:**
- ✓ `iconLeft={IconCreate}`
- ✗ `iconLeft={<IconCreate size="16" />}` → TypeError в runtime

**Важно**: `size` иконки (при самостоятельном использовании) — **строка**: `size="16"`, не `size={16}`.

### Путь импорта иконок

```
@direct-frontend/components/icons/{тип}/{Категория}/{Имя}
```

- `{тип}` = `colorless` (монохром) или `color` (цветные)
- `{Категория}` = `Actions`, `Status`, `Navigation`, `Social` и т.д.
- `{Имя}` = `Create`, `Close`, `Info`, `Warning` и т.д.

Exported name всегда `Icon{Имя}` (например `IconCreate`, `IconClose`).

### FormField — render-prop паттерн

```tsx
<FormField label="Поле">
  {({ id, isDisabled, validationState, 'aria-labelledby': ariaLabelledby, 'aria-describedby': ariaDescribedby, 'aria-errormessage': ariaErrorMessage }) => (
    <TextInput
      id={id}
      isDisabled={isDisabled}
      validationState={validationState}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      aria-errormessage={ariaErrorMessage}
      size="m"
    />
  )}
</FormField>
```

**НЕЛЬЗЯ** спредить `controlProps` — `{...controlProps}` ломает react-aria. Деструктурируйте только нужные пропсы.

### Select — обязательный проп `color`

```tsx
<Select color="contour" size="m">
  <Item key="1">Вариант 1</Item>
  <Item key="2">Вариант 2</Item>
</Select>
```

Без `color` — компонент не отрендерится корректно.

### Button — цвета

```tsx
type ButtonColor = 'accent' | 'normal' | 'contrast' | 'contour' | 'text' | 'text-supplementary' | 'link';

<Button color="accent" size="m">Основное действие</Button>
<Button color="normal" size="m">Вторичное действие</Button>
```

⚠ В Figma вариант цвета `text-supplementary` называется `Text-Supplementary` (с **дефисом**).
В `component-map.ts`: `"text-supplementary": "Text-Supplementary"` — НЕ пробел!

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

### InfoItem с адонами

```tsx
<InfoItem
  as="div"
  hasImage
  addonLeft={<MyThumb className="" />}  // addonLeft требует className prop
  addonRight={<ClickableIcon icon={<IconClose size="16" />} onClick={handleRemove} />}
>
  Текст элемента
</InfoItem>
```

`addonLeft` ожидает `ReactElement<{ className: string }>` — компонент **обязан** принимать `className`.

---

## Типичные ошибки при сборке

| Ошибка | Причина | Решение |
|--------|---------|---------|
| `Can't resolve 'babel-loader'` | Не установлен | `npm i -D babel-loader` |
| `Can't resolve AiAnimatedIcon/*.png` | Баг пакета 0.16.x | `IgnorePlugin({ resourceRegExp: /\/icons\/animated\// })` |
| `Can't resolve '../../../src/lib/css/className'` | Баг SummaryCard | `resolve.alias: desktop/src → desktop/esm` |
| Пустые тексты в компонентах | Нет `babelI18nPlugin` | Добавить в `babel.config.js` plugins |
| Выпадающие списки не открываются | Нет `OverlayProvider` | Обернуть App в `OverlayProvider` |
| Нет стилей у компонентов | Нет `RootThemeProvider` | Обернуть App в `RootThemeProvider` |
| `Cannot find module ...icons/colorless/...` (TS) | Нет paths | Добавить `paths` в `tsconfig.json` |
| `setI18nLang is not a function` | Нет `@adv-frontend/l10n` | `npm install @adv-frontend/l10n` |

---

## Чеклист перед запуском

- [ ] `@direct-frontend/components` и `@adv-frontend/l10n` установлены
- [ ] webpack.config.js: `resolve.alias` для `desktop/src → desktop/esm`
- [ ] webpack.config.js: `IgnorePlugin` для `/icons/animated/`
- [ ] babel.config.js: `babelI18nPlugin` в plugins с `lang: 'ru'`
- [ ] tsconfig.json: `paths` для `@direct-frontend/components/icons/*`
- [ ] src/index.tsx: `setI18nLang('ru')` вызван ДО render
- [ ] src/App.tsx: `RootThemeProvider` + `OverlayProvider` обёртки
- [ ] Шрифты YS Text подключены через CDN или локально + `fonts.css`
- [ ] Порт dev-сервера согласован с пользователем и прописан в webpack.config.js
- [ ] `npm start` — страница открывается на выбранном порту без ошибок в консоли
