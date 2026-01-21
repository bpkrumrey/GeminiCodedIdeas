
import React from 'react';
import { X, Globe, Check, Volume2, User } from 'lucide-react';
import { TranslationSettings, AVAILABLE_LANGUAGES, AVAILABLE_VOICES } from '../types';

interface TranslationSetupProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TranslationSettings;
  onUpdateSettings: (settings: TranslationSettings) => void;
}

export const TranslationSetup: React.FC<TranslationSetupProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings
}) => {
  if (!isOpen) return null;

  const toggleLanguage = (langName: string) => {
    // Only allow one target language
    onUpdateSettings({
      ...settings,
      targetLanguages: [langName]
    });
  };

  const toggleVoice = () => {
    onUpdateSettings({
      ...settings,
      voiceEnabled: !settings.voiceEnabled
    });
  };

  const setVoiceName = (id: string) => {
    onUpdateSettings({
      ...settings,
      voiceName: id
    });
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Globe size={24} className="text-blue-600 dark:text-blue-500" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Translation</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8 no-scrollbar">
          {/* Voice Output Toggle */}
          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${settings.voiceEnabled ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                <Volume2 size={24} />
              </div>
              <div>
                <span className="block font-black text-lg text-gray-900 dark:text-gray-100">Voice Output</span>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-600/60 dark:text-blue-400/60">Audio TTS</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={settings.voiceEnabled || false} 
                onChange={toggleVoice} 
                className="sr-only peer" 
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Voice Selection */}
          {settings.voiceEnabled && (
            <div className="animate-in slide-in-from-top-4 duration-300">
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                <User size={14} />
                Speaker Voice
              </label>
              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_VOICES.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setVoiceName(voice.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                      settings.voiceName === voice.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-lg shadow-blue-500/10'
                        : 'border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="text-sm font-black">{voice.id}</div>
                    <div className="text-[9px] uppercase font-black tracking-widest opacity-60 mt-1">{voice.gender}</div>
                    {settings.voiceName === voice.id && (
                      <div className="mt-2 text-blue-500">
                        <Check size={16} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 dark:border-gray-700 pt-8">
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-4">
              Select Target Language
            </label>
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_LANGUAGES.map((lang) => {
                const isSelected = settings.targetLanguages.includes(lang.name);
                return (
                  <button
                    key={lang.code}
                    onClick={() => toggleLanguage(lang.name)}
                    className={`flex items-center justify-between px-4 py-4 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 shadow-lg shadow-orange-500/10'
                        : 'border-gray-100 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="font-bold text-sm">{lang.name}</span>
                    {isSelected && <Check size={18} className="text-orange-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="w-full py-5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest text-lg shadow-2xl shadow-orange-500/40 transition-all transform active:scale-95"
          >
            Finish Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
