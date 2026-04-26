#!/usr/bin/env bash
# sync-session.sh — Parses a Claude Code transcript and POSTs session usage to TC Dashboard.
# Called by both Stop and SessionEnd hooks. Self-backgrounds so the hook returns instantly.
#
# Receives JSON via stdin:
#   { "session_id": "...", "transcript_path": "...", "cwd": "...", "hook_event_name": "..." }
#
# Required env vars: TC_USAGE_API_KEY, TC_USAGE_API_URL
# (Reads from ~/.claude/tc-wow/.env first, falls back to ~/.zshrc)

INPUT=$(cat)

LOG="$HOME/.claude/tc-usage-sync.log"

# Fork into background — hook returns immediately
(
  log() { echo "[$(date '+%H:%M:%S')] $*" >> "$LOG"; }

  # Source env vars if not already set
  # Priority 1: ~/.claude/tc-wow/.env (new unified location)
  if [ -z "${TC_USAGE_API_KEY:-}" ] || [ -z "${TC_USAGE_API_URL:-}" ]; then
    if [ -f "$HOME/.claude/tc-wow/.env" ]; then
      set -a; source "$HOME/.claude/tc-wow/.env"; set +a
    fi
  fi
  # Priority 2: ~/.zshrc (backward compat with old manual setup)
  if [ -z "${TC_USAGE_API_KEY:-}" ] || [ -z "${TC_USAGE_API_URL:-}" ]; then
    while IFS= read -r line; do
      if [[ "$line" =~ ^export\ (TC_USAGE_[A-Z_]+)=[\"\']?([^\"\']+)[\"\']? ]]; then
        export "${BASH_REMATCH[1]}=${BASH_REMATCH[2]}"
      fi
    done < "$HOME/.zshrc" 2>/dev/null || true
  fi

  if [ -z "${TC_USAGE_API_KEY:-}" ] || [ -z "${TC_USAGE_API_URL:-}" ]; then
    log "SKIP: missing env vars (API_KEY=${TC_USAGE_API_KEY:+set} API_URL=${TC_USAGE_API_URL:-})"
    exit 0
  fi

  SESSION_ID=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('session_id',''))")
  TRANSCRIPT=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('transcript_path',''))")
  CWD=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('cwd',''))")
  HOOK_EVENT=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('hook_event_name',''))")

  if [ -z "$SESSION_ID" ] || [ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ]; then
    log "SKIP: missing session data (session_id=${SESSION_ID:-empty} transcript=${TRANSCRIPT:-empty} exists=$([ -f "${TRANSCRIPT:-}" ] && echo yes || echo no))"
    exit 0
  fi

  IS_SUBAGENT="false"
  if [ "$HOOK_EVENT" = "SubagentStop" ]; then
    IS_SUBAGENT="true"
  fi

  log "SYNC: session=$SESSION_ID project=$(basename "$CWD") subagent=$IS_SUBAGENT"

  PROJECT=$(basename "$CWD")

  # Pass variables via env to avoid shell injection in Python string literals
  export _TC_TRANSCRIPT="$TRANSCRIPT"
  export _TC_SESSION_ID="$SESSION_ID"
  export _TC_PROJECT="$PROJECT"
  export _TC_IS_SUBAGENT="$IS_SUBAGENT"

  PAYLOAD=$(python3 -c "
import json, sys, os
from collections import defaultdict

transcript_path = os.environ['_TC_TRANSCRIPT']
session_id = os.environ['_TC_SESSION_ID']
project = os.environ['_TC_PROJECT']
is_subagent = os.environ['_TC_IS_SUBAGENT'] == 'true'

# Two-pass: first collect per-request max usage (last chunk wins), then aggregate per model
request_usage = {}
tool_calls_by_model = defaultdict(int)
date = None
started_at = None
ended_at = None

# Session-level fields
git_branch = None
entrypoint_val = None
has_images_global = False
is_sidechain_global = False

with open(transcript_path) as f:
    for raw_line in f:
        raw_line = raw_line.strip()
        if not raw_line:
            continue
        try:
            entry = json.loads(raw_line)
        except json.JSONDecodeError:
            continue

        ts = entry.get('timestamp', '')
        if ts:
            if started_at is None:
                started_at = ts
                date = ts[:10]
            ended_at = ts

        # Check for images in ALL entry types (user + assistant)
        msg_obj = entry.get('message')
        if isinstance(msg_obj, dict):
            entry_content = msg_obj.get('content', [])
            if isinstance(entry_content, list):
                for block in entry_content:
                    if isinstance(block, dict) and block.get('type') == 'image':
                        has_images_global = True

        # Session-level fields from any entry
        if git_branch is None and entry.get('gitBranch'):
            git_branch = entry['gitBranch']
        if entrypoint_val is None and entry.get('entrypoint'):
            entrypoint_val = entry['entrypoint']

        # Sidechain detection from entry level (separate from isSubagent)
        if entry.get('isSidechain'):
            is_sidechain_global = True

        if entry.get('type') != 'assistant':
            continue

        msg = entry.get('message', {})
        request_id = entry.get('requestId', '')
        model = msg.get('model', 'unknown')
        usage = msg.get('usage', {})
        content = msg.get('content', [])

        for block in content:
            if block.get('type') == 'tool_use':
                tool_calls_by_model[model] += 1

        # Core token fields
        u = {
            'input_tokens': usage.get('input_tokens', 0),
            'output_tokens': usage.get('output_tokens', 0),
            'cache_read_input_tokens': usage.get('cache_read_input_tokens', 0),
            'cache_creation_input_tokens': usage.get('cache_creation_input_tokens', 0),
        }

        # Enhanced fields from usage object
        cache_creation = usage.get('cache_creation') or {}
        server_tool = usage.get('server_tool_use') or {}
        iterations_arr = usage.get('iterations', [])

        enhanced = {
            'service_tier': usage.get('service_tier') or None,
            'speed': usage.get('speed') or None,
            'stop_reason': msg.get('stop_reason') or None,
            'cache_5m': cache_creation.get('ephemeral_5m_input_tokens', 0) if isinstance(cache_creation, dict) else 0,
            'cache_1h': cache_creation.get('ephemeral_1h_input_tokens', 0) if isinstance(cache_creation, dict) else 0,
            'web_search': server_tool.get('web_search_requests', 0) if isinstance(server_tool, dict) else 0,
            'web_fetch': server_tool.get('web_fetch_requests', 0) if isinstance(server_tool, dict) else 0,
            'iterations': len(iterations_arr) if isinstance(iterations_arr, list) else 0,
            'has_thinking': any(b.get('type') == 'thinking' for b in content if isinstance(b, dict)),
        }

        total = sum(u.values())
        key = request_id or id(entry)
        prev = request_usage.get(key)
        if prev is None or total > sum(prev['usage'].values()):
            request_usage[key] = {'model': model, 'usage': u, 'enhanced': enhanced}

model_usage = defaultdict(lambda: {
    'messages': 0, 'toolCalls': 0,
    'inputTokens': 0, 'outputTokens': 0,
    'cacheReadTokens': 0, 'cacheCreationTokens': 0,
    # Enhanced aggregations
    'serviceTier': None, 'stopReason': None, 'speed': None,
    'cacheCreation5mTokens': 0, 'cacheCreation1hTokens': 0,
    'webSearchRequests': 0, 'webFetchRequests': 0,
    'iterations': 0, 'hasThinking': False, 'isSidechain': False,
})

for req in request_usage.values():
    mu = model_usage[req['model']]
    mu['messages'] += 1
    mu['inputTokens'] += req['usage']['input_tokens']
    mu['outputTokens'] += req['usage']['output_tokens']
    mu['cacheReadTokens'] += req['usage']['cache_read_input_tokens']
    mu['cacheCreationTokens'] += req['usage']['cache_creation_input_tokens']
    # Enhanced: SUM for integers
    e = req['enhanced']
    mu['cacheCreation5mTokens'] += e['cache_5m']
    mu['cacheCreation1hTokens'] += e['cache_1h']
    mu['webSearchRequests'] += e['web_search']
    mu['webFetchRequests'] += e['web_fetch']
    mu['iterations'] += e['iterations']
    # Enhanced: last non-null for text
    if e['service_tier']:
        mu['serviceTier'] = e['service_tier']
    if e['stop_reason']:
        mu['stopReason'] = e['stop_reason']
    if e['speed']:
        mu['speed'] = e['speed']
    # Enhanced: OR for booleans
    if e['has_thinking']:
        mu['hasThinking'] = True

for model, tc in tool_calls_by_model.items():
    model_usage[model]['toolCalls'] = tc

if not model_usage:
    sys.exit(1)

if not date:
    from datetime import date as dt_mod
    date = dt_mod.today().isoformat()

usage_list = [{'model': model, **stats} for model, stats in model_usage.items()]
# Set session-level booleans on all entries
if has_images_global:
    for u in usage_list:
        u['hasImages'] = True
if is_sidechain_global:
    for u in usage_list:
        u['isSidechain'] = True

result = {
    'sessionId': session_id,
    'date': date,
    'project': project,
    'isSubagent': is_subagent,
    'usage': usage_list,
}
if started_at:
    result['startedAt'] = started_at
if ended_at:
    result['endedAt'] = ended_at
if git_branch:
    result['gitBranch'] = git_branch
if entrypoint_val:
    result['entrypoint'] = entrypoint_val

print(json.dumps(result))
")
  PY_EXIT=$?

  if [ $PY_EXIT -ne 0 ] || [ -z "$PAYLOAD" ]; then
    log "SKIP: python parse failed (exit=$PY_EXIT)"
    exit 0
  fi

  log "PAYLOAD: $PAYLOAD"

  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${TC_USAGE_API_URL}/api/usage/sync" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TC_USAGE_API_KEY}" \
    -d "$PAYLOAD" \
    --max-time 10 2>&1) || true

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  log "RESPONSE: $HTTP_CODE $BODY"

  # Auto-re-register on 401 (e.g. after database reset)
  if [ "$HTTP_CODE" = "401" ]; then
    log "AUTO-REGISTER: API key rejected, attempting re-registration..."
    DEV_NAME=$(git config --global user.name 2>/dev/null || whoami)
    REG_PAYLOAD=$(DEV_NAME="$DEV_NAME" TC_KEY="$TC_USAGE_API_KEY" python3 -c "import json,os; print(json.dumps({'name': os.environ['DEV_NAME'], 'apiKey': os.environ['TC_KEY']}))")
    REG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${TC_USAGE_API_URL}/api/usage/register" \
      -H "Content-Type: application/json" \
      -d "$REG_PAYLOAD" \
      --max-time 10 2>&1) || true
    REG_CODE=$(echo "$REG_RESPONSE" | tail -1)
    REG_BODY=$(echo "$REG_RESPONSE" | sed '$d')
    log "AUTO-REGISTER: $REG_CODE $REG_BODY"

    if [ "$REG_CODE" = "200" ]; then
      log "AUTO-REGISTER: success — retrying sync..."
      RETRY=$(curl -s -w "\n%{http_code}" -X POST "${TC_USAGE_API_URL}/api/usage/sync" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TC_USAGE_API_KEY}" \
        -d "$PAYLOAD" \
        --max-time 10 2>&1) || true
      RETRY_CODE=$(echo "$RETRY" | tail -1)
      RETRY_BODY=$(echo "$RETRY" | sed '$d')
      log "RETRY: $RETRY_CODE $RETRY_BODY"
    fi
  fi
) &
