"""
Stripe billing API endpoints for subscription management
"""
import logging
from flask import current_app, request
from flask_login import current_user
from flask_restful import Resource, reqparse
from werkzeug.exceptions import BadRequest, Forbidden

from controllers.console import api
from controllers.console.wraps import account_initialization_required, setup_required
from extensions.ext_database import db
from libs.login import login_required
from models.account import TenantAccountRole
from services.billing_service import BillingService
from services.stripe_service import StripeService

logger = logging.getLogger(__name__)


class CreateCheckoutSessionApi(Resource):
    """Create Stripe checkout session for subscription upgrade"""

    @setup_required
    @login_required
    @account_initialization_required
    def post(self):
        """Create a checkout session for the Core Capabilities plan"""
        # Role-based access control: only team_owner and team_admin can access
        BillingService.is_tenant_owner_or_admin(current_user)

        # Check if Stripe is configured
        if not StripeService.is_configured():
            raise BadRequest("Billing is not configured")

        parser = reqparse.RequestParser()
        parser.add_argument("success_url", type=str, required=True, location="json",
                          help="Success URL is required")
        parser.add_argument("cancel_url", type=str, required=True, location="json",
                          help="Cancel URL is required")
        args = parser.parse_args()

        try:
            stripe_service = StripeService()
            team_id = str(current_user.current_tenant_id) if current_user.current_tenant_id else None

            if not team_id:
                raise BadRequest("No tenant selected")

            # Get or create subscription record
            subscription = stripe_service.get_or_create_subscription(team_id, current_user)

            # Create Stripe customer if not exists
            if not subscription.stripe_customer_id:
                customer_id = stripe_service.create_customer(current_user, team_id)
                subscription.stripe_customer_id = customer_id
                db.session.commit()

            # Create checkout session
            session = stripe_service.create_checkout_session(
                team_id=team_id,
                customer_id=subscription.stripe_customer_id,
                success_url=args["success_url"],
                cancel_url=args["cancel_url"]
            )

            logger.info(f"Created checkout session for team {team_id}")
            return {
                "checkout_session_id": session["id"],
                "checkout_url": session["url"]
            }, 200

        except Exception as e:
            logger.error(f"Failed to create checkout session: {e}")
            raise BadRequest(f"Failed to create checkout session: {str(e)}")


class CreateCustomerPortalSessionApi(Resource):
    """Create Stripe customer portal session for subscription management"""

    @setup_required
    @login_required
    @account_initialization_required
    def post(self):
        """Create a customer portal session for subscription management"""
        # Role-based access control: only team_owner and team_admin can access
        BillingService.is_tenant_owner_or_admin(current_user)

        # Check if Stripe is configured
        if not StripeService.is_configured():
            raise BadRequest("Billing is not configured")

        parser = reqparse.RequestParser()
        parser.add_argument("return_url", type=str, required=True, location="json",
                          help="Return URL is required")
        args = parser.parse_args()

        try:
            stripe_service = StripeService()
            team_id = str(current_user.current_tenant_id) if current_user.current_tenant_id else None

            if not team_id:
                raise BadRequest("No tenant selected")

            # Get subscription record
            subscription = stripe_service.get_or_create_subscription(team_id, current_user)

            # Check if customer exists
            if not subscription.stripe_customer_id:
                raise BadRequest("No active subscription found. Please upgrade first.")

            # Create customer portal session
            session = stripe_service.create_customer_portal_session(
                customer_id=subscription.stripe_customer_id,
                return_url=args["return_url"]
            )

            logger.info(f"Created customer portal session for team {team_id}")
            return {
                "portal_session_id": session["id"],
                "portal_url": session["url"]
            }, 200

        except Exception as e:
            logger.error(f"Failed to create customer portal session: {e}")
            raise BadRequest(f"Failed to create customer portal session: {str(e)}")


class BillingInfoApi(Resource):
    """Get billing information for current team"""

    @setup_required
    @login_required
    @account_initialization_required
    def get(self):
        """Get billing information for the current team"""
        # Role-based access control: only team_owner and team_admin can access
        if not current_user.is_admin_or_owner:
            raise Forbidden("Only team owners and admins can view billing information")

        try:
            stripe_service = StripeService()
            team_id = str(current_user.current_tenant_id) if current_user.current_tenant_id else None

            if not team_id:
                raise BadRequest("No tenant selected")

            # Get subscription record
            subscription = stripe_service.get_or_create_subscription(team_id, current_user)

            billing_info = {
                "team_id": team_id,
                "subscription_status": subscription.status,
                "is_active": subscription.is_active,
                "is_paid": subscription.is_paid,
                "current_period_end": subscription.stripe_current_period_end.isoformat() if subscription.stripe_current_period_end else None,
                "has_stripe_customer": bool(subscription.stripe_customer_id),
                "stripe_configured": StripeService.is_configured()
            }

            return billing_info, 200

        except Exception as e:
            logger.error(f"Failed to get billing info: {e}")
            raise BadRequest(f"Failed to get billing information: {str(e)}")


# Register endpoints
api.add_resource(CreateCheckoutSessionApi, "/billing/create-checkout-session")
api.add_resource(CreateCustomerPortalSessionApi, "/billing/create-customer-portal-session")
api.add_resource(BillingInfoApi, "/billing/info")
