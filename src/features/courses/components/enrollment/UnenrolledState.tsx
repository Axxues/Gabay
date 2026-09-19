import React from 'react';
import { BookOpen } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { JoinCourseModal } from '@/features/courses/components/enrollment/JoinCourseModal';

interface UnenrolledStateProps {
  showJoinAction: boolean;
  isJoinModalOpen: boolean;
  onOpenJoinModal: () => void;
  onCloseJoinModal: () => void;
  onNavigateCourse: (id: string) => void;
}

export const UnenrolledState: React.FC<UnenrolledStateProps> = ({
  showJoinAction,
  isJoinModalOpen,
  onOpenJoinModal,
  onCloseJoinModal,
  onNavigateCourse,
}) => {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <main className="min-h-0 flex-1 p-6 overflow-y-auto bg-background custom-scrollbar">
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="You are not enrolled in this course yet."
          body={
            showJoinAction
              ? 'You still haven\u2019t been enrolled in a course. Please ask your instructor for the course join code, then click below to join.'
              : 'There is no course available to display right now.'
          }
          actionLabel={showJoinAction ? 'Enter Course Join Code' : undefined}
          onAction={showJoinAction ? onOpenJoinModal : undefined}
        />
      </main>

      <JoinCourseModal
        isOpen={isJoinModalOpen}
        onClose={onCloseJoinModal}
        onNavigateCourse={onNavigateCourse}
      />
    </div>
  );
};
