export interface IconRef {
  iconName: string;
  category: string;
}

export interface PropDefHints {
  /** Точный ключ TEXT-prop (например "Label#99:12") */
  textPropKey?: string;
  /** INSTANCE_SWAP props по базовому имени (например { "iconleft": "Icon Left#77:45" }) */
  instanceSwapProps?: Record<string, string>;
  /** BOOLEAN props по базовому имени (например { "hasiconleft": "Has Icon Left#xx:yy" }) */
  boolProps?: Record<string, string>;
}

export interface ComponentNode {
  type: "component";
  component: string;
  props?: Record<string, string | boolean | number>;
  text?: string;
  iconLeft?: IconRef;
  iconRight?: IconRef;
  icon?: IconRef;
  contentComponent?: ComponentNode;
  width?: "fill" | number;
  /** Точные ключи props из Figma API (заполняются скриптом генерации) */
  propDefHints?: PropDefHints;
  /** Resolv-нные Figma component SET keys для иконок */
  resolvedIcons?: { iconLeft?: string; iconRight?: string; icon?: string };
  /** Дочерние компоненты в именованных слотах (buttons={<><Button/><Button/></>}) */
  slotChildren?: Record<string, ComponentNode[]>;
  /** Лейблы табов, извлечённые из статического массива options={ARRAY} */
  tabOptions?: Array<{ value: string; label: string }>;
  /** Активный таб (задаётся per-variant в buildDescriptor) */
  activeTabValue?: string;
  /** Пропс value={stateVar} связан с тернарным состоянием */
  isTabValueLinked?: boolean;
}

export interface TextNode {
  type: "text";
  text: string;
  style?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    color?: string;
  };
  width?: "fill" | number;
}

export interface RowNode {
  type: "row";
  gap?: number;
  children: DescriptorNode[];
  width?: "fill" | number;
  /** Вариант-специфичные дочерние элементы (из {stateVar === 'x' && <Component/>} в исходнике) */
  variantExtras?: Record<string, ComponentNode[]>;
}

export interface SectionNode {
  type: "section";
  gap?: number;
  children: DescriptorNode[];
}

export type DescriptorNode = ComponentNode | TextNode | RowNode | SectionNode;

export interface PageVariant {
  name: string;
  children: DescriptorNode[];
}

export interface PageDescriptor {
  name: string;
  page: { width: number; height: number; background: string };
  card: {
    width: number;
    paddingVertical: number;
    paddingHorizontal: number;
    gap: number;
    background: string;
    borderRadius: number;
  };
  variants?: PageVariant[];
  children?: DescriptorNode[];
}
