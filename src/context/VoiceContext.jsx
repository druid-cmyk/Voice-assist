import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import regeneratorRuntime from "regenerator-runtime";

const VoiceContext = createContext();

export const useVoice = () => useContext(VoiceContext);

export const VoiceProvider = ({ children }) => {
    const [transcript, setTranscript] = useState('');
    const [listening, setListening] = useState(false);
    const [isSystemSpeaking, setIsSystemSpeaking] = useState(false);
    const [status, setStatus] = useState("Idle");
    const [audioLevel, setAudioLevel] = useState(0);

    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const silenceTimerRef = useRef(null);
    const isRecordingRef = useRef(false);
    const streamRef = useRef(null);

    // Audio playing queue to prevent overlaps
    const audioQueueRef = useRef([]);
    const currentAudioRef = useRef(null);
    const lastSpokenTextRef = useRef('');
    const lastSpokenTimeRef = useRef(0);

    // Speak function using OpenAI TTS API (much more reliable than browser TTS)
    const speak = async (text) => {
        if (!text) return;

        // Prevent duplicate TTS within 2 seconds
        const now = Date.now();
        if (text === lastSpokenTextRef.current && (now - lastSpokenTimeRef.current) < 2000) {
            console.log("🔇 Skipping duplicate TTS:", text.substring(0, 30));
            return;
        }

        lastSpokenTextRef.current = text;
        lastSpokenTimeRef.current = now;

        console.log("🔊 TTS Request (OpenAI):", text);
        setIsSystemSpeaking(true);

        try {
            // Stop any ongoing audio
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }

            // Call backend TTS API
            const response = await fetch('/api/speak', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text })
            });

            if (!response.ok) {
                throw new Error(`TTS API failed: ${response.statusText}`);
            }

            // Get audio blob
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            // Create and play audio using the persistent primed audio element for mobile support
            let audio = document.getElementById('system-audio');
            if (!audio) {
                audio = new Audio();
                audio.id = 'system-audio';
                document.body.appendChild(audio);
            }
            audio.src = audioUrl;
            currentAudioRef.current = audio;

            audio.onplay = () => {
                console.log("🔊 TTS Started (OpenAI):", text.substring(0, 50));
            };

            audio.onended = () => {
                console.log("🔊 TTS Finished");
                setIsSystemSpeaking(false);
                URL.revokeObjectURL(audioUrl);
                currentAudioRef.current = null;
            };

            audio.onerror = (e) => {
                console.error("🔊 Audio Playback Error:", e);
                setIsSystemSpeaking(false);
                URL.revokeObjectURL(audioUrl);
                currentAudioRef.current = null;
            };

            await audio.play();

        } catch (error) {
            console.error("🔊 TTS Error:", error);
            setIsSystemSpeaking(false);

            // Fallback to browser TTS if API fails
            console.log("Falling back to browser TTS...");
            fallbackToBrowserTTS(text);
        }
    };

    // Fallback function using browser TTS
    const fallbackToBrowserTTS = (text) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v =>
            v.lang.startsWith('en') && (
                v.name.includes("Google") ||
                v.name.includes("Samantha") ||
                v.name.includes("Natural")
            )
        ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.rate = 1.0;
        utterance.onend = () => setIsSystemSpeaking(false);
        utterance.onerror = () => setIsSystemSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    const sendAudioToServer = async (mimeType = 'audio/webm') => {
        try {
            const blob = new Blob(chunksRef.current, { type: mimeType });
            console.log(`Sending Audio: ${blob.size} bytes, Type: ${mimeType}`);

            // Lower threshold to 100 bytes to catch short commands
            if (blob.size < 100) {
                console.log("Audio too short/empty, ignoring.");
                return;
            }

            const formData = new FormData();
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
            formData.append('audio', blob, `command.${ext}`);

            setStatus("Sending...");
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error("Server Error:", errText);
                setStatus("Error");
                // Alert the user only if it's a critical failure during manual mode
                if (status.includes("Manual")) alert(`Voice Error: ${response.statusText}\n${errText}`);
                return;
            }

            const data = await response.json();

            if (data.error) {
                console.error("API Error:", data.error);
                setStatus("Error");
                return;
            }

            if (data.text) {
                console.log("Server Transcript:", data.text);
                setTranscript(data.text);
            } else {
                console.log("No text transcribed");
            }
        } catch (e) {
            console.error("Transcription Failed", e);
            setStatus("Conn Error");
        } finally {
            if (!status.includes("Error")) setStatus("Listening...");
        }
    };

    const detectVoiceActivity = () => {
        if (!analyserRef.current || !listening) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
            // Stop loop if stopped listening
            if (!listening || !analyserRef.current) return;

            analyserRef.current.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
            const average = sum / bufferLength;

            // Update Visualizer
            setAudioLevel(average);

            const SPEECH_THRESHOLD = 5; // Lowered from 20 to 5 for better sensitivity
            const SILENCE_DURATION = 1500;

            // Only record if system isn't speaking (to avoid self-trigger)
            if (average > SPEECH_THRESHOLD && !isSystemSpeaking) {
                if (!isRecordingRef.current) {
                    console.log("Speech Detected - Recording...");
                    setStatus("Recording...");
                    isRecordingRef.current = true;
                    chunksRef.current = [];
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "inactive") {
                        mediaRecorderRef.current.start();
                    }
                }

                // Reset silence timer on speech
                if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

                // Set silence timer to stop recording
                silenceTimerRef.current = setTimeout(() => {
                    if (isRecordingRef.current) {
                        console.log("Silence Detected - Stopping...");
                        setStatus("Processing...");
                        isRecordingRef.current = false;
                        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                            mediaRecorderRef.current.stop();
                        }
                    }
                }, SILENCE_DURATION);
            }

            requestAnimationFrame(checkVolume);
        };
        checkVolume();
    };

    const startListening = async () => {
        if (listening) return;
        setListening(true);
        setStatus("Starting...");

        try {
            // Ensure context is running (fixes "suspended" state in some browsers)
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContextClass();
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }
            audioContextRef.current = ctx;

            // Unlock mobile browser audio restrictions (iOS/Android Safari/Chrome)
            // Mobile browsers block async audio play unless an audio element is primed manually during a user click
            let systemAudio = document.getElementById('system-audio');
            if (!systemAudio) {
                systemAudio = new Audio();
                systemAudio.id = 'system-audio';
                document.body.appendChild(systemAudio);
            }
            // Prime it with an empty/silent promise
            systemAudio.play().then(() => systemAudio.pause()).catch(() => {});

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Determine supported mime type
            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4'; // Safari fallback
            }

            console.log(`Using MimeType: ${mimeType}`);

            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            // Pass the mimeType to the sender so it prepares the Blob correctly
            mediaRecorderRef.current.onstop = () => sendAudioToServer(mimeType);

            setStatus("Listening...");
            // Start logic
            detectVoiceActivity();
        } catch (err) {
            console.error("Mic Error:", err);
            setStatus("Mic Error: " + err.message);
            speak("Microphone error. Please allow access.");
        }
    };

    // MANUAL CONTROLS FOR PRESENTATION
    const startManualRecord = () => {
        if (!mediaRecorderRef.current || isRecordingRef.current) return;
        isRecordingRef.current = true;
        chunksRef.current = [];
        mediaRecorderRef.current.start();
        setStatus("Recording (Manual)...");
    };

    const stopManualRecord = () => {
        if (!mediaRecorderRef.current || !isRecordingRef.current) return;
        isRecordingRef.current = false;
        mediaRecorderRef.current.stop();
        setStatus("Processing...");
    };

    const stopListening = () => {
        setListening(false);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (audioContextRef.current) audioContextRef.current.close();
        setStatus("Stopped");
    };

    const resetTranscript = () => setTranscript('');

    // Preload voices on mount
    useEffect(() => {
        // Force voice loading
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                console.log("✅ TTS Voices loaded on mount:", voices.length);
            }
        };

        // Load immediately
        loadVoices();

        // Some browsers need this event
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        // Fallback: try again after delay
        setTimeout(loadVoices, 500);
        setTimeout(loadVoices, 1500);
    }, []);

    // Trigger detect loop when listening state changes
    useEffect(() => {
        if (listening && analyserRef.current) {
            detectVoiceActivity();
        }
    }, [listening]);

    useEffect(() => {
        return () => stopListening();
    }, []);

    return (
        <VoiceContext.Provider value={{
            speak,
            startListening,
            stopListening,
            listening,
            transcript,
            resetTranscript,
            status,
            audioLevel,
            startManualRecord,
            stopManualRecord
        }}>
            {children}
        </VoiceContext.Provider>
    );
};
