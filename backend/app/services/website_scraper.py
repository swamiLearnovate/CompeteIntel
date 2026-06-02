# app/services/website_scraper.py

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict, List, Optional
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


@dataclass
class ScrapedPage:
    url: str
    final_url: str
    title: str
    meta_description: str
    headings: List[str]
    text: str


class WebsiteScraper:
    def __init__(
        self,
        timeout_ms: int = 30000,
        max_text_length: int = 20000,
        user_agent: Optional[str] = None,
    ) -> None:
        self.timeout_ms = timeout_ms
        self.max_text_length = max_text_length
        self.user_agent = user_agent or (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        )

    def scrape(self, url: str) -> ScrapedPage:
        normalized_url = self._normalize_url(url)

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent=self.user_agent,
                viewport={"width": 1440, "height": 1200},
                java_script_enabled=True,
            )
            page = context.new_page()

            try:
                page.goto(normalized_url, wait_until="networkidle", timeout=self.timeout_ms)
            except PlaywrightTimeoutError:
                # Fallback to DOMContentLoaded if the page keeps network activity open
                page.goto(normalized_url, wait_until="domcontentloaded", timeout=self.timeout_ms)

            try:
                page.wait_for_timeout(1500)
            except Exception:
                pass

            final_url = page.url
            html = page.content()

            context.close()
            browser.close()

        soup = BeautifulSoup(html, "html.parser")
        self._remove_noise_tags(soup)

        title = self._extract_title(soup)
        meta_description = self._extract_meta_description(soup)
        headings = self._extract_headings(soup)
        text = self._extract_visible_text(soup)

        return ScrapedPage(
            url=normalized_url,
            final_url=final_url,
            title=title,
            meta_description=meta_description,
            headings=headings,
            text=text,
        )

    def scrape_as_dict(self, url: str) -> Dict:
        return asdict(self.scrape(url))

    def _normalize_url(self, url: str) -> str:
        url = url.strip()
        parsed = urlparse(url)
        if not parsed.scheme:
            return "https://" + url
        return url

    def _remove_noise_tags(self, soup: BeautifulSoup) -> None:
        for tag_name in [
            "script",
            "style",
            "noscript",
            "svg",
            "iframe",
            "canvas",
            "footer",
            "header",
            "nav",
            "aside",
            "form",
            "button",
            "input",
            "select",
            "option",
        ]:
            for tag in soup.find_all(tag_name):
                tag.decompose()

    def _extract_title(self, soup: BeautifulSoup) -> str:
        if soup.title and soup.title.string:
            return " ".join(soup.title.string.split())
        return ""

    def _extract_meta_description(self, soup: BeautifulSoup) -> str:
        meta = soup.find("meta", attrs={"name": "description"})
        if meta and meta.get("content"):
            return " ".join(meta["content"].split())

        og_meta = soup.find("meta", attrs={"property": "og:description"})
        if og_meta and og_meta.get("content"):
            return " ".join(og_meta["content"].split())

        return ""

    def _extract_headings(self, soup: BeautifulSoup) -> List[str]:
        headings: List[str] = []
        for tag_name in ["h1", "h2", "h3"]:
            for tag in soup.find_all(tag_name):
                text = " ".join(tag.get_text(" ", strip=True).split())
                if text:
                    headings.append(text)
        return headings[:100]

    def _extract_visible_text(self, soup: BeautifulSoup) -> str:
        chunks: List[str] = []

        preferred_tags = ["main", "article", "section", "p", "li", "div"]

        for tag_name in preferred_tags:
            for tag in soup.find_all(tag_name):
                text = " ".join(tag.get_text(" ", strip=True).split())
                if text and len(text) > 30:
                    chunks.append(text)

        if not chunks:
            fallback_text = " ".join(soup.get_text(" ", strip=True).split())
            if fallback_text:
                chunks.append(fallback_text)

        combined = "\n".join(chunks)

        seen = set()
        cleaned_lines: List[str] = []
        for line in combined.splitlines():
            line = line.strip()
            if not line:
                continue
            if line in seen:
                continue
            seen.add(line)
            cleaned_lines.append(line)

        final_text = "\n".join(cleaned_lines)

        if len(final_text) > self.max_text_length:
            final_text = final_text[: self.max_text_length]

        return final_text