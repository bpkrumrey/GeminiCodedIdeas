
export enum TimerStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
}

export type TranslationStatus = 'IDLE' | 'PREPARING' | 'READY' | 'EMPTY' | 'ERROR';

export interface TimerState {
  totalSeconds: number;
  initialMinutes: number;
  status: TimerStatus;
}

export interface TeleprompterSettings {
  isEnabled: boolean;
  text: string;
  fontSize: number; // in pixels
  isListening: boolean;
  audioSensitivity: number; // 0-100, threshold for noise gate
}

export interface SavedScript {
  id: string;
  name: string;
  text: string;
  date: string;
}

export interface TranslationSettings {
  isEnabled: boolean;
  sourceLanguage: string;
  targetLanguages: string[];
  voiceEnabled: boolean;
  voiceName: string;
}

export interface TranslationResult {
  id: string;
  timestamp: string;
  originalText: string;
  detectedLanguage: string;
  translations: Record<string, string>;
  isForeignInput: boolean; // True if input was NOT source language (interruption)
}

export const AVAILABLE_LANGUAGES = [
  { code: 'ms', name: 'Malay' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'el', name: 'Greek' },
  { code: 'he', name: 'Hebrew' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'th', name: 'Thai' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh-CN', name: 'Mandarin' },
  { code: 'zh-HK', name: 'Cantonese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ro', name: 'Romanian' },
];

export const AVAILABLE_VOICES = [
  { id: 'Kore', name: 'Kore (Female)', gender: 'Female' },
  { id: 'Aoede', name: 'Aoede (Female)', gender: 'Female' },
  { id: 'Puck', name: 'Puck (Male)', gender: 'Male' },
  { id: 'Charon', name: 'Charon (Male)', gender: 'Male' },
];
