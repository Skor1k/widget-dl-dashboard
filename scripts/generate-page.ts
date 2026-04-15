import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

import { parsePage } from "./lib/ast-parser";
import { buildDescriptor } from "./lib/descriptor-builder";
import { normalizeName, CacheEntry } from "./lib/component-resolver";
import { COMPONENT_MAP } from "../figma-plugin/src/component-map";
import type { DescriptorNode, ComponentNode, PropDefHints, PageDescriptor } from "./lib/types";

dotenv.config();

// ─── Конфигурация страниц ────────────────────────────────────────────────────

const PAGE_CONFIGS: Record<string, { name: string; htmlElementMap?: Record<string, { component: string }>; page: any; card: any }> = {
  MyPage: {
    name: "MyPage",
    htmlElementMap: {
      "h1": { component: "Header" },
      "h2": { component: "Header" },
      "h3": { component: "Header" },
      "h4": { component: "Header" },
      "h5": { component: "Header" },
    },
    page: { width: 1440, height: 900, background: "#f0f2f5" },
    card: { width: 702, paddingVertical: 28, paddingHorizontal: 36, gap: 16, background: "#ffffff", borderRadius: 14 },
  },
};

// ─── Figma API кеш ──────────────────────────────────────────────────────────

const COMPONENTS_CACHE_PATH = path.resolve(__dirname, ".figma-components-cache.json");
const ICONS_CACHE_PATH = path.resolve(__dirname, ".figma-icons-cache.json");
const PROPDEF_CACHE_PATH = path.resolve(__dirname, ".figma-propdefs-cache.json");
const ICON_SETS_CACHE_PATH = path.resolve(__dirname, ".figma-icons-sets-cache.json");

async function fetchFigmaComponents(fileKey: string, token: string): Promise<CacheEntry[]> {
  const url = `https://api.figma.com/v1/files/${fileKey}/components`;
  const res = await fetch(url, { headers: { "X-Figma-Token": token } });
  if (!res.ok) throw new Error(`Figma API error: ${res.status} ${res.statusText}`);
  const data = await res.json() as any;
  return (data.meta?.components ?? []).map((c: any) => ({
    key: c.key,
    name: c.name,
    normalizedName: normalizeName(c.name),
  }));
}

async function loadCache(cachePath: string, fileKey: string | undefined, token: string | undefined, refresh: boolean): Promise<CacheEntry[]> {
  if (!refresh && fs.existsSync(cachePath)) {
    const raw = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    console.log(`  Используем кеш: ${cachePath} (${raw.components.length} компонентов)`);
    return raw.components;
  }
  if (!fileKey || !token) {
    console.warn(`  Кеш отсутствует и FIGMA_ACCESS_TOKEN / ключ библиотеки не настроены — fuzzy-поиск недоступен`);
    return [];
  }
  console.log(`  Запрашиваем компоненты из Figma API...`);
  try {
    const components = await fetchFigmaComponents(fileKey, token);
    fs.writeFileSync(cachePath, JSON.stringify({ updatedAt: new Date().toISOString(), components }, null, 2));
    console.log(`  Кеш обновлён: ${components.length} компонентов`);
    return components;
  } catch (e) {
    if (fs.existsSync(cachePath)) {
      console.warn(`  Ошибка обновления кеша (${e}), используем старый кеш`);
      return JSON.parse(fs.readFileSync(cachePath, "utf-8")).components;
    }
    console.warn(`  Ошибка загрузки и кеш не найден (${e}), fuzzy-поиск недоступен`);
    return [];
  }
}

// ─── propDefs кеш ────────────────────────────────────────────────────────────

interface PropDefsEntry {
  textPropKey?: string;
  instanceSwapProps?: Record<string, string>;
  boolProps?: Record<string, string>;
}

interface PropDefsCache {
  updatedAt: string;
  defs: Record<string, PropDefsEntry>;
}

/** Использует GET /v1/components/{key} для нахождения file_key+node_id каждого компонента,
 *  затем батч-запрос /nodes для получения componentPropertyDefinitions. */
async function fetchPropDefsForComponents(token: string): Promise<PropDefsCache> {
  const defs: Record<string, PropDefsEntry> = {};

  // Шаг 1: по каждому componentKey узнаём file_key + node_id через /v1/components/{key}
  const fileGroups = new Map<string, Array<{ name: string; nodeId: string }>>();

  await Promise.all(
    Object.entries(COMPONENT_MAP).map(async ([compName, mapping]) => {
      // Пробуем /component_sets/{key} (т.к. COMPONENT_MAP хранит SET ключи)
      // затем fallback на /components/{key}
      for (const endpoint of ["component_sets", "components"]) {
        const url = `https://api.figma.com/v1/${endpoint}/${mapping.componentKey}`;
        try {
          const res = await fetch(url, { headers: { "X-Figma-Token": token } });
          if (!res.ok) continue;
          const data = await res.json() as any;
          const meta = data.meta?.component_set ?? data.meta?.component;
          if (!meta?.file_key || !meta?.node_id) continue;
          if (!fileGroups.has(meta.file_key)) fileGroups.set(meta.file_key, []);
          fileGroups.get(meta.file_key)!.push({ name: compName, nodeId: meta.node_id });
          return; // нашли — выходим
        } catch { /* продолжаем с другим endpoint */ }
      }
      console.warn(`  propDefs: компонент "${compName}" не найден ни через component_sets ни через components`);
    })
  );

  if (fileGroups.size === 0) {
    console.warn("  propDefs: ни один компонент не найден через /v1/components/{key}");
    return { updatedAt: new Date().toISOString(), defs };
  }

  // Шаг 2: батч-запрос /nodes по каждому файлу
  for (const [fileKey, components] of fileGroups) {
    const ids = components.map(c => encodeURIComponent(c.nodeId)).join(",");
    const url = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${ids}`;
    try {
      const res = await fetch(url, { headers: { "X-Figma-Token": token } });
      if (!res.ok) {
        console.warn(`  propDefs: ошибка /nodes для файла ${fileKey}: ${res.status}`);
        continue;
      }
      const data = await res.json() as any;

      for (const { name: compName, nodeId } of components) {
        const propDefs = data.nodes?.[nodeId]?.document?.componentPropertyDefinitions ?? {};
        const entry: PropDefsEntry = {};
        const instanceSwapProps: Record<string, string> = {};

        for (const [propKey, propDef] of Object.entries(propDefs)) {
          const def = propDef as any;
          const baseName = propKey.replace(/#[^#]*$/, ""); // убираем #nodeId суффикс
          if (def.type === "TEXT" && !entry.textPropKey) entry.textPropKey = propKey;
          if (def.type === "INSTANCE_SWAP") instanceSwapProps[baseName] = propKey;
        }

        if (Object.keys(instanceSwapProps).length > 0) entry.instanceSwapProps = instanceSwapProps;
        defs[compName] = entry;
        console.log(`  propDefs[${compName}]: text="${entry.textPropKey ?? "-"}", swaps=[${Object.keys(instanceSwapProps).join(", ")}]`);
      }
    } catch (e) {
      console.warn(`  propDefs: ошибка обработки файла ${fileKey}: ${e}`);
    }
  }

  return { updatedAt: new Date().toISOString(), defs };
}

async function loadPropDefsCache(cachePath: string, token: string | undefined, refresh: boolean): Promise<PropDefsCache> {
  const empty: PropDefsCache = { updatedAt: new Date().toISOString(), defs: {} };

  if (!refresh && fs.existsSync(cachePath)) {
    const raw = JSON.parse(fs.readFileSync(cachePath, "utf-8")) as PropDefsCache;
    console.log(`  Используем кеш propDefs: ${Object.keys(raw.defs).length} компонентов`);
    return raw;
  }
  if (!token) {
    console.warn("  propDefs: FIGMA_ACCESS_TOKEN не настроен — propDefHints недоступны");
    return empty;
  }
  console.log("  Запрашиваем propDefs из Figma API...");
  try {
    const cache = await fetchPropDefsForComponents(token);
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
    console.log(`  Кеш propDefs сохранён: ${Object.keys(cache.defs).length} компонентов`);
    return cache;
  } catch (e) {
    if (fs.existsSync(cachePath)) {
      console.warn(`  Ошибка обновления propDefs кеша (${e}), используем старый`);
      return JSON.parse(fs.readFileSync(cachePath, "utf-8")) as PropDefsCache;
    }
    console.warn(`  Ошибка загрузки propDefs (${e}) — propDefHints недоступны`);
    return empty;
  }
}

// ─── Icon component sets кеш ─────────────────────────────────────────────────

interface IconSetsCache {
  updatedAt: string;
  sets: Record<string, string>; // "Colorless/Actions / Create" → figma component SET key
}

async function fetchIconComponentSets(fileKey: string, token: string): Promise<IconSetsCache> {
  const url = `https://api.figma.com/v1/files/${fileKey}/component_sets`;
  const res = await fetch(url, { headers: { "X-Figma-Token": token } });
  if (!res.ok) throw new Error(`Figma API /component_sets error: ${res.status} ${res.statusText}`);
  const data = await res.json() as any;

  const sets: Record<string, string> = {};
  for (const cs of (data.meta?.component_sets ?? [])) {
    const iconName: string = cs.name;
    const category: string = cs.containing_frame?.name ?? "";
    const mapKey = category ? `${category}/${iconName}` : iconName;
    sets[mapKey] = cs.key;
  }

  return { updatedAt: new Date().toISOString(), sets };
}

async function loadIconSetsCache(cachePath: string, fileKey: string | undefined, token: string | undefined, refresh: boolean): Promise<IconSetsCache> {
  const empty: IconSetsCache = { updatedAt: new Date().toISOString(), sets: {} };

  if (!refresh && fs.existsSync(cachePath)) {
    const raw = JSON.parse(fs.readFileSync(cachePath, "utf-8")) as IconSetsCache;
    console.log(`  Используем кеш icon sets: ${Object.keys(raw.sets).length} иконок`);
    return raw;
  }
  if (!fileKey || !token) {
    console.warn("  icon sets: FIGMA_ICONS_LIBRARY_KEY/TOKEN не настроены — иконки не будут резолвиться");
    return empty;
  }
  console.log("  Запрашиваем icon component_sets из Figma API...");
  try {
    const cache = await fetchIconComponentSets(fileKey, token);
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
    console.log(`  Кеш icon sets обновлён: ${Object.keys(cache.sets).length} иконок`);
    return cache;
  } catch (e) {
    if (fs.existsSync(cachePath)) {
      console.warn(`  Ошибка обновления icon sets кеша (${e}), используем старый`);
      return JSON.parse(fs.readFileSync(cachePath, "utf-8")) as IconSetsCache;
    }
    console.warn(`  Ошибка загрузки icon sets (${e}) — иконки не будут резолвиться`);
    return empty;
  }
}

/** Строит нормализованный lookup для иконок:
 *  "Colorless/Actions / Create" → { "actions/create": setKey }
 *  Разбирает формат "{prefix}/{category} / {iconName}" или "{prefix}/{iconName}" */
function buildIconLookup(iconSets: Record<string, string>): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const [mapKey, setKey] of Object.entries(iconSets)) {
    // Сначала пробуем разделить по " / " (space-slash-space)
    const spaceSlashIdx = mapKey.indexOf(" / ");
    let iconName: string;
    let prefix: string;
    if (spaceSlashIdx !== -1) {
      iconName = mapKey.slice(spaceSlashIdx + 3).trim();
      prefix = mapKey.slice(0, spaceSlashIdx);
    } else {
      const parts = mapKey.split("/");
      iconName = parts[parts.length - 1];
      prefix = parts.slice(0, -1).join("/");
    }
    // Берём последний сегмент prefix как category
    const prefixParts = prefix.split("/");
    const category = prefixParts[prefixParts.length - 1].trim();
    const normalizedKey = `${category.toLowerCase()}/${iconName.toLowerCase()}`;
    // Предпочитаем "Colorless" перед "Color" (точнее по умолчанию)
    if (!lookup.has(normalizedKey)) {
      lookup.set(normalizedKey, setKey);
    }
  }
  return lookup;
}

// ─── Пост-обработка дескриптора ──────────────────────────────────────────────

function injectIntoNodes(nodes: DescriptorNode[], fn: (node: ComponentNode) => void): void {
  for (const node of nodes) {
    if (node.type === "component") {
      fn(node);
      if (node.contentComponent) fn(node.contentComponent);
      if (node.slotChildren) {
        for (const slotArr of Object.values(node.slotChildren)) {
          injectIntoNodes(slotArr, fn);
        }
      }
    }
    if (node.type === "row" || node.type === "section" || (node as any).type === "island") {
      injectIntoNodes((node as any).children, fn);
    }
  }
}

function injectPropDefHints(descriptor: PageDescriptor, propDefsCache: PropDefsCache): void {
  const allNodes = descriptor.variants?.flatMap(v => v.children) ?? descriptor.children ?? [];
  injectIntoNodes(allNodes, (node) => {
    const hints = propDefsCache.defs[node.component];
    if (hints && (hints.textPropKey || hints.instanceSwapProps || hints.boolProps)) {
      node.propDefHints = hints;
    }
  });
}

function resolveIconRef(
  iconRef: { category: string; iconName: string },
  iconLookup: Map<string, string>,
  label: string
): string | undefined {
  const normalizedKey = `${iconRef.category.toLowerCase()}/${iconRef.iconName.toLowerCase()}`;
  const setKey = iconLookup.get(normalizedKey);
  if (setKey) return setKey;
  // Fuzzy: только по имени иконки без категории
  const iconNameLower = iconRef.iconName.toLowerCase();
  for (const [k, v] of iconLookup) {
    if (k.endsWith(`/${iconNameLower}`)) {
      console.warn(`  ⚠ Иконка ${label} "${iconRef.category}/${iconRef.iconName}" найдена по fuzzy (без категории)`);
      return v;
    }
  }
  console.warn(`  ⚠ Иконка ${label} "${iconRef.category}/${iconRef.iconName}" не найдена в icon sets кеше`);
  return undefined;
}

function injectResolvedIcons(descriptor: PageDescriptor, iconSets: Record<string, string>): void {
  const iconLookup = buildIconLookup(iconSets);
  const allNodes = descriptor.variants?.flatMap(v => v.children) ?? descriptor.children ?? [];
  injectIntoNodes(allNodes, (node) => {
    const resolvedIcons: { iconLeft?: string; iconRight?: string; icon?: string } = {};
    for (const side of ["iconLeft", "iconRight"] as const) {
      const iconRef = node[side];
      if (!iconRef) continue;
      const resolved = resolveIconRef(iconRef, iconLookup, side);
      if (resolved) resolvedIcons[side] = resolved;
    }
    if (node.icon) {
      const resolved = resolveIconRef(node.icon, iconLookup, "icon");
      if (resolved) resolvedIcons.icon = resolved;
    }
    if (resolvedIcons.iconLeft || resolvedIcons.iconRight || resolvedIcons.icon) {
      node.resolvedIcons = resolvedIcons;
    }
  });
}

// ─── Главная функция ─────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const filePath = args.find(a => !a.startsWith("--"));
  const refresh = args.includes("--refresh");

  if (!filePath) {
    console.error("Использование: npm run generate:figma -- src/MyPage.tsx [--refresh]");
    process.exit(1);
  }

  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`Файл не найден: ${absPath}`);
    process.exit(1);
  }

  const token = process.env.FIGMA_ACCESS_TOKEN;
  const libKey = process.env.FIGMA_LIBRARY_KEY;
  const iconsKey = process.env.FIGMA_ICONS_LIBRARY_KEY;

  console.log(`\nПарсим: ${absPath}`);

  // Загружаем все кеши параллельно
  const [, , propDefsCache, iconSetsCache] = await Promise.all([
    loadCache(COMPONENTS_CACHE_PATH, libKey, token, refresh),
    loadCache(ICONS_CACHE_PATH, iconsKey, token, refresh),
    loadPropDefsCache(PROPDEF_CACHE_PATH, token, refresh),
    loadIconSetsCache(ICON_SETS_CACHE_PATH, iconsKey, token, refresh),
  ]);

  // Парсим TSX
  let source: string;
  try {
    source = fs.readFileSync(absPath, "utf-8");
  } catch (e) {
    console.error(`Ошибка чтения файла: ${e}`);
    process.exit(1);
  }

  // Определяем конфиг страницы
  const baseName = path.basename(absPath, ".tsx");
  const pageConfig = PAGE_CONFIGS[baseName] ?? {
    name: baseName,
    page: { width: 1440, height: 900, background: "#f0f2f5" },
    card: { width: 702, paddingVertical: 28, paddingHorizontal: 36, gap: 16, background: "#ffffff", borderRadius: 14 },
  };

  const parseResult = parsePage(source, { htmlElementMap: pageConfig.htmlElementMap });

  if (parseResult.sharedBefore.length === 0 && parseResult.sharedAfter.length === 0 && Object.keys(parseResult.variants).length === 0) {
    console.warn("⚠ Не найдено ни одного компонента из @direct-frontend/components");
  }

  // Собираем дескриптор
  const descriptor = buildDescriptor(parseResult, pageConfig);

  // Пост-обработка: вставляем propDefHints и resolvedIcons
  injectPropDefHints(descriptor, propDefsCache);
  injectResolvedIcons(descriptor, iconSetsCache.sets);

  // Сохраняем
  const outputDir = path.resolve(__dirname, "../figma-plugin/src/pages");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${baseName.toLowerCase()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(descriptor, null, 2));

  console.log(`\n✓ Дескриптор сохранён: ${outputPath}`);
  if (descriptor.variants) {
    console.log(`  Варианты: ${descriptor.variants.map(v => v.name).join(", ")}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
