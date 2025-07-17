set shell := ["bash", "-cu"]

# Build the Jekyll site
build:
    bundle exec jekyll build

# Deploy the site using git worktree
deploy:
    just build
    # Check for uncommitted changes
    git diff --quiet || (echo "❌ You have uncommitted changes. Commit them before deploying." && exit 1)
    export TMP_DIR := $(mktemp -d)
    cp -r _site/* "$TMP_DIR"
    cp -r _site/. "$TMP_DIR" 2>/dev/null || true # Include dotfiles if any
    git fetch origin gh-pages || true
    git worktree add "$TMP_DIR" gh-pages
    pushd "$TMP_DIR" > /dev/null
    git add --all
    git commit -m "Deploy site" || echo "✅ No changes to commit"
    git push origin gh-pages
    popd > /dev/null
    git worktree remove "$TMP_DIR"

# Clean the _site directory
clean:
    rm -rf _site
