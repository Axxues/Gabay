import React, { useState, useEffect } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import { ModulesView } from './ModulesView';
import { SyllabusView } from './SyllabusView';
import { ActivitiesView } from '@/features/assessments/pages/ActivitiesView';
import { QuizzesView } from '@/features/assessments/pages/QuizzesView';
import { ExamsView } from '@/features/assessments/pages/ExamsView';
import { PeopleView } from './PeopleView';
import { AnnouncementsView } from './AnnouncementsView';
import { FilesView } from './FilesView';
import { FacultyGradebook } from '@/features/grading/components/gradebook/FacultyGradebook';
import { StudentGradebook } from '@/features/grading/components/gradebook/StudentGradebook';

import { JoinCourseModal } from '@/features/courses/components/enrollment/JoinCourseModal';
import { CourseTabBar } from '@/features/courses/components/course-tabs/CourseTabBar';
import { UnenrolledState } from '@/features/courses/components/enrollment/UnenrolledState';
import { PageTransition } from '@/components/shared/PageTransition';
import { COURSE_CHILDREN, isVisible } from '@/constants/navigation';
import {
  countNewFiles,
  countNewGrades,
  countPendingPeople,
  countStudentAssessmentBadge,
  countFacultyGradingBadge,
  countUpcomingCalendar,
  countUnreadAnnouncements,
  countUnreadMessages,
} from '@/utils/notifiers';

interface CoursesPageProps {
  initialSubTab?: string;
}

export const CoursesPage: React.FC<CoursesPageProps> = ({ initialSubTab = 'modules' }) => {
  const { activeCourseId, setActiveCourseId, db, activeRole, activeUser, getUnreadNotificationCount, markTabVisited } = useLMS();

  const [subTab, setSubTab] = useState(initialSubTab);
  const [returnToTab, setReturnToTab] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Defense-in-depth: enrollment truth is approved request rows. Fall back
  // to them when activeUser.enrolledCourseIds is stale (e.g. approved on
  // another machine before this session re-hydrated).
  const approvedCourseIds = new Set(
    (db.enrollmentRequests || [])
      .filter(r => r.studentId === activeUser.id && r.status === 'approved')
      .map(r => r.courseId)
  );
  const availableCourses = activeRole === 'student'
    ? db.courses.filter(c => (activeUser.enrolledCourseIds || []).includes(c.id) || approvedCourseIds.has(c.id))
    : db.courses;

  const activeCourse = activeRole === 'student'
    ? availableCourses.find(c => c.id === activeCourseId) || availableCourses[0]
    : availableCourses.find(c => c.id === activeCourseId) || availableCourses[0] || db.courses[0];

  // Student explicitly navigated to a course they are not enrolled in
  // (stale activeCourseId from history/search), or has no enrollments at
  // all (db.courses is scoped to enrolled courses, so availableCourses is
  // empty and activeCourse is undefined -> previously crashed on
  // activeCourse.id with an Application Recovery error).
  // Only show the unenrolled message when the student has zero enrolled
  // courses; otherwise fall back to one of their enrolled courses so the
  // default activeCourseId doesn't block navigation.
  const hasNoEnrollments =
    activeRole === 'student' && availableCourses.length === 0;

  useEffect(() => {
    setSubTab(initialSubTab);
    if (activeCourse) markTabVisited(initialSubTab, activeCourse.id);
  }, [initialSubTab]);

  useEffect(() => {
    if (activeRole === 'student' && subTab === 'pending-requests') {
      setSubTab('modules');
    }
    // Legacy guard: 'pending-requests' was removed as a standalone
    // course sub-tab (now handled inside People). Redirect any stale
    // navigation (history, search) to People instead of a blank view.
    if (subTab === 'pending-requests' && (activeRole === 'faculty' || activeRole === 'admin')) {
      setSubTab('people');
    }
  }, [activeRole, subTab]);

  if (hasNoEnrollments || !activeCourse) {
    const showJoinAction = activeRole === 'student';
    return (
      <UnenrolledState
        showJoinAction={showJoinAction}
        isJoinModalOpen={isJoinModalOpen}
        onOpenJoinModal={() => setIsJoinModalOpen(true)}
        onCloseJoinModal={() => setIsJoinModalOpen(false)}
        onNavigateCourse={(id) => {
          setActiveCourseId(id);
          setSubTab('modules');
        }}
      />
    );
  }

  const visibleTabs = COURSE_CHILDREN.filter(i => isVisible(i, activeRole));
  const badgeCounts: Record<string, number> = {};
  for (const tab of visibleTabs) {
    let badgeCount = 0;

    const visits = activeUser.lastVisitedAt || {};
    const cid = activeCourse.id;
    if (tab.id === 'inbox') {
      badgeCount = countUnreadMessages(db.messages, activeUser.id)
        + getUnreadNotificationCount(activeUser.id, 'module_comment_reply')
        + getUnreadNotificationCount(activeUser.id, 'announcement_reply');
    } else if (tab.id === 'modules') {
      badgeCount = getUnreadNotificationCount(activeUser.id, 'module_comment_reply');
    } else if (tab.id === 'announcements') {
      badgeCount = countUnreadAnnouncements(db.announcements || [], { id: activeUser.id, role: activeRole, sectionId: null }, cid);
    } else if (tab.id === 'activities') {
      // Classic rows live in db.activities now (format === 'classic');
      // question sets link submissions via the synthetic asg-activity-<id>
      // key (values preserved).
      const courseActivities = (db.activities || []).filter(a => a.courseId === cid);
      const publishedActivities = courseActivities.filter(a => a.published);
      const publishedIds = [
        ...publishedActivities.filter(a => a.format === 'classic').map(a => a.id),
        ...publishedActivities.filter(a => a.format !== 'classic').map(a => `asg-activity-${a.id}`),
      ];
      const allIds = [
        ...courseActivities.filter(a => a.format === 'classic').map(a => a.id),
        ...courseActivities.filter(a => a.format !== 'classic').map(a => `asg-activity-${a.id}`),
      ];
      const courseSubs = db.submissions.filter(s => s.courseId === cid);
      badgeCount = activeRole === 'faculty'
        ? countFacultyGradingBadge(courseSubs, allIds)
        : countStudentAssessmentBadge(publishedIds, courseSubs.filter(s => s.studentId === activeUser.id).map(s => s.activityKey ?? ''));
    } else if (tab.id === 'quizzes') {
      badgeCount = activeRole === 'faculty'
        ? countFacultyGradingBadge(db.submissions.filter(s => s.courseId === cid), (db.quizzes || []).filter(q => q.courseId === cid).map(q => `asg-quiz-${q.id}`))
        : (db.quizzes || []).filter(q => q.courseId === cid && q.published && !db.submissions.some(s => s.activityKey === `asg-quiz-${q.id}` && s.studentId === activeUser.id)).length;
    } else if (tab.id === 'files') {
      badgeCount = countNewFiles(db.courseFiles || [], cid, visits);
    } else if (tab.id === 'grades') {
      badgeCount = activeRole === 'student' ? countNewGrades(db.courseGrades || [], cid, activeUser.id, visits) : 0;
    } else if (tab.id === 'people') {
      badgeCount = (activeRole === 'faculty' || activeRole === 'admin') ? countPendingPeople(db.enrollmentRequests || [], cid) : 0;
    } else if (tab.id === 'calendar') {
      badgeCount = countUpcomingCalendar(db.calendarEvents || [], cid, visits);
    }

    badgeCounts[tab.id] = badgeCount;
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      {/* Main Content Area */}
      <main className="min-h-0 flex-1 p-6 overflow-y-auto bg-background custom-scrollbar">
        <CourseTabBar
          tabs={visibleTabs}
          subTab={subTab}
          badgeCounts={badgeCounts}
          onSelect={(tabId) => { setSubTab(tabId); setReturnToTab(null); markTabVisited(tabId, activeCourse.id); }}
        />
        <PageTransition pageKey={`${subTab}:${activeCourse.id}`} className="w-full min-w-0">
        {subTab === 'modules' && (
          <ModulesView
            courseId={activeCourse.id}
            onSelectActivity={actId => {
              setSelectedActivityId(actId);
              setReturnToTab('modules');
              setSubTab('activities');
            }}
            onSelectQuiz={quizId => {
              setSelectedQuizId(quizId);
              setReturnToTab('modules');
              setSubTab('quizzes');
            }}
          />
        )}

        {subTab === 'syllabus' && <SyllabusView courseId={activeCourse.id} />}

        {subTab === 'announcements' && <AnnouncementsView courseId={activeCourse.id} />}

        {subTab === 'activities' && (
          <ActivitiesView
            courseId={activeCourse.id}
            selectedActivityId={selectedActivityId}
            onSelectActivity={setSelectedActivityId}
            onBackToModules={
              returnToTab === 'modules'
                ? () => {
                    setSelectedActivityId(null);
                    setReturnToTab(null);
                    setSubTab('modules');
                  }
                : undefined
            }
          />
        )}

        {subTab === 'quizzes' && (
          <QuizzesView
            courseId={activeCourse.id}
            selectedQuizId={selectedQuizId}
            onSelectQuiz={setSelectedQuizId}
            onBackToModules={
              returnToTab === 'modules'
                ? () => {
                    setSelectedQuizId(null);
                    setReturnToTab(null);
                    setSubTab('modules');
                  }
                : undefined
            }
          />
        )}

        {subTab === 'exams' && (
          <ExamsView
            courseId={activeCourse.id}
            selectedExamId={selectedExamId}
            onSelectExam={setSelectedExamId}
            onBackToModules={
              returnToTab === 'modules'
                ? () => {
                    setSelectedExamId(null);
                    setReturnToTab(null);
                    setSubTab('modules');
                  }
                : undefined
            }
          />
        )}

        {subTab === 'files' && <FilesView courseId={activeCourse.id} />}

        {subTab === 'grades' && !activeCourse.syllabus && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center" data-testid="grades-syllabus-gate">
            <h3 className="text-sm font-bold text-foreground">Syllabus required for grades</h3>
            <p className="text-xs text-muted-foreground mt-1">The grading formula lives in the syllabus under Course Requirements &amp; Official Grading Formula. {activeRole === 'faculty' ? 'Upload a syllabus to enable the gradebook.' : 'Waiting for your instructor to upload the syllabus.'}</p>
            {activeRole === 'faculty' && (
              <button type="button" onClick={() => setSubTab('syllabus')} className="mt-3 px-4 py-2 text-xs font-bold bg-primary text-primary-foreground rounded-xl cursor-pointer">Go to Syllabus</button>
            )}
          </div>
        )}
        {subTab === 'grades' && activeCourse.syllabus && (
          activeRole === 'student' ? (
            <StudentGradebook courseId={activeCourse.id} />
          ) : (
            <FacultyGradebook courseId={activeCourse.id} onGoToSyllabus={() => setSubTab('syllabus')} />
          )
        )}

        {subTab === 'people' && <PeopleView courseId={activeCourse.id} />}

        </PageTransition>

      </main>

      <JoinCourseModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onNavigateCourse={(id) => {
          setActiveCourseId(id);
          setSubTab('modules');
        }}
      />
    </div>
  );
};

export default CoursesPage;
