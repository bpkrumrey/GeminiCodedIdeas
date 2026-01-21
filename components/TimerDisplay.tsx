
import React from 'react';

interface TimerDisplayProps {
  secondsRemaining: number;
  reminderSeconds?: number; // The user-defined threshold for the amber warning
  variant?: 'fullscreen' | 'mini';
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ 
  secondsRemaining, 
  reminderSeconds = 300, 
  variant = 'fullscreen' 
}) => {
  const isOvertime = secondsRemaining < 0;
  const absSeconds = Math.abs(secondsRemaining);
  
  const minutes = Math.floor(absSeconds / 60);
  const seconds = absSeconds % 60;

  const formattedTime = `${isOvertime ? '+' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Logic for visual states
  let colorClass = "text-gray-900 dark:text-gray-100"; // Default
  let animationClass = "";

  if (isOvertime) {
    // Red when over time
    colorClass = "text-red-600 dark:text-red-500";
  } else if (secondsRemaining <= reminderSeconds && secondsRemaining > 0) {
    // Flashing amber when under user threshold
    colorClass = "text-amber-500";
    animationClass = "animate-flash";
  }

  if (variant === 'mini') {
    let miniColorClass = "text-white"; 
    
    if (isOvertime) {
      miniColorClass = "text-red-500";
    } else if (secondsRemaining <= reminderSeconds && secondsRemaining > 0) {
      miniColorClass = "text-amber-400"; 
    }

    return (
      <div className={`flex items-center gap-3 px-4 py-2 bg-gray-900 rounded-br-2xl border-b border-r border-gray-700 shadow-xl z-50 transition-colors duration-300`}>
        <div className={`text-4xl font-bold tabular-nums leading-none tracking-tight ${miniColorClass} ${animationClass}`}>
          {formattedTime}
        </div>
        {isOvertime && (
          <span className="text-xs font-bold text-red-500 uppercase tracking-widest">
            Overtime
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full flex-grow p-4">
      <div 
        className={`font-bold tabular-nums leading-none tracking-tight transition-colors duration-300 ${colorClass} ${animationClass}`}
        style={{ fontSize: 'clamp(4rem, 20vw, 20rem)' }}
      >
        {formattedTime}
      </div>
      {isOvertime && (
        <span className="text-xl md:text-3xl font-semibold text-red-600 uppercase tracking-widest mt-4">
          Overtime
        </span>
      )}
      {!isOvertime && secondsRemaining <= reminderSeconds && (
        <span className="text-xl md:text-3xl font-semibold text-amber-500 uppercase tracking-widest mt-4">
          Warning
        </span>
      )}
    </div>
  );
};
