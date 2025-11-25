export enum TimerStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
}

export interface TimerState {
  totalSeconds: number;
  initialMinutes: number;
  status: TimerStatus;
}

export interface TeleprompterSettings {
  isEnabled: boolean;
  text: string;
  fontSize: number; // in pixels
  isListening: boolean;
  audioSensitivity: number; // 0-100, threshold for noise gate
}

export interface SavedScript {
  id: string;
  name: string;
  text: string;
  date: string;
}