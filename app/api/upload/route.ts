import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import * as bcrypt from "bcrypt";
import prisma from "@/lib/prisma";
import { minioClient, BUCKET_NAME, initializeMinio } from "@/lib/minio";
import { PutObjectCommand } from "@aws-sdk/client-s3";

// Limits
const MAX_GLOBAL_SIZE = 1 * 1024 * 1024 * 1024; // 1 GB
const MAX_SHARE_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_USERS = 100;

export async function POST(request: Request) {
  try {
    // 1. Ensure bucket exists
    await initializeMinio();

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    // 2. Validate session/user logic
    // We'll create a new user per upload just for demonstration, or reuse an existing identifier if sent.
    // In a real scenario, you might get this from cookies/headers.
    const sessionId =
      request.headers.get("x-session-id") || nanoid();

    let user = await prisma.user.findUnique({
      where: { sessionId },
    });

    if (!user) {
      const userCount = await prisma.user.count();
      if (userCount >= MAX_USERS) {
        return NextResponse.json(
          { error: "Maximum active users reached (100). Try again later." },
          { status: 429 }
        );
      }
      user = await prisma.user.create({
        data: { sessionId },
      });
    }

    // 3. Size calculations
    const batchSize = files.reduce((acc, file) => acc + file.size, 0);

    if (batchSize > MAX_SHARE_SIZE) {
      return NextResponse.json(
        { error: `Batch size exceeds maximum limit of 100MB.` },
        { status: 400 }
      );
    }

    // Check global limit
    const allShares = await prisma.share.aggregate({
      _sum: { size: true },
    });
    const totalUsed = allShares._sum.size || 0;

    if (totalUsed + batchSize > MAX_GLOBAL_SIZE) {
      return NextResponse.json(
        { error: "Global storage limit (1GB) reached. Try again later." },
        { status: 429 }
      );
    }

    // 4. Generate Passkey and Share ID
    const rawPasskey = nanoid(8); // Fixed 8 characters
    const hashedPasskey = await bcrypt.hash(rawPasskey, 10);
    const shortId = nanoid(6); // e.g. "xYz123"
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // 5. Create Share in DB
    const share = await prisma.share.create({
      data: {
        shortId,
        passkey: hashedPasskey,
        rawPasskey: rawPasskey,
        size: batchSize,
        expiresAt,
        userId: user.id,
      },
    });

    // 6. Upload files to MinIO and save metadata in DB
    const uploadPromises = files.map(async (file) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const minioKey = `${share.id}/${nanoid()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`; // Sanitize name
      
      // Upload to MinIO using S3 SDK
      await minioClient.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: minioKey,
          Body: buffer,
          ContentType: file.type || "application/octet-stream",
        })
      );

      // Save to DB
      await prisma.file.create({
        data: {
          originalName: file.name,
          minioKey,
          size: file.size,
          mimeType: file.type || "application/octet-stream",
          shareId: share.id,
        },
      });
    });

    await Promise.all(uploadPromises);

    // 7. Return the credentials to the user
    return NextResponse.json({
      success: true,
      data: {
        shortUrlId: shortId,
        passkey: rawPasskey,
        expiresAt,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
