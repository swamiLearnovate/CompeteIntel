from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, List, Optional

from anthropic import Anthropic
from pydantic import BaseModel, Field, ValidationError

from app.core.config import settings


class ProductAnalysis(BaseModel):
    product_name: str = Field(..., description="Target product name")
    website_url: str = Field(..., description="Target product website URL")
    category: str = Field(..., description="Product category")

    target_users: List[str] = Field(
        default_factory=list,
        description="Likely customer segments"
    )

    core_features: List[str] = Field(
        default_factory=list,
        description="Main features of the product"
    )

    value_proposition: str = Field(
        ...,
        description="What the product claims to solve or improve"
    )

    competitive_edge: str = Field(
        ...,
        description="Why this product may stand out"
    )

    likely_competitors: List[str] = Field(
        default_factory=list,
        description="Likely rival products"
    )

    pricing_observations: List[str] = Field(
        default_factory=list,
        description="Any pricing signals observed or inferred"
    )

    market_gaps: List[str] = Field(
        default_factory=list,
        description="Underserved needs or opportunities"
    )

    strategic_positioning: str = Field(
        ...,
        description="Suggested positioning direction"
    )

    confidence: str = Field(
        ...,
        description="low, medium, or high"
    )

    notes: List[str] = Field(
        default_factory=list,
        description="Any caveats or assumptions"
    )


@dataclass
class AnalyzerResult:
    analysis: ProductAnalysis
    raw_text: str


class ProductAnalyzer:
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:

        self.client = Anthropic(
            api_key=api_key or settings.ANTHROPIC_API_KEY
        )

        self.model = model or settings.ANTHROPIC_MODEL

    def analyze(
        self,
        product_name: str,
        website_url: str,
        website_text: str,
        extra_context: Optional[str] = None,
    ) -> AnalyzerResult:

        prompt = self._build_prompt(
            product_name=product_name,
            website_url=website_url,
            website_text=website_text,
            extra_context=extra_context,
        )

        response = self.client.messages.create(
            model=self.model,
            max_tokens=2500,
            temperature=0.2,
            system="""
You are a market intelligence analyst.

Return ONLY valid JSON.

Do not return markdown.
Do not return explanations.
Do not wrap the JSON in code blocks.
""",
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
            analysis = ProductAnalysis.model_validate(payload)

        except ValidationError as exc:
            raise ValueError(
                f"Model output did not match ProductAnalysis schema: {exc}"
            ) from exc

        return AnalyzerResult(
            analysis=analysis,
            raw_text=raw_text,
        )

    def analyze_as_dict(
        self,
        product_name: str,
        website_url: str,
        website_text: str,
        extra_context: Optional[str] = None,
    ) -> dict[str, Any]:

        result = self.analyze(
            product_name=product_name,
            website_url=website_url,
            website_text=website_text,
            extra_context=extra_context,
        )

        return {
            "analysis": result.analysis.model_dump(),
            "raw_text": result.raw_text,
        }

    def _build_prompt(
        self,
        product_name: str,
        website_url: str,
        website_text: str,
        extra_context: Optional[str] = None,
    ) -> str:

        context_block = (
            f"\nExtra context:\n{extra_context}\n"
            if extra_context
            else ""
        )

        return f"""
You are a market intelligence analyst for a product strategy platform.

Analyze the product below and return ONLY valid JSON matching this schema:

{{
  "product_name": "string",
  "website_url": "string",
  "category": "string",
  "target_users": ["string"],
  "core_features": ["string"],
  "value_proposition": "string",
  "competitive_edge": "string",
  "likely_competitors": ["string"],
  "pricing_observations": ["string"],
  "market_gaps": ["string"],
  "strategic_positioning": "string",
  "confidence": "low|medium|high",
  "notes": ["string"]
}}

Rules:
- Return valid JSON only
- No markdown
- No explanations
- No code fences
- Keep language concise
- Make reasonable business inferences

Product name: {product_name}

Website URL: {website_url}

Website content:
{website_text}

{context_block}
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

            candidate = text[start:end + 1]

            try:
                return json.loads(candidate)

            except json.JSONDecodeError:
                pass

        raise ValueError(
            "Could not parse valid JSON from model output."
        )