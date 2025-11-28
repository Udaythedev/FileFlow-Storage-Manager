import React, { useState, useMemo } from 'react';
import { FileItem } from '../AppTypes';
import { getSuggestions, recordFeedback } from '../lib/symenthaRules';

type SuggestionStep = 'idle' | 'loading' | 'suggesting' | 'complete';

interface SuggestionItem {
  fileId: string;
  fileName: string;
  suggestedPath: string;
  confidence: number;
  reason: string;
  ruleApplied: string;
  userPath?: string;
}

interface OrganizationSuggestionsProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFiles: FileItem[];
  onMove?: (file: FileItem, destination: string) => void;
}

export const OrganizationSuggestions: React.FC<OrganizationSuggestionsProps> = ({
  isOpen,
  onClose,
  selectedFiles,
  onMove,
}) => {
  const [step, setStep] = useState<SuggestionStep>('idle');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState({ accepted: 0, rejected: 0, modified: 0 });

  // Generate suggestions when modal opens
  React.useEffect(() => {
    if (isOpen && selectedFiles.length > 0) {
      setStep('loading');
      setSuggestions([]);
      setCurrentIndex(0);
      setStats({ accepted: 0, rejected: 0, modified: 0 });

      // Simulate async processing
      setTimeout(() => {
        const allSuggestions = selectedFiles.flatMap((file) => {
          const fileSuggestions = getSuggestions(file);
          return fileSuggestions.map((s) => ({
            fileId: file.id,
            fileName: file.name,
            suggestedPath: s.suggestedPath,
            confidence: s.confidence,
            reason: s.reason,
            ruleApplied: s.ruleApplied,
            userPath: undefined,
          }));
        });

        setSuggestions(allSuggestions);
        setStep(allSuggestions.length > 0 ? 'suggesting' : 'idle');
      }, 300);
    }
  }, [isOpen, selectedFiles]);

  const current = suggestions[currentIndex];
  const progress = ((currentIndex + 1) / suggestions.length) * 100;

  const handleAccept = () => {
    if (current) {
      recordFeedback({
        fileId: current.fileId,
        fileName: current.fileName,
        extension: current.fileName.split('.').pop() || '',
        suggestedPath: current.suggestedPath,
        acceptedPath: current.suggestedPath,
        feedback: 'accepted',
      });

      setStats((s) => ({ ...s, accepted: s.accepted + 1 }));
      moveToNext();
    }
  };

  const handleReject = () => {
    if (current) {
      recordFeedback({
        fileId: current.fileId,
        fileName: current.fileName,
        extension: current.fileName.split('.').pop() || '',
        suggestedPath: current.suggestedPath,
        acceptedPath: '', // Not accepted
        feedback: 'rejected',
      });

      setStats((s) => ({ ...s, rejected: s.rejected + 1 }));
      moveToNext();
    }
  };

  const handleModify = (customPath: string) => {
    if (current && customPath && customPath !== current.suggestedPath) {
      recordFeedback({
        fileId: current.fileId,
        fileName: current.fileName,
        extension: current.fileName.split('.').pop() || '',
        suggestedPath: current.suggestedPath,
        acceptedPath: customPath,
        feedback: 'modified',
      });

      setStats((s) => ({ ...s, modified: s.modified + 1 }));
      moveToNext();
    } else if (customPath === current?.suggestedPath) {
      handleAccept();
    }
  };

  const moveToNext = () => {
    if (currentIndex < suggestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setStep('complete');
    }
  };

  const handleClose = () => {
    setStep('idle');
    onClose();
  };

  if (!isOpen) return null;

  if (step === 'idle' || suggestions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl p-8 max-w-md w-full">
          <h2 className="text-xl font-semibold mb-4">Organization Suggestions</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {selectedFiles.length === 0
              ? 'Select files to get organization suggestions.'
              : 'No suggestions available for the selected files.'}
          </p>
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl p-8 max-w-md w-full">
          <h2 className="text-xl font-semibold mb-4">✓ Review Complete</h2>
          <div className="space-y-3 mb-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-green-600">{stats.accepted}</span> accepted
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-orange-600">{stats.modified}</span> modified
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-red-600">{stats.rejected}</span> rejected
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full max-h-96 flex flex-col">
        {/* Header */}
        <div className="border-b dark:border-slate-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Organize {current?.fileName}?</h2>
            <button
              onClick={handleClose}
              className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-2xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            File {currentIndex + 1} of {suggestions.length}
          </p>
        </div>

        {/* Suggestion Content */}
        {current && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">FILE</p>
              <p className="text-lg font-semibold break-all">{current.fileName}</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                SUGGESTED LOCATION
              </p>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                </svg>
                <p className="font-mono text-sm font-semibold">{current.suggestedPath}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-600 dark:text-slate-400">Rule</p>
                  <p className="font-semibold">{current.ruleApplied}</p>
                </div>
                <div>
                  <p className="text-slate-600 dark:text-slate-400">Confidence</p>
                  <p className="font-semibold">{Math.round(current.confidence * 100)}%</p>
                </div>
              </div>

              <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                {current.reason}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t dark:border-slate-700 p-6 flex gap-3">
          <button
            onClick={handleReject}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23 11l-7.07-7.07 1.41-1.41L23 8.17V2h-2v4.17L7.93 1.1 6.52 2.51 13.59 9.57l-2.93 2.93-3.17-3.17-1.41 1.41 3.17 3.17-3.17 3.17 1.41 1.41 3.17-3.17 6.64 6.64-1.41 1.41 1.41 1.41L23 13.83V20h2v-6.17l2.07 2.07 1.41-1.41-2.07-2.07 7.07-7.07-1.41-1.41z" />
            </svg>
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};
