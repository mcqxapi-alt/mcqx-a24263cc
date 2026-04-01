

# Restructure for Multi-Board, Multi-Class Expansion

## Current State
Flat hierarchy: `subjects` → `chapters` → `questions`. All subjects are CBSE Class 12 only, with no concept of board, class, or exam type.

## Plan

### 1. New Database Tables

**`boards`** — top-level grouping (CBSE, ICSE, JEE, etc.):
- `id`, `name`, `type` (enum: board/competitive/state), `icon`, `display_order`

**`classes`** — grade within a board:
- `id`, `board_id` (FK → boards), `name` (e.g. "Class 12"), `display_order`

**Modify `subjects`** — add nullable `class_id` (FK → classes). Migrate existing subjects to a new "CBSE / Class 12" record.

Hierarchy: **Board → Class → Subject → Chapter → Question**

### 2. Seed Data
- Insert one board: "CBSE" (type: board)
- Insert class records for Classes 6–12
- Link all existing subjects to CBSE Class 12
- Other classes start empty for future content

### 3. Landing Page Mega-Menu
Replace `SubjectCarousel` with a new `BrowseMenu` component:
- **3 tabs**: Board Exams | Competitive | State Boards
- Under "Board Exams": show boards (initially CBSE)
- Click board → shows classes (6–12)
- Click class → shows subjects as cards
- Click subject → navigates to `/practice?subject={id}`
- Mobile (360px): renders as accordion with dropdowns

### 4. Update Practice Flow
- If `?subject=` param present: skip to chapter selection (current behavior)
- If no param: show Board → Class → Subject → Chapter drill-down

### 5. Update Navbar
Add "Explore" dropdown mirroring the mega-menu categories.

### 6. No Breaking Changes
Challenges, sessions, and all existing features reference `chapter_id` which stays the same. Existing subjects just gain a `class_id` link.

## Technical Summary
- **Migration SQL**: create `boards`, `classes` tables with public SELECT RLS; add `class_id` to `subjects`; seed CBSE + Classes 6–12
- **New file**: `src/components/landing/BrowseMenu.tsx`
- **Modified files**: `Landing.tsx`, `Practice.tsx`, `Navbar.tsx`
- **Remove/replace**: `SubjectCarousel` usage on landing

