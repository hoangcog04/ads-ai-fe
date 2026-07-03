"use client"

// This is a template provider for creating a new context
import * as React from "react"
import { Dispatch, SetStateAction } from "react"

interface TemplateContextType {
  state: any
  setState: Dispatch<SetStateAction<any>>
}
const TemplateContext = React.createContext<TemplateContextType | undefined>(
  undefined
)

function TemplateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<any>(null)
  const value = React.useMemo(() => ({ state, setState }), [state])

  return (
    <TemplateContext.Provider value={value}>
      {children}
    </TemplateContext.Provider>
  )
}

function useTemplate() {
  const context = React.useContext(TemplateContext)
  if (!context) {
    throw new Error(`useTemplate must be used within a TemplateProvider`)
  }

  const { setState } = context
  const increment = () => {
    setState((prev: any) => prev + 1)
  }

  return { increment }
}

export { TemplateProvider, useTemplate }
