import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { useDebounceFn } from 'ahooks'
import { useSearchParams } from 'next/navigation'
import type { SearchParams } from './types'
import {
  EDUCATION_VERIFYING_LOCALSTORAGE_ITEM,
  EDUCATION_VERIFY_URL_SEARCHPARAMS_ACTION,
} from './constants'
import { useEducationAutocomplete } from '@/service/use-education'
import { useModalContextSelector } from '@/context/modal-context'

export const useEducation = () => {
  const {
    mutateAsync,
    isPending,
    data,
  } = useEducationAutocomplete()

  const [prevSchools, setPrevSchools] = useState<string[]>([])
  const handleUpdateSchools = useCallback((searchParams: SearchParams) => {
    if (searchParams.keywords) {
      mutateAsync(searchParams).then((res) => {
        const currentPage = searchParams.page || 0
        const resSchools = res.data
        if (currentPage > 0)
          setPrevSchools(prevSchools => [...(prevSchools || []), ...resSchools])
        else
          setPrevSchools(resSchools)
      })
    }
  }, [mutateAsync])

  const { run: querySchoolsWithDebounced } = useDebounceFn((searchParams: SearchParams) => {
    handleUpdateSchools(searchParams)
  }, {
    wait: 300,
  })

  return {
    schools: prevSchools,
    setSchools: setPrevSchools,
    querySchoolsWithDebounced,
    handleUpdateSchools,
    isLoading: isPending,
    hasNext: data?.has_next,
  }
}

export const useEducationInit = () => {
  const setShowAccountSettingModal = useModalContextSelector(s => s.setShowAccountSettingModal)
  const [educationVerifying, setEducationVerifying] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const educationVerifyAction = searchParams.get('action')

  // Add logging to validate localStorage issue
  useEffect(() => {
    console.log('[DEBUG] useEducationInit: Checking if running on client side...')
    if (typeof window !== 'undefined') {
      console.log('[DEBUG] useEducationInit: Client-side detected, accessing localStorage')
      const storedValue = localStorage.getItem(EDUCATION_VERIFYING_LOCALSTORAGE_ITEM)
      setEducationVerifying(storedValue)
      console.log('[DEBUG] useEducationInit: localStorage value:', storedValue)
    } else {
      console.log('[DEBUG] useEducationInit: Server-side detected, skipping localStorage')
    }
  }, [])

  useEffect(() => {
    if (educationVerifying === 'yes' || educationVerifyAction === EDUCATION_VERIFY_URL_SEARCHPARAMS_ACTION) {
      console.log('[DEBUG] useEducationInit: Opening account settings modal')
      setShowAccountSettingModal({ payload: 'billing' })

      if (educationVerifyAction === EDUCATION_VERIFY_URL_SEARCHPARAMS_ACTION && typeof window !== 'undefined') {
        console.log('[DEBUG] useEducationInit: Setting localStorage item')
        localStorage.setItem(EDUCATION_VERIFYING_LOCALSTORAGE_ITEM, 'yes')
      }
    }
  }, [setShowAccountSettingModal, educationVerifying, educationVerifyAction])
}
