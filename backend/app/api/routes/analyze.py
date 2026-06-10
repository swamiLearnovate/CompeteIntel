from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.marketmind_pipeline import MarketMindPipeline
from app.services.competitor_enrichment import CompetitorEnrichment
from app.services.competitor_pricing import CompetitorPricing

router = APIRouter(prefix="/api", tags=["analysis"])
logger = logging.getLogger(__name__)


class AnalyzeProductRequest(BaseModel):
    product_name: str = Field(..., min_length=1)
    company_name: Optional[str] = None
    website_url: str = Field(..., min_length=1)
    competitor_region: str = Field(..., min_length=1)
    extra_context: Optional[str] = None


class AnalyzeProductResponse(BaseModel):
    success: bool
    product_name: str
    company_name: Optional[str] = None
    website_url: str
    competitor_region: str
    scraped_data: dict
    analysis: dict
    competitor_discovery: dict


@router.post("/analyze-product", response_model=AnalyzeProductResponse)
def analyze_product(payload: AnalyzeProductRequest):
    logger.info(
        "Received analyze-product request | product_name=%s | company_name=%s | website_url=%s | competitor_region=%s",
        payload.product_name,
        payload.company_name,
        payload.website_url,
        payload.competitor_region,
    )

    pipeline = MarketMindPipeline()

    try:
        result = pipeline.run(
            product_name=payload.product_name,
            company_name=payload.company_name,
            website_url=str(payload.website_url),
            competitor_region=payload.competitor_region,
            extra_context=payload.extra_context,
        )

        return AnalyzeProductResponse(
            success=True,
            product_name=payload.product_name,
            company_name=payload.company_name,
            website_url=str(payload.website_url),
            competitor_region=payload.competitor_region,
            scraped_data=result.scraped_data,
            analysis=result.analysis,
            competitor_discovery=result.competitor_discovery,
        )

    except HTTPException:
        logger.warning(
            "Request failed with HTTPException | product_name=%s | website_url=%s | region=%s",
            payload.product_name,
            payload.website_url,
            payload.competitor_region,
        )
        raise

    except Exception as exc:
        logger.exception(
            "Analysis failed | product_name=%s | website_url=%s | region=%s | error=%s",
            payload.product_name,
            payload.website_url,
            payload.competitor_region,
            str(exc),
        )

        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(exc)}",
        )


class EnrichCompetitorRequest(BaseModel):
    product_name: str
    competitor_region: str
    product_analysis: dict
    competitor: dict
    target_website_text: Optional[str] = ""
    extra_context: Optional[str] = None


class EnrichCompetitorResponse(BaseModel):
    success: bool
    enriched_competitor: dict
    pricing_item: Optional[dict] = None


@router.post("/enrich-competitor", response_model=EnrichCompetitorResponse)
def enrich_competitor(payload: EnrichCompetitorRequest):
    logger.info(
        "Received enrich-competitor request | product_name=%s | competitor=%s",
        payload.product_name,
        payload.competitor.get("name"),
    )

    enricher = CompetitorEnrichment()
    pricing = CompetitorPricing()

    try:
        # Stage 2A: Competitor Enrichment

        enrich_res = enricher.enrich_as_dict(
            product_name=payload.product_name,
            competitor_region=payload.competitor_region,
            product_analysis=payload.product_analysis,
            discovered_competitors=[payload.competitor],
            target_website_text=payload.target_website_text or "",
            extra_context=payload.extra_context,
        )

        enriched_list = (
            enrich_res
            .get("result", {})
            .get("enriched_competitors", [])
        )

        if not enriched_list:
            raise ValueError(
                f"Failed to enrich competitor "
                f"'{payload.competitor.get('name')}'"
            )

        enriched_competitor = enriched_list[0]

        # Stage 2B: Pricing Intelligence

        pricing_res = pricing.analyze_as_dict(
            product_name=payload.product_name,
            competitor_region=payload.competitor_region,
            enriched_competitors=[enriched_competitor],
            extra_context=payload.extra_context,
        )

        pricing_list = (
            pricing_res
            .get("result", {})
            .get("pricing_items", [])
        )

        pricing_item = (
            pricing_list[0]
            if pricing_list
            else None
        )

        return EnrichCompetitorResponse(
            success=True,
            enriched_competitor=enriched_competitor,
            pricing_item=pricing_item,
        )

    except Exception as exc:
        logger.exception(
            "Enrichment failed | product_name=%s | competitor=%s | error=%s",
            payload.product_name,
            payload.competitor.get("name"),
            str(exc),
        )

        raise HTTPException(
            status_code=500,
            detail=f"Enrichment failed: {str(exc)}",
        )


class SwotRequest(BaseModel):
    company_name: str
    website_url: str


class SwotResponse(BaseModel):
    success: bool
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    opportunities: list[str] = Field(default_factory=list)
    threats: list[str] = Field(default_factory=list)


@router.post("/swot-analysis", response_model=SwotResponse)
def swot_analysis(payload: SwotRequest):
    logger.info("Received swot-analysis request | company_name=%s | website_url=%s", payload.company_name, payload.website_url)

    from app.services.cache_service import CacheService
    from app.services.product_analyzer import ProductAnalyzer

    cache = CacheService()

    # 1. Try loading from cache first
    cached_swot = cache.load_swot(payload.website_url)
    if cached_swot:
        logger.info("Loaded SWOT analysis from cache | company_name=%s", payload.company_name)
        return SwotResponse(success=True, **cached_swot)

    # 2. Load scraped data
    scraped_page = cache.load_scrape(payload.website_url)
    if not scraped_page or not scraped_page.get("text", "").strip():
        from app.services.website_scraper import WebsiteScraper
        scraper = WebsiteScraper()
        try:
            scraped_page = scraper.scrape_as_dict(payload.website_url)
            cache.save_scrape(payload.website_url, scraped_page)
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to scrape website for SWOT: {str(exc)}",
            )

    scraped_text = scraped_page.get("text", "")

    # 3. Analyze SWOT using ProductAnalyzer
    analyzer = ProductAnalyzer()
    try:
        swot_data = analyzer.analyze_swot(
            company_name=payload.company_name,
            website_text=scraped_text,
        )
        # Save to cache
        cache.save_swot(payload.website_url, swot_data)

        return SwotResponse(success=True, **swot_data)

    except Exception as exc:
        logger.exception("SWOT analysis failed: %s", str(exc))
        raise HTTPException(
            status_code=500,
            detail=f"SWOT analysis failed: {str(exc)}",
        )


class GapsRequest(BaseModel):
    product_name: str
    company_name: Optional[str] = None
    website_url: str
    competitor_region: str


class GapsResponse(BaseModel):
    success: bool
    market_gaps: list[str] = Field(default_factory=list)
    insights: list[str] = Field(default_factory=list)


@router.post("/market-gaps-insights", response_model=GapsResponse)
def market_gaps_insights(payload: GapsRequest):
    logger.info("Received market-gaps-insights request | product_name=%s | website_url=%s", payload.product_name, payload.website_url)

    from app.services.cache_service import CacheService
    from app.services.product_analyzer import ProductAnalyzer

    cache = CacheService()

    # 1. Try loading from cache first
    cached_gaps = cache.load_gaps(payload.website_url)
    if cached_gaps:
        logger.info("Loaded market gaps from cache | product_name=%s", payload.product_name)
        return GapsResponse(success=True, **cached_gaps)

    # 2. Load scraped data
    scraped_page = cache.load_scrape(payload.website_url)
    if not scraped_page or not scraped_page.get("text", "").strip():
        from app.services.website_scraper import WebsiteScraper
        scraper = WebsiteScraper()
        try:
            scraped_page = scraper.scrape_as_dict(payload.website_url)
            cache.save_scrape(payload.website_url, scraped_page)
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to scrape website for gaps: {str(exc)}",
            )

    scraped_text = scraped_page.get("text", "")

    # 3. Load discovered competitors from cache
    discovery_result = cache.load_discovery(
        website_url=payload.website_url,
        product_name=payload.product_name,
        competitor_region=payload.competitor_region,
    )
    competitors = []
    if discovery_result:
        res_payload = discovery_result.get("result", {})
        competitors = res_payload.get("discovered_competitors", [])

    # 4. Analyze gaps using ProductAnalyzer
    analyzer = ProductAnalyzer()
    try:
        gaps_data = analyzer.analyze_gaps(
            product_name=payload.product_name,
            company_name=payload.company_name or "",
            website_text=scraped_text,
            competitors=competitors,
        )
        # Save to cache
        cache.save_gaps(payload.website_url, gaps_data)

        return GapsResponse(success=True, **gaps_data)

    except Exception as exc:
        logger.exception("Market gaps analysis failed: %s", str(exc))
        raise HTTPException(
            status_code=500,
            detail=f"Market gaps analysis failed: {str(exc)}",
        )


class DetailsRequest(BaseModel):
    product_name: str
    company_name: Optional[str] = None
    website_url: str


class DetailsResponse(BaseModel):
    success: bool
    value_proposition: str
    competitive_edge: str
    strategic_positioning: str
    executive_summary: str


@router.post("/product-details", response_model=DetailsResponse)
def product_details(payload: DetailsRequest):
    logger.info("Received product-details request | product_name=%s | website_url=%s", payload.product_name, payload.website_url)

    from app.services.cache_service import CacheService
    from app.services.product_analyzer import ProductAnalyzer

    cache = CacheService()

    # 1. Try loading from cache first
    cached_details = cache.load_details(payload.website_url)
    if cached_details:
        logger.info("Loaded product details from cache | product_name=%s", payload.product_name)
        return DetailsResponse(success=True, **cached_details)

    # 2. Load scraped data
    scraped_page = cache.load_scrape(payload.website_url)
    if not scraped_page or not scraped_page.get("text", "").strip():
        from app.services.website_scraper import WebsiteScraper
        scraper = WebsiteScraper()
        try:
            scraped_page = scraper.scrape_as_dict(payload.website_url)
            cache.save_scrape(payload.website_url, scraped_page)
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to scrape website for details: {str(exc)}",
            )

    scraped_text = scraped_page.get("text", "")

    # 3. Analyze details using ProductAnalyzer
    analyzer = ProductAnalyzer()
    try:
        details_data = analyzer.analyze_details(
            product_name=payload.product_name,
            company_name=payload.company_name or "",
            website_text=scraped_text,
        )
        # Save to cache
        cache.save_details(payload.website_url, details_data)

        return DetailsResponse(success=True, **details_data)

    except Exception as exc:
        logger.exception("Product details analysis failed: %s", str(exc))
        raise HTTPException(
            status_code=500,
            detail=f"Product details analysis failed: {str(exc)}",
        )