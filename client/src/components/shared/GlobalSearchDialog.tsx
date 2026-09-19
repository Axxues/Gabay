import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Command, ArrowRight, BookOpen, Calendar, Inbox, FileText, Award, X } from 'lucide-react';
import { useLMS } from '@/contexts/LMSContext';
import { AnimatedModal } from '@/components/shared/ModalPortal';

interface GlobalSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
  onNavigateCourse?: (courseId: string, subTab?: string) => void;
}

export const GlobalSearchDialog: React.FC<GlobalSearchDialogProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onNavigateCourse
}) => {
  const { db } = useLMS();
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const navItems = [
    { label: 'Dashboard', tab: 'dashboard', category: 'Pages', icon: <Search className="w-4 h-4" /> },
    { label: 'Course Catalog & Sections', tab: 'courses', category: 'Pages', icon: <BookOpen className="w-4 h-4" /> },
    { label: 'Create New Course Shell', tab: 'create-course', category: 'Actions', icon: <BookOpen className="w-4 h-4" /> },
    { label: 'Create New College Account', tab: 'create-account', category: 'Actions', icon: <BookOpen className="w-4 h-4" /> },
    { label: 'Manage College Accounts', tab: 'accounts', category: 'Pages', icon: <BookOpen className="w-4 h-4" /> },
    { label: 'Academic Calendar & Schedule', tab: 'calendar', category: 'Pages', icon: <Calendar className="w-4 h-4" /> },
    { label: 'Conversations & Inbox', tab: 'inbox', category: 'Pages', icon: <Inbox className="w-4 h-4" /> },
    { label: 'User Profile & Identity', tab: 'profile', category: 'Pages', icon: <Search className="w-4 h-4" /> },
    { label: 'Session Navigation Trail', tab: 'history', category: 'Pages', icon: <Search className="w-4 h-4" /> },
    { label: 'Help & Knowledge Base', tab: 'help', category: 'Pages', icon: <Search className="w-4 h-4" /> },
  ];

  const filteredResults = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return { pages: [], courses: [], activities: [], quizzes: [] };

    const pages = navItems.filter(i => i.label.toLowerCase().includes(q));
    const courses = db.courses.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.section.toLowerCase().includes(q)
    );
    const activities = (db.activities || []).filter(a =>
      a.title.toLowerCase().includes(q) ||
      (a.category ?? '').toLowerCase().includes(q)
    );
    const quizzes = db.quizzes.filter(qz =>
      qz.title.toLowerCase().includes(q)
    );

    return { pages, courses, activities, quizzes };
  }, [searchTerm, db.courses, db.activities, db.quizzes]);

  const hasResults =
    filteredResults.pages?.length > 0 ||
    filteredResults.courses?.length > 0 ||
    filteredResults.activities?.length > 0 ||
    filteredResults.quizzes?.length > 0;

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      panelClassName="w-full max-w-3xl h-[560px] max-h-[88vh] bg-card border border-border rounded-2xl overflow-hidden flex flex-col"
    >
      {({ startClose }) => (
        <>
          {/* Search Header */}
          <div className="h-16 px-5 border-b border-border bg-muted/20 flex items-center shrink-0">
            <Search className="w-5 h-5 text-primary mr-3.5 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  startClose();
                }
              }}
              placeholder="Search views, courses, activities, quizzes... (Esc to close)"
              className="w-full bg-transparent border-none outline-none text-base text-foreground placeholder:text-muted-foreground font-sans font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  inputRef.current?.focus();
                }}
                className="text-xs font-sans font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors mr-2 cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={startClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
              title="Close search (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results Area (Fixed Height Canvas) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4 text-xs">
            {!searchTerm.trim() ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="p-4 rounded-2xl bg-muted text-muted-foreground border border-border">
                  <Command className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-base font-bold text-foreground">
                    Global System Search
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Type keywords to immediately jump to course shells, syllabus specs, speedgrader rubrics, activities, or quizzes.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap justify-center gap-2 max-w-lg">
                  <span className="text-[11px] font-sans text-muted-foreground self-center mr-1">Quick Jump:</span>
                  {['Dashboard', 'Courses', 'Calendar', 'Inbox', 'CMSC 150', 'CS 311', 'Quizzes', 'SpeedGrader'].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setSearchTerm(chip)}
                      className="px-3 py-1.5 text-xs font-sans font-semibold rounded-xl bg-muted/80 hover:bg-primary hover:text-primary-foreground text-foreground border border-border transition-all cursor-pointer shadow-soft"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            ) : !hasResults ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="p-3.5 rounded-2xl bg-muted text-muted-foreground">
                  <Search className="w-6 h-6 opacity-60" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-foreground text-sm">No matching resources found</p>
                  <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                    No items matched &ldquo;<span className="text-foreground font-semibold font-sans">{searchTerm}</span>&rdquo;. Try searching by subject code, title, or activity name.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Pages */}
                {filteredResults.pages.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[12px] font-semibold text-muted-foreground">
                      Navigation pages
                    </div>
                    <div className="space-y-1 mt-1">
                      {filteredResults.pages.map(page => (
                        <button
                          key={page.tab}
                          onClick={() => {
                            onNavigateTab(page.tab);
                            startClose();
                          }}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-accent text-left transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                              {page.icon}
                            </div>
                            <span className="font-bold text-foreground text-xs">{page.label}</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Courses */}
                {filteredResults.courses.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[12px] font-semibold text-muted-foreground">
                      Course shells
                    </div>
                    <div className="space-y-1 mt-1">
                      {filteredResults.courses.map(course => (
                        <button
                          key={course.id}
                          onClick={() => {
                            if (onNavigateCourse) onNavigateCourse(course.id, 'modules');
                            startClose();
                          }}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-accent text-left transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: course.color || '#64748b' }} />
                            <div>
                              <div className="font-bold text-foreground text-xs">{course.code}: {course.title}</div>
                              <div className="text-[10px] text-muted-foreground font-sans">{course.section} • {course.term}</div>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activities */}
                {filteredResults.activities.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[12px] font-semibold text-muted-foreground">
                      Activities
                    </div>
                    <div className="space-y-1 mt-1">
                      {filteredResults.activities.map(act => (
                        <button
                          key={act.id}
                          onClick={() => {
                            if (onNavigateCourse) onNavigateCourse(act.courseId, 'activities');
                            startClose();
                          }}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-accent text-left transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center space-x-2.5">
                            <FileText className="w-4 h-4 text-primary" />
                            <div>
                              <div className="font-bold text-foreground text-xs">{act.title}</div>
                              <div className="text-[10px] text-muted-foreground font-sans">{act.category ? `${act.category} • ` : ''}{act.pointsPossible} pts</div>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quizzes */}
                {filteredResults.quizzes.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[12px] font-semibold text-muted-foreground">
                      Quizzes & exams
                    </div>
                    <div className="space-y-1 mt-1">
                      {filteredResults.quizzes.map(quiz => (
                        <button
                          key={quiz.id}
                          onClick={() => {
                            if (onNavigateCourse) onNavigateCourse(quiz.courseId, 'quizzes');
                            startClose();
                          }}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-accent text-left transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center space-x-2.5">
                            <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <div>
                              <div className="font-bold text-foreground text-xs">{quiz.title}</div>
                              <div className="text-[10px] text-muted-foreground font-sans">{quiz.questions.length} Questions • {quiz.timeLimitMinutes} mins</div>
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border/70 bg-muted/40 flex items-center justify-between text-[12px] text-muted-foreground font-sans">
            <span>Global search</span>
            <span className="tabular-nums">Navigate: ↑↓ • Select: Enter • Dismiss: Esc</span>
          </div>
        </>
      )}
    </AnimatedModal>
  );
};
