from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from app.services.cache_service import CacheService
from app.services.competitor_discovery import CompetitorDiscovery
from app.services.product_analyzer import ProductAnalyzer
from app.services.website_scraper import WebsiteScraper

logger = logging.getLogger(__name__)


@dataclass
class MarketMindPipelineResult:
    scraped_data: dict
    analysis: dict
    competitor_discovery: dict


class MarketMindPipeline:
    def __init__(self) -> None:
        self.scraper = WebsiteScraper()
        self.analyzer = ProductAnalyzer()
        self.discovery = CompetitorDiscovery()
        self.cache = CacheService()

    def run(
        self,
        product_name: str,
        website_url: str,
        competitor_region: str,
        extra_context: Optional[str] = None,
        company_name: Optional[str] = None,
    ) -> MarketMindPipelineResult:

        logger.info(
            "Pipeline started | product_name=%s | company_name=%s | website_url=%s | competitor_region=%s",
            product_name,
            company_name,
            website_url,
            competitor_region,
        )

        # =========================================================
        # Stage 1: Scrape Website (with cache)
        # =========================================================

        logger.info("Stage 1/3: Scraping target website")

        scraped_page = self.cache.load_scrape(
            website_url
        )

        if scraped_page:
            logger.info(
                "Loaded scraped website data from cache"
            )
        else:
            scraped_page = self.scraper.scrape_as_dict(
                website_url
            )

            self.cache.save_scrape(
                website_url,
                scraped_page,
            )

            logger.info(
                "Scraped website data saved to cache"
            )

        scraped_text = scraped_page.get(
            "text",
            "",
        )

        logger.info(
            "Target scraping completed | title=%s | text_length=%s",
            scraped_page.get("title", ""),
            len(scraped_text),
        )

        if not scraped_text.strip():
            raise ValueError(
                "Could not extract useful text from the target website."
            )

        # =========================================================
        # Stage 2: Product Analysis (with cache)
        # =========================================================

        logger.info(
            "Stage 2/3: Analyzing target product"
        )

        analysis_result = self.cache.load_analysis(
            website_url
        )

        if analysis_result:
            logger.info(
                "Loaded product analysis from cache"
            )
        else:

            analysis_result = (
                self.analyzer.analyze_as_dict(
                    product_name=product_name,
                    website_url=website_url,
                    website_text=scraped_text,
                    extra_context=extra_context,
                )
            )

            self.cache.save_analysis(
                website_url,
                analysis_result,
            )

            logger.info(
                "Product analysis saved to cache"
            )

        analysis_payload = analysis_result[
            "analysis"
        ]

        logger.info(
            "Target analysis completed | category=%s | confidence=%s",
            analysis_payload.get(
                "category",
                "",
            ),
            analysis_payload.get(
                "confidence",
                "",
            ),
        )

        # =========================================================
        # Stage 3: Competitor Discovery (with cache)
        # =========================================================

        logger.info(
            "Stage 3/3: Discovering competitors"
        )

        discovery_result = (
            self.cache.load_discovery(
                website_url=website_url,
                product_name=product_name,
                competitor_region=competitor_region,
            )
        )

        if discovery_result:

            logger.info(
                "Loaded competitor discovery from cache"
            )

        else:

            discovery_result = (
                self.discovery.discover_as_dict(
                    product_name=product_name,
                    competitor_region=competitor_region,
                    product_analysis=analysis_payload,
                    website_text="",  # no longer needed
                    extra_context=extra_context,
                    company_name=company_name,
                )
            )

            self.cache.save_discovery(
                website_url=website_url,
                product_name=product_name,
                competitor_region=competitor_region,
                data=discovery_result,
            )

            logger.info(
                "Competitor discovery saved to cache"
            )

        discovery_payload = discovery_result[
            "result"
        ]

        discovered_competitors = (
            discovery_payload.get(
                "discovered_competitors",
                [],
            )
        )

        logger.info(
            "Competitors discovered before filtering: %s",
            len(discovered_competitors),
        )

        # =========================================================
        # Filter Out Target Company
        # =========================================================

        filtered_competitors = []

        for comp in discovered_competitors:

            comp_name = (
                comp.get("name", "")
                .strip()
                .lower()
            )

            if company_name:

                clean_company = (
                    company_name
                    .strip()
                    .lower()
                )

                if (
                    clean_company == comp_name
                    or clean_company in comp_name
                    or comp_name in clean_company
                ):
                    logger.info(
                        "Filtering out company itself: %s",
                        comp.get("name"),
                    )
                    continue

            filtered_competitors.append(comp)

        filtered_competitors = (
            filtered_competitors[:10]
        )

        discovery_payload[
            "discovered_competitors"
        ] = filtered_competitors

        logger.info(
            "Competitor discovery completed | competitors_found=%s",
            len(filtered_competitors),
        )

        logger.info(
            "Pipeline completed successfully | product_name=%s",
            product_name,
        )

        return MarketMindPipelineResult(
            scraped_data=scraped_page,
            analysis=analysis_payload,
            competitor_discovery=discovery_payload,
        )