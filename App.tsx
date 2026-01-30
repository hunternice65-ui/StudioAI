
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

const QUESTIONS = [
  {
    id: 1,
    q: "ถ้าคุณสามารถเป็น 'สี' หนึ่งสีที่ไม่มีอยู่จริงบนโลกนี้ได้ สีนั้นจะรู้สึกอย่างไรเมื่อสัมผัส?",
    options: ["เย็นเฉียบเหมือนเหล็ก", "นุ่มนวลเหมือนควัน", "สั่นสะเทือนเหมือนเสียงดนตรี", "แหลมคมเหมือนคริสตัล"]
  },
  {
    id: 2,
    q: "ในโลกคู่ขนาน คุณเลือกที่จะอาศัยอยู่ใน...",
    options: ["เมืองที่ลอยอยู่บนเมฆนิรันดร์", "ห้องสมุดใต้สมุทรที่ไม่มีที่สิ้นสุด", "ป่าที่ต้นไม้ทุกต้นทำจากแก้ว", "สถานีรถไฟที่หยุดนิ่งในกาลเวลา"]
  },
  {
    id: 3,
    q: "สิ่งของอย่างหนึ่งที่คุณจะพกติดตัวไปใน 'ความว่างเปล่า' คืออะไร?",
    options: ["เข็มทิศที่ชี้ไปยังความทรงจำ", "ตะเกียงที่จุดติดด้วยเสียงหัวเราะ", "หน้ากากที่สะท้อนใบหน้าของคนอื่น", "เมล็ดพันธุ์ของดวงดาว"]
  }
];

const App: React.FC = () => {
  const [step, setStep] = useState<'intro' | 'quiz' | 'analyzing' | 'result'>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<{
    title: string;
    description: string;
    avatarUrl: string;
    traits: string[];
  } | null>(null);

  const startQuiz = () => {
    setStep('quiz');
  };

  const handleAnswer = (ans: string) => {
    const newAnswers = [...answers, ans];
    setAnswers(newAnswers);
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      generateSoul(newAnswers);
    }
  };

  const generateSoul = async (finalAnswers: string[]) => {
    setStep('analyzing');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Step 1: Deep Profile Analysis using Gemini 3 Flash
      const analysisResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze these psychological choices: ${JSON.stringify(finalAnswers)}. 
        Create a mystical "Soul Profile". 
        Output JSON: { "title": "Soul Name", "description": "Deep personality analysis (2-3 sentences)", "traits": ["trait1", "trait2", "trait3"], "imagePrompt": "Detailed prompt for an ethereal avatar image" }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              traits: { type: Type.ARRAY, items: { type: Type.STRING } },
              imagePrompt: { type: Type.STRING }
            },
            required: ["title", "description", "traits", "imagePrompt"]
          }
        }
      });

      const data = JSON.parse(analysisResponse.text);

      // Step 2: Generate Avatar Image
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ text: `A cinematic, ethereal soul avatar. Style: Dreamy, surrealism, high detail, glowing elements. Prompt: ${data.imagePrompt}` }],
        config: {
          imageConfig: { aspectRatio: "1:1" }
        }
      });

      let avatarUrl = "";
      for (const part of imageResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          avatarUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      setResult({ ...data, avatarUrl });
      setStep('result');
    } catch (err) {
      console.error(err);
      alert("Neural link failed. The Soul Architect is resting. Please try again.");
      setStep('intro');
    }
  };

  return (
    <div className="container mx-auto max-w-4xl min-h-screen flex flex-col items-center justify-center p-6">
      
      {step === 'intro' && (
        <div className="text-center space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-violet-600 to-pink-600 rounded-full blur-2xl opacity-20"></div>
            <h1 className="font-header text-6xl md:text-7xl font-extrabold tracking-tighter mb-4">
              SOUL <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-500">ARCHITECT</span>
            </h1>
          </div>
          <p className="text-slate-400 text-lg md:text-xl max-w-xl mx-auto leading-relaxed">
            ก้าวข้ามขีดจำกัดของตัวตนปกติ... ค้นพบภาพสะท้อนของ "วิญญาณดิจิทัล" ที่ซ่อนอยู่ในคำตอบของคุณ
          </p>
          <button 
            onClick={startQuiz}
            className="glow-button px-10 py-5 rounded-full font-header font-bold text-xl uppercase tracking-widest text-white shadow-xl"
          >
            เริ่มการสแกน
          </button>
        </div>
      )}

      {step === 'quiz' && (
        <div className="w-full max-w-2xl space-y-10 animate-in slide-in-from-bottom-10 duration-500">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest">
            <span>Question {currentQ + 1} of {QUESTIONS.length}</span>
            <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-violet-500 transition-all duration-500" 
                style={{ width: `${((currentQ + 1) / QUESTIONS.length) * 100}%` }}
              ></div>
            </div>
          </div>
          <h2 className="font-header text-2xl md:text-3xl font-bold leading-snug">
            {QUESTIONS[currentQ].q}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {QUESTIONS[currentQ].options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                className="glass p-6 text-left hover:bg-white/5 hover:border-violet-500/50 transition-all duration-300 rounded-2xl group"
              >
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center text-xs group-hover:border-violet-500 group-hover:text-violet-400 transition-colors">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-slate-200 group-hover:text-white">{opt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'analyzing' && (
        <div className="text-center space-y-6">
          <div className="relative flex items-center justify-center">
            <div className="loading-ring absolute"></div>
            <div className="w-24 h-24 rounded-full bg-violet-500/10 flex items-center justify-center">
              <i className="fas fa-brain text-4xl text-violet-400 animate-pulse"></i>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-header text-xl font-bold text-white uppercase tracking-widest">Analyzing Soul Pattern</h3>
            <p className="text-slate-500 text-sm italic">Gemini 3 Flash is weaving your destiny...</p>
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div className="w-full max-w-3xl space-y-8 animate-in fade-in zoom-in duration-1000">
          <div className="soul-card rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-violet-600 to-pink-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                <img 
                  src={result.avatarUrl} 
                  alt="Soul Avatar" 
                  className="relative w-full aspect-square rounded-2xl object-cover shadow-2xl border border-white/10"
                />
              </div>
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] text-violet-400 font-bold uppercase tracking-[0.3em] mb-1">Architect Manifestation</p>
                  <h2 className="font-header text-4xl font-black text-white leading-none uppercase">{result.title}</h2>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed italic">
                  "{result.description}"
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.traits.map((trait, i) => (
                    <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase font-bold text-violet-300">
                      #{trait}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-white/5 border border-white/10 rounded-full text-xs font-bold hover:bg-white/10 transition-all uppercase tracking-widest"
            >
              Re-scan Soul
            </button>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Screenshot this card to share your digital soul</p>
          </div>
        </div>
      )}

      <footer className="mt-20 text-[10px] text-slate-700 uppercase tracking-[0.5em] text-center">
        Created by Gemini AI // Soul Engine v1.0
      </footer>
    </div>
  );
};

export default App;
