import React from 'react';
import { MOODS, getMood } from '../lib/moods';
import { cn } from '@/lib/utils';

interface MoodSelectorProps {
  selectedMood: string | null;
  onSelect: (moodId: string | null) => void;
  compact?: boolean;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({ selectedMood, onSelect, compact }) => {
  return (
    <div className={cn("flex flex-wrap gap-2", compact ? "justify-start" : "justify-center")}>
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "flex items-center gap-1.5 rounded-full border transition-all text-sm font-medium",
          compact ? "px-2.5 py-1" : "px-4 py-2",
          !selectedMood
            ? "bg-primary text-primary-foreground border-primary shadow-md"
            : "bg-white text-slate-500 border-slate-200 hover:border-primary/50"
        )}
      >
        Todos
      </button>
      {MOODS.map((mood) => {
        const isActive = selectedMood === mood.id;
        return (
          <button
            key={mood.id}
            onClick={() => onSelect(mood.id === selectedMood ? null : mood.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border transition-all text-sm font-medium",
              compact ? "px-2.5 py-1" : "px-4 py-2",
          isActive
            ? "btn-mood-active shadow-md scale-105"
            : "bg-white text-slate-600 border-slate-200 hover:border-primary/50 hover:text-primary"
            )}
          >
            <span className="text-base">{mood.emoji}</span>
            <span>{mood.label}</span>
          </button>
        );
      })}
    </div>
  );
};
