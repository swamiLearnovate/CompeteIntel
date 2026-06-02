from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, List, Optional, Union

from anthropic import Anthropic
from pydantic import BaseModel, Field, ValidationError

from app.core.config import settings

logger = logging.getLogger(__name__)


class CompetitorItem(BaseModel):
    name: str = Field(..., description="Competitor or competitor archetype name")
    website: Optional[str] = Field(None, description="Competitor website if known")
    category: str = Field(..., description="Competitor category")
    reason: str = Field(..., description="Why this is a relevant competitor")
    confidence: str = Field(..., description="low, medium, or high")


class CompetitorDiscoveryResult(BaseModel):
    product_name: str
    competitor_region: str
    product_category: str
    discovered_competitors: List[CompetitorItem] = Field(default_factory=list)
    market_segments: List[str] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)


@dataclass
class DiscoveryOutput:
    result: CompetitorDiscoveryResult
    raw_text: str


class CompetitorDiscovery:
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        self.client = Anthropic(api_key=api_key or settings.ANTHROPIC_API_KEY)
        self.model = model or settings.ANTHROPIC_MODEL

    def discover(
        self,
        product_name: str,
        competitor_region: str,
        product_analysis: Union[dict[str, Any], Any],
        website_text: str = "",
        extra_context: Optional[str] = None,
        company_name: Optional[str] = None,
    ) -> DiscoveryOutput:
        analysis_payload = self._normalize_analysis(product_analysis)
        prompt = self._build_prompt(
            product_name=product_name,
            competitor_region=competitor_region,
            product_analysis=analysis_payload,
            website_text=website_text,
            extra_context=extra_context,
            company_name=company_name,
        )

        logger.info(
            "Starting competitor discovery | product_name=%s | company_name=%s | region=%s | model=%s",
            product_name,
            company_name,
            competitor_region,
            self.model,
        )

        response = self.client.messages.create(
            model=self.model,
            max_tokens=2500,
            temperature=0.2,
            system=(
                "You are a market intelligence analyst specializing in competitor discovery. "
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

        payload = self._extract_json(raw_text)

        try:
            result = CompetitorDiscoveryResult.model_validate(payload)
        except ValidationError as exc:
            raise ValueError(
                f"Model output did not match CompetitorDiscoveryResult schema: {exc}"
            ) from exc

        return DiscoveryOutput(result=result, raw_text=raw_text)

    def discover_as_dict(
        self,
        product_name: str,
        competitor_region: str,
        product_analysis: Union[dict[str, Any], Any],
        website_text: str = "",
        extra_context: Optional[str] = None,
        company_name: Optional[str] = None,
    ) -> dict[str, Any]:
        output = self.discover(
            product_name=product_name,
            competitor_region=competitor_region,
            product_analysis=product_analysis,
            website_text=website_text,
            extra_context=extra_context,
            company_name=company_name,
        )
        return {
            "result": output.result.model_dump(),
            "raw_text": output.raw_text,
        }

    def _normalize_analysis(self, product_analysis: Union[dict[str, Any], Any]) -> dict[str, Any]:
        if isinstance(product_analysis, dict):
            return product_analysis

        if hasattr(product_analysis, "model_dump"):
            return product_analysis.model_dump()

        if hasattr(product_analysis, "__dict__"):
            return dict(product_analysis.__dict__)

        raise TypeError("product_analysis must be a dict or a Pydantic/model-like object.")

    def _build_prompt(
        self,
        product_name: str,
        competitor_region: str,
        product_analysis: dict[str, Any],
        website_text: str,
        extra_context: Optional[str] = None,
        company_name: Optional[str] = None,
    ) -> str:
        extra_context_block = f"\nExtra context:\n{extra_context}\n" if extra_context else ""
        exclude_rule = ""
        if company_name:
            exclude_rule = (
                f"\n- IMPORTANT: Exclude the client company '{company_name}' from the "
                "`discovered_competitors` list, as a company cannot be its own competitor."
            )

        return f"""
You are a market intelligence analyst specializing in competitor discovery.

Your task is to identify likely competitors for the target product. Discover as many as possible, up to a maximum of 10 competitors (if available).
IMPORTANT: Focus only on competitors relevant in the region: {competitor_region}.

Use the product analysis and website text to infer:
- direct competitors operating in {competitor_region}
- adjacent competitors with meaningful presence in {competitor_region}
- alternative solutions available in {competitor_region}
- market segments the product belongs to within {competitor_region}

Return ONLY valid JSON matching this schema:

{{
  "product_name": "string",
  "competitor_region": "string",
  "product_category": "string",
  "discovered_competitors": [
    {{
      "name": "string",
      "website": "string or null",
      "category": "string",
      "reason": "string",
      "confidence": "low|medium|high"
    }}
  ],
  "market_segments": ["string"],
  "notes": ["string"]
}}

Rules:
- Do not wrap the JSON in markdown.
- Do not add commentary outside JSON.
- If you are unsure about a competitor website, set it to null.
- Prefer companies with a strong operational, sales, manufacturing, or market presence in {competitor_region}.
- Exclude competitors that are clearly outside {competitor_region} unless they have a meaningful local presence there.
- If real names are not confidently known, include competitor archetypes or supplier categories relevant to {competitor_region}.
- You must find up to 10 competitors if available to ensure discovering a comprehensive set, but prioritize sorting the list.
- Sort the `discovered_competitors` list strictly by relevance, placing the most direct and significant competitors at the top of the list.
- If fewer than 6 competitors exist in the region, return all of them.
- Confidence should reflect how strongly the competitor fits the requested region.{exclude_rule}

Target product name: {product_name}
Target region: {competitor_region}

Product analysis:
{json.dumps(product_analysis, indent=2)}

Website text:
{website_text[:12000]}
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