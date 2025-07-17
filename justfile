# Set shell to bash for better compatibility
set shell := ["bash", "-cu"]

# Recipe to build the Jekyll site
build:
    bundle exec jekyll build

# Deploy the contents of _site/ to the gh-pages branch
deploy:
    just build
    # Ensure working directory is clean
    git diff --quiet || (echo "❌ You have uncommitted changes. Commit them before deploying." && exit 1)
    TMP_DIR=$(mktemp -d)
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
