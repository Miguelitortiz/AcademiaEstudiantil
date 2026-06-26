# Stage 1: Build
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Copy package definitions
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the Astro project (SSR mode)
RUN npm run build

# Stage 2: Runtime
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

# Install system dependencies: Python3 and LaTeX compiler
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    texlive-latex-base \
    texlive-fonts-recommended \
    && rm -rf /var/lib/apt/lists/*

# Copy package definitions
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy compiled output, python script, and directories
COPY --from=build /app/dist ./dist
COPY --from=build /app/python ./python
COPY --from=build /app/src/lib/db.ts ./src/lib/db.ts 
# (We might need db.ts at runtime, but since typescript is compiled in build, better-sqlite3 uses standard js inside dist. 
# However, we copy the project files to make sure everything resolved correctly)
COPY --from=build /app/data ./data

# Expose server port
EXPOSE 8080

# Environment variables
ENV HOST=0.0.0.0
ENV PORT=8080
ENV NODE_ENV=production

# Run Astro standalone server
CMD ["node", "./dist/server/entry.mjs"]
