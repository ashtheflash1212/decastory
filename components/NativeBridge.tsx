"use client";

import { useEffect } from "react";

// When the site is loaded inside the Capacitor iOS shell, the native
// runtime injects `window.Capacitor` into the page. This component is
// a no-op in normal browsers and lights up native behavior in the app:
//   - marks <html> with .native-app so CSS can respect safe areas
//   - styles the iOS status bar to match the parchment theme
//   - fires light haptic feedback whenever the player taps a button
//     (choice cards, powerups, nav) for a native feel.

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: {
        StatusBar?: { setStyle?: (opts: { style: string }) => Promise<void> };
        Haptics?: { impact?: (opts: { style: string }) => Promise<void> };
      };
    };
  }
}

export default function NativeBridge() {
  useEffect(() => {
    const cap = window.Capacitor;
    if (!cap?.isNativePlatform?.()) return;

    document.documentElement.classList.add("native-app");

    // Dark text on the light parchment background
    cap.Plugins?.StatusBar?.setStyle?.({ style: "LIGHT" }).catch(() => {});

    const onTap = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a")) {
        cap.Plugins?.Haptics?.impact?.({ style: "LIGHT" }).catch(() => {});
      }
    };
    document.addEventListener("click", onTap, { capture: true, passive: true });
    return () => document.removeEventListener("click", onTap, { capture: true });
  }, []);

  return null;
}
