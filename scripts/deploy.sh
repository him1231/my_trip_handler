#!/bin/bash

# Script to commit changes and merge to develop, then to main
# Usage: ./scripts/deploy.sh [commit-message]
#        npm run deploy [commit-message]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the current branch name
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Check if there are uncommitted changes
if [ -z "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}No changes to commit.${NC}"
else
  echo -e "${GREEN}Found uncommitted changes.${NC}"
  
  # Get commit message
  if [ -z "$1" ]; then
    echo -e "${YELLOW}Enter commit message (or press Enter for default):${NC}"
    read -r COMMIT_MSG
    if [ -z "$COMMIT_MSG" ]; then
      COMMIT_MSG="chore: update code"
    fi
  else
    COMMIT_MSG="$1"
  fi
  
  # Stage all changes
  echo -e "${GREEN}Staging all changes...${NC}"
  git add .
  
  # Commit changes
  echo -e "${GREEN}Committing changes with message: ${COMMIT_MSG}${NC}"
  git commit -m "$COMMIT_MSG"
fi

# Check if develop branch exists
if ! git show-ref --verify --quiet refs/heads/develop; then
  echo -e "${YELLOW}Creating develop branch...${NC}"
  git checkout -b develop
else
  # Switch to develop branch
  echo -e "${GREEN}Switching to develop branch...${NC}"
  git checkout develop
  
  # Pull latest changes
  echo -e "${GREEN}Pulling latest changes from develop...${NC}"
  git pull origin develop || true
fi

# Merge current branch into develop
echo -e "${GREEN}Merging ${CURRENT_BRANCH} into develop...${NC}"
if ! git merge "$CURRENT_BRANCH" --no-edit; then
  echo -e "${RED}Merge conflict detected! Please resolve conflicts and try again.${NC}"
  exit 1
fi

# Push develop
echo -e "${GREEN}Pushing develop to origin...${NC}"
git push origin develop

# Switch to main branch
echo -e "${GREEN}Switching to main branch...${NC}"
git checkout main

# Pull latest changes
echo -e "${GREEN}Pulling latest changes from main...${NC}"
git pull origin main || true

# Merge develop into main
echo -e "${GREEN}Merging develop into main...${NC}"
if ! git merge develop --no-edit; then
  echo -e "${RED}Merge conflict detected! Please resolve conflicts and try again.${NC}"
  echo -e "${YELLOW}You are currently on main branch.${NC}"
  exit 1
fi

# Push main
echo -e "${GREEN}Pushing main to origin...${NC}"
git push origin main

# Switch back to original branch
echo -e "${GREEN}Switching back to ${CURRENT_BRANCH}...${NC}"
git checkout "$CURRENT_BRANCH"

echo -e "${GREEN}✓ Deployment complete!${NC}"
echo -e "${GREEN}Changes have been committed, merged to develop, and merged to main.${NC}"
