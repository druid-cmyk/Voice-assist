from dotenv import load_dotenv
import os
from openai import OpenAI

load_dotenv(".env")
api_key = os.environ.get("GROQ_API_KEY") or os.environ.get("OPENAI_API_KEY")
client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")

models = client.models.list()
print("Available Groq models:")
for m in models.data:
    if "vision" in m.id.lower() or "llama" in m.id.lower() or "whisper" in m.id.lower():
        print(m.id)
