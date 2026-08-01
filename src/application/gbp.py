"""GBP facade — single entry for connect, sync, publish, generate."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.analytics.ingest import IngestEngine
from src.core.config import get_settings
from src.integrations.base import ConnectorResource
from src.integrations.registry import ConnectorRegistry
from src.models.gbp import GbpPost
from src.models.notification import OnboardingEvent
from src.models.org import OnboardingStatus, Org
from src.services.gbp.client import GbpClient
from src.services.gbp.image_post_generator import ImagePostGenerator
from src.services.gbp.optimizer import GbpPostGenerator
from src.services.gbp.profile_optimizer import GbpProfileOptimizer
from src.services.gbp.token_manager import GbpTokenManager

logger = structlog.get_logger(__name__)


class GbpFacade:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.registry = ConnectorRegistry(session)
        self.ingest = IngestEngine(session)

    async def close(self) -> None:
        await self.registry.close()

    async def connect_oauth(self, org_id: str, code: str) -> dict[str, Any]:
        org = await self.session.get(Org, org_id)
        if not org:
            return {"status": "org_not_found"}

        token_mgr = GbpTokenManager(self.session)
        try:
            token_data = await token_mgr.client.exchange_code(code)
            await token_mgr.store_tokens(
                org_id=org.id,
                access_token=token_data["access_token"],
                refresh_token=token_data.get("refresh_token"),
                expires_in=token_data.get("expires_in"),
            )
            access = await token_mgr.get_valid_access_token(org.id)
            locations: list[dict[str, Any]] = []
            if access:
                gbp = self.registry.gbp()
                loc_result = await gbp.pull(org_id, ConnectorResource.LOCATIONS)
                await gbp.close()
                if loc_result.ok and loc_result.data.get("locations"):
                    locations = loc_result.data["locations"]
                    # Single location: auto-select. Multiple: pick first; client may change via /locations/select
                    loc = locations[0]
                    org.gbp_place_id = loc.get("name", "")
                    org.gbp_name = loc.get("title") or loc.get("locationName")
                    org.gbp_status = "CONNECTED"

            org.onboarding_status = OnboardingStatus.GBP_CONNECTED
            org.gbp_last_synced_at = datetime.utcnow()
            org.updated_at = datetime.utcnow()
            self.session.add(org)
            self.session.add(
                OnboardingEvent(
                    org_id=org.id,
                    event_type="gbp_connected",
                    event_data=json.dumps({
                        "place_id": org.gbp_place_id,
                        "location_count": len(locations),
                    }),
                )
            )
            await self.session.flush()

            # Pull live GBP insights + competitors immediately after connect
            if org.gbp_place_id:
                try:
                    sync_result = await self.sync(org.id)
                    logger.info("gbp_initial_sync", org_id=org.id, result=sync_result)
                except Exception as e:
                    logger.warning("gbp_initial_sync_failed", org_id=org.id, error=str(e))

            return {
                "status": "ok",
                "place_id": org.gbp_place_id,
                "location_count": len(locations),
                "needs_location_selection": len(locations) > 1,
                "locations": [
                    {
                        "name": loc.get("name"),
                        "title": loc.get("title") or loc.get("locationName"),
                        "store_code": loc.get("storeCode"),
                        "address": (loc.get("storefrontAddress") or {}),
                    }
                    for loc in locations
                ],
            }
        finally:
            await token_mgr.close()

    async def list_locations(self, org_id: str) -> dict[str, Any]:
        org = await self.session.get(Org, org_id)
        if not org:
            return {"status": "org_not_found", "locations": []}

        gbp = self.registry.gbp()
        try:
            loc_result = await gbp.pull(org_id, ConnectorResource.LOCATIONS)
        finally:
            await gbp.close()

        if not loc_result.ok:
            return {"status": loc_result.error or "pull_failed", "locations": []}

        locations = loc_result.data.get("locations") or []
        return {
            "status": "ok",
            "selected": org.gbp_place_id,
            "locations": [
                {
                    "name": loc.get("name"),
                    "title": loc.get("title") or loc.get("locationName"),
                    "store_code": loc.get("storeCode"),
                    "address": (loc.get("storefrontAddress") or {}),
                }
                for loc in locations
            ],
        }

    async def select_location(self, org_id: str, location_name: str) -> dict[str, Any]:
        org = await self.session.get(Org, org_id)
        if not org:
            return {"status": "org_not_found"}

        listed = await self.list_locations(org_id)
        if listed.get("status") != "ok":
            return {"status": listed.get("status", "list_failed")}

        match = next(
            (loc for loc in listed["locations"] if loc.get("name") == location_name),
            None,
        )
        if not match:
            return {"status": "location_not_found"}

        org.gbp_place_id = match["name"]
        org.gbp_name = match.get("title")
        org.gbp_status = "CONNECTED"
        org.gbp_last_synced_at = datetime.utcnow()
        org.updated_at = datetime.utcnow()
        if org.onboarding_status == OnboardingStatus.CREATED:
            org.onboarding_status = OnboardingStatus.GBP_CONNECTED
        self.session.add(org)
        await self.session.flush()
        return {
            "status": "ok",
            "place_id": org.gbp_place_id,
            "gbp_name": org.gbp_name,
        }

    async def search_places(
        self,
        org_id: str,
        query: str,
        *,
        included_type: str | None = None,
    ) -> dict[str, Any]:
        """Search Google Places for a business to link (public data, API key only)."""
        settings = get_settings()
        key = (settings.google_places_api_key or "").strip()
        if not key or key.startswith("your-"):
            return {"status": "places_api_not_configured", "results": []}

        org = await self.session.get(Org, org_id)
        if not org:
            return {"status": "org_not_found", "results": []}

        client = GbpClient(
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
            redirect_uri=settings.google_redirect_uri,
        )
        try:
            category = org.category.value if hasattr(org.category, "value") else str(org.category)
            q = query.strip() or f"{org.name} {org.city or ''} bakery".strip()
            places = await client.search_places_text(
                key,
                q,
                latitude=org.latitude,
                longitude=org.longitude,
                included_type=included_type or ("bakery" if category == "bakery" else None),
            )
            results = []
            for p in places:
                display = p.get("displayName") or {}
                name = display.get("text") if isinstance(display, dict) else str(display or "")
                results.append(
                    {
                        "place_id": p.get("id"),
                        "name": name,
                        "address": p.get("formattedAddress"),
                        "rating": p.get("rating"),
                        "review_count": p.get("userRatingCount"),
                        "maps_uri": p.get("googleMapsUri"),
                        "phone": p.get("nationalPhoneNumber"),
                        "website": p.get("websiteUri"),
                        "location": p.get("location"),
                        "types": p.get("types") or [],
                    }
                )
            return {"status": "ok", "results": results, "query": q}
        except Exception as e:
            logger.exception("places_search_failed", org_id=org_id)
            return {"status": "error", "error": str(e), "results": []}
        finally:
            await client.close()

    async def link_from_places(self, org_id: str, place_id: str) -> dict[str, Any]:
        """Link a Places business and extract public profile + reviews into the tenant."""
        from src.models.gbp import GbpInsights, GbpProfileSnapshot
        from src.models.integration import IntegrationProvider, OrgIntegration
        from src.models.notification import OnboardingEvent
        from src.models.review import GbpReview, ReviewReplyStatus
        from src.utils.encryption import encrypt_value

        settings = get_settings()
        key = (settings.google_places_api_key or "").strip()
        if not key or key.startswith("your-"):
            return {"status": "places_api_not_configured"}

        org = await self.session.get(Org, org_id)
        if not org:
            return {"status": "org_not_found"}

        client = GbpClient(
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
            redirect_uri=settings.google_redirect_uri,
        )
        try:
            details = await client.get_place_details(key, place_id)
        except Exception as e:
            logger.exception("places_details_failed", org_id=org_id, place_id=place_id)
            return {"status": "places_details_failed", "error": str(e)}
        finally:
            await client.close()

        if not details:
            return {"status": "places_details_failed", "error": "empty_response"}

        display = details.get("displayName") or {}
        name = display.get("text") if isinstance(display, dict) else str(display or org.name)
        loc = details.get("location") or {}
        lat = loc.get("latitude")
        lng = loc.get("longitude")
        raw_id = details.get("id") or place_id
        # Normalize to ChIJ… form for review links when possible
        short_id = raw_id.replace("places/", "") if isinstance(raw_id, str) else place_id

        org.gbp_place_id = short_id
        org.gbp_name = name
        org.gbp_status = "PLACES_LINKED"
        org.gbp_last_synced_at = datetime.utcnow()
        org.onboarding_status = OnboardingStatus.GBP_CONNECTED
        if details.get("formattedAddress"):
            org.address = details["formattedAddress"]
        if lat is not None and lng is not None:
            org.latitude = float(lat)
            org.longitude = float(lng)
        phone = details.get("nationalPhoneNumber") or details.get("internationalPhoneNumber")
        if phone and not org.phone:
            org.phone = "".join(c for c in phone if c.isdigit())
        if details.get("websiteUri") and not org.website:
            org.website = details["websiteUri"]
        org.updated_at = datetime.utcnow()
        self.session.add(org)

        # Integration row so onboarding / connection treat this as linked
        existing = (
            await self.session.execute(
                select(OrgIntegration).where(
                    OrgIntegration.org_id == org_id,
                    OrgIntegration.provider == IntegrationProvider.GOOGLE_GBP,
                )
            )
        ).scalar_one_or_none()
        meta = json.dumps(
            {
                "source": "places",
                "places_id": raw_id,
                "maps_uri": details.get("googleMapsUri"),
                "types": details.get("types") or [],
                "primary_type": details.get("primaryType"),
                "oauth": False,
            }
        )
        if existing is None:
            existing = OrgIntegration(
                org_id=org_id,
                provider=IntegrationProvider.GOOGLE_GBP,
            )
        # Sentinel — not a real OAuth token; sync must detect places mode
        if not existing.access_token_encrypted or existing.access_token_encrypted.startswith(
            "places:"
        ) or (
            existing.metadata_json and '"source": "places"' in existing.metadata_json
        ):
            existing.access_token_encrypted = encrypt_value("places:readonly")
            existing.refresh_token_encrypted = None
            existing.expires_at = None
        existing.metadata_json = meta
        existing.updated_at = datetime.utcnow()
        self.session.add(existing)

        editorial = details.get("editorialSummary") or {}
        summary_text = (
            editorial.get("text") if isinstance(editorial, dict) else None
        ) or org.description
        types = details.get("types") or []
        snapshot = (
            await self.session.execute(
                select(GbpProfileSnapshot).where(GbpProfileSnapshot.org_id == org_id)
            )
        ).scalar_one_or_none()
        if snapshot is None:
            snapshot = GbpProfileSnapshot(org_id=org_id)
        snapshot.title = name
        snapshot.description = summary_text
        snapshot.categories_json = json.dumps(types[:12])
        snapshot.synced_at = datetime.utcnow()
        snapshot.updated_at = datetime.utcnow()
        self.session.add(snapshot)

        # Seed insights from public rating counts
        now = datetime.utcnow()
        insight = GbpInsights(
            org_id=org_id,
            period_start=now,
            period_end=now,
            recorded_at=now,
            review_count=details.get("userRatingCount"),
            avg_rating=float(details["rating"]) if details.get("rating") is not None else None,
        )
        self.session.add(insight)

        # Import public reviews
        reviews_in = details.get("reviews") or []
        imported = 0
        for rev in reviews_in[:20]:
            author = rev.get("authorAttribution") or {}
            reviewer = author.get("displayName") if isinstance(author, dict) else None
            rating = int(rev.get("rating") or 0)
            text_obj = rev.get("text") or {}
            comment = text_obj.get("text") if isinstance(text_obj, dict) else None
            google_id = rev.get("name") or f"places:{short_id}:{imported}:{reviewer}"
            exists = (
                await self.session.execute(
                    select(GbpReview).where(
                        GbpReview.org_id == org_id,
                        GbpReview.google_review_id == google_id,
                    )
                )
            ).scalar_one_or_none()
            if exists:
                continue
            self.session.add(
                GbpReview(
                    org_id=org_id,
                    google_review_id=google_id[:500],
                    reviewer_name=(reviewer or "Google user")[:255],
                    star_rating=max(0, min(5, rating)),
                    comment=comment,
                    reply_status=ReviewReplyStatus.PENDING,
                )
            )
            imported += 1

        self.session.add(
            OnboardingEvent(
                org_id=org_id,
                event_type="gbp_places_linked",
                event_data=json.dumps(
                    {
                        "place_id": short_id,
                        "name": name,
                        "rating": details.get("rating"),
                        "review_count": details.get("userRatingCount"),
                        "reviews_imported": imported,
                    }
                ),
            )
        )
        await self.session.flush()

        # Competitors via Places nearby (best-effort)
        competitors_result: dict[str, Any] = {}
        if org.latitude is not None and org.longitude is not None:
            try:
                places = self.registry.places()
                pull = await places.pull(org_id, ConnectorResource.COMPETITORS)
                competitors_result = await self.ingest.ingest_pull(pull)
                await places.close()
            except Exception as e:
                competitors_result = {"status": "skipped", "error": str(e)}

        logger.info(
            "places_business_linked",
            org_id=org_id,
            place_id=short_id,
            reviews=imported,
        )
        return {
            "status": "ok",
            "source": "places",
            "place_id": short_id,
            "gbp_name": name,
            "address": org.address,
            "rating": details.get("rating"),
            "review_count": details.get("userRatingCount"),
            "reviews_imported": imported,
            "maps_uri": details.get("googleMapsUri"),
            "competitors": competitors_result,
            "oauth_required_for_posts": True,
        }

    async def sync(
        self,
        org_id: str,
        resources: list[str] | None = None,
        days: int = 30,
    ) -> dict[str, Any]:
        resources = resources or ["insights", "competitors", "reviews"]
        results: dict[str, Any] = {"org_id": org_id}

        # Places-only tenants: refresh from Places instead of GBP OAuth APIs
        from src.models.integration import IntegrationProvider, OrgIntegration

        integration = (
            await self.session.execute(
                select(OrgIntegration).where(
                    OrgIntegration.org_id == org_id,
                    OrgIntegration.provider == IntegrationProvider.GOOGLE_GBP,
                )
            )
        ).scalar_one_or_none()
        meta = {}
        if integration and integration.metadata_json:
            try:
                meta = json.loads(integration.metadata_json)
            except json.JSONDecodeError:
                meta = {}
        if meta.get("source") == "places":
            org = await self.session.get(Org, org_id)
            if not org or not org.gbp_place_id:
                return {**results, "status": "places_not_linked"}
            place_id = meta.get("places_id") or org.gbp_place_id
            linked = await self.link_from_places(org_id, str(place_id))
            results["places_refresh"] = linked
            if "competitors" in resources and org.latitude is not None:
                places = self.registry.places()
                try:
                    pull = await places.pull(org_id, ConnectorResource.COMPETITORS)
                    results["competitors"] = await self.ingest.ingest_pull(pull)
                finally:
                    await places.close()
            return results

        gbp = self.registry.gbp()
        places = self.registry.places()
        try:
            if "insights" in resources:
                pull = await gbp.pull(org_id, ConnectorResource.INSIGHTS, days=days)
                results["insights"] = await self.ingest.ingest_pull(pull)

            if "reviews" in resources:
                pull = await gbp.pull(org_id, ConnectorResource.REVIEWS)
                results["reviews"] = await self.ingest.ingest_pull(pull)

            if "competitors" in resources:
                pull = await places.pull(org_id, ConnectorResource.COMPETITORS)
                results["competitors"] = await self.ingest.ingest_pull(pull)
        finally:
            await gbp.close()
            await places.close()

        return results

    async def sync_profile(self, org_id: str) -> dict[str, Any]:
        optimizer = GbpProfileOptimizer(self.session)
        try:
            return await optimizer.sync_profile(org_id)
        finally:
            await optimizer.close()

    async def optimize_profile(self, org_id: str) -> dict[str, Any]:
        optimizer = GbpProfileOptimizer(self.session)
        try:
            return await optimizer.optimize_profile(org_id)
        finally:
            await optimizer.close()

    async def apply_profile(self, org_id: str) -> dict[str, Any]:
        optimizer = GbpProfileOptimizer(self.session)
        try:
            return await optimizer.apply_optimization(org_id)
        finally:
            await optimizer.close()

    async def publish_post(self, post_id: str) -> dict[str, Any]:
        post = await self.session.get(GbpPost, post_id)
        if not post:
            return {"status": "post_not_found"}

        gbp = self.registry.gbp()
        try:
            push = await gbp.push(
                post.org_id,
                ConnectorResource.POST,
                {
                    "content": post.content,
                    "call_to_action": post.call_to_action,
                    "media_url": post.image_url,
                },
            )
            return await self.ingest.ingest_push_post(post.org_id, post_id, push)
        finally:
            await gbp.close()

    async def generate_drafts(self, org_id: str) -> dict[str, Any]:
        org = await self.session.get(Org, org_id)
        if not org:
            return {"status": "org_not_found"}

        generator = GbpPostGenerator()
        now = datetime.utcnow()
        posts_data = await generator.generate_monthly_posts(
            org=org, month=now.month, year=now.year
        )
        return await self.ingest.ingest_generated_posts(org_id, posts_data)

    async def generate_image_post(
        self,
        org_id: str,
        post_type: str = "portfolio_showcase",
        target_keyword: str | None = None,
        custom_context: str | None = None,
    ) -> dict[str, Any]:
        org = await self.session.get(Org, org_id)
        if not org:
            return {"status": "org_not_found"}

        generator = ImagePostGenerator()
        post_data = await generator.generate_image_post(
            org=org,
            post_type=post_type,
            target_keyword=target_keyword,
            custom_context=custom_context,
        )
        ingest = await self.ingest.ingest_generated_posts(org_id, [post_data])
        post_ids = ingest.get("post_ids") or []
        if post_ids:
            saved = await self.session.get(GbpPost, post_ids[0])
            if saved and saved.image_url:
                post_data["image_url"] = saved.image_url
        return {
            "status": "ok",
            "posts_created": ingest.get("posts_created", 0),
            "post": post_data,
            "post_id": post_ids[0] if post_ids else None,
        }
