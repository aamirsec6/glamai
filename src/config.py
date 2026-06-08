"""GlamAI application configuration."""

from __future__ import annotations

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────
    app_env: Literal["development", "staging", "production"] = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_secret_key: str = Field(default="change-me-in-production", repr=False)
    app_debug: bool = False
    app_cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    app_base_url: str = "http://localhost:8000"

    # ── Database ─────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://glamai:glamai@localhost:5432/glamai"
    database_pool_size: int = 10
    database_max_overflow: int = 20
    database_echo: bool = False

    # ── Redis ────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── WhatsApp (360dialog) ─────────────────────────────────
    whatsapp_provider: Literal["360dialog", "meta_direct"] = "360dialog"
    whatsapp_api_key: str = Field(default="", repr=False)
    whatsapp_base_url: str = "https://waba.360dialog.io/v1"
    whatsapp_webhook_secret: str = Field(default="", repr=False)
    whatsapp_phone_number_id: str = ""
    whatsapp_business_account_id: str = ""

    # ── Google Business Profile ──────────────────────────────
    google_client_id: str = Field(default="", repr=False)
    google_client_secret: str = Field(default="", repr=False)
    google_redirect_uri: str = "http://localhost:8000/api/v1/gbp/oauth/callback"
    google_places_api_key: str = Field(default="", repr=False)

    # ── Anthropic (Claude) ───────────────────────────────────
    anthropic_api_key: str = Field(default="", repr=False)
    anthropic_model: str = "claude-3-5-haiku-20241022"
    anthropic_max_tokens: int = 1024
    anthropic_temperature: float = 0.3

    # ── OpenAI (Fallback) ────────────────────────────────────
    openai_api_key: str = Field(default="", repr=False)
    openai_model: str = "gpt-4o-mini"

    # ── Email (Resend) ───────────────────────────────────────
    resend_api_key: str = Field(default="", repr=False)
    resend_from_email: str = "reports@glamai.in"

    # ── File Storage ─────────────────────────────────────────
    storage_backend: Literal["local", "s3"] = "local"
    storage_local_path: str = "/tmp/glamai/uploads"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_s3_bucket: str = ""
    aws_region: str = "ap-south-1"

    # ── Territory / Exclusivity Defaults ─────────────────────
    territory_default_radius_km: float = 5.0
    territory_interior_design_radius_km: float = 7.0
    territory_dentist_radius_km: float = 5.0
    territory_salon_radius_km: float = 3.0
    territory_gym_radius_km: float = 5.0

    # ── Feature Flags ────────────────────────────────────────
    feature_review_engine: bool = False
    feature_reengagement: bool = False
    feature_content_generator: bool = False
    feature_multi_city: bool = False
    feature_multi_vertical: bool = False

    # ── API Keys ─────────────────────────────────────────────
    anthropic_api_key: str = Field(default="", repr=False)
    google_client_id: str = Field(default="", repr=False)
    google_client_secret: str = Field(default="", repr=False)
    whatsapp_360dialog_api_key: str = Field(default="", repr=False)
    whatsapp_webhook_secret: str = Field(default="", repr=False)
    google_places_api_key: str = Field(default="", repr=False)
    resend_api_key: str = Field(default="", repr=False)

    # ── Pricing (INR, stored in paise for precision) ─────────
    price_starter_paise: int = 199900       # ₹1,999
    price_growth_paise: int = 499900        # ₹4,999
    price_enterprise_paise: int = 799900    # ₹7,999

    # ── Guarantee Defaults ───────────────────────────────────
    guarantee_gbp_posts_per_month: int = 4
    guarantee_whatsapp_response_seconds: int = 30
    guarantee_review_target: int = 8
    guarantee_review_period_days: int = 60
    guarantee_leads_target_starter: int = 15
    guarantee_leads_target_growth: int = 25
    guarantee_leads_target_enterprise: int = 35

    @property
    def territory_radius_for_category(self) -> dict[str, float]:
        """Return default territory radius per business category."""
        return {
            "interior_design": self.territory_interior_design_radius_km,
            "dentist": self.territory_dentist_radius_km,
            "salon": self.territory_salon_radius_km,
            "gym": self.territory_gym_radius_km,
            "default": self.territory_default_radius_km,
        }

    def get_territory_radius(self, category: str) -> float:
        """Get territory radius for a specific business category."""
        return self.territory_radius_for_category.get(
            category, self.territory_default_radius_km
        )


# Singleton settings instance
_settings: Settings | None = None


def get_settings() -> Settings:
    """Get or create the singleton settings instance."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
