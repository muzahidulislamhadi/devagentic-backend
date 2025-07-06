'use client'
import Button from '@/app/components/base/button'
import Input from '@/app/components/base/input'
import Toast from '@/app/components/base/toast'
import { emailRegex } from '@/config'
import I18NContext from '@/context/i18n'
import { sendResetPasswordCode } from '@/service/common'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useContext } from 'use-context-selector'

export default function SignUp() {
  const { t } = useTranslation()
  const { locale } = useContext(I18NContext)
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSignUp = async () => {
    if (!email) {
      Toast.notify({ type: 'error', message: t('login.error.emailEmpty') })
      return
    }
    if (!emailRegex.test(email)) {
      Toast.notify({
        type: 'error',
        message: t('login.error.emailInValid'),
      })
      return
    }

    try {
      setIsLoading(true)
      const res = await sendResetPasswordCode(email, locale)
      if (res.result === 'success') {
        const params = new URLSearchParams()
        params.append('email', encodeURIComponent(email))
        params.append('token', encodeURIComponent(res.data))
        router.push(`/reset-password/check-code?${params.toString()}`)
      }
    } catch (error: any) {
      if (error?.message?.includes('already exists')) {
        Toast.notify({
          type: 'error',
          message: t('login.error.emailAlreadyExists'),
        })
      } else {
        Toast.notify({
          type: 'error',
          message: t('login.error.signupFailed'),
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto mt-8 w-full">
      <div className="mx-auto w-full">
        <h2 className="title-4xl-semi-bold text-text-primary">{t('login.signUpTitle')}</h2>
        <p className='body-md-regular mt-2 text-text-tertiary'>{t('login.signUpWelcome')}</p>
      </div>

      <div className="relative mt-6">
        <form onSubmit={(e) => { e.preventDefault(); handleSignUp(); }}>
          <div className='mb-4'>
            <label htmlFor="email" className="system-md-semibold my-2 text-text-secondary">
              {t('login.email')}
            </label>
            <div className="mt-1">
              <Input
                value={email}
                onChange={e => setEmail(e.target.value)}
                id="email"
                type="email"
                autoComplete="email"
                placeholder={t('login.emailPlaceholder') || ''}
                required
              />
            </div>
          </div>

          <div className='mb-4'>
            <Button
              type="submit"
              variant='primary'
              onClick={handleSignUp}
              disabled={isLoading || !email}
              className="w-full"
              loading={isLoading}
            >
              {t('login.signUpBtn')}
            </Button>
          </div>
        </form>

        <div className="system-xs-regular mt-4 block w-full text-center text-text-tertiary">
          {t('login.alreadyHaveAccount')}
          &nbsp;
          <Link
            className='system-xs-medium text-text-accent hover:underline'
            href='/signin'
          >
            {t('login.signInHere')}
          </Link>
        </div>

        <div className="system-xs-regular mt-2 block w-full text-text-tertiary">
          {t('login.tosDesc')}
          &nbsp;
          <Link
            className='system-xs-medium text-text-secondary hover:underline'
            target='_blank' rel='noopener noreferrer'
            href='https://devagentic.io/terms'
          >{t('login.tos')}</Link>
          &nbsp;&&nbsp;
          <Link
            className='system-xs-medium text-text-secondary hover:underline'
            target='_blank' rel='noopener noreferrer'
            href='https://devagentic.io/privacy'
          >{t('login.pp')}</Link>
        </div>
      </div>
    </div>
  )
}
