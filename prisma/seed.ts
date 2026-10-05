/**
 * Seeds the catalogue with the live WooCommerce products from kmrc.com.np,
 * the service matrix from the Services page + footer, and a demo customer.
 *
 * Prices are in integer minor units (paisa): 210000 === NPR 2,100.
 *
 * The 8 products below are the real listings from kmrc.com.np —
 * genuine accessories plus professional-grade repair parts and tools.
 *
 * Run with:  npx prisma db seed
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

/**
 * A throwaway-strong password for local/demo seeding.
 *
 * Ambiguous characters are excluded so it survives being read off a screen
 * and retyped, and the length clears current guidance for a first-use secret.
 */
function generatePassword() {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(20);
  let out = "";
  for (let i = 0; i < 20; i++) out += alphabet[bytes[i]! % alphabet.length];
  return out;
}

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  }),
});

// ---------------------------------------------------------------------------

const categories = [
  {
    slug: "accessories",
    name: "Essential Accessories",
    tagline: "Genuine OEM protection and power",
    description:
      "Chargers, cases, cables and screen protection engineered to survive rigorous daily stress. No counterfeit stock, ever.",
    image: "/images/service-center/category-accessories.webp",
    accent: "#00DAF3",
    sortOrder: 1,
  },
  {
    slug: "repair-parts",
    name: "Repair Parts & Tools",
    tagline: "Professional-grade consumables",
    description:
      "Precision tooling and replacement parts for technicians and serious tinkerers. Everything calibrated before dispatch.",
    image: "/images/service-center/category-repair.webp",
    accent: "#B7C4FF",
    sortOrder: 2,
  },
];

// Prices in minor units (paisa).
const products = [
  // ---------------- Accessories (your real WooCommerce listings) -----------
  {
    slug: "65w-gan-fast-wall-charger",
    sku: "KMRC-ACC-1001",
    name: "65W GaN Fast Wall Charger",
    summary: "65W GaN charger with dual USB-C output — charges a laptop and a phone at once.",
    description:
      "A palm-sized 65W GaN charger that replaces the bulky brick most people carry. Gallium nitride keeps it cool and small while delivering 65W over two USB-C ports, so you can charge a laptop and your phone from the same wall unit.\n\nEvery unit is tested for output stability and thermal throttling before dispatch. Includes a braided 2m USB-C cable and comes with a 12-month replacement warranty.",
    price: 560000,
    compareAtPrice: 690000,
    stock: 24,
    brand: "GaN",
    category: "accessories",
    images: ["/images/products/gan-charger-65w.webp"],
    specs: {
      "Total Output": "65W",
      "Ports": "2 × USB-C",
      "Technology": "GaN (Gallium Nitride)",
      "Input": "100–240V AC, 50/60Hz",
      "Protocols": "PD 3.0 / QC 4.0 / PPS",
      "Cable": "2m braided USB-C included",
      "Warranty": "12 months",
    },
    warrantyMonths: 12,
    isFeatured: true,
    tags: ["charger", "gan", "usb-c", "fast-charging"],
  },
  {
    slug: "armorflex-magnetic-clear-phone-case",
    sku: "KMRC-ACC-1002",
    name: "ArmorFlex Magnetic Clear Phone Case",
    summary: "Shock-absorbing clear case with an embedded magnetic ring for accessory mounting.",
    description:
      "A clear case that stays clear — no yellowing plastic. The flexible TPU core absorbs drops while a rigid polycarbonate shell takes the impact, and the embedded N52 magnet ring snaps onto MagSafe-compatible chargers and car mounts.\n\nRaised bezels protect the camera and display from flat-surface contact.",
    price: 320000,
    compareAtPrice: 390000,
    stock: 40,
    brand: "ArmorFlex",
    category: "accessories",
    images: ["/images/products/magnetic-clear-case.webp"],
    specs: {
      Material: "TPU + Polycarbonate",
      "Magnet Strength": "N52 ring",
      "Drop Rating": "2.5m tested",
      Compatibility: "MagSafe / Qi2",
      "Warranty": "6 months",
    },
    warrantyMonths: 6,
    isFeatured: true,
    tags: ["case", "magsafe", "magnetic", "clear"],
  },
  {
    slug: "tempered-glass-screen-protector-2-pack",
    sku: "KMRC-ACC-1003",
    name: "Tempered Glass Screen Protector 2-Pack",
    summary: "9H hardness 9D glass — two protectors plus an install tray.",
    description:
      "Two full-coverage tempered glass protectors with 9H surface hardness. The oleophobic coating resists fingerprints and the edges are chamfered so they feel flush under the case.\n\nEach pack includes an alignment tray, dust remover and microfibre cloth. If you install it badly, we will re-fit it free of charge at the counter.",
    price: 210000,
    compareAtPrice: null,
    stock: 65,
    brand: "ArmorFlex",
    category: "accessories",
    images: ["/images/products/tempered-glass-2pack.webp"],
    specs: {
      Hardness: "9H",
      "Glass Type": "Tempered, 0.33mm",
      Coverage: "Full cover",
      Coating: "Oleophobic (anti-fingerprint)",
      Quantity: "2",
      Includes: "Alignment tray, cloth, dust remover",
    },
    warrantyMonths: 3,
    isFeatured: false,
    tags: ["screen-protector", "tempered-glass", "protection"],
  },
  {
    slug: "braided-usb-c-to-usb-c-cable-6ft",
    sku: "KMRC-ACC-1004",
    name: "Braided USB-C to USB-C Cable 6ft",
    summary: "6ft nylon-braided cable rated for 100W charging and 10Gbps data.",
    description:
      "A 6ft cable that survives daily abuse. The nylon braid resists fraying at the strain relief, and the internal e-marker chip negotiates 100W (20V/5A) so it is safe for laptops as well as phones.\n\nSupports USB 3.2 Gen 2 data transfer at 10Gbps, so you can move 4K video without waiting.",
    price: 240000,
    compareAtPrice: null,
    stock: 58,
    brand: "KMRC",
    category: "accessories",
    images: ["/images/products/usb-c-cable-6ft.webp"],
    specs: {
      Length: "6ft / 1.8m",
      "Max Power": "100W (20V/5A)",
      "Data Rate": "10Gbps (USB 3.2 Gen 2)",
      Jacket: "Nylon braided",
      Connector: "USB-C to USB-C",
    },
    warrantyMonths: 12,
    isFeatured: false,
    tags: ["cable", "usb-c", "fast-charge", "braided"],
  },
  {
    slug: "10-000mah-magnetic-wireless-power-bank",
    sku: "KMRC-ACC-1005",
    name: "10,000mAh Magnetic Wireless Power Bank",
    summary: "Snap-on 10,000mAh bank with 15W magnetic wireless and 22.5W wired output.",
    description:
      "A 10,000mAh power bank that attaches magnetically to the back of your phone, so you can top up without holding a cable. Charges wirelessly at 15W, or 22.5W through the USB-C port when you have a lead.\n\nThe status LED shows remaining charge in 25% increments, and the aluminium shell dissipates heat well enough to survive Nepal's afternoons.",
    price: 640000,
    compareAtPrice: 780000,
    stock: 18,
    brand: "KMRC",
    category: "accessories",
    images: ["/images/products/magnetic-power-bank.webp"],
    specs: {
      Capacity: "10,000mAh",
      "Wireless Output": "15W magnetic",
      "Wired Output": "22.5W USB-C",
      Battery: "Li-Po, A-grade cells",
      Indicator: "4-LED, 25% steps",
      "Warranty": "12 months",
    },
    warrantyMonths: 12,
    isFeatured: true,
    tags: ["power-bank", "wireless", "magsafe", "battery"],
  },
  {
    slug: "magdrive-universal-air-vent-car-mount",
    sku: "KMRC-ACC-1006",
    name: "MagDrive Universal Air Vent Car Mount",
    summary: "MagSafe-compatible vent mount with a ball joint and aluminium arm.",
    description:
      "Attaches to any horizontal air vent without adhesive. The N52 magnet ring holds your phone firmly over bumps while the ball joint lets you switch between portrait and landscape.\n\nThe arm is anodised aluminium rather than plastic, so it does not flex in the heat.",
    price: 350000,
    compareAtPrice: null,
    stock: 27,
    brand: "MagDrive",
    category: "accessories",
    images: ["/images/products/car-mount.webp"],
    specs: {
      "Magnet Strength": "N52",
      Mount: "Horizontal air vent",
      Arm: "Anodised aluminium",
      Joint: "360° ball joint",
      Compatibility: "MagSafe / Qi2",
    },
    warrantyMonths: 6,
    isFeatured: false,
    tags: ["car", "mount", "magsafe", "holder"],
  },

  // ---------------- Repair parts & tools (your real listings) --------------
  {
    slug: "precision-screen-replacement-kit",
    sku: "KMRC-RPR-2001",
    name: "Precision Screen Replacement Kit",
    summary: "62-piece repair kit with pre-cut adhesive, spudgers and ESD-safe tweezers.",
    description:
      "Everything needed to separate a display from a logic board without cracking a flex cable. The kit includes ESD-safe tweezers, four spudger profiles, guitar picks, a suction cup, opening picks, a B-7000 adhesive syringe and pre-cut waterproof edge seals.\n\nThe two precision screwdrivers are magnetised and the hollow shafts let you clear debris from screw wells as you work.",
    price: 480000,
    compareAtPrice: 590000,
    stock: 12,
    brand: "KMRC",
    category: "repair-parts",
    images: ["/images/products/screen-replacement-kit.webp"],
    specs: {
      Pieces: "62",
      Includes: "ESD tweezers, spudgers, picks, suction cup, B-7000, edge seals",
      Screwdrivers: "Magnetised, hollow shaft",
      "ESD Rating": "Compliant",
      Warranty: "6 months",
    },
    warrantyMonths: 6,
    isFeatured: true,
    tags: ["tools", "screen-repair", "precision", "kit"],
  },
  {
    slug: "62-in-1-precision-electronic-toolkit",
    sku: "KMRC-RPR-2002",
    name: "62-in-1 Precision Electronic Toolkit",
    summary: "62 precision bits in a magnetic case — the everyday repair companion.",
    description:
      "A general-purpose toolkit covering phones, laptops and small electronics. Bits are S2 steel, stored in a magnetic case so nothing goes missing mid-job.\n\nIncludes Torx, Phillips, Pentalobe, tri-point and offset blades, plus opening picks and a metal pry blade. Good enough for routine repair, not for board-level work.",
    price: 400000,
    compareAtPrice: null,
    stock: 31,
    brand: "KMRC",
    category: "repair-parts",
    images: ["/images/products/precision-toolkit.webp"],
    specs: {
      Pieces: "62",
      "Bit Material": "S2 steel",
      Storage: "Magnetic case",
      Includes: "Tri-point, Pentalobe, Torx, offset, opening picks",
    },
    warrantyMonths: 6,
    isFeatured: false,
    tags: ["tools", "kit", "precision", "electronics"],
  },
];

const services = [
  {
    slug: "screen-repair",
    name: "Screen Repair",
    eyebrow: "Visual Clarity",
    icon: "smartphone",
    summary:
      "Cracked display? We replace the assembly using quality parts and restore your screen to pristine condition.",
    description:
      "A shattered display is the most common fault we see, and also one of the most predictable to fix. Our technicians separate the broken assembly from the logic board without stressing the display flex, then laminate a new panel and re-seal the waterproof gasket.\n\nWe quote before we start. If we find additional damage once the device is open — a bent frame, a torn flex — we stop and call you with a revised price rather than continuing.",
    basePrice: 450000,
    turnaroundMinutes: 30,
    image: "/images/services/screen-repair.webp",
    features: [
      "OEM-grade OLED or LCD assembly",
      "Water-resistance gasket re-seal",
      "Touch and digitiser verification",
      "True-tone / colour calibration",
      "90-day component warranty",
    ],
    deviceSupport: [
      "Apple iPhone 8 → 16",
      "Samsung Galaxy S & A series",
      "Xiaomi / Redmi / Poco",
      "OnePlus & Realme",
      "Google Pixel",
    ],
    symptoms: [
      "Cracked or shattered glass",
      "Dead touch zones",
      "Display lines or dead pixels",
      "Backlight failure after a drop",
      "Touch works but display stays black",
    ],
    warrantyDays: 90,
    sortOrder: 1,
  },
  {
    slug: "battery-replacement",
    name: "Battery Replacement",
    eyebrow: "Power Solutions",
    icon: "battery-charging",
    summary:
      "Battery draining fast or swelling? We diagnose the power rail and fit a genuine cell with a 90-day warranty.",
    description:
      "Modern phones report battery health as a percentage, but a phone can still behave badly while claiming to be healthy — rapid drain, sudden shutdowns under load, or a back that has begun to bow.\n\nWe run a current-profile diagnostic to confirm the fault is the cell rather than the charging circuit or the power management IC, then fit a genuine replacement and recalibrate the fuel gauge so the new percentage reading is accurate.",
    basePrice: 280000,
    turnaroundMinutes: 20,
    image: "/images/services/battery-replacement.webp",
    features: [
      "Current-profile power diagnostics",
      "Genuine A-grade replacement cells",
      "Fuel-gauge recalibration",
      "Thermal-runaway safety check",
      "90-day component warranty",
    ],
    deviceSupport: [
      "Apple iPhone 6 → 16",
      "Samsung Galaxy S & A series",
      "Xiaomi / Redmi / Poco",
      "OnePlus & Realme",
      "Google Pixel",
    ],
    symptoms: [
      "Battery drains within hours",
      "Phone shuts down at 20–40%",
      "Back panel visibly bulging",
      "Device gets unusually hot while charging",
      "Charge jumps from low to full instantly",
    ],
    warrantyDays: 90,
    sortOrder: 2,
  },
  {
    slug: "charging-port-repair",
    name: "Charging Port Repair",
    eyebrow: "Stay Connected",
    icon: "plug",
    summary:
      "Trouble charging or connecting? We clean or re-solder the port so your device charges and transfers data reliably.",
    description:
      "Lint inside the charging port is the most common cause and the easiest to fix — a clean under magnification often restores full function in fifteen minutes. When the port itself is physically corroded or torn off the board, we desolder the connector and fit a new one.\n\nWe test both charge current and data lines afterwards, because a port can charge without transferring data and vice versa.",
    basePrice: 180000,
    turnaroundMinutes: 25,
    image: "/images/services/charging-port.webp",
    features: [
      "Ultrasonic port cleaning",
      "Corrosion treatment",
      "Port re-solder or full replacement",
      "Charge + data line verification",
      "90-day component warranty",
    ],
    deviceSupport: [
      "USB-C and Lightning devices",
      "Apple iPhone 5 → 16",
      "Samsung, Xiaomi, OnePlus",
      "Realme, Oppo, Vivo",
      "Accessories and docks",
    ],
    symptoms: [
      "Cable falls out or is loose",
      "Charges only at certain angles",
      "Charging but no data transfer",
      "Not recognised by a computer",
      "Visible corrosion or green residue",
    ],
    warrantyDays: 90,
    sortOrder: 3,
  },
  {
    slug: "motherboard-repair",
    name: "Motherboard Repair",
    eyebrow: "Logic Array",
    icon: "cpu",
    summary:
      "No power, no boot, or a short? Component-level board repair including BGA chip reballing and short tracing.",
    description:
      "This is the work that separates a technician from a parts-swapper. When a board will not power on, we trace the power rail from the battery connector through the charging IC and protection MOSFETs to find the shorted component.\n\nFor BGA failures — under-temperature solder joints that open as the board flexes — we remove the chip, clean and reball the pad, and reflow with a profiled temperature curve rather than a blanket heat gun.",
    basePrice: 550000,
    turnaroundMinutes: 120,
    image: "/images/service-center/micro-soldering.jpg",
    features: [
      "Power rail and short tracing",
      "BGA chip reballing & reflow",
      "Power management IC replacement",
      "NAND / eMMC read & repair",
      "90-day component warranty",
    ],
    deviceSupport: [
      "Apple iPhone 7 → 16",
      "Samsung Exynos & Snapdragon boards",
      "Xiaomi, OnePlus, Realme",
      "Huawei, Oppo, Vivo",
      "iPad & tablets",
    ],
    symptoms: [
      "No power at all",
      "Device gets hot without charging",
      "Stuck on Apple logo",
      "Bootloop with no storage detected",
      "Current draw far above normal",
    ],
    warrantyDays: 90,
    sortOrder: 4,
  },
  {
    slug: "water-damage-recovery",
    name: "Water Damage Recovery",
    eyebrow: "Liquid Ingress",
    icon: "droplets",
    summary:
      "Rice does nothing. We ultrasonically clean the board, remove corrosion and recover the device where most shops give up.",
    description:
      "Liquid damage is a race. Every minute a powered board sits in water, corrosion keeps advancing under the chip pads — which is why most recovery advice says to switch it off rather than charge it.\n\nWe disassemble, ultrasonically clean, remove corrosion with a controlled chemical bath, and then reassess under magnification. We will tell you honestly if the data is unrecoverable rather than taking the job and hoping.",
    basePrice: 400000,
    turnaroundMinutes: 90,
    image: "/images/service-center/hero-repair.jpg",
    features: [
      "Ultrasonic board cleaning",
      "Controlled corrosion removal",
      "Full component-level assessment",
      "Data extraction where possible",
      "No fee if recovery is impossible",
    ],
    deviceSupport: [
      "All smartphones",
      "Tablets",
      "Smartwatches",
      "Wireless earbuds",
      "Laptops (quote first)",
    ],
    symptoms: [
      "Device dead after water exposure",
      "Only some functions work",
      "Charging behaves erratically",
      "Speaker or microphone muffled",
      "Display flickering or dim",
    ],
    warrantyDays: 60,
    sortOrder: 5,
  },
  {
    slug: "software-diagnostics",
    name: "Software & OS Restore",
    eyebrow: "Logical Layer",
    icon: "terminal",
    summary:
      "Bootloops, stuck updates, and failed recoveries — full software diagnostics, data preserved where possible.",
    description:
      "Not every fault is hardware. A failed OTA update, a stuck bootloop, or a corrupted userdata partition can make a perfectly healthy board look dead.\n\nWe run a full software diagnostic first so we never charge you for a board repair when the real problem is a partition. Backups are taken before any erase, and we only wipe once you have approved it.",
    basePrice: 120000,
    turnaroundMinutes: 40,
    image: "/images/service-center/oscilloscope.jpg",
    features: [
      "Boot chain & log analysis",
      "DFU / recovery mode restore",
      "Firmware version alignment",
      "Battery calibration",
      "Data backup before any erase",
    ],
    deviceSupport: [
      "iOS (iPhone & iPad)",
      "Android (all OEMs)",
      "WearOS watches",
      "Firmware rollback",
      "Post-repair OS re-provisioning",
    ],
    symptoms: [
      "Stuck on a logo",
      "Repeated failed updates",
      "No storage / no files found",
      "Forced restart loop",
      "Battery percentage stuck",
    ],
    warrantyDays: 30,
    sortOrder: 6,
  },
];

const coupons = [
  { code: "KMRC10", kind: "PERCENT", value: 10, minOrderAmount: 300000, maxDiscount: 100000 },
  { code: "CONNECT5", kind: "FIXED", value: 50000, minOrderAmount: 200000, maxDiscount: null },
];

const reviewSeed = [
  { productSlug: "65w-gan-fast-wall-charger", authorName: "Aayush Shrestha", rating: 5, title: "Replaces three chargers", body: "Charges my laptop and phone from one brick and it stays cold. Genuinely the best ₹5,600 I have spent on a charger.", isVerifiedBuyer: true },
  { productSlug: "65w-gan-fast-wall-charger", authorName: "Prashant Tamang", rating: 4, title: "Solid, cable could be longer", body: "Output is stable and it does what it says. Only note is the included cable is a bit short for my desk.", isVerifiedBuyer: true },
  { productSlug: "armorflex-magnetic-clear-phone-case", authorName: "Nisha Maharjan", rating: 5, title: "Still clear after 4 months", body: "Every other clear case I have owned turned yellow within weeks. This one has not.", isVerifiedBuyer: true },
  { productSlug: "precision-screen-replacement-kit", authorName: "Raj Kumar Magar", rating: 5, title: "Proper repair kit", body: "The hollow-shaft screwdrivers are the detail that matters. Picked up a tip from KMRC and my lifts are faster.", isVerifiedBuyer: false },
  { productSlug: "10-000mah-magnetic-wireless-power-bank", authorName: "Sujata Rai", rating: 4, title: "Snaps on nicely", body: "Wireless charging is a little slower than the spec suggests but it holds the phone firmly and the 22.5W wired mode is quick.", isVerifiedBuyer: true },
  { productSlug: "tempered-glass-screen-protector-2-pack", authorName: "Bikash Shrestha", rating: 5, title: "They fitted it free", body: "Bought two, installed both myself, both perfect. The alignment tray actually works.", isVerifiedBuyer: true },
];

// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding KMRC catalogue…\n");

  // Idempotent: wipe transactional data but keep it safe to re-run.
  await prisma.adminAuditLog.deleteMany();
await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.service.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.address.deleteMany();
  await prisma.session.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.subscriber.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.user.deleteMany();

  // --- Categories ---
  const categoryBySlug = new Map<string, string>();
  for (const c of categories) {
    const created = await prisma.category.create({ data: c });
    categoryBySlug.set(created.slug, created.id);
    console.log(`  ✓ category ${created.slug}`);
  }

  // --- Products ---
  const productBySlug = new Map<string, string>();
  for (const p of products) {
    const { category, images, specs, tags, ...rest } = p;
    const categoryId = categoryBySlug.get(category);
    if (!categoryId) throw new Error(`Unknown category "${category}" for ${p.slug}`);

    const created = await prisma.product.create({
      data: {
        ...rest,
        categoryId,
        images: JSON.stringify(images),
        specs: JSON.stringify(specs),
        tags: JSON.stringify(tags),
      },
    });
    productBySlug.set(created.slug, created.id);
    console.log(`  ✓ product  ${created.slug}`);
  }

  // --- Services ---
  const serviceBySlug = new Map<string, string>();
  for (const s of services) {
    const { features, deviceSupport, symptoms, ...rest } = s;
    const created = await prisma.service.create({
      data: {
        ...rest,
        features: JSON.stringify(features),
        deviceSupport: JSON.stringify(deviceSupport),
        symptoms: JSON.stringify(symptoms),
      },
    });
    serviceBySlug.set(created.slug, created.id);
    console.log(`  ✓ service  ${created.slug}`);
  }

  // --- Coupons ---
  for (const c of coupons) {
    await prisma.coupon.create({ data: c });
    console.log(`  ✓ coupon  ${c.code}`);
  }

  // --- Reviews (recalculates the cached aggregates on Product) ---
  for (const r of reviewSeed) {
    const productId = productBySlug.get(r.productSlug);
    if (!productId) continue;
    const review = {
      authorName: r.authorName,
      rating: r.rating,
      title: r.title,
      body: r.body,
      isVerifiedBuyer: r.isVerifiedBuyer,
    };
    await prisma.review.create({ data: { ...review, productId } });
  }

  // Recompute rating aggregates from approved reviews.
  const grouped = await prisma.review.groupBy({
    by: ["productId"],
    where: { isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  for (const g of grouped) {
    await prisma.product.update({
      where: { id: g.productId },
      data: {
        rating: Math.round((g._avg.rating ?? 0) * 10) / 10,
        reviewCount: g._count._all,
      },
    });
  }
  console.log(`  ✓ reviews (${reviewSeed.length}) + rating aggregates`);

  // --- Demo customer ---
  await prisma.user.create({
    data: {
      name: "Demo Customer",
      email: "demo@kmrc.com.np",
      passwordHash: await bcrypt.hash("Demo@1234", 12),
      phone: "9841234567",
      emailVerified: new Date(),
      addresses: {
        create: {
          label: "Home",
          contactName: "Demo Customer",
          phone: "9841234567",
          line1: "Tripura Marg 44",
          line2: "Near the hardware shop",
          city: "Kathmandu",
          province: "Bagmati",
          postalCode: "44600",
          landmark: "Blue building, second floor",
          isDefault: true,
        },
      },
    },
  });
  console.log("  ✓ demo customer  demo@kmrc.com.np / Demo@1234");

  // --- Staff account ---
  // The password is never hardcoded here: a fixed one in the repo is a fixed
  // one in every clone of it. Set ADMIN_PASSWORD in .env to choose your own,
  // otherwise a strong one is generated and printed exactly once.
  const adminPassword = process.env.ADMIN_PASSWORD || generatePassword();
  await prisma.user.create({
    data: {
      name: "Store Admin",
      email: "admin@kmrc.com.np",
      passwordHash: await bcrypt.hash(adminPassword, 12),
      phone: "9841234567",
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });
  console.log("  ✓ admin  admin@kmrc.com.np");
  console.log(
    process.env.ADMIN_PASSWORD
      ? "       password taken from ADMIN_PASSWORD in your environment"
      : `       password: ${adminPassword}   (store this now — it is not saved in plain text)`,
  );

  const [productCount, serviceCount, categoryCount] = await Promise.all([
    prisma.product.count(),
    prisma.service.count(),
    prisma.category.count(),
  ]);

  console.log(
    `\nDone — ${categoryCount} categories, ${productCount} products, ${serviceCount} services.`,
  );
}

main()
  .catch((err) => {
    console.error("\nSeed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });