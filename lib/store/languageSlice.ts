import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getTranslation } from "@/lib/i18n/translations";
import type { Language } from "@/lib/i18n/translations";
import { RootState } from './index'; // Import RootState for typed selectors

interface LanguageState {
  currentLanguage: Language;
}

const getInitialLanguage = (): Language => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("language") as Language | null;
    if (saved && (saved === "en" || saved === "pt")) {
      return saved;
    }
  }
  return "en";
};

const initialState: LanguageState = {
  currentLanguage: getInitialLanguage(),
};

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.currentLanguage = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem("language", action.payload);
      }
    },
  },
});

export const { setLanguage } = languageSlice.actions;

// Selector to get current language
export const selectCurrentLanguage = (state: RootState) => state.language.currentLanguage;

// Selector for translation function
export const selectT = (state: RootState) => (path: string): string => {
  return getTranslation(state.language.currentLanguage, path, path);
};

export default languageSlice.reducer;
