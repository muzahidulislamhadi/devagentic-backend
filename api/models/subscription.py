"""
Subscription model for managing team billing data
"""
from datetime import datetime
from typing import Optional

from models.base import Base
from models.engine import db
from models.types import StringUUID


class Subscription(Base):
    """
    Subscription model for storing team billing information
    This table serves as the single source of truth for a team's subscription status
    """
    __tablename__ = "subscriptions"
    __table_args__ = (
        db.PrimaryKeyConstraint("id", name="subscription_pkey"),
        # Ensure one team can only have one subscription record
        db.UniqueConstraint("team_id", name="unique_team_subscription"),
        # Indexes for efficient querying
        db.Index("subscription_team_id_idx", "team_id"),
        db.Index("subscription_stripe_customer_id_idx", "stripe_customer_id"),
        db.Index("subscription_stripe_subscription_id_idx", "stripe_subscription_id"),
        db.Index("subscription_stripe_price_id_idx", "stripe_price_id"),
        db.Index("subscription_status_idx", "status"),
    )

    id = db.Column(StringUUID, server_default=db.text("uuid_generate_v4()"))

    # Foreign key to teams/tenants table - must be unique
    team_id = db.Column(StringUUID, nullable=False, unique=True)

    # Stripe customer ID - unique identifier from Stripe
    stripe_customer_id = db.Column(db.String(255), nullable=True, unique=True)

    # Stripe subscription ID - the active subscription ID from Stripe
    stripe_subscription_id = db.Column(db.String(255), nullable=True, unique=True)

    # Stripe price ID - the specific plan they are on
    stripe_price_id = db.Column(db.String(255), nullable=True)

    # Current billing period end timestamp
    stripe_current_period_end = db.Column(db.DateTime, nullable=True)

    # Subscription status synchronized from Stripe
    status = db.Column(db.String(50), nullable=True, default="incomplete")

    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP"))
    updated_at = db.Column(db.DateTime, nullable=False, server_default=db.text("CURRENT_TIMESTAMP"))

    @property
    def is_active(self) -> bool:
        """Check if the subscription is in an active state"""
        return self.status in ["active", "trialing"]

    @property
    def is_paid(self) -> bool:
        """Check if the subscription is paid (not free/trial)"""
        return self.status == "active" and self.stripe_subscription_id is not None

    def __repr__(self) -> str:
        return f"<Subscription(id={self.id}, team_id={self.team_id}, status={self.status})>"
