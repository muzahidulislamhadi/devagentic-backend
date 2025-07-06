"""
Stripe webhook endpoint for handling subscription events
"""
import logging
from flask import request
from flask_restful import Resource
from werkzeug.exceptions import BadRequest, Unauthorized

from controllers.web import api
from services.stripe_service import StripeService

logger = logging.getLogger(__name__)


class StripeWebhookApi(Resource):
    """Handle Stripe webhook events"""

    def post(self):
        """Handle Stripe webhook events"""
        # Check if Stripe is configured
        if not StripeService.is_configured():
            logger.warning("Stripe webhook received but Stripe is not configured")
            return {"error": "Stripe not configured"}, 400

        # Get webhook payload and signature
        payload = request.get_data()
        sig_header = request.headers.get('Stripe-Signature')

        if not sig_header:
            logger.warning("Stripe webhook received without signature")
            raise BadRequest("Missing Stripe signature")

        try:
            stripe_service = StripeService()

            # Verify webhook signature
            event = stripe_service.verify_webhook_signature(payload, sig_header)

            # Handle different event types
            event_type = event['type']
            event_data = event['data']['object']

            logger.info(f"Processing Stripe webhook event: {event_type}")

            # Handle subscription events
            if event_type in [
                'customer.subscription.created',
                'customer.subscription.updated',
                'customer.subscription.deleted'
            ]:
                stripe_service.handle_subscription_event(event_type, event_data)
                logger.info(f"Successfully processed {event_type} webhook")

            # Handle checkout session completion
            elif event_type == 'checkout.session.completed':
                # Get the checkout session data
                session = event_data

                # If this is a subscription mode session, the subscription will be handled
                # by the subscription.created event that follows
                if session.get('mode') == 'subscription':
                    logger.info(f"Checkout session completed for subscription: {session.get('id')}")

            else:
                logger.info(f"Unhandled webhook event type: {event_type}")

            return {"received": True}, 200

        except Exception as e:
            logger.error(f"Error processing Stripe webhook: {e}")
            raise BadRequest(f"Webhook processing failed: {str(e)}")


# Register webhook endpoint
api.add_resource(StripeWebhookApi, "/webhooks/stripe")
