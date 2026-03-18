import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import * as bcrypt from "bcrypt";
import { getMinioPublicClient, BUCKET_NAME } from "@/lib/minio";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const share = await prisma.share.findUnique({
      where: { shortId: id },
      include: { files: true },
    });

    if (!share) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    if (new Date() > share.expiresAt) {
      return NextResponse.json({ error: "Share has expired" }, { status: 410 });
    }

    return NextResponse.json({
      success: true,
      data: {
        size: share.size,
        expiresAt: share.expiresAt,
        files: share.files.map((f) => ({
          id: f.id,
          name: f.originalName,
          size: f.size,
          mimeType: f.mimeType,
        })),
      },
    });
  } catch (error) {
    console.error("Share GET error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { passkey } = await request.json();

    if (!passkey) {
      return NextResponse.json(
        { error: "Passkey is required" },
        { status: 400 },
      );
    }

    const share = await prisma.share.findUnique({
      where: { shortId: id },
      include: { files: true },
    });

    if (!share) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    if (new Date() > share.expiresAt) {
      return NextResponse.json({ error: "Share has expired" }, { status: 410 });
    }

    // Verify Passkey
    const isMatch = await bcrypt.compare(passkey, share.passkey);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid passkey" }, { status: 401 });
    }

    // Generate Presigned URLs valid for 3 hours
    const downloadLinks = await Promise.all(
      share.files.map(async (file) => {
        const url = await getMinioPublicClient().presignedGetObject(
          BUCKET_NAME,
          file.minioKey,
          3 * 60 * 60, // 3 hour expiry
          {
            "response-content-disposition": `attachment; filename="${file.originalName}"`,
          },
        );
        return {
          id: file.id,
          name: file.originalName,
          size: file.size,
          mimeType: file.mimeType,
          url,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: downloadLinks,
    });
  } catch (error) {
    console.error("Share POST error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
