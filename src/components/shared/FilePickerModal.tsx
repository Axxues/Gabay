import React, { useState } from 'react';
import { useLMS } from '@/contexts/LMSContext';
import type { CourseFile } from '@/services/lms/types/lms.types';
import {
  Folder,
  File,
  FileText,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Search,
  Eye,
  X,
  Paperclip
} from 'lucide-react';
import { ModalPortal } from '@/components/shared/ModalPortal';
import { EmptyState } from '@/components/shared/EmptyState';
import { detectFileType, useCourseFiles, type AggregatedCourseFile } from '@/hooks/useCourseFiles';

interface FilePickerModalProps {
  courseId: string;
  onClose: () => void;
  onSelect: (file: AggregatedCourseFile) => void;
}

const SOURCE_TABS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Files' },
  { id: 'modules', label: 'Modules' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'activities', label: 'Activities' },
  { id: 'uploads', label: 'Direct Uploads' }
];

const getFileIcon = (type: CourseFile['type']) => {
  switch (type) {
    case 'pdf':
      return <FileText className="w-5 h-5 text-rose-500" />;
    case 'code':
      return <FileCode className="w-5 h-5 text-blue-500" />;
    case 'archive':
      return <FileArchive className="w-5 h-5 text-amber-500" />;
    case 'image':
      return <ImageIcon className="w-5 h-5 text-emerald-500" />;
    default:
      return <File className="w-5 h-5 text-muted-foreground" />;
  }
};

export const FilePickerModal: React.FC<FilePickerModalProps> = ({ courseId, onClose, onSelect }) => {
  const { db } = useLMS();
  const course = db.courses.find(c => c.id === courseId);
  const { allFiles, sourceCounts } = useCourseFiles(courseId);

  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewFile, setPreviewFile] = useState<AggregatedCourseFile | null>(null);

  const visibleFiles = allFiles.filter(file => {
    if (sourceFilter !== 'all' && (file as any).source !== sourceFilter) return false;
    if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
        <div
          className="fixed inset-0 overlay-backdrop animate-fade-in"
          onClick={onClose}
        />
        <div className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-elevated overflow-hidden animate-scale-in flex flex-col max-h-[86vh] relative z-10">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
            <div className="flex items-center space-x-3 truncate">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Folder className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Browse Uploaded Files</h3>
                <p className="text-[10px] font-sans text-muted-foreground mt-0.5">
                  Select an existing file already uploaded to {course?.code || 'this course'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Source Filter Tabs */}
          <div className="px-6 pt-4 flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none shrink-0">
            {SOURCE_TABS.map(tab => {
              const count = (sourceCounts as any)[tab.id] || 0;
              const isActive = sourceFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSourceFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer whitespace-nowrap active:scale-98 ${isActive
                    ? 'bg-primary text-primary-foreground shadow-primary-sm'
                    : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border'
                    }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-sans font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                      }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="px-6 pt-3 pb-3 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search files by name..."
                className="w-full pl-9 pr-8 py-2 bg-background border border-border focus:ring-2 focus:ring-primary/20 rounded-xl text-xs font-sans text-foreground outline-none shadow-subtle"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-5 divide-y divide-border">
            {visibleFiles.map(file => {
              const sourceLabel = (file as any).sourceLabel || 'Direct Upload';
              return (
                <div key={file.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5 truncate flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="truncate min-w-0 flex-1">
                      <span className="text-xs font-bold text-foreground block truncate">{file.name}</span>
                      <div className="flex items-center space-x-2 text-[10px] font-sans text-muted-foreground mt-0.5">
                        <span>{sourceLabel}</span>
                        <span>•</span>
                        <span>{file.formattedSize}</span>
                        <span>•</span>
                        <span>{file.uploadedByName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      title="Preview"
                      className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelect(file)}
                      className="px-3 py-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-primary-sm flex items-center space-x-1.5 cursor-pointer active:scale-98"
                    >
                      <Paperclip className="w-3 h-3" />
                      <span>Attach</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {visibleFiles.length === 0 && (
              <div className="py-8">
                <EmptyState
                  title="No uploaded files match your search."
                  actionLabel={undefined}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <ModalPortal>
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6">
            <div
              className="fixed inset-0 overlay-backdrop animate-fade-in"
              onClick={() => setPreviewFile(null)}
            />
            <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-elevated overflow-hidden animate-scale-in flex flex-col max-h-[80vh] relative z-10">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/40">
                <div className="flex items-center space-x-2.5 truncate">
                  {previewFile && getFileIcon(previewFile.type)}
                  <h3 className="text-sm font-bold text-foreground truncate max-w-md">
                    {previewFile?.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-background">
                {previewFile?.type === 'image' && (previewFile.url || previewFile.fileUrl) ? (
                  <div className="flex items-center justify-center p-4 bg-muted/10 rounded-xl">
                    <img
                      src={previewFile.url || previewFile.fileUrl}
                      alt={previewFile.name}
                      className="max-h-[55vh] w-auto max-w-full rounded-xl object-contain shadow-card border border-border"
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-muted/30 border border-border rounded-xl font-sans text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {previewFile?.content ||
                      `[GABAY File Preview]\nFile: ${previewFile?.name}\nSource: ${(previewFile as any)?.sourceLabel || 'Direct Upload'}\n\nThis file is available for attachment in this course.`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </ModalPortal>
  );
};

export { detectFileType };
export type { AggregatedCourseFile };