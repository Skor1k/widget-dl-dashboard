import { normalizeName, CacheEntry, ResolveResult } from "./component-resolver";
import type { IconRef } from "./types";

export function resolveIconKey(
  icon: IconRef,
  cache: CacheEntry[],
  iconMap: Record<string, string>
): ResolveResult {
  const mapKey = `${icon.category}/${icon.iconName}`;

  // 1. Явный ключ в ICON_MAP
  const key = iconMap[mapKey];
  if (key) return { key, source: "map" };

  // 2. Fuzzy поиск в кеше иконок по имени
  const normalizedQuery = normalizeName(icon.iconName);
  const found = cache.find(e => e.normalizedName === normalizedQuery);
  if (found) return { key: found.key, source: "cache" };

  return {
    key: null,
    source: null,
    warning: `Иконка "${mapKey}" не найдена в ICON_MAP и кеше — компонент будет создан без иконки`,
  };
}
