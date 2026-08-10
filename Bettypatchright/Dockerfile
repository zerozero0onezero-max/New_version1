FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates procps \
    libgbm1 libasound2 libatk-bridge2.0-0 libcups2 libdrm2 libexpat1 libudev1 \
    libgtk-3-0 libnspr4 libnss3 libxcomposite1 libxdamage1 \
    libxkbcommon0 libxrandr2 xdg-utils fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json requirements.json environment-check.mjs browser-runtime.mjs server.mjs prepare-ui.mjs ./
COPY ui ./ui
COPY source ./source
RUN npm install --omit=dev --no-audit --no-fund

ENV PORT=7860
EXPOSE 7860
CMD ["node", "server.mjs"]