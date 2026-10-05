import { Inter, Space_Grotesk } from "next/font/google";

/**
 * Both are variable fonts, so no `weight` array is needed.
 * The CSS variables are consumed by the `--font-*` tokens in globals.css.
 */

export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});