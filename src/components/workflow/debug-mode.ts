'use client'

import { useEffect, useState } from 'react'

const DEBUG_MODE_KEY = 'workflow_debug_mode'

export function useDebugMode() {
  const [debugMode, setDebugMode] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      setDebugMode(window.localStorage.getItem(DEBUG_MODE_KEY) === 'true')
    } catch {
      setDebugMode(false)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    try {
      window.localStorage.setItem(DEBUG_MODE_KEY, String(debugMode))
    } catch {
      // no-op when localStorage is unavailable
    }
  }, [debugMode, hydrated])

  function updateDebugMode(next: boolean) {
    setDebugMode(next)
  }

  return {
    debugMode,
    setDebugMode: updateDebugMode,
    hydrated,
  }
}
