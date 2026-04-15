import { normalizeName, resolveComponentKey } from "../component-resolver";

describe("normalizeName", () => {
  it("удаляет эмодзи и версию", () => {
    expect(normalizeName("✅🟠 FormField_V6")).toBe("formfield");
    expect(normalizeName("✅ Button_V5")).toBe("button");
    expect(normalizeName("✅ Header_V4")).toBe("header");
  });

  it("обрабатывает variation selector в ⚠️", () => {
    expect(normalizeName("⚠️ Alert_V2")).toBe("alert");
  });

  it("убирает суффиксы после версии", () => {
    expect(normalizeName("Component_V6_Compact")).toBe("component");
  });
});

describe("resolveComponentKey", () => {
  const cache = [
    { key: "key-button", name: "✅ Button_V5", normalizedName: "button" },
    { key: "key-formfield", name: "✅🟠 FormField_V6", normalizedName: "formfield" },
  ];

  it("возвращает ключ из COMPONENT_MAP напрямую", () => {
    const result = resolveComponentKey("Button", cache);
    expect(result.key).toBe("a765d5679f10f13e5e369e4df617396acca6d397"); // из COMPONENT_MAP
    expect(result.source).toBe("map");
  });

  it("находит компонент через fuzzy-поиск в кеше", () => {
    const result = resolveComponentKey("FormField", cache);
    expect(result.source).toBe("map"); // FormField есть в COMPONENT_MAP
  });

  it("использует кеш для компонента не в COMPONENT_MAP", () => {
    const cacheWithUnknown = [
      ...cache,
      { key: "key-newcomp", name: "✅ NewComponent_V1", normalizedName: "newcomponent" },
    ];
    const result = resolveComponentKey("NewComponent", cacheWithUnknown);
    expect(result.key).toBe("key-newcomp");
    expect(result.source).toBe("cache");
  });

  it("возвращает null для неизвестного компонента", () => {
    const result = resolveComponentKey("UnknownWidget", cache);
    expect(result.key).toBeNull();
  });
});
