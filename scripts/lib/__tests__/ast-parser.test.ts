import { parsePage } from "../ast-parser";
import type { DescriptorNode } from "../types";

/** Плоский список всех ComponentNode из sharedBefore (включая вложенные в RowNode) */
function flattenComponents(nodes: DescriptorNode[]): DescriptorNode[] {
  const result: DescriptorNode[] = [];
  for (const n of nodes) {
    if (n.type === "component") result.push(n);
    else if (n.type === "row") result.push(...flattenComponents(n.children));
  }
  return result;
}

const SIMPLE_TSX = `
import { Button, MultiButton } from '@direct-frontend/components';
import React from 'react';

export const Page: React.FC = () => (
  <div>
    <MultiButton color="gray" size="m" width="max" />
    <Button color="accent" size="m">Акцент</Button>
    <Button color="normal" size="m" />
  </div>
);
`;

describe("ast-parser — простые компоненты", () => {
  it("находит компоненты из @direct-frontend/components", () => {
    const result = parsePage(SIMPLE_TSX);
    // Все 3 компонента помещаются в один RowNode (2+ прямых @direct-frontend детей в div)
    expect(flattenComponents(result.sharedBefore)).toHaveLength(3);
    expect(result.sharedAfter).toHaveLength(0);
  });

  it("извлекает строковые пропы", () => {
    const result = parsePage(SIMPLE_TSX);
    const btn = flattenComponents(result.sharedBefore).find(n => n.type === "component" && n.component === "Button" && (n as any).props?.color === "accent");
    expect(btn).toBeDefined();
  });

  it("извлекает text children", () => {
    const result = parsePage(SIMPLE_TSX);
    const btn = flattenComponents(result.sharedBefore).find(n => n.type === "component" && n.component === "Button" && (n as any).text === "Акцент");
    expect(btn).toBeDefined();
  });

  it("игнорирует HTML-теги (div)", () => {
    const result = parsePage(SIMPLE_TSX);
    const hasDiv = flattenComponents(result.sharedBefore).some(n => n.type === "component" && (n as any).component === "div");
    expect(hasDiv).toBe(false);
  });
});

const RENDER_PROP_TSX = `
import { FormField, Select, TextInput } from '@direct-frontend/components';
import React from 'react';

export const Page = () => (
  <div>
    <FormField label="Название">
      {({ id }) => <Select color="contour" size="m" />}
    </FormField>
    <FormField label="Название 2">
      {({ id }) => <TextInput size="m" />}
    </FormField>
  </div>
);
`;

describe("ast-parser — render-prop", () => {
  it("парсит FormField с contentComponent", () => {
    const result = parsePage(RENDER_PROP_TSX);
    const ff = flattenComponents(result.sharedBefore).find(n => n.type === "component" && (n as any).component === "FormField") as any;
    expect(ff).toBeDefined();
    expect(ff.props?.label).toBe("Название");
    expect(ff.contentComponent?.component).toBe("Select");
    expect(ff.contentComponent?.props?.color).toBe("contour");
  });

  it("находит два FormField", () => {
    const result = parsePage(RENDER_PROP_TSX);
    const fields = flattenComponents(result.sharedBefore).filter(n => n.type === "component" && (n as any).component === "FormField");
    expect(fields).toHaveLength(2);
  });
});

const TERNARY_TSX = `
import { Button, MultiButton, Radiobox, Select, FormField } from '@direct-frontend/components';
import React, { useState } from 'react';

export const Page = () => {
  const [tab, setTab] = useState('raz');
  return (
    <div>
      <MultiButton color="gray" size="m" width="max" />
      {tab === 'dva'
        ? null
        : (
          <>
            <FormField label="Название">
              {({ id }) => <Select color="contour" size="m" />}
            </FormField>
            <Radiobox size="m" />
          </>
        )
      }
    </div>
  );
};
`;

describe("ast-parser — тернарный оператор", () => {
  it("sharedNodes содержит компоненты вне тернара", () => {
    const result = parsePage(TERNARY_TSX);
    const names = flattenComponents(result.sharedBefore).map((n: any) => n.component);
    expect(names).toContain("MultiButton");
  });

  it("defaultVariant берётся из useState", () => {
    const result = parsePage(TERNARY_TSX);
    expect(result.defaultVariant).toBe("raz");
  });

  it("variant 'dva' создаётся из true-ветки тернара", () => {
    const result = parsePage(TERNARY_TSX);
    expect(result.variants).toHaveProperty("dva");
  });

  it("variant defaultVariant содержит компоненты из false-ветки", () => {
    const result = parsePage(TERNARY_TSX);
    const razVariant = result.variants[result.defaultVariant];
    expect(razVariant).toBeDefined();
    const names = razVariant.map((n: any) => n.component);
    expect(names).toContain("Radiobox");
    expect(names).toContain("FormField");
  });
});

const TAB_OPTIONS_TSX = `
import { MultiButton, Button } from '@direct-frontend/components';
import React, { useState } from 'react';

const OPTS = [
  { value: 'raz', content: 'раз' },
  { value: 'dva', content: 'два' },
  { value: 'tri', content: 'три' },
];

export const Page = () => {
  const [tab, setTab] = useState('raz');
  return (
    <div>
      <MultiButton options={OPTS} value={tab} color="gray" size="m" />
      {tab === 'dva' ? null : <Button color="accent">Акцент</Button>}
    </div>
  );
};
`;

describe("ast-parser — tabOptions", () => {
  it("разворачивает tabOptions из статического массива options={IDENT}", () => {
    const result = parsePage(TAB_OPTIONS_TSX);
    const mb = result.sharedBefore.find(
      n => n.type === "component" && (n as any).component === "MultiButton"
    ) as any;
    expect(mb).toBeDefined();
    expect(mb.tabOptions).toEqual([
      { value: "raz", label: "раз" },
      { value: "dva", label: "два" },
      { value: "tri", label: "три" },
    ]);
  });

  it("помечает MultiButton как isTabValueLinked когда value={tab}", () => {
    const result = parsePage(TAB_OPTIONS_TSX);
    const mb = result.sharedBefore.find(
      n => n.type === "component" && (n as any).component === "MultiButton"
    ) as any;
    expect(mb.isTabValueLinked).toBe(true);
  });

  it("не добавляет value={tab} в props (это state переменная)", () => {
    const result = parsePage(TAB_OPTIONS_TSX);
    const mb = result.sharedBefore.find(
      n => n.type === "component" && (n as any).component === "MultiButton"
    ) as any;
    expect(mb.props?.value).toBeUndefined();
  });
});
