// Storefront presentation metadata for SnapGear Camera Store.
// Authoritative product_id, name, price, supplier_id, and live stock ALWAYS come from SQLite.

export const PRODUCT_META_BY_ID = {
  1: {
    sku: "SG-SNY-FZ100",
    category: "Power & Batteries",
    tagline: "High-Capacity InfoLITHIUM Z-Series Power Pack",
    shortDesc:
      "Genuine high-capacity 2280mAh lithium-ion battery engineered for Sony Alpha full-frame and APS-C mirrorless cameras.",
    fullDesc:
      "Power extended shoots without interruption. The Sony NP-FZ100 delivers approximately 2.2x the capacity of legacy W-series cells and supports Sony InfoLITHIUM percentage readout directly on your camera LCD so you always know exact remaining charge.",
    specs: [
      { label: "Capacity", value: "2280 mAh / 16.4 Wh (7.2V)" },
      { label: "Compatibility", value: "Sony a7 III / IV, a7R IV / V, a7S III, a7C II, a6700, FX3, FX30, ZV-E1" },
      { label: "Weight", value: "83 g" },
      { label: "Reference Listing", value: "Sony Taiwan Store (NT$1,980)" }
    ],
    warranty: "1-Year Authorized Taiwan Distributor Warranty",
    image: "/images/product-1-battery.jpg",
    spriteKind: "battery",
    accentColor: "#3868c8",
    badge: "BEST SELLER"
  },
  2: {
    sku: "SG-SNY-BCQZ1",
    category: "Power & Batteries",
    tagline: "Dedicated Rapid AC Charger for NP-FZ100",
    shortDesc:
      "Official Sony quick charger that restores a depleted NP-FZ100 battery to 100% in ~150 minutes with LED status indicator.",
    fullDesc:
      "Keep your camera body free while charging spare packs at full speed. The Sony BC-QZ1 features a slim universal 100-240V AC design for international travel shoots and a crisp 3-stage LED charge indicator so you can verify readiness at a glance.",
    specs: [
      { label: "Full Charge Time", value: "Approx. 150 minutes (40% faster than USB)" },
      { label: "Input Voltage", value: "100–240V AC, 50/60Hz (Worldwide)" },
      { label: "Compatible Cell", value: "Sony NP-FZ100 Z-Series Battery" },
      { label: "Reference Listing", value: "Sony Taiwan Store / CameraKing (NT$2,480)" }
    ],
    warranty: "1-Year Authorized Taiwan Distributor Warranty",
    image: "/images/product-2-charger.jpg",
    spriteKind: "charger",
    accentColor: "#2d8a68",
    badge: "RAPID CHARGE"
  },
  3: {
    sku: "SG-SND-128PRO",
    category: "Memory & Storage",
    tagline: "Extreme PRO SDXC UHS-I V30 — 4K UHD Ready",
    shortDesc:
      "High-speed 128GB SDXC memory card built for continuous RAW bursts and smooth 4K UHD video recording without dropped frames.",
    fullDesc:
      "Engineered for demanding creators, the SanDisk Extreme PRO 128GB SDXC UHS-I card pairs up to 200 MB/s read transfers with U3 / V30 sustained write reliability. Temperature-proof, waterproof, shock-proof, and X-ray-proof for field work.",
    specs: [
      { label: "Capacity", value: "128 GB SDXC UHS-I" },
      { label: "Speed Class", value: "U3 / V30 / Class 10 (Up to 200 MB/s Read, 90 MB/s Write)" },
      { label: "Durability", value: "Waterproof, Temperature-proof, Shock-proof, X-Ray-proof" },
      { label: "Reference Listing", value: "CameraKing / CameraPro (NT$1,550)" }
    ],
    warranty: "Lifetime Limited Manufacturer Warranty",
    image: "/images/product-3-sdcard.jpg",
    spriteKind: "sdcard",
    accentColor: "#c84038",
    badge: "4K V30 PRO"
  },
  4: {
    sku: "SG-MNF-PIXI",
    category: "Tripods & Support",
    tagline: "Compact Italian Tabletop Mini Tripod",
    shortDesc:
      "Lightweight 190g desktop mini tripod with push-button locking ball head for vlogging, tabletop macro, and steady low-angle shots.",
    fullDesc:
      "Designed in Italy with Adapto technopolymer and stainless steel hardware, the Manfrotto PIXI folds neatly into an ergonomic handheld grip and opens into a rock-solid tabletop tripod. Press the signature red button to frame effortlessly, release to lock instantly.",
    specs: [
      { label: "Max Payload", value: "1.0 kg (Mirrorless, Compact & Action Cams)" },
      { label: "Weight / Closed Length", value: "190 g / 18.5 cm" },
      { label: "Mount Thread", value: "Universal 1/4\"-20 Stainless Steel Screw" },
      { label: "Reference Listing", value: "IPIX Camera / CameraPro (NT$990)" }
    ],
    warranty: "2-Year Official Distributor Warranty",
    image: "/images/product-4-tripod.svg",
    spriteKind: "tripod",
    accentColor: "#d86030",
    badge: "CREATOR PICK"
  },
  5: {
    sku: "SG-SNY-VPT2BT",
    category: "Grips & Rigging",
    tagline: "Wireless Bluetooth Shooting Grip & Mini Tripod",
    shortDesc:
      "Cable-free Bluetooth shutter/record/zoom shooting grip that converts into a stable mini tripod with instant 180° flip for vlogging.",
    fullDesc:
      "Shoot one-handed stills and smooth vlogs with zero cables cluttering your camera ports. The dust- and moisture-resistant Sony GP-VPT2BT pairs directly via Bluetooth to compatible Sony cameras, putting photo shutter, movie record, C1 custom function, and zoom controls right under your thumb.",
    specs: [
      { label: "Connectivity", value: "Wireless Bluetooth (No Cable Required)" },
      { label: "Controls", value: "Photo Shutter, Movie Rec, Zoom Rocker, C1 Custom, Lock Switch" },
      { label: "Load Capacity / Weight", value: "1.5 kg max payload / 215 g" },
      { label: "Reference Listing", value: "Sony Taiwan Store (NT$3,980)" }
    ],
    warranty: "1-Year Authorized Taiwan Distributor Warranty",
    image: "/images/product-5-grip.jpg",
    spriteKind: "grip",
    accentColor: "#6858b8",
    badge: "FLAGSHIP"
  }
};

export const STORE_SERVICES = [
  {
    id: "warranty",
    icon: "🛡",
    title: "Authorized Taiwan Retail Stock",
    desc: "All camera batteries, chargers, memory cards, and grips are sourced through verified Sony & Photo Gear distributors with official local warranty."
  },
  {
    id: "consultation",
    icon: "📷",
    title: "Free Gear Compatibility Check",
    desc: "Unsure whether a battery, grip, or SD card fits your camera body? Ask our SnapGear Mart clerk or check live spec sheets before checkout."
  },
  {
    id: "delivery",
    icon: "📦",
    title: "Direct-to-Consumer Express Dispatch",
    desc: "Real-time SQLite inventory verification on every order. Same-day Taipei dispatch and complimentary shipping on orders NT$3,000+."
  },
  {
    id: "refund",
    icon: "↩",
    title: "7-Day Hassle-Free Returns & Refunds",
    desc: "Instant order refund workflow directly synchronized with our SQLite orders ('F') and stock_changes ledger so inventory stays 100% accurate."
  }
];

export function resolveProductMeta(product) {
  const byId = PRODUCT_META_BY_ID[Number(product.product_id)];
  if (byId) return byId;

  const lower = String(product.name || "").toLowerCase();
  if (lower.includes("smallrig") || lower.includes("handle")) {
    return {
      sku: `SG-RIG-${product.product_id}`,
      category: "Grips & Rigging",
      tagline: "Ergonomic Camera Cage Side Handle",
      shortDesc:
        "Precision-machined camera side handle offering secure handheld ergonomics, cold-shoe mounting, and rapid left/right adjustment.",
      fullDesc:
        "Built for mirrorless cinema rigs and handheld video production, this SmallRig side handle improves camera balance while keeping accessory mounting points right at your fingertips.",
      specs: [
        { label: "Category", value: "Camera Rigging & Ergonomic Handle" },
        { label: "Mount", value: "NATO / Dual 1/4\"-20 Cage Mount" },
        { label: "Source", value: "Added via SnapGear SQLite Database" }
      ],
      warranty: "1-Year SnapGear Store Warranty",
      image: "/images/product-generic.svg",
      spriteKind: "handle",
      accentColor: "#487098",
      badge: "NEW IN SQL"
    };
  }
  if (lower.includes("battery") || lower.includes("power")) {
    return {
      sku: `SG-PWR-${product.product_id}`,
      category: "Power & Batteries",
      tagline: "Camera Power Accessory",
      shortDesc: "Reliable camera power accessory synchronized directly from SnapGear's SQLite catalog.",
      fullDesc: "Live catalog item fetched directly from the SnapGear SQLite products table with real-time stock_changes tracking.",
      specs: [{ label: "Source", value: "Live SQLite products table" }],
      warranty: "1-Year SnapGear Store Warranty",
      image: "/images/product-1-battery.jpg",
      spriteKind: "battery",
      accentColor: "#3868c8",
      badge: "NEW IN SQL"
    };
  }
  if (lower.includes("charger")) {
    return {
      sku: `SG-CHG-${product.product_id}`,
      category: "Power & Batteries",
      tagline: "Camera Battery Charger",
      shortDesc: "Dedicated camera battery charger synchronized directly from SnapGear's SQLite catalog.",
      fullDesc: "Live catalog item fetched directly from the SnapGear SQLite products table with real-time stock_changes tracking.",
      specs: [{ label: "Source", value: "Live SQLite products table" }],
      warranty: "1-Year SnapGear Store Warranty",
      image: "/images/product-2-charger.jpg",
      spriteKind: "charger",
      accentColor: "#2d8a68",
      badge: "NEW IN SQL"
    };
  }
  if (lower.includes("sd") || lower.includes("card") || lower.includes("memory")) {
    return {
      sku: `SG-MEM-${product.product_id}`,
      category: "Memory & Storage",
      tagline: "High-Speed Camera Memory Storage",
      shortDesc: "Camera storage media synchronized directly from SnapGear's SQLite catalog.",
      fullDesc: "Live catalog item fetched directly from the SnapGear SQLite products table with real-time stock_changes tracking.",
      specs: [{ label: "Source", value: "Live SQLite products table" }],
      warranty: "Manufacturer Limited Warranty",
      image: "/images/product-3-sdcard.jpg",
      spriteKind: "sdcard",
      accentColor: "#c84038",
      badge: "NEW IN SQL"
    };
  }
  if (lower.includes("tripod")) {
    return {
      sku: `SG-TRP-${product.product_id}`,
      category: "Tripods & Support",
      tagline: "Camera Stabilization Support",
      shortDesc: "Compact camera tripod synchronized directly from SnapGear's SQLite catalog.",
      fullDesc: "Live catalog item fetched directly from the SnapGear SQLite products table with real-time stock_changes tracking.",
      specs: [{ label: "Source", value: "Live SQLite products table" }],
      warranty: "1-Year SnapGear Store Warranty",
      image: "/images/product-4-tripod.svg",
      spriteKind: "tripod",
      accentColor: "#d86030",
      badge: "NEW IN SQL"
    };
  }
  return {
    sku: `SG-GEAR-${product.product_id}`,
    category: "Photography Equipment",
    tagline: "SnapGear Camera Accessory",
    shortDesc: `${product.name} — camera accessory managed live in the SnapGear SQLite inventory database.`,
    fullDesc: `${product.name} is dynamically synchronized from SnapGear's SQLite products table. Edit pricing, supplier links, or stock levels anytime in the SQL Admin Panel.`,
    specs: [
      { label: "Database ID", value: `#${product.product_id}` },
      { label: "Currency", value: "New Taiwan Dollar (NTD)" },
      { label: "Inventory Tracking", value: "Live SQLite stock_changes Ledger" }
    ],
    warranty: "1-Year SnapGear Store Warranty",
    image: "/images/product-generic.svg",
    spriteKind: "handle",
    accentColor: "#506078",
    badge: "SQL LIVE"
  };
}
