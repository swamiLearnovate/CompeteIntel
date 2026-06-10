# app/services/market_insights.py

from __future__ import annotations

import ast
import json
import logging
import re
from dataclasses import dataclass
from typing import Any, List, Optional, Union

from app.core.openai_client_factory import get_openai_client
from pydantic import BaseModel, Field, ValidationError

from app.core.config import settings

logger = logging.getLogger(__name__)

LIST_FIELDS = {
    "key_differentiators",
    "market_gaps",
    "pricing_observations",
    "target_customer_overlap",
    "strengths",
    "weaknesses",
    "opportunities",
    "threats",
    "recommended_next_steps",
    "notes",
}


class MarketInsightsResult(BaseModel):
    product_name: str
    competitor_region: str

    executive_summary: str = Field(..., description="High-level strategic summary")
    competitive_positioning: str = Field(..., description="Where the target product stands in the market")
    key_differentiators: List[str] = Field(default_factory=list)
    market_gaps: List[str] = Field(default_factory=list)
    pricing_observations: List[str] = Field(default_factory=list)
    target_customer_overlap: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    opportunities: List[str] = Field(default_factory=list)
    threats: List[str] = Field(default_factory=list)
    recommended_positioning: str = Field(..., description="Suggested market positioning")
    recommended_next_steps: List[str] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)


@dataclass
class MarketInsightsOutput:
    result: MarketInsightsResult
    raw_text: str


class MarketInsights:
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
        competitor_region: str,
        product_analysis: Union[dict[str, Any], Any],
        competitor_enrichment: Union[dict[str, Any], Any],
        extra_context: Optional[str] = None,
    ) -> MarketInsightsOutput:
        analysis_payload = self._normalize_data(product_analysis)
        enrichment_payload = self._normalize_data(competitor_enrichment)

        prompt = self._build_prompt(
            product_name=product_name,
            competitor_region=competitor_region,
            product_analysis=analysis_payload,
            competitor_enrichment=enrichment_payload,
            extra_context=extra_context,
        )

        logger.info(
            "Starting market insights generation | product_name=%s | region=%s | model=%s",
            product_name,
            competitor_region,
            self.model,
        )

        response = self.client.responses.create(
            model=self.model,
            input=prompt,
            temperature=0.2,
        )

        if response.status != "completed":
            error_msg = f"API response generation failed with status '{response.status}'."
            if getattr(response, "error", None):
                error_msg += f" Error details: {response.error}"
            logger.error(error_msg)
            raise ValueError(error_msg)

        raw_text = getattr(response, "output_text", "") or ""

        if not raw_text.strip():
            response_dump = response.model_dump() if hasattr(response, "model_dump") else str(response)
            error_msg = (
                f"Model returned an empty response for product '{product_name}' (status: {response.status}). "
                f"Full API response: {response_dump}"
            )
            logger.error(error_msg)
            raise ValueError(error_msg)

        try:
            payload = self._extract_json(raw_text)
        except Exception as exc:
            logger.error("Failed to parse JSON. Raw model response was: %r", raw_text)
            raise ValueError(f"Could not parse valid JSON from model output. Raw text: {raw_text[:500]}") from exc
        payload = self._normalize_payload(payload)

        try:
            result = MarketInsightsResult.model_validate(payload)
        except ValidationError as exc:
            raise ValueError(
                f"Model output did not match MarketInsightsResult schema: {exc}"
            ) from exc

        return MarketInsightsOutput(result=result, raw_text=raw_text)

    def analyze_as_dict(
        self,
        product_name: str,
        competitor_region: str,
        product_analysis: Union[dict[str, Any], Any],
        competitor_enrichment: Union[dict[str, Any], Any],
        extra_context: Optional[str] = None,
    ) -> dict[str, Any]:
        output = self.analyze(
            product_name=product_name,
            competitor_region=competitor_region,
            product_analysis=product_analysis,
            competitor_enrichment=competitor_enrichment,
            extra_context=extra_context,
        )
        return {
            "result": output.result.model_dump(),
            "raw_text": output.raw_text,
        }

    def _normalize_data(self, data: Union[dict[str, Any], Any]) -> dict[str, Any]:
        if isinstance(data, dict):
            return data

        if hasattr(data, "model_dump"):
            return data.model_dump()

        if hasattr(data, "__dict__"):
            return dict(data.__dict__)

        raise TypeError("Input must be a dict or a Pydantic/model-like object.")

    def _normalize_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        """
        Coerce common schema fields into the expected types before Pydantic validation.
        This prevents simple model formatting mistakes from breaking the pipeline.
        """
        normalized = dict(payload)

        for field in LIST_FIELDS:
            value = normalized.get(field)
            normalized[field] = self._ensure_list(value)

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

            # Split numbered or bullet-style text into multiple items.
            lines = []
            for raw_line in text.splitlines():
                line = raw_line.strip()
                if not line:
                    continue

                # Remove common bullet/number prefixes.
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

            # Fallback: split by semicolons or commas if present.
            if ";" in text:
                parts = [part.strip() for part in text.split(";")]
                parts = [part for part in parts if part]
                if parts:
                    return parts

            if "," in text and len(text.split(",")) > 1:
                parts = [part.strip() for part in text.split(",")]
                parts = [part for part in parts if part]
                if parts:
                    return parts

            return [text]

        return [str(value).strip()]

    def _build_prompt(
        self,
        product_name: str,
        competitor_region: str,
        product_analysis: dict[str, Any],
        competitor_enrichment: dict[str, Any],
        extra_context: Optional[str] = None,
    ) -> str:
        extra_context_block = f"\nExtra context:\n{extra_context}\n" if extra_context else ""

        return f"""
You are a senior market intelligence strategist.

Your task is to analyze the target product against the enriched competitors and produce strategic market insights.

Return ONLY valid JSON matching this schema:

{{
  "product_name": "string",
  "competitor_region": "string",
  "executive_summary": "string",
  "competitive_positioning": "string",
  "key_differentiators": ["string"],
  "market_gaps": ["string"],
  "pricing_observations": ["string"],
  "target_customer_overlap": ["string"],
  "strengths": ["string"],
  "weaknesses": ["string"],
  "opportunities": ["string"],
  "threats": ["string"],
  "recommended_positioning": "string",
  "recommended_next_steps": ["string"],
  "notes": ["string"]
}}

Rules:
- Do not wrap the JSON in markdown.
- Do not add commentary outside JSON.
- Every field that is shown as an array must be a JSON array, even if it has only one item.
- Do not write numbered steps as a single string; split them into array items.
- Base the analysis on the target product analysis and enriched competitor data.
- Focus on practical strategy, pricing, market gaps, and positioning.
- Keep recommendations realistic and actionable.
- If some information is uncertain, state it in notes rather than inventing facts.

Target product name: {product_name}
Target region: {competitor_region}

Target product analysis:
{json.dumps(product_analysis, indent=2)}

Enriched competitor data:
{json.dumps(competitor_enrichment, indent=2)}
{extra_context_block}
""".strip()

    def _extract_json(self, text: str) -> dict[str, Any]:
         text = text.strip()

         # 1. Strip markdown code block wrappers if present (e.g. ```json ... ```)
         if text.startswith("```"):
             first_line_end = text.find("\n")
             if first_line_end != -1:
                 text = text[first_line_end:].strip()
             if text.endswith("```"):
                 text = text[:-3].strip()

         # 2. Try standard json loading first
         try:
             return json.loads(text)
         except json.JSONDecodeError:
             pass

         # 3. Locate the first '{' and last '}'
         start = text.find("{")
         end = text.rfind("}")
         if start != -1 and end != -1 and end > start:
             candidate = text[start : end + 1]

             # Try standard loading on candidate
             try:
                 return json.loads(candidate)
             except json.JSONDecodeError:
                 pass

             # 4. Try removing trailing commas before closing braces/brackets
             cleaned = re.sub(r',\s*([\]}])', r'\1', candidate)
             try:
                 return json.loads(cleaned)
             except json.JSONDecodeError:
                 pass

             # 5. Try ast.literal_eval as a fallback for Python-like dict
             pythonic = candidate.replace("true", "True").replace("false", "False").replace("null", "None")
             try:
                 val = ast.literal_eval(pythonic)
                 if isinstance(val, dict):
                     return val
             except Exception:
                 pass

         raise ValueError("Could not parse valid JSON from model output.")