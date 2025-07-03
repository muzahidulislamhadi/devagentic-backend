'use client'
import Divider from '@/app/components/base/divider'
import Select from '@/app/components/base/select/locale'
import { useGlobalPublicStore } from '@/context/global-public-context'
import I18n from '@/context/i18n'
import type { Locale } from '@/i18n'
import { languages } from '@/i18n/language'
import dynamic from 'next/dynamic'
import { useContext } from 'use-context-selector'

// Avoid rendering the logo and theme selector on the server
const DevAgenticLogo = dynamic(() => import('@/app/components/base/logo/devagentic-logo'), {
  ssr: false,
  loading: () => <div className='h-7 w-16 bg-transparent' />,
})
const ThemeSelector = dynamic(() => import('@/app/components/base/theme-selector'), {
  ssr: false,
  loading: () => <div className='size-8 bg-transparent' />,
})

const Header = () => {
  const { locale, setLocaleOnClient } = useContext(I18n)
  const systemFeatures = useGlobalPublicStore(s => s.systemFeatures)

  return (
    <div className='flex w-full items-center justify-between p-6'>
      {systemFeatures.branding.enabled && systemFeatures.branding.login_page_logo
        ? <img
          src={systemFeatures.branding.login_page_logo}
          className='block h-7 w-auto object-contain'
          alt='logo'
        />
        : <DevAgenticLogo size='large' />}
      <div className='flex items-center gap-1'>
        <Select
          value={locale}
          items={languages.filter(item => item.supported)}
          onChange={(value) => {
            setLocaleOnClient(value as Locale)
          }}
        />
        <Divider type='vertical' className='mx-0 ml-2 h-4' />
        <ThemeSelector />
      </div>
    </div>
  )
}

export default Header
