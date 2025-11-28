import React, { useState, useEffect } from 'react';
import {
  categorizeFiles,
  applyUserFeedback,
  saveRulesState,
  loadRulesState,
  resetRulesToDefaults,
  type CategorizeResult,
  type UserFeedback,
  type RulesEngineState,
} from '../lib/symenthaRulesEngine';
import { formatBytes } from '../lib/formatBytes';
import type { FileItem } from '../AppTypes';

interface FileSuggestionReviewProps {
  files: FileItem[];
  onApply?: (suggestions: CategorizeResult[]) => void;
}

/**
 * UI for reviewing and applying AI-generated file organization suggestions
 */
export const FileSuggestionReview: React.FC<FileSuggestionReviewProps> = ({ files, onApply }) => {
  const [state, setState] = useState<RulesEngineState | null>(null);
  const [suggestions, setSuggestions] = useState<CategorizeResult[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'high-confidence' | 'pending'>('all');
  const [showRulesPanel, setShowRulesPanel] = useState(false);

  // Load state and generate suggestions
  useEffect(() => {
    const rulesState = loadRulesState();
    setState(rulesState);

    const newSuggestions = categorizeFiles(files, rulesState.rules);
    setSuggestions(newSuggestions);
  }, [files]);

  // Handle user feedback
  const handleAcceptSuggestion = (suggestion: CategorizeResult) => {
    if (!state) return;

    const feedback: UserFeedback = {
      fileId: suggestion.fileId,
      ruleId: suggestion.matchedRule.id,
      accepted: true,
      timestamp: Date.now(),
    };

    const newFeedback = [...state.feedback, feedback];
    const updatedState: RulesEngineState = {
      rules: applyUserFeedback(state.rules, newFeedback),
      feedback: newFeedback,
      categoryStats: state.categoryStats,
    };

    setState(updatedState);
    saveRulesState(updatedState);
    setSelectedSuggestions((prev) => new Set([...prev, suggestion.fileId]));
  };

  const handleRejectSuggestion = (suggestion: CategorizeResult) => {
    if (!state) return;

    const feedback: UserFeedback = {
      fileId: suggestion.fileId,
      ruleId: suggestion.matchedRule.id,
      accepted: false,
      timestamp: Date.now(),
    };

    const newFeedback = [...state.feedback, feedback];
    const updatedState: RulesEngineState = {
      rules: applyUserFeedback(state.rules, newFeedback),
      feedback: newFeedback,
      categoryStats: state.categoryStats,
    };

    setState(updatedState);
    saveRulesState(updatedState);
  };

  const handleApplySelected = () => {
    const applicableSuggestions = suggestions.filter((s) => selectedSuggestions.has(s.fileId));
    onApply?.(applicableSuggestions);
  };

  const handleResetRules = () => {
    if (window.confirm('Reset all rules to defaults and clear feedback history?')) {
      resetRulesToDefaults();
      const rulesState = loadRulesState();
      setState(rulesState);
      setSelectedSuggestions(new Set());
    }
  };

  // Filter suggestions
  const filteredSuggestions = suggestions.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'high-confidence') return s.confidence >= 90;
    if (filter === 'pending') return !selectedSuggestions.has(s.fileId);
    return true;
  });

  const stats = {
    total: suggestions.length,
    highConfidence: suggestions.filter((s) => s.confidence >= 90).length,
    selected: selectedSuggestions.size,
  };

  if (!state) {
    return <div className="p-4 text-gray-600">Loading...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Organization Suggestions</h2>
          <p className="text-gray-600 text-sm">
            AI-powered recommendations to organize your files
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRulesPanel(!showRulesPanel)}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 transition-colors"
          >
            {showRulesPanel ? '✕ Hide' : '⚙️ Rules'}
          </button>
          <button
            onClick={handleResetRules}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 transition-colors"
          >
            ↻ Reset
          </button>
        </div>
      </div>

      {/* Rules Panel */}
      {showRulesPanel && (
        <RulesPanel rules={state.rules} stats={state.categoryStats} onRulesChange={() => {}} />
      )}

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <StatBox label="Total Suggestions" value={stats.total} />
        <StatBox label="High Confidence (≥90%)" value={stats.highConfidence} />
        <StatBox label="Selected for Apply" value={stats.selected} color="blue" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 border-b border-gray-200">
        {['all', 'high-confidence', 'pending'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'border-b-2 border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {f === 'all'
              ? `All (${stats.total})`
              : f === 'high-confidence'
                ? `High Confidence (${stats.highConfidence})`
                : `Pending (${suggestions.length - stats.selected})`}
          </button>
        ))}
      </div>

      {/* Apply Button */}
      {selectedSuggestions.size > 0 && (
        <div className="flex items-center gap-4 bg-blue-50 p-4 rounded border border-blue-200">
          <span className="font-medium text-blue-900">{stats.selected} suggestions selected</span>
          <button
            onClick={handleApplySelected}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Apply Selected
          </button>
        </div>
      )}

      {/* Suggestions List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredSuggestions.length > 0 ? (
          filteredSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.fileId}
              suggestion={suggestion}
              isSelected={selectedSuggestions.has(suggestion.fileId)}
              onSelect={() =>
                setSelectedSuggestions((prev) =>
                  prev.has(suggestion.fileId)
                    ? new Set([...prev].filter((id) => id !== suggestion.fileId))
                    : new Set([...prev, suggestion.fileId])
                )
              }
              onAccept={() => handleAcceptSuggestion(suggestion)}
              onReject={() => handleRejectSuggestion(suggestion)}
            />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No suggestions match the current filter
          </div>
        )}
      </div>
    </div>
  );
};

// Sub-components

const StatBox: React.FC<{ label: string; value: number; color?: string }> = ({
  label,
  value,
  color = 'gray',
}) => {
  const colorClasses = {
    gray: 'from-gray-50 to-gray-100 border-gray-200',
    blue: 'from-blue-50 to-blue-100 border-blue-200',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} p-4 rounded border`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
};

interface SuggestionCardProps {
  suggestion: CategorizeResult;
  isSelected: boolean;
  onSelect: () => void;
  onAccept: () => void;
  onReject: () => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  isSelected,
  onSelect,
  onAccept,
  onReject,
}) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-50';
    if (confidence >= 75) return 'text-amber-600 bg-amber-50';
    return 'text-orange-600 bg-orange-50';
  };

  return (
    <div className={`p-4 border rounded-lg transition-all ${isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="mt-1 w-4 h-4 cursor-pointer"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 truncate">{suggestion.fileName}</p>
              <p className="text-xs text-gray-500 mt-1">{suggestion.reasoning}</p>
            </div>
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full flex-shrink-0 ${getConfidenceColor(suggestion.confidence)}`}
            >
              {suggestion.confidence}%
            </span>
          </div>

          {/* Suggestion */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded mb-3 border border-blue-100">
            <p className="text-xs text-gray-600">Suggested folder:</p>
            <p className="font-medium text-blue-900">📁 {suggestion.suggestedFolder}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onAccept}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors font-medium"
            >
              ✓ Accept
            </button>
            <button
              onClick={onReject}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors font-medium"
            >
              ✕ Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RulesPanelProps {
  rules: any[];
  stats: Map<string, { accepted: number; rejected: number }>;
  onRulesChange: () => void;
}

const RulesPanel: React.FC<RulesPanelProps> = ({ rules, stats }) => (
  <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-64 overflow-y-auto">
    <h3 className="font-semibold mb-3 text-gray-900">Active Rules ({rules.filter((r) => r.enabled).length})</h3>
    <div className="space-y-2">
      {rules
        .filter((r) => r.enabled)
        .sort((a, b) => a.priority - b.priority)
        .map((rule) => {
          const ruleStats = stats.get(rule.id) || { accepted: 0, rejected: 0 };
          const total = ruleStats.accepted + ruleStats.rejected;
          const accuracy = total > 0 ? Math.round((ruleStats.accepted / total) * 100) : rule.accuracy;

          return (
            <div key={rule.id} className="p-2 bg-white rounded border border-gray-200 text-sm">
              <div className="flex justify-between items-start mb-1">
                <div className="font-medium text-gray-900">{rule.name}</div>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  {accuracy}%
                </span>
              </div>
              <p className="text-xs text-gray-600">{rule.description}</p>
              {total > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {ruleStats.accepted} accepted, {ruleStats.rejected} rejected
                </p>
              )}
            </div>
          );
        })}
    </div>
  </div>
);
