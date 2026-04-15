/// <reference types="@figma/plugin-typings" />

import { COMPONENT_MAP, ICON_MAP, mapPropsToFigma } from "./component-map";

interface IconRef { iconName: string; category: string; }

interface PropDefHints {
  textPropKey?: string;
  instanceSwapProps?: Record<string, string>;
  boolProps?: Record<string, string>;
}

interface ComponentDescriptor {
  type: "component";
  component: string;
  props?: Record<string, string | boolean | number>;
  text?: string;
  iconLeft?: IconRef;
  iconRight?: IconRef;
  icon?: IconRef;
  contentComponent?: ComponentDescriptor;
  width?: "fill" | number;
  propDefHints?: PropDefHints;
  resolvedIcons?: { iconLeft?: string; iconRight?: string; icon?: string };
  tabOptions?: Array<{ value: string; label: string }>;
  activeTabValue?: string;
}

interface TextDescriptor {
  type: "text";
  text: string;
  style?: { fontFamily?: string; fontSize?: number; fontWeight?: number; color?: string; };
  width?: "fill" | number;
}

interface RowDescriptor {
  type: "row";
  gap?: number;
  children: NodeDescriptor[];
  width?: "fill" | number;
}

interface SectionDescriptor {
  type: "section";
  gap?: number;
  children: NodeDescriptor[];
}

type NodeDescriptor = TextDescriptor | ComponentDescriptor | RowDescriptor | SectionDescriptor;

interface PageVariant { name: string; children: NodeDescriptor[]; }

interface CardConfig {
  width: number; paddingVertical: number; paddingHorizontal: number;
  gap: number; background: string; borderRadius: number;
}

interface PageConfig { width: number; height: number; background: string; }

interface PageDescriptor {
  name: string;
  page: PageConfig;
  card: CardConfig;
  children?: NodeDescriptor[];
  variants?: PageVariant[];
}

function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16) / 255,
    g: parseInt(clean.substring(2, 4), 16) / 255,
    b: parseInt(clean.substring(4, 6), 16) / 255,
  };
}

function applyFill(node: MinimalFillsMixin, hex: string): void {
  const existing = (node.fills as Paint[]).filter(f => f.type !== "SOLID");
  const solid: SolidPaint = { type: "SOLID", color: hexToRgb(hex) };
  node.fills = [...existing, solid];
}

function findFreeX(): number {
  const nodes = figma.currentPage.children;
  if (nodes.length === 0) return 100;
  return Math.max(...nodes.map(n => n.x + n.width)) + 100;
}

async function createComponentInstance(descriptor: ComponentDescriptor): Promise<InstanceNode | null> {
  const mapping = COMPONENT_MAP[descriptor.component];
  if (!mapping) {
    figma.ui.postMessage({ type: "warning", text: `"${descriptor.component}" не найден в COMPONENT_MAP — пропущен` });
    return null;
  }
  if (!mapping.componentKey) {
    return null;
  }
  let component: ComponentNode;
  let compSet: ComponentSetNode | null = null;
  try {
    const set = await figma.importComponentSetByKeyAsync(mapping.componentKey);
    component = set.defaultVariant;
    compSet = set;
  } catch {
    try {
      component = await figma.importComponentByKeyAsync(mapping.componentKey);
      compSet = component.parent?.type === "COMPONENT_SET" ? component.parent as ComponentSetNode : null;
    } catch (e) {
      figma.ui.postMessage({ type: "error", text: `Не удалось импортировать "${descriptor.component}": ${e}` });
      return null;
    }
  }

  const instance = component.createInstance();

  const propDefs = compSet?.componentPropertyDefinitions ?? {};


  if (descriptor.props && Object.keys(descriptor.props).length > 0) {
    const { figmaProps, warnings } = mapPropsToFigma(
      descriptor.component,
      descriptor.props,
      propDefs as Record<string, { type: string; variantOptions?: string[] }>
    );
    for (const w of warnings) figma.ui.postMessage({ type: "warning", text: w });

    // implicitBooleans: если определённые code-пропы truthy → включить parent BOOLEAN слоты
    if (mapping.implicitBooleans && descriptor.props) {
      for (const [figmaBool, triggers] of Object.entries(mapping.implicitBooleans)) {
        const shouldEnable = triggers.some(t => !!descriptor.props![t]);
        if (shouldEnable) {
          // Ищем полный ключ Figma BOOLEAN пропа (с #id суффиксом)
          const fullKey = Object.keys(propDefs).find(k => {
            const base = k.replace(/#[^#]*$/, "").replace(/[^\x00-\x7F]/g, "").trim();
            return base.toLowerCase() === figmaBool.toLowerCase() && (propDefs as any)[k]?.type === "BOOLEAN";
          });
          if (fullKey) {
            figmaProps[fullKey] = true;
          }
        }
      }
    }

    // defaultFalse: выключить BOOLEAN-пропы по умолчанию, если не включены явно
    if (mapping.defaultFalse) {
      for (const boolName of mapping.defaultFalse) {
        const fullKey = Object.keys(propDefs).find(k => {
          const base = k.replace(/#[^#]*$/, "").replace(/[^\x00-\x7F]/g, "").trim();
          return base.toLowerCase() === boolName.toLowerCase() && (propDefs as any)[k]?.type === "BOOLEAN";
        });
        if (fullKey && !(fullKey in figmaProps)) {
          figmaProps[fullKey] = false;
        }
      }
    }

    // autoDisableUnsetBooleans: выключить ВСЕ BOOLEAN пропы не заданные явно
    if (mapping.autoDisableUnsetBooleans) {
      for (const propKey of Object.keys(propDefs)) {
        if ((propDefs as any)[propKey]?.type !== "BOOLEAN") continue;
        if (!(propKey in figmaProps)) {
          figmaProps[propKey] = false;
        }
      }
    }

    if (Object.keys(figmaProps).length > 0) {
      try { instance.setProperties(figmaProps as Record<string, string | boolean>); } catch (e) {
        figma.ui.postMessage({ type: "warning", text: `${descriptor.component}: setProperties batch failed: ${e}` });
        // Fallback: применяем каждый проп по одному с диагностикой
        for (const [propKey, propValue] of Object.entries(figmaProps)) {
          try { instance.setProperties({ [propKey]: propValue }); } catch (e2) {
            figma.ui.postMessage({ type: "warning", text: `  ✗ ${descriptor.component}.${propKey}=${JSON.stringify(propValue)}: ${e2}` });
          }
        }
      }
    }

    // Заполняем текст в слотах, где string → True/False VARIANT (например caption)
    // Используем только прямые TEXT-узлы (не из вложенных INSTANCE) чтобы не попасть в Button/Select
    const directTextForVariant = instance.findAll(n => {
      if (n.type !== "TEXT") return false;
      let parent = n.parent;
      while (parent && parent !== instance) {
        if (parent.type === "INSTANCE") return false;
        parent = parent.parent;
      }
      return true;
    }) as TextNode[];

    for (const [codeProp, codeValue] of Object.entries(descriptor.props ?? {})) {
      if (typeof codeValue !== "string") continue;
      if (["true","false","1","0",""].includes(codeValue.toLowerCase())) continue;
      // caption-текст устанавливается через setProperties для TEXT-пропа (CaptionContent),
      // а не через прямую запись в TEXT-узел — иначе Figma пробрасывает в связанные узлы (кнопку)
      if (codeProp === "caption") continue;
      const figmaAlias = mapping?.propAliases?.[codeProp];
      const figmaTarget = (figmaAlias ?? codeProp).toLowerCase().replace(/\s+/g, "");
      const figmaKey = Object.keys(propDefs).find(k => {
        const base = k.toLowerCase().replace(/#[^#]*$/, "").replace(/[^\x00-\x7F]/g, "").trim().replace(/\s+/g, "");
        return base === figmaTarget;
      });
      if (!figmaKey) continue;
      const propDef = (propDefs as any)[figmaKey];
      if (propDef?.type !== "VARIANT") continue;
      const opts: string[] = propDef.variantOptions ?? [];
      if (!(opts.some((o: string) => o.toLowerCase() === "true") && opts.some((o: string) => o.toLowerCase() === "false"))) continue;
      // Это True/False VARIANT с текстовым значением — ищем TEXT-узел по имени пропа или по placeholder-тексту
      const figmaPropBase = figmaKey.replace(/#[^#]*$/, "").replace(/[^\x00-\x7F]/g, "").trim();
      const match = directTextForVariant.find(n => n.name.toLowerCase().replace(/\s+/g, "") === figmaPropBase.toLowerCase().replace(/\s+/g, ""))
        ?? directTextForVariant.find(n => n.characters.toLowerCase().trim() === figmaPropBase.toLowerCase().trim());
      if (!match) continue;
      const fn = match.fontName;
      if (fn === figma.mixed) continue;
      try { await figma.loadFontAsync(fn as FontName); match.characters = codeValue; } catch { /* ok */ }
    }
  }

    // Заполняем текст в BOOLEAN-слотах, где string пришёл как значение (например caption="тестовый")
    // Исключаем TEXT-узлы внутри вложенных INSTANCE чтобы не залезть в Button/Select и т.п.
    const directTextNodes = instance.findAll(n => {
      if (n.type !== "TEXT") return false;
      let parent = n.parent;
      while (parent && parent !== instance) {
        if (parent.type === "INSTANCE") return false;
        parent = parent.parent;
      }
      return true;
    }) as TextNode[];

    for (const [codeProp, codeValue] of Object.entries(descriptor.props ?? {})) {
      if (typeof codeValue !== "string") continue;
      if (["true","false","1","0",""].includes(codeValue.toLowerCase())) continue;
      if (codeProp === "caption") continue; // обрабатывается через setProperties для TEXT-пропа
      const figmaAlias2 = mapping?.propAliases?.[codeProp];
      const figmaTarget2 = (figmaAlias2 ?? codeProp).toLowerCase().replace(/\s+/g, "");
      const figmaKey2 = Object.keys(propDefs).find(k => {
        const base = k.toLowerCase().replace(/#[^#]*$/, "").replace(/[^\x00-\x7F]/g, "").trim().replace(/\s+/g, "");
        return base === figmaTarget2;
      });
      if (!figmaKey2) continue;
      const propDef2 = (propDefs as any)[figmaKey2];
      if (propDef2?.type !== "BOOLEAN") continue;
      // BOOLEAN slot с непустой строкой — ищем TEXT-узел по имени или placeholder (только прямые, не из вложенных инстансов)
      const figmaPropBase2 = figmaKey2.replace(/#[^#]*$/, "").replace(/[^\x00-\x7F]/g, "").trim();
      const match2 = directTextNodes.find(n => n.name.toLowerCase().replace(/\s+/g, "") === figmaPropBase2.toLowerCase().replace(/\s+/g, ""))
        ?? directTextNodes.find(n => n.characters.toLowerCase().trim() === figmaPropBase2.toLowerCase().trim());
      if (!match2) continue;
      const fn2 = match2.fontName;
      if (fn2 === figma.mixed) continue;
      try { await figma.loadFontAsync(fn2 as FontName); match2.characters = codeValue; } catch { /* ok */ }
    }

  // Устанавливаем связанные TEXT-пропсы через setProperties (CaptionContent, BottomTextContent и т.п.)
  // Для string-пропов ищем TEXT-проп с именем = codeProp или codeProp + "content"
  if (descriptor.props) {
    const linkedTextProps: Record<string, string> = {};
    for (const [codeProp, codeValue] of Object.entries(descriptor.props)) {
      if (typeof codeValue !== "string") continue;
      if (["true","false","1","0",""].includes(codeValue.toLowerCase())) continue;
      const figmaAliasT = (mapping as any)?.propAliases?.[codeProp];
      const baseTargetT = (figmaAliasT ?? codeProp).toLowerCase().replace(/\s+/g, "");
      const textPropKey = Object.keys(propDefs).find(k => {
        if ((propDefs as any)[k]?.type !== "TEXT") return false;
        const base = k.toLowerCase().replace(/#[^#]*$/, "").replace(/[^\x00-\x7F]/g, "").trim().replace(/\s+/g, "");
        return base === baseTargetT || base === baseTargetT + "content";
      });
      if (textPropKey) linkedTextProps[textPropKey] = codeValue;
    }
    if (Object.keys(linkedTextProps).length > 0) {
      try { instance.setProperties(linkedTextProps as Record<string, string | boolean>); } catch { /* ok */ }
    }
  }

  // Применяем label для компонентов без экспозированного TEXT-свойства (FormField и подобные)
  const labelProp = descriptor.props?.label;
  if (typeof labelProp === "string" && !descriptor.text) {
    const hasTextProp =
      descriptor.propDefHints?.textPropKey ??
      Object.keys(propDefs).find(k => (propDefs as any)[k]?.type === "TEXT");
    if (!hasTextProp) {
      const textNode = instance.findOne(n => n.type === "TEXT");
      if (textNode?.type === "TEXT") {
        const fontName = textNode.fontName;
        if (fontName !== figma.mixed) {
          try {
            await figma.loadFontAsync(fontName as FontName);
            (textNode as TextNode).characters = labelProp;
          } catch { /* ok */ }
        }
      }
    }
  }

  // FormField / ElementHeader caption: строковый caption → найти вложенный TEXT "Caption" и заполнить
  // Пропускаем если linked TEXT props handler уже установил CaptionContent через setProperties
  const hasCaptionTextProp = Object.keys(propDefs).some(k => {
    if ((propDefs as any)[k]?.type !== "TEXT") return false;
    const base = k.toLowerCase().replace(/#[^#]*$/, "").replace(/[^\x00-\x7F]/g, "").trim().replace(/\s+/g, "");
    return base === "captioncontent" || base === "caption";
  });
  if (typeof descriptor.props?.caption === "string" && !["true","false","1","0",""].includes(descriptor.props.caption.toLowerCase()) && !hasCaptionTextProp) {
    const captionText = descriptor.props.caption;
    let captionHandled = false;

    // 1) Ищем Caption BOOLEAN на самом инстансе (Header, InfoBlock и т.п.)
    const captionBoolKey = Object.keys(propDefs).find(k => {
      const base = k.toLowerCase().replace(/#[^#]*$/, "").replace(/[^\x00-\x7F]/g, "").trim().replace(/\s+/g, "");
      return base === "caption" && (propDefs as any)[k]?.type === "BOOLEAN";
    });
    if (captionBoolKey) {
      try { instance.setProperties({ [captionBoolKey]: true }); } catch { /* ok */ }
      // Ищем Caption TEXT-узел на верхнем уровне (не внутри вложенных INSTANCE)
      const topLevelTexts = instance.findAll(n => {
        if (n.type !== "TEXT") return false;
        let p = n.parent;
        while (p && p !== instance) { if (p.type === "INSTANCE") return false; p = p.parent; }
        return true;
      }) as TextNode[];
      const captionNode = topLevelTexts.find(n => {
        const nm = n.name.toLowerCase().replace(/\s+/g, "");
        return nm === "caption" || nm.endsWith("/caption") || nm.startsWith("caption");
      }) ?? topLevelTexts.find(n => n.characters.toLowerCase().trim() === "caption")
        ?? topLevelTexts.find(n => n.characters.toLowerCase().includes("caption"));
      if (captionNode) {
        try {
          const segs = captionNode.getStyledTextSegments(["fontName"]);
          for (const seg of segs) await figma.loadFontAsync(seg.fontName as FontName);
          captionNode.characters = captionText;
          captionHandled = true;
        } catch {
          const cfn = captionNode.fontName;
          if (cfn !== figma.mixed) {
            try { await figma.loadFontAsync(cfn as FontName); captionNode.characters = captionText; captionHandled = true; } catch { /* ok */ }
          }
        }
      }
    }

    // 2) Если на верхнем уровне Caption нет — ищем во вложенных инстансах (ElementHeader внутри FormField)
    if (!captionBoolKey) {
      const nestedInstances = instance.findAll(n => n.type === "INSTANCE") as InstanceNode[];
      for (const nested of nestedInstances) {
        const nestedMainComp = await nested.getMainComponentAsync();
        const nestedCompSet = nestedMainComp?.parent;
        const nestedPropDefs = (nestedCompSet?.type === "COMPONENT_SET"
          ? (nestedCompSet as ComponentSetNode).componentPropertyDefinitions
          : nestedMainComp?.componentPropertyDefinitions) ?? {};
        const nestedCaptionKey = Object.keys(nestedPropDefs).find(k => {
          const base = k.toLowerCase().replace(/#[^#]*$/, "").replace(/[^\x00-\x7F]/g, "").trim().replace(/\s+/g, "");
          return base === "caption" && (nestedPropDefs as any)[k]?.type === "BOOLEAN";
        });
        if (nestedCaptionKey) {
          try { nested.setProperties({ [nestedCaptionKey]: true }); } catch { /* ok */ }
          // Ищем TEXT-узел Caption внутри этого вложенного инстанса
          const nestedTexts = nested.findAll(n => n.type === "TEXT") as TextNode[];
          const nestedCaptionNode = nestedTexts.find(n => {
            const nm = n.name.toLowerCase().replace(/\s+/g, "");
            return nm === "caption" || nm.endsWith("/caption") || nm.startsWith("caption");
          }) ?? nestedTexts.find(n => n.characters.toLowerCase().trim() === "caption")
            ?? nestedTexts.find(n => n.characters.toLowerCase().includes("caption"));
          if (nestedCaptionNode) {
            // Обработка mixed fonts: загружаем все шрифты из сегментов
            try {
              const segs = nestedCaptionNode.getStyledTextSegments(["fontName"]);
              for (const seg of segs) await figma.loadFontAsync(seg.fontName as FontName);
              nestedCaptionNode.characters = captionText;
              captionHandled = true;
            } catch {
              // Fallback: попробуем через fontName если не mixed
              const cfn = nestedCaptionNode.fontName;
              if (cfn !== figma.mixed) {
                try { await figma.loadFontAsync(cfn as FontName); nestedCaptionNode.characters = captionText; captionHandled = true; } catch { /* ok */ }
              }
            }
          }
          break; // нашли вложенный инстанс с Caption — выходим
        }
      }
    }

    // 3) Fallback: ищем TEXT-узел "Caption" (только прямые, не из вложенных INSTANCE)
    if (!captionHandled) {
      const allCaptionText = instance.findAll(n => {
        if (n.type !== "TEXT") return false;
        let p = n.parent;
        while (p && p !== instance) { if (p.type === "INSTANCE") return false; p = p.parent; }
        return true;
      }) as TextNode[];
      const captionNode = allCaptionText.find(n => {
        const nm = n.name.toLowerCase().replace(/\s+/g, "");
        return nm === "caption" || nm.endsWith("/caption") || nm.startsWith("caption");
      }) ?? allCaptionText.find(n => n.characters.toLowerCase().trim() === "caption")
        ?? allCaptionText.find(n => n.characters.toLowerCase().includes("caption"));
      if (captionNode) {
        try {
          const segs = captionNode.getStyledTextSegments(["fontName"]);
          for (const seg of segs) await figma.loadFontAsync(seg.fontName as FontName);
          captionNode.characters = captionText;
          captionHandled = true;
        } catch {
          const cfn = captionNode.fontName;
          if (cfn !== figma.mixed) {
            try { await figma.loadFontAsync(cfn as FontName); captionNode.characters = captionText; captionHandled = true; } catch { /* ok */ }
          }
        }
      }
    }

    // 4) Fallback: caption text внутри вложенного инстанса, имя которого содержит "caption"
    //    (например "@Caption=true" в AlertLine_V5)
    if (!captionHandled) {
      const captionStyleInstance = instance.findOne(n => {
        if (n.type !== "INSTANCE") return false;
        const nm = n.name.replace(/[#@]/g, "").replace(/=[^\s]*/g, "").toLowerCase().replace(/\s+/g, "");
        return nm === "caption";
      }) as InstanceNode | null;
      if (captionStyleInstance) {
        const textNode = captionStyleInstance.findOne(n => n.type === "TEXT") as TextNode | null;
        if (textNode) {
          const fn = textNode.fontName;
          if (fn !== figma.mixed) {
            try { await figma.loadFontAsync(fn as FontName); textNode.characters = captionText; captionHandled = true; } catch { /* ok */ }
          }
        }
      }
    }
  }

  // textNodeProps: записываем строковые пропы напрямую в TEXT-узлы по имени (без INSTANCE-обёртки)
  // (для компонентов без exposed TEXT props, например title → "@Header=true" в PageHead_V5)
  if (mapping.textNodeProps && descriptor.props) {
    for (const [codeProp, nodeName] of Object.entries(mapping.textNodeProps)) {
      const codeValue = descriptor.props[codeProp];
      if (typeof codeValue !== "string" || ["true","false","1","0",""].includes(codeValue.toLowerCase())) continue;
      const textNode = instance.findOne(n => n.type === "TEXT" && n.name === nodeName) as TextNode | null;
      if (!textNode) continue;
      const fn = textNode.fontName;
      if (fn !== figma.mixed) {
        try { await figma.loadFontAsync(fn as FontName); textNode.characters = codeValue; } catch { /* ok */ }
      }
    }
  }

  // textProps: записываем строковые пропы напрямую в TEXT-узлы внутри именованных вложенных инстансов
  // (для компонентов без TEXT компонент-пропов, например title → "#Content" в AlertLine_V5)
  if (mapping.textProps && descriptor.props) {
    for (const [codeProp, instanceName] of Object.entries(mapping.textProps)) {
      const codeValue = descriptor.props[codeProp];
      if (typeof codeValue !== "string" || ["true","false","1","0",""].includes(codeValue.toLowerCase())) continue;
      const targetInst = instance.findOne(n => n.type === "INSTANCE" && n.name === instanceName) as InstanceNode | null;
      if (!targetInst) continue;
      const textNode = targetInst.findOne(n => n.type === "TEXT") as TextNode | null;
      if (!textNode) continue;
      const fn = textNode.fontName;
      if (fn !== figma.mixed) {
        try { await figma.loadFontAsync(fn as FontName); textNode.characters = codeValue; } catch { /* ok */ }
      }
    }
  }

  // Применяем текст children (<Button>Акцент</Button>)
  if (descriptor.text) {
    // Приоритет 1: точный ключ из propDefHints (надёжно)
    // Приоритет 2: первый TEXT-prop из propDefs компонента (эвристика)
    const textPropKey = descriptor.propDefHints?.textPropKey
      ?? Object.keys(propDefs).find(k => (propDefs as any)[k]?.type === "TEXT");
    let textApplied = false;
    if (textPropKey) {
      try { instance.setProperties({ [textPropKey]: descriptor.text }); textApplied = true; } catch { /* ok */ }
    }
    if (!textApplied) {
      // Fallback: находим первый TEXT-узел внутри инстанса и задаём напрямую
      const textNode = instance.findOne(n => n.type === "TEXT");
      if (textNode?.type === "TEXT") {
        const fontName = textNode.fontName;
        if (fontName !== figma.mixed) {
          try {
            await figma.loadFontAsync(fontName as FontName);
            textNode.characters = descriptor.text;
          } catch { /* ok */ }
        }
      }
    }
  }

  // Применяем tabOptions: лейблы, активный таб, скрываем лишние
  if (descriptor.tabOptions && descriptor.tabOptions.length > 0) {
    // Все прямые Instance-дети (кнопки табов + возможно кнопка "ещё")
    const tabButtons = (instance.children as readonly SceneNode[]).filter(
      (c): c is InstanceNode => c.type === "INSTANCE"
    );
    const activeIndex = descriptor.activeTabValue
      ? descriptor.tabOptions.findIndex(t => t.value === descriptor.activeTabValue)
      : 0;

    for (let i = 0; i < tabButtons.length; i++) {
      const btn = tabButtons[i];
      if (i >= descriptor.tabOptions.length) {
        // Скрываем кнопки сверх нужного количества
        btn.visible = false;
        continue;
      }
      const { label } = descriptor.tabOptions[i];
      const isActive = i === activeIndex;

      // Определяем ключи textContent и Color из componentPropertyDefinitions кнопки
      const btnMainComp = await btn.getMainComponentAsync();
      const btnCompSet = btnMainComp?.parent;
      if (btnCompSet?.type === "COMPONENT_SET") {
        const btnPropDefs = (btnCompSet as ComponentSetNode).componentPropertyDefinitions ?? {};
        const textKey = Object.keys(btnPropDefs).find(
          k => k.replace(/#[^#]*$/, "").toLowerCase() === "textcontent"
        );
        const colorKey = Object.keys(btnPropDefs).find(
          k => k.replace(/#[^#]*$/, "").toLowerCase() === "color"
        );
        const propsToSet: Record<string, string | boolean> = {};
        if (textKey) propsToSet[textKey] = label;
        if (colorKey) propsToSet[colorKey] = isActive ? "Contrast" : "Text";
        if (Object.keys(propsToSet).length > 0) {
          try { btn.setProperties(propsToSet); } catch { /* ok */ }
        }
      } else {
        // Fallback: меняем текст напрямую через TEXT-узел конкретной кнопки (btn, не instance)
        const textNode = btn.findOne(n => n.type === "TEXT") as TextNode | null;
        if (textNode) {
          const fn = textNode.fontName;
          if (fn !== figma.mixed) {
            try {
              await figma.loadFontAsync(fn as FontName);
              textNode.characters = label;
            } catch { /* ok */ }
          }
        }
      }
    }
    if (tabButtons.length === 0) {
      figma.ui.postMessage({ type: "warning", text: `${descriptor.component}: tabOptions задан, но прямых INSTANCE-детей не найдено — проверьте иерархию компонента в Figma` });
    }
  }

  if (descriptor.contentComponent) {
    const childKey = COMPONENT_MAP[descriptor.contentComponent.component]?.componentKey;
    if (childKey) {
      try {
        let childComp: ComponentNode;
        try {
          const childSet = await figma.importComponentSetByKeyAsync(childKey);
          childComp = childSet.defaultVariant;
        } catch {
          childComp = await figma.importComponentByKeyAsync(childKey);
        }

        // В FormField (CustomContent=False) Element-слот называется по имени компонента (напр. "✅ Select_V6"),
        // а не "element". setProperties для Element INSTANCE_SWAP выбрасывает "incompatible type" из-за
        // ограничений preferred values. Используем getMainComponentAsync + swapComponent напрямую.
        const swapHints = descriptor.propDefHints?.instanceSwapProps ?? {};
        const elementSwapKey =
          swapHints["element"] ??
          Object.keys(propDefs).find(k => {
            const base = k.replace(/#[^#]*$/, "").toLowerCase().replace(/\s+/g, "");
            return base === "element" && (propDefs as any)[k]?.type === "INSTANCE_SWAP";
          });

        let elementSlot: InstanceNode | null = null;

        if (elementSwapKey) {
          const rawProp = (instance.componentProperties as any)[elementSwapKey];
          const currentKey = rawProp?.value as string | undefined;

          const innerInstances = instance.findAll(n => n.type === "INSTANCE") as InstanceNode[];
          for (const inner of innerInstances) {
            const mainComp = await inner.getMainComponentAsync();
            // currentKey — локальный ID ("44:6568"), mainComp.id — тоже локальный ID
            if (currentKey && mainComp && mainComp.id === currentKey) {
              elementSlot = inner;
              break;
            }
          }
        }

        if (elementSlot) {
          try { elementSlot.swapComponent(childComp); } catch { /* ok */ }
        }

        // Применяем пропы content-компонента к Element-слоту после swap
        if (descriptor.contentComponent.props && elementSlot) {
          const { figmaProps } = mapPropsToFigma(
            descriptor.contentComponent.component,
            descriptor.contentComponent.props,
            elementSlot.componentProperties as any
          );
          if (Object.keys(figmaProps).length > 0) {
            try { elementSlot.setProperties(figmaProps); } catch { /* ok */ }
          }

          // Явно применяем BOOLEAN пропы через propDefHints (обход проблемы с не-exposed пропами после swap)
          const childBoolProps = descriptor.contentComponent.propDefHints?.boolProps;
          const childMapping = COMPONENT_MAP[descriptor.contentComponent.component];
          if (childBoolProps && descriptor.contentComponent.props) {
            const boolsToSet: Record<string, boolean> = {};
            for (const [codeProp, codeValue] of Object.entries(descriptor.contentComponent.props)) {
              // Только truthy boolean пропы
              const isTruthy = codeValue === true || codeValue === "true" || (typeof codeValue === "string" && codeValue !== "" && codeValue !== "false" && codeValue !== "0");
              if (!isTruthy) continue;
              // Маппим code prop → Figma prop name через alias
              const alias = childMapping?.propAliases?.[codeProp];
              const targetName = (alias ?? codeProp).toLowerCase().replace(/\s+/g, "");
              const boolKey = childBoolProps[targetName];
              if (boolKey) boolsToSet[boolKey] = true;
            }
            if (Object.keys(boolsToSet).length > 0) {
              try { elementSlot.setProperties(boolsToSet); } catch { /* ok */ }
            }
          }
        }
      } catch (e) {
        figma.ui.postMessage({ type: "warning", text: `contentComponent swap failed: ${e}` });
      }
    }
  }

  // Управляем bool-пропами иконок: явно включаем/выключаем для обеих сторон
  for (const side of ["iconLeft", "iconRight"] as const) {
    const hasIcon = !!(descriptor[side] || descriptor.resolvedIcons?.[side]);
    const sideKey = side.toLowerCase(); // "iconleft" / "iconright"
    const sideStr = side === "iconLeft" ? "left" : "right";
    const boolKey =
      descriptor.propDefHints?.boolProps?.["has" + sideKey] ??
      descriptor.propDefHints?.boolProps?.[sideKey] ??
      Object.entries(descriptor.propDefHints?.boolProps ?? {}).find(
        ([k]) => k.includes("icon") && sideKey.startsWith(k)
      )?.[1] ??
      Object.keys(propDefs).find(k => {
        const base = k.replace(/#[^#]*$/, "").toLowerCase().replace(/\s+/g, "");
        return (propDefs as any)[k]?.type === "BOOLEAN" &&
          base.includes("icon") && (base.includes(sideStr) || sideKey.startsWith(base));
      });
    if (boolKey) {
      // Явно включаем или выключаем (не только выключаем)
      try { instance.setProperties({ [boolKey]: hasIcon }); } catch { /* ok */ }
    } else if (!hasIcon) {
      // Fallback: скрываем слот-инстанс напрямую
      const sideHints = side === "iconLeft" ? ["left", "Left"] : ["right", "Right"];
      const iconSlot = instance.findOne(
        n => n.type === "INSTANCE" && sideHints.some(h => n.name.includes(h) && n.name.toLowerCase().includes("icon"))
      );
      if (iconSlot) iconSlot.visible = false;
    }
  }

  for (const side of ["iconLeft", "iconRight"] as const) {
    // Приоритет: resolvedIcons (SET key из скрипта генерации)
    const setKey = descriptor.resolvedIcons?.[side];
    // Fallback: старый ICON_MAP с component key (для обратной совместимости)
    const legacyKey = descriptor[side] ? ICON_MAP[`${descriptor[side]!.category}/${descriptor[side]!.iconName}`] : undefined;

    if (!setKey && !legacyKey) {
      if (descriptor[side]) {
        figma.ui.postMessage({ type: "warning", text: `Icon "${descriptor[side]!.category}/${descriptor[side]!.iconName}" не найдена — пропущена` });
      }
      continue;
    }

    try {
      let iconComp: ComponentNode;
      if (setKey) {
        // Используем component SET key → берём defaultVariant
        const iconSet = await figma.importComponentSetByKeyAsync(setKey);
        iconComp = iconSet.defaultVariant;
      } else {
        // Старый путь: прямой component key
        iconComp = await figma.importComponentByKeyAsync(legacyKey!);
      }

      // Приоритет 1: INSTANCE_SWAP через propDefHints
      // Стратегия: точный → size-specific ("iconleft(24)") → prefix-match → оригинальный
      const sideKeyLower = side.toLowerCase(); // "iconleft"
      const sizeMap: Record<string, number> = { xs: 12, s: 16, sm: 16, m: 24, md: 24, l: 24, xl: 24 };
      const iconSize = descriptor.props?.size ? sizeMap[descriptor.props.size as string] : undefined;
      const sizeSpecificKey = iconSize ? `${sideKeyLower}(${iconSize})` : undefined;
      const swaps = descriptor.propDefHints?.instanceSwapProps ?? {};
      const swapPropKey =
        swaps[sideKeyLower] ??
        swaps[side] ??
        (sizeSpecificKey ? swaps[sizeSpecificKey] : undefined) ??
        // Prefix-match: ключ начинается с sideKeyLower ("iconleft(24)".startsWith("iconleft"))
        Object.entries(swaps).find(([k]) => k.startsWith(sideKeyLower))?.[1];
      if (swapPropKey) {
        try { instance.setProperties({ [swapPropKey]: iconComp.key }); continue; } catch { /* fallback */ }
      }

      // Приоритет 2: INSTANCE_SWAP через поиск в propDefs компонента
      const instSwapKey = Object.keys(propDefs).find(k => {
        const base = k.replace(/#[^#]*$/, "").toLowerCase().replace(/\s+/g, "");
        return (base === sideKeyLower || base.startsWith(sideKeyLower)) &&
          (propDefs as any)[k]?.type === "INSTANCE_SWAP";
      });
      if (instSwapKey) {
        try { instance.setProperties({ [instSwapKey]: iconComp.key }); continue; } catch { /* fallback */ }
      }

      // Fallback: tree-order — findAll возвращает узлы слева направо (auto-layout)
      // left icon = первый инстанс, right icon = последний
      const allInnerInstances = instance.findAll(n => n.type === "INSTANCE") as InstanceNode[];
      if (allInnerInstances.length > 0) {
        const treeSlot = side === "iconLeft" ? allInnerInstances[0] : allInnerInstances[allInnerInstances.length - 1];
        treeSlot.visible = true;
        try { treeSlot.swapComponent(iconComp); continue; } catch (e2) {
          figma.ui.postMessage({ type: "warning", text: `✗ tree-swap failed (${side}): ${e2}` });
        }
      }
    } catch (e) {
      figma.ui.postMessage({ type: "warning", text: `Icon swap failed (${side}): ${e}` });
    }
  }

  // Заполняем текст кнопок/элементов в слотах (slotChildren)
  if ((descriptor as any).slotChildren) {
    const allInstances = instance.findAll(n => n.type === "INSTANCE") as InstanceNode[];
    // Отслеживаем уже использованные инстансы чтобы разные слоты не писали в одни и те же
    const usedInstanceIds = new Set<string>();
    for (const [, childNodes] of Object.entries((descriptor as any).slotChildren as Record<string, ComponentDescriptor[]>)) {
      if (childNodes.length === 0) continue;
      const expectedCompName = childNodes[0].component;
      const expectedSetKey = COMPONENT_MAP[expectedCompName]?.componentKey;

      // Фильтруем инстансы по ключу component set (чтобы не попасть на иконку или лейбл)
      const matchingInstances: InstanceNode[] = [];
      for (const inst of allInstances) {
        const mainComp = await inst.getMainComponentAsync();
        const setNode = mainComp?.parent;
        if (setNode?.type === "COMPONENT_SET" && expectedSetKey && (setNode as ComponentSetNode).key === expectedSetKey) {
          matchingInstances.push(inst);
        } else if (mainComp?.key === expectedSetKey) {
          matchingInstances.push(inst);
        }
      }

      // Если по ключу component set не нашли — fallback: ищем по имени компонента
      if (matchingInstances.length === 0) {
        for (const inst of allInstances) {
          const mainComp = await inst.getMainComponentAsync();
          const compSet = mainComp?.parent;
          const compName = compSet?.type === "COMPONENT_SET"
            ? (compSet as ComponentSetNode).name
            : mainComp?.name ?? "";
          // Совпадение по имени (Button_V5 → Button, Select → Select и т.п.)
          if (compName.toLowerCase().replace(/_v\d+$/i, "") === expectedCompName.toLowerCase() ||
              compName.toLowerCase().startsWith(expectedCompName.toLowerCase())) {
            matchingInstances.push(inst);
          }
        }
      }

      // Последний fallback: flat индекс от конца (кнопки обычно последние)
      const candidateInstances = matchingInstances.length > 0
        ? matchingInstances
        : allInstances.slice(allInstances.length - childNodes.length);

      // Исключаем инстансы, уже использованные другим слотом (чтобы не перезаписывать текст)
      const targetInstances = candidateInstances.filter(i => !usedInstanceIds.has(i.id));

      for (let i = 0; i < childNodes.length && i < targetInstances.length; i++) {
        const childDescriptor = childNodes[i];
        const slotInstance = targetInstances[i];
        usedInstanceIds.add(slotInstance.id);
        const mainComp = await slotInstance.getMainComponentAsync();
        const slotCompSet = mainComp?.parent;
        const slotPropDefs = (slotCompSet?.type === "COMPONENT_SET"
          ? (slotCompSet as ComponentSetNode).componentPropertyDefinitions
          : mainComp?.componentPropertyDefinitions) ?? {};

        // Применяем пропсы (color, size и т.д.) к дочернему инстансу
        if (childDescriptor.props && Object.keys(childDescriptor.props).length > 0) {
          const childMapping = COMPONENT_MAP[childDescriptor.component];
          if (childMapping) {
            const { figmaProps: childFigmaProps } = mapPropsToFigma(
              childDescriptor.component, childDescriptor.props, slotPropDefs
            );
            if (Object.keys(childFigmaProps).length > 0) {
              try { slotInstance.setProperties(childFigmaProps); } catch { /* ok */ }
            }
          }
        }

        // Устанавливаем текст
        if (childDescriptor.text) {
          const textKey = Object.keys(slotPropDefs).find(k => (slotPropDefs as any)[k]?.type === "TEXT");
          if (textKey) {
            try { slotInstance.setProperties({ [textKey]: childDescriptor.text }); } catch { /* ok */ }
          } else {
            const tn = slotInstance.findOne(n => n.type === "TEXT") as TextNode | null;
            if (tn) {
              const fn = tn.fontName;
              if (fn !== figma.mixed) {
                try { await figma.loadFontAsync(fn as FontName); tn.characters = childDescriptor.text; } catch { /* ok */ }
              }
            }
          }
        }
      }
    }
  }

  // icon-only: скрываем текстовый лейбл, если нет text (например Button icon-only)
  if (!descriptor.text && (descriptor.icon || descriptor.resolvedIcons?.icon)) {
    // Ищем VARIANT-проп "Text" или аналог (showLabel → Text) с True/False
    const textVariantKey = Object.keys(propDefs).find(k => {
      const base = k.replace(/#[^#]*$/, "").toLowerCase().replace(/\s+/g, "");
      const def = (propDefs as any)[k];
      return def?.type === "VARIANT" && (base === "text" || base === "showlabel") &&
        def.variantOptions?.some((o: string) => o.toLowerCase() === "false");
    });
    if (textVariantKey) {
      const falseVal = ((propDefs as any)[textVariantKey].variantOptions as string[])
        .find((o: string) => o.toLowerCase() === "false") ?? "False";
      try { instance.setProperties({ [textVariantKey]: falseVal }); } catch { /* ok */ }
    }
  }

  // icon-only (центральная иконка, не left/right)
  const iconOnlySetKey = descriptor.resolvedIcons?.icon;
  if (iconOnlySetKey) {
    try {
      const iconSet = await figma.importComponentSetByKeyAsync(iconOnlySetKey);
      const iconComp = iconSet.defaultVariant;
      const sizeMap: Record<string, number> = { xs: 12, s: 16, sm: 16, m: 24, md: 24, l: 24, xl: 24 };
      const iconSize = descriptor.props?.size ? sizeMap[descriptor.props.size as string] : undefined;
      const swaps = descriptor.propDefHints?.instanceSwapProps ?? {};
      const swapPropKey =
        swaps["icon"] ??
        (iconSize ? swaps[`icon(${iconSize})`] : undefined) ??
        Object.entries(swaps).find(([k]) => k === "icon" || k.startsWith("icon("))?.[1];
      let iconSwapped = false;
      if (swapPropKey) {
        // Пробуем setProperties, если не работает (preferredValues) — fallback через swapComponent
        try { instance.setProperties({ [swapPropKey]: iconComp.key }); iconSwapped = true; } catch { /* fallback */ }
        if (!iconSwapped) {
          const rawProp = (instance.componentProperties as any)[swapPropKey];
          const currentKey = rawProp?.value as string | undefined;
          const innerInstances = instance.findAll(n => n.type === "INSTANCE") as InstanceNode[];
          for (const inner of innerInstances) {
            const mainComp = await inner.getMainComponentAsync();
            if (currentKey && mainComp && mainComp.id === currentKey) {
              try { inner.swapComponent(iconComp); iconSwapped = true; } catch { /* ok */ }
              break;
            }
          }
        }
      }
      // Fallback: если swapPropKey не найден (нет propDefHints) — ищем инстанс-иконку по имени или позиции
      if (!iconSwapped) {
        const innerInstances = instance.findAll(n => n.type === "INSTANCE") as InstanceNode[];
        const iconSlot = innerInstances.find(n => /icon/i.test(n.name)) ?? innerInstances[0];
        if (iconSlot) {
          try { iconSlot.swapComponent(iconComp); } catch { /* ok */ }
        }
      }
    } catch (e) {
      figma.ui.postMessage({ type: "warning", text: `Icon swap (icon) failed: ${e}` });
    }
  }

  return instance;
}

const fillWidthNodes = new WeakSet<SceneNode>();

async function buildNode(descriptor: NodeDescriptor, parentWidth?: number): Promise<SceneNode | null> {
  if (descriptor.type === "text") {
    const family = descriptor.style?.fontFamily ?? "Inter";
    const weight = descriptor.style?.fontWeight ?? 400;
    const styleMap: Record<number, string> = { 100:"Thin",200:"ExtraLight",300:"Light",400:"Regular",500:"Medium",600:"SemiBold",700:"Bold",800:"ExtraBold",900:"Black" };
    try { await figma.loadFontAsync({ family, style: styleMap[weight] ?? "Regular" }); }
    catch { await figma.loadFontAsync({ family: "Inter", style: "Regular" }); }
    const t = figma.createText();
    t.fontName = { family, style: styleMap[weight] ?? "Regular" };
    t.fontSize = descriptor.style?.fontSize ?? 16;
    t.characters = descriptor.text;
    if (descriptor.style?.color) applyFill(t, descriptor.style.color);
    if (descriptor.width === "fill" && parentWidth) { t.resize(parentWidth, t.height); t.textAutoResize = "HEIGHT"; }
    return t;
  }

  // Image: всегда Size=Auto, затем resize если размеры заданы явно
  if (descriptor.type === "component" && descriptor.component === "Image") {
    const instance = await createComponentInstance(descriptor);
    if (!instance) return null;
    try { instance.setProperties({ Size: "Auto" }); } catch { /* нет такого варианта */ }
    const w = descriptor.props?.width;
    const h = descriptor.props?.height;
    if (typeof w === "number" && typeof h === "number") {
      instance.resize(w, h);
    } else {
      fillWidthNodes.add(instance);
    }
    return instance;
  }

  // ClickableIcon → iconContainer (auto-layout) + инстанс иконки
  if (descriptor.type === "component" && descriptor.component === "ClickableIcon") {
    const frame = figma.createFrame();
    frame.name = "iconContainer";
    frame.layoutMode = "HORIZONTAL";
    frame.primaryAxisAlignItems = "CENTER";
    frame.counterAxisAlignItems = "CENTER";
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "AUTO";
    frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 0;
    frame.itemSpacing = 0;
    frame.fills = [];
    const iconSetKey = descriptor.resolvedIcons?.icon;
    const iconRef = descriptor.icon;
    const legacyKey = iconRef ? ICON_MAP[`${iconRef.category}/${iconRef.iconName}`] : undefined;
    const key = iconSetKey || legacyKey;
    const size = parseInt((descriptor.props?.iconSize as string) ?? "24") || 24;
    if (key) {
      try {
        const iconSet = await figma.importComponentSetByKeyAsync(key);
        const iconInstance = iconSet.defaultVariant.createInstance();
        iconInstance.resize(size, size);
        frame.appendChild(iconInstance);
      } catch (e) {
        figma.ui.postMessage({ type: "warning", text: `ClickableIcon: импорт иконки не удался: ${e}` });
      }
    }
    if (descriptor.width === "fill") fillWidthNodes.add(frame);
    return frame;
  }

  if (descriptor.type === "component") {
    // Если у компонента есть trigger-слот (например Menu с trigger={<Button>}) —
    // в статичном Figma-макете рендерим trigger вместо самого компонента
    const triggerChildren = (descriptor as any).slotChildren?.["trigger"] as ComponentDescriptor[] | undefined;
    if (triggerChildren && triggerChildren.length > 0) {
      return await buildNode(triggerChildren[0], parentWidth);
    }
    const instance = await createComponentInstance(descriptor);
    if (!instance) return null;
    if (descriptor.width === "fill") fillWidthNodes.add(instance);
    else if (typeof descriptor.width === "number") instance.resize(descriptor.width, instance.height);
    return instance;
  }

  if (descriptor.type === "row") {
    const frame = figma.createFrame();
    frame.layoutMode = "HORIZONTAL";
    frame.itemSpacing = descriptor.gap ?? 0;
    frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 0;
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "AUTO";
    frame.fills = [];
    for (const child of descriptor.children) {
      const node = await buildNode(child);
      if (!node) continue;
      frame.appendChild(node);
      if (fillWidthNodes.has(node)) { (node as InstanceNode).layoutSizingHorizontal = "FILL"; }
    }
    if (descriptor.width === "fill" && parentWidth) { frame.resize(parentWidth, frame.height); frame.primaryAxisSizingMode = "FIXED"; }
    return frame;
  }

  if (descriptor.type === "section") {
    const frame = figma.createFrame();
    frame.name = "Section";
    frame.layoutMode = "VERTICAL";
    frame.itemSpacing = descriptor.gap ?? 0;
    frame.paddingTop = frame.paddingBottom = frame.paddingLeft = frame.paddingRight = 0;
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "AUTO";
    frame.fills = [];
    for (const child of descriptor.children) {
      const node = await buildNode(child, parentWidth);
      if (!node) continue;
      frame.appendChild(node);
      if (fillWidthNodes.has(node)) {
        (node as InstanceNode).layoutSizingHorizontal = "FILL";
      }
    }
    fillWidthNodes.add(frame);
    return frame;
  }

  return null;
}

async function buildPage(descriptor: PageDescriptor & { children: NodeDescriptor[] }): Promise<string> {
  const { page: pageConfig, card: cardConfig } = descriptor;

  const pageFrame = figma.createFrame();
  pageFrame.name = descriptor.name;
  pageFrame.resize(pageConfig.width, pageConfig.height);
  pageFrame.layoutMode = "VERTICAL";
  pageFrame.primaryAxisAlignItems = "CENTER";
  pageFrame.counterAxisAlignItems = "CENTER";
  pageFrame.fills = [];
  applyFill(pageFrame, pageConfig.background);
  pageFrame.x = findFreeX();
  pageFrame.y = 100;
  figma.currentPage.appendChild(pageFrame);

  const cardFrame = figma.createFrame();
  cardFrame.name = "Card";
  cardFrame.resize(cardConfig.width, 100);
  cardFrame.layoutMode = "VERTICAL";
  cardFrame.itemSpacing = cardConfig.gap;
  cardFrame.paddingTop = cardFrame.paddingBottom = cardConfig.paddingVertical;
  cardFrame.paddingLeft = cardFrame.paddingRight = cardConfig.paddingHorizontal;
  cardFrame.primaryAxisSizingMode = "AUTO";
  cardFrame.counterAxisSizingMode = "FIXED";
  cardFrame.cornerRadius = cardConfig.borderRadius;
  cardFrame.fills = [];
  applyFill(cardFrame, cardConfig.background);
  pageFrame.appendChild(cardFrame);
  cardFrame.layoutSizingVertical = "HUG";

  const innerWidth = cardConfig.width - cardConfig.paddingHorizontal * 2;
  for (const childDesc of descriptor.children) {
    const node = await buildNode(childDesc, innerWidth);
    if (!node) continue;
    cardFrame.appendChild(node);
    if (fillWidthNodes.has(node)) { (node as InstanceNode).layoutSizingHorizontal = "FILL"; }
    else if (node.type !== "TEXT") {
      try { (node as FrameNode | InstanceNode).layoutSizingHorizontal = "FILL"; } catch { /* ok */ }
    }
  }

  figma.viewport.scrollAndZoomIntoView([pageFrame]);
  return `Готово! "${descriptor.name}" (${cardFrame.children.length} элементов).`;
}

figma.showUI(__html__, { width: 420, height: 560, title: "Page to Figma" });

figma.ui.onmessage = async (msg) => {
  if (msg.type === "generate") {
    let descriptor: PageDescriptor;
    try { descriptor = JSON.parse(msg.json) as PageDescriptor; }
    catch (e) { figma.ui.postMessage({ type: "error", text: `Невалидный JSON: ${e}` }); return; }

    figma.ui.postMessage({ type: "status", text: "Создаём страницу..." });
    try {
      // Pre-load design system fonts to avoid "unloaded font in appendChild" errors
      await Promise.allSettled([
        figma.loadFontAsync({ family: "YS Text", style: "Regular" }),
        figma.loadFontAsync({ family: "YS Text", style: "Medium" }),
        figma.loadFontAsync({ family: "YS Text", style: "Bold" }),
      ]);
      if (descriptor.variants && descriptor.variants.length > 0) {
        for (const variant of descriptor.variants) {
          await buildPage({ ...descriptor, name: `${descriptor.name} / ${variant.name}`, children: variant.children });
        }
        figma.ui.postMessage({ type: "done", text: `Готово! Создано ${descriptor.variants.length} вариантов.` });
      } else if (descriptor.children) {
        const result = await buildPage(descriptor as PageDescriptor & { children: NodeDescriptor[] });
        figma.ui.postMessage({ type: "done", text: result });
      } else {
        figma.ui.postMessage({ type: "error", text: "Дескриптор не содержит children или variants" });
      }
    } catch (e) {
      figma.ui.postMessage({ type: "error", text: `Ошибка: ${e}` });
    }
  }
  if (msg.type === "scan") {
    const result: Record<string, any> = {};
    for (const [compName, mapping] of Object.entries(COMPONENT_MAP)) {
      try {
        const set = await figma.importComponentSetByKeyAsync(mapping.componentKey);
        const defs = set.componentPropertyDefinitions as Record<string, any>;
        const entry: any = {};

        for (const [key, def] of Object.entries(defs)) {
          const base = key.replace(/#[^#]*$/, "");
          const baseLower = base.toLowerCase().replace(/\s+/g, "");

          if (def.type === "TEXT" && !entry.textPropKey) {
            entry.textPropKey = key;
          }
          if (def.type === "INSTANCE_SWAP") {
            entry.instanceSwapProps = entry.instanceSwapProps ?? {};
            entry.instanceSwapProps[baseLower] = key;
          }
          if (def.type === "BOOLEAN") {
            entry.boolProps = entry.boolProps ?? {};
            entry.boolProps[baseLower] = key;
          }
        }
        result[compName] = entry;
        figma.ui.postMessage({ type: "scan_progress", text: `✓ ${compName}` });
      } catch (e) {
        figma.ui.postMessage({ type: "scan_progress", text: `✗ ${compName}: ${e}` });
      }
    }
    const cache = { updatedAt: new Date().toISOString(), defs: result };
    figma.ui.postMessage({ type: "scan_done", json: JSON.stringify(cache, null, 2) });
  }
  if (msg.type === "close") figma.closePlugin();
};
