
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Message, GroundingChunk } from '../types';

const OracleTab: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "I am the Oracle. Ask me anything about the world, science, or recent news. I'll use real-time search to provide accurate answers." }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Fix: Always use process.env.API_KEY directly for initialization
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: input,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const aiText = response.text || "I couldn't find a clear answer for that.";
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const links: GroundingChunk[] = chunks.filter(c => c.web).map(c => ({ web: c.web }));

      setMessages(prev => [...prev, { role: 'assistant', content: aiText, links }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "An error occurred while connecting to my neural network. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[70vh]">
      <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar" ref={scrollRef}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-sky-600 text-white shadow-lg' 
                : 'glass border border-slate-700 text-slate-100'
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
              {msg.links && msg.links.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-700">
                  <p className="text-xs font-bold text-sky-400 mb-2 uppercase tracking-wider">Sources:</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.links.map((link, idx) => (
                      <a 
                        key={idx} 
                        href={link.web?.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[11px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded border border-slate-600 transition-colors"
                      >
                        {link.web?.title || 'Link'} <i className="fas fa-external-link-alt ml-1 opacity-50"></i>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="glass border border-slate-700 rounded-2xl p-4 flex gap-1">
              <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-sky-500 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 glass p-2 rounded-2xl border border-slate-700 shadow-2xl">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Search the world with Gemini 3..."
            className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-white placeholder-slate-500"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="w-12 h-12 flex items-center justify-center bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-sky-500/20"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OracleTab;
