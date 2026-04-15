import { COMPONENT_MAP } from "../../figma-plugin/src/component-map";

export interface CacheEntry {
  key: string;
  name: string;
  normalizedName: string;
}

export interface ResolveResult {
  key: string | null;
  source: "map" | "cache" | null;
  warning?: string;
}

export function normalizeName(figmaName: string): string {
  return figmaName
    // Remove emoji: emoji_presentation or in symbol/pictographic categories
    .replace(/[\p{Emoji_Presentation}\u2600-\u27BF\uFE00-\uFE0F]/gu, "")
    // Remove emoji regional indicators and other emoji modifiers
    .replace(/[\p{Regional_Indicator}]/gu, "")
    // Remove version suffix like _V6, _V5_Compact
    .replace(/_V\d+\w*/gi, "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();
}

export function resolveComponentKey(componentName: string, cache: CacheEntry[]): ResolveResult {
  // 1. Явный ключ в COMPONENT_MAP
  const mapping = COMPONENT_MAP[componentName];
  if (mapping) return { key: mapping.componentKey, source: "map" };

  // 2. Fuzzy поиск в кеше
  const normalizedQuery = normalizeName(componentName);
  const found = cache.find(entry => entry.normalizedName === normalizedQuery);
  if (found) return { key: found.key, source: "cache" };

  return {
    key: null,
    source: null,
    warning: `Компонент "${componentName}" не найден в COMPONENT_MAP и кеше Figma API — пропущен`,
  };
}
