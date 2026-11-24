import { createContext, useContext, useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { en } from './en'
import type { Messages } from './en'
import { sr } from './sr'

export type Language = 'en' | 'sr'
const defaultLanguage: Language = 'en'
export const languageStorageKey = 'portfolio-language'
const messages: Record<Language, Messages> = { en, sr }

type LanguageContext = { language: Language; text: Messages; setLanguage: (language: Language) => void }
const Context = createContext<LanguageContext>({ language: defaultLanguage, text: en, setLanguage: () => {} })

function readLanguage(): Language {
  try {
    const saved = localStorage.getItem(languageStorageKey)
    if (saved === 'en' || saved === 'sr') return saved
  } catch {
    // The language switch still works when storage is unavailable.
  }
  return defaultLanguage
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, changeLanguage] = useState(readLanguage)
  const text = messages[language]

  useLayoutEffect(() => {
    document.documentElement.lang = language
    document.title = text.metadata.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', text.metadata.description)
  }, [language, text])

  function setLanguage(next: Language) {
    try { localStorage.setItem(languageStorageKey, next) }
    catch { /* Keep the selection for this page even if it cannot be saved. */ }
    changeLanguage(next)
  }

  return <Context.Provider value={{ language, text, setLanguage }}>{children}</Context.Provider>
}

export function useLanguage() {
  return useContext(Context)
}
