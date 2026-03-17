#!/bin/sh

# Start MinIO server in the background
# We bind it to all interfaces (0.0.0.0) so it's accessible if needed, but primarily for localhost
echo "Starting MinIO Server..."
export MINIO_ROOT_USER=${MINIO_ACCESS_KEY:-myfilesadmin}
export MINIO_ROOT_PASSWORD=${MINIO_SECRET_KEY:-myfilespassword123}
minio server /app/minio_data --console-address ":9001" &

# Wait for MinIO to initialize (optional but good practice)
sleep 3

# Start Next.js (Bun) server in the foreground
echo "Starting Next.js Server..."
bun run start
