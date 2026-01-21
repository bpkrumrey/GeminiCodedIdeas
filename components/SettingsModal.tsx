
import React, { useState } from 'react';
import { X, Clock, AlertTriangle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetTime: (minutes: number, reminderMinutes: number) => void;
  currentMinutes: number;
  currentReminder: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  onSetTime, 
  currentMinutes,
  currentReminder
}) => {
  const [minutesValue, setMinutesValue] = useState<string>(currentMinutes.toString());
  const [reminderValue, setReminderValue] = useState<string>(currentReminder.toString());

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseInt(minutesValue, 10);
    const rems = parseInt(reminderValue, 10);
    if (!isNaN(mins) && mins > 0 && !isNaN(rems) && rems >= 0) {
      onSetTime(mins, rems);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-gray-100 dark:border-gray-700">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
               <Clock size={24} className="text-orange-600 dark:text-orange-500" />
             </div>
             <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Set Timer</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div>
            <label className="block mb-2">
              <span className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Speech Duration (Minutes)</span>
              <input
                type="number"
                min="1"
                max="999"
                value={minutesValue}
                onChange={(e) => setMinutesValue(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-4xl font-black text-center focus:ring-4 focus:ring-orange-500/20 outline-none transition-all shadow-inner"
              />
            </label>
          </div>

          <div>
            <label className="block mb-2">
              <span className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                Reminder Alert (Minutes before end)
              </span>
              <input
                type="number"
                min="0"
                max={minutesValue}
                value={reminderValue}
                onChange={(e) => setReminderValue(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-4xl font-black text-center focus:ring-4 focus:ring-amber-500/20 outline-none transition-all shadow-inner"
              />
            </label>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 text-center">
              The timer will flash amber starting at {reminderValue} min remaining.
            </p>
          </div>
          
          <div className="flex flex-col gap-3 pt-4">
            <button
              type="submit"
              className="w-full py-5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest text-lg shadow-2xl shadow-orange-500/40 transition-all transform active:scale-95"
            >
              Update Settings
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
