---
name: sync-figma-icons
description: Use when icons are missing from ICON_MAP in component-map.ts, when new icons appear in the Figma Icons library, or when the plugin fails to substitute icons during Figma generation.
---

# Sync Figma Icons to ICON_MAP

## Overview

Extracts ALL component set keys from the "!💎 Icons" Figma library and adds them to `figma-plugin/src/component-map.ts`. The correct tool is the Figma Plugin API via MCP — not `search_design_system` (wrong library, 20-result limit).

## Project Constants

| What | Value |
|------|-------|
| Icons library file key | `KOThKixaFgqnGnq05uCPwe` |
| Target file | `figma-plugin/src/component-map.ts` → `ICON_MAP` |
| Build command | `npm run build:plugin` |

## Step-by-Step

### 1. Get all icon keys via Figma Plugin API

Use the MCP `use_figma` tool on file `KOThKixaFgqnGnq05uCPwe`:

```javascript
const results = [];
for (const page of figma.root.children) {
  await figma.setCurrentPageAsync(page);
  const sets = page.findAll(n => n.type === 'COMPONENT_SET');
  for (const s of sets) {
    if (s.name.includes(' / ')) {
      // "Category / Name" → "Category/Name:key"
      results.push(s.name.replace(' / ', '/') + ':' + s.key);
    }
  }
}
return results.join('\n');
```

**If MCP `use_figma` is not available** — use the Figma REST API:
```
GET https://api.figma.com/v1/files/{KOThKixaFgqnGnq05uCPwe}/components
Authorization: Bearer {FIGMA_ACCESS_TOKEN}
```
Parse `meta.components[].node_id` and `meta.components[].key`.

### 2. Parse the output

Each output line is `"Category/IconName:40-char-key"`.
Split on `:` — left part = ICON_MAP key, right part = componentSetKey.

```
Actions/ArrowDown:1c2a84bdd1ac3f6a9e56cb1e23b6d9b843bc418e
Media Controls/Play:cb8b817a5c700184544104369c04057ab89b6da4
```

### 3. Diff against existing ICON_MAP

Read `figma-plugin/src/component-map.ts` and find lines **not already present**.

### 4. Add missing entries

Insert into the correct category block, sorted alphabetically:

```typescript
// In ICON_MAP: Record<string, string>
"Actions/NewIcon":          "abc123...",
"Media Controls/NewIcon":   "def456...",
```

**Group icons by category.** Keep existing entries unchanged.

### 5. Rebuild

```bash
npm run build:plugin
```

Must exit with code 0 and no TypeScript errors.

---

## Critical Rules

| Rule | Why |
|------|-----|
| **Never use `search_design_system`** | Returns ≤20 results, often from unrelated libraries |
| **"Media Controls" keeps its space** | Real category name is `"Media Controls / Play"` → becomes `"Media Controls/Play"` |
| **Trailing spaces in names** | Some Figma names have trailing spaces (`"StationConnected "`). Trim before adding. |
| **Keep legacy `"MediaControls/..."` aliases** | Old JSON descriptors may reference the spaceless variant |
| **Don't change existing keys** | Only ADD new entries, never modify existing ones |

## Output Truncated?

If the `use_figma` result ends with `// truncated to 20kb` — you still received 200-250 icons. Process what you have. The truncated tail is usually later CampaignType entries that are already in the map.
Run a second call if needed: filter out categories already fully indexed.

## Why NOT `search_design_system`

Lessons from a real attempt that wasted many API calls:
- Query `"Actions Lock Hide Show"` returned results from *other companies' Figma accounts*, not the project library
- Even targeted queries like `"Lock"` returned 2 results total, neither from the Icons library
- The tool has no way to filter by file key — it searches all connected libraries globally

**The Figma Plugin API traversal is the only reliable method.**
