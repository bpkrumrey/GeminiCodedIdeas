
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { TranslationSettings, TranslationResult, TranslationStatus } from '../types';

export const useTranslator = (
  isRunning: boolean,
  settings: TranslationSettings,
  onResult: (result: TranslationResult) => void
) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [translationStatus, setTranslationStatus] = useState<TranslationStatus>('IDLE');
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<string[]>([]); 
  const isPlayingRef = useRef<boolean>(false);
  
  // Cache stores pre-generated translation results and audio bytes.
  const cacheRef = useRef<Map<string, { result: TranslationResult, audio: string | null }>>(new Map());

  const shouldRunRef = useRef(false);
  const settingsRef = useRef(settings);
  const onResultRef = useRef(onResult);

  const genAI = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY }), []);

  // Sync settings and handle stop
  useEffect(() => {
    shouldRunRef.current = isRunning && settings.isEnabled;
    settingsRef.current = settings;
    onResultRef.current = onResult;

    if (!isRunning) {
        isPlayingRef.current = false;
        setIsPlayingAudio(false);
        setTranslationStatus('IDLE');
        audioQueueRef.current = [];
        cacheRef.current.clear();
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
           audioContextRef.current.suspend().catch(() => {});
        }
    }
  }, [isRunning, settings, onResult]);

  // CRITICAL: Clear cache when voice or language changes even if running.
  // This ensures that upcoming blocks will re-trigger pre-translation with the correct voice/language.
  useEffect(() => {
    cacheRef.current.clear();
  }, [settings.voiceName, settings.targetLanguages]);

  const decodePCM = useCallback((base64: string, ctx: AudioContext): AudioBuffer => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    
    const numSamples = Math.floor(len / 2);
    const int16Data = new Int16Array(bytes.buffer, 0, numSamples);
    const float32Data = new Float32Array(numSamples);
    
    for (let i = 0; i < numSamples; i++) {
      float32Data[i] = int16Data[i] / 32768.0;
    }
    
    const buffer = ctx.createBuffer(1, numSamples, 24000);
    buffer.copyToChannel(float32Data, 0);
    return buffer;
  }, []);

  const playNextInQueue = useCallback(async () => {
    if (!shouldRunRef.current || audioQueueRef.current.length === 0) {
        isPlayingRef.current = false;
        setIsPlayingAudio(false);
        return;
    }

    isPlayingRef.current = true;
    setIsPlayingAudio(true);
    const base64Audio = audioQueueRef.current.shift();
    if (!base64Audio) { playNextInQueue(); return; }

    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new AudioCtx({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();

        const audioBuffer = decodePCM(base64Audio, ctx);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => {
          // Pause slightly to allow state to settle
          setTimeout(() => {
            if (audioQueueRef.current.length > 0) {
              playNextInQueue();
            } else {
              isPlayingRef.current = false;
              setIsPlayingAudio(false);
            }
          }, 600);
        };
        source.start(0);
    } catch(e) {
        console.error("Audio playback error:", e);
        playNextInQueue();
    }
  }, [decodePCM]);

  const resumeAudio = useCallback(async () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioCtx({ sampleRate: 24000 });
      }
      if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();
    } catch (e) { console.error(e); }
  }, []);

  const getCacheKey = useCallback((text: string) => {
    // Composite key ensures unique cache entries per text, voice and language
    return `${text.trim()}_${settings.voiceName}_${settings.targetLanguages.join(',')}`;
  }, [settings.voiceName, settings.targetLanguages]);

  const pretranslate = useCallback(async (text: string) => {
    if (!settings.isEnabled || !text.trim()) return;
    const cacheKey = getCacheKey(text);
    if (cacheRef.current.has(cacheKey)) {
      setTranslationStatus('READY');
      return;
    }

    setTranslationStatus('PREPARING');
    try {
      const prompt = `Translate this script segment for a presenter. 
      Target Language: ${settings.targetLanguages[0]}. 
      Text: "${text}". 
      Return STRICT JSON: {"translations": {"${settings.targetLanguages[0]}": "TranslatedText"}}`;

      const transResult = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      const data = JSON.parse(transResult.text);
      const resultObj: TranslationResult = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        originalText: text,
        detectedLanguage: 'English',
        translations: data.translations || {},
        isForeignInput: false
      };

      let audioData = null;
      if (settings.voiceEnabled && data.translations) {
        const translationText = data.translations[settings.targetLanguages[0]];
        if (typeof translationText === 'string') {
          const ttsResponse = await genAI.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: { parts: [{ text: translationText }] },
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: { 
                voiceConfig: { 
                  prebuiltVoiceConfig: { voiceName: settings.voiceName } 
                } 
              },
            },
          });
          audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        }
      }

      cacheRef.current.set(cacheKey, { result: resultObj, audio: audioData });
      setTranslationStatus('READY');
    } catch (err) {
      console.error("Pre-translation background error:", err);
      setTranslationStatus('ERROR');
    }
  }, [genAI, settings, getCacheKey]);

  const translateAndSpeak = useCallback(async (text: string) => {
    if (!settings.isEnabled) return;

    const cacheKey = getCacheKey(text);
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)!;
      onResultRef.current(cached.result);
      if (cached.audio) {
        audioQueueRef.current.push(cached.audio);
        if (!isPlayingRef.current) playNextInQueue();
      }
      setTranslationStatus('IDLE');
      return;
    }

    setIsProcessing(true);
    setTranslationStatus('PREPARING');
    try {
      const prompt = `Translate this script segment for a presenter. 
      Target Language: ${settings.targetLanguages[0]}. 
      Text: "${text}". 
      Return STRICT JSON: {"translations": {"${settings.targetLanguages[0]}": "TranslatedText"}}`;

      const transResult = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      
      const data = JSON.parse(transResult.text);
      const resultObj: TranslationResult = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        originalText: text,
        detectedLanguage: 'English',
        translations: data.translations || {},
        isForeignInput: false
      };

      onResultRef.current(resultObj);

      if (settings.voiceEnabled && data.translations) {
        const translationText = data.translations[settings.targetLanguages[0]];
        if (typeof translationText === 'string') {
          const ttsResponse = await genAI.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: { parts: [{ text: translationText }] },
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: { 
                voiceConfig: { 
                  prebuiltVoiceConfig: { voiceName: settings.voiceName } 
                } 
              },
            },
          });
          const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (audioData) {
            audioQueueRef.current.push(audioData);
            if (!isPlayingRef.current) playNextInQueue();
          }
        }
      }
    } catch (err) {
      console.error("Manual translation error:", err);
      setError("Translation failed.");
    } finally {
      setIsProcessing(false);
      setTranslationStatus('IDLE');
    }
  }, [genAI, settings, playNextInQueue, getCacheKey]);

  return { isProcessing, error, isPlayingAudio, resumeAudio, translateAndSpeak, pretranslate, translationStatus };
};
