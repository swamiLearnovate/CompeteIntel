import anthropic

client = anthropic.AnthropicBedrock(
    aws_region="us-east-1"
)

response = client.messages.create(
    model="us.anthropic.claude-sonnet-4-20250514-v1:0",
    max_tokens=100,
    messages=[
        {
            "role": "user",
            "content": "Reply with only the word Hello"
        }
    ]
)

print(response.content[0].text)