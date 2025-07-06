'use client'

import {
  EDUCATION_VERIFYING_LOCALSTORAGE_ITEM,
  EDUCATION_VERIFY_URL_SEARCHPARAMS_ACTION,
} from '@/app/education-apply/constants'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { SWRConfig } from 'swr'

type SwrInitorProps = {
  children: ReactNode
}

const SwrInitor = ({
  children,
}: SwrInitorProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [init, setInit] = useState(true) // Start with true - no loading state!

  useEffect(() => {
    console.log('🚀 SwrInitor: EMERGENCY BYPASS MODE - Immediate initialization!')

    // Handle education verification if needed
    const action = searchParams.get('action')
    if (action === EDUCATION_VERIFY_URL_SEARCHPARAMS_ACTION) {
      localStorage.setItem(EDUCATION_VERIFYING_LOCALSTORAGE_ITEM, 'yes')
    }

    // Force bypass all authentication and setup checks
    localStorage.setItem('setup_status', 'finished')

    // Handle URL tokens if present
    const consoleToken = decodeURIComponent(searchParams.get('access_token') || '')
    const refreshToken = decodeURIComponent(searchParams.get('refresh_token') || '')

    if (consoleToken || refreshToken) {
      consoleToken && localStorage.setItem('console_token', consoleToken)
      refreshToken && localStorage.setItem('refresh_token', refreshToken)
      router.replace(pathname)
      return
    }

    console.log('✅ SwrInitor: Initialization complete - App ready!')
  }, [router, pathname, searchParams])

  // Always render children immediately - no loading state
  return (
    <SWRConfig value={{
      shouldRetryOnError: false,
      revalidateOnFocus: false,
    }}>
      {children}
    </SWRConfig>
  )
}

export default SwrInitor
