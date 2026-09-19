import React, { useState } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import type { EnrollmentRequest } from '@/services/lms/types/lms.types';
import { PageHeader } from '@/components/shared/PageHeader';
import { CheckCircle, XCircle, UserPlus, Search, Loader2 } from 'lucide-react';
import { useProcessing, useBusyFlag } from '@/hooks/useProcessing';

interface PendingRequestsPageProps {
  courseId: string;
}

export const PendingRequestsPage: React.FC<PendingRequestsPageProps> = ({ courseId }) => {
  const { db, isLoading, isSyncing, approveEnrollmentRequests, rejectEnrollmentRequests, showAlert } = useLMS();
  const course = db.courses.find(c => c.id === courseId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Per-row (approve/reject single) + bulk action processing states.
  // Buttons disable + show a spinner while the DB request is in flight so
  // slow (~2s) sequential approve/reject calls can't be double-clicked.
  const { isProcessing, run } = useProcessing();
  const { busy: bulkBusy, run: runBulk } = useBusyFlag();

  const allRequests: EnrollmentRequest[] = (db.enrollmentRequests || []).filter((r: EnrollmentRequest) => r.courseId === courseId);
  const pendingRequests = allRequests.filter((r: EnrollmentRequest) => r.status === 'pending');

  const filteredRequests = pendingRequests.filter((r: EnrollmentRequest) => {
    const q = searchQuery.toLowerCase();
    return r.studentName.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
  });

  const handleToggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Faculty invitations are accepted by the student, never bulk-approved.
  const approvableRequests = filteredRequests.filter(r => r.type !== 'faculty_enroll');

  const handleApproveSelected = () => {
    const ids = selectedIds.filter(id => approvableRequests.some(r => r.id === id));
    if (ids.length === 0) return;
    void runBulk(async () => {
      const ok = await approveEnrollmentRequests(ids);
      if (!ok) return;
      showAlert({
        title: 'Requests Approved',
        message: `${ids.length} student(s) approved. They can now select their section.`,
        type: 'success'
      });
      setSelectedIds([]);
    });
  };

  const handleApproveAll = () => {
    const allIds = approvableRequests.map(r => r.id);
    if (allIds.length === 0) return;
    void runBulk(async () => {
      const ok = await approveEnrollmentRequests(allIds);
      if (!ok) return;
      showAlert({
        title: 'All Requests Approved',
        message: `${allIds.length} student(s) approved.`,
        type: 'success'
      });
    });
  };

  const handleReject = (ids: string[]) => {
    void runBulk(async () => {
      const ok = await rejectEnrollmentRequests(ids);
      if (!ok) return;
      showAlert({ title: 'Requests Rejected', message: `${ids.length} request(s) rejected.`, type: 'warning' });
      setSelectedIds(prev => prev.filter(i => !ids.includes(i)));
    });
  };

  const handleApproveOne = (id: string) => {
    void run(`approve:${id}`, () => approveEnrollmentRequests([id]));
  };

  const handleRejectOne = (id: string) => {
    void run(`reject:${id}`, () => rejectEnrollmentRequests([id]));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Pending enrollment requests"
        description={`${pendingRequests.length} pending request(s) for ${course?.code || 'course'}`}
        actions={
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <>
                <button onClick={handleApproveSelected} disabled={bulkBusy} className="px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer disabled:opacity-60 disabled:cursor-wait flex items-center gap-1.5">
                  {bulkBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {bulkBusy ? 'Approving...' : `Approve Selected (${selectedIds.length})`}
                </button>
                <button onClick={() => handleReject(selectedIds)} disabled={bulkBusy} className="px-3 py-2 text-xs font-bold bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-xl cursor-pointer disabled:opacity-60 disabled:cursor-wait flex items-center gap-1.5">
                  {bulkBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {bulkBusy ? 'Rejecting...' : 'Reject Selected'}
                </button>
              </>
            )}
            {filteredRequests.length > 0 && (
              <button onClick={handleApproveAll} disabled={bulkBusy} className="px-3 py-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl cursor-pointer disabled:opacity-60 disabled:cursor-wait flex items-center gap-1.5">
                {bulkBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {bulkBusy ? 'Approving...' : 'Approve All'}
              </button>
            )}
          </div>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search students..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {((isLoading || isSyncing) && allRequests.length === 0) ? (
        <div data-testid="pending-requests-loading" className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`pending-requests-skeleton-${i}`} className="p-4 flex items-center gap-3 border-b border-border/50 last:border-0">
              <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-1/3 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted/70" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No pending requests</p>
          <p className="text-xs mt-1">All enrollment requests have been processed.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/50">
                <th className="p-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredRequests.length && filteredRequests.length > 0}
                    onChange={() => {
                      if (selectedIds.length === filteredRequests.length) setSelectedIds([]);
                      else setSelectedIds(filteredRequests.map(r => r.id));
                    }}
                    className="rounded cursor-pointer"
                  />
                </th>
                <th className="p-3 text-left font-semibold text-[12px] text-muted-foreground">Student</th>
                <th className="p-3 text-left font-semibold text-[12px] text-muted-foreground">Type</th>
                <th className="p-3 text-left font-semibold text-[12px] text-muted-foreground">Requested</th>
                <th className="p-3 text-right font-semibold text-[12px] text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map(req => (
                <tr key={req.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(req.id)}
                      onChange={() => handleToggle(req.id)}
                      className="rounded cursor-pointer"
                    />
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-[14px]">{req.studentName}</div>
                    <div className="text-[12px] text-muted-foreground">{req.studentId}</div>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      {req.type === 'self_join' ? 'Self-join' : 'Faculty enroll'}
                    </span>
                  </td>
                  <td className="p-3 text-[12px] text-muted-foreground">
                    {new Date(req.requestedAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {req.type === 'faculty_enroll' ? (
                        <span
                          title="Invitation sent — waiting for the student to accept."
                          className="px-2 py-1 text-[11px] font-medium bg-muted text-muted-foreground rounded-full border border-border"
                        >
                          Awaiting student
                        </span>
                      ) : (
                      <button
                        onClick={() => handleApproveOne(req.id)}
                        disabled={isProcessing(`approve:${req.id}`) || isProcessing(`reject:${req.id}`)}
                        className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-emerald-600 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                        title={isProcessing(`approve:${req.id}`) ? 'Approving...' : 'Approve'}
                      >
                        {isProcessing(`approve:${req.id}`) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                      )}
                      <button
                        onClick={() => handleRejectOne(req.id)}
                        disabled={isProcessing(`reject:${req.id}`) || isProcessing(`approve:${req.id}`)}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                        title={isProcessing(`reject:${req.id}`) ? 'Rejecting...' : 'Reject'}
                      >
                        {isProcessing(`reject:${req.id}`) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PendingRequestsPage;
