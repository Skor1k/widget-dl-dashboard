import { buildDescriptor } from "../descriptor-builder";
import type { ParseResult } from "../ast-parser";
import type { PageDescriptor } from "../types";

const MOCK_PARSE_RESULT: ParseResult = {
  sharedBefore: [
    { type: "component", component: "MultiButton", props: { color: "gray", size: "m", width: "max" } },
    { type: "row", gap: 16, children: [
      { type: "component", component: "Button", props: { color: "accent", size: "m" }, text: "Акцент" },
    ]},
  ],
  sharedAfter: [],
  variants: {
    raz: [
      { type: "component", component: "FormField", props: { label: "Название" } },
    ],
    dva: [],
  },
  defaultVariant: "raz",
};

const PAGE_CONFIG = {
  name: "TestPage",
  page: { width: 1440, height: 900, background: "#f0f2f5" },
  card: { width: 702, paddingVertical: 28, paddingHorizontal: 36, gap: 16, background: "#ffffff", borderRadius: 14 },
};

describe("buildDescriptor", () => {
  let result: PageDescriptor;
  beforeEach(() => { result = buildDescriptor(MOCK_PARSE_RESULT, PAGE_CONFIG); });

  it("создаёт variants из sharedNodes + variant-specific nodes", () => {
    expect(result.variants).toHaveLength(2);
  });

  it("каждый вариант содержит sharedNodes + свои узлы", () => {
    const raz = result.variants!.find(v => v.name === "raz");
    expect(raz).toBeDefined();
    // sharedNodes: MultiButton + Row = 2, variant-specific: FormField = 1 → итого 3
    expect(raz!.children).toHaveLength(3);
  });

  it("вариант dva содержит только sharedNodes (2 узла)", () => {
    const dva = result.variants!.find(v => v.name === "dva");
    expect(dva!.children).toHaveLength(2);
  });

  it("сохраняет page и card конфиг", () => {
    expect(result.page.width).toBe(1440);
    expect(result.card.borderRadius).toBe(14);
  });
});

const MOCK_WITH_TABS: ParseResult = {
  sharedBefore: [
    {
      type: "component",
      component: "MultiButton",
      props: { color: "gray", size: "m" },
      tabOptions: [
        { value: "raz", label: "раз" },
        { value: "dva", label: "два" },
        { value: "tri", label: "три" },
      ],
      isTabValueLinked: true,
    },
  ],
  sharedAfter: [],
  variants: {
    dva: [],
    raz: [{ type: "component", component: "FormField", props: { label: "Название" } }],
  },
  defaultVariant: "raz",
};

describe("buildDescriptor — tab variants", () => {
  let result: PageDescriptor;
  beforeEach(() => { result = buildDescriptor(MOCK_WITH_TABS, PAGE_CONFIG); });

  it("создаёт 3 варианта (raz, dva, tri)", () => {
    const names = result.variants!.map(v => v.name);
    expect(names).toContain("raz");
    expect(names).toContain("dva");
    expect(names).toContain("tri");
    expect(result.variants).toHaveLength(3);
  });

  it("порядок вариантов соответствует tabOptions", () => {
    const names = result.variants!.map(v => v.name);
    expect(names).toEqual(["raz", "dva", "tri"]);
  });

  it("MultiButton в варианте 'raz' имеет activeTabValue='raz'", () => {
    const raz = result.variants!.find(v => v.name === "raz")!;
    const mb = raz.children.find(n => n.type === "component" && (n as any).component === "MultiButton") as any;
    expect(mb.activeTabValue).toBe("raz");
  });

  it("MultiButton в варианте 'dva' имеет activeTabValue='dva'", () => {
    const dva = result.variants!.find(v => v.name === "dva")!;
    const mb = dva.children.find(n => n.type === "component" && (n as any).component === "MultiButton") as any;
    expect(mb.activeTabValue).toBe("dva");
  });

  it("вариант 'tri' содержит контент из defaultVariant (raz)", () => {
    const tri = result.variants!.find(v => v.name === "tri")!;
    const hasFormField = tri.children.some(n => n.type === "component" && (n as any).component === "FormField");
    expect(hasFormField).toBe(true);
  });

  it("isTabValueLinked НЕ попадает в дочерние ноды (убирается при инъекции)", () => {
    for (const variant of result.variants!) {
      for (const child of variant.children) {
        expect((child as any).isTabValueLinked).toBeUndefined();
      }
    }
  });
});
