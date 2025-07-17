set shell := ["bash", "-cu"]

# Build the Jekyll site
build:
    bundle exec jekyll build

# Deploy the site using git worktree
deploy:
    #!/usr/bin/env bash
    set -euo pipefail
    
    # Build the site
    echo "🔨 Building site..."
    bundle exec jekyll build
    
    # Ensure working directory is clean
    if ! git diff --quiet; then
      echo "❌ You have uncommitted changes. Commit or stash them before deploying."
      exit 1
    fi
    
    # Create a temporary directory
    TMP_DIR=$(mktemp -d)
    echo "📁 Using temporary directory: $TMP_DIR"
    
    # Copy site contents to the temp dir
    cp -r _site/* "$TMP_DIR"
    cp -r _site/. "$TMP_DIR" 2>/dev/null || true  # Include dotfiles if any
    
    # Fetch remote branch if it exists
    git fetch origin gh-pages || true
    
    # Add worktree
    git worktree add "$TMP_DIR" gh-pages
    
    # Commit and push from within the worktree
    pushd "$TMP_DIR" > /dev/null
    git add --all
    if git commit -m "Deploy site"; then
      echo "🚀 Committing and pushing changes..."
      git push origin gh-pages
    else
      echo "✅ No changes to commit."
    fi
    popd > /dev/null
    
    # Clean up
    echo "🧹 Cleaning up worktree..."
    git worktree remove "$TMP_DIR"
    
    echo "✅ Deployment complete."

# Clean the _site directory
clean:
    rm -rf _site
