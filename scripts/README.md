# Deployment Scripts

## deploy-feature.sh (Recommended)

Creates a feature branch, commits changes, and merges to `develop`, then to `main`.

### Usage

#### Option 1: Using npm script (interactive)
```bash
npm run deploy:feature
# Will prompt for feature name and commit message
```

#### Option 2: With feature name and commit message
```bash
npm run deploy:feature "places-api-migration" "migrate to new Google Places API"
```

#### Option 3: Direct script execution
```bash
./scripts/deploy-feature.sh "places-api-migration" "migrate to new Google Places API"
```

### What it does

1. **Creates/uses feature branch**
   - Prompts for feature branch name (or uses provided name)
   - Automatically prefixes with `feature/` if not provided
   - Creates branch if it doesn't exist, or switches to existing one

2. **Commits changes**
   - Stages all uncommitted changes
   - Commits with provided message (or prompts for one)
   - Pushes feature branch to origin

3. **Merges to develop**
   - Switches to `develop` branch
   - Pulls latest changes
   - Merges feature branch into `develop`
   - Pushes `develop` to origin

4. **Merges to main**
   - Switches to `main` branch
   - Pulls latest changes
   - Merges `develop` into `main`
   - Pushes `main` to origin

5. **Returns to feature branch**
   - Switches back to the feature branch

### Example

```bash
# Interactive mode
npm run deploy:feature
# Enter: places-api-migration
# Enter: migrate to new Google Places API

# Or with arguments
npm run deploy:feature "places-api-migration" "migrate to new Google Places API"
```

---

## deploy.sh

Automates the workflow to commit changes on current branch and merge to `develop`, then to `main`.

### Usage

#### Option 1: Using npm script
```bash
npm run deploy "your commit message here"
```

#### Option 2: Direct script execution
```bash
./scripts/deploy.sh "your commit message here"
```

#### Option 3: Interactive (prompts for commit message)
```bash
npm run deploy
# or
./scripts/deploy.sh
```

### What it does

1. **Checks for uncommitted changes**
   - If changes exist, stages and commits them
   - Prompts for commit message if not provided

2. **Merges to develop**
   - Switches to `develop` branch
   - Pulls latest changes
   - Merges current branch into `develop`
   - Pushes `develop` to origin

3. **Merges to main**
   - Switches to `main` branch
   - Pulls latest changes
   - Merges `develop` into `main`
   - Pushes `main` to origin

4. **Returns to original branch**
   - Switches back to the branch you started from

### Safety Features

- Exits on errors (set -e)
- Handles merge conflicts gracefully
- Pulls latest changes before merging
- Creates `develop` branch if it doesn't exist
- Color-coded output for better visibility

### Example

```bash
# With commit message
npm run deploy "fix: migrate to new Google Places API"

# Interactive (will prompt for message)
npm run deploy
```

### Notes

- **deploy-feature.sh** is recommended for new features as it creates a proper feature branch
- **deploy.sh** is useful when you're already on a branch and want to deploy it
- Both scripts will fail if there are merge conflicts (you'll need to resolve them manually)
- Always review your changes before deploying
- Feature branch names are automatically prefixed with `feature/` if not provided