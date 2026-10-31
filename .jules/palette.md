## 2024-10-24 - Added ARIA Label to Command Palette Trigger Button
**Learning:** The command palette trigger button in the main topbar lacked an `aria-label`. Adding it makes the element screen reader accessible, explaining the shortcut (Cmd+K) and context (Search company, decision maker or command).
**Action:** Next time, make sure to look out for UI elements with visually-hidden, icon-based, or non-textual shortcut triggers to ensure screen reader users are correctly guided.
