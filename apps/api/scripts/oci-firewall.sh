#!/usr/bin/env bash
# Oracle Cloud VMs sync Security List rules to iptables slowly (or not at all
# for custom ports). This opens port 8000 at the OS level and persists it.
set -euo pipefail

PORTS="${PORTS:-${PORT:-8000}}"

for PORT in ${PORTS}; do
  if ! sudo iptables -C INPUT -p tcp --dport "${PORT}" -j ACCEPT 2>/dev/null; then
    sudo iptables -I INPUT 1 -p tcp --dport "${PORT}" -j ACCEPT
    echo "Added iptables ACCEPT rule for tcp/${PORT}"
  else
    echo "iptables rule for tcp/${PORT} already present"
  fi
done

if ! dpkg -s iptables-persistent >/dev/null 2>&1; then
  echo "Installing iptables-persistent to survive reboots"
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
fi

sudo netfilter-persistent save
echo "Saved iptables rules (persists across reboot)"
