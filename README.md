# 🎙️ Voice Assistant App - Visual Assistance System

A comprehensive voice-controlled assistance system designed for visually impaired users, featuring voice forms, signboard reading, QR navigation, and queue management.

## ✨ Features

- **🎤 Voice-Controlled Interface** - Navigate the entire app using voice commands
- **📝 Voice Form Filling** - Complete forms using natural speech with confirmation
- **🪧 Signboard Reader** - AI-powered text recognition using Groq Vision (Llama 3.2 11B Vision)
- **📱 QR Navigation** - Scan QR codes for indoor navigation with voice announcements
- **🎫 Queue Management** - Token system for service queuing
- **🔊 Text-to-Speech** - High-quality audio announcements using Groq TTS API (PlayAI)

## 🛠️ Tech Stack

### Frontend
- **React** with React Router
- **Vite** for fast development and building
- **Web APIs**: MediaDevices (microphone), getUserMedia, QR scanner

### Backend
- **Flask** (Python)
- **Groq API** (OpenAI drop-in replacement) for:
  - Whisper-Large-V3 (Speech-to-Text)
  - Llama-3.2-11B-Vision (Image analysis)
  - PlayAI TTS (Text-to-Speech)

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- Groq API Key ([Get one here](https://console.groq.com/keys))

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd dtl-main
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Install Backend Dependencies
```bash
cd backend
pip3 install -r requirements.txt
cd ..
```

### 4. Configure Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your Groq API key
# GROQ_API_KEY=gsk-...
```

### 5. Start the Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
python3 app.py
```
Backend runs on: `http://localhost:5001`

**Terminal 2 - Frontend:**
```bash
npm run dev
```
Frontend runs on: `http://localhost:5173`

### 6. Open the App
Navigate to **http://localhost:5173** and click "Tap Screen to Start"

## 📖 Usage Guide

### Voice Commands

#### Global Navigation:
- *"Go to Form"* - Opens voice form
- *"Go to Token"* - Opens queue system
- *"Go to Map"* or *"Navigation"* - Opens QR navigation
- *"Read Sign"* - Opens signboard reader
- *"Go Home"* - Returns to main menu

#### Signboard Reader:
- *"Read This"* or *"Scan"* - Captures and analyzes signboard
- *"Reset"* or *"Clear"* - Clears current scan

#### Voice Form:
- Speak naturally to answer questions
- Say *"Yes"* or *"No"* to confirm/retry

#### QR Navigation:
- Point camera at QR code for automatic scanning
- Use simulation buttons for testing

## 🏗️ Project Structure

```
dtl-main/
├── backend/              # Flask backend
│   ├── app.py           # Main Flask application
│   └── requirements.txt # Python dependencies
├── src/                 # React frontend
│   ├── pages/          # Page components
│   ├── components/     # Reusable components
│   ├── context/        # React Context (VoiceContext)
│   └── main.jsx        # Entry point
├── public/             # Static assets
├── .env.example        # Environment template
├── vite.config.js      # Vite configuration
└── package.json        # Node dependencies
```

## 🔒 Security Notes

- **Never commit `.env`** - It contains your API keys
- The `.env` file is already in `.gitignore`
- Use `.env.example` as a template for others

## 🐛 Troubleshooting

### Port 5000 Already in Use (macOS)
If you see port 5000 errors, it's likely AirPlay Receiver. The backend already uses port **5001** by default.

### Microphone Permission Denied
- Allow microphone access when prompted
- Check browser settings: `chrome://settings/content/microphone`

### TTS Not Working
- Ensure Groq API key is valid
- Check backend logs for errors
- Verify `/api/speak` endpoint is responding

### Build Warnings
Large chunk size warnings are expected due to React dependencies. For production, consider code splitting.

## 📝 API Endpoints

### `/api/transcribe` (POST)
Transcribes audio to text using Groq Whisper (Whisper-Large-V3)
- **Input**: FormData with audio file
- **Output**: `{ "text": "transcribed text" }`

### `/api/analyze_sign` (POST)
Analyzes images for text using Groq Llama 3.2 11B Vision
- **Input**: `{ "image": "base64_string" }`
- **Output**: `{ "text": "detected text" }`

### `/api/speak` (POST)
Converts text to speech using Groq TTS (PlayAI)
- **Input**: `{ "text": "message to speak" }`
- **Output**: Audio file (MP3)

## 🚀 Deployment

### Frontend (Vercel)
```bash
npm run build
vercel deploy
```

### Backend (Vercel, Railway, or Render)
Ensure environment variables are set in your hosting platform.

## 🤝 Contributing

Contributions are welcome! Please ensure:
- Code follows existing style
- API keys remain private
- Test voice commands before committing

## 📄 License

MIT License - Feel free to use this for educational or commercial purposes.

## 🙏 Acknowledgments

- Groq for lightning-fast API inference
- React team for the amazing framework
- Vite for blazing fast development

---

**Made with ❤️ for accessibility**
