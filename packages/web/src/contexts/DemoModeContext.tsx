import { createContext, useContext, useState, ReactNode } from 'react'

interface DemoModeContextType {
  isDemoMode: boolean
  toggleDemoMode: () => void
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined)

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    const stored = localStorage.getItem('demo_mode')
    return stored !== null ? stored === 'true' : true
  })

  const toggleDemoMode = () => {
    setIsDemoMode((prev: boolean) => {
      const newValue = !prev
      localStorage.setItem('demo_mode', String(newValue))
      return newValue
    })
  }

  return (
    <DemoModeContext.Provider value={{ isDemoMode, toggleDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  )
}

export function useDemoMode() {
  const context = useContext(DemoModeContext)
  if (!context) {
    throw new Error('useDemoMode must be used within DemoModeProvider')
  }
  return context
}
