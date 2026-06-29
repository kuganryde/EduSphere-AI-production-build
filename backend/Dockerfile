FROM node:20-slim

# Install Tailscale
RUN apt-get update && apt-get install -y curl iptables iproute2 \
    && curl -fsSL https://tailscale.com/install.sh | sh \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Entrypoint: bring up Tailscale first, then start the Node server
COPY tailscale-start.sh /tailscale-start.sh
RUN chmod +x /tailscale-start.sh

EXPOSE 3000
CMD ["/tailscale-start.sh"]
