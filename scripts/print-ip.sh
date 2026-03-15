#!/usr/bin/env bash
# Print Mac LAN IP for EXPO_PUBLIC_API_URL
for iface in en0 en1 en2; do
  ip=$(ipconfig getifaddr "$iface" 2>/dev/null)
  if [ -n "$ip" ]; then
    echo "Use in parent-app/.env:"
    echo "EXPO_PUBLIC_API_URL=http://${ip}:3000"
    exit 0
  fi
done
# Fallback: first non-loopback inet
ip=$(ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
if [ -n "$ip" ]; then
  echo "Use in parent-app/.env:"
  echo "EXPO_PUBLIC_API_URL=http://${ip}:3000"
else
  echo "Could not detect LAN IP. Run: ifconfig | grep 'inet '"
  echo "Or use ngrok: ngrok http 3000"
fi
