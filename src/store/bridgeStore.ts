import { create } from 'zustand';
import type { AiBridgeSuggestion } from '../types';

interface BridgeState {
  suggestions: AiBridgeSuggestion[];
  addSuggestion: (suggestion: AiBridgeSuggestion) => void;
  removeSuggestion: (suggestionId: string) => void;
}

export const useBridgeStore = create<BridgeState>((set) => ({
  suggestions: [],
  addSuggestion: (suggestion) =>
    set((state) => ({
      suggestions: [
        suggestion,
        ...state.suggestions.filter((item) => item.id !== suggestion.id),
      ].slice(0, 6),
    })),
  removeSuggestion: (suggestionId) =>
    set((state) => ({
      suggestions: state.suggestions.filter((item) => item.id !== suggestionId),
    })),
}));

