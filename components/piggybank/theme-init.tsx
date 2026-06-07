"use client"

import { useLayoutEffect } from "react"
import { usePathname } from "next/navigation"
import { applyChildTheme, applyParentTheme, isParentAppPath } from "@/lib/theme"

export function ThemeInit() {
  const pathname = usePathname()

  useLayoutEffect(() => {
    const root = document.documentElement
    if (isParentAppPath(pathname ?? "")) {
      root.classList.remove("theme-dark", "theme-light", "theme-candy", "dark")
      root.removeAttribute("data-theme")
      applyParentTheme()
    } else {
      applyChildTheme()
    }
  }, [pathname])

  return null
}
