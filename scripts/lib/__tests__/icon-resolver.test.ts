import { resolveIconKey } from "../icon-resolver";
import type { IconRef } from "../types";

describe("resolveIconKey", () => {
  const cache = [
    { key: "icon-key-create", name: "Create", normalizedName: "create" },
    { key: "icon-key-close", name: "Close", normalizedName: "close" },
  ];
  const iconMap = {
    "Actions/Create": "hardcoded-create-key",
  };

  it("возвращает ключ из ICON_MAP напрямую", () => {
    const icon: IconRef = { iconName: "Create", category: "Actions" };
    const result = resolveIconKey(icon, cache, iconMap);
    expect(result.key).toBe("hardcoded-create-key");
    expect(result.source).toBe("map");
  });

  it("находит иконку через fuzzy-поиск в кеше", () => {
    const icon: IconRef = { iconName: "Close", category: "Actions" };
    const result = resolveIconKey(icon, cache, iconMap);
    expect(result.key).toBe("icon-key-close");
    expect(result.source).toBe("cache");
  });

  it("возвращает null для неизвестной иконки", () => {
    const icon: IconRef = { iconName: "Unknown", category: "Actions" };
    const result = resolveIconKey(icon, cache, iconMap);
    expect(result.key).toBeNull();
    expect(result.warning).toContain("Actions/Unknown");
  });
});
