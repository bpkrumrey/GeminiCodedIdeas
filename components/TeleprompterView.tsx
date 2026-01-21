
import React, { useRef, useMemo } from 'react';
import { useSpeechScroll } from '../hooks/useSpeechScroll';
import { TeleprompterSettings, TranslationStatus, TranslationSettings } from '../types';
import { Volume2, Loader2, AlertCircle, Sparkles, CheckCircle2, XCircle } from 'lucide-react';

interface TeleprompterViewProps {
  settings: TeleprompterSettings;
  translationSettings: TranslationSettings;
  isRunning: boolean;
  onTranslateTrigger?: (text: string) => void;
  onPretranslateTrigger?: (text: string) => void;
  isTranslating?: boolean;
  isSpeaking?: boolean;
  translationStatus?: TranslationStatus;
}

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({ 
  settings, 
  translationSettings,
  isRunning, 
  onTranslateTrigger,
  onPretranslateTrigger,
  isTranslating = false,
  isSpeaking = false,
  translationStatus = 'IDLE'
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // We use a revision string to notify the hook about settings changes that should affect triggering
  const settingsRevision = `${translationSettings.voiceName}_${translationSettings.targetLanguages.join(',')}`;

  // Use the speech scroll hook
  useSpeechScroll(
    isRunning, 
    scrollRef, 
    settings.text, 
    settings.audioSensitivity, 
    onTranslateTrigger,
    onPretranslateTrigger,
    isTranslating || isSpeaking,
    settingsRevision
  );

  // Function to highlight bracketed text
  const renderedContent = useMemo(() => {
    const text = settings.text || "No script text provided. Please set up the teleprompter script.";
    const parts = text.split(/(\{.*?\})/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('{') && part.endsWith('}')) {
        return (
          <span key={i} className="text-orange-500 font-bold italic transition-colors">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }, [settings.text]);

  const renderStatusBadge = () => {
    if (translationStatus === 'IDLE' || !isRunning) return null;

    let icon = <Loader2 className="animate-spin" size={16} />;
    let text = "Processing...";
    let color = "bg-gray-800 text-gray-300 border-gray-700";

    switch(translationStatus) {
      case 'PREPARING':
        icon = <Sparkles className="animate-pulse text-amber-400" size={16} />;
        text = "Optimizing Translation...";
        color = "bg-amber-900/60 text-amber-300 border-amber-500/50 backdrop-blur-xl shadow-[0_0_20px_rgba(245,158,11,0.3)]";
        break;
      case 'READY':
        icon = <CheckCircle2 className="text-green-400" size={16} />;
        text = "Translation Ready";
        color = "bg-green-900/60 text-green-300 border-green-500/50 backdrop-blur-xl shadow-[0_0_20px_rgba(34,197,94,0.3)]";
        break;
      case 'EMPTY':
        icon = <XCircle className="text-gray-400" size={16} />;
        text = "No translation detected";
        color = "bg-gray-900/80 text-gray-400 border-gray-700 backdrop-blur-xl";
        break;
      case 'ERROR':
        icon = <AlertCircle className="text-red-400" size={16} />;
        text = "Translation failed";
        color = "bg-red-900/60 text-red-300 border-red-500/50 backdrop-blur-xl";
        break;
    }

    return (
      <div className={`fixed bottom-28 right-8 z-[100] flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all duration-300 animate-in slide-in-from-right-12 fade-in scale-100 ${color}`}>
        <div className="flex-shrink-0">{icon}</div>
        <span className="text-sm font-black tracking-widest uppercase whitespace-nowrap">{text}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-40 bg-black text-white overflow-hidden flex flex-col">
      {/* Background Status Overlay - Show only during final speaking or forced processing */}
      {(isTranslating || isSpeaking) && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-gray-800 border-2 border-orange-500/50 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 max-w-sm text-center">
              {isTranslating ? (
                <>
                  <Loader2 size={48} className="text-orange-500 animate-spin" />
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Processing Block...</h3>
                    <p className="text-gray-400 text-sm">Please pause speaking while we finalize the translation.</p>
                  </div>
                </>
              ) : (
                <>
                  <Volume2 size={48} className="text-blue-500 animate-pulse" />
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">Speaking Translation...</h3>
                    <p className="text-gray-400 text-sm">Wait for audio to finish before continuing.</p>
                  </div>
                </>
              )}
           </div>
        </div>
      )}

      {/* Real-time Status Badge */}
      {renderStatusBadge()}

      {/* Scrollable Area */}
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto no-scrollbar scroll-smooth px-8 md:px-20 text-center relative"
      >
        <div className="min-h-[45vh]" />
        <div 
          className="max-w-5xl mx-auto font-sans leading-tight whitespace-pre-wrap py-10 transition-all duration-300"
          style={{ 
            fontSize: `${settings.fontSize}px`,
            color: 'white',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)'
          }}
        >
          {renderedContent}
        </div>
        <div className="min-h-[80vh]" />
      </div>

      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-600/40 pointer-events-none z-50 mix-blend-screen" />
      <div className="absolute top-1/2 right-4 transform -translate-y-1/2 text-xs text-red-500/70 font-black tracking-widest pointer-events-none uppercase">
        Reading Line
      </div>
      
      {/* Mic Status Indicator */}
      {isRunning && !isTranslating && !isSpeaking && (
        <div className="absolute top-20 right-8 flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full text-green-500">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-widest">Mic Live</span>
        </div>
      )}
    </div>
  );
};
