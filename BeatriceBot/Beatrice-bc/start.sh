#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  Beatrice Bot — Self-Contained Environment Setup & Launcher
#  Automatically prepares everything the bot needs and starts it.
#  Works on any Linux hosting: Render, Railway, Heroku, Replit, VPS
# ═══════════════════════════════════════════════════════════════════

set -e  # stop on first hard failure (install errors are caught explicitly)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║      🌸  Beatrice Bot — Boot Sequence  🌸    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Step 0: Ensure Node.js ≥ 20 ─────────────────────────────────────────────
echo "▶ Step 0: Checking Node.js version..."
NODE_VERSION=$(node -e "process.stdout.write(process.version)" 2>/dev/null || echo "none")
echo "  Node.js: $NODE_VERSION"
NODE_MAJOR=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))" 2>/dev/null || echo "0")
if [ "$NODE_MAJOR" -lt 20 ]; then
    echo "  ⚠️  Node.js 20+ required. Current: $NODE_VERSION"
    echo "  Please upgrade Node.js before running the bot."
    exit 1
fi
echo "  ✅ Node.js OK"

# ── Step 1: Ensure data directory exists ────────────────────────────────────
echo ""
echo "▶ Step 1: Preparing data directories..."
mkdir -p data
mkdir -p core/database/data

# Initialize empty key files if they don't exist
if [ ! -f "data/gemini-keys.json" ]; then
    echo "[]" > data/gemini-keys.json
    echo "  ✅ Created data/gemini-keys.json"
fi
if [ ! -f "data/grok-keys.json" ]; then
    echo "[]" > data/grok-keys.json
    echo "  ✅ Created data/grok-keys.json"
fi
if [ ! -f "data/hf-key.json" ]; then
    echo '{"token":"","updatedAt":null}' > data/hf-key.json
    echo "  ✅ Created data/hf-key.json"
fi
echo "  ✅ Data directories ready"

# ── Step 2: Install all npm packages ────────────────────────────────────────
echo ""
echo "▶ Step 2: Installing npm packages..."
npm install --legacy-peer-deps --no-audit --no-fund --ignore-scripts 2>&1 || {
    echo "  ⚠️  Standard install had issues, retrying..."
    npm install --legacy-peer-deps --no-audit --no-fund 2>&1 || true
}
echo "  ✅ Base packages installed"

# ── Step 3: Install sharp with prebuilt binary ───────────────────────────────
echo ""
echo "▶ Step 3: Installing sharp (image processing)..."
npm install --os=linux --cpu=x64 sharp --no-audit --no-fund --save 2>&1 && \
    echo "  ✅ sharp installed (linux/x64 prebuilt)" || \
    echo "  ⚠️  sharp prebuilt failed — will use noop fallback"

# ── Step 4: Rebuild native modules ──────────────────────────────────────────
echo ""
echo "▶ Step 4: Rebuilding native modules..."
npm rebuild better-sqlite3 --prefer-offline 2>&1 && \
    echo "  ✅ better-sqlite3 rebuilt" || \
    echo "  ⚠️  better-sqlite3 rebuild skipped — will use fallback"

npm rebuild sqlite3 --prefer-offline 2>&1 && \
    echo "  ✅ sqlite3 rebuilt" || {
    npm install sqlite3 --build-from-source --no-audit --no-fund 2>&1 && \
        echo "  ✅ sqlite3 built from source" || \
        echo "  ⚠️  sqlite3 build failed — better-sqlite3 will be used as fallback"
}

npm rebuild bcrypt --prefer-offline 2>&1 && \
    echo "  ✅ bcrypt rebuilt" || \
    echo "  ⚠️  bcrypt rebuild skipped"

# ── Step 5: Install essential packages if missing ───────────────────────────
echo ""
echo "▶ Step 5: Verifying critical packages..."

# sentiment (required for emotrion detection)
node -e "require('sentiment')" 2>/dev/null && \
    echo "  ✅ sentiment OK" || {
    npm install sentiment --no-audit --no-fund --save 2>&1 && \
        echo "  ✅ sentiment installed" || \
        echo "  ⚠️  sentiment install failed"
}

# axios (required for Gemini + Grok API calls)
node -e "require('axios')" 2>/dev/null && \
    echo "  ✅ axios OK" || {
    npm install axios --no-audit --no-fund --save 2>&1 && \
        echo "  ✅ axios installed" || \
        echo "  ❌ axios install FAILED — bot cannot call AI APIs!"
}

# fs-extra (required by bot core)
node -e "require('fs-extra')" 2>/dev/null && \
    echo "  ✅ fs-extra OK" || {
    npm install fs-extra --no-audit --no-fund --save 2>&1 && \
        echo "  ✅ fs-extra installed" || \
        echo "  ⚠️  fs-extra install failed"
}

# canvas (optional — graceful fallback exists)
node -e "require('canvas')" 2>/dev/null && \
    echo "  ✅ canvas OK" || \
    echo "  ℹ️  canvas not available — using adaptive graphics backend"

# ── Step 6: Validate config.json exists ─────────────────────────────────────
echo ""
echo "▶ Step 6: Validating configuration..."
if [ ! -f "config.json" ]; then
    echo "  ❌ config.json not found!"
    echo "  Please create config.json before running the bot."
    exit 1
fi

# Check if ncstate (Facebook session) exists
NCSTATE_EXISTS=false
for f in ncstate.json ncstate2.json ncstate3.json; do
    if [ -f "$f" ]; then
        NCSTATE_EXISTS=true
        echo "  ✅ Session file found: $f"
        break
    fi
done

if [ "$NCSTATE_EXISTS" = false ]; then
    echo "  ⚠️  No Facebook session file (ncstate.json) found."
    echo "  The bot will attempt email/password login from config.json."
fi
echo "  ✅ Configuration OK"

# ── Step 7: Start the bot ────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║       🚀  Starting Beatrice Bot...  🚀       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

exec node index.js
