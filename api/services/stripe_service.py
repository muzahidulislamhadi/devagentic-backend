"""
Stripe service for handling billing operations
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Optional, Any

import stripe
from flask import current_app

from configs import dify_config
from extensions.ext_database import db
from models.account import Account
from models.subscription import Subscription


logger = logging.getLogger(__name__)


class StripeService:
    """Service for handling Stripe operations"""

    def __init__(self):
        """Initialize Stripe service with API key"""
        if not dify_config.BILLING_ENABLED or not dify_config.STRIPE_API_KEY:
            raise ValueError("Stripe is not configured")

        stripe.api_key = dify_config.STRIPE_API_KEY

    @staticmethod
    def is_configured() -> bool:
        """Check if Stripe is properly configured"""
        return (
            dify_config.BILLING_ENABLED and
            bool(dify_config.STRIPE_API_KEY) and
            bool(dify_config.STRIPE_WEBHOOK_SECRET) and
            bool(dify_config.STRIPE_CORE_PLAN_PRICE_ID)
        )

    def create_customer(self, user: Account, team_id: str) -> str:
        """Create a Stripe customer for the user"""
        try:
            customer = stripe.Customer.create(
                email=user.email,
                name=user.name,
                metadata={
                    'team_id': team_id,
                    'user_id': str(user.id)
                }
            )
            logger.info(f"Created Stripe customer {customer.id} for team {team_id}")
            return customer.id
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create Stripe customer: {e}")
            raise

    def create_checkout_session(self, team_id: str, customer_id: str, success_url: str, cancel_url: str, price_id: Optional[str] = None) -> Dict[str, Any]:
        """Create a Stripe checkout session for subscription"""
        try:
            # Use provided price_id or fallback to legacy core plan price
            if not price_id:
                price_id = dify_config.STRIPE_CORE_PLAN_PRICE_ID

            if not price_id:
                raise ValueError("No price ID available for checkout session")

            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    'team_id': team_id
                }
            )

            logger.info(f"Created checkout session {session.id} for team {team_id} with price {price_id}")
            return {
                'checkout_session_id': session.id,
                'checkout_url': session.url
            }
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create checkout session: {e}")
            raise

    def create_customer_portal_session(self, customer_id: str, return_url: str) -> Dict[str, Any]:
        """Create a Stripe customer portal session"""
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url
            )

            logger.info(f"Created customer portal session {session.id} for customer {customer_id}")
            return {
                'portal_session_id': session.id,
                'portal_url': session.url
            }
        except stripe.error.StripeError as e:
            logger.error(f"Failed to create customer portal session: {e}")
            raise

    def get_or_create_subscription(self, team_id: str, user: Account) -> Subscription:
        """Get or create subscription record for a team"""
        subscription = db.session.query(Subscription).filter_by(team_id=team_id).first()

        if not subscription:
            subscription = Subscription(team_id=team_id)
            db.session.add(subscription)
            db.session.commit()

        return subscription

    def get_billing_info(self, team_id: str) -> Dict[str, Any]:
        """Get billing information for a team"""
        try:
            # Get subscription from database
            subscription = db.session.query(Subscription).filter_by(team_id=team_id).first()

            if not subscription:
                return {
                    'team_id': team_id,
                    'subscription_status': 'no_subscription',
                    'is_active': False,
                    'is_paid': False,
                    'current_period_end': None,
                    'has_stripe_customer': False,
                    'stripe_configured': self.is_configured()
                }

            # Check if subscription is active
            is_active = subscription.status == 'active'
            is_paid = subscription.status in ['active', 'past_due']

            return {
                'team_id': team_id,
                'subscription_status': subscription.status,
                'is_active': is_active,
                'is_paid': is_paid,
                'current_period_end': subscription.stripe_current_period_end.isoformat() if subscription.stripe_current_period_end else None,
                'has_stripe_customer': bool(subscription.stripe_customer_id),
                'stripe_configured': self.is_configured()
            }

        except Exception as e:
            logger.error(f"Failed to get billing info for team {team_id}: {e}")
            raise

    def handle_webhook_event(self, event: Dict[str, Any]) -> None:
        """Handle Stripe webhook events"""
        try:
            event_type = event['type']
            data = event['data']['object']

            if event_type == 'checkout.session.completed':
                self._handle_checkout_session_completed(data)
            elif event_type == 'customer.subscription.created':
                self._handle_subscription_created(data)
            elif event_type == 'customer.subscription.updated':
                self._handle_subscription_updated(data)
            elif event_type == 'customer.subscription.deleted':
                self._handle_subscription_deleted(data)
            elif event_type == 'invoice.payment_succeeded':
                self._handle_invoice_payment_succeeded(data)
            elif event_type == 'invoice.payment_failed':
                self._handle_invoice_payment_failed(data)
            else:
                logger.info(f"Unhandled webhook event type: {event_type}")

        except Exception as e:
            logger.error(f"Failed to handle webhook event: {e}")
            raise

    def _handle_checkout_session_completed(self, session: Dict[str, Any]) -> None:
        """Handle successful checkout session completion"""
        try:
            team_id = session['metadata']['team_id']
            customer_id = session['customer']
            subscription_id = session['subscription']

            # Update subscription record
            subscription = db.session.query(Subscription).filter_by(team_id=team_id).first()
            if subscription:
                subscription.stripe_customer_id = customer_id
                subscription.stripe_subscription_id = subscription_id
                subscription.status = 'active'
                db.session.commit()
                logger.info(f"Updated subscription for team {team_id} after checkout completion")

        except Exception as e:
            logger.error(f"Failed to handle checkout session completed: {e}")
            raise

    def _handle_subscription_created(self, subscription: Dict[str, Any]) -> None:
        """Handle subscription creation"""
        try:
            customer_id = subscription['customer']
            subscription_id = subscription['id']

            # Get customer to find team_id
            customer = stripe.Customer.retrieve(customer_id)
            team_id = customer.metadata.get('team_id')

            if not team_id:
                logger.error(f"No team_id found in customer metadata for customer {customer_id}")
                return

            # Update or create subscription record
            db_subscription = db.session.query(Subscription).filter_by(team_id=team_id).first()
            if not db_subscription:
                db_subscription = Subscription(team_id=team_id)
                db.session.add(db_subscription)

            db_subscription.stripe_customer_id = customer_id
            db_subscription.stripe_subscription_id = subscription_id
            db_subscription.stripe_price_id = subscription['items']['data'][0]['price']['id']
            db_subscription.status = subscription['status']
            db_subscription.stripe_current_period_end = datetime.fromtimestamp(
                subscription['current_period_end'], tz=timezone.utc
            )

            db.session.commit()
            logger.info(f"Created/updated subscription for team {team_id}")

        except Exception as e:
            logger.error(f"Failed to handle subscription created: {e}")
            raise

    def _handle_subscription_updated(self, subscription: Dict[str, Any]) -> None:
        """Handle subscription updates"""
        try:
            subscription_id = subscription['id']

            # Find subscription by Stripe subscription ID
            db_subscription = db.session.query(Subscription).filter_by(
                stripe_subscription_id=subscription_id
            ).first()

            if not db_subscription:
                logger.error(f"No subscription found for Stripe subscription {subscription_id}")
                return

            # Update subscription details
            db_subscription.status = subscription['status']
            db_subscription.stripe_current_period_end = datetime.fromtimestamp(
                subscription['current_period_end'], tz=timezone.utc
            )

            db.session.commit()
            logger.info(f"Updated subscription {subscription_id}")

        except Exception as e:
            logger.error(f"Failed to handle subscription updated: {e}")
            raise

    def _handle_subscription_deleted(self, subscription: Dict[str, Any]) -> None:
        """Handle subscription deletion"""
        try:
            subscription_id = subscription['id']

            # Find subscription by Stripe subscription ID
            db_subscription = db.session.query(Subscription).filter_by(
                stripe_subscription_id=subscription_id
            ).first()

            if not db_subscription:
                logger.error(f"No subscription found for Stripe subscription {subscription_id}")
                return

            # Update subscription status to cancelled
            db_subscription.status = 'cancelled'
            db.session.commit()
            logger.info(f"Cancelled subscription {subscription_id}")

        except Exception as e:
            logger.error(f"Failed to handle subscription deleted: {e}")
            raise

    def _handle_invoice_payment_succeeded(self, invoice: Dict[str, Any]) -> None:
        """Handle successful invoice payment"""
        try:
            subscription_id = invoice['subscription']

            if not subscription_id:
                return

            # Find subscription by Stripe subscription ID
            db_subscription = db.session.query(Subscription).filter_by(
                stripe_subscription_id=subscription_id
            ).first()

            if not db_subscription:
                logger.error(f"No subscription found for Stripe subscription {subscription_id}")
                return

            # Update subscription status if it was past_due
            if db_subscription.status == 'past_due':
                db_subscription.status = 'active'
                db.session.commit()
                logger.info(f"Reactivated subscription {subscription_id} after successful payment")

        except Exception as e:
            logger.error(f"Failed to handle invoice payment succeeded: {e}")
            raise

    def _handle_invoice_payment_failed(self, invoice: Dict[str, Any]) -> None:
        """Handle failed invoice payment"""
        try:
            subscription_id = invoice['subscription']

            if not subscription_id:
                return

            # Find subscription by Stripe subscription ID
            db_subscription = db.session.query(Subscription).filter_by(
                stripe_subscription_id=subscription_id
            ).first()

            if not db_subscription:
                logger.error(f"No subscription found for Stripe subscription {subscription_id}")
                return

            # Update subscription status to past_due
            db_subscription.status = 'past_due'
            db.session.commit()
            logger.info(f"Marked subscription {subscription_id} as past_due after failed payment")

        except Exception as e:
            logger.error(f"Failed to handle invoice payment failed: {e}")
            raise

    def verify_webhook_signature(self, payload: bytes, sig_header: str) -> Dict[str, Any]:
        """Verify Stripe webhook signature and return the event"""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, dify_config.STRIPE_WEBHOOK_SECRET
            )
            return event
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Webhook signature verification failed: {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to verify webhook signature: {e}")
            raise

    def handle_subscription_event(self, event_type: str, event_data: Dict[str, Any]) -> None:
        """Handle subscription-related webhook events"""
        try:
            if event_type == 'customer.subscription.created':
                self._handle_subscription_created(event_data)
            elif event_type == 'customer.subscription.updated':
                self._handle_subscription_updated(event_data)
            elif event_type == 'customer.subscription.deleted':
                self._handle_subscription_deleted(event_data)
            else:
                logger.info(f"Unhandled subscription event type: {event_type}")
        except Exception as e:
            logger.error(f"Failed to handle subscription event: {e}")
            raise
