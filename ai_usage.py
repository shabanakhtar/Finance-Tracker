from dataclasses import dataclass
from datetime import datetime, timezone

from settings import env
from supabase_data import get_ai_usage, upsert_ai_usage


FEATURE_LIMITS = {
    "ai_chat": int(env("AI_CHAT_DAILY_LIMIT", "10")),
    "receipt_scan": int(env("AI_RECEIPT_DAILY_LIMIT", "5")),
    "product_recommendation": int(env("AI_PRODUCT_DAILY_LIMIT", "5")),
}


class AiLimitExceeded(Exception):
    def __init__(self, status):
        self.status = status
        super().__init__(status.message)


@dataclass
class AiUsageStatus:
    feature: str
    limit: int
    period: str
    remaining: int
    used: int

    @property
    def message(self):
        return "You have used today's AI limit. Core tracking still works."

    def as_dict(self):
        return {
            "feature": self.feature,
            "limit": self.limit,
            "period": self.period,
            "remaining": self.remaining,
            "used": self.used,
        }


def today_period():
    return datetime.now(timezone.utc).date().isoformat()


def current_timestamp():
    return datetime.now(timezone.utc).isoformat()


def get_limit(feature):
    if feature not in FEATURE_LIMITS:
        raise ValueError(f"Unknown AI feature: {feature}")
    return FEATURE_LIMITS[feature]


def get_usage_status(user_id, feature):
    limit = get_limit(feature)
    period = today_period()
    if not user_id:
        return AiUsageStatus(
            feature=feature,
            limit=limit,
            period=period,
            remaining=limit,
            used=0,
        )
    usage = get_ai_usage(user_id, feature, period)
    used = int(usage.get("count", 0)) if usage else 0
    return AiUsageStatus(
        feature=feature,
        limit=limit,
        period=period,
        remaining=max(limit - used, 0),
        used=used,
    )


def ensure_ai_limit(user_id, feature):
    status = get_usage_status(user_id, feature)
    if status.remaining <= 0:
        raise AiLimitExceeded(status)
    return status


def record_ai_usage(user_id, feature):
    status = get_usage_status(user_id, feature)
    if not user_id:
        return status
    next_used = status.used + 1
    upsert_ai_usage(
        user_id=user_id,
        feature=feature,
        period=status.period,
        count=next_used,
        last_used_at=current_timestamp(),
    )
    return AiUsageStatus(
        feature=feature,
        limit=status.limit,
        period=status.period,
        remaining=max(status.limit - next_used, 0),
        used=next_used,
    )
