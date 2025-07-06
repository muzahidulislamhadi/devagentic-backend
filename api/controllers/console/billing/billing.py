from flask_login import current_user
from flask_restful import Resource, reqparse

from controllers.console import api
from controllers.console.wraps import account_initialization_required, only_edition_cloud, setup_required
from libs.login import login_required
from services.billing_service import BillingService


class Subscription(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    def get(self):
        """Create Stripe checkout session for subscription"""
        parser = reqparse.RequestParser()
        parser.add_argument("plan", type=str, required=True, location="args", choices=["professional", "team"])
        parser.add_argument("interval", type=str, required=True, location="args", choices=["month", "year"])
        args = parser.parse_args()

        BillingService.is_tenant_owner_or_admin(current_user)

        try:
            from services.stripe_service import StripeService
            from configs import dify_config

            # Check if Stripe is configured
            if not dify_config.BILLING_ENABLED or not dify_config.is_stripe_configured:
                return {"error": "Billing is not configured"}, 400

            # Get the price ID for the requested plan and interval
            price_id = dify_config.get_price_id(args["plan"], args["interval"])
            if not price_id:
                return {"error": f"Price not configured for {args['plan']} {args['interval']} plan"}, 400

            stripe_service = StripeService()
            team_id = str(current_user.current_tenant_id) if current_user.current_tenant_id else None

            if not team_id:
                return {"error": "No tenant selected"}, 400

            # Get or create subscription record
            subscription = stripe_service.get_or_create_subscription(team_id, current_user)

            # Create Stripe customer if not exists
            if not subscription.stripe_customer_id:
                customer_id = stripe_service.create_customer(current_user, team_id)
                subscription.stripe_customer_id = customer_id
                from extensions.ext_database import db
                db.session.commit()

            # Create checkout session with the specific price ID
            success_url = f"{dify_config.NEXT_PUBLIC_APP_URL}/apps?payment=success"
            cancel_url = f"{dify_config.NEXT_PUBLIC_APP_URL}/apps?payment=cancelled"

            session = stripe_service.create_checkout_session(
                team_id=team_id,
                customer_id=subscription.stripe_customer_id,
                price_id=price_id,  # Use the specific price ID
                success_url=success_url,
                cancel_url=cancel_url
            )

            return {"url": session["checkout_url"]}

        except ValueError as e:
            return {"error": "Stripe is not configured"}, 400
        except Exception as e:
            return {"error": str(e)}, 500


class Invoices(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    @only_edition_cloud
    def get(self):
        BillingService.is_tenant_owner_or_admin(current_user)
        return BillingService.get_invoices(current_user.email, current_user.current_tenant_id)


api.add_resource(Subscription, "/billing/subscription")
api.add_resource(Invoices, "/billing/invoices")
