import React, { useState, useEffect, useRef } from 'react';
import { X, Type, FileText, Mic, Save, FolderOpen, Trash2, AlertTriangle } from 'lucide-react';
import { TeleprompterSettings, SavedScript } from '../types';

interface TeleprompterSetupProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TeleprompterSettings;
  onUpdateSettings: (settings: TeleprompterSettings) => void;
}

export const TeleprompterSetup: React.FC<TeleprompterSetupProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onUpdateSettings 
}) => {
  const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  
  // Modal States
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [scriptToDeleteId, setScriptToDeleteId] = useState<string | null>(null);

  const [scriptNameInput, setScriptNameInput] = useState("");
  
  // Audio analysis refs for the visualizer
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Load scripts from local storage
    const saved = localStorage.getItem('presenter_timer_scripts');
    if (saved) {
      try {
        setSavedScripts(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved scripts");
      }
    }
  }, []);

  // Voice Calibration Visualizer
  useEffect(() => {
    if (isOpen) {
      startCalibration();
    } else {
      stopCalibration();
    }
    return () => stopCalibration();
  }, [isOpen]);

  const startCalibration = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        // Normalize roughly 0-100
        setMicLevel(Math.min(100, avg)); 
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
      setIsCalibrating(true);
    } catch (e) {
      console.warn("Could not start audio for calibration setup");
    }
  };

  const stopCalibration = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    setIsCalibrating(false);
  };

  // --- SAVE HANDLERS ---
  const handleSaveClick = () => {
    if (!settings.text.trim()) {
      alert("Please enter some text before saving.");
      return;
    }
    setScriptNameInput(`Script ${savedScripts.length + 1}`);
    setIsSaveModalOpen(true);
  };

  const handleConfirmSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const now = new Date();
    // Create a readable timestamp for the filename
    const dateStr = now.toLocaleDateString().replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }).replace(/:/g, '');
    
    // User input or default, plus timestamp
    const nameToUse = scriptNameInput.trim() || 'Untitled';
    const finalName = `${nameToUse} (${dateStr} ${timeStr})`;

    const newScript: SavedScript = {
      id: Date.now().toString(),
      name: finalName,
      text: settings.text,
      date: now.toLocaleString()
    };

    const updated = [newScript, ...savedScripts];
    setSavedScripts(updated);
    localStorage.setItem('presenter_timer_scripts', JSON.stringify(updated));
    setIsSaveModalOpen(false); // Close modal
  };

  // --- LOAD HANDLERS ---
  const handleLoad = (script: SavedScript) => {
    onUpdateSettings({ ...settings, text: script.text });
    setShowLoadMenu(false);
  };

  // --- DELETE HANDLERS ---
  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setScriptToDeleteId(id);
  };

  const confirmDeleteScript = () => {
    if (scriptToDeleteId) {
      const updated = savedScripts.filter(s => s.id !== scriptToDeleteId);
      setSavedScripts(updated);
      localStorage.setItem('presenter_timer_scripts', JSON.stringify(updated));
      setScriptToDeleteId(null);
    }
  };

  // --- CLEAR HANDLERS ---
  const handleClearClick = () => {
    setIsClearModalOpen(true);
  };

  const confirmClearText = () => {
    onUpdateSettings({ ...settings, text: '' });
    setIsClearModalOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden transform transition-all relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2 text-brand-orange">
            <FileText size={24} className="text-orange-600 dark:text-orange-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Teleprompter Setup</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="flex-grow flex flex-col md:flex-row h-full overflow-hidden">
          {/* Editor Area */}
          <div className="flex-grow p-4 md:p-6 flex flex-col relative">
             <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Script Content
                </label>
                <div className="flex gap-2">
                  <button 
                    onClick={handleClearClick} 
                    className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition" 
                    title="Clear Text"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="relative">
                    <button 
                      onClick={() => setShowLoadMenu(!showLoadMenu)} 
                      className={`p-1.5 rounded transition flex items-center gap-1 ${showLoadMenu ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                      title="Open Saved Scripts"
                    >
                      <FolderOpen size={16} />
                    </button>
                    
                    {/* Load Menu Overlay */}
                    {showLoadMenu && (
                      <div className="absolute top-full right-0 mt-2 w-72 max-h-60 overflow-y-auto bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 z-20">
                        <div className="p-2 border-b border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 dark:text-gray-400">
                          SAVED SCRIPTS
                        </div>
                        {savedScripts.length === 0 ? (
                          <div className="p-4 text-sm text-gray-500 text-center">No saved scripts found.</div>
                        ) : (
                          savedScripts.map(script => (
                            <div 
                                key={script.id} 
                                onClick={() => handleLoad(script)}
                                className="p-3 border-b border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer flex justify-between items-center group transition-colors"
                            >
                              <div className="overflow-hidden">
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={script.name}>{script.name}</div>
                                <div className="text-xs text-gray-400">{script.date}</div>
                              </div>
                              <button 
                                onClick={(e) => handleDeleteClick(script.id, e)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded opacity-0 group-hover:opacity-100 transition-all"
                                title="Delete Script"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  
                  <button onClick={handleSaveClick} className="p-1.5 text-gray-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition" title="Save Script">
                    <Save size={16} />
                  </button>
                </div>
             </div>

             <textarea
                className="flex-grow w-full p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-orange-500 outline-none font-sans text-lg leading-relaxed"
                placeholder="Paste or type your script here..."
                value={settings.text}
                onChange={(e) => onUpdateSettings({ ...settings, text: e.target.value })}
             />
          </div>

          {/* Sidebar Controls */}
          <div className="w-full md:w-80 bg-gray-50 dark:bg-gray-900/50 border-l border-gray-200 dark:border-gray-700 p-6 flex flex-col gap-6 overflow-y-auto">
            
            {/* Font Size Control */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-gray-900 dark:text-white font-medium">
                <Type size={18} />
                <span>Font Size</span>
              </div>
              <input 
                type="range" 
                min="24" 
                max="120" 
                step="4"
                value={settings.fontSize}
                onChange={(e) => onUpdateSettings({ ...settings, fontSize: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-orange-600"
              />
              <div className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                {settings.fontSize}px
              </div>
            </div>

            {/* Voice Calibration */}
            <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-gray-900 dark:text-white font-medium">
                <Mic size={18} className="text-orange-500" />
                <span>Voice Calibration</span>
              </div>
              
              <div className="space-y-4">
                {/* Level Meter */}
                <div className="w-full h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
                   <div 
                      className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-75 ease-out"
                      style={{ width: `${micLevel}%` }}
                   />
                   {/* Threshold Marker */}
                   <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-black dark:bg-white opacity-70"
                      style={{ left: `${100 - settings.audioSensitivity}%` }}
                   />
                </div>

                {/* Sensitivity Control */}
                <div>
                   <label className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Low Sensitivity</span>
                      <span>High Sensitivity</span>
                   </label>
                   <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="1"
                    value={settings.audioSensitivity}
                    onChange={(e) => onUpdateSettings({ ...settings, audioSensitivity: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-500"
                   />
                   <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                     Adjust the sensitivity so that the meter only crosses the vertical line when YOU speak, filtering out background noise.
                   </p>
                </div>
              </div>
            </div>

            <div className="mt-auto">
               <button
                  onClick={onClose}
                  className="w-full py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-500/30 transition-all"
               >
                 Done
               </button>
            </div>
          </div>
        </div>

        {/* --- MODALS --- */}

        {/* Save Dialog Overlay */}
        {isSaveModalOpen && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-700 transform transition-all">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Save Script</h3>
                <form onSubmit={handleConfirmSave}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Script Name
                    </label>
                    <input 
                      type="text" 
                      value={scriptNameInput}
                      onChange={(e) => setScriptNameInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                      autoFocus
                      placeholder="Enter script name"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Current date and time will be automatically appended.
                    </p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsSaveModalOpen(false)}
                      className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </form>
             </div>
          </div>
        )}

        {/* Clear Text Confirmation */}
        {isClearModalOpen && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700 text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="text-red-600 dark:text-red-500" size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Clear Text?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Are you sure you want to clear the editor? This action cannot be undone.
                </p>
                <div className="flex justify-center gap-3">
                    <button 
                      onClick={() => setIsClearModalOpen(false)}
                      className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={confirmClearText}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm transition-colors"
                    >
                      Clear All
                    </button>
                </div>
             </div>
          </div>
        )}

        {/* Delete Script Confirmation */}
        {scriptToDeleteId && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm border border-gray-200 dark:border-gray-700 text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                  <Trash2 className="text-red-600 dark:text-red-500" size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Script?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  This will permanently delete this saved script from your list.
                </p>
                <div className="flex justify-center gap-3">
                    <button 
                      onClick={() => setScriptToDeleteId(null)}
                      className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={confirmDeleteScript}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm transition-colors"
                    >
                      Delete
                    </button>
                </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};