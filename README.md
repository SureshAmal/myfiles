# MyFiles – Secure File Sharing

A minimal, self-hosted file sharing application built with Next.js, MinIO, and Prisma.

## Features

- **Passkey-protected shares** – each upload generates a unique passkey
- **Short URLs** – compact `/s/<id>` links for easy sharing
- **12-hour expiration** – shares auto-expire after 12 hours
- **100 MB per share** – batch upload limit per share
- **1 GB global cap** – total storage across all users
- **100 max concurrent users** – prevents abuse

## Tech Stack

| Layer     | Technology         |
|-----------|--------------------|
| Framework | Next.js 16 (App Router) |
| Language  | TypeScript (strict) |
| Styling   | Tailwind CSS v4 + CSS variables |
| Database  | SQLite via Prisma ORM |
| Storage   | MinIO (S3-compatible) |
| Runtime   | Bun |

## Project Structure

```
myfiles/
├── app/
│   ├── api/
│   │   ├── upload/route.ts          # POST – upload files
│   │   ├── share/[id]/route.ts      # GET metadata, POST verify passkey
│   │   └── cron/cleanup/route.ts    # DELETE expired shares
│   ├── s/[id]/page.tsx              # Download page (passkey input)
│   ├── page.tsx                     # Upload page
│   ├── layout.tsx                   # Root layout
│   └── globals.css                  # CSS variable design tokens
├── components/
│   └── ui/index.tsx                 # Stepper, Slider, Toggle, SelectMenu
├── lib/
│   ├── minio.ts                     # MinIO client singleton
│   └── prisma.ts                    # Prisma client singleton
├── prisma/
│   └── schema.prisma                # Database schema
├── docker-compose.yml               # MinIO service
├── .env                             # Environment variables
└── package.json
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (v1.3+)
- [Docker](https://www.docker.com/) & Docker Compose

### 1. Start MinIO

```bash
docker-compose up -d
```

MinIO Console: http://localhost:9001 (user: `myfilesadmin`, password: `myfilespassword123`)

### 2. Install dependencies

```bash
bun install
```

### 3. Set up the database

```bash
bunx prisma db push
bunx prisma generate
```

### 4. Run the dev server

```bash
bun run dev
```

Open http://localhost:3000.

### 5. Clean up expired shares (manual trigger)

```bash
curl -X DELETE http://localhost:3000/api/cron/cleanup
```

## Environment Variables

| Variable           | Default              | Description                   |
|--------------------|----------------------|-------------------------------|
| `DATABASE_URL`     | `file:./dev.db`      | SQLite database path          |
| `MINIO_ENDPOINT`   | `localhost`          | MinIO server host (leave as `localhost` for Railway) |
| `MINIO_PORT`       | `9000`               | MinIO API port (leave as `9000` for Railway)         |
| `MINIO_USE_SSL`    | `false`              | Use HTTPS (leave as `false` for Railway)             |
| `MINIO_ACCESS_KEY` | `myfilesadmin`       | MinIO root user               |
| `MINIO_SECRET_KEY` | `myfilespassword123` | MinIO root password           |
| `MINIO_BUCKET_NAME`| `myfiles-bucket`     | Bucket name for file storage  |