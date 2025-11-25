import React, { useState, useEffect } from 'react';
import { Settings, Play, Square, Monitor, Sun, Moon, FileText } from 'lucide-react';
import { TimerDisplay } from './components/TimerDisplay';
import { SettingsModal } from './components/SettingsModal';
import { TeleprompterSetup } from './components/TeleprompterSetup';
import { TeleprompterView } from './components/TeleprompterView';
import { useWakeLock } from './hooks/useWakeLock';
import { TimerStatus, TeleprompterSettings } from './types';

const App: React.FC = () => {
  // Application State
  const [initialMinutes, setInitialMinutes] = useState(15);
  const [secondsRemaining, setSecondsRemaining] = useState(15 * 60);
  const [status, setStatus] = useState<TimerStatus>(TimerStatus.IDLE);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTeleprompterSetupOpen, setIsTeleprompterSetupOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Teleprompter State
  const [teleprompterSettings, setTeleprompterSettings] = useState<TeleprompterSettings>({
    isEnabled: false,
    text: '',
    fontSize: 64,
    isListening: false,
    audioSensitivity: 50 // Default middle sensitivity
  });

  // Wake Lock Hook
  const { requestWakeLock, releaseWakeLock, isLocked } = useWakeLock();

  // Theme Toggling
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

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

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  // Handlers
  const handleStart = async () => {
    if (status === TimerStatus.IDLE || status === TimerStatus.PAUSED) {
      setStatus(TimerStatus.RUNNING);
      // Try to acquire wake lock when user starts the timer
      await requestWakeLock();
    } else {
      setStatus(TimerStatus.PAUSED);
      // Keep lock on pause
    }
  };

  const handleSetTime = (minutes: number) => {
    setInitialMinutes(minutes);
    setSecondsRemaining(minutes * 60);
    setStatus(TimerStatus.IDLE);
    releaseWakeLock();
  };

  const toggleTeleprompterMode = () => {
    // If we are currently running, stop.
    if (status === TimerStatus.RUNNING) {
      setStatus(TimerStatus.PAUSED);
    }
    
    setTeleprompterSettings(prev => ({
      ...prev,
      isEnabled: !prev.isEnabled
    }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center relative overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      
      {/* Top Bar */}
      <div className={`w-full flex justify-between items-center p-6 absolute top-0 left-0 z-50 ${teleprompterSettings.isEnabled ? 'pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Status Indicator for Wake Lock */}
           <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border transition-all ${isLocked ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}>
            <Monitor size={14} />
            <span className="hidden sm:inline">{isLocked ? 'SCREEN AWAKE' : 'SCREEN NORMAL'}</span>
          </div>
        </div>
        
        {/* If teleprompter is active, Timer moves here */}
        {teleprompterSettings.isEnabled && (
          <div className="absolute left-0 top-0 p-4 w-full flex justify-start pointer-events-none">
             <TimerDisplay secondsRemaining={secondsRemaining} variant="mini" />
          </div>
        )}

        <button 
          onClick={toggleTheme}
          className={`p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors pointer-events-auto ${teleprompterSettings.isEnabled ? 'hidden' : 'block'}`}
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
            isRunning={status === TimerStatus.RUNNING} 
          />
        ) : (
          <TimerDisplay secondsRemaining={secondsRemaining} variant="fullscreen" />
        )}
      </main>

      {/* Sticky Bottom Controls */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 z-50 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-3 sm:gap-6">
          
          {/* Button 0: Teleprompter Toggle */}
          <button
            onClick={() => {
              if (teleprompterSettings.isEnabled) {
                 toggleTeleprompterMode();
              } else {
                 setIsTeleprompterSetupOpen(true);
              }
            }}
            disabled={status === TimerStatus.RUNNING}
            className={`flex flex-col items-center justify-center w-20 sm:w-28 py-3 rounded-xl transition-all duration-200 ${
              status === TimerStatus.RUNNING
                ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800'
                : teleprompterSettings.isEnabled 
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-2 border-orange-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-500 shadow-sm active:scale-95'
            }`}
          >
            <FileText size={24} className="mb-1" />
            <span className="text-xs sm:text-sm font-semibold text-center leading-tight">
              {teleprompterSettings.isEnabled ? 'Prompter On' : 'Prompter'}
            </span>
          </button>

          {/* Button 1: Set Time */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            disabled={status === TimerStatus.RUNNING}
            className={`flex flex-col items-center justify-center w-20 sm:w-28 py-3 rounded-xl transition-all duration-200 ${
              status === TimerStatus.RUNNING
                ? 'opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-500 shadow-sm active:scale-95'
            }`}
          >
            <Settings size={24} className="mb-1" />
            <span className="text-xs sm:text-sm font-semibold">Set Time</span>
          </button>

          {/* Button 2: Start/Stop (Primary Action) */}
          <button
            onClick={handleStart}
            className={`flex-grow sm:flex-grow-0 flex items-center justify-center gap-3 w-32 sm:w-60 py-4 rounded-xl text-white font-bold text-lg shadow-xl transition-all duration-200 transform active:scale-95 ${
              status === TimerStatus.RUNNING
                ? 'bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600'
                : 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/30'
            }`}
          >
            {status === TimerStatus.RUNNING ? (
              <>
                <Square size={24} fill="currentColor" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Play size={24} fill="currentColor" />
                <span>Start</span>
              </>
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
      />

      <TeleprompterSetup 
        isOpen={isTeleprompterSetupOpen}
        onClose={() => {
           setIsTeleprompterSetupOpen(false);
           // If they entered text, enable the mode automatically for convenience
           if (teleprompterSettings.text.length > 0 && !teleprompterSettings.isEnabled) {
              setTeleprompterSettings(prev => ({ ...prev, isEnabled: true }));
           }
        }}
        settings={teleprompterSettings}
        onUpdateSettings={setTeleprompterSettings}
      />
    </div>
  );
};

export default App;