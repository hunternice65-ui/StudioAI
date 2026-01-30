
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';

const ArtistTab: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');

  const generateImage = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      // Fix: Use process.env.API_KEY directly in the constructor
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
          }
        }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setImage(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (error) {
      console.error(error);
      alert("Failed to generate image. Try a different prompt.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Aura Artist</h2>
          <p className="text-slate-400">Bring your imagination to life using Gemini 2.5 Flash.</p>
        </div>

        <div className="glass p-6 rounded-2xl border border-slate-700 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Describe your vision</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-32 bg-slate-800/50 border border-slate-600 rounded-xl p-4 text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              placeholder="A futuristic cyber-city with neon lights and floating vehicles, digital art style..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Aspect Ratio</label>
            <div className="flex gap-2">
              {(['1:1', '16:9', '9:16'] as const).map(ratio => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`flex-1 py-2 rounded-lg border transition-all ${
                    aspectRatio === ratio 
                      ? 'bg-sky-500/20 border-sky-500 text-sky-400' 
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generateImage}
            disabled={!prompt.trim() || isGenerating}
            className="w-full py-4 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Manifesting...
              </>
            ) : (
              <>
                <i className="fas fa-wand-magic-sparkles"></i> Generate Image
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-[400px]">
        {image ? (
          <div className="relative group glass rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
            <img src={image} alt="Generated art" className="w-full h-auto object-contain" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <a href={image} download="aura-art.png" className="w-12 h-12 bg-white text-slate-900 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                <i className="fas fa-download"></i>
              </a>
              <button 
                onClick={() => { navigator.clipboard.writeText(image); alert("Base64 copied!"); }}
                className="w-12 h-12 bg-white text-slate-900 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
              >
                <i className="fas fa-copy"></i>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-square glass rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
            <i className="fas fa-image text-5xl mb-4 opacity-20"></i>
            <p>Your creation will appear here.<br/>Try to be as descriptive as possible.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistTab;
