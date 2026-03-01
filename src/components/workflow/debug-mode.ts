'use client'

import { useState } from 'react'

const DEBUG_MODE_KEY = 'workflow_debug_mode'

export function useDebugMode() {
  const [debugMode, setDebugMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }

    try {
      return window.localStorage.getItem(DEBUG_MODE_KEY) === 'true'
    } catch {
      return false
    }
  })

  function updateDebugMode(next: boolean) {
    setDebugMode(next)
    try {
      window.localStorage.setItem(DEBUG_MODE_KEY, String(next))
    } catch {
      // no-op when localStorage is unavailable
    }
  }

  return {
    debugMode,
    setDebugMode: updateDebugMode,
  }
}
