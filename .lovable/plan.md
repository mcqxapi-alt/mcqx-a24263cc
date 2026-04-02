

# Add Board/Competitive/State Selection to Practice Page

## What Changes

When a user clicks "Start Practice" (or navigates to `/practice` without a `?subject=` param), instead of showing a flat list of all subjects, they'll see the same 3-tab drill-down used on the landing page: **Board Exams | Competitive | State Boards → Board → Class → Subject → Chapter**.

## Steps

### 1. Replace the "subject" step in Practice.tsx with a multi-step selector

Currently the `step` state has: `"subject" | "chapter" | "practice" | "result"`.

Change it to: `"category" | "board" | "class" | "subject" | "chapter" | "practice" | "result"`.

- **Category step**: Show 3 large cards — Board Exams, Competitive Exams, State Boards (with icons: GraduationCap, Trophy, MapPin). Clicking one filters boards by that type.
- **Board step**: Show boards of the selected type (e.g., CBSE under Board Exams). If only one board exists for that type, auto-skip to class step.
- **Class step**: Show classes for the selected board (Class 6–12). Each as a card.
- **Subject step**: Show subjects for the selected class (current grid UI, but filtered by `class_id`).
- **Chapter step**: Unchanged — shows chapters for the selected subject.

### 2. Fetch boards, classes alongside subjects

Add queries for `boards` and `classes` tables (same as BrowseMenu does). Filter subjects by `class_id` instead of showing all subjects.

### 3. Update back navigation

The `goBack()` function needs to handle the new steps:
- `subject` → `class` → `board` → `category`
- `chapter` → `subject`
- `practice` → `chapter`

### 4. Update header breadcrumb

Remove the hardcoded "CBSE Class 12" badge. Instead show a dynamic breadcrumb: e.g., "Board Exams › CBSE › Class 12" based on selections.

### 5. URL param shortcut preserved

If `?subject=` param is present, skip directly to chapter step (current behavior unchanged).

## Files Modified
- `src/pages/Practice.tsx` — main changes (new steps, queries, UI)

## No Database Changes
All needed tables (`boards`, `classes`, `subjects.class_id`) already exist.

