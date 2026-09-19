import React, { useState } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import type { CourseSection } from '@/services/lms/types/lms.types';
import { canPickSection } from '@/utils/sections';
import { BookOpen, MapPin, Clock, Users, Check, ArrowLeft, Loader2 } from 'lucide-react';

interface SectionSelectionPageProps {
  courseId: string;
  onSectionSelected: () => void;
}

export const SectionSelectionPage: React.FC<SectionSelectionPageProps> = ({
  courseId,
  onSectionSelected
}) => {
  const { db, activeUser, activeRole, selectSection, requestSectionSwitch, showAlert } = useLMS();
  const course = db.courses.find(c => c.id === courseId);
  const sections: CourseSection[] = (db.courseSections || []).filter((s: CourseSection) => s.courseId === courseId);

  const currentSectionId = activeUser.courseSections?.[courseId];
  const [processingSectionId, setProcessingSectionId] = useState<string | null>(null);

  const handleSelectSection = async (sectionId: string) => {
    if (processingSectionId) return;
    const section = (db.courseSections || []).find((s: CourseSection) => s.id === sectionId);
    if (!section) return;

    if (!canPickSection(section)) {
      showAlert('This section is full. Please choose another section.', 'Section Full');
      return;
    }

    setProcessingSectionId(sectionId);
    try {
      const bypassGate = activeRole === 'faculty' || activeRole === 'admin';
      if (!bypassGate) {
        const hasApproval = (db.enrollmentRequests || []).some(
          r => r.studentId === activeUser.id && r.courseId === courseId && r.status === 'approved'
        );
        if (!hasApproval) {
          showAlert(
            'You need an approved enrollment request before selecting a section.',
            'Section Selection Blocked'
          );
          return;
        }

        if (currentSectionId && currentSectionId !== sectionId) {
          const alreadyPending = (db.enrollmentRequests || []).some(
            r => r.studentId === activeUser.id && r.courseId === courseId && r.type === 'section_switch' && r.targetSectionId === sectionId && r.status === 'pending'
          );
          if (alreadyPending) {
            showAlert({ title: 'Switch Pending', message: 'Switch already requested — waiting for faculty approval.', type: 'info' });
            return;
          }
          const switched = await requestSectionSwitch(courseId, sectionId);
          if (switched) {
            showAlert({ title: 'Switch Requested', message: 'Switch requested — waiting for faculty approval.', type: 'info' });
          }
          return;
        }
      }

      const ok = await selectSection(courseId, sectionId);
      if (!ok) return;
      showAlert({ title: 'Section Selected', message: `You have been assigned to ${section.name}.`, type: 'success' });
      onSectionSelected();
    } finally {
      setProcessingSectionId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 pb-5 border-b border-border/70">
        <button onClick={onSectionSelected} className="p-2 hover:bg-muted rounded-xl cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-[22px] font-extrabold">Select your section</h1>
          <p className="text-[13px] text-muted-foreground">
            {course?.code} • {course?.title}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {sections.map(section => {
          const isFull = section.capacity !== undefined && section.enrolledCount >= section.capacity;
          const isSelected = currentSectionId === section.id;
          const slotsLeft = section.capacity !== undefined ? section.capacity - section.enrolledCount : 0;

          return (
            <button
              key={section.id}
              onClick={() => !isFull && !isSelected && !processingSectionId && handleSelectSection(section.id)}
              disabled={isFull || isSelected || processingSectionId !== null}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer disabled:cursor-wait ${
                isSelected
                  ? 'border-border bg-muted ring-1 ring-primary/15'
                  : isFull
                  ? 'border-border bg-muted/50 opacity-60 cursor-not-allowed'
                  : 'border-border bg-card hover:ring-1 hover:ring-primary/15'
              } ${processingSectionId === section.id ? 'opacity-70' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <span className="font-bold text-[14px]">{section.name}</span>
                </div>
                {processingSectionId === section.id ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-primary">
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </span>
                ) : (
                  <>
                    {isSelected && (
                      <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-muted text-muted-foreground border border-border">
                        <Check className="w-3.5 h-3.5" /> Selected
                      </span>
                    )}
                    {isFull && !isSelected && (
                      <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-muted text-muted-foreground border border-border">Full</span>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
                {section.schedule && (
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {section.schedule}</span>
                )}
                {section.location && (
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {section.location}</span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {section.capacity === undefined
                    ? `${section.enrolledCount} enrolled · Uncapped`
                    : `${section.enrolledCount}/${section.capacity} enrolled`}
                  {!isFull && section.capacity !== undefined && <span className="text-emerald-600">({slotsLeft} slots left)</span>}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SectionSelectionPage;
