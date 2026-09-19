import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { TermId } from '@/services/lms/types/lms.types';

export interface CourseContextType {
  activeCourseId: string | null;
  selectedSectionId: string | null;
  activeTerm: TermId | null;
  setActiveCourseId: (id: string | null) => void;
  setSelectedSectionId: (id: string | null) => void;
  setActiveTerm: (term: TermId | null) => void;
}

export const CourseContext = createContext<CourseContextType | undefined>(undefined);

export const CourseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeCourseId, setActiveCourseIdState] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [activeTerm, setActiveTerm] = useState<TermId | null>(null);

  const setActiveCourseId = useCallback((id: string | null) => {
    setActiveCourseIdState(id);
  }, []);

  return (
    <CourseContext.Provider
      value={{
        activeCourseId,
        selectedSectionId,
        activeTerm,
        setActiveCourseId,
        setSelectedSectionId,
        setActiveTerm,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
};

export function useCourse(): CourseContextType {
  const ctx = useContext(CourseContext);
  if (!ctx) {
    throw new Error('useCourse must be used within a CourseProvider');
  }
  return ctx;
}
