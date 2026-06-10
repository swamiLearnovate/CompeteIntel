from dotenv import load_dotenv
from openai import OpenAI
import os

load_dotenv()


def get_openai_client():
    """
    Centralized OpenAI / Bedrock client creation.

    Settings:
    - 60 second timeout to avoid long hangs.
    - Uses OPENAI_API_KEY from .env
    - Uses OPENAI_BASE_URL from .env
    """

    return OpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_BASE_URL"),
        timeout=600.0,
    )