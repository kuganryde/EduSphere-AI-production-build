#!/bin/sh
# Start Tailscale daemon
tailscaled --state=/tmp/tailscale-state --socket=/tmp/tailscale.sock &

# Wait for daemon to be ready
sleep 3

# Join the Tailscale network (ephemeral — leaves automatically when container stops)
tailscale --socket=/tmp/tailscale.sock up \
  --authkey="${TAILSCALE_AUTH_KEY}" \
  --hostname="edusphere-backend-render" \
  --accept-routes \
  --ephemeral

echo "Tailscale up — starting Node backend"
node dist/server.js
