#!/bin/bash
set -e

# Ralph Wiggum Loop - Autonomous AI Development
# Named after the Simpsons character, this script runs Claude Code CLI
# in iterative loops until all PRD items are complete.

if [ -z "$1" ]; then
    echo "Usage: $0 <iterations>"
    echo "Example: $0 10"
    exit 1
fi

ITERATIONS=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Files
PRD_FILE="$SCRIPT_DIR/prd.json"
FEATURES_FILE="$SCRIPT_DIR/FEATURES.md"
PROGRESS_FILE="$PROJECT_DIR/progress.txt"
OUTPUT_LOG="$PROJECT_DIR/ralph-output.log"

# Ensure files exist
if [ ! -f "$PRD_FILE" ]; then
    echo "Error: PRD file not found at $PRD_FILE"
    echo "Please create a prd.json file with your user stories."
    exit 1
fi

if [ ! -f "$FEATURES_FILE" ]; then
    echo "Warning: FEATURES.md not found at $FEATURES_FILE"
    echo "Continuing without features file..."
    FEATURES_FILE=""
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
    echo "# Progress Log" > "$PROGRESS_FILE"
    echo "# This file tracks learnings and progress across Ralph iterations" >> "$PROGRESS_FILE"
    echo "" >> "$PROGRESS_FILE"
fi

echo "=================================="
echo "Ralph Wiggum Loop Starting"
echo "=================================="
echo "PRD: $PRD_FILE"
echo "Features: $FEATURES_FILE"
echo "Progress: $PROGRESS_FILE"
echo "Iterations: $ITERATIONS"
echo "=================================="

for ((i=1; i<=$ITERATIONS; i++)); do
    echo ""
    echo "=================================="
    echo "Iteration $i of $ITERATIONS"
    echo "=================================="

    # Build the file references
    FILE_REFS="@$PRD_FILE @$PROGRESS_FILE"
    if [ -n "$FEATURES_FILE" ]; then
        FILE_REFS="$FILE_REFS @$FEATURES_FILE"
    fi

    result=$(claude --dangerously-skip-permissions -p "$FILE_REFS \

CONTEXT:
- prd.json contains the task list (user stories) - this is what you work through
- FEATURES.md contains detailed feature specifications - reference this for implementation details
- progress.txt contains notes from previous iterations - read this to understand what was done

INSTRUCTIONS:
1. Read the PRD file and find the highest-priority task to work on (lowest priority number with passes: false).
   - Check dependencies first - only work on tasks whose dependencies are all passes: true
   - Pick the one YOU decide has the highest priority based on dependencies and priority field
2. Read FEATURES.md to understand the full specification for the feature you're implementing.
3. Implement ONLY that single task. Do not work on multiple tasks.
4. Run any relevant tests, linting, or type checks for the project.
5. Update the PRD: set passes: true for the completed story.
6. Append your progress to progress.txt with:
   - What task was completed
   - Key implementation details
   - Any learnings or notes for the next iteration
7. Make a git commit with a descriptive message.

RULES:
- ONLY WORK ON A SINGLE TASK PER ITERATION
- Always check FEATURES.md for detailed specs before implementing
- Respect task dependencies - don't work on tasks with incomplete dependencies
- If all stories have passes: true, output <promise>COMPLETE</promise>
")

    echo "$result" | tee -a "$OUTPUT_LOG"

    # Check for completion signal
    if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
        echo ""
        echo "=================================="
        echo "PRD complete after $i iterations!"
        echo "=================================="
        exit 0
    fi

    # Small delay between iterations to avoid rate limiting
    if [ $i -lt $ITERATIONS ]; then
        echo "Waiting 5 seconds before next iteration..."
        sleep 5
    fi
done

echo ""
echo "=================================="
echo "Reached maximum iterations ($ITERATIONS)"
echo "Check progress.txt and prd.json for status"
echo "=================================="
