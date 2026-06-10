from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class CacheService:

    CACHE_ROOT = Path("cache")

    SCRAPE_DIR = CACHE_ROOT / "scraped"
    ANALYSIS_DIR = CACHE_ROOT / "analysis"
    DISCOVERY_DIR = CACHE_ROOT / "discovery"
    SWOT_DIR = CACHE_ROOT / "swot"
    GAPS_DIR = CACHE_ROOT / "gaps"
    DETAILS_DIR = CACHE_ROOT / "details"

    CACHE_DAYS = 7

    def __init__(self):

        self.SCRAPE_DIR.mkdir(
            parents=True,
            exist_ok=True,
        )

        self.ANALYSIS_DIR.mkdir(
            parents=True,
            exist_ok=True,
        )

        self.DISCOVERY_DIR.mkdir(
            parents=True,
            exist_ok=True,
        )

        self.SWOT_DIR.mkdir(
            parents=True,
            exist_ok=True,
        )

        self.GAPS_DIR.mkdir(
            parents=True,
            exist_ok=True,
        )

        self.DETAILS_DIR.mkdir(
            parents=True,
            exist_ok=True,
        )

    # =====================================================
    # INTERNAL HELPERS
    # =====================================================

    def _key(self, value: str) -> str:
        return hashlib.md5(
            value.lower().encode("utf-8")
        ).hexdigest()

    def _discovery_key(
        self,
        website_url: str,
        product_name: str,
        competitor_region: str,
    ) -> str:

        combined = (
            f"{website_url}|"
            f"{product_name}|"
            f"{competitor_region}"
        )

        return self._key(combined)

    def _is_valid(
        self,
        payload: dict,
    ) -> bool:

        timestamp = payload.get("cached_at")

        if not timestamp:
            return False

        try:
            cached_at = datetime.fromisoformat(
                timestamp
            )
        except Exception:
            return False

        return (
            datetime.utcnow() - cached_at
            < timedelta(days=self.CACHE_DAYS)
        )

    def _load_file(
        self,
        filepath: Path,
    ) -> Optional[dict]:

        try:

            if not filepath.exists():
                return None

            payload = json.loads(
                filepath.read_text(
                    encoding="utf-8"
                )
            )

            if not self._is_valid(payload):
                return None

            return payload.get("data")

        except Exception as exc:

            logger.warning(
                "Failed reading cache file %s: %s",
                filepath,
                str(exc),
            )

            return None

    def _save_file(
        self,
        filepath: Path,
        data: dict,
    ) -> None:

        try:

            payload = {
                "cached_at": datetime.utcnow().isoformat(),
                "data": data,
            }

            filepath.write_text(
                json.dumps(
                    payload,
                    indent=2,
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )

        except Exception as exc:

            logger.warning(
                "Failed writing cache file %s: %s",
                filepath,
                str(exc),
            )

    # =====================================================
    # SCRAPED DATA
    # =====================================================

    def save_scrape(
        self,
        website_url: str,
        data: dict,
    ) -> None:

        filepath = (
            self.SCRAPE_DIR
            / f"{self._key(website_url)}.json"
        )

        self._save_file(
            filepath,
            data,
        )

    def load_scrape(
        self,
        website_url: str,
    ) -> Optional[dict]:

        filepath = (
            self.SCRAPE_DIR
            / f"{self._key(website_url)}.json"
        )

        return self._load_file(filepath)

    # =====================================================
    # PRODUCT ANALYSIS
    # =====================================================

    def save_analysis(
        self,
        website_url: str,
        data: dict,
    ) -> None:

        filepath = (
            self.ANALYSIS_DIR
            / f"{self._key(website_url)}.json"
        )

        self._save_file(
            filepath,
            data,
        )

    def load_analysis(
        self,
        website_url: str,
    ) -> Optional[dict]:

        filepath = (
            self.ANALYSIS_DIR
            / f"{self._key(website_url)}.json"
        )

        return self._load_file(filepath)

    # =====================================================
    # COMPETITOR DISCOVERY
    # =====================================================

    def save_discovery(
        self,
        website_url: str,
        product_name: str,
        competitor_region: str,
        data: dict,
    ) -> None:

        cache_key = self._discovery_key(
            website_url,
            product_name,
            competitor_region,
        )

        filepath = (
            self.DISCOVERY_DIR
            / f"{cache_key}.json"
        )

        self._save_file(
            filepath,
            data,
        )

    def load_discovery(
        self,
        website_url: str,
        product_name: str,
        competitor_region: str,
    ) -> Optional[dict]:

        cache_key = self._discovery_key(
            website_url,
            product_name,
            competitor_region,
        )

        filepath = (
            self.DISCOVERY_DIR
            / f"{cache_key}.json"
        )

        return self._load_file(filepath)

    # =====================================================
    # SWOT ANALYSIS
    # =====================================================

    def save_swot(
        self,
        website_url: str,
        data: dict,
    ) -> None:

        filepath = (
            self.SWOT_DIR
            / f"{self._key(website_url)}.json"
        )

        self._save_file(
            filepath,
            data,
        )

    def load_swot(
        self,
        website_url: str,
    ) -> Optional[dict]:

        filepath = (
            self.SWOT_DIR
            / f"{self._key(website_url)}.json"
        )

        return self._load_file(filepath)

    # =====================================================
    # MARKET GAPS & INSIGHTS
    # =====================================================

    def save_gaps(
        self,
        website_url: str,
        data: dict,
    ) -> None:

        filepath = (
            self.GAPS_DIR
            / f"{self._key(website_url)}.json"
        )

        self._save_file(
            filepath,
            data,
        )

    def load_gaps(
        self,
        website_url: str,
    ) -> Optional[dict]:

        filepath = (
            self.GAPS_DIR
            / f"{self._key(website_url)}.json"
        )

        return self._load_file(filepath)

    # =====================================================
    # PRODUCT DETAILS
    # =====================================================

    def save_details(
        self,
        website_url: str,
        data: dict,
    ) -> None:

        filepath = (
            self.DETAILS_DIR
            / f"{self._key(website_url)}.json"
        )

        self._save_file(
            filepath,
            data,
        )

    def load_details(
        self,
        website_url: str,
    ) -> Optional[dict]:

        filepath = (
            self.DETAILS_DIR
            / f"{self._key(website_url)}.json"
        )

        return self._load_file(filepath)