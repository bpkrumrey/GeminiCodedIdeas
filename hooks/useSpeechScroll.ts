
import React, { useEffect, useRef, useState, useCallback } from 'react';

interface IWindow extends Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
  AudioContext: any;
  webkitAudioContext: any;
}

export const useSpeechScroll = (
  isListening: boolean, 
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
  fullText: string,
  sensitivity: number = 50,
  onTranslationTrigger?: (text: string) => void,
  onPretranslateTrigger?: (text: string) => void,
  isPausedForTranslation: boolean = false,
  settingsRevision: string = '' // Used to detect setting changes
) => {
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastLoudActivityRef = useRef<number>(0);
  
  // Base progress: characters processed in all COMPLETED recognition sessions
  const totalCharsProcessedRef = useRef<number>(0);
  // Current session progress: length of the transcript in the current ACTIVE session
  const currentSessionLengthRef = useRef<number>(0);
  
  const triggeredIndicesRef = useRef<Set<number>>(new Set());
  const pretriggeredIndicesRef = useRef<Set<number>>(new Set());
  
  // Cool-down ref to prevent accidental rapid-fire triggers
  const lastTriggerTimeRef = useRef<number>(0);
  
  const [error, setError] = useState<string | null>(null);

  // Reset progress and triggers when not listening
  useEffect(() => {
    if (!isListening) {
      triggeredIndicesRef.current = new Set();
      pretriggeredIndicesRef.current = new Set();
      totalCharsProcessedRef.current = 0;
      currentSessionLengthRef.current = 0;
      lastTriggerTimeRef.current = 0;
      
      // JUMP TO TOP when session is not active
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  }, [isListening, scrollContainerRef]);

  // If voice/lang settings change, we clear the pre-trigger set so upcoming blocks
  // can be re-pre-translated with the new voice.
  useEffect(() => {
    if (isListening) {
      pretriggeredIndicesRef.current = new Set();
    }
  }, [settingsRevision, isListening]);

  // Noise Gate Logic
  useEffect(() => {
    let micStream: MediaStream | null = null;
    let localAudioContext: AudioContext | null = null;
    let isActive = true;
    let animationFrameId: number | null = null;

    if (!isListening || isPausedForTranslation) return;

    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStream = stream;
        if (!isActive) { stream.getTracks().forEach(t => t.stop()); return; }

        const windowObj = window as unknown as IWindow;
        const AudioCtx = windowObj.AudioContext || windowObj.webkitAudioContext;
        if (!AudioCtx) return;

        const audioCtx = new AudioCtx();
        localAudioContext = audioCtx;
        audioContextRef.current = audioCtx;
        
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const microphone = audioCtx.createMediaStreamSource(stream);
        microphone.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
          if (!isActive || !localAudioContext || localAudioContext.state === 'closed') return;
          try {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for(let i = 0; i < bufferLength; i++) sum += dataArray[i];
            const average = sum / bufferLength;
            const threshold = (100 - sensitivity); 
            if (average > threshold) lastLoudActivityRef.current = Date.now();
            animationFrameId = requestAnimationFrame(checkVolume);
          } catch (e) {}
        };
        checkVolume();
      } catch (err) {
        console.warn("Audio Context initialization failed:", err);
      }
    };
    
    initAudio();

    return () => {
      isActive = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (localAudioContext && localAudioContext.state !== 'closed') {
        localAudioContext.close().catch(() => {});
      }
      if (micStream) micStream.getTracks().forEach(track => track.stop());
      if (audioContextRef.current === localAudioContext) audioContextRef.current = null;
    };
  }, [isListening, sensitivity, isPausedForTranslation]);

  // Triggering Logic
  const checkForTranslationBlocks = useCallback((currentCount: number, forceTranslateLast: boolean = false) => {
    if (isPausedForTranslation) return;
    
    const now = Date.now();
    if (now - lastTriggerTimeRef.current < 2000) return;

    const regex = /\{([^{}]+)?\}/g;
    let match;
    
    while ((match = regex.exec(fullText)) !== null) {
      const openingBracketIndex = match.index;
      const closingBracketIndex = match.index + match[0].length;
      const innerText = (match[1] || "").trim();

      // Look-ahead Pre-trigger (Increased range to 50 chars)
      if ((currentCount >= openingBracketIndex - 50) && !pretriggeredIndicesRef.current.has(openingBracketIndex)) {
        pretriggeredIndicesRef.current.add(openingBracketIndex);
        if (onPretranslateTrigger) onPretranslateTrigger(innerText);
      }

      // Final trigger logic
      const inTriggerZone = currentCount >= (closingBracketIndex - 5);
      const isAlreadyTriggered = triggeredIndicesRef.current.has(closingBracketIndex);

      if (!isAlreadyTriggered && (inTriggerZone || (forceTranslateLast && pretriggeredIndicesRef.current.has(openingBracketIndex)))) {
        triggeredIndicesRef.current.add(closingBracketIndex);
        lastTriggerTimeRef.current = now;
        if (onTranslationTrigger) onTranslationTrigger(innerText);
        break; 
      }
    }
  }, [fullText, onTranslationTrigger, onPretranslateTrigger, isPausedForTranslation]);

  // Speech Recognition
  useEffect(() => {
    const windowObj = window as unknown as IWindow;
    const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition not supported.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      if (!scrollContainerRef.current || !isListening || isPausedForTranslation) return;
      
      if (Date.now() - lastLoudActivityRef.current > 5000) return;

      const container = scrollContainerRef.current;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      
      let sessionTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        sessionTranscript += event.results[i][0].transcript;
      }
      
      currentSessionLengthRef.current = sessionTranscript.length;
      const totalProgressChars = totalCharsProcessedRef.current + currentSessionLengthRef.current;
      const textLength = fullText.length;

      const forceTranslate = sessionTranscript.toLowerCase().endsWith('translate');
      
      if (textLength > 0) {
        const ratio = Math.min(totalProgressChars / textLength, 1);
        const targetScroll = ratio * scrollHeight;
        
        container.scrollTo({ top: targetScroll, behavior: 'smooth' });
        checkForTranslationBlocks(totalProgressChars, forceTranslate);
      }
    };

    recognition.onend = () => {
      // Accumulate session progress
      totalCharsProcessedRef.current += currentSessionLengthRef.current;
      currentSessionLengthRef.current = 0;

      // Robust restart with a slight delay
      if (isListening && !isPausedForTranslation && recognitionRef.current) {
        setTimeout(() => {
          if (isListening && !isPausedForTranslation) {
             try { recognitionRef.current.start(); } catch (e) {}
          }
        }, 300);
      }
    };

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, [fullText, isListening, scrollContainerRef, isPausedForTranslation, checkForTranslationBlocks]);

  // Handle changes in listening/paused state
  useEffect(() => {
    if (isListening && !isPausedForTranslation) {
      if (recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (e) {}
      }
    } else {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    }
  }, [isListening, isPausedForTranslation]);

  return { error };
};
