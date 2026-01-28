# Draft: AI-native CRM UI Design

## Requirements (confirmed)
- AI-native personal/small team relationship management mobile app.
- Core: Natural language input for "journals/debriefs/meeting notes".
- AI automatically identifies contacts, archives as events, tasks, profile highlights.
- User confirms/fine-tunes AI suggestions.
- Pre-meeting briefing: One-click generation (last discussion, uncompleted items, profile highlights, suggested talking points).
- Emphasize natural language input, AI structuring, traceability, simple retrieval.
- Avoid traditional CRM forms.

## Key UI Focus Areas
1. **Contact Details**: "Pre-meeting briefing card + timeline"
2. **Conversation Details**: "AI archiving results (editable and confirmable)"
3. **Left Drawer**: "Conversation History Library + Settings in the bottom left"

## Navigation Structure
- **Bottom Tab**: Dialogue / Contacts / Actions ("Actions" = follow-ups & AI suggestions)
- **Left Collapsible Drawer**: Conversation History Library (list of historical records); bottom-left entry: Settings

## Page List with Content Highlights:

### 1) Login/Registration
- Account login (simplified flow)
- Privacy/data statement entry

### 2) Dialogue (Tab)
- New record entry (write journal/notes)
- Recent record preview
- Can open sidebar to "Conversation History Library"

### 3) Dialogue Details
- Full text of a record (editable)
- AI analysis results (confirm/fine-tune):
    - Associated contacts (match/select)
    - New events (timeline entry)
    - Extracted facts (profile/family/preferences etc.)
    - To-dos/Next steps
- "Confirm Archive" action

### 4) Contact List (Tab)
- Search & filter (tags, recent contacts, follow-ups)
- Each contact displays: recent interaction summary/time
- New contact entry

### 5) Contact Details
- Personal info (optional)
- Tags/Roles
- Pre-meeting briefing (one-click generation: last communication, uncompleted items, profile highlights, suggested questions/phrasing)
- Follow-up timeline (event stream)
- New event entry

### 6) Actions (Tab)
- To-do list (person + reason)
- AI suggested contacts (person + recommendation reason/opening lines)
- Quick review (weekly records/key progress)

### 7) Settings
- Account & Security
- Data export/clear
- AI extraction strictness or preference
- Notifications (follow-up reminders)
- Feedback

### 8) Side Drawer (Global)
- Historical conversation record list (searchable/filterable)
- Click on a record to enter Dialogue Details
- Entry point: Settings (bottom left)

## Technical Decisions
- Using `pencil_batch_design` for UI creation.

## Research Findings
- None yet.

## Open Questions
- What is the primary screen the user lands on after login?
- Do you have any preferred design aesthetics (e.g., minimalist, modern, playful)?
- Are there any specific mobile platforms (iOS, Android, or both) you'd like to prioritize in terms of design conventions?
- For the `pencil_batch_design` tool, do you have a specific `.pen` file I should work within, or should I start a new one?

## Scope Boundaries
- INCLUDE: All listed UI elements and pages.
- EXCLUDE: Backend implementation, actual AI logic development.
