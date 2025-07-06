'use client'
import Button from '@/app/components/base/button'
import Divider from '@/app/components/base/divider'
import { useToastContext } from '@/app/components/base/toast'
import { useAppContext } from '@/context/app-context'
import { useProviderContext } from '@/context/provider-context'
import {
  createCheckoutSession,
  createCustomerPortalSession,
  fetchBillingInfo,
  fetchBillingUrl,
  type BillingInfo
} from '@/service/billing'
import {
  RiArrowRightUpLine,
  RiBankCardLine,
  RiCheckLine,
  RiCloseLine,
  RiLoader5Line,
  RiSettingsLine,
  RiStarLine,
} from '@remixicon/react'
import type { FC } from 'react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import useSWR from 'swr'
import PlanComp from '../plan'

const Billing: FC = () => {
  const { t } = useTranslation()
  const { notify } = useToastContext()
  const { isCurrentWorkspaceManager } = useAppContext()
  const { enableBilling } = useProviderContext()
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isOpeningPortal, setIsOpeningPortal] = useState(false)

  // Existing billing URL (legacy)
  const { data: billingUrl } = useSWR(
    (!enableBilling || !isCurrentWorkspaceManager) ? null : ['/billing/invoices'],
    () => fetchBillingUrl().then(data => data.url),
  )

  // New Stripe billing info
  const { data: billingInfo, mutate: mutateBillingInfo } = useSWR<BillingInfo>(
    (!enableBilling || !isCurrentWorkspaceManager) ? null : ['/billing/info'],
    () => fetchBillingInfo(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  const handleUpgradeToCore = async () => {
    if (!isCurrentWorkspaceManager) {
      notify({
        type: 'error',
        message: t('billing.buyPermissionDeniedTip'),
      })
      return
    }

    setIsUpgrading(true)
    try {
      const currentUrl = window.location.origin + window.location.pathname
      const result = await createCheckoutSession({
        success_url: `${currentUrl}?payment=success`,
        cancel_url: `${currentUrl}?payment=cancelled`,
      })

      // Redirect to Stripe checkout
      window.location.href = result.checkout_url
    } catch (error) {
      console.error('Failed to create checkout session:', error)
      notify({
        type: 'error',
        message: t('billing.checkoutError'),
      })
    } finally {
      setIsUpgrading(false)
    }
  }

  const handleManageSubscription = async () => {
    if (!isCurrentWorkspaceManager) {
      notify({
        type: 'error',
        message: t('billing.buyPermissionDeniedTip'),
      })
      return
    }

    setIsOpeningPortal(true)
    try {
      const currentUrl = window.location.origin + window.location.pathname
      const result = await createCustomerPortalSession({
        return_url: currentUrl,
      })

      // Redirect to Stripe customer portal
      window.location.href = result.portal_url
    } catch (error) {
      console.error('Failed to create customer portal session:', error)
      notify({
        type: 'error',
        message: t('billing.portalError'),
      })
    } finally {
      setIsOpeningPortal(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return 'N/A'
    }
  }

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <RiCheckLine className="w-3 h-3 mr-1" />
          {t('billing.status.active')}
        </span>
      )
    } else if (status === 'incomplete') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <RiLoader5Line className="w-3 h-3 mr-1" />
          {t('billing.status.pending')}
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
          <RiCloseLine className="w-3 h-3 mr-1" />
          {t('billing.status.inactive')}
        </span>
      )
    }
  }

  // Don't show anything if billing is not enabled or user doesn't have permission
  if (!enableBilling || !isCurrentWorkspaceManager) {
    return (
      <div>
        <PlanComp loc={'billing-page'} />
        {!isCurrentWorkspaceManager && (
          <div className="mt-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {t('billing.accessDenied')}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <PlanComp loc={'billing-page'} />

      {/* Stripe Billing Section */}
      {billingInfo && billingInfo.stripe_configured && (
        <>
          <Divider className='my-6' />

          {/* Subscription Status Card */}
          <div className="p-6 rounded-2xl border-[0.5px] border-effects-highlight-lightmode-off bg-background-section-burn dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary dark:text-white">
                {t('billing.subscription.title')}
              </h3>
              {getStatusBadge(billingInfo.subscription_status, billingInfo.is_active)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-text-tertiary dark:text-gray-400 mb-1">
                  {t('billing.subscription.status')}
                </p>
                <p className="text-text-primary dark:text-white capitalize">
                  {billingInfo.subscription_status || 'No subscription'}
                </p>
              </div>

              {billingInfo.current_period_end && (
                <div>
                  <p className="text-sm text-text-tertiary dark:text-gray-400 mb-1">
                    {t('billing.subscription.nextBilling')}
                  </p>
                  <p className="text-text-primary dark:text-white">
                    {formatDate(billingInfo.current_period_end)}
                  </p>
                </div>
              )}
            </div>

            {/* Core Capabilities Plan Section */}
            {!billingInfo.is_paid && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 mb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <RiStarLine className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                        {t('billing.corePlan.title')}
                      </h4>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      {t('billing.corePlan.description')}
                    </p>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li className="flex items-center">
                        <RiCheckLine className="w-4 h-4 mr-2" />
                        {t('billing.corePlan.feature1')}
                      </li>
                      <li className="flex items-center">
                        <RiCheckLine className="w-4 h-4 mr-2" />
                        {t('billing.corePlan.feature2')}
                      </li>
                      <li className="flex items-center">
                        <RiCheckLine className="w-4 h-4 mr-2" />
                        {t('billing.corePlan.feature3')}
                      </li>
                    </ul>
                  </div>
                  <Button
                    variant="primary"
                    size="medium"
                    onClick={handleUpgradeToCore}
                    disabled={isUpgrading}
                    className="ml-4 shrink-0"
                  >
                    {isUpgrading ? (
                      <>
                        <RiLoader5Line className="w-4 h-4 mr-2 animate-spin" />
                        {t('billing.upgrading')}
                      </>
                    ) : (
                      <>
                        <RiBankCardLine className="w-4 h-4 mr-2" />
                        {t('billing.upgradeToCore')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Manage Subscription Button */}
            {billingInfo.has_stripe_customer && (
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  size="medium"
                  onClick={handleManageSubscription}
                  disabled={isOpeningPortal}
                >
                  {isOpeningPortal ? (
                    <>
                      <RiLoader5Line className="w-4 h-4 mr-2 animate-spin" />
                      {t('billing.openingPortal')}
                    </>
                  ) : (
                    <>
                      <RiSettingsLine className="w-4 h-4 mr-2" />
                      {t('billing.manageSubscription')}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Legacy Billing URL (if exists) */}
      {billingUrl && (
        <>
          <Divider className='my-4' />
          <a
            className='system-xs-medium flex cursor-pointer items-center text-text-accent-light-mode-only dark:text-blue-400'
            href={billingUrl}
            target='_blank'
            rel='noopener noreferrer'
          >
            <span className='pr-0.5'>{t('billing.viewBilling')}</span>
            <RiArrowRightUpLine className='h-4 w-4' />
          </a>
        </>
      )}

      {/* Configuration Notice */}
      {billingInfo && !billingInfo.stripe_configured && (
        <>
          <Divider className='my-4' />
          <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {t('billing.stripeNotConfigured')}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default React.memo(Billing)
