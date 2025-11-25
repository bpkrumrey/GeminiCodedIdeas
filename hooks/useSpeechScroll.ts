import React, { useEffect, useRef, useState } from 'react';

// Augmented Window interface for SpeechRecognition
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
  sensitivity: number = 50 // 0 to 100, where 100 is most sensitive (low threshold)
) => {
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const lastLoudActivityRef = useRef<number>(0);
  
  const [error, setError] = useState<string | null>(null);

  // Noise Gate Logic
  useEffect(() => {
    if (!isListening) {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      return;
    }

    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const windowObj = window as unknown as IWindow;
        const AudioCtx = windowObj.AudioContext || windowObj.webkitAudioContext;
        
        if (!AudioCtx) return;

        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const microphone = audioCtx.createMediaStreamSource(stream);
        microphoneRef.current = microphone;
        microphone.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
          if (!analyserRef.current) return;
          
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate average volume
          let sum = 0;
          for(let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;

          // Sensitivity 0-100.
          // Invert: 100 sensitivity = 0 threshold (hears everything)
          // 0 sensitivity = high threshold (needs to be very loud)
          // Range of average is roughly 0-128 (since we use ByteFrequencyData)
          
          const threshold = (100 - sensitivity); 

          // If volume > threshold, we mark this moment as "active speech"
          if (average > threshold) {
             lastLoudActivityRef.current = Date.now();
          }

          if (isListening) {
            requestAnimationFrame(checkVolume);
          }
        };

        checkVolume();

      } catch (err) {
        console.error("Audio init error", err);
      }
    };

    initAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isListening, sensitivity]);


  // Speech Recognition Logic
  useEffect(() => {
    const windowObj = window as unknown as IWindow;
    const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      if (!scrollContainerRef.current) return;

      // NOISE GATE CHECK
      // If we haven't heard loud enough sound in the last 1.5 seconds, ignore this result.
      // This helps filter out background voices that might be picked up by the sensitive mic
      // but are much quieter than the presenter.
      if (Date.now() - lastLoudActivityRef.current > 1500) {
        return;
      }

      const container = scrollContainerRef.current;
      const scrollHeight = container.scrollHeight - container.clientHeight;
      
      let allTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        allTranscript += event.results[i][0].transcript;
      }
      
      const transcriptLength = allTranscript.length;
      const textLength = fullText.length;
      
      if (textLength > 0) {
        // We use a simpler linear mapping for robustness
        const ratio = Math.min(transcriptLength / textLength, 1);
        const targetScroll = ratio * scrollHeight;
        
        container.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      }
    };

    recognition.onend = () => {
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Ignore
        }
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [fullText, isListening, scrollContainerRef]);

  // Toggle Start/Stop
  useEffect(() => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
         // Already started
      }
    } else if (!isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  return { error };
};