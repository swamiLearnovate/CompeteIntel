from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, HttpUrl

from app.services.marketmind_pipeline import MarketMindPipeline
from app.services.competitor_enrichment import CompetitorEnrichment
from app.services.competitor_pricing import CompetitorPricing

router = APIRouter(prefix="/api", tags=["analysis"])
logger = logging.getLogger(__name__)


class AnalyzeProductRequest(BaseModel):
    product_name: str = Field(..., min_length=1)
    company_name: Optional[str] = None
    website_url: HttpUrl
    competitor_region: str = Field(..., min_length=1)
    extra_context: Optional[str] = None


class AnalyzeProductResponse(BaseModel):
    success: bool
    product_name: str
    website_url: str
    competitor_region: str
    scraped_data: dict
    analysis: dict
    competitor_discovery: dict
    market_insights: dict


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
            website_url=str(payload.website_url),
            competitor_region=payload.competitor_region,
            scraped_data=result.scraped_data,
            analysis=result.analysis,
            competitor_discovery=result.competitor_discovery,
            market_insights=result.market_insights,
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
        # Run Stage 4: Competitor Enrichment for this single competitor
        enrich_res = enricher.enrich_as_dict(
            product_name=payload.product_name,
            competitor_region=payload.competitor_region,
            product_analysis=payload.product_analysis,
            discovered_competitors=[payload.competitor],
            target_website_text=payload.target_website_text or "",
            extra_context=payload.extra_context,
        )
        
        enriched_list = enrich_res.get("result", {}).get("enriched_competitors", [])
        if not enriched_list:
            raise ValueError(f"Failed to enrich competitor '{payload.competitor.get('name')}'")
            
        enriched_competitor = enriched_list[0]

        # Run Stage 5: Pricing Intelligence for this single competitor
        pricing_res = pricing.analyze_as_dict(
            product_name=payload.product_name,
            competitor_region=payload.competitor_region,
            enriched_competitors=[enriched_competitor],
            extra_context=payload.extra_context,
        )
        
        pricing_list = pricing_res.get("result", {}).get("pricing_items", [])
        pricing_item = pricing_list[0] if pricing_list else None

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