from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, List, Optional, Union

from anthropic import Anthropic
from pydantic import BaseModel, Field, ValidationError

from app.core.config import settings
from app.services.website_scraper import WebsiteScraper

logger = logging.getLogger(__name__)


class CompetitorPricingItem(BaseModel):
    competitor_name: str
    website: Optional[str] = None
    source_url: Optional[str] = None
    source_type: str = Field(..., description="website | marketplace | pdf | distributor | unknown")

    pricing_model: str = Field(
        ...,
        description="fixed | range | quote_based | marketplace_based | unknown",
    )
    price_visibility: str = Field(
        ...,
        description="public | partial | hidden | unknown",
    )
    market_positioning: str = Field(
        ...,
        description="premium | mid | budget | industrial | enterprise | unknown",
    )

    currency: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    unit: Optional[str] = None

    bulk_pricing_available: bool = False
    quote_required: bool = False

    marketplace_presence: List[str] = Field(default_factory=list)
    pricing_signals: List[str] = Field(default_factory=list)
    confidence: str = Field(..., description="low | medium | high")
    notes: List[str] = Field(default_factory=list)


class CompetitorPricingResult(BaseModel):
    product_name: str
    competitor_region: str
    pricing_items: List[CompetitorPricingItem] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)


@dataclass
class PricingOutput:
    result: CompetitorPricingResult
    raw_texts: List[str]


class CompetitorPricing:
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        self.client = Anthropic(api_key=api_key or settings.ANTHROPIC_API_KEY)
        self.model = model or settings.ANTHROPIC_MODEL
        self.scraper = WebsiteScraper()

    def analyze(
        self,
        product_name: str,
        competitor_region: str,
        enriched_competitors: List[Union[dict[str, Any], Any]],
        extra_context: Optional[str] = None,
    ) -> PricingOutput:
        """
        Extract pricing intelligence signals for each competitor.
        """
        competitors_payload = self._normalize_competitors(enriched_competitors)
        pricing_items: List[CompetitorPricingItem] = []
        raw_texts: List[str] = []

        for competitor in competitors_payload:
            competitor_name = competitor.get("name", "Unknown competitor")
            website = competitor.get("website")
            competitor_website_text = ""

            if website:
                try:
                    logger.info(
                        "Scraping competitor website for pricing | name=%s | website=%s",
                        competitor_name,
                        website,
                    )
                    scraped = self.scraper.scrape_as_dict(str(website))
                    competitor_website_text = scraped.get("text", "")
                    logger.info(
                        "Competitor pricing scrape completed | name=%s | text_length=%s",
                        competitor_name,
                        len(competitor_website_text),
                    )
                except Exception as exc:
                    logger.warning(
                        "Competitor pricing scrape failed | name=%s | website=%s | error=%s",
                        competitor_name,
                        website,
                        str(exc),
                    )

            logger.info(
                "Starting pricing intelligence analysis | name=%s | region=%s | model=%s",
                competitor_name,
                competitor_region,
                self.model,
            )

            prompt = self._build_prompt(
                product_name=product_name,
                competitor_region=competitor_region,
                competitor=competitor,
                competitor_website_text=competitor_website_text,
                extra_context=extra_context,
            )

            response = self.client.messages.create(
                model=self.model,
                max_tokens=2500,
                temperature=0.2,
                system=(
                    "You are a pricing intelligence analyst. "
                    "Return only valid JSON."
                ),
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
            )

            raw_text = ""
            for block in response.content:
                if block.type == "text":
                    raw_text += block.text

            raw_texts.append(raw_text)

            payload = self._extract_json(raw_text)
            payload = self._normalize_payload(payload)

            try:
                pricing_item = CompetitorPricingItem.model_validate(payload)
            except ValidationError as exc:
                raise ValueError(
                    f"Model output did not match CompetitorPricingItem schema for competitor '{competitor_name}': {exc}"
                ) from exc

            pricing_items.append(pricing_item)

        result = CompetitorPricingResult(
            product_name=product_name,
            competitor_region=competitor_region,
            pricing_items=pricing_items,
            notes=[],
        )

        return PricingOutput(result=result, raw_texts=raw_texts)

    def analyze_as_dict(
        self,
        product_name: str,
        competitor_region: str,
        enriched_competitors: List[Union[dict[str, Any], Any]],
        extra_context: Optional[str] = None,
    ) -> dict[str, Any]:
        output = self.analyze(
            product_name=product_name,
            competitor_region=competitor_region,
            enriched_competitors=enriched_competitors,
            extra_context=extra_context,
        )
        return {
            "result": output.result.model_dump(),
            "raw_texts": output.raw_texts,
        }

    def _normalize_competitors(
        self,
        enriched_competitors: List[Union[dict[str, Any], Any]],
    ) -> List[dict[str, Any]]:
        normalized: List[dict[str, Any]] = []

        for competitor in enriched_competitors:
            if isinstance(competitor, dict):
                normalized.append(competitor)
            elif hasattr(competitor, "model_dump"):
                normalized.append(competitor.model_dump())
            elif hasattr(competitor, "__dict__"):
                normalized.append(dict(competitor.__dict__))
            else:
                raise TypeError(
                    "Each enriched competitor must be a dict or a Pydantic/model-like object."
                )

        return normalized

    def _build_prompt(
        self,
        product_name: str,
        competitor_region: str,
        competitor: dict[str, Any],
        competitor_website_text: str,
        extra_context: Optional[str] = None,
    ) -> str:
        extra_context_block = f"\nExtra context:\n{extra_context}\n" if extra_context else ""

        return f"""
You are a pricing intelligence analyst.

Your task is to extract pricing intelligence for ONE competitor.

Target product name: {product_name}
Target region: {competitor_region}

Return ONLY valid JSON matching this schema:

{{
  "competitor_name": "string",
  "website": "string or null",
  "source_url": "string or null",
  "source_type": "website|marketplace|pdf|distributor|unknown",
  "pricing_model": "fixed|range|quote_based|marketplace_based|unknown",
  "price_visibility": "public|partial|hidden|unknown",
  "market_positioning": "premium|mid|budget|industrial|enterprise|unknown",
  "currency": "string or null",
  "price_min": number or null,
  "price_max": number or null,
  "unit": "string or null",
  "bulk_pricing_available": true or false,
  "quote_required": true or false,
  "marketplace_presence": ["string"],
  "pricing_signals": ["string"],
  "confidence": "low|medium|high",
  "notes": ["string"]
}}

Rules:
- Do not wrap the JSON in markdown.
- Do not add commentary outside JSON.
- If the competitor has no public price, set pricing_model to quote_based or unknown.
- If you cannot verify a price, leave price_min and price_max as null.
- Extract pricing signals such as "request a quote", "MOQ", "bulk order", "starting from", "dealer price", or "contact sales".
- Prefer public, observable pricing evidence.
- Do not invent exact prices.
- Keep the output concise and useful for strategy.

Competitor data:
{json.dumps(competitor, indent=2)}

Competitor website text:
{competitor_website_text[:12000]}
{extra_context_block}
""".strip()

    def _normalize_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        normalized = dict(payload)

        for key in ("marketplace_presence", "pricing_signals", "notes"):
            normalized[key] = self._ensure_list(normalized.get(key))

        normalized["bulk_pricing_available"] = bool(normalized.get("bulk_pricing_available", False))
        normalized["quote_required"] = bool(normalized.get("quote_required", False))

        for key in ("price_min", "price_max"):
            value = normalized.get(key)
            if isinstance(value, str):
                try:
                    normalized[key] = float(value.strip())
                except ValueError:
                    normalized[key] = None

        return normalized

    def _ensure_list(self, value: Any) -> List[str]:
        if value is None:
            return []

        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]

        if isinstance(value, str):
            text = value.strip()
            if not text:
                return []

            lines = []
            for raw_line in text.splitlines():
                line = raw_line.strip()
                if not line:
                    continue

                for prefix in ("- ", "* ", "• "):
                    if line.startswith(prefix):
                        line = line[len(prefix):].strip()
                        break

                if len(line) >= 2 and line[0].isdigit() and line[1] in {".", ")"}:
                    line = line[2:].strip()

                if line:
                    lines.append(line)

            if len(lines) > 1:
                return lines

            if ";" in text:
                parts = [part.strip() for part in text.split(";") if part.strip()]
                if parts:
                    return parts

            if "," in text and len(text.split(",")) > 1:
                parts = [part.strip() for part in text.split(",") if part.strip()]
                if parts:
                    return parts

            return [text]

        return [str(value).strip()]

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