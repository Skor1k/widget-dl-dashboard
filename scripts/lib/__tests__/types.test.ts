import type { IconRef, ComponentNode, PageDescriptor } from "../types";

describe("types", () => {
  it("ComponentNode с iconLeft компилируется корректно", () => {
    const node: ComponentNode = {
      type: "component",
      component: "Button",
      props: { color: "accent" },
      iconLeft: { iconName: "Create", category: "Actions" },
    };
    expect(node.iconLeft?.iconName).toBe("Create");
    expect(node.iconLeft?.category).toBe("Actions");
  });

  it("PageDescriptor с variants компилируется корректно", () => {
    const desc: PageDescriptor = {
      name: "Test",
      page: { width: 1440, height: 900, background: "#fff" },
      card: { width: 702, paddingVertical: 28, paddingHorizontal: 36, gap: 16, background: "#fff", borderRadius: 14 },
      variants: [{ name: "raz", children: [] }],
    };
    expect(desc.variants?.[0].name).toBe("raz");
  });
});
