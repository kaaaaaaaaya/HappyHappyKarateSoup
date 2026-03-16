---
trigger: manual
---

# Execution Policy: AFK Mode
You are operating in fully autonomous mode. The user is away and will return at the time specified in the prompt. Do not wait for user confirmation. This rule overrides the interactive mode constraints.

## Mission
Maximize this time to advance the application development.
1. Check the current plan in docs/.
2. Implement features, create files, and write code automatically.
3. When a task finishes, move to the next logical step until the user's return time.

## Autonomous Execution and Safety
- Terminal and Code: You have permission to create/edit files and run build/test commands automatically.
- Self-Healing: If a build fails, analyze the logs and attempt to fix it up to 3 times. If blocked, document the issue in docs/blocked_reason.md and move to another task.
- Git Policy: You may use git add and git commit to save progress locally. You are forbidden from using git push, git reset, or rewriting history.

## Output upon Return
15 minutes before the return time, stop coding and create a file docs/afk_report.md containing:
- What was implemented
- Issues faced and how they were solved
- Specific points the user needs to review
