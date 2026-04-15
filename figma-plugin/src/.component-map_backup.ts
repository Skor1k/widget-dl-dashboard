export interface ComponentMapping {
  componentKey: string;
  propAliases?: Record<string, string>;
  valueAliases?: Record<string, Record<string, string>>;
  /** Если любой из ключей (code props) = true, автоматически включить указанные Figma BOOLEAN пропы */
  implicitBooleans?: Record<string, string[]>;
  /** Figma BOOLEAN пропы, которые нужно выключить по умолчанию (если не включены явно через code props) */
  defaultFalse?: string[];
  /** Если true — AST-парсер обходит компонент как прозрачный контейнер и парсит его детей */
  transparent?: boolean;
}

export const COMPONENT_MAP: Record<string, ComponentMapping> = {
  Button: {
    componentKey: "a765d5679f10f13e5e369e4df617396acca6d397",
    propAliases: { color: "Color", size: "Size", showLabel: "Text", width: "Width" },
    valueAliases: {
      color: {
        accent: "Accent", normal: "Normal", contrast: "Contrast",
        contour: "Contour", text: "Text", "text-supplementary": "Text Supplementary", link: "Link",
      },
      size: { xs: "XS", s: "S", m: "M", l: "L", xl: "XL" },
      showLabel: { "false": "False", "true": "True" },
      width: { max: "Max", auto: "Auto" },
    },
  },
  MultiButton: {
    componentKey: "73577ebc928c4dcdea49e0e33250ce5092a8987e",
    propAliases: { color: "Color", size: "Size", width: "Width" },
    valueAliases: {
      color: { accent: "Accent", normal: "Normal", gray: "Normal" },
      size: { s: "S", m: "M", l: "L" },
      width: { max: "Max", auto: "Auto" },
    },
  },
  FormField: {
    componentKey: "8266b3e6ba42e072128de1bd5e9e1bb14c1ac88a",
    propAliases: { label: "Label", validationState: "ValidationState", horizontalLayout: "HorizontalLayout" },
    valueAliases: {
      validationState: { none: "None", error: "Error", success: "Success", warning: "Warning" },
      horizontalLayout: { "false": "False", "true": "True" },
    },
  },
  Select: {
    componentKey: "4984064d1faed9af4cdf733869ce710f9dfd94e6",
    propAliases: { color: "Color", size: "Size", width: "Width", validationState: "ValidationState" },
    valueAliases: {
      color: { contour: "Contour", contrast: "Contrast", normal: "Normal" },
      size: { s: "S", m: "M", l: "L" },
      width: { max: "Max", auto: "Auto" },
      validationState: { none: "None", error: "Error", success: "Success", warning: "Warning" },
    },
  },
  TextInput: {
    componentKey: "b272d94a2f29da0d7573f24254a6be4df9eccd85",
    // hasClearButton → Figma BOOLEAN prop "close" (controls X button visibility)
    // counter → Figma BOOLEAN prop "Counter" (shows character counter)
    propAliases: { size: "Size", hasClearButton: "close", counter: "Counter", hasCounter: "Counter", color: "Color", validationState: "ValidationState" },
    valueAliases: {
      size: { s: "S", m: "M", l: "L" },
      validationState: { none: "None", error: "Error", success: "Success", warning: "Warning" },
    },
  },
  Radiobox: {
    componentKey: "46079d6cdeffbd4d319f4f83f9ed6adb7c8b3868",
    propAliases: { size: "Size" },
    valueAliases: { size: { s: "S", m: "M", l: "L" } },
  },
  Header: {
    componentKey: "289b1c524876349082948a175c0499df92b7677b",
    // level="h2" → Figma Level="h2 (24-32)" — prefix-match в mapPropsToFigma найдёт автоматически
    propAliases: {
      level: "Level",
      help: "Help",             // render-prop → VARIANT true/false
      stub: "Stub",             // boolean → VARIANT true/false (React: отдельный HeaderStub)
      caption: "Caption",       // ReactNode → BOOLEAN
      addonRight: "AddonRight", // ReactNode → BOOLEAN
      textAddonRight: "Label",  // ReactNode → BOOLEAN (имена различаются!)
    },
    valueAliases: {
      level: { h1: "h1", h2: "h2", h3: "h3", h4: "h4", h5: "h5" },
    },
  },
  Checkbox: {
    componentKey: "3272ab2f90fbb679a57eb1b321224be109525164",
    propAliases: { size: "Size", isSelected: "isSelected", help: "Help", isBold: "IsBold" },
    valueAliases: { size: { s: "S", m: "M", l: "L", xs: "xs", "2xs": "2xs" } },
  },
  FileUploader: {
    componentKey: "19b068e24f588d08656fc9a65a61caaa4ed59cd1",
    propAliases: { isCompact: "IsCompact", state: "State" },
    valueAliases: {
      state: { normal: "Normal", hover: "Hover", loading: "Loading", error: "Error" },
    },
  },
  InfoBlock: {
    componentKey: "b86e5f656fe88429b08c1b9c2b0b96c887774736",
    propAliases: {
      type: "Type",
      color: "Color",
      caption: "Caption",
      // labelBlock → Figma "labelBlock" (совпадает, alias не нужен)
      // onClose → Figma "onClose" (совпадает, alias не нужен)
    },
    valueAliases: {
      type: { icon: "Icon", text: "Text", illustration: "Illustration", image: "Image", custom: "Custom" },
      color: { message: "Message", island: "Island", inverted: "Inverted", info: "Info", warning: "Warning", error: "Error", success: "Success", ai: "AI" },
    },
    // labelBlock или onClose → нужно сначала включить AddonRight
    implicitBooleans: { AddonRight: ["labelBlock", "onClose"] },
    // Кнопки по умолчанию скрыты — показывать только если явно заданы
    defaultFalse: ["Buttons"],
  },

  // ── Новые компоненты из FormPage.tsx ─────────────────────────────────────

  InfoItem: {
    componentKey: "9819aa053037e7d42d4ac08529d8c9c9e6858cf2",
    propAliases: {
      hasImage: "HasImage",   // BOOLEAN: показывает слот для изображения
      size: "Size",
    },
    valueAliases: {
      size: { s: "S", m: "M", l: "L" },
    },
  },

  Link: {
    componentKey: "42bf10c65702f8362579d18e9d7d054c487ff9e0",
    propAliases: {
      size: "Size",
      color: "Color",
      // href — только runtime, Figma не нужен
    },
    valueAliases: {
      size: { xs: "XS", s: "S", m: "M", l: "L" },
      color: { normal: "Normal", inverted: "Inverted" },
    },
  },

  Label: {
    componentKey: "0f1ed285b86446fde73582ffbc4ea93a316252d0",
    propAliases: {
      color: "Color",
      size: "Size",
      type: "Type",
    },
    valueAliases: {
      color: {
        gray: "Gray", yellow: "Yellow", red: "Red", green: "Green",
        blue: "Blue", cyan: "Cyan", purple: "Purple", orange: "Orange",
        pink: "Pink", normal: "Normal", inverse: "Inverse",
      },
      size: { xs: "XS", s: "S", m: "M" },
      type: { normal: "Normal", copy: "Copy", close: "Close", closeCopy: "CloseCopy" },
    },
  },

  // ── Дополнительные компоненты из @direct-frontend/components ─────────────

  Accordion: {
    componentKey: "242b3c1026834144d35366e496d71c0f9dd4e7ce",
    propAliases: {
      type: "Arrow",       // React type='left'|'right' → Figma Arrow=Left|Right
      isExpanded: "Open",  // React isExpanded → Figma Open=true|false
    },
    valueAliases: {
      level: {             // Figma Level содержит размеры в скобках
        h2: "h2 (24-32)",
        h3: "h3 (20-28)",
        h4: "h4 (16-24)",
        h5: "h5 (14-20)",
      },
    },
  },

  Switcher: {
    componentKey: "6611d3469ab4dac9d4e1edd9710309b2bfc0099a",
    propAliases: {
      size: "Size",
      isSelected: "isSelected",   // BOOLEAN
      isDisabled: "isDisabled",   // BOOLEAN
    },
    valueAliases: {
      size: { xs: "xs", s: "S", m: "M" },
    },
  },

  Cell: {
    componentKey: "ef17f85ceb29221e3e119a5871eae2c0e20af5b5",
    propAliases: {
      size: "Size",
      hasImage: "HasImage",   // BOOLEAN
    },
    valueAliases: {
      size: { s: "S", m: "M", l: "L" },
    },
  },

  ElementHeader: {
    componentKey: "9487b8799fcb3a8afe6e60b1fd4986472424923c",
    propAliases: {
      level: "Level",
      size: "Size",
    },
    valueAliases: {
      level: { h1: "h1", h2: "h2", h3: "h3", h4: "h4", h5: "h5" },
      size: { s: "S", m: "M", l: "L", xl: "XL" },
    },
  },

  Text: {
    componentKey: "a2db2e7e17a0e736b41c8d1b8345377aeda4c9ee",
    propAliases: {
      size: "Size",
      weight: "Weight",
      color: "Color",
    },
    valueAliases: {
      size: { xs: "XS", s: "S", m: "M", l: "L", xl: "XL" },
      weight: { regular: "Regular", medium: "Medium", bold: "Bold" },
    },
  },

  Tag: {
    componentKey: "5da5c9a948c142ceb7e6b81a9045a453d43f86b2",
    propAliases: {
      color: "Color",
      size: "Size",
      type: "Type",
    },
    valueAliases: {
      color: {
        gray: "Gray", blue: "Blue", green: "Green", red: "Red",
        yellow: "Yellow", purple: "Purple", orange: "Orange", cyan: "Cyan",
        normal: "Normal", accent: "Accent",
      },
      size: { s: "S", m: "M", l: "L" },
      type: { default: "Default", removable: "Removable" },
    },
  },

  TagGroup: {
    componentKey: "87054d457f5ca2c14695087ae3d95e7afd2a7036",
    propAliases: {
      size: "Size",
    },
    valueAliases: {
      size: { s: "S", m: "M", l: "L" },
    },
  },

  Tooltip: {
    componentKey: "c4223694da4afda38b42774be5c8f167af68040d",
    propAliases: {
      view: "View",
      size: "Size",
    },
    valueAliases: {
      view: { dark: "Dark", light: "Light" },
      size: { s: "S", m: "M", l: "L" },
    },
  },

  // StatefulTooltip — одиночный компонент без вариантов
  StatefulTooltip: {
    componentKey: "77df486848b01c504a326461892c15c98836ee73",
  },

  SelectCompact: {
    componentKey: "ef736036c254aa824d8848a7eafcadb23a361da8",
    propAliases: {
      size: "Size",
      color: "Color",
      validationState: "ValidationState",
      width: "Width",
    },
    valueAliases: {
      size: { s: "S", m: "M", l: "L" },
      color: { contour: "Contour", contrast: "Contrast", normal: "Normal" },
      validationState: { none: "None", error: "Error", success: "Success", warning: "Warning" },
      width: { max: "Max", auto: "Auto" },
    },
  },

  // DraggableHelp — одиночный компонент без вариантов
  DraggableHelp: {
    componentKey: "59895f86f421f7a5b019f7025f34211dedaa0305",
  },

  MiniGrid: {
    componentKey: "14f0482d659532a5144b168e5588987c3651b89e",
  },

  // AlertLine — контейнер-обёртка без пропсов, визуальные пропсы на AlertLineSlide
  AlertLine: {
    componentKey: "635e8c03685900dc228a2b8bd5ecad98eb73fee6",
    transparent: true,  // AST-парсер должен обходить и парсить дочерние AlertLineSlide
  },

  // AlertLineSlide → Figma AlertLine_V5 (тот же componentKey, здесь живут все пропсы)
  AlertLineSlide: {
    componentKey: "635e8c03685900dc228a2b8bd5ecad98eb73fee6",
    propAliases: {
      buttonGroup: "Buttons",    // ReactNode buttonGroup → BOOLEAN Buttons
      titleAddonLeft: "Icon",    // ReactNode titleAddonLeft → BOOLEAN Icon (слева)
      actionIcon: "Menu",        // ReactNode actionIcon → BOOLEAN Menu (справа)
      // caption → Caption: normalize совпадает, alias не нужен
      // color → Color: capitalize даёт Warning/Info/Error/Success/Message ✓
    },
  },
};

// Иконки из библиотеки "!💎 Icons". Ключ: "${category}/${iconName}" → componentSetKey
export const ICON_MAP: Record<string, string> = {
  // Actions
  "Actions/AddToFavorites":    "6590ac8b4adb799ce7bf42bd67e4181b62ac29c5",
  "Actions/AddToLitst":        "28d9b7fe99ef97d22d9b4ea8fa12490c91100e1c",
  "Actions/ArrowDown":         "1c2a84bdd1ac3f6a9e56cb1e23b6d9b843bc418e",
  "Actions/ArrowDownBig":      "a3106ce4fcc3dbf8850f1d4d9ea8359a69c7a246",
  "Actions/ArrowDownSmall":    "30b1ec3562f538bcbb6677c8bd37c1818199f81a",
  "Actions/ArrowLeft":         "8d771a5c3decedda2cbe1d0f416a6ba7cbbd7f5d",
  "Actions/ArrowLeftBig":      "fc2851c82cbf2b6aa8fac3d3932a9cff8aebd96c",
  "Actions/ArrowLeftLast":     "6e9823203712bf55a2aa7c96384282e33bf52cf9",
  "Actions/ArrowLeftSmall":    "854d069757aca3e4d47df42d601900a5fc53aea1",
  "Actions/ArrowNavLeft":      "c2c68001b5291eaab36341ed183de914733524cf",
  "Actions/ArrowNavRight":     "914d18e603966926814db835e37970c4b633aca3",
  "Actions/ArrowRight":        "3a91427c3a26f62bb0fd5485946988547f39914a",
  "Actions/ArrowRightBig":     "5fcf38e6501bcaefef2cc917906f78e1e45f9c5d",
  "Actions/ArrowRightLast":    "974a22328e627aca3a995314905cd92176bd9fec",
  "Actions/ArrowRightSmall":   "21fe1b96818046f50ef4450dfd1d300690ecaa6d",
  "Actions/ArrowUp":           "0c09880feb5edcea2ddf9068085616da2f2afb24",
  "Actions/ArrowUpBig":        "ab2c8a0f4d7283d78028526a1d09a117ab894986",
  "Actions/ArrowUpSmall":      "fd06994983c4611fb81b7c8b45a2267f2be23fd0",
  "Actions/Call":              "0d2948d7ba226c7edcf8f88a39a5274856aaa3d6",
  "Actions/CleanContour":      "38e8353eb1c543886d11d6da935e3782cb2d2d21",
  "Actions/Close":             "1f7ef9573db6aa7b3aa0c4a5e60c3444d0d6bcf3",
  "Actions/CloseCircle":       "a0bde3b7b017d2ade6eed941ccb58c996b0a9ac9",
  "Actions/Copy":              "30f93b1487b95393b4267ee220385bee68faf6cd",
  "Actions/Create":            "33e1cb8efb9450c18a1634937f7de84235ffd9e0",
  "Actions/Day":               "05571ef12d6731c7d8e98462bb641df47c686f03",
  "Actions/Download":          "7d56c0f8dc1096687bf807dcf53ec27e603fd470",
  "Actions/Drag":              "1c3599a41c84f59f7c0798f8ba0470051943fa80",
  "Actions/Edit":              "a6dcc29d9391ffb6466b65dfc47bb5aaefaeb8b6",
  "Actions/Filter":            "21cc3a12721d8f396576e01215e14b28d2458557",
  "Actions/FullscreenEnter":   "cf3e81a8db16ce195db61498290d5683fc696c17",
  "Actions/FullscreenExit":    "4a7e677e796864b74f4241a92d2013be1b5aad97",
  "Actions/Funnel":            "da74fdfb0a89de6e76158c7ede92753c09f6d361",
  "Actions/GetData":           "fc53e37598ad7fcc81c1fb1bc9bbd8f1f6f50e32",
  "Actions/Hide":              "e43e9b7193f6dc44639bef67f38e18aae94bcd95",
  "Actions/ListAddToFavorites":"b00196e31c117abba7c903fc80fe00f427bd7591",
  "Actions/Lock":              "907d2bdd23c22a4dd39f0eb2c620c3c6c5d2cd19",
  "Actions/Minus":             "a945e8a876b55238374987974d57f827bb8ee767",
  "Actions/MinusCircle":       "83851dc5d4bac98342764b6ba79d49a89a76106f",
  "Actions/Night":             "c3334e0f13f4f0e6108a54b881b4ca1edaf11453",
  "Actions/OpenInNewTab":      "5dddff36f60e8a5ceba3f7e0f0b01901fd53f1aa",
  "Actions/Plus":              "901ba2c25c9a2460b3eb90438371cd83ea0ef8d7",
  "Actions/PlusCircle":        "fc58bdd17ad04fef5d57843e70cfe8ed055d4cf7",
  "Actions/PostData":          "a341ad113855f477180c5b2080ba55bac52704cc",
  "Actions/PostDataAccept":    "76e2c09975d143112a2bf462fc1f0ceebaa7bf7e",
  "Actions/PostDataError":     "95e8627204d415beab5d6e0c26719fb2a464e707",
  "Actions/Print":             "fa0c1284b2864aafdf7b475647a39cceb84dbb9b",
  "Actions/Refresh":           "e8fbd35ed0d052dbf053c3fc739a7c6eae6b4b83",
  "Actions/Save":              "0aa27f34278bc105150e0bb0f8d633d4ee731401",
  "Actions/Search":            "85cb373bc5e1b5f0aded3c84f8b5af902597b387",
  "Actions/SearchAndReplace":  "ce4c2023af571ca8154460b677b2e62e3b8ec3fe",
  "Actions/SearchByImage":     "a7a603f26eb214aff47d6a339ed4d75f6daeca32",
  "Actions/Select":            "d9b853cac49dcb71e154c94398969baa48119985",
  "Actions/SelectCircle":      "da9b99cb0ae25b76412df19a747d1926f651bb2b",
  "Actions/Show":              "464cd275d67502d265e4e2ed5912452deb1b8c74",
  "Actions/SignIn":            "c0019a4d8d88e0bc10d975e4a801b30151c5b4b5",
  "Actions/SignOut":           "a63ebf51449f31d5920cf3db03096d841335c52a",
  "Actions/Sort":              "27d32861e86ca59cefb39ee11d18121249086f25",
  "Actions/SortAscending":     "d3f3c4db02ff46ea410ccc4dc258d346a7cfe64c",
  "Actions/SortDescending":    "ff150fb71ad281885129ae1ed1ab10e417ea5ccd",
  "Actions/SwapHorizontal":    "ab1ce2cc2462905c5014c4fb983c1d46ea52ee2c",
  "Actions/SwapVertical":      "61745a6cfb9882f5825ca9abf4e043303c6051a6",
  "Actions/Undo":              "94755b623d241a2adc0788263d8bd74c2cd51001",
  "Actions/Unlock":            "a7c4b788f09d4ef0b062b630eac99a78c8637b57",
  "Actions/Update":            "7746655a7600213dc4785fb2b3c6e1f3aa7a53a6",
  "Actions/Upload":            "ba673a2e5a940580ed94229d4b2e99fc92e24a50",

  // CampaignType
  "CampaignType/Audio":            "77c9d7113176b43c40ffb35e8b475366b0bdfabd",
  "CampaignType/Autobudget":       "42c7295d45b7934de3a662c6ef74377858cd5189",
  "CampaignType/Combine":          "4c2ce208d201cbd216f004e12310679bf8e5e55a",
  "CampaignType/CPM banner":       "095f7e4a8852a4cbf7534fa751a2821de18f31a6",
  "CampaignType/CPMVideo":         "845b6cfba1a6ba93ee0e31864051914fc8051e98",
  "CampaignType/Deals":            "33e2b9d74dbb52d348f22cba2e4b8f5c91ff93d3",
  "CampaignType/Direct":           "fe312e56dac1f808e74d889f83f7c7b1d64fcb35",
  "CampaignType/Dynamic":          "ce99f4bdbdc1e6fc87ebb8f86eb7557d2b57ef2e",
  "CampaignType/EasyStart":        "2f73d2530083a656525dd3e1a2310efdddb8b1bd",
  "CampaignType/Eda":              "65a6cffc04209ba38cf759eb0906dc23e38bac40",
  "CampaignType/Games":            "5e3d0d163f99e96c66dbf939420efbe3a67dd37d",
  "CampaignType/Geo":              "0779a2b1bf8455f393668881cae76b2832d38f36",
  "CampaignType/Go":               "9abd21c644c05da99565303e880684efc199f8de",
  "CampaignType/GoodsPages":       "955de9edf44a7f8172afc74c33ba314dacd1ee34",
  "CampaignType/Graphic":          "97ec880540ff5f1596e244b73348aad87fd9e37c",
  "CampaignType/Indoor":           "09456fde74a0b21c9331c6d4e4982c4d6748867d",
  "CampaignType/InternalDistrib":  "5fbd33940e990a13c29091253d59f0a30ea9d5ab",
  "CampaignType/InternalFree":     "1c164b0e606199895697a435245135fe58b2dac2",
  "CampaignType/Master":           "881c4f6737d8c8b8f4cd65af5b704fd5dcb1e963",
  "CampaignType/Media":            "cf4b34136c8e08e32568ab4e8d998051307bb172",
  "CampaignType/Metro":            "d67aadaefd2d7702dceec23fbb529e5e6422956f",
  "CampaignType/MordaBanner":      "8c4a09bcf2c2801f3d131aca952252dc23bd0c84",
  "CampaignType/Navigator":        "623513fc806ec811c32484caf0bef76870724671",
  "CampaignType/OnSite":           "076a4d5b4a4795b36c7c81592002dac30638dbf6",
  "CampaignType/Outdoor":          "8847b3557f90f7bdc49092c7802bb06f85ce07c4",
  "CampaignType/Pages":            "3b41493f9fb269d3fc19215fb35a4a7e51256c55",
  "CampaignType/Promote":          "a9a2425fd5eae8f1ebb68506575a7f64b12c89a1",
  "CampaignType/PromotionVideo":   "21e12fe3ab7730b6e557c796ecd1cace5e61e182",
  "CampaignType/Pulse":            "39862aa22d724ef93206ca33b2ad64fdfefcb5e1",
  "CampaignType/RMP":              "bcfb7fc2ab2d1d6aa03ce3b64972f3f85f71aa43",
  "CampaignType/RYTHM":            "eae11490b265cc0fab8c35277a2f76f16c394828",
  "CampaignType/Sellers":          "10e624a4dcb484b342bd82e3283716394dd5d463",
  "CampaignType/SerpBanner":       "d187e34eea72ae91686f5e1b02a7b5e3357b4732",
  "CampaignType/Smart":            "7a4d8ecbeb342ff9a31072355916dfd5114dbfeb",
  "CampaignType/Specialists":      "d8bec0c3c393e51367fc00148457d8dfa09ba718",
  "CampaignType/TGO":              "946727f8b8630321373d222b5fbb6b75154db51b",
  "CampaignType/TGOMobile":        "0a08731182d9f35d57f5a6562d89d49b31d29546",
  "CampaignType/Union":            "dd6e6f83e61bc19582f895442a95933c3d09908a",
  "CampaignType/Uslugi":           "9a4d2d7dbf190246b8f06373d3d996748e55184e",
  "CampaignType/VideoType":        "9d0e231334dac63ff09422a764e043e34c9257fd",
  "CampaignType/YTM":              "99e242c088be5e688f7020143dc3bd2420813252",
  "CampaignType/Zen":              "5e80a504831c09d278785eaf5bf7848c73ffd718",

  // ChatsSocial
  "ChatsSocial/Admin":         "618e6d7f7dc2e070af105a8254bd2a80ada1bc94",
  "ChatsSocial/Bell":          "cb00e906c7e205f2b1bd3dc5ff1c1679496524c0",
  "ChatsSocial/BellDisabled":  "c9f36059b318fb0b4dd21abe0a58c07490c2b197",
  "ChatsSocial/BellRinging":   "fc838a8425a29282d1dfab99c0b3a291af45f65a",
  "ChatsSocial/BellUnread":    "4657aa14c21e6d93cb818c3341b1187f7303cedc",
  "ChatsSocial/Chat":          "802c3ebaa69d00c53f53ce9c53e3f68b6c45a703",
  "ChatsSocial/ChatMessage":   "cdf1d040c55679a7609d07f383c94df7f051d50a",
  "ChatsSocial/ChatMultiple":  "a3dc23ef61b42b6168bae3e94c2f4d5136c7b19d",
  "ChatsSocial/ChatSquared":   "6e19947c1cd565a2c326fd17bc8f90de358bc531",
  "ChatsSocial/ChatUnread":    "358d359c02cbb595b6e2e7982c504e4618b8f683",
  "ChatsSocial/Dislike":       "30cf462391ab777765e81ed33e90b0b945f6d73a",
  "ChatsSocial/Facebook":      "e142d4451e71e6511e2894216e68302cc7f2972a",
  "ChatsSocial/Heart":         "2eff67a8e9c44208b91e113f5f65af83f50e772b",
  "ChatsSocial/Instagram":     "5e43e7f988e36ca464463a3313380d12c73f08c1",
  "ChatsSocial/Like":          "addb69a9844b0e51b1a0d92faa2044e0683bc064",
  "ChatsSocial/Odnoklassniki": "e337956f03cc63cb4c499613aa6ac0465b1d16bf",
  "ChatsSocial/Reply":         "48edf3939f0c12f8fb5fcd7d9882716c06ca112b",
  "ChatsSocial/Share":         "b1c4370cd0ee54506659c5428e6c15b6cf6bc15b",
  "ChatsSocial/Star":          "e4f509388125add4a55541cb32b21169329862f4",
  "ChatsSocial/Support":       "8431b39409143b11559ab9b8f54a324ba9985588",
  "ChatsSocial/Telegram":      "599c8167831f9211efbae1fe1aa6bbbbc3bef676",
  "ChatsSocial/TelegramIcon":  "cecc1da8d844b9a23a2f35c0140c2d6183a8b3a1",
  "ChatsSocial/Twitter":       "2f361470fa50609a76d3df49f462b8373c1dcbdf",
  "ChatsSocial/User":          "75285dc6d708f90c4e85da299288ff595f07a2e5",
  "ChatsSocial/UserPicture":   "d35cfe62d32e8a5ca5c8ec27265477551059d0d1",
  "ChatsSocial/Users":         "d89621909c5daa99728650f2a4898eeb5a4401cc",
  "ChatsSocial/UsersAdd":      "dd8dc433f3db12a6053473b0cc5928f34418001e",
  "ChatsSocial/Viber":         "1d85a0c6af7518cf1e028ed0ba4a0946a0268f25",
  "ChatsSocial/Vkontakte":     "5c027398ee2d64643d468572d17b7afa4fff21d0",
  "ChatsSocial/WhatsApp":      "534f7856d6b509d7faa901a974b8a4437e463c91",
  "ChatsSocial/Youtube":       "fa2649116cb5159490a3be91ae1455daf1316a08",

  // Geo
  "Geo/Bus":            "8d9f66aacc6c0cfe6c3f8b8d6d99ce6a4ed6c624",
  "Geo/Car":            "e2984886a4436d940d8bc074461e7bed89327cbf",
  "Geo/Compass":        "65310a23de5eabe9b6da661263c12396b8027567",
  "Geo/DrawAreaTool":   "36ab86668b71d8a27063a24be3f837a8e3e08671",
  "Geo/GeoTag":         "438d2c660807e0c0a16687416d117d61e5c213d9",
  "Geo/Language":       "b9d747362020aa9401c974911eeed51af1bc6b12",
  "Geo/Location":       "4731dfb1784bfa6b9950a7722c1d576eb5cce555",
  "Geo/LocationCircle": "ab57a2c202b444be4cb5c2ce441939f986f79dd3",
  "Geo/Map":            "9ddf1fba975c956df70c7e290474d7d8a26ef033",
  "Geo/Pharmacy":       "7b3817948ec001732805f6966599f7d636cc3bee",
  "Geo/Plane":          "74c40147f02a6c039891fe0523adbbe1e2e3f80d",
  "Geo/PolygonTool":    "392cf85f6af14f593c7b3bb2bbf61468cc3f469d",
  "Geo/RadiusTool":     "018cdf932a0bb1b392b26fcd08c9ddba7d0ab3b5",
  "Geo/Route":          "ac50f0f457af484b9ccf19f79f8f1db1e2c9b00b",
  "Geo/TargetLocation": "b09fefce252d4d5a7d200dcf81fd620a475299de",

  // Layout
  "Layout/Bullet":          "493283692e54f3d8f3ed4f41b3225873bfd9b552",
  "Layout/Columns":         "eeff0e1d080cb7966aa05790b11571d9a3d97c2c",
  "Layout/Component":       "5005e65c7bd9f38ebe525ada10ab9860d5d96186",
  "Layout/Feed":            "bfbc9556bd1abc0b97125ec3aa17f4b916df657b",
  "Layout/Gallery":         "25a7c0292c359c2dd7e6c7f34b1031037a72899d",
  "Layout/Grid":            "693486fbc4eb5c65db0f2f3ea2849f47e1b69a7a",
  "Layout/GridAdd":         "7685c45ddffbde9eb122d7816c418c86ed5f5191",
  "Layout/GridFrame":       "fb851e3ccf3c7914378c1a01f8411a4c92700535",
  "Layout/GridRemove":      "136996cbfb452d51b2045904c5986dc1fcb7aacd",
  "Layout/GridSmart":       "bb00528150211ec5b4e7c164144ad9613311caf1",
  "Layout/GridWindow":      "8d4c90dadd5fdfa2df5e8d4fd8fb6c14bc91e06e",
  "Layout/Hex":             "7e6696ee415e7de1b9c6fe9d5d00fa4b0a8c9194",
  "Layout/Inline":          "51cabd31f5c6e5bc7f438a2925be0043838ded6a",
  "Layout/List":            "f6a9e1a8ea76135af50be51d2e81b03533434801",
  "Layout/ListIndent":      "b047e6aeca889e4761981a3c33df11008dc15512",
  "Layout/ListNumbered":    "b15c987c1fb616f06d8dd6ef81e6049e84612f94",
  "Layout/ListUneven":      "197d6c0fc4b8c76219fd14b321e7b841affda0f1",
  "Layout/Paragraph":       "5d5cbe9085d0f62171b1d243d274bbfb9c19774d",
  "Layout/ParagraphCenter": "93f1163f4684fe168c6a3d5e67d5290e7e64aecf",
  "Layout/Plate":           "f84315f088725cd426df2d3453298e399db65735",
  "Layout/Reorder":         "230a659235bfba74ef89d8a380d98c0c93ff052c",
  "Layout/Rows":            "9616d3036c4035b4b9d0b346bb98b754758a3eff",
  "Layout/Sidebar":         "4b1bb6da28f55fccd2edea255c1db2621e841e27",
  "Layout/SidebarRight":    "e1f3b3815ca07a39a2619ee282706ebbef35e332",
  "Layout/Slider":          "15cb087b662b6625440b255f20263c0347a0f84e",
  "Layout/SliderEven":      "d43cb144c9397349328396349f13375968d5b2c5",
  "Layout/SliderUneven":    "e68fddd5c3868a57381116ae6016b3ca242ebcf7",
  "Layout/Stack":           "2a0ec675ff0106d298f70f2f4133d2ee208b3346",
  "Layout/StackChats":      "32f1301b68d9c4834de760b5539d0057e66c8813",
  "Layout/ViewFrame":       "181dfbf12dd3308d93d2b567d082ef1a30681df1",
  "Layout/ViewWindow":      "8b46ad49c8d5c5d1514a36aafa26db767c70373a",

  // Media
  "Media/Attach":               "1ec3ce26bb440cf7e6cea8b3d875866ddefdf10a",
  "Media/CalendarDate":         "ee508024e0a6abd131e31aa5a7704e1575f7d256",
  "Media/DocNewspaper":         "b35a5c18c91d80ff2be85323c87fa35c05cb9ab3",
  "Media/DocPost":              "fbd34dac430ee8e12227e389f4d09de8cc0e8f2a",
  "Media/DocSite":              "f2d8f8e70491ef0dacc6993abdd3cae020d79b62",
  "Media/Document":             "fa94407e75ce351722ee0ebaa96d5abda8b05ce2",
  "Media/DocumentInvalid":      "32daa70640d10445f7be51ec52e437818d28a6af",
  "Media/DocumentСrossedOut":   "a0138b7bd4f510b5f0098b69fa7108d8ec157c92",
  "Media/EmojiSmile":           "5f84a0ece9a2d0b798a072902f82349d5c3ee677",
  "Media/FileFormats":          "6fd8fdd81ebdf5a5d5d76b990923cdacb8963bf3",
  "Media/Folder":               "c3808305b0cf16d1483bda33c1372ca5560518bc",
  "Media/Image":                "87f182f9ff97e8c823a85e4175e7e46c958a17b7",
  "Media/Keyboard":             "a74760ad6c52c375fca13d977dce24e81cd9ca0f",
  "Media/Link":                 "28e20bd59a45e487e93236eb33059e9e175c03f1",
  "Media/Mail":                 "e883d101f1038b88a3438fca2c1e1133612eab01",
  "Media/MicOff":               "a17307ee811043e83891ab99c3d6b79121c3bfd0",
  "Media/MicOn":                "43e06b6ebd683fe3526189b741d1426491d58d62",
  "Media/Note":                 "1f837cbc56e98696911b2ae007bf362e6ef20d57",
  "Media/Photo":                "80d5e5c242772aa7b33e024a342f6b6f5c583fc8",
  "Media/Sticker":              "319a2483128973ab0300b406166ba58b58e3830f",
  "Media/Tag":                  "a966b8d1ffa785fd237b8416017855553d5bdb92",
  "Media/Tag2":                 "4dd06f9eab75d912513854562394f8182c6c68c1",
  "Media/Unlink":               "d52b5df819f2227c1828cf8cddb2d7c8a891821f",
  "Media/VideoCamera":          "bf9938bfdc61e88f2d178de49815cae74e1f7e4d",
  "Media/VideoTape":            "97ce7a0b82b83b38c11b35ce73cb10abe543670b",

  // Media Controls
  "Media Controls/Archive":      "c9a6549087ab572fa05d09ae07900c00e02ff387",
  "Media Controls/Backward":     "7e0a90c6d02a78af52653cbbf1c32cfd5d83709d",
  "Media Controls/Crop":         "ff0e685b3e1c22b157ea46183195ea879c73c923",
  "Media Controls/Forward":      "e5bc9abb9eac3853705b873cf42e659c95c9c019",
  "Media Controls/Next":         "dac31360b2899cc8540d53d828e285533c21b057",
  "Media Controls/Pause":        "721a0c8234fa9816fc2b3aae5c08ccc728ac0fd2",
  "Media Controls/PauseCircle":  "257483e1614476888aaaff62570851140c1e574b",
  "Media Controls/Play":         "cb8b817a5c700184544104369c04057ab89b6da4",
  "Media Controls/PlayCircle":   "175eae7f4387aba5c0c6dad68934ec9a5d94db77",
  "Media Controls/PlayOff":      "45b0462f5377bdd5023bb5b58548224974d92dba",
  "Media Controls/Previous":     "3b3160998642c35bc1cd83c55f4753ce9cd83e45",
  "Media Controls/Sound":        "d2a8dd769b63f70503836bd67939c24f15c18085",
  "Media Controls/SoundMax":     "c5282d52075fda30915d7114a23bc3cfe5023ee1",
  "Media Controls/SoundMute":    "73e8cf43d67a044d2208273bcfe042cdff196161",
  "Media Controls/SoundOff":     "d9c7162fadfa0fa8e78ca7d18ac8410c93097473",
  "Media Controls/Stop":         "b7db9bba78cb80673db0f58851c1d29f84b975e1",
  "Media Controls/Subtitles":    "82cf99de8dfdfdf09e724facc19f68057eba71b2",
  // Legacy aliases (without space) for backwards compatibility
  "MediaControls/Pause":         "721a0c8234fa9816fc2b3aae5c08ccc728ac0fd2",
  "MediaControls/Play":          "cb8b817a5c700184544104369c04057ab89b6da4",
  "MediaControls/Stop":          "b7db9bba78cb80673db0f58851c1d29f84b975e1",

  // Navigation
  "Navigation/ArchiveClosed":  "5d9b69e5a8f63908cc6cc7048c9be591b15d30da",
  "Navigation/ArchiveOpened":  "b5145caad8f069a815e8a23a28a7992ebc8d041e",
  "Navigation/BurgerMenu":     "aab577e72020dc5ddbf85da8e6497823a2e4ebeb",
  "Navigation/Cart":           "1996b26342c275a4043f14f42444a0ffc6401cc7",
  "Navigation/Configure":      "b0a2c698dd3d6e4286eb24d390f74e14b4e8255b",
  "Navigation/Experiments":    "7a0e2e17577201905c5014e88e1714287fead58a",
  "Navigation/Favorites":      "a7ae17c482aad4b8dfcbd33bc8c9cc84f994685b",
  "Navigation/FlippedSearch":  "b2adbb73ee2eae4e8b91a5b84c0bf125d2c8e9e3",
  "Navigation/History":        "a06de53b76e33de15a468343778bb6a3619d872d",
  "Navigation/HistoryBack":    "7840af9b504237d7f9a9c95396345745bb0c91d7",
  "Navigation/Home":           "7873ed983c5a5246ce423a1f505ee449a18813d2",
  "Navigation/HorizontalMenu": "5613c2e355d2b3a77c64f1c82fc356b47121d31f",
  "Navigation/Menu":           "50affeddd8b25bab00f3464b37ead625c5cd6e00",
  "Navigation/Review":         "919857421421eaa048c50afaf13cd9cb349328f5",
  "Navigation/Settings":       "720affbd7625eed97784d060ad4b04782ed726dd",
  "Navigation/ShoppingBag":    "a947c7312f63be97235eda32507cdf1d799de221",
  "Navigation/Statistics":     "4db03a992014ad2d45956f6869e63d974c9f4dbb",
  "Navigation/Trash":          "b6fbaf1c7d07e15c73be3aee2994008bb17683df",
  "Navigation/VerticalMenu":   "740f2f158fd0738ea369f617aaaeea3f960bd677",

  // Payment
  "Payment/Account":  "f103bcf7a5bb84fa66956bde5d479964458c7c41",
  "Payment/Apple":    "66920fe88f05bb4e7b77a091e9e30029250ce861",
  "Payment/Card":     "829f4ee859d4b64eda0c7c92e94a39c882ad0e9f",
  "Payment/Cashback": "73e8cca7f5051283e6712c8a4e74c270a5356870",
  "Payment/Google":   "31a26396499e55316c9f1d6d47a495a88cfe42e3",
  "Payment/Money":    "4e01adedd3674ac9f4ff010b07123a089a4fad8f",
  "Payment/SBP":      "cf9977d6c14cf1a5dc09be3b80e78847e86dd73e",
  "Payment/Wallet":   "2628b6b4dc82f76627ee3172eaace37a9fa03c8d",

  // Platform
  "Platform/Android":        "bb12f31fc67c5740a0dccbd61e1bb82a8b0fe38f",
  "Platform/AppFamily":      "356960bd9f9002ea727a6ff0199288e76e21936d",
  "Platform/AppStore":       "ff2ff4989dc35664536094d49da0c387f9dfa1ca",
  "Platform/Chrome":         "a7479ef4dc7adb3e77fc2f3197f680a419f9c69c",
  "Platform/DSP":            "26def0760ea12e492fbc7b8664a79eaf3e4abc06",
  "Platform/Desktop":        "d7af97f45c96a3b732f3a9cf4fd2d4aba5402a1f",
  "Platform/GooglePlay":     "073cedd762320fbf4b60651a091519b4f5ee6e74",
  "Platform/Ios":            "14729f355ca0b1b0a5e62b924563c5fa25c59b49",
  "Platform/Linux":          "deb5aefef67a627b3a97a23c7c9c854701c163ce",
  "Platform/Phone":          "dafa41894d098b6305c5b0ff94a6a351fc299da5",
  "Platform/Rustore":        "81ad7561ff07d118c4719fce3bb17ab196714e4a",
  "Platform/SSP":            "930d99871e46b2ac2dfaa9ee64f59d589b9d9b8b",
  "Platform/TabletOutlined": "639c7e4f710a9472a62af341bac8b5b51f34c434",
  "Platform/Windows":        "212a3117c8b5453d61748d86269cbf1d670c02b7",

  // Status
  "Status/Alert":            "497aff46ca8d7742d57d5f96413802cd61b95c9d",
  "Status/AlertColor":       "8fae57c2f5dbfb21cdf08b63c0d260955fa6b7ee",
  "Status/Block":            "931b746953a7956c65d1df3a2e40b13e6811b791",
  "Status/Checked":          "02af88538f192682d76ed78e0f487f3b827877ad",
  "Status/Cloud":            "a7d6c39ce2773184f4cf50b010c6ab480b161313",
  "Status/CloudUnavailable": "5cd570f8744abe15759894d5194b5af9d0fb83c9",
  "Status/Critical":         "2970a9e5147bee7a705771ce60a662592e6572d8",
  "Status/Error":            "26088730a0cfcf78ed7a1239125a192c422a5498",
  "Status/Finished":         "b63fffb1210be5881f3caf0cf96cd2adc5948e3d",
  "Status/Help":             "e8a4d90213b3d524ddbd113b92c5b5e537f5e83f",
  "Status/Info":             "ab898e7ff9519b4554bb27b2c425a562a0081168",
  "Status/Lightning":        "d12f552d21b4ba7ec0596e12fad1a6d035891fc1",
  "Status/OnFire":           "30d53fd042366200f845f50b954b7b7a5586da4d",
  "Status/Progress":         "2702c3f7252efba995b0fe0cf7d56ca59f9f0410",
  "Status/Protected":        "ffe48438abbd1465c613074522cee5e0d1c59062",
  "Status/Recomendation":    "086373180775a1fedfbbb5651c3baa4da8a73bb6",
  "Status/Unprotected":      "4a6d4a8f58ace63387df03bda7ebbd273905f672",

  // Unsorted
  "Unsorted/ADFOX":               "3e027465a35b2cbe9efc1fcef89996536d07bc46",
  "Unsorted/AMP":                 "5d1231757f930d834ab72574ed8622b5938f8aed",
  "Unsorted/AiAssistent":         "025a8b177fbb839072e7404ae2ee370f97b2b117",
  "Unsorted/Alice":               "82953d63566d116977fcdbd288a76cb36b3a0618",
  "Unsorted/ApiSettings":         "27d6dcdf9d9e1dfc7cdb35b66ee0da5265ea17f7",
  "Unsorted/Battery":             "29ce5fad46cedf7b46faa23a3714379f49bba8a7",
  "Unsorted/Benchmark":           "ab80626ccbcee225313a5820a41b0ea8b3e7ac1a",
  "Unsorted/Beta":                "cddc853d969b8b3aecd0c435828112deb4e684d1",
  "Unsorted/Bluetooth":           "a09ba63471c98966e6bdace6d131ee43c34d5215",
  "Unsorted/Bonuses":             "23d11819e6a400a2d52e157bc9e2bdb843b419c6",
  "Unsorted/Broadcast":           "c2b006b2b5efe921d1b0cf159ed9fcaec4a43912",
  "Unsorted/BxsCube":             "cdb82906e1479264a3005f6911872ebff895a89d",
  "Unsorted/Change":              "4f8a1e364e0ae3fd887dd8e88bc6c8cdd9f1c1c0",
  "Unsorted/Charts":              "16fb171a0f9c5a394579e0078f663417cdb9739e",
  "Unsorted/ColumnDiagramm":      "d88589f79c82fb203e3ebf74c266ebab9ded35eb",
  "Unsorted/Conditions":          "b3a5e77cbdc3539f081597e4b619eb4615b54839",
  "Unsorted/DataTable":           "58b2a1b8cb39cdae5e80558650195154ac4f6f52",
  "Unsorted/Disk":                "bbfb63671e7499392bb1e5dd84f0a5065fdeed27",
  "Unsorted/Education":           "2f59271bea30d936bd3ac96c8285665aa8e191fb",
  "Unsorted/Emoji":               "40762d3181074296a34fdf5e506a66f4de35b686",
  "Unsorted/EmojiOff":            "7e7f5144e7d757491e46e3c5afd42a8ca441bf05",
  "Unsorted/ExpImplemented":      "451b01f0005218642b9b7e479c5588b9df11820c",
  "Unsorted/Experiment":          "9b1de90967b0fec0990d9823d500c253560273e8",
  "Unsorted/Exposure":            "ae00f75dc41e0ff2d28821d3f3b3061aa062b52f",
  "Unsorted/Extension":           "f17e4aa960c430345553c0fddeaa372d797c1954",
  "Unsorted/Forecast":            "ac7a5fa8b23a80a740228d57d58eba3bed739086",
  "Unsorted/Gift":                "dcad2c7c5ced8bc15df96c67c7c9d1554859875e",
  "Unsorted/Globe":               "935308412a1b26321777c629ef51a8460495f884",
  "Unsorted/GroupLogic":          "10e862a212f4c138a7948e5008ddcf748e5164a9",
  "Unsorted/Incognito":           "5123cc8c07951f6f12c9e545fe190ba37a0cff4c",
  "Unsorted/Items":               "829f9557e3746919decf5f4e66294051026d9730",
  "Unsorted/Job":                 "f2d97b9adb9242d53bb42c4b3ae275db0bfaf71c",
  "Unsorted/KidsMode":            "9932d3d2037fc4b820da20125777fd7d91b4ac3c",
  "Unsorted/Landing":             "ae2fe10e4d60b27cc09983ef7fe520e314070d37",
  "Unsorted/Logic":               "2dc1b2bdb7c6526fcefd89dd4d29c40c759b8786",
  "Unsorted/Magic":               "335025c8f0694df13a713981bfea75bf226a038d",
  "Unsorted/Marriage":            "d1f663ab690493ef4fef4b232de8ebc57a6695ee",
  "Unsorted/Markup":              "aa640612cb789567d5a262c09738e0612e950ca3",
  "Unsorted/Mix":                 "474d2e539485b4ac3f5c79a93fa3d161f8b06049",
  "Unsorted/NDA":                 "c15fe639b241ed3b24763472c35316490fe556a7",
  "Unsorted/NeuroAds":            "ebaa8342c24b80c030a9b318878837e0bfcf7306",
  "Unsorted/NextPlaying":         "4cce6c2340b0492d9b0e7eb42a75575e90fcdd64",
  "Unsorted/Notificatioin":       "b698e25a5adad5fa2fa51cb8c65284376c037baf",
  "Unsorted/Number":              "8a426b1408672114356a317fdb9dd8859f9fde91",
  "Unsorted/Organization":        "1fee6a71421fbfeba7ca1f6558c43e275a17ccba",
  "Unsorted/Passwords":           "59e720fc198d40401f33275be1488733d6c76db3",
  "Unsorted/Passwords&Cards":     "1fd514bd5d341ceda9ace68006af97f2a60ce6db",
  "Unsorted/Pin":                 "64543fccef465ddddd85b3a4191dcd55e053dd80",
  "Unsorted/QR":                  "667daeabe707faf1849980a9dca88bc980c46348",
  "Unsorted/QRCodeScanner":       "4e1d4a977971b7064f357334ac1ca21aa7f78696",
  "Unsorted/Scanner":             "ae37903e4114f50857bc3a96fb0847e06aef76b0",
  "Unsorted/Segment":             "0e5f674cfb8797edd9dc2aa3321932dc573c850d",
  "Unsorted/Shortcut":            "41daedb67257d6b853bf60494dc86ea07f8d071b",
  "Unsorted/Signal":              "1e20b4877fe7ea481323820ff85d953fa6f6e3eb",
  "Unsorted/Split":               "2ff4e010e29caf1e8fc6cf06418170d8ebfaf8ca",
  "Unsorted/StationConnected":    "1e5af6ea7b7e57b954d34dd043ece9a10def70f4",
  "Unsorted/StationDisconnected": "c41add321da6f90f7e41d32dcbb8170eca714590",
  "Unsorted/Target":              "876e8b4a04e7ef58808e63ca697eedca23f5a7fb",
  "Unsorted/Tools":               "b5380ca135d1380ce01af995777315110c24050b",
  "Unsorted/Traffic":             "50d90722ad9015675bb1eb51b8e95e5853252535",
  "Unsorted/Translate":           "6f70a31c9e68a031b4235c5b6bbb6f20dd4eb98a",
  "Unsorted/Turbo":               "e3049074aa37328a2250b5a3d779803679caf8fc",
  "Unsorted/Varioqub":            "1b516c5fe3cdb36b87c75598382677265168cd54",
  "Unsorted/Yandex":              "1d745fdf3fe76e4edc9c7be47c1eed4aeb5d897e",
  "Unsorted/YandexBrowser":       "50884df96bc001bf5a5ac7ee9ee1a1ac1e0e0f31",
  "Unsorted/YandexEN":            "b81bce4321509d99a6f63fabbc4c28aceb303eab",
  "Unsorted/YandexGPT":           "fd0f924a6e5239761b2f206e4bab5577ee4034c8",
  "Unsorted/YNA":                 "24ba03696dd12aad4b5eb7f9c6b6c8e697b1cc02",
};

export function mapPropsToFigma(
  componentName: string,
  codeProps: Record<string, string | boolean>,
  figmaPropDefs: Record<string, { type: string; variantOptions?: string[] }>
): { figmaProps: Record<string, string | boolean>; warnings: string[] } {
  const mapping = COMPONENT_MAP[componentName];
  const figmaProps: Record<string, string | boolean> = {};
  const warnings: string[] = [];

  // Figma хранит ключи свойств с суффиксом #nodeId (например "Label#59171:12")
  // Некоторые пропы имеют emoji-префикс (например "💠 HorizontalLayout#..."))
  // Эта функция находит реальный ключ по базовому имени (без суффикса и emoji)
  function findPropKey(target: string): string | undefined {
    if (figmaPropDefs[target]) return target; // точное совпадение
    const targetNorm = target.toLowerCase().replace(/\s+/g, "");
    for (const key of Object.keys(figmaPropDefs)) {
      // Убираем: #nodeId суффикс, emoji и не-ASCII символы, пробелы
      const keyNorm = key
        .toLowerCase()
        .replace(/#[^#]*$/, "")                // strip #nodeId
        .replace(/[^\x00-\x7F]/g, "")          // strip emoji / non-ASCII
        .trim()
        .replace(/\s+/g, "");                   // strip spaces
      if (keyNorm === targetNorm) return key;
    }
    return undefined;
  }

  for (const [codeProp, codeValue] of Object.entries(codeProps)) {
    const alias = mapping?.propAliases?.[codeProp];
    let figmaPropName: string | undefined = alias ? findPropKey(alias) : undefined;
    if (!figmaPropName) {
      figmaPropName = findPropKey(codeProp);
    }
    if (!figmaPropName || !figmaPropDefs[figmaPropName]) continue;

    const propDef = figmaPropDefs[figmaPropName];

    // BOOLEAN prop: передаём boolean напрямую (Figma API не принимает строку "true")
    if (propDef.type === "BOOLEAN") {
      const strVal = String(codeValue);
      // Непустая строка (не "false"/"0") → считаем truthy (например caption="тестовый" → true)
      figmaProps[figmaPropName] = codeValue === true || (strVal !== "" && strVal !== "false" && strVal !== "0");
      continue;
    }

    const strValue = String(codeValue);
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const capitalizeParts = (s: string) => s.split("-").map(p => capitalize(p)).join("-");
    const candidates = [
      mapping?.valueAliases?.[codeProp]?.[strValue],
      strValue,
      capitalize(strValue),
      capitalizeParts(strValue),
      strValue.toUpperCase(),
    ].filter(Boolean) as string[];

    let figmaValue: string | undefined;
    for (const c of candidates) {
      if (!propDef.variantOptions || propDef.variantOptions.includes(c)) { figmaValue = c; break; }
    }
    // Prefix-match: Figma variant options may include specs like "m (44)" or "h2 (24-32)"
    if (figmaValue === undefined && propDef.variantOptions) {
      for (const c of candidates) {
        const match = propDef.variantOptions.find(opt => opt === c || opt.startsWith(c + " ") || opt.startsWith(c + "("));
        if (match) { figmaValue = match; break; }
      }
    }
    // Fallback для True/False VARIANT: непустое строковое значение → "True"
    if (figmaValue === undefined && propDef.variantOptions) {
      const hasTrue  = propDef.variantOptions.some(o => o.toLowerCase() === "true");
      const hasFalse = propDef.variantOptions.some(o => o.toLowerCase() === "false");
      if (hasTrue && hasFalse) {
        const isTruthy = strValue !== "" && strValue !== "false" && strValue !== "0";
        figmaValue = propDef.variantOptions.find(
          o => o.toLowerCase() === (isTruthy ? "true" : "false")
        )!;
      }
    }
    if (figmaValue === undefined) {
      warnings.push(`${componentName}.${codeProp}: "${strValue}" не найдено среди [${propDef.variantOptions?.join(", ")}]`);
      continue;
    }
    figmaProps[figmaPropName] = figmaValue;
  }
  return { figmaProps, warnings };
}
