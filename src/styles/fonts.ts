import localFont from "next/font/local";

export const plusJakartaSans = localFont({
  src: "./fonts/plusjakartasans.woff2",
  variable: "--font-plus-jakarta-sans",
  weight: "600 800",
  display: "swap",
});

export const dmSans = localFont({
  src: "./fonts/dmsans.woff2",
  variable: "--font-dm-sans",
  weight: "400 700",
  display: "swap",
});

export const caveat = localFont({
  src: "./fonts/caveat.woff2",
  variable: "--font-caveat",
  weight: "400 700",
  display: "swap",
  preload: false,
});
