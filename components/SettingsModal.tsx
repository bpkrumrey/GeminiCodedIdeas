import React, { useState } from 'react';
import { X, Clock } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetTime: (minutes: number) => void;
  currentMinutes: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSetTime, currentMinutes }) => {
  const [inputValue, setInputValue] = useState<string>(currentMinutes.toString());

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const minutes = parseInt(inputValue, 10);
    if (!isNaN(minutes) && minutes > 0) {
      onSetTime(minutes);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2 text-brand-orange">
            <Clock size={24} className="text-orange-600 dark:text-orange-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Set Timer</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <label className="block mb-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Duration (Minutes)</span>
            <input
              type="number"
              min="1"
              max="999"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-3xl font-bold text-center focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-shadow"
              autoFocus
            />
          </label>
          
          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-500/30 transition-all transform active:scale-95"
            >
              Set Time
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};