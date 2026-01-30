
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { VOICES } from '../types';

const CompanionTab: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].value);
  const [transcript, setTranscript] = useState<{role: 'user'|'model', text: string}[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // PCM Decoding Logic
  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const decodeBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const encodeBase64 = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const startSession = async () => {
    setIsConnecting(true);
    try {
      // Fix: Use process.env.API_KEY directly for initialization
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBase64 = encodeBase64(new Uint8Array(int16.buffer));
              
              // Ensure data is sent only after connection is established
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: {
                    data: pcmBase64,
                    mimeType: 'audio/pcm;rate=16000'
                  }
                });
              });
            };
            
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio
            const audioBase64 = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioBase64) {
              const outCtx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const buffer = await decodeAudioData(decodeBase64(audioBase64), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            // Handle Transcriptions
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setTranscript(prev => [...prev, { role: 'user', text }]);
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setTranscript(prev => [...prev, { role: 'model', text }]);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Live Error:", e);
            stopSession();
          },
          onclose: () => stopSession()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } }
          },
          systemInstruction: "You are Aura, a friendly and empathetic AI companion. Keep responses conversational and naturally paced."
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
      alert("Microphone access is required for this feature.");
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    setIsActive(false);
    setIsConnecting(false);
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center text-center space-y-8">
      <div>
        <h2 className="text-4xl font-bold mb-4">Real-time Companion</h2>
        <p className="text-slate-400 text-lg">Talk to Aura instantly. No typing, just natural conversation.</p>
      </div>

      <div className="glass p-8 rounded-full w-64 h-64 flex items-center justify-center relative shadow-2xl">
        {isActive ? (
          <div className="absolute inset-0 flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i} 
                className="w-3 bg-sky-500 rounded-full animate-[pulse_1s_infinite]" 
                style={{ height: `${20 + Math.random() * 60}%`, animationDelay: `${i * 0.1}s` }}
              ></div>
            ))}
          </div>
        ) : (
          <i className="fas fa-microphone text-6xl text-slate-700"></i>
        )}
        {isActive && (
          <div className="absolute -inset-4 border-2 border-sky-500/30 rounded-full animate-ping"></div>
        )}
      </div>

      <div className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <select 
            disabled={isActive}
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-sky-500 transition-all outline-none"
          >
            {VOICES.map(v => (
              <option key={v.value} value={v.value}>{v.name}</option>
            ))}
          </select>

          <button
            onClick={isActive ? stopSession : startSession}
            disabled={isConnecting}
            className={`px-8 py-3 rounded-xl font-bold text-white transition-all shadow-xl flex items-center justify-center gap-2 ${
              isActive 
                ? 'bg-red-500 hover:bg-red-400 shadow-red-500/20' 
                : 'bg-sky-500 hover:bg-sky-400 shadow-sky-500/20'
            }`}
          >
            {isConnecting ? (
              <><i className="fas fa-spinner fa-spin"></i> Connecting...</>
            ) : isActive ? (
              <><i className="fas fa-stop"></i> End Session</>
            ) : (
              <><i className="fas fa-play"></i> Start Conversation</>
            )}
          </button>
        </div>
      </div>

      {transcript.length > 0 && (
        <div className="w-full glass rounded-2xl p-6 text-left max-h-60 overflow-y-auto space-y-3 custom-scrollbar">
          {transcript.map((t, i) => (
            <div key={i} className={`flex gap-3 ${t.role === 'user' ? 'text-sky-400' : 'text-indigo-400'}`}>
              <span className="font-bold uppercase text-[10px] mt-1">{t.role}:</span>
              <p className="text-sm text-slate-200">{t.text}</p>
            </div>
          ))}
        </div>
      )}
      
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3 text-left">
        <i className="fas fa-circle-info text-yellow-500 mt-1"></i>
        <p className="text-xs text-yellow-200/80 leading-relaxed">
          The Companion uses the Gemini Live API for ultra-low latency. Make sure you are in a quiet environment and have granted microphone permissions.
        </p>
      </div>
    </div>
  );
};

export default CompanionTab;
