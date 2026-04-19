#!/usr/bin/env python3
"""
Quick test script to verify Groq API key is working
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

# Load .env file
env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=env_path)

# Get API key
api_key = os.environ.get("GROQ_API_KEY") or os.environ.get("OPENAI_API_KEY")

print("=" * 60)
print("Groq API Key Test")
print("=" * 60)

if not api_key:
    print("ERROR: GROQ_API_KEY not found in .env file")
    print("\nPlease add your API key to .env file:")
    print("GROQ_API_KEY=gsk_xxxxxxxxxxxxx")
    exit(1)

if api_key == "your_groq_api_key_here":
    print("ERROR: API key is still the placeholder value")
    print("\nPlease replace 'your_groq_api_key_here' with your actual Groq API key")
    exit(1)

print(f"API Key found: {api_key[:15]}...{api_key[-4:]}")
print("\nTesting connection to Groq...")

try:
    client = OpenAI(
        api_key=api_key,
        base_url="https://api.groq.com/openai/v1"
    )
    
    # Test with a simple chat completion
    print("\n1. Testing Chat Completion (Llama 4 Scout Vision)...")
    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[
            {"role": "user", "content": "Say 'Hello, API is working!' if you can hear me."}
        ],
        max_tokens=20
    )
    result = response.choices[0].message.content
    print(f"   Response: {result}")
    print("   Chat API working!")
    
    print("\n2. Testing Model List...")
    models = client.models.list()
    print(f"   Found {len(models.data)} models available")
    
    print("\n" + "=" * 60)
    print("SUCCESS! Your Groq API key is working perfectly!")
    print("=" * 60)
    print("\nYou can now:")
    print("   - Use voice transcription (Whisper-Large-V3)")
    print("   - Use sign reading (Llama-4-Scout-Vision)")
    print("   - All features of your Voice Assistant app")
    print("\nNext steps:")
    print("   1. Make sure Flask backend is running (python3 app.py)")
    print("   2. Open http://localhost:5173 in your browser")
    print("   3. Test the voice features!")
    
except Exception as e:
    print(f"\n❌ ERROR: {str(e)}")
    print("\nPossible issues:")
    print("   - Invalid API key")
    print("   - Network connection issue")
    print("\nPlease check:")
    print("   - Your API key at: https://console.groq.com/keys")
    exit(1)
