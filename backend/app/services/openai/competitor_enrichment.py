from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, List, Optional, Union

from openai import OpenAI
from pydantic import BaseModel, Field, ValidationError

from app.core.config import settings
from app.services.website_scraper import WebsiteScraper

logger = logging.getLogger(__name__)


class EnrichedCompetitorItem(BaseModel):
    name: str = Field(..., description="Competitor name")
    website: Optional[str] = Field(None, description="Competitor website if known")
    category: str = Field(..., description="Competitor category")
    discovery_reason: str = Field(..., description="Why this competitor was discovered")
    discovery_confidence: str = Field(..., description="low, medium, or high")

    competitor_summary: str = Field(..., description="Short summary of the competitor")
    products_services: List[str] = Field(default_factory=list, description="Products or services offered")
    target_customers: List[str] = Field(default_factory=list, description="Likely customer segments")
    pricing_signals: List[str] = Field(default_factory=list, description="Observed or inferred pricing signals")
    strengths: List[str] = Field(default_factory=list, description="Likely strengths")
    weaknesses: List[str] = Field(default_factory=list, description="Likely weaknesses or gaps")
    positioning: str = Field(..., description="How the competitor is positioned")
    relevance_to_target: str = Field(..., description="low, medium, or high")
    notes: List[str] = Field(default_factory=list, description="Additional notes")


class CompetitorEnrichmentResult(BaseModel):
    product_name: str
    competitor_region: str
    enriched_competitors: List[EnrichedCompetitorItem] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)


@dataclass
class EnrichmentOutput:
    result: CompetitorEnrichmentResult
    raw_texts: List[str]


class CompetitorEnrichment:
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        self.client = OpenAI(api_key=api_key or settings.OPENAI_API_KEY)
        self.model = model or settings.OPENAI_MODEL
        self.scraper = WebsiteScraper()

    def enrich(
        self,
        product_name: str,
        competitor_region: str,
        product_analysis: Union[dict[str, Any], Any],
        discovered_competitors: List[Union[dict[str, Any], Any]],
        target_website_text: str = "",
        extra_context: Optional[str] = None,
    ) -> EnrichmentOutput:
        """
        Enrich each discovered competitor with website-based and AI-based intelligence.
        """
        analysis_payload = self._normalize_analysis(product_analysis)
        competitors_payload = self._normalize_competitors(discovered_competitors)

        enriched_competitors: List[EnrichedCompetitorItem] = []
        raw_texts: List[str] = []

        for competitor in competitors_payload:
            website = competitor.get("website")
            competitor_website_text = ""

            if website:
                try:
                    logger.info(
                        "Scraping competitor website | name=%s | website=%s",
                        competitor.get("name", ""),
                        website,
                    )
                    scraped = self.scraper.scrape_as_dict(str(website))
                    competitor_website_text = scraped.get("text", "")
                    logger.info(
                        "Competitor website scraped | name=%s | text_length=%s",
                        competitor.get("name", ""),
                        len(competitor_website_text),
                    )
                except Exception as exc:
                    logger.warning(
                        "Competitor scrape failed | name=%s | website=%s | error=%s",
                        competitor.get("name", ""),
                        website,
                        str(exc),
                    )

            logger.info(
                "Starting competitor enrichment | name=%s | region=%s | model=%s",
                competitor.get("name", ""),
                competitor_region,
                self.model,
            )

            prompt = self._build_prompt(
                product_name=product_name,
                competitor_region=competitor_region,
                competitor=competitor,
                product_analysis=analysis_payload,
                target_website_text=target_website_text,
                competitor_website_text=competitor_website_text,
                extra_context=extra_context,
            )

            response = self.client.responses.create(
                model=self.model,
                input=prompt,
                temperature=0.2,
            )

            raw_text = getattr(response, "output_text", "") or ""
            raw_texts.append(raw_text)
            payload = self._extract_json(raw_text)

            try:
                enriched_item = EnrichedCompetitorItem.model_validate(payload)
            except ValidationError as exc:
                raise ValueError(
                    f"Model output did not match EnrichedCompetitorItem schema for competitor '{competitor.get('name', '')}': {exc}"
                ) from exc

            enriched_competitors.append(enriched_item)

        result = CompetitorEnrichmentResult(
            product_name=product_name,
            competitor_region=competitor_region,
            enriched_competitors=enriched_competitors,
            notes=[],
        )
        return EnrichmentOutput(result=result, raw_texts=raw_texts)

    def enrich_as_dict(
        self,
        product_name: str,
        competitor_region: str,
        product_analysis: Union[dict[str, Any], Any],
        discovered_competitors: List[Union[dict[str, Any], Any]],
        target_website_text: str = "",
        extra_context: Optional[str] = None,
    ) -> dict[str, Any]:
        output = self.enrich(
            product_name=product_name,
            competitor_region=competitor_region,
            product_analysis=product_analysis,
            discovered_competitors=discovered_competitors,
            target_website_text=target_website_text,
            extra_context=extra_context,
        )
        return {
            "result": output.result.model_dump(),
            "raw_texts": output.raw_texts,
        }

    def _normalize_analysis(self, product_analysis: Union[dict[str, Any], Any]) -> dict[str, Any]:
        if isinstance(product_analysis, dict):
            return product_analysis

        if hasattr(product_analysis, "model_dump"):
            return product_analysis.model_dump()

        if hasattr(product_analysis, "__dict__"):
            return dict(product_analysis.__dict__)

        raise TypeError("product_analysis must be a dict or a Pydantic/model-like object.")

    def _normalize_competitors(
        self,
        discovered_competitors: List[Union[dict[str, Any], Any]],
    ) -> List[dict[str, Any]]:
        normalized: List[dict[str, Any]] = []

        for competitor in discovered_competitors:
            if isinstance(competitor, dict):
                normalized.append(competitor)
            elif hasattr(competitor, "model_dump"):
                normalized.append(competitor.model_dump())
            elif hasattr(competitor, "__dict__"):
                normalized.append(dict(competitor.__dict__))
            else:
                raise TypeError(
                    "Each discovered competitor must be a dict or a Pydantic/model-like object."
                )

        return normalized

    def _build_prompt(
        self,
        product_name: str,
        competitor_region: str,
        competitor: dict[str, Any],
        product_analysis: dict[str, Any],
        target_website_text: str,
        competitor_website_text: str,
        extra_context: Optional[str] = None,
    ) -> str:
        extra_context_block = f"\nExtra context:\n{extra_context}\n" if extra_context else ""

        return f"""
You are a market intelligence analyst specializing in competitor enrichment.

Your task is to deeply enrich ONE competitor for the target product.

Target product name: {product_name}
Target region: {competitor_region}

Return ONLY valid JSON matching this schema:

{{
  "name": "string",
  "website": "string or null",
  "category": "string",
  "discovery_reason": "string",
  "discovery_confidence": "low|medium|high",
  "competitor_summary": "string",
  "products_services": ["string"],
  "target_customers": ["string"],
  "pricing_signals": ["string"],
  "strengths": ["string"],
  "weaknesses": ["string"],
  "positioning": "string",
  "relevance_to_target": "low|medium|high",
  "notes": ["string"]
}}

Rules:
- Do not wrap the JSON in markdown.
- Do not add commentary outside JSON.
- If website text is available, use it carefully.
- If competitor website text is missing, infer cautiously from the competitor name, category, and discovery reason.
- Keep the output concise but useful.
- Focus on business-relevant attributes.

Competitor discovered data:
{json.dumps(competitor, indent=2)}

Product analysis:
{json.dumps(product_analysis, indent=2)}

Target website text:
{target_website_text[:12000]}

Competitor website text:
{competitor_website_text[:12000]}
{extra_context_block}
""".strip()

    def _extract_json(self, text: str) -> dict[str, Any]:
        text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = text[start : end + 1]
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass

        raise ValueError("Could not parse valid JSON from model output.")