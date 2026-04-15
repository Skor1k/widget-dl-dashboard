import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import type { ComponentNode, DescriptorNode, IconRef, TextNode, RowNode, SectionNode } from "./types";

const DIRECT_FRONTEND_PKG = "@direct-frontend/components";
const ICONS_PATH_SEGMENT = "/icons/";

export interface ParseOptions {
  /** Маппинг HTML-тегов → Figma-компоненты. Пример: { "h2": { component: "Header" } } */
  htmlElementMap?: Record<string, { component: string }>;
  /** Компоненты, которые всегда обходятся как прозрачные контейнеры (детей парсим отдельно).
   *  Используется для wrapper-компонентов вроде AlertLine, чьи дочерние слайды несут пропсы. */
  transparentWrappers?: Set<string>;
}

export interface ParseResult {
  /** Узлы общие для всех вариантов, стоящие ДО тернара */
  sharedBefore: DescriptorNode[];
  /** Узлы общие для всех вариантов, стоящие ПОСЛЕ тернара */
  sharedAfter: DescriptorNode[];
  /** Варианты из тернара: { variantName → nodes } */
  variants: Record<string, DescriptorNode[]>;
  /** Имя дефолтного варианта из useState */
  defaultVariant: string;
}

// Нормализует имя компонента из импорта иконки
// "@direct-frontend/components/icons/colorless/Actions/Create" → { category: "Actions", iconName: "Create" }
function parseIconPath(importPath: string): IconRef | null {
  const idx = importPath.indexOf(ICONS_PATH_SEGMENT);
  if (idx === -1) return null;
  const parts = importPath.slice(idx + ICONS_PATH_SEGMENT.length).split("/");
  if (parts.length < 2) return null;
  // parts: ["colorless", "Actions", "Create"] → последние два — category и name
  const iconName = parts[parts.length - 1];
  const category = parts[parts.length - 2];
  return { iconName, category };
}

function extractStringProp(value: t.JSXAttribute["value"]): string | undefined {
  if (t.isStringLiteral(value)) return value.value;
  if (t.isJSXExpressionContainer(value) && t.isStringLiteral(value.expression)) return value.expression.value;
  return undefined;
}

/** Извлекает текстовое содержимое JSX элемента (только прямые JSXText дочерние узлы) */
function getJSXTextContent(element: t.JSXElement): string | undefined {
  for (const child of element.children) {
    if (t.isJSXText(child)) {
      const trimmed = child.value.trim();
      if (trimmed) return trimmed;
    }
  }
  return undefined;
}

/** Проверяет, является ли @direct-frontend компонент прозрачным контейнером
 * (layout wrapper вроде Island/HStack/AlertLine — не leaf-компонент).
 * Критерий: 2+ прямых @direct-frontend детей ИЛИ тернарное выражение в детях.
 * Одиночный дочерний компонент (напр. <Link> внутри FileUploader) — это slot/контент, не layout. */
function isTransparentContainer(element: t.JSXElement, directComponents: Set<string>): boolean {
  let directCount = 0;
  for (const child of element.children) {
    if (t.isJSXElement(child)) {
      const childName = child.openingElement.name;
      if (t.isJSXIdentifier(childName) && directComponents.has(childName.name)) directCount++;
    }
    if (t.isJSXExpressionContainer(child) && t.isConditionalExpression(child.expression)) return true;
  }
  return directCount >= 2;
}

/** Извлекает [{value, label}] из ArrayExpression вида [{value: 'x', content: 'у'}, ...] */
function extractTabOptionsFromArrayExpr(
  arr: t.ArrayExpression
): Array<{ value: string; label: string }> | null {
  const items: Array<{ value: string; label: string }> = [];
  for (const el of arr.elements) {
    if (!t.isObjectExpression(el)) return null;
    let value: string | undefined;
    let label: string | undefined;
    for (const prop of el.properties) {
      if (!t.isObjectProperty(prop) || !t.isIdentifier(prop.key)) continue;
      const key = prop.key.name;
      const val = t.isStringLiteral(prop.value) ? prop.value.value : undefined;
      if (key === "value" && val !== undefined) value = val;
      if (key === "content" && val !== undefined) label = val;
    }
    if (value === undefined || label === undefined) return null;
    items.push({ value, label });
  }
  return items.length > 0 ? items : null;
}

/** Извлекает массив текстов из [{text: '...'}, ...] или [{text: '...', href: '...'}, ...] */
function extractTextArrayFromArrayExpr(arr: t.ArrayExpression): string[] | null {
  const texts: string[] = [];
  for (const el of arr.elements) {
    if (!t.isObjectExpression(el)) return null;
    let text: string | undefined;
    for (const prop of el.properties) {
      if (!t.isObjectProperty(prop) || !t.isIdentifier(prop.key)) continue;
      if (prop.key.name === "text" && t.isStringLiteral(prop.value)) {
        text = prop.value.value;
      }
    }
    if (text === undefined) return null;
    texts.push(text);
  }
  return texts.length > 0 ? texts : null;
}

/** Хранит массивы текстов из констант вида ARRAY = [{text: '...'}, ...].
 *  Сбрасывается в начале каждого вызова parsePage. */
let _textArrayConstants: Map<string, string[]> = new Map();

// Стандартные React-пропсы, которые не несут семантики для Figma
const COMPLEX_PROP_BLACKLIST = new Set([
  "classname", "style", "key", "ref", "id",
  "onchange", "onclick", "onblur", "onfocus",
  "onkeydown", "onkeyup", "onkeypress",
  "onmouseenter", "onmouseleave", "onmousedown", "onmouseup",
  "onsubmit", "oninput", "onscroll", "onresize",
]);

/** Рекурсивно извлекает @direct-frontend узлы из el, пропуская нативные div-обёртки */
function collectDirectChildren(
  el: t.JSXElement,
  directComponents: Set<string>,
  iconImports: Map<string, IconRef>,
  arrayConstants: Map<string, Array<{ value: string; label: string }>>,
  stateInitials?: Map<string, boolean>
): DescriptorNode[] {
  const nodes: DescriptorNode[] = [];
  for (const child of el.children) {
    if (!t.isJSXElement(child)) continue;
    const childName = t.isJSXIdentifier(child.openingElement.name) ? child.openingElement.name.name : "";
    if (directComponents.has(childName)) {
      const node = jsxElementToNode(child, directComponents, iconImports, arrayConstants, stateInitials);
      if (node) nodes.push(node);
    } else if (childName && childName[0] === childName[0].toLowerCase()) {
      nodes.push(...collectDirectChildren(child, directComponents, iconImports, arrayConstants, stateInitials));
    }
  }
  return nodes;
}

function jsxElementToNode(
  element: t.JSXElement,
  directComponents: Set<string>,
  iconImports: Map<string, IconRef>,
  arrayConstants: Map<string, Array<{ value: string; label: string }>>,
  stateInitials?: Map<string, boolean>
): DescriptorNode | null {
  const opening = element.openingElement;
  if (!t.isJSXIdentifier(opening.name)) return null;
  const name = opening.name.name;

  // Только компоненты из @direct-frontend (начинаются с заглавной)
  if (!directComponents.has(name)) return null;

  const props: Record<string, string | boolean | number> = {};
  let text: string | undefined;
  let iconLeft: IconRef | undefined;
  let iconRight: IconRef | undefined;
  let iconGeneric: IconRef | undefined;
  let contentComponent: ComponentNode | undefined;
  let tabOptions: Array<{ value: string; label: string }> | undefined;
  let _linkedVarName: string | undefined;
  let slotChildren: Record<string, ComponentNode[]> | undefined;

  // Атрибуты
  for (const attr of opening.attributes) {
    if (!t.isJSXAttribute(attr)) continue;
    if (!t.isJSXIdentifier(attr.name)) continue;
    const propName = attr.name.name;

    // Boolean prop (isCompact без значения)
    if (attr.value === null) { props[propName] = true; continue; }

    // Массив табов
    if (propName === "options" && t.isJSXExpressionContainer(attr.value)) {
      if (t.isIdentifier(attr.value.expression)) {
        const opts = arrayConstants.get(attr.value.expression.name);
        if (opts) tabOptions = opts;
      }
      continue;
    }

    // Ссылка на state-переменную (value={tab}) — не добавляем в props
    if (propName === "value" && t.isJSXExpressionContainer(attr.value)) {
      if (t.isIdentifier(attr.value.expression)) {
        _linkedVarName = attr.value.expression.name;
      }
      continue;
    }

    // Ссылка на иконку (iconLeft, iconRight или icon)
    if ((propName === "iconLeft" || propName === "iconRight" || propName === "icon") && t.isJSXExpressionContainer(attr.value)) {
      if (t.isIdentifier(attr.value.expression)) {
        const iconRef = iconImports.get(attr.value.expression.name);
        if (iconRef) {
          if (propName === "iconLeft") iconLeft = iconRef;
          else if (propName === "iconRight") iconRight = iconRef;
          else iconGeneric = iconRef;
          continue;
        }
      }
      // icon={<IconXxx size="16" />} — JSX-элемент: попробуем извлечь имя компонента
      if (propName === "icon" && (t.isJSXElement(attr.value.expression) || t.isJSXFragment(attr.value.expression))) {
        if (t.isJSXElement(attr.value.expression)) {
          const iconName = t.isJSXIdentifier(attr.value.expression.openingElement.name)
            ? attr.value.expression.openingElement.name.name : undefined;
          if (iconName) {
            const iconRef = iconImports.get(iconName);
            if (iconRef) { iconGeneric = iconRef; continue; }
          }
        }
        continue; // не эмитировать props.icon = true для icon-пропа
      }
    }

    // Строковый проп
    const strVal = extractStringProp(attr.value);
    if (strVal !== undefined) { props[propName] = strVal; continue; }

    // Числовой проп (width={380}, height={320} и т.п.)
    if (t.isJSXExpressionContainer(attr.value) && t.isNumericLiteral(attr.value.expression)) {
      props[propName] = attr.value.expression.value;
      continue;
    }

    // Identifier → подставляем начальное значение useState (для boolean state)
    if (t.isJSXExpressionContainer(attr.value) && t.isIdentifier(attr.value.expression)) {
      const initialVal = stateInitials?.get(attr.value.expression.name);
      if (initialVal !== undefined) {
        props[propName] = initialVal;
        continue;
      }
    }

    // JSX-элемент, функция, объект или ссылка на константу → emit propName: true (если не в чёрном списке)
    if (t.isJSXExpressionContainer(attr.value)) {
      const expr = attr.value.expression;
      const isJsxProp = t.isJSXElement(expr) || t.isJSXFragment(expr);
      const isFuncProp = t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr);
      const isObjProp = t.isObjectExpression(expr) || t.isArrayExpression(expr);
      const isRefProp = t.isIdentifier(expr); // не-state идентификаторы (BREADCRUMBS, ITEMS и т.п.)
      if (isJsxProp || isFuncProp || isObjProp || isRefProp) {
        const pLow = propName.toLowerCase();
        if (
          !COMPLEX_PROP_BLACKLIST.has(pLow) &&
          !pLow.startsWith("aria-") &&
          !pLow.startsWith("data-")
        ) {
          props[propName] = true;
          // ObjectExpression: извлекаем строковые свойства как плоские пропы (propName_key)
          if (isObjProp && t.isObjectExpression(expr)) {
            for (const p of (expr as t.ObjectExpression).properties) {
              if (!t.isObjectProperty(p) || !t.isIdentifier(p.key)) continue;
              if (t.isStringLiteral(p.value)) {
                props[propName + "_" + (p.key as t.Identifier).name] = p.value.value;
              }
            }
          }
          // Identifier: если ссылается на [{text:'...'}, ...] массив → объединяем через " / "
          if (isRefProp && t.isIdentifier(expr)) {
            const refTexts = _textArrayConstants.get((expr as t.Identifier).name);
            if (refTexts && refTexts.length > 0) {
              props[propName + "Text"] = refTexts.join(" / ");
            }
          }
          // Дополнительно: извлекаем дочерние компоненты из JSX-фрагментов/элементов
          if (isJsxProp) {
            const jsxChildren: t.JSXElement[] = t.isJSXFragment(expr)
              ? (expr.children.filter(c => t.isJSXElement(c)) as t.JSXElement[])
              : [expr as t.JSXElement];
            const childNodes: ComponentNode[] = [];
            for (const child of jsxChildren) {
              const childNode = jsxElementToNode(child, directComponents, iconImports, arrayConstants, stateInitials);
              if (childNode?.type === "component") childNodes.push(childNode);
            }
            if (childNodes.length > 0) {
              // InfoBlock: кнопки в слоте buttons всегда size=s, color=contrast
              if (name === "InfoBlock" && propName === "buttons") {
                for (const cn of childNodes) {
                  if (cn.component === "Button") {
                    cn.props = { ...cn.props, size: "s", color: "contrast" };
                  }
                }
              }
              if (!slotChildren) slotChildren = {} as Record<string, ComponentNode[]>;
              slotChildren[propName] = childNodes;
            }
          }
        }
      }
    }
  }

  // Children: текст, render-prop, или иконка-ребёнок (ClickableIcon)
  for (const child of element.children) {
    if (t.isJSXText(child)) {
      const trimmed = child.value.trim();
      if (trimmed) text = trimmed;
    }
    if (t.isJSXExpressionContainer(child)) {
      const expr = child.expression;
      // Render-prop: {({ id }) => <Select ... />}
      if ((t.isArrowFunctionExpression(expr) || t.isFunctionExpression(expr)) && t.isJSXElement(expr.body)) {
        const innerChild = jsxElementToNode(expr.body, directComponents, iconImports, arrayConstants, stateInitials);
        if (innerChild?.type === "component") contentComponent = innerChild;
      }
    }
    // JSX-иконка как прямой дочерний элемент (например <ClickableIcon><IconHeart size="24"/></ClickableIcon>)
    if (!iconGeneric && t.isJSXElement(child)) {
      const childName = t.isJSXIdentifier(child.openingElement.name) ? child.openingElement.name.name : null;
      if (childName) {
        const iconRef = iconImports.get(childName);
        if (iconRef) {
          iconGeneric = iconRef;
          // Захватываем size
          for (const attr of child.openingElement.attributes) {
            if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name) || attr.name.name !== "size") continue;
            if (t.isStringLiteral(attr.value)) props["iconSize"] = attr.value.value;
            else if (t.isJSXExpressionContainer(attr.value) && t.isNumericLiteral(attr.value.expression)) {
              props["iconSize"] = String(attr.value.expression.value);
            }
          }
        }
      }
    }
  }

  const node: ComponentNode = { type: "component", component: name };
  if (Object.keys(props).length > 0) node.props = props;
  if (text) node.text = text;
  if (iconLeft) node.iconLeft = iconLeft;
  if (iconRight) node.iconRight = iconRight;
  if (iconGeneric) node.icon = iconGeneric;
  if (contentComponent) node.contentComponent = contentComponent;
  if (tabOptions) node.tabOptions = tabOptions;
  if (slotChildren) node.slotChildren = slotChildren;
  if (_linkedVarName) (node as any)._linkedVarName = _linkedVarName;
  return node;
}

export function parsePage(source: string, options: ParseOptions = {}): ParseResult {
  const ast = parser.parse(source, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });

  const directComponents = new Set<string>();
  const iconImports = new Map<string, IconRef>(); // localName → IconRef
  let defaultVariant = "default";
  const sharedBefore: DescriptorNode[] = [];
  const sharedAfter: DescriptorNode[] = [];
  const variants: Record<string, DescriptorNode[]> = {};
  let ternaryEncountered = false;
  const arrayConstants = new Map<string, Array<{ value: string; label: string }>>();
  _textArrayConstants = new Map();
  let ternaryStateVar: string | undefined;
  const stateInitials = new Map<string, boolean>(); // varName → useState(true/false)
  // @direct-frontend компоненты, являющиеся прозрачными контейнерами (Island и т.п.)
  const transparentContainers = new WeakSet<t.JSXElement>();
  const sectionStack: DescriptorNode[][] = [];
  const sectionIslands = new WeakSet<t.JSXElement>();

  function getTarget(): DescriptorNode[] {
    if (sectionStack.length > 0) return sectionStack[sectionStack.length - 1];
    return ternaryEncountered ? sharedAfter : sharedBefore;
  }

  function hasDirectConditional(el: t.JSXElement): boolean {
    for (const child of el.children) {
      if (t.isJSXExpressionContainer(child) && t.isConditionalExpression(child.expression)) return true;
    }
    return false;
  }

  traverse(ast, {
    // Собираем статические массивы констант (OPTS = [{value, content}, ...])
    VariableDeclaration(path) {
      for (const decl of path.node.declarations) {
        if (!t.isIdentifier(decl.id) || !t.isArrayExpression(decl.init)) continue;
        const items = extractTabOptionsFromArrayExpr(decl.init);
        if (items) arrayConstants.set(decl.id.name, items);
        // Текстовые массивы [{text: '...'}, ...]
        const texts = extractTextArrayFromArrayExpr(decl.init);
        if (texts) _textArrayConstants.set(decl.id.name, texts);
      }
    },

    // Собираем импорты из @direct-frontend/components
    ImportDeclaration(path) {
      const src = path.node.source.value;
      if (src === DIRECT_FRONTEND_PKG) {
        for (const spec of path.node.specifiers) {
          if (t.isImportSpecifier(spec) && t.isIdentifier(spec.local)) {
            directComponents.add(spec.local.name);
          }
        }
      }
      if (src.startsWith(DIRECT_FRONTEND_PKG + ICONS_PATH_SEGMENT)) {
        const iconRef = parseIconPath(src);
        if (iconRef) {
          for (const spec of path.node.specifiers) {
            if (t.isImportSpecifier(spec) && t.isIdentifier(spec.local)) {
              iconImports.set(spec.local.name, iconRef);
            }
          }
        }
      }
    },

    // Ищем useState для defaultVariant и начальных boolean-значений
    CallExpression(path) {
      if (t.isIdentifier(path.node.callee) && path.node.callee.name === "useState") {
        const arg = path.node.arguments[0];
        if (t.isStringLiteral(arg) && arg.value !== '') defaultVariant = arg.value;
        // Трекаем boolean-инициализации: const [varName] = useState(true/false)
        if (t.isBooleanLiteral(arg)) {
          const parent = path.parentPath;
          if (parent?.isVariableDeclarator() && t.isArrayPattern(parent.node.id)) {
            const firstName = parent.node.id.elements[0];
            if (firstName && t.isIdentifier(firstName)) {
              stateInitials.set(firstName.name, arg.value);
            }
          }
        }
      }
    },

    // Обрабатываем тернарный оператор в JSX
    JSXExpressionContainer(path) {
      const expr = path.node.expression;
      if (!t.isConditionalExpression(expr)) return;

      // Определяем `someVar === 'variantName'` или `'variantName' === someVar`
      const test = expr.test;
      if (!t.isBinaryExpression(test) || (test.operator !== "===" && test.operator !== "!==")) return;

      let trueVariantName: string | undefined;
      let falseVariantName: string | undefined;

      if (t.isIdentifier(test.left) && t.isStringLiteral(test.right)) {
        trueVariantName = test.right.value;
        falseVariantName = defaultVariant;
        ternaryStateVar = test.left.name;
      } else if (t.isStringLiteral(test.left) && t.isIdentifier(test.right)) {
        trueVariantName = test.left.value;
        falseVariantName = defaultVariant;
        ternaryStateVar = test.right.name;
      } else {
        return;
      }

      if (test.operator === "!==") {
        // Меняем ветки при операторе !==
        [trueVariantName, falseVariantName] = [falseVariantName, trueVariantName];
      }

      // Помечаем что тернар встречен — последующие shared узлы идут в sharedAfter
      ternaryEncountered = true;

      function collectFromBranch(branch: t.ConditionalExpression["consequent"]): DescriptorNode[] {
        const nodes: DescriptorNode[] = [];
        if (t.isNullLiteral(branch) || (t.isIdentifier(branch) && branch.name === "undefined")) {
          return nodes;
        }
        if (t.isJSXFragment(branch)) {
          for (const child of branch.children) {
            if (t.isJSXElement(child)) {
              const childTag = t.isJSXIdentifier(child.openingElement.name) ? child.openingElement.name.name : "";
              // Прозрачный контейнер — парсим его детей вместо него самого
              if (options.transparentWrappers?.has(childTag) || isTransparentContainer(child, directComponents)) {
                for (const grandChild of child.children) {
                  if (t.isJSXElement(grandChild)) {
                    const node = jsxElementToNode(grandChild, directComponents, iconImports, arrayConstants, stateInitials);
                    if (node) nodes.push(node);
                  }
                }
              } else {
                const node = jsxElementToNode(child, directComponents, iconImports, arrayConstants, stateInitials);
                if (node) nodes.push(node);
              }
            }
          }
          return nodes;
        }
        if (t.isJSXElement(branch)) {
          const branchTag = t.isJSXIdentifier(branch.openingElement.name)
            ? branch.openingElement.name.name : "";
          // Прозрачный контейнер (AlertLine и т.п.) — пропускаем, парсим его детей
          if (options.transparentWrappers?.has(branchTag) || isTransparentContainer(branch, directComponents)) {
            for (const child of branch.children) {
              if (t.isJSXElement(child)) {
                const node = jsxElementToNode(child, directComponents, iconImports, arrayConstants, stateInitials);
                if (node) nodes.push(node);
              }
            }
          } else if (directComponents.has(branchTag)) {
            const node = jsxElementToNode(branch, directComponents, iconImports, arrayConstants, stateInitials);
            if (node) nodes.push(node);
          } else {
            // Нативный контейнер (div, section и т.п.) — извлекаем @direct-frontend детей
            for (const child of branch.children) {
              if (t.isJSXElement(child)) {
                const node = jsxElementToNode(child, directComponents, iconImports, arrayConstants, stateInitials);
                if (node) nodes.push(node);
              }
            }
          }
          return nodes;
        }
        // Вложенный тернар — рекурсия
        if (t.isConditionalExpression(branch)) {
          const subTest = branch.test;
          if (t.isBinaryExpression(subTest) && (subTest.operator === "===" || subTest.operator === "!==")) {
            let subTrueName: string | undefined;
            if (t.isIdentifier(subTest.left) && t.isStringLiteral(subTest.right)) {
              subTrueName = subTest.right.value;
            } else if (t.isStringLiteral(subTest.left) && t.isIdentifier(subTest.right)) {
              subTrueName = subTest.left.value;
            }
            if (subTest.operator === "!==") {
              if (subTrueName) variants[subTrueName] = collectFromBranch(branch.alternate);
              return collectFromBranch(branch.consequent);
            } else {
              if (subTrueName) variants[subTrueName] = collectFromBranch(branch.consequent);
              return collectFromBranch(branch.alternate);
            }
          }
        }
        return nodes;
      }

      if (trueVariantName) {
        variants[trueVariantName] = collectFromBranch(expr.consequent);
      }
      if (falseVariantName !== undefined) {
        variants[falseVariantName] = collectFromBranch(expr.alternate);
      }

      path.skip();
    },

    // Основной проход по JSX
    JSXElement: { enter(path: any) {
      const opening = path.node.openingElement;
      if (!t.isJSXIdentifier(opening.name)) return;
      const name = opening.name.name;

      // Пропускаем JSX внутри объявлений переменных (const x = <JSX/> — не render, не return)
      // Исключение: JSX внутри функции-компонента (const MyPage = () => { return <JSX/> })
      if (
        path.findParent((p: any) => p.isVariableDeclarator()) &&
        !path.findParent((p: any) => p.isArrowFunctionExpression() || p.isFunctionExpression() || p.isFunctionDeclaration())
      ) return;

      // Пропускаем вложенные в @direct-frontend компоненты (обрабатываются в родительском)
      // Исключение: прозрачные контейнеры (Island и т.п.) — в них заходим
      if (
        path.findParent(
          (p: any) =>
            p.isJSXElement() &&
            t.isJSXIdentifier((p.node as t.JSXElement).openingElement.name) &&
            directComponents.has(
              ((p.node as t.JSXElement).openingElement.name as t.JSXIdentifier).name
            ) &&
            !transparentContainers.has(p.node as t.JSXElement)
        )
      ) return;

      // Пропускаем если внутри JSXExpressionContainer с тернаром (обрабатывается выше)
      if (
        path.findParent((p: any) => {
          if (!p.isJSXExpressionContainer()) return false;
          return t.isConditionalExpression((p.node as t.JSXExpressionContainer).expression);
        })
      ) return;

      if (!directComponents.has(name)) {
        // Обрабатываем заголовочные теги (h1-h6) → ComponentNode или TextNode
        if (/^h[1-6]$/.test(name)) {
          const textContent = getJSXTextContent(path.node);
          if (textContent) {
            const htmlMapping = options.htmlElementMap?.[name];
            if (htmlMapping) {
              // Есть маппинг → создаём ComponentNode, плагин создаст библиотечный инстанс
              const node: ComponentNode = { type: "component", component: htmlMapping.component, text: textContent };
              // Автоматически добавляем level из тега (h1 → "h1", h2 → "h2", ...)
              node.props = { level: name };
              getTarget().push(node);
            } else {
              // Нет маппинга → fallback: сырой TextNode
              const level = parseInt(name[1], 10);
              const fontSizes: Record<number, number> = { 1: 32, 2: 24, 3: 20, 4: 18, 5: 16, 6: 14 };
              const fontWeights: Record<number, number> = { 1: 700, 2: 700, 3: 600, 4: 600, 5: 600, 6: 600 };
              getTarget().push({ type: "text", text: textContent, style: { fontSize: fontSizes[level] ?? 16, fontWeight: fontWeights[level] ?? 400 } } as TextNode);
            }
            path.skip();
          }
          return;
        }

        // Обрабатываем контейнеры (div, section и т.п.) с 2+ прямыми @direct-frontend детьми → RowNode
        // {stateVar === 'x' && <Component/>} — вариант-специфичные дети (в variantExtras)
        const directChildren: t.JSXElement[] = [];
        const conditionalElements = new Map<string, t.JSXElement[]>();
        for (const c of path.node.children) {
          if (t.isJSXElement(c)) {
            const childName = c.openingElement.name;
            if (t.isJSXIdentifier(childName) && directComponents.has(childName.name)) {
              directChildren.push(c);
            }
          } else if (t.isJSXExpressionContainer(c)) {
            const expr = c.expression;
            if (t.isLogicalExpression(expr) && expr.operator === "&&" && (t.isJSXElement(expr.right) || t.isJSXFragment(expr.right))) {
              if (t.isJSXElement(expr.right)) {
                const childName = (expr.right as t.JSXElement).openingElement.name;
                if (t.isJSXIdentifier(childName) && directComponents.has(childName.name)) {
                  const cond = expr.left;
                  let variantKey: string | undefined;
                  if (
                    ternaryStateVar &&
                    t.isBinaryExpression(cond) &&
                    cond.operator === "===" &&
                    t.isIdentifier(cond.left) &&
                    cond.left.name === ternaryStateVar &&
                    t.isStringLiteral(cond.right)
                  ) {
                    variantKey = cond.right.value;
                  }
                  if (variantKey !== undefined) {
                    const existing = conditionalElements.get(variantKey) ?? [];
                    existing.push(expr.right as t.JSXElement);
                    conditionalElements.set(variantKey, existing);
                  } else {
                    directChildren.push(expr.right as t.JSXElement);
                  }
                }
              } else if (t.isJSXFragment(expr.right)) {
                // JSXFragment: <>...</> — извлекаем все дочерние JSXElement
                const fragmentChildren = expr.right.children.filter(
                  (fc): fc is t.JSXElement => t.isJSXElement(fc)
                );
                const hasDirectChild = fragmentChildren.some(fc => {
                  const n = fc.openingElement.name;
                  return t.isJSXIdentifier(n) && directComponents.has(n.name);
                });
                if (hasDirectChild) {
                  const cond = expr.left;
                  let variantKey: string | undefined;
                  if (
                    ternaryStateVar &&
                    t.isBinaryExpression(cond) &&
                    cond.operator === "===" &&
                    t.isIdentifier(cond.left) &&
                    cond.left.name === ternaryStateVar &&
                    t.isStringLiteral(cond.right)
                  ) {
                    variantKey = cond.right.value;
                  }
                  if (variantKey !== undefined) {
                    const existing = conditionalElements.get(variantKey) ?? [];
                    for (const fc of fragmentChildren) {
                      existing.push(fc);
                    }
                    conditionalElements.set(variantKey, existing);
                  } else {
                    for (const fc of fragmentChildren) {
                      directChildren.push(fc);
                    }
                  }
                }
              }
            }
          }
        }

        // Если ≥ 4 прямых @direct-frontend детей — это основной контент-контейнер (вертикальный стек),
        // а не горизонтальная строка. Пропускаем создание RowNode — Babel обойдёт детей по одному.
        if (directChildren.length >= 4 && conditionalElements.size === 0) {
          return;
        }

        if (directChildren.length >= 2 || (directChildren.length >= 1 && conditionalElements.size > 0)) {
          const childNodes = directChildren
            .map(c => {
              const cName = t.isJSXIdentifier(c.openingElement.name) ? c.openingElement.name.name : "";
              if (cName && options.transparentWrappers?.has(cName)) {
                const sectionChildren = collectDirectChildren(c, directComponents, iconImports, arrayConstants, stateInitials);
                if (sectionChildren.length === 0) return null;
                const gapAttr = c.openingElement.attributes.find(
                  (a): a is t.JSXAttribute => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name) && (a.name as t.JSXIdentifier).name === "gap"
                );
                const gap = gapAttr && t.isStringLiteral(gapAttr.value) ? parseInt(gapAttr.value.value) : undefined;
                return { type: "section" as const, children: sectionChildren, ...(gap != null ? { gap } : {}) } as SectionNode;
              }
              return jsxElementToNode(c, directComponents, iconImports, arrayConstants, stateInitials);
            })
            .filter((n): n is DescriptorNode => n !== null);
          if (childNodes.length >= 2 || (childNodes.length >= 1 && conditionalElements.size > 0)) {
            const row: RowNode = { type: "row", gap: 16, children: childNodes };
            if (conditionalElements.size > 0) {
              const variantExtras: Record<string, ComponentNode[]> = {};
              for (const [variantName, elems] of conditionalElements) {
                const nodes = elems
                  .map(e => jsxElementToNode(e, directComponents, iconImports, arrayConstants, stateInitials))
                  .filter((n): n is ComponentNode => n !== null && n.type === "component");
                if (nodes.length > 0) variantExtras[variantName] = nodes;
              }
              if (Object.keys(variantExtras).length > 0) row.variantExtras = variantExtras;
            }
            getTarget().push(row);
            path.skip();
            return;
          }
        }

        // Не обрабатываем — дать Babel пройти в дочерние узлы
        return;
      }

      // Если это прозрачный контейнер (Island, AlertLine и т.п.) — не добавляем, просто обходим детей
      if (options.transparentWrappers?.has(name)) {
        transparentContainers.add(path.node);
        if (!hasDirectConditional(path.node)) {
          sectionStack.push([]);
          sectionIslands.add(path.node);
        }
        return;
      }

      if (isTransparentContainer(path.node, directComponents)) {
        transparentContainers.add(path.node);
        return;
      }

      const node = jsxElementToNode(path.node, directComponents, iconImports, arrayConstants, stateInitials);
      if (node) getTarget().push(node);
      path.skip();
    },
    exit(path: any) {
      if (!t.isJSXIdentifier(path.node.openingElement.name)) return;
      const exitName = (path.node.openingElement.name as t.JSXIdentifier).name;
      if (!options.transparentWrappers?.has(exitName) || !sectionIslands.has(path.node)) return;

      const children = sectionStack.pop()!;
      if (children.length === 0) return;
      const gapAttr = path.node.openingElement.attributes.find(
        (a: any) => t.isJSXAttribute(a) && t.isJSXIdentifier((a as t.JSXAttribute).name) && ((a as t.JSXAttribute).name as t.JSXIdentifier).name === 'gap'
      ) as t.JSXAttribute | undefined;
      const gap = gapAttr && t.isStringLiteral(gapAttr.value) ? parseInt(gapAttr.value.value) : undefined;
      const section: SectionNode = { type: "section", children, ...(gap != null ? { gap } : {}) };
      getTarget().push(section);
    },
  } as any,
  });

  // Линкуем isTabValueLinked и очищаем _linkedVarName по всем shared нодам
  function* iterateComponents(nodes: DescriptorNode[]): Generator<ComponentNode> {
    for (const node of nodes) {
      if (node.type === "component") yield node;
      else if (node.type === "row") yield* iterateComponents(node.children);
      else if (node.type === "section") yield* iterateComponents(node.children);
    }
  }

  for (const comp of iterateComponents([...sharedBefore, ...sharedAfter])) {
    const linkedVar = (comp as any)._linkedVarName as string | undefined;
    if (ternaryStateVar && linkedVar === ternaryStateVar) {
      comp.isTabValueLinked = true;
    }
    delete (comp as any)._linkedVarName;
  }

  return { sharedBefore, sharedAfter, variants, defaultVariant };
}
