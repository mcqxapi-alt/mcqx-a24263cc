

# Dashboard Weak Areas Consolidation

## The Problem

The dashboard currently has **two separate "Weak Areas" sections**:

1. **In PerformanceSection** (Your Performance grid) — A basic, static placeholder card that shows "No weak areas identified yet" and never receives actual data
2. **In WeakAreasCard** (below, paired with Challenge Arena) — The proper AI-powered "Focus Areas" widget with real data, trend indicators, and AI insights

This creates visual clutter and confusion.

---

## The Solution

Remove the static Weak Areas card from `PerformanceSection` and keep only the AI-powered `WeakAreasCard`. Then redesign the Performance section to be a clean 2-column layout.

---

## Changes

### 1. Refactor PerformanceSection (2 cards instead of 3)

**File:** `src/components/dashboard/PerformanceSection.tsx`

- Remove the third "Weak Areas" card entirely
- Convert from 3-column to 2-column grid layout
- Keep only:
  - **Accuracy Breakdown** — Correct/Incorrect progress bars
  - **Speed Stats** — Avg time per question
- Update the grid classes: `md:grid-cols-3` → `md:grid-cols-2`
- Remove the `weakAreas` prop since it's no longer needed

### 2. Update Dashboard.tsx

**File:** `src/pages/Dashboard.tsx`

- Remove the unused `weakAreas` prop from `PerformanceSection` (currently defaults to empty array anyway)
- No other changes needed — `WeakAreasCard` already exists in the correct location

---

## Visual Result

**Before:**
```text
┌─────────────────────────────────────────────────────┐
│ Your Performance                                    │
├─────────────────┬─────────────────┬─────────────────┤
│ Accuracy        │ Speed Stats     │ Weak Areas      │
│ Breakdown       │                 │ (STATIC/EMPTY)  │
└─────────────────┴─────────────────┴─────────────────┘

┌────────────────────────┬────────────────────────────┐
│ Challenge Arena        │ Focus Areas (AI-powered)   │
│                        │ ← The REAL weak areas!     │
└────────────────────────┴────────────────────────────┘
```

**After:**
```text
┌─────────────────────────────────────────────────────┐
│ Your Performance                                    │
├──────────────────────────┬──────────────────────────┤
│ Accuracy Breakdown       │ Speed Stats              │
│ (wider, more spacious)   │ (wider, more spacious)   │
└──────────────────────────┴──────────────────────────┘

┌────────────────────────┬────────────────────────────┐
│ Challenge Arena        │ Focus Areas (AI-powered)   │
└────────────────────────┴────────────────────────────┘
```

---

## Technical Details

### PerformanceSection.tsx changes:

```tsx
// Remove the weakAreas prop from type definition
type Props = {
  totalAttempts: number;
  totalCorrect: number;
  avgTimePerQuestion?: number;
  // weakAreas removed
};

// Update grid layout
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Accuracy Breakdown */}
  {/* Speed Stats */}
  {/* Weak Areas card REMOVED */}
</div>
```

This creates a cleaner dashboard with no duplicate content and better visual balance.

