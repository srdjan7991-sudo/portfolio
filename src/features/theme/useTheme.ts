import { useLayoutEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  )

  useLayoutEffect(() => {
    const root = document.documentElement
    if (root.dataset.theme === theme) return

    root.dataset.theme = theme
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const color = themeColor?.dataset[theme]
    if (themeColor && color) themeColor.content = color

    try {
      const key = root.dataset.themeStorage
      if (key) localStorage.setItem(key, theme)
    } catch {
      // Keep the in-page preference usable when storage is blocked.
    }
  }, [theme])

  return { theme, toggleTheme: () => setTheme(current => current === 'light' ? 'dark' : 'light') }
}
