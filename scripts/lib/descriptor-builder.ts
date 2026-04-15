import type { ParseResult } from "./ast-parser";
import type { ComponentNode, DescriptorNode, PageDescriptor, PageVariant, RowNode } from "./types";

interface PageConfig {
  name: string;
  page: PageDescriptor["page"];
  card: PageDescriptor["card"];
}

/** Глубокое клонирование через JSON (достаточно для plain-data нодов) */
function deepClone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val));
}

/** Клонирует список нодов sharedBefore per-variant, инжектируя activeTabValue в tab-контроллеры.
 *  Все ноды клонируются (не по ссылке) — варианты независимы. */
function injectActiveTab(nodes: DescriptorNode[], variantName: string): DescriptorNode[] {
  return nodes.map(node => {
    // Всегда клонируем — варианты не должны делить ссылки на объекты
    const cloned = deepClone(node);
    if (cloned.type === "component" && (cloned as ComponentNode).isTabValueLinked) {
      (cloned as ComponentNode).activeTabValue = variantName;
      delete (cloned as any).isTabValueLinked;
    }
    return cloned;
  });
}

/** Собирает упорядоченный список имён вариантов из tabOptions + ternary variants */
function getOrderedVariantNames(
  parseResult: ParseResult
): string[] {
  // Без тернара — контент одинаков для всех вкладок, создавать несколько вариантов нет смысла
  const hasVariants = Object.keys(parseResult.variants).length > 0;
  if (!hasVariants) return [];

  // Ищем первый tab-контроллер с tabOptions в sharedBefore для правильного порядка
  for (const node of parseResult.sharedBefore) {
    if (node.type === "component" && (node as ComponentNode).tabOptions) {
      const opts = (node as ComponentNode).tabOptions!;
      return opts.map(o => o.value);
    }
  }
  // tabOptions не нашли — порядок из тернара
  return Object.keys(parseResult.variants);
}

/** Применяет variantExtras из RowNode к конкретному варианту: добавляет вариант-специфичных детей. */
function applyVariantExtras(nodes: DescriptorNode[], variantName: string): DescriptorNode[] {
  return nodes.map(node => {
    if (node.type !== "row") return node;
    const row = node as RowNode;
    const extras = row.variantExtras?.[variantName];
    if (!extras?.length) {
      // Возвращаем без variantExtras (очищаем)
      if (!row.variantExtras) return row;
      const cloned = deepClone(row) as RowNode;
      delete cloned.variantExtras;
      return cloned;
    }
    const cloned = deepClone(row) as RowNode;
    cloned.children = [...cloned.children, ...extras];
    delete cloned.variantExtras;
    return cloned;
  });
}

export function buildDescriptor(parseResult: ParseResult, config: PageConfig): PageDescriptor {
  const orderedNames = getOrderedVariantNames(parseResult);
  const ternaryVariants = parseResult.variants;
  const defaultContent = ternaryVariants[parseResult.defaultVariant] ?? [];

  let variants: PageVariant[];

  if (orderedNames.length > 0) {
    variants = orderedNames.map(name => {
      // Контент варианта: из тернара или из defaultVariant (для табов не в тернаре)
      const variantContent = ternaryVariants[name] ?? defaultContent;
      // sharedBefore с инжекцией activeTabValue
      const sharedWithTab = injectActiveTab(parseResult.sharedBefore, name);
      const sharedAfterForVariant = applyVariantExtras(parseResult.sharedAfter, name);
      return {
        name,
        children: [...sharedWithTab, ...variantContent, ...sharedAfterForVariant],
      };
    });
  } else {
    // Нет ни вариантов ни tabOptions — одна страница из shared нодов
    variants = [{
      name: config.name,
      children: [...parseResult.sharedBefore, ...parseResult.sharedAfter],
    }];
  }

  return {
    name: config.name,
    page: config.page,
    card: config.card,
    variants,
  };
}
