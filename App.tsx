
import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Play, Square, Monitor, Sun, Moon, FileText, Globe } from 'lucide-react';
import { TimerDisplay } from './components/TimerDisplay';
import { SettingsModal } from './components/SettingsModal';
import { TeleprompterSetup } from './components/TeleprompterSetup';
import { TeleprompterView } from './components/TeleprompterView';
import { TranslationSetup } from './components/TranslationSetup';
import { useWakeLock } from './hooks/useWakeLock';
import { useTranslator } from './hooks/useTranslator';
import { TimerStatus, TeleprompterSettings, TranslationSettings, TranslationResult } from './types';

const App: React.FC = () => {
  // Application State
  const [initialMinutes, setInitialMinutes] = useState(15);
  const [reminderMinutes, setReminderMinutes] = useState(5);
  const [secondsRemaining, setSecondsRemaining] = useState(15 * 60);
  const [status, setStatus] = useState<TimerStatus>(TimerStatus.IDLE);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Teleprompter State
  const [isTeleprompterSetupOpen, setIsTeleprompterSetupOpen] = useState(false);
  const [teleprompterSettings, setTeleprompterSettings] = useState<TeleprompterSettings>({
    isEnabled: false,
    text: '',
    fontSize: 64,
    isListening: false,
    audioSensitivity: 50
  });

  // Translation State
  const [isTranslationSetupOpen, setIsTranslationSetupOpen] = useState(false);
  const [translationSettings, setTranslationSettings] = useState<TranslationSettings>({
    isEnabled: true,
    sourceLanguage: 'English',
    targetLanguages: ['Spanish'],
    voiceEnabled: true,
    voiceName: 'Kore' // Default voice
  });
  const [translationResults, setTranslationResults] = useState<TranslationResult[]>([]);

  // Wake Lock Hook
  const { requestWakeLock, releaseWakeLock, isLocked } = useWakeLock();

  // Stable callback for handling results
  const handleTranslationResult = useCallback((result: TranslationResult) => {
    setTranslationResults(prev => [...prev, result]);
  }, []);

  // Translator Hook
  const { 
    isProcessing: isTranslating, 
    isPlayingAudio, 
    resumeAudio, 
    translateAndSpeak, 
    pretranslate,
    translationStatus 
  } = useTranslator(
    status === TimerStatus.RUNNING, 
    translationSettings,
    handleTranslationResult
  );

  // Theme Toggling
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Timer Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (status === TimerStatus.RUNNING) {
      interval = setInterval(() => {
        setSecondsRemaining(prev => prev - 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [status]);

  // Handlers
  const handleStart = async () => {
    if (status === TimerStatus.IDLE || status === TimerStatus.PAUSED) {
      // Logic: Always reset to full duration when pressing Start (if not already running)
      // This satisfies the requirement to start at the last set time and effectively 
      // allows the teleprompter hook (which keys off status) to jump back to top.
      setSecondsRemaining(initialMinutes * 60);
      setStatus(TimerStatus.RUNNING);
      await requestWakeLock();
      resumeAudio();
    } else {
      setStatus(TimerStatus.PAUSED);
    }
  };

  const handleSetTime = (minutes: number, reminderMins: number) => {
    setInitialMinutes(minutes);
    setReminderMinutes(reminderMins);
    setSecondsRemaining(minutes * 60);
    setStatus(TimerStatus.IDLE);
    releaseWakeLock();
    setTranslationResults([]);
  };

  const toggleTeleprompterMode = () => {
    if (status === TimerStatus.RUNNING) setStatus(TimerStatus.PAUSED);
    setTeleprompterSettings(prev => ({ ...prev, isEnabled: !prev.isEnabled }));
  };

  const handleTeleprompterTranslation = useCallback((text: string) => {
    if (status === TimerStatus.RUNNING) {
       translateAndSpeak(text);
    }
  }, [status, translateAndSpeak]);

  const handleTeleprompterPretranslate = useCallback((text: string) => {
    if (status === TimerStatus.RUNNING) {
       pretranslate(text);
    }
  }, [status, pretranslate]);

  const isMiniTimerMode = teleprompterSettings.isEnabled;

  return (
    <div className="min-h-screen flex flex-col items-center relative overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      
      {/* Top Bar */}
      <div className={`w-full flex justify-between items-center p-6 absolute top-0 left-0 z-50 ${isMiniTimerMode ? 'pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2 pointer-events-auto">
           <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border transition-all ${isLocked ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}>
            <Monitor size={14} />
            <span className="hidden sm:inline">{isLocked ? 'SCREEN AWAKE' : 'SCREEN NORMAL'}</span>
          </div>
        </div>
        
        {isMiniTimerMode && (
          <div className="absolute left-0 top-0 p-4 w-full flex justify-start pointer-events-none">
             <TimerDisplay 
               secondsRemaining={secondsRemaining} 
               reminderSeconds={reminderMinutes * 60} 
               variant="mini" 
             />
          </div>
        )}

        <button 
          onClick={toggleTheme}
          className={`p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors pointer-events-auto ${isMiniTimerMode ? 'hidden' : 'block'}`}
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center w-full max-w-7xl mx-auto z-0 mt-16 mb-24">
        {teleprompterSettings.isEnabled ? (
          <TeleprompterView 
            settings={teleprompterSettings} 
            translationSettings={translationSettings}
            isRunning={status === TimerStatus.RUNNING} 
            onTranslateTrigger={handleTeleprompterTranslation}
            onPretranslateTrigger={handleTeleprompterPretranslate}
            isTranslating={isTranslating}
            isSpeaking={isPlayingAudio}
            translationStatus={translationStatus}
          />
        ) : (
          <div className="flex flex-col items-center gap-10">
             <TimerDisplay 
                secondsRemaining={secondsRemaining} 
                reminderSeconds={reminderMinutes * 60} 
                variant="fullscreen" 
             />
             <div className="p-8 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl max-w-xl text-center">
                <h2 className="text-xl font-bold mb-4">Teleprompter Translation</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                   Set up your script with <strong>&#123;brackets&#125;</strong> around text you want translated. 
                   The app will pre-translate and then speak when you reach the closing bracket.
                </p>
                <button 
                  onClick={() => setIsTeleprompterSetupOpen(true)}
                  className="px-6 py-3 rounded-xl bg-orange-100 dark:bg-orange-900/20 text-orange-600 font-bold hover:bg-orange-200 transition-all"
                >
                  Configure Script
                </button>
             </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Controls */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 z-[100] shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
          
          <button
            onClick={() => {
              if (teleprompterSettings.isEnabled) toggleTeleprompterMode();
              else setIsTeleprompterSetupOpen(true);
            }}
            disabled={status === TimerStatus.RUNNING}
            className={`flex-shrink-0 flex flex-col items-center justify-center w-20 py-2 sm:py-3 rounded-xl transition-all duration-200 ${
              status === TimerStatus.RUNNING
                ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800'
                : teleprompterSettings.isEnabled 
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-2 border-orange-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-700 hover:border-orange-500 shadow-sm active:scale-95'
            }`}
          >
            <FileText size={20} className="mb-1" />
            <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight">
              {teleprompterSettings.isEnabled ? 'Prompter On' : 'Prompter'}
            </span>
          </button>

          <button
            onClick={() => setIsTranslationSetupOpen(true)}
            disabled={status === TimerStatus.RUNNING}
            className={`flex-shrink-0 flex flex-col items-center justify-center w-20 py-2 sm:py-3 rounded-xl transition-all duration-200 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 shadow-sm active:scale-95 ${
               status === TimerStatus.RUNNING ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Globe size={20} className="mb-1" />
            <span className="text-[10px] sm:text-xs font-semibold text-center leading-tight">Translate</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            disabled={status === TimerStatus.RUNNING}
            className={`flex-shrink-0 flex flex-col items-center justify-center w-20 py-2 sm:py-3 rounded-xl transition-all duration-200 ${
              status === TimerStatus.RUNNING
                ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-700 hover:border-orange-500 shadow-sm active:scale-95'
            }`}
          >
            <Settings size={20} className="mb-1" />
            <span className="text-[10px] sm:text-xs font-semibold">Set Time</span>
          </button>

          <button
            onClick={handleStart}
            className={`flex-grow sm:flex-grow-0 flex items-center justify-center gap-3 w-32 sm:w-48 py-3 sm:py-4 rounded-xl text-white font-bold text-lg shadow-xl transition-all duration-200 transform active:scale-95 ${
              status === TimerStatus.RUNNING
                ? 'bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600'
                : 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/30'
            }`}
          >
            {status === TimerStatus.RUNNING ? (
              <><Square size={24} fill="currentColor" /><span>Stop</span></>
            ) : (
              <><Play size={24} fill="currentColor" /><span>Start</span></>
            )}
          </button>
        </div>
      </footer>

      {/* Modals */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSetTime={handleSetTime} 
        currentMinutes={initialMinutes}
        currentReminder={reminderMinutes}
      />
      <TeleprompterSetup 
        isOpen={isTeleprompterSetupOpen}
        onClose={() => {
           setIsTeleprompterSetupOpen(false);
           if (teleprompterSettings.text.length > 0 && !teleprompterSettings.isEnabled) {
              setTeleprompterSettings(prev => ({ ...prev, isEnabled: true }));
           }
        }}
        settings={teleprompterSettings}
        onUpdateSettings={setTeleprompterSettings}
      />
      <TranslationSetup 
        isOpen={isTranslationSetupOpen}
        onClose={() => setIsTranslationSetupOpen(false)}
        settings={translationSettings}
        onUpdateSettings={setTranslationSettings}
      />
    </div>
  );
};

export default App;
