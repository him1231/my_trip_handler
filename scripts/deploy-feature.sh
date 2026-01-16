#!/bin/bash

# Script to create a feature branch, commit changes, and merge to develop, then to main
# Usage: ./scripts/deploy-feature.sh [feature-name] [commit-message]
#        npm run deploy:feature [feature-name] [commit-message]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get feature branch name
if [ -z "$1" ]; then
  echo -e "${YELLOW}Enter feature branch name (e.g., feature/places-api-migration):${NC}"
  read -r FEATURE_NAME
  if [ -z "$FEATURE_NAME" ]; then
    echo -e "${RED}Feature branch name is required!${NC}"
    exit 1
  fi
else
  FEATURE_NAME="$1"
fi

# Ensure feature branch name starts with feature/
if [[ ! "$FEATURE_NAME" =~ ^feature/ ]]; then
  FEATURE_NAME="feature/$FEATURE_NAME"
fi

# Get the current branch name (before creating feature branch)
ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Check if feature branch already exists
if git show-ref --verify --quiet refs/heads/"$FEATURE_NAME"; then
  echo -e "${YELLOW}Feature branch '$FEATURE_NAME' already exists.${NC}"
  echo -e "${YELLOW}Switching to existing branch...${NC}"
  git checkout "$FEATURE_NAME"
else
  # Create and switch to feature branch
  echo -e "${GREEN}Creating feature branch: ${FEATURE_NAME}${NC}"
  git checkout -b "$FEATURE_NAME"
fi

# Check if there are uncommitted changes
if [ -z "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}No changes to commit.${NC}"
else
  echo -e "${GREEN}Found uncommitted changes.${NC}"
  
  # Get commit message
  if [ -z "$2" ]; then
    echo -e "${YELLOW}Enter commit message (or press Enter for default):${NC}"
    read -r COMMIT_MSG
    if [ -z "$COMMIT_MSG" ]; then
      COMMIT_MSG="feat: update code"
    fi
  else
    COMMIT_MSG="$2"
  fi
  
  # Stage all changes
  echo -e "${GREEN}Staging all changes...${NC}"
  git add .
  
  # Commit changes
  echo -e "${GREEN}Committing changes with message: ${COMMIT_MSG}${NC}"
  git commit -m "$COMMIT_MSG"
fi

# Push feature branch to origin
echo -e "${GREEN}Pushing feature branch to origin...${NC}"
git push -u origin "$FEATURE_NAME" || git push origin "$FEATURE_NAME"

# Check if develop branch exists
if ! git show-ref --verify --quiet refs/heads/develop; then
  echo -e "${YELLOW}Creating develop branch...${NC}"
  git checkout -b develop
  git push -u origin develop
else
  # Switch to develop branch
  echo -e "${GREEN}Switching to develop branch...${NC}"
  git checkout develop
  
  # Pull latest changes
  echo -e "${GREEN}Pulling latest changes from develop...${NC}"
  git pull origin develop || true
fi

# Merge feature branch into develop
echo -e "${GREEN}Merging ${FEATURE_NAME} into develop...${NC}"
if ! git merge "$FEATURE_NAME" --no-edit; then
  echo -e "${RED}Merge conflict detected! Please resolve conflicts and try again.${NC}"
  echo -e "${YELLOW}You are currently on develop branch.${NC}"
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

# Switch back to feature branch
echo -e "${GREEN}Switching back to feature branch ${FEATURE_NAME}...${NC}"
git checkout "$FEATURE_NAME"

echo -e "${GREEN}✓ Deployment complete!${NC}"
echo -e "${BLUE}Summary:${NC}"
echo -e "  • Created/used feature branch: ${FEATURE_NAME}"
echo -e "  • Committed changes to ${FEATURE_NAME}"
echo -e "  • Merged ${FEATURE_NAME} → develop"
echo -e "  • Merged develop → main"
echo -e "  • All branches pushed to origin"
