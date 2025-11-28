# Symentha AI - Rules Engine - Feature #3

## Overview

Smart file categorization rules engine with AI-powered suggestions, user feedback learning, and localStorage persistence. Helps organize files automatically with configurable rules and machine learning from user acceptance/rejection patterns.

## Implementation Details

### Core Rules Engine: `src/lib/symenthaRulesEngine.ts`

**Data Types:**

- `CategorizationRule` - Configurable rule with pattern matching
  - `id`: Unique rule identifier
  - `name`: Human-readable rule name
  - `description`: What the rule does
  - `pattern`: RegExp or function for file matching
  - `targetFolder`: Destination path for matched files
  - `priority`: Execution order (lower = higher priority)
  - `enabled`: Toggle rule on/off
  - `accuracy`: Confidence score (0-100) updated from user feedback

- `CategorizeResult` - Suggestion result
  - File ID, name, current/suggested location
  - Matched rule details
  - Confidence percentage (0-100)
  - Reasoning explanation

- `UserFeedback` - Track user accept/reject decisions
  - File ID and rule ID
  - Accepted/rejected boolean
  - Timestamp for recency weighting
  - Optional user-chosen alternative folder

- `RulesEngineState` - Complete engine state
  - Active rules list
  - User feedback history
  - Category statistics

**Default Rules (11 built-in):**

1. **PDF Documents** (priority 1, 98% accuracy)
   - Pattern: `*.pdf` → `Documents/PDFs`

2. **Word Documents** (priority 1, 98% accuracy)
   - Pattern: `*.doc, *.docx` → `Documents/Word`

3. **Excel Spreadsheets** (priority 2, 97% accuracy)
   - Pattern: `*.xls, *.xlsx, *.csv` → `Finance/Spreadsheets`

4. **Invoice Detection** (priority 5, 85% accuracy)
   - Pattern: Contains "invoice", "bill", or "receipt" → `Finance/Invoices`

5. **Recent Photos** (priority 3, 92% accuracy)
   - Function pattern: Photos from current month → `Photos/Recent`

6. **Archived Photos** (priority 4, 90% accuracy)
   - Function pattern: Photos >2 years old → `Photos/Archive`

7. **Code Files** (priority 2, 99% accuracy)
   - Pattern: `*.js, *.ts, *.py, *.java, etc.` → `Development/Code`

8. **Configuration Files** (priority 3, 95% accuracy)
   - Pattern: `*.json, *.yaml, *.toml, *.xml` → `Development/Config`

9. **Video Files** (priority 2, 99% accuracy)
   - Pattern: `*.mp4, *.avi, *.mkv, etc.` → `Media/Videos`

10. **Audio Files** (priority 2, 99% accuracy)
    - Pattern: `*.mp3, *.wav, *.flac, etc.` → `Media/Music`

11. **Archives** (priority 1, 99% accuracy)
    - Pattern: `*.zip, *.rar, *.7z, *.tar, *.gz` → `Archive`

**Core Functions:**

- `categorizeFile(file, rules)` - Single file categorization
  - Applies rules in priority order
  - Returns first matching suggestion
  - Returns null if no match

- `categorizeFiles(files, rules)` - Batch categorization
  - Map + filter pattern
  - Returns array of suggestions

- `updateRuleAccuracy(rules, feedback, ruleId)` - Recalculate accuracy
  - Percentage of accepted vs. rejected
  - Based on complete feedback history

- `applyUserFeedback(rules, feedback)` - Learn from feedback
  - Update accuracy scores
  - Adjust priorities based on recent rejections (7-day window)
  - Decrease priority (deprioritize) if >50% rejections in last 7 days

- `getCategoryStats(feedback)` - Aggregate statistics
  - Count accepted/rejected per rule
  - Used for analytics dashboard

- `saveRulesState(state)` - Persist to localStorage
  - Stores rules + feedback history
  - Error handling for quota exceeded

- `loadRulesState()` - Restore from localStorage
  - Loads custom rules or defaults
  - Recalculates statistics from history

- `resetRulesToDefaults()` - Clear customization
  - Clears all feedback
  - Resets to default rules

### UI Component: `src/components/FileSuggestionReview.tsx`

**Main Component:** `FileSuggestionReview`
- Props: `files: FileItem[]`, `onApply?: (suggestions) => void`
- Real-time suggestion generation
- Multi-filter interface
- Batch selection and apply

**Features:**

1. **Statistics Dashboard**
   - Total suggestions
   - High confidence count (≥90%)
   - Selected for application

2. **Filter Views**
   - **All**: Show all suggestions
   - **High Confidence**: Only ≥90% accuracy
   - **Pending**: Not yet reviewed

3. **Suggestion Cards**
   - File name and confidence badge
   - Color-coded confidence (green/amber/orange)
   - Matched rule explanation
   - Suggested target folder
   - Accept/Reject/Select buttons

4. **Rules Panel** (collapsible)
   - View all active rules
   - Rule descriptions and priorities
   - Accuracy scores from user feedback
   - Feedback statistics (accepted/rejected counts)

5. **Batch Actions**
   - Select multiple suggestions
   - Apply all selected at once
   - Auto-saves user feedback

6. **Management Controls**
   - Toggle rules panel
   - Reset to defaults with confirmation

**UI Elements:**

- Gradient cards for visual hierarchy
- Color-coded confidence levels
  - Green (≥90%): High confidence
  - Amber (75-89%): Medium confidence
  - Orange (<75%): Lower confidence
- Responsive layout
- Scrollable suggestion list (max 24 items visible)
- Real-time feedback integration

**Interaction Flow:**

1. Component mounts → Load rules state from localStorage
2. Generate suggestions from current file list
3. User reviews suggestions, filters by confidence
4. User accepts/rejects individual suggestions
5. Feedback saved to localStorage, accuracy updated
6. User selects batch of suggestions
7. User clicks "Apply Selected" → calls onApply callback
8. Rules engine learns from pattern of accept/reject

## Testing

**Test Coverage:** 26 comprehensive tests (all passing)

**Test File:** `src/lib/__tests__/symenthaRulesEngine.test.ts`

**Test Suites:**

1. **categorizeFile** - 14 tests
   - PDF, Word, Excel, Invoice matching
   - Code, Video, Audio, Archive matching
   - Case-insensitive regex
   - Function patterns (recent/old photos)
   - Rule priority ordering
   - Disabled rules
   - Null for unmatched files

2. **categorizeFiles** - 2 tests
   - Batch categorization
   - Filtering unmatched files

3. **updateRuleAccuracy** - 3 tests
   - Accuracy calculation from feedback
   - Empty feedback handling
   - 100% for all accepted

4. **applyUserFeedback** - 3 tests
   - Accuracy update from feedback
   - Priority adjustment for recent rejections
   - No change for old feedback

5. **getCategoryStats** - 2 tests
   - Stats aggregation by rule
   - Empty feedback handling

6. **Default Rules** - 2 tests
   - Valid rule structure
   - Pattern type validation

## Data Persistence

**localStorage Schema:**
```json
{
  "fileflow_rules_state": {
    "rules": [
      {
        "id": "rule-pdf-documents",
        "name": "PDF Documents",
        "pattern": "/\.pdf$/i",
        "targetFolder": "Documents/PDFs",
        "priority": 1,
        "enabled": true,
        "accuracy": 98
      }
    ],
    "feedback": [
      {
        "fileId": "file_123",
        "ruleId": "rule-pdf-documents",
        "accepted": true,
        "timestamp": 1732305600000,
        "userChose": null
      }
    ]
  }
}
```

**Storage Limits:**
- localStorage quota: typically 5-10 MB
- Expected usage: <100 KB for 1000 feedback entries
- Graceful degradation if quota exceeded (logs warning, uses defaults)

## Performance

**Computational Complexity:**
- Single file categorization: O(n) where n = number of active rules
- Batch categorization: O(m × n) where m = files, n = rules
- Accuracy update: O(feedback entries for rule)
- Feedback application: O(rules)

**Time Estimates:**
- Categorize 1000 files: ~50-100ms
- Update accuracy: <5ms
- Apply feedback: <10ms
- Save to localStorage: <20ms

**Memory Usage:**
- Rules: ~5-10 KB per rule
- Feedback entries: ~100 bytes each
- Negligible UI overhead

## Machine Learning Features

**Accuracy Tracking:**
- Initialized with default confidence (95-99%)
- Updated based on user feedback
- Real-time recalculation on accept/reject
- Displayed in UI for transparency

**Priority Adjustment:**
- Recent feedback weighted (7-day window)
- >50% rejection rate triggers deprioritization
- Prevents frequently-rejected rules from matching first
- Adapts to user preferences over time

**Learning Loop:**
1. User accepts/rejects suggestion
2. Feedback recorded with timestamp
3. Rule accuracy recalculated
4. Rule priority adjusted if needed
5. Future categorizations use updated scores
6. State persisted to localStorage

## Integration

**How to Use:**

```typescript
import { FileSuggestionReview } from './components/FileSuggestionReview';
import { categorizeFiles } from './lib/symenthaRulesEngine';

function FileOrganizer() {
  const [files, setFiles] = useState<FileItem[]>([]);

  const handleApplySuggestions = (suggestions: CategorizeResult[]) => {
    // Move files to suggested folders
    suggestions.forEach(s => {
      moveFile(s.fileId, s.suggestedFolder);
    });
  };

  return (
    <FileSuggestionReview 
      files={files} 
      onApply={handleApplySuggestions}
    />
  );
}
```

**API Usage:**

```typescript
import { loadRulesState, categorizeFiles } from './lib/symenthaRulesEngine';

// Load current rules
const state = loadRulesState();

// Generate suggestions
const suggestions = categorizeFiles(files, state.rules);

// Apply user feedback
state.feedback.push({
  fileId: 'file_123',
  ruleId: 'rule-pdf-documents',
  accepted: true,
  timestamp: Date.now()
});

// Save updated state
saveRulesState(state);
```

## Future Enhancements

- **ML Integration**: TensorFlow.js for content-based classification
- **Custom Rules UI**: Allow users to create new rules visually
- **Rule Templates**: Pre-built rule sets for common scenarios (Media Library, Coding Projects, etc.)
- **Scheduled Execution**: Auto-apply suggestions on schedule
- **Conflict Resolution**: Handle edge cases where multiple rules match
- **Undo/Redo**: Revert applied suggestions
- **Rule Import/Export**: Share rules between users
- **Advanced Patterns**: Regex with capture groups, complex conditions
- **Folder Structure Learning**: Auto-detect folder patterns from existing organization
- **Integration with Cloud Storage**: Support for cloud drive categorization

## Files Created/Modified

**New Files:**
- `src/lib/symenthaRulesEngine.ts` - Core rules engine (~330 lines)
- `src/components/FileSuggestionReview.tsx` - UI component (~400 lines)
- `src/lib/__tests__/symenthaRulesEngine.test.ts` - Comprehensive tests (~360 lines)

**Modified Files:**
- None (completely new feature)

---

**Feature Status:** ✅ **COMPLETE**
- Rules engine: Done (11 default rules)
- Categorization logic: Done (regex + function patterns)
- UI component: Done (suggestion review + feedback)
- Learning system: Done (accuracy + priority adjustment)
- Persistence: Done (localStorage with fallbacks)
- Tests: All 26 passing
- Build: Successful (855 modules)
