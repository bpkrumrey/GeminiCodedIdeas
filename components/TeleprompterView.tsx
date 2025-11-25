import React, { useRef } from 'react';
import { useSpeechScroll } from '../hooks/useSpeechScroll';
import { TeleprompterSettings } from '../types';

interface TeleprompterViewProps {
  settings: TeleprompterSettings;
  isRunning: boolean;
}

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({ settings, isRunning }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Use the speech scroll hook
  // We only want to listen if the timer is actually running (isRunning) AND teleprompter is enabled
  useSpeechScroll(isRunning, scrollRef, settings.text, settings.audioSensitivity);

  return (
    <div className="fixed inset-0 z-40 bg-black text-white overflow-hidden flex flex-col">
      {/* Scrollable Area */}
      {/* We add padding top to avoid the timer and bottom to allow scrolling to the end */}
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto no-scrollbar scroll-smooth px-8 md:px-20 text-center relative"
        style={{ 
          scrollBehavior: 'smooth',
          perspective: '1000px' // Adds a bit of depth if we wanted 3D transforms
        }}
      >
        <div className="min-h-[45vh]" /> {/* Spacer to start text in middle */}
        
        <div 
          className="max-w-5xl mx-auto font-sans leading-tight whitespace-pre-wrap py-10 transition-all duration-300"
          style={{ 
            fontSize: `${settings.fontSize}px`,
            // High contrast for readability
            color: 'white',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}
        >
          {settings.text || "No script text provided. Please set up the teleprompter script."}
        </div>

        <div className="min-h-[80vh]" /> {/* Spacer to allow scrolling to end */}
      </div>

      {/* Mirror/flip indicator or safe zone guides could go here if requested */}
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/30 pointer-events-none z-50 mix-blend-screen" />
      <div className="absolute top-1/2 right-4 transform -translate-y-1/2 text-xs text-red-500/50 font-mono pointer-events-none">
        READING LINE
      </div>
    </div>
  );
};