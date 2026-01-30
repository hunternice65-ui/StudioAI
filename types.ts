
export interface SoulProfile {
  title: string;
  description: string;
  traits: string[];
  imagePrompt: string;
}

export interface HistoryItem {
  type: 'narrative' | 'choice';
  content: string;
}

/**
 * Message interface used for chat-based components.
 */
export interface Message {
  role: 'user' | 'assistant' | 'model';
  content?: string;
  text?: string;
  links?: GroundingChunk[];
}

/**
 * Interface representing a grounding source from Google Search.
 */
export interface GroundingChunk {
  web?: {
    uri: string;
    title?: string;
  };
}

/**
 * Predefined voices available for the Gemini Live API.
 */
export const VOICES = [
  { name: 'Zephyr (Deep/Warm)', value: 'Zephyr' },
  { name: 'Puck (Energetic)', value: 'Puck' },
  { name: 'Charon (Calm)', value: 'Charon' },
  { name: 'Kore (Female/Soft)', value: 'Kore' },
  { name: 'Fenrir (Deep/Strong)', value: 'Fenrir' },
];
