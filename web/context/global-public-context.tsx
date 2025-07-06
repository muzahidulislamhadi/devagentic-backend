'use client'
import { AccessMode } from '@/models/access-control'
import type { SystemFeatures } from '@/types/feature'
import { defaultSystemFeatures } from '@/types/feature'
import type { FC, PropsWithChildren } from 'react'
import { useEffect } from 'react'
import { create } from 'zustand'

type GlobalPublicStore = {
  isGlobalPending: boolean
  setIsGlobalPending: (isPending: boolean) => void
  systemFeatures: SystemFeatures
  setSystemFeatures: (systemFeatures: SystemFeatures) => void
  webAppAccessMode: AccessMode,
  setWebAppAccessMode: (webAppAccessMode: AccessMode) => void
}

export const useGlobalPublicStore = create<GlobalPublicStore>(set => ({
  isGlobalPending: false, // Set to false immediately
  setIsGlobalPending: (isPending: boolean) => set(() => ({ isGlobalPending: isPending })),
  systemFeatures: defaultSystemFeatures,
  setSystemFeatures: (systemFeatures: SystemFeatures) => set(() => ({ systemFeatures })),
  webAppAccessMode: AccessMode.PUBLIC,
  setWebAppAccessMode: (webAppAccessMode: AccessMode) => set(() => ({ webAppAccessMode })),
}))

const GlobalPublicStoreProvider: FC<PropsWithChildren> = ({
  children,
}) => {
  const { setSystemFeatures, setIsGlobalPending } = useGlobalPublicStore()

  useEffect(() => {
    // EMERGENCY FIX: Skip API call entirely and use default features
    console.log('🚀 GlobalPublicStoreProvider: EMERGENCY BYPASS - Using default system features')
    setSystemFeatures(defaultSystemFeatures)
    setIsGlobalPending(false)
  }, [setSystemFeatures, setIsGlobalPending])

  // Always render children immediately - no loading state
  return <>{children}</>
}

export default GlobalPublicStoreProvider
