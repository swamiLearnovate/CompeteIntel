from __future__ import annotations

import ast
import json
import logging
import re
from dataclasses import dataclass
from typing import Any, List, Optional

from app.core.openai_client_factory import get_openai_client
from pydantic import BaseModel, Field, ValidationError

from app.core.config import settings

logger = logging.getLogger(__name__)


class ProductAnalysis(BaseModel):
    product_name: str = Field(..., description="Target product name")
    website_url: str = Field(..., description="Target website URL")

    category: str = Field(
        ...,
        description="Primary product category"
    )

    target_users: List[str] = Field(
        default_factory=list,
        description="Likely customer segments"
    )

    core_features: List[str] = Field(
        default_factory=list,
        description="Main product features"
    )

    confidence: str = Field(
        ...,
        description="low, medium, or high"
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
        self.client = get_openai_client()
        self.model = model or settings.OPEN_AI_MODEL

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

        last_error = None

        for attempt in range(1, 4):

            try:

                logger.info(
                    "Product analysis attempt %s/3 | product=%s",
                    attempt,
                    product_name,
                )

                response = self.client.responses.create(
                    model=self.model,
                    input=prompt,
                    temperature=0.1,
                    max_output_tokens=4000,
                )

                if response.status != "completed":

                    error_msg = (
                        f"API response generation failed with "
                        f"status '{response.status}'."
                    )

                    if getattr(response, "error", None):
                        error_msg += (
                            f" Error details: {response.error}"
                        )

                    raise ValueError(error_msg)

                raw_text = (
                    getattr(response, "output_text", "")
                    or ""
                )

                if not raw_text.strip():

                    response_dump = (
                        response.model_dump()
                        if hasattr(response, "model_dump")
                        else str(response)
                    )

                    raise ValueError(
                        f"Empty response returned by model. "
                        f"Response: {response_dump}"
                    )

                payload = self._extract_json(raw_text)

                analysis = ProductAnalysis.model_validate(
                    payload
                )

                logger.info(
                    "Product analysis successful on attempt %s",
                    attempt,
                )

                return AnalyzerResult(
                    analysis=analysis,
                    raw_text=raw_text,
                )

            except Exception as exc:

                last_error = exc

                logger.warning(
                    "Product analysis attempt %s failed: %s",
                    attempt,
                    str(exc),
                )

        logger.error(
            "Product analysis failed after 3 attempts"
        )

        raise ValueError(
            f"Product analysis failed after 3 attempts. "
            f"Last error: {last_error}"
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

    def analyze_swot(
        self,
        company_name: str,
        website_text: str,
    ) -> dict[str, Any]:

        prompt = f"""
You are a strategic business analyst.
Generate a SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) for the company '{company_name}' based on their website text.

Return ONLY valid JSON matching this schema:
{{
  "strengths": ["string"],
  "weaknesses": ["string"],
  "opportunities": ["string"],
  "threats": ["string"]
}}

Rules:
- Do not wrap the JSON in markdown.
- Do not add commentary.
- Return at most 5 items per SWOT category.
- Focus on commercial and strategic factors.

Website content:
{website_text[:8000]}
""".strip()

        response = self.client.responses.create(
            model=self.model,
            input=prompt,
            temperature=0.2,
        )

        if response.status != "completed":
            raise ValueError(f"SWOT analysis failed: {response.status}")

        raw_text = getattr(response, "output_text", "") or ""
        if not raw_text.strip():
            raise ValueError("Empty SWOT response from model.")

        return self._extract_json(raw_text)

    def analyze_gaps(
        self,
        product_name: str,
        company_name: str,
        website_text: str,
        competitors: List[dict],
    ) -> dict[str, Any]:

        competitors_summary = ""
        if competitors:
            competitors_summary = "Discovered Competitors:\n" + "\n".join(
                f"- {c.get('name') or c.get('company_name') or 'Unnamed competitor'}: {c.get('reason') or c.get('category') or 'Relevant competitor'}"
                for c in competitors
            )

        prompt = f"""
You are a senior market intelligence strategist.
Analyze the target product/company and its position in the market relative to its competitors. Identify market gaps (areas underserved, potential differentiators, or feature opportunities) and provide strategic insights.

Target Product: {product_name}
Company Name: {company_name or 'this company'}

{competitors_summary}

Website content:
{website_text[:8000]}

Return ONLY valid JSON matching this schema:
{{
  "market_gaps": ["string"],
  "insights": ["string"]
}}

Rules:
- Do not wrap the JSON in markdown.
- Do not add commentary outside the JSON.
- Provide 3 to 6 high-quality, specific market gaps.
- Provide 3 to 6 actionable strategic insights/notes.
- Base your analysis on the website text and competitors.
""".strip()

        response = self.client.responses.create(
            model=self.model,
            input=prompt,
            temperature=0.2,
        )

        if response.status != "completed":
            raise ValueError(f"Market gaps analysis failed: {response.status}")

        raw_text = getattr(response, "output_text", "") or ""
        if not raw_text.strip():
            raise ValueError("Empty response from model.")

        return self._extract_json(raw_text)

    def analyze_details(
        self,
        product_name: str,
        company_name: str,
        website_text: str,
    ) -> dict[str, Any]:

        prompt = f"""
You are a senior product marketing manager and business strategist.
Analyze the target product/company based on their website text and generate detailed business positioning insights.

Target Product: {product_name}
Company Name: {company_name or 'this company'}

Website content:
{website_text[:8000]}

Return ONLY valid JSON matching this schema:
{{
  "value_proposition": "string",
  "competitive_edge": "string",
  "strategic_positioning": "string",
  "executive_summary": "string"
}}

Rules:
- Do not wrap the JSON in markdown.
- Do not add commentary outside the JSON.
- Provide a clear, compelling value proposition (1-2 sentences).
- Identify their competitive edge (what unique advantages they have) (1-2 sentences).
- Outline their strategic positioning in the market (1-2 sentences).
- Write a concise executive summary/market summary of the product (3-4 sentences).
""".strip()

        response = self.client.responses.create(
            model=self.model,
            input=prompt,
            temperature=0.2,
        )

        if response.status != "completed":
            raise ValueError(f"Product details analysis failed: {response.status}")

        raw_text = getattr(response, "output_text", "") or ""
        if not raw_text.strip():
            raise ValueError("Empty response from model.")

        return self._extract_json(raw_text)

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

        trimmed_content = website_text[:4000]

        return f"""
You are a product classification analyst.

Analyze the product and return ONLY valid JSON.

Schema:

{{
  "product_name": "string",
  "website_url": "string",
  "category": "string",
  "target_users": ["string"],
  "core_features": ["string"],
  "confidence": "low|medium|high"
}}

Rules:
- Return JSON only.
- No markdown.
- No explanations.
- Keep responses concise.
- Return at most 5 target users.
- Return at most 10 core features.

Product Name:
{product_name}

Website URL:
{website_url}

Website Content:
{trimmed_content}

{context_block}
""".strip()

    def _extract_json(self, text: str) -> dict[str, Any]:

        text = text.strip()

        if text.startswith("```"):
            first_line_end = text.find("\n")

            if first_line_end != -1:
                text = text[first_line_end:].strip()

            if text.endswith("```"):
                text = text[:-3].strip()

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

            cleaned = re.sub(
                r',\s*([\]}])',
                r'\1',
                candidate,
            )

            try:
                return json.loads(cleaned)

            except json.JSONDecodeError:
                pass

            pythonic = (
                candidate
                .replace("true", "True")
                .replace("false", "False")
                .replace("null", "None")
            )

            try:
                val = ast.literal_eval(pythonic)

                if isinstance(val, dict):
                    return val

            except Exception:
                pass

        raise ValueError(
            "Could not parse valid JSON from model output."
        )