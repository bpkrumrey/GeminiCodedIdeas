import React, { useEffect, useRef } from 'react';
import { TranslationResult } from '../types';
import { Loader2, Mic, MicOff, AlertCircle, Volume2 } from 'lucide-react';

interface TranslationViewProps {
  results: TranslationResult[];
  isProcessing: boolean;
  interimText: string;
  isListening: boolean;
  isRunning: boolean;
  isPlayingAudio?: boolean;
}

export const TranslationView: React.FC<TranslationViewProps> = ({ 
  results, 
  isProcessing, 
  interimText, 
  isListening,
  isRunning,
  isPlayingAudio = false
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [results, isProcessing, interimText, isListening, isPlayingAudio]);

  return (
    <div className="flex-grow w-full max-w-4xl mx-auto px-4 overflow-y-auto no-scrollbar pb-32 flex flex-col">
      <div className="flex-grow space-y-4 py-8">
        
        {/* Helper State Messages */}
        {!isRunning && (
           <div className="p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-center flex flex-col items-center gap-2">
              <div className="p-3 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400">
                <MicOff size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">Microphone Inactive</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Start the timer to enable speech recognition.</p>
           </div>
        )}

        {isRunning && !isListening && !isPlayingAudio && (
           <div className="p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/10 text-center flex flex-col items-center">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold mb-1">
                <AlertCircle size={18} />
                <span>Microphone Disconnected</span>
              </div>
              <p className="text-xs text-red-500 dark:text-red-400">Please check browser permissions or refresh.</p>
           </div>
        )}
        
        {isRunning && isListening && results.length === 0 && interimText.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 mt-10 italic">
             <div>Microphone active. Listening...</div>
          </div>
        )}
        
        {/* Results List */}
        {results.map((result) => (
          <div 
            key={result.id} 
            className="rounded-xl border-2 border-dashed border-blue-400/50 bg-gray-50/50 dark:bg-gray-800/30 p-4 animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            {/* Header: Lang + Time */}
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {result.detectedLanguage || 'ENGLISH'}
              </span>
              <span className="text-xs font-mono text-gray-400">
                {result.timestamp}
              </span>
            </div>
            
            {/* Original Text */}
            <div className="text-lg font-medium text-gray-900 dark:text-gray-100 leading-snug">
              {result.originalText}
            </div>
            
            {/* Translations */}
            <div className="mt-3 pl-3 border-l-2 border-orange-500 space-y-2">
              {Object.entries(result.translations).map(([lang, text]) => (
                <div key={lang}>
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-500 uppercase mr-1.5">
                    {lang}:
                  </span>
                  <span className="text-base text-gray-700 dark:text-gray-300">
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <div ref={bottomRef} />
      </div>

      {/* Live Input Display */}
      {/* Only show if timer is running */}
      {isRunning && (
        <div className="sticky bottom-0 mt-auto pt-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent dark:from-gray-900 dark:via-gray-900 pb-2">
           {isProcessing ? (
              <div className="flex justify-center py-4 bg-white dark:bg-gray-800 rounded-xl border border-orange-200 dark:border-orange-900/50 shadow-lg">
                  <div className="flex items-center gap-2 text-orange-500 animate-pulse">
                      <Loader2 size={24} className="animate-spin" />
                      <span className="font-medium">Translating...</span>
                  </div>
              </div>
           ) : isPlayingAudio ? (
              <div className="flex justify-center py-4 bg-white dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-lg">
                  <div className="flex items-center gap-2 text-blue-500 animate-pulse">
                      <Volume2 size={24} />
                      <span className="font-medium">Speaking...</span>
                  </div>
              </div>
           ) : (
              <div className={`p-4 rounded-xl bg-white dark:bg-gray-800 border-2 shadow-lg transition-all duration-300 ${isListening ? 'border-orange-500/30' : 'border-gray-200 dark:border-gray-700 opacity-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`flex items-center gap-2 ${isListening ? 'text-orange-600 dark:text-orange-500' : 'text-gray-400'}`}>
                        {isListening ? <Mic size={16} className="animate-pulse" /> : <MicOff size={16} />}
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {isListening ? 'Listening' : 'Mic Off'}
                        </span>
                    </div>
                    {isListening && (
                      <span className="text-xs text-gray-400">
                        Say <span className="font-bold text-orange-500">"Translate"</span> to send
                      </span>
                    )}
                  </div>
                  
                  <p className={`text-xl font-medium min-h-[1.75rem] ${interimText ? 'text-gray-600 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600 italic'}`}>
                      {interimText || (isListening ? "Listening for speech..." : "Waiting for timer to start...")}
                  </p>
              </div>
           )}
        </div>
      )}
    </div>
  );
};