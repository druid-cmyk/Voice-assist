from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import subprocess
import traceback
import os
import base64
from pathlib import Path

# OpenAI SDK
from openai import OpenAI

# Try to load .env file if present
try:
    from dotenv import load_dotenv
    # Load .env from project root
    env_path = Path(__file__).resolve().parent.parent / '.env'
    load_dotenv(dotenv_path=env_path)
except ImportError:
    pass

# Get Groq API key from environment
GROQ_API_KEY = os.environ.get("GROQ_API_KEY") or os.environ.get("OPENAI_API_KEY")

if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY not found in environment variables.")
    print("Please add your Groq API key to the .env file")
else:
    # Initialize OpenAI client pointed to Groq
    client = OpenAI(
        api_key=GROQ_API_KEY,
        base_url="https://api.groq.com/openai/v1"
    )

app = Flask(__name__)
# Enable CORS for all domains
CORS(app, resources={r"/*": {"origins": "*"}})


@app.route('/api/ocr', methods=['POST'])
def ocr_endpoint():
    return jsonify({'error': 'Offline OCR (Tesseract) is not supported in this cloud deployment. Please use the Sign Reader (OpenAI Vision) feature.'}), 501


@app.route('/api/transcribe', methods=['POST'])
def transcribe_endpoint():
    """
    Audio transcription using OpenAI Whisper API
    """
    try:
        if not GROQ_API_KEY:
            return jsonify({'error': 'Groq API key not configured'}), 500
            
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        print("Transcribing audio with OpenAI Whisper...")
        
        # OpenAI Whisper API accepts file-like objects directly
        # We need to save the file temporarily or pass it as bytes
        audio_bytes = audio_file.read()
        
        # Create a temporary file-like object
        import io
        audio_buffer = io.BytesIO(audio_bytes)
        audio_buffer.name = "audio.webm"  # Whisper needs a filename
        
        # Call Groq Whisper API
        transcription = client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=audio_buffer,
            response_format="text"
        )
        
        print(f"Transcription: {transcription}")
        return jsonify({'text': transcription})

    except Exception as e:
        print("Error transcribing:")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/analyze_sign', methods=['POST'])
def analyze_sign_endpoint():
    """
    Image analysis using OpenAI GPT-4o Vision API
    """
    try:
        if not GROQ_API_KEY:
            return jsonify({'error': 'Groq API key not configured'}), 500
            
        data = request.json
        image_data = data.get('image')  # Base64 string
        
        if not image_data:
            return jsonify({'error': 'No image data provided'}), 400

        # Handle data URL format (data:image/jpeg;base64,...)
        if ',' in image_data:
            header, encoded = image_data.split(',', 1)
        else:
            encoded = image_data
            
        print("Analyzing sign with Groq Vision...")
        
        # Call Groq Vision API
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "EXTRACT TEXT ONLY. Look closely at the image. Read the big illuminated text on the signboard. Ignore background items. If it says 'RADIOLOGY', output 'Radiology'. Just output the text you see, nothing else."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{encoded}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=300
        )
        
        # Extract the text from the response
        text = response.choices[0].message.content.strip()
        
        print(f"Sign Analysis: {text}")
        return jsonify({'text': text})

    except Exception as e:
        print("Error analyzing sign:")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/speak', methods=['POST'])
def speak_endpoint():
    """
    Text-to-Speech using OpenAI TTS API
    """
    try:
        if not GROQ_API_KEY:
            return jsonify({'error': 'Groq API key not configured'}), 500
            
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400

        print(f"🔊 TTS Request: {text[:50]}...")
        
        # Call Groq TTS API
        response = client.audio.speech.create(
            model="canopylabs/orpheus-v1-english", 
            voice="alloy", 
            input=text
        )
        
        # Return audio as bytes
        audio_bytes = response.content
        
        from flask import Response
        return Response(audio_bytes, mimetype='audio/mpeg')

    except Exception as e:
        print("Error generating speech:")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("Starting Flask Server on Port 5001...")
    print("Using Groq API for audio transcription, vision analysis, and TTS")
    app.run(debug=True, port=5001)
