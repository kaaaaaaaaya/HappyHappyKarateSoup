import { useState } from 'react';

export const useSelectIngredient = () => {
  const [selectedChar, setSelectedChar] = useState<string[]>([]);

  const toggleSelection = (emoji: string) => {
    setSelectedChar((prev) => {
      if (prev.includes(emoji)) {
        return prev.filter(e => e !== emoji);
      } else {
        if (prev.length >= 3) return prev;
        return [...prev, emoji];
      }
    });
  };

  return {
    selectedChar,
    setSelectedChar,
    toggleSelection,
    isReady: selectedChar.length === 3
  };
};
