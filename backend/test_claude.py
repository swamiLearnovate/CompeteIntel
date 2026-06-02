from app.core.config import settings

print("API KEY:", settings.ANTHROPIC_API_KEY[:15] + "...")
print("MODEL:", settings.ANTHROPIC_MODEL)