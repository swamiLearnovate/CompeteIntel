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


class CompetitorItem(BaseModel):
    name: str = Field(..., description="Competitor name")


class CompetitorDiscoveryResult(BaseModel):
    product_name: str
    competitor_region: str
    discovered_competitors: List[CompetitorItem] = Field(default_factory=list)


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
        self.client = get_openai_client()
        self.model = model or settings.OPEN_AI_MODEL

        logger.info(
            "Initialized CompetitorDiscovery | api_key=%s",
            api_key,
        )
        logger.info(
            "Initialized CompetitorDiscovery | model=%s",
            self.model,
        )

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

        last_error = None

        for attempt in range(1, 4):

            try:

                logger.info(
                    "Competitor discovery attempt %s/3 | product=%s",
                    attempt,
                    product_name,
                )

                response = self.client.responses.create(
                    model=self.model,
                    input=prompt,
                    temperature=0.2,
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

                result = (
                    CompetitorDiscoveryResult
                    .model_validate(payload)
                )

                logger.info(
                    "Competitor discovery successful on attempt %s",
                    attempt,
                )

                return DiscoveryOutput(
                    result=result,
                    raw_text=raw_text,
                )

            except Exception as exc:

                last_error = exc

                logger.warning(
                    "Competitor discovery attempt %s failed: %s",
                    attempt,
                    str(exc),
                )

        logger.error(
            "Competitor discovery failed after 3 attempts"
        )

        raise ValueError(
            f"Competitor discovery failed after 3 attempts. "
            f"Last error: {last_error}"
        )

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

    def _normalize_analysis(
        self,
        product_analysis: Union[dict[str, Any], Any],
    ) -> dict[str, Any]:

        if isinstance(product_analysis, dict):
            return product_analysis

        if hasattr(product_analysis, "model_dump"):
            return product_analysis.model_dump()

        if hasattr(product_analysis, "__dict__"):
            return dict(product_analysis.__dict__)

        raise TypeError(
            "product_analysis must be a dict or a Pydantic/model-like object."
        )

    def _build_prompt(
        self,
        product_name: str,
        competitor_region: str,
        product_analysis: dict[str, Any],
        website_text: str,
        extra_context: Optional[str] = None,
        company_name: Optional[str] = None,
    ) -> str:

        extra_context_block = (
            f"\nExtra context:\n{extra_context}\n"
            if extra_context
            else ""
        )

        exclude_rule = ""

        if company_name:
            exclude_rule = (
                f"\n- IMPORTANT: Exclude the client company "
                f"'{company_name}' from the discovered_competitors list."
            )

        return f"""
You are a market intelligence analyst specializing in competitor discovery.

Your task is to identify up to 10 direct competitors for the target product.

IMPORTANT:
- Focus only on competitors relevant in the region: {competitor_region}
- Return competitor names ONLY
- Do NOT return websites
- Do NOT return pricing information
- Do NOT return company descriptions
- Do NOT return categories
- Do NOT return reasons
- Do NOT return confidence scores
- Do NOT return market segments
- Do NOT return notes

Return ONLY valid JSON matching this schema:

{{
  "product_name": "string",
  "competitor_region": "string",
  "discovered_competitors": [
    {{
      "name": "string"
    }}
  ]
}}

Rules:
- Do not wrap JSON in markdown.
- Do not add commentary.
- Return up to 10 competitors.
- Sort competitors by relevance.
- Exclude the target company itself.
- Use real competitor company names whenever possible.
- If fewer than 10 competitors exist, return all available competitors.
{exclude_rule}

Target product name:
{product_name}

Target region:
{competitor_region}

Product analysis:
{json.dumps(product_analysis, indent=2)}

{extra_context_block}
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
                value = ast.literal_eval(pythonic)

                if isinstance(value, dict):
                    return value

            except Exception:
                pass

        raise ValueError(
            "Could not parse valid JSON from model output."
        )