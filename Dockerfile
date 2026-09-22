FROM denoland/deno:latest

WORKDIR /app
COPY deno.json deno.lock ./
COPY src/ ./src/
COPY views/ ./views/
COPY public/ ./public/
COPY db/ ./db/
COPY scripts/ ./scripts/
RUN deno cache src/main.ts
RUN mkdir -p /app/.data
EXPOSE 3000
CMD ["task", "start"]
