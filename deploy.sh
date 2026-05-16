#!/usr/bin/env bash
# Biggest Losers — Pi production deploy (bootstrap + updates).
#
# First time on a fresh Raspberry Pi:
#   cp deploy.env.example .deploy.env   # edit PUBLIC_URL, etc.
#   ./deploy.sh --bootstrap
#
# After you push changes from your dev machine:
#   ./deploy.sh
#
# Optional: run from anywhere via SSH
#   ssh pi@raspberrypi 'cd ~/biggest-losers && ./deploy.sh'

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

SERVICE_NAME="biggest-losers-api"
DEPLOY_ENV="$ROOT/.deploy.env"

# Defaults (overridden by .deploy.env)
PUBLIC_URL="${PUBLIC_URL:-}"
CADDY_PORT="${CADDY_PORT:-8080}"
LOCAL_TZ="${LOCAL_TZ:-America/Denver}"
INSTALL_DEPS="${INSTALL_DEPS:-0}"
GIT_PULL="${GIT_PULL:-1}"
RUN_USER="${RUN_USER:-$(whoami)}"

BOOTSTRAP=0
if [[ "${1:-}" == "--bootstrap" ]]; then
  BOOTSTRAP=1
  shift
elif [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  sed -n '2,12p' "$0"
  exit 0
fi

if [[ -f "$DEPLOY_ENV" ]]; then
  # shellcheck source=/dev/null
  source "$DEPLOY_ENV"
fi

log() { printf '==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing command: $1 (run ./deploy.sh --bootstrap to install deps)"
}

render_template() {
  local src="$1" dest="$2"
  sed \
    -e "s|{{ROOT}}|$ROOT|g" \
    -e "s|{{USER}}|$RUN_USER|g" \
    -e "s|{{CADDY_PORT}}|$CADDY_PORT|g" \
    "$src" >"$dest"
}

install_system_deps() {
  if [[ "$(id -u)" -eq 0 ]]; then
    SUDO=""
  elif command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    die "need root or sudo to install system packages"
  fi

  log "Installing system packages (git, python3-venv, nodejs, npm, caddy)..."
  $SUDO apt-get update -qq
  $SUDO apt-get install -y git python3 python3-venv python3-pip nodejs npm caddy
}

ensure_backend_env() {
  local env_file="$ROOT/backend/.env"
  if [[ -f "$env_file" ]]; then
    return
  fi

  local frontend_url="${PUBLIC_URL:-http://localhost:${CADDY_PORT}}"
  log "Creating backend/.env (edit FRONTEND_URL if your public URL changes)"
  cat >"$env_file" <<EOF
FRONTEND_URL=${frontend_url}
LOCAL_TZ=${LOCAL_TZ}
EOF
}

setup_backend() {
  log "Backend: venv + dependencies"
  need_cmd python3
  if [[ ! -d "$ROOT/backend/.venv" ]]; then
    python3 -m venv "$ROOT/backend/.venv"
  fi
  "$ROOT/backend/.venv/bin/pip" install -q --upgrade pip
  "$ROOT/backend/.venv/bin/pip" install -q -r "$ROOT/backend/requirements.txt"
  mkdir -p "$ROOT/backend/data"
  ensure_backend_env

  # Keep FRONTEND_URL in sync when PUBLIC_URL is set in .deploy.env
  if [[ -n "$PUBLIC_URL" && -f "$ROOT/backend/.env" ]]; then
    if grep -q '^FRONTEND_URL=' "$ROOT/backend/.env"; then
      sed -i.bak "s|^FRONTEND_URL=.*|FRONTEND_URL=${PUBLIC_URL}|" "$ROOT/backend/.env"
    else
      echo "FRONTEND_URL=${PUBLIC_URL}" >>"$ROOT/backend/.env"
    fi
    rm -f "$ROOT/backend/.env.bak"
  fi
}

setup_frontend() {
  log "Frontend: install + production build"
  need_cmd npm
  (cd "$ROOT/frontend" && npm ci && npm run build)
}

install_systemd_unit() {
  log "Installing systemd unit: ${SERVICE_NAME}"
  local unit_path="/etc/systemd/system/${SERVICE_NAME}.service"
  local tmp
  tmp="$(mktemp)"
  render_template "$ROOT/deploy/biggest-losers-api.service" "$tmp"

  if [[ "$(id -u)" -eq 0 ]]; then
    cp "$tmp" "$unit_path"
  else
    sudo cp "$tmp" "$unit_path"
  fi
  rm -f "$tmp"

  if [[ "$(id -u)" -eq 0 ]]; then
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
  else
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
  fi
}

install_caddy_site() {
  log "Installing /etc/caddy/Caddyfile (port ${CADDY_PORT})"
  local caddyfile="/etc/caddy/Caddyfile"
  local tmp
  tmp="$(mktemp)"
  render_template "$ROOT/deploy/Caddyfile" "$tmp"

  run_root() {
    if [[ "$(id -u)" -eq 0 ]]; then
      "$@"
    else
      sudo "$@"
    fi
  }

  if run_root test -f "$caddyfile"; then
    run_root cp "$caddyfile" "${caddyfile}.bak.$(date +%Y%m%d%H%M%S)"
  fi
  run_root cp "$tmp" "$caddyfile"
  rm -f "$tmp"
  run_root systemctl enable caddy
  run_root systemctl reload caddy 2>/dev/null || run_root systemctl restart caddy
}

restart_services() {
  log "Restarting ${SERVICE_NAME}"
  if [[ "$(id -u)" -eq 0 ]]; then
    systemctl restart "$SERVICE_NAME"
  else
    sudo systemctl restart "$SERVICE_NAME"
  fi

  if systemctl is-active --quiet caddy 2>/dev/null || sudo systemctl is-active --quiet caddy 2>/dev/null; then
    log "Reloading caddy (serves new frontend/dist)"
    if [[ "$(id -u)" -eq 0 ]]; then
      systemctl reload caddy 2>/dev/null || true
    else
      sudo systemctl reload caddy 2>/dev/null || true
    fi
  fi
}

git_pull_if_repo() {
  if [[ "$GIT_PULL" != "1" ]]; then
    return
  fi
  if [[ ! -d "$ROOT/.git" ]]; then
    log "Not a git repo — skipping git pull"
    return
  fi
  if ! git -C "$ROOT" diff --quiet || ! git -C "$ROOT" diff --cached --quiet; then
    log "Local git changes detected — skipping pull (commit or stash first)"
    return
  fi
  log "git pull"
  git -C "$ROOT" pull --ff-only
}

print_next_steps() {
  cat <<EOF

Deploy finished.

  App (local):  http://127.0.0.1:${CADDY_PORT}
  API health:   http://127.0.0.1:${CADDY_PORT}/api/health
  API service:  systemctl status ${SERVICE_NAME}
  Caddy:        systemctl status caddy

Cloudflare Tunnel (one-time, outside this script):
  1. Create a tunnel in Cloudflare Zero Trust.
  2. Point public hostname -> http://localhost:${CADDY_PORT}
  3. Set PUBLIC_URL in .deploy.env to that URL and re-run ./deploy.sh

EOF
  if [[ -z "$PUBLIC_URL" ]]; then
    printf '  Warning: PUBLIC_URL is unset — set it in .deploy.env for correct CORS in production.\n\n'
  fi
}

main() {
  if [[ "$BOOTSTRAP" -eq 1 || "$INSTALL_DEPS" == "1" ]]; then
    install_system_deps
  fi

  git_pull_if_repo
  setup_backend
  setup_frontend

  if [[ "$BOOTSTRAP" -eq 1 ]]; then
    install_systemd_unit
    install_caddy_site
  fi

  if systemctl list-unit-files "${SERVICE_NAME}.service" >/dev/null 2>&1 \
    || sudo systemctl list-unit-files "${SERVICE_NAME}.service" >/dev/null 2>&1; then
    restart_services
  elif [[ "$BOOTSTRAP" -eq 1 ]]; then
    restart_services
  else
    log "systemd unit not installed — run ./deploy.sh --bootstrap once"
  fi

  print_next_steps
}

main "$@"
