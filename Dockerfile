FROM oven/bun:latest AS base

WORKDIR /app

# Copy package manager files and prisma schema
COPY package.json bun.lock ./
COPY prisma ./prisma

# Install dependencies and generate Prisma client
RUN apt-get update -qq && \
    apt-get install -y python3 pkg-config build-essential && \
    rm -rf /var/lib/apt/lists/*
RUN bun install --frozen-lockfile
RUN bunx prisma generate

# Copy the rest of the application code
COPY . .

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN bun run build

# Expose the standard Next.js port
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application using Bun
CMD ["bun", "run", "start"]
