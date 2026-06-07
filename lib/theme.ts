export type AppTheme = "light"

export const APP_THEME: AppTheme = "light"

export const CHILD_THEME_STORAGE_KEY = "piggy-child-theme"
export const PARENT_THEME_STORAGE_KEY = "piggy-parent-theme"
/** @deprecated use child/parent keys */
export const THEME_STORAGE_KEY = "piggy-theme"
export const CARD_COLOR_STORAGE_KEY = "piggy-card-color"

export const CARD_GRADIENT_PRESETS: Array<{
  id: string
  label: string
  style: string
}> = [
  {
    id: "pink-purple",
    label: "Pink Purple",
    style: "linear-gradient(135deg, oklch(0.7 0.25 340) 0%, oklch(0.55 0.25 290) 100%)",
  },
  {
    id: "blue-cyan",
    label: "Blue Cyan",
    style: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
  },
  {
    id: "emerald-teal",
    label: "Emerald Teal",
    style: "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)",
  },
  {
    id: "orange-rose",
    label: "Orange Rose",
    style: "linear-gradient(135deg, #f97316 0%, #f43f5e 100%)",
  },
  {
    id: "indigo-violet",
    label: "Indigo Violet",
    style: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
  },
  {
    id: "yellow-orange",
    label: "Yellow Orange",
    style: "linear-gradient(135deg, #eab308 0%, #f97316 100%)",
  },
]

export function getCardGradientStyle(presetId: string): string {
  return (
    CARD_GRADIENT_PRESETS.find((p) => p.id === presetId)?.style ??
    CARD_GRADIENT_PRESETS[0].style
  )
}

export function loadStoredCardColor(): string {
  if (typeof window === "undefined") return CARD_GRADIENT_PRESETS[0].id
  return localStorage.getItem(CARD_COLOR_STORAGE_KEY) ?? CARD_GRADIENT_PRESETS[0].id
}

export function loadChildTheme(): AppTheme {
  return APP_THEME
}

export function loadParentTheme(): AppTheme {
  return APP_THEME
}

/** @deprecated use loadChildTheme */
export function loadStoredTheme(): AppTheme {
  return APP_THEME
}

const THEME_CLASSES = ["theme-dark", "theme-light", "theme-candy", "dark"] as const

function applyLightThemeClasses(el: HTMLElement) {
  el.classList.remove(...THEME_CLASSES)
  el.classList.add("theme-light")
  el.setAttribute("data-theme", "light")
}

function clearStoredThemes() {
  if (typeof window === "undefined") return
  localStorage.removeItem(CHILD_THEME_STORAGE_KEY)
  localStorage.removeItem(PARENT_THEME_STORAGE_KEY)
  localStorage.removeItem(THEME_STORAGE_KEY)
}

/** Child app — theme on <html> */
export function applyChildTheme(_theme: AppTheme = APP_THEME) {
  if (typeof document === "undefined") return
  applyLightThemeClasses(document.documentElement)
  clearStoredThemes()
}

/** Parent app — theme on .parent-dashboard wrapper */
export function applyParentTheme(_theme: AppTheme = APP_THEME) {
  if (typeof document === "undefined") return
  const el = document.querySelector(".parent-dashboard")
  if (el instanceof HTMLElement) {
    applyLightThemeClasses(el)
  }
  const root = document.documentElement
  root.classList.remove(...THEME_CLASSES)
  root.removeAttribute("data-theme")
  clearStoredThemes()
}

/** @deprecated use applyChildTheme */
export function applyTheme(_theme: AppTheme = APP_THEME) {
  applyChildTheme()
}

export function isParentAppPath(pathname: string): boolean {
  return pathname.startsWith("/parent")
}

/** Runs synchronously in <head> before paint — always light. */
export const THEME_BOOT_SCRIPT = `(function(){try{var r=document.documentElement;r.classList.remove("theme-dark","theme-light","theme-candy","dark");r.classList.add("theme-light");r.setAttribute("data-theme","light");try{localStorage.removeItem("piggy-child-theme");localStorage.removeItem("piggy-parent-theme");localStorage.removeItem("piggy-theme");}catch(e){}}catch(e){}})();`

/** @deprecated use THEME_BOOT_SCRIPT */
export const CHILD_THEME_BOOT_SCRIPT = THEME_BOOT_SCRIPT
