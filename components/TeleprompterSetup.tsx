
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  
  // Modal States
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [scriptToDeleteId, setScriptToDeleteId] = useState<string | null>(null);

  const [scriptNameInput, setScriptNameInput] = useState("");
  
  // Audio analysis refs for the visualizer
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const stopCalibration = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    setMicLevel(0);
  }, []);

  const startCalibration = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
        
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        setMicLevel(Math.min(100, avg)); 
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (e) {
      console.warn("Could not start audio for calibration setup");
    }
  };

  useEffect(() => {
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
  }, [isOpen, stopCalibration]);

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
    const dateStr = now.toLocaleDateString().replace(/\//g, '-');
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }).replace(/:/g, '');
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
    setIsSaveModalOpen(false);
  };

  // --- LOAD HANDLERS ---
  const handleLoad = (script: SavedScript) => {
    onUpdateSettings({ ...settings, text: script.text });
    setShowLoadMenu(false);
  };

  // --- DELETE HANDLERS ---
  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
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
  const handleClearClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsClearModalOpen(true);
  };

  const confirmClearText = () => {
    onUpdateSettings({ ...settings, text: '' });
    setIsClearModalOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden transform transition-all relative">
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <FileText size={24} className="text-orange-600 dark:text-orange-500" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Teleprompter Setup</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Body */}
        <div className="flex-grow flex flex-col md:flex-row h-full overflow-hidden">
          {/* Editor Area */}
          <div className="flex-grow p-6 flex flex-col min-h-0">
             <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-black uppercase tracking-widest text-gray-400">
                  Script Content
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={handleClearClick} 
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" 
                  >
                    <Trash2 size={14} /> Clear
                  </button>
                  <div className="relative">
                    <button 
                      onClick={() => setShowLoadMenu(!showLoadMenu)} 
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition ${showLoadMenu ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                    >
                      <FolderOpen size={14} /> Open
                    </button>
                    
                    {/* Load Menu Overlay */}
                    {showLoadMenu && (
                      <div className="absolute top-full right-0 mt-2 w-80 max-h-80 overflow-y-auto bg-white dark:bg-gray-700 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-600 z-50 animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-[10px] font-black tracking-widest text-gray-400 uppercase">
                          SAVED SCRIPTS
                        </div>
                        {savedScripts.length === 0 ? (
                          <div className="p-8 text-sm text-gray-400 text-center italic">No saved scripts.</div>
                        ) : (
                          savedScripts.map(script => (
                            <div 
                                key={script.id} 
                                onClick={() => handleLoad(script)}
                                className="p-4 border-b border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer flex justify-between items-center group transition-colors"
                            >
                              <div className="overflow-hidden pr-2">
                                <div className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{script.name}</div>
                                <div className="text-[10px] text-gray-400 font-mono mt-0.5">{script.date}</div>
                              </div>
                              <button 
                                onClick={(e) => handleDeleteClick(script.id, e)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  
                  <button onClick={handleSaveClick} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition">
                    <Save size={14} /> Save
                  </button>
                </div>
             </div>

             <textarea
                className="flex-grow w-full p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none focus:ring-4 focus:ring-orange-500/20 outline-none font-sans text-xl leading-relaxed transition-all"
                placeholder="Paste or type your script here... Use {brackets} for translation blocks."
                value={settings.text}
                onChange={(e) => onUpdateSettings({ ...settings, text: e.target.value })}
             />
          </div>

          {/* Sidebar Controls */}
          <div className="w-full md:w-96 bg-gray-50 dark:bg-gray-900/50 border-l border-gray-200 dark:border-gray-700 p-8 flex flex-col gap-8 overflow-y-auto no-scrollbar pb-24">
            {/* Font Size Control */}
            <div>
              <div className="flex items-center gap-2 mb-4 text-gray-900 dark:text-white font-black uppercase tracking-widest text-xs">
                <Type size={18} className="text-orange-500" />
                <span>Font Size</span>
              </div>
              <input 
                type="range" 
                min="24" 
                max="120" 
                step="4"
                value={settings.fontSize}
                onChange={(e) => onUpdateSettings({ ...settings, fontSize: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer dark:bg-gray-700 accent-orange-600"
              />
              <div className="mt-3 text-right font-mono text-xl font-bold text-orange-600 dark:text-orange-500">
                {settings.fontSize}px
              </div>
            </div>

            {/* Voice Calibration */}
            <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2 mb-5 text-gray-900 dark:text-white font-black uppercase tracking-widest text-xs">
                <Mic size={18} className="text-orange-500" />
                <span>Voice Calibration</span>
              </div>
              <div className="space-y-6">
                <div className="w-full h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative border border-gray-200 dark:border-gray-600">
                   <div className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-75" style={{ width: `${micLevel}%` }} />
                   <div className="absolute top-0 bottom-0 w-1 bg-black dark:bg-white opacity-80" style={{ left: `${100 - settings.audioSensitivity}%` }} />
                </div>
                <div>
                   <label className="flex justify-between font-black uppercase tracking-tighter text-[9px] text-gray-400 mb-2">
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
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                   />
                </div>
              </div>
            </div>

            <div className="pt-4 mt-auto">
               <button 
                  onClick={onClose} 
                  className="w-full py-5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black uppercase tracking-widest text-lg shadow-2xl shadow-orange-500/40 transition-all transform active:scale-95"
                >
                 Finish Setup
               </button>
            </div>
          </div>
        </div>

        {/* --- MODALS --- */}

        {isSaveModalOpen && (
          <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 w-full max-w-md border border-gray-100 dark:border-gray-700">
                <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white mb-6">Save Script</h3>
                <form onSubmit={handleConfirmSave}>
                  <div className="mb-8">
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Script Name</label>
                    <input 
                      type="text" 
                      value={scriptNameInput}
                      onChange={(e) => setScriptNameInput(e.target.value)}
                      className="w-full px-5 py-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-bold focus:ring-4 focus:ring-orange-500/20 outline-none transition-all"
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setIsSaveModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                    <button type="submit" className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest shadow-lg shadow-green-500/20 transition-all">Confirm Save</button>
                  </div>
                </form>
             </div>
          </div>
        )}

        {isClearModalOpen && (
          <div className="absolute inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 w-full max-w-sm border border-gray-100 dark:border-gray-700 text-center">
                <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
                  <AlertTriangle className="text-red-600 dark:text-red-500" size={32} />
                </div>
                <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white mb-2">Clear Script?</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">This will permanently remove all text from the editor.</p>
                <div className="flex flex-col gap-3">
                    <button onClick={confirmClearText} className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all">Yes, Clear All</button>
                    <button onClick={() => setIsClearModalOpen(false)} className="w-full py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
