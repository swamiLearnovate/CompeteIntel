from dotenv import load_dotenv
from app.core.openai_client_factory import get_openai_client


load_dotenv()

client = get_openai_client()

print("API client:", client)

response = client.responses.create(
    model="openai.gpt-5.4",
    input="Hello!",
)

print(response.output_text)