from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from app.services.competitor_discovery import CompetitorDiscovery
from app.services.competitor_enrichment import CompetitorEnrichment
#from app.services.competitor_pricing import CompetitorPricing
from app.services.market_insights import MarketInsights
from app.services.product_analyzer import ProductAnalyzer
from app.services.website_scraper import WebsiteScraper

logger = logging.getLogger(__name__)


@dataclass
class MarketMindPipelineResult:
    scraped_data: dict
    analysis: dict
    competitor_discovery: dict
    market_insights: dict


class MarketMindPipeline:
    def __init__(self) -> None:
        self.scraper = WebsiteScraper()
        self.analyzer = ProductAnalyzer()
        self.discovery = CompetitorDiscovery()
        self.enricher = CompetitorEnrichment()
        #self.pricing = CompetitorPricing()
        self.insights = MarketInsights()

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

        logger.info("Stage 1/5: Scraping target website")
        scraped_page = self.scraper.scrape_as_dict(website_url)
        scraped_text = scraped_page.get("text", "")

        logger.info(
            "Target scraping completed | title=%s | text_length=%s",
            scraped_page.get("title", ""),
            len(scraped_text),
        )

        if not scraped_text.strip():
            raise ValueError("Could not extract useful text from the target website.")

        logger.info("Stage 2/5: Analyzing target product")
        analysis_result = self.analyzer.analyze_as_dict(
            product_name=product_name,
            website_url=website_url,
            website_text=scraped_text,
            extra_context=extra_context,
        )
        analysis_payload = analysis_result["analysis"]

        logger.info(
            "Target analysis completed | category=%s | confidence=%s",
            analysis_payload.get("category", ""),
            analysis_payload.get("confidence", ""),
        )

        logger.info("Stage 3/5: Discovering competitors")
        logger.info("check step1")
        discovery_result = self.discovery.discover_as_dict(
            product_name=product_name,
            competitor_region=competitor_region,
            product_analysis=analysis_payload,
            website_text=scraped_text,
            extra_context=extra_context,
            company_name=company_name,
        )
        discovery_payload = discovery_result["result"]
        logger.info("discovery_payload: %s", discovery_payload)

        discovered_competitors = discovery_payload.get("discovered_competitors", [])
        logger.info("discovered_competitors: %s", discovered_competitors)
        logger.info("check step2")
        # Post-discovery filtering: exclude client's company name or domain
        import urllib.parse

        target_domain = ""
        if website_url:
            try:
                parsed_url = urllib.parse.urlparse(website_url)
                target_domain = parsed_url.netloc.lower()
                if target_domain.startswith("www."):
                    target_domain = target_domain[4:]
            except Exception:
                pass
        
        logger.info("check step3")
        filtered_competitors = []
        for comp in discovered_competitors:
            comp_name = comp.get("name", "").strip().lower()
            comp_website = comp.get("website", "") or ""

            # 1. Filter out by company name matching
            if company_name:
                clean_company = company_name.strip().lower()
                if clean_company == comp_name or clean_company in comp_name or comp_name in clean_company:
                    logger.info("Filtering out competitor matching company_name: %s", comp.get("name"))
                    continue

            # 2. Filter out by website domain matching
            if target_domain and comp_website:
                try:
                    comp_parsed = urllib.parse.urlparse(comp_website if comp_website.startswith("http") else f"http://{comp_website}")
                    comp_domain = comp_parsed.netloc.lower()
                    if comp_domain.startswith("www."):
                        comp_domain = comp_domain[4:]
                    if comp_domain == target_domain:
                        logger.info("Filtering out competitor matching domain: %s (domain: %s)", comp.get("name"), comp_domain)
                        continue
                except Exception:
                    pass

            filtered_competitors.append(comp)
        logger.info("check step4")
        # Keep up to the top 6 discovered competitors (display limit)
        discovered_competitors = filtered_competitors[:6]
        discovery_payload["discovered_competitors"] = filtered_competitors[:6]

        logger.info(
            "Competitor discovery completed | competitors_found=%s (after filtering & top-6 slicing: %s)",
            len(discovery_payload.get("discovered_competitors", [])),
            len(discovered_competitors),
        )

        logger.info("Stage 5/5: Generating market insights using discovered competitors")
        # Package discovered competitors in the structure insights expects
        basic_enrichment_payload = {
            "enriched_competitors": discovered_competitors
        }
        logger.info("check step5")
        insights_result = self.insights.analyze_as_dict(
            product_name=product_name,
            competitor_region=competitor_region,
            product_analysis=analysis_payload,
            competitor_enrichment=basic_enrichment_payload,
            extra_context=extra_context,
        )
        insights_payload = insights_result["result"]
        logger.info("check step6")
        logger.info(
            "Market insights completed | differentiators=%s | gaps=%s",
            len(insights_payload.get("key_differentiators", [])),
            len(insights_payload.get("market_gaps", [])),
        )

        logger.info("Pipeline completed successfully | product_name=%s", product_name)
        logger.info("check step7")
        return MarketMindPipelineResult(
            scraped_data=scraped_page,
            analysis=analysis_payload,
            competitor_discovery=discovery_payload,
            market_insights=insights_payload,
        )