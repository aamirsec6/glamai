"""Google Business Profile API client.

Handles interaction with Google's Business Profile API (formerly GMB API).
Uses OAuth2 for authentication.

API docs: https://developers.google.com/my-business

IMPORTANT limitations:
- We can ONLY manage the GBP of orgs that have granted us OAuth access
- Rank tracking is NOT available via API
- Post creation is supported but limited to certain types
- Insights data is available but limited
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

logger = structlog.get_logger(__name__)

# Google Business Profile API base URL
GBP_API_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1"
GBP_API_ACCOUNTS = "https://mybusiness.googleapis.com/v4"


class GbpClient:
    """Client for Google Business Profile API.

    Handles:
    - Account/location discovery (after OAuth)
    - Post creation and management
    - Insights retrieval
    - Review listing
    - Photo management

    Note: Each org must complete OAuth flow to grant access to their GBP.
    """

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self._client = httpx.AsyncClient(timeout=30.0)

    async def close(self) -> None:
        await self._client.aclose()

    # ── OAuth Flow ────────────────────────────────────────────

    def get_oauth_url(self, state: str) -> str:
        """Generate OAuth2 authorization URL for GBP access."""
        scopes = [
            "https://www.googleapis.com/auth/business.manage",
        ]
        return (
            f"https://accounts.google.com/o/oauth2/v2/auth"
            f"?client_id={self.client_id}"
            f"&redirect_uri={self.redirect_uri}"
            f"&response_type=code"
            f"&scope={' '.join(scopes)}"
            f"&state={state}"
            f"&access_type=offline"
            f"&prompt=consent"
        )

    async def exchange_code(self, code: str) -> dict[str, Any]:
        """Exchange OAuth authorization code for tokens."""
        payload = {
            "code": code,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
        }

        response = await self._client.post(
            "https://oauth2.googleapis.com/token",
            data=payload,
        )
        response.raise_for_status()
        return response.json()

    async def refresh_token(self, refresh_token: str) -> dict[str, Any]:
        """Refresh an expired access token."""
        payload = {
            "refresh_token": refresh_token,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token",
        }

        response = await self._client.post(
            "https://oauth2.googleapis.com/token",
            data=payload,
        )
        response.raise_for_status()
        return response.json()

    # ── Locations ─────────────────────────────────────────────

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def list_locations(
        self,
        access_token: str,
        account_id: str = "accounts/~0",
    ) -> list[dict[str, Any]]:
        """List all business locations for an account."""
        response = await self._client.get(
            f"{GBP_API_ACCOUNTS}/{account_id}/locations",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"pageSize": 100},
        )
        response.raise_for_status()
        data = response.json()
        return data.get("locations", [])

    async def get_location(
        self,
        access_token: str,
        location_name: str,  # Format: "locations/{location_id}"
    ) -> dict[str, Any]:
        """Get details of a specific location."""
        response = await self._client.get(
            f"{GBP_API_BASE}/{location_name}",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        return response.json()

    # ── Posts ─────────────────────────────────────────────────

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def create_post(
        self,
        access_token: str,
        location_name: str,  # Format: "locations/{location_id}"
        content: str,
        topic_type: str = "STANDARD",
        call_to_action: str | None = None,
        media_url: str | None = None,
    ) -> dict[str, Any]:
        """Create a Google Business Profile post.

        Args:
            access_token: OAuth2 access token
            location_name: Google's location resource name
            content: Post text content (max 1500 chars)
            topic_type: STANDARD, OFFER, EVENT, or UPDATE
            call_to_action: LEARN_MORE, BOOK, CALL, etc.
            media_url: URL of media to attach

        Returns:
            Created post data from Google API
        """
        post_data = {
            "languageCode": "en",
            "topicType": topic_type,
            "summary": content[:1500],
        }

        if call_to_action:
            post_data["callToAction"] = {
                "actionType": call_to_action,
                "url": "",  # Required even if empty for some action types
            }

        if media_url:
            post_data["media"] = [
                {
                    "mediaFormat": "PHOTO",
                    "sourceUrl": media_url,
                }
            ]

        # Create post using local actions API
        response = await self._client.post(
            f"{GBP_API_ACCOUNTS}/{location_name}:createLocalPost",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=post_data,
        )
        response.raise_for_status()
        return response.json()

    async def list_posts(
        self,
        access_token: str,
        location_name: str,
    ) -> list[dict[str, Any]]:
        """List all posts for a location."""
        response = await self._client.get(
            f"{GBP_API_ACCOUNTS}/{location_name}/localPosts",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"pageSize": 100},
        )
        response.raise_for_status()
        return response.json().get("localPosts", [])

    # ── Insights ──────────────────────────────────────────────

    async def get_insights(
        self,
        access_token: str,
        location_name: str,
        days: int = 30,
    ) -> dict[str, Any]:
        """Get GBP insights for a location.

        Available metrics:
        - QUERIES_DIRECT: Direct searches (business name)
        - QUERIES_INDIRECT: Discovery searches ("interior designer near me")
        - VIEWS_MAPS: Map views
        - VIEWS_SEARCH: Search views
        - ACTIONS_WEBSITE: Website clicks
        - ACTIONS_PHONE: Phone calls
        - ACTIONS_DIRECTIONS: Direction requests
        - PHOTOS_VIEWS: Photo views
        """
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        request_body = {
            "locationNames": [location_name],
            "basicRequest": {
                "metricRequests": [
                    {"metric": "QUERIES_DIRECT"},
                    {"metric": "QUERIES_INDIRECT"},
                    {"metric": "VIEWS_MAPS"},
                    {"metric": "VIEWS_SEARCH"},
                    {"metric": "ACTIONS_WEBSITE"},
                    {"metric": "ACTIONS_PHONE"},
                    {"metric": "ACTIONS_DIRECTIONS"},
                    {"metric": "PHOTOS_VIEWS"},
                ],
                "timeRange": {
                    "startTime": start_date.isoformat() + "Z",
                    "endTime": end_date.isoformat() + "Z",
                },
            },
        }

        response = await self._client.post(
            f"{GBP_API_ACCOUNTS}/locations:reportInsights",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=request_body,
        )
        response.raise_for_status()
        return response.json()

    # ── Reviews ───────────────────────────────────────────────

    async def list_reviews(
        self,
        access_token: str,
        location_name: str,
    ) -> list[dict[str, Any]]:
        """List all reviews for a location."""
        response = await self._client.get(
            f"{GBP_API_ACCOUNTS}/{location_name}/reviews",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"pageSize": 50, "orderBy": "updateTime desc"},
        )
        response.raise_for_status()
        return response.json().get("reviews", [])

    async def reply_to_review(
        self,
        access_token: str,
        review_name: str,
        reply_text: str,
    ) -> dict[str, Any]:
        """Reply to a review."""
        response = await self._client.put(
            f"{GBP_API_ACCOUNTS}/{review_name}/reply",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={"comment": reply_text},
        )
        response.raise_for_status()
        return response.json()

    # ── Competitor Lookup (via Places API) ────────────────────

    async def search_competitors(
        self,
        place_api_key: str,
        query: str,
        latitude: float,
        longitude: float,
        radius_meters: int = 5000,
    ) -> list[dict[str, Any]]:
        """Search for competing businesses using Google Places API.

        Note: This uses the Places API (not GBP API).
        Requires a separate Places API key.
        """
        # Using Places API New (v1)
        response = await self._client.post(
            "https://places.googleapis.com/v1/places:searchNearby",
            headers={
                "X-Goog-Api-Key": place_api_key,
                "X-Goog-FieldMask": "places.displayName,places.id,placeFormattedAddress,places.rating,placeUserRatingCount,places.photos",
            },
            json={
                "includedTypes": ["interior_designer", "interior_design_company"],
                "maxResultCount": 20,
                "locationRestriction": {
                    "circle": {
                        "center": {
                            "latitude": latitude,
                            "longitude": longitude,
                        },
                        "radius": radius_meters,
                    }
                },
            },
        )
        response.raise_for_status()
        return response.json().get("places", [])
