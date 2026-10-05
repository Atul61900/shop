/**
 * Single source of truth for all business / brand configuration.
 * Anything the shop owner is likely to change lives here.
 */

export const siteConfig = {
  name: "Krishna Mobile Repairing Center",
  shortName: "KMRC",
  centerName: "KMRC Service Center",
  tagline: "Stay Connected, Stay Protected.",
  description:
    "Precision mobile repair, genuine accessories and repair tools in Kathmandu. Fast turnaround, authentic parts, 90-day component warranty.",

  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  contact: {
    email: "eastlinknp@gmail.com",
    phone: "+9779849821879",
    phoneDisplay: "(+977) 984-9821879",
    whatsapp: "https://wa.me/9779849821879",
  },

  address: {
    line1: "Tripura Marg, Tripureshwor-11",
    line2: "Kathmandu 44600, Bagmati Province",
    country: "Nepal",
    // Exact pin: Krishna Mobile Repairing Center, 27.692791, 85.315253
    geo: { lat: 27.692791, lng: 85.315253 },
    mapQuery: "Krishna Mobile Repairing Center, Tripureshwor, Kathmandu",
  },

  hours: [
    { days: "Monday – Friday", time: "9:00 AM – 7:00 PM" },
    { days: "Saturday", time: "9:00 AM – 7:00 PM" },
    { days: "Sunday", time: "Closed (emergency calls only)" },
  ],

  socials: [
    { label: "Facebook", href: "https://www.facebook.com/www.kmrc.com.np/" },
    { label: "Instagram", href: "https://instagram.com" },
    { label: "TikTok", href: "https://tiktok.com" },
    { label: "WhatsApp", href: "https://wa.me/9779849821879" },
  ],

  /**
   * Currency. Stored amounts are integer minor units (paisa) so that
   * arithmetic never suffers from floating point drift.
   */
  currency: {
    code: (process.env.NEXT_PUBLIC_CURRENCY ?? "NPR") as "NPR" | "USD" | "NPR ",
    locale: process.env.NEXT_PUBLIC_LOCALE ?? "en-NP",
  },

  /** Flat delivery fee in minor units, waived above the free-shipping threshold. */
  shipping: {
    fee: 15000, // NPR 150
    freeThreshold: 500000, // NPR 5,000
    insideRingRoadFee: 10000, // NPR 100
  },

  /** Commission / trust signals shown across the UI. */
  trust: {
    yearsInBusiness: "5+",
    devicesRepaired: "1000+",
    turnaround: "Fast",
    firstTimeFix: "99.4%",
    turnaroundMinutes: 45,
    warrantyDays: 90,
  },

  testimonials: [
    {
      quote:
        "KMRC has brought engineering depth and analytical capability that genuinely transformed our commercial fleet’s mobile reliability. Their work has been central to keeping our Kathmandu team fully operational.",
      author: "EastLink Logistics Team",
      role: "Fleet Operations • Tripureshwor",
    },
    {
      quote:
        "Dropped my phone at 10am and collected it at 11 with a new screen. The diagnostic report they handed over explained exactly what failed and why. Nothing was oversold.",
      author: "Sneha Rai",
      role: "Customer • Kathmandu",
    },
    {
      quote:
        "I have bought chargers and cases here half a dozen times now. Always genuine, always the same price shown at the counter. That consistency is rare.",
      author: "Bikash Shrestha",
      role: "Customer • Lalitpur",
    },
  ],
} as const;

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const FOOTER_SERVICE_LINKS = [
  { href: "/services/screen-repair", label: "Optical Display Alignment", index: "01" },
  { href: "/services/battery-replacement", label: "Power Management IC", index: "02" },
  { href: "/services/charging-port-repair", label: "Charging Port Soldering", index: "03" },
  { href: "/services/motherboard-repair", label: "Micro-BGA Reballing", index: "04" },
  { href: "/services/water-damage-recovery", label: "Liquid Ingress Recovery", index: "05" },
  { href: "/services/software-diagnostics", label: "Software & OS Restore", index: "06" },
] as const;

export const FOOTER_COMPANY_LINKS = [
  { href: "/about", label: "Our Service Center" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
] as const;

export const FOOTER_LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
] as const;

/** Nepali provinces, used by checkout + address forms. */
export const NEPAL_PROVINCES = [
  "Bagmati",
  "Madhesh",
  "Koshi",
  "Madhesh",
  "Lumbini",
  "Karnali",
  "Sudurpashchim",
] as const;