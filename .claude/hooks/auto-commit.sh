#!/bin/bash
# Auto-commit and push after Claude Code edits

cd /root/RegularUpkeep-app || exit 0

# Check if there are any changes
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    exit 0  # No changes, nothing to do
fi

# Stage all changes
git add -A

# Get list of changed files for commit message
CHANGED_FILES=$(git diff --cached --name-only | head -5)
FILE_COUNT=$(git diff --cached --name-only | wc -l)

if [ "$FILE_COUNT" -gt 5 ]; then
    CHANGED_FILES="$CHANGED_FILES
... and $((FILE_COUNT - 5)) more files"
fi

# Create commit message
COMMIT_MSG="Auto-commit: Claude Code changes

Files changed:
$CHANGED_FILES

🤖 Generated with [Claude Code](https://claude.com/claude-code)"

# Commit
git commit -m "$COMMIT_MSG" --quiet

# Push (suppress output, don't fail if push fails)
git push origin main --quiet 2>/dev/null || true
