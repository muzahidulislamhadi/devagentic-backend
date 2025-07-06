import type { CurrentPlanInfoBackend, SubscriptionUrlsBackend } from '@/app/components/billing/type'
import { get, post } from './base'

export const fetchCurrentPlanInfo = () => {
  return get<CurrentPlanInfoBackend>('/features')
}

export const fetchSubscriptionUrls = (plan: string, interval: string) => {
  return get<SubscriptionUrlsBackend>(`/billing/subscription?plan=${plan}&interval=${interval}`)
}

export const fetchBillingUrl = () => {
  return get<{ url: string }>('/billing/invoices')
}

// New Stripe billing functions
export interface BillingInfo {
  team_id: string
  subscription_status: string
  is_active: boolean
  is_paid: boolean
  current_period_end: string | null
  has_stripe_customer: boolean
  stripe_configured: boolean
}

export interface CheckoutSessionResponse {
  checkout_session_id: string
  checkout_url: string
}

export interface CustomerPortalResponse {
  portal_session_id: string
  portal_url: string
}

export const fetchBillingInfo = () => {
  return get<BillingInfo>('/billing/info')
}

export const createCheckoutSession = (data: { success_url: string; cancel_url: string }) => {
  return post<CheckoutSessionResponse>('/billing/create-checkout-session', {
    body: data,
  })
}

export const createCustomerPortalSession = (data: { return_url: string }) => {
  return post<CustomerPortalResponse>('/billing/create-customer-portal-session', {
    body: data,
  })
}
