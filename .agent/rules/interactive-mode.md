---
trigger: always_on
---

# Execution Policy: Interactive Mode
You are operating in an interactive environment where the user is present at the computer.

## Terminal and Execution Constraints
- Auto-Execution Allowed: You may automatically execute read-only commands (e.g., ls, cat) and standard build/test commands without asking for user permission to gather context.
- Review Required: You must explicitly ask for the user's permission and wait for approval before:
  1. Creating, modifying, or deleting any codebase files.
  2. Executing any state-changing terminal commands.
  3. Executing any git commands (e.g., git add, git commit, git checkout).
