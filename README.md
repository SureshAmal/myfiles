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
| `MINIO_ENDPOINT`   | `localhost`          | MinIO server host             |
| `MINIO_PORT`       | `9000`               | MinIO API port                |
| `MINIO_USE_SSL`    | `false`              | Use HTTPS for MinIO           |
| `MINIO_ACCESS_KEY` | `myfilesadmin`       | MinIO root user               |
| `MINIO_SECRET_KEY` | `myfilespassword123` | MinIO root password           |
| `MINIO_BUCKET_NAME`| `myfiles-bucket`     | Bucket name for file storage  |

## Deployment (Railway)

Railway is recommended because it can host the Next.js app, SQLite database, and MinIO container together.

1. Push this repo to GitHub.
2. Create a new project on [Railway](https://railway.app/).
3. Add a **New Service → Docker** for MinIO using the `docker-compose.yml`.
4. Add another **New Service → GitHub Repo** pointing to this repo.
5. Set the environment variables (update `MINIO_ENDPOINT` to point to the MinIO service's internal hostname).
6. Railway auto-deploys on push.

> **Why not Vercel?** Vercel is serverless and cannot host a persistent MinIO container or a writable SQLite database.

## Custom UI Components

Reusable, accessible components are in `components/ui/index.tsx`:

- **Stepper** – numeric input with +/− buttons, keyboard arrows
- **Slider** – draggable range slider with pointer & keyboard support
- **Toggle** – switch with `role="switch"` and keyboard activation
- **SelectMenu** – dropdown with `role="combobox"`, arrow keys, focus management

All components support Tab navigation, focus-visible outlines, and ARIA attributes.

## License

MIT
