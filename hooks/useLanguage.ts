import { useState, useEffect } from 'react';
import { languageStore } from '@/stores/languageStore';

export function useLanguage() {
  const [state, setState] = useState(languageStore.getState());

  useEffect(() => {
    // Load saved language on mount
    languageStore.getState().loadLanguage();
    
    // Subscribe to changes
    const unsubscribe = languageStore.subscribe(() => {
      setState(languageStore.getState());
    });

    return unsubscribe;
  }, []);

  return state;
}

// Hook for translation function only
export function useTranslation() {
  const { t } = useLanguage();
  return { t };
}