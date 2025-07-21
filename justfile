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

    # Create a temporary directory name (without creating it)
    TMP_DIR=$(mktemp -u -t jekyll-deploy-XXXX)

    echo "📁 Preparing temporary worktree at: $TMP_DIR"

    # Fetch remote gh-pages if it exists
    git fetch origin gh-pages || true

    # Add worktree (this creates TMP_DIR)
    git worktree add "$TMP_DIR" gh-pages

    # Copy the built site into the worktree
    cp -r _site/* "$TMP_DIR"
    cp -r _site/. "$TMP_DIR" 2>/dev/null || true  # Include dotfiles if present

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
