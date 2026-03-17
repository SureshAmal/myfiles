import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { minioClient, BUCKET_NAME, initializeMinio } from "@/lib/minio";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = request.headers.get("x-session-id");
    if (!sessionId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const unwrappedParams = await params;
    const { id: shareId } = unwrappedParams;

    const user = await prisma.user.findUnique({
      where: { sessionId },
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const share = await prisma.share.findUnique({
      where: { id: shareId },
      include: { files: true },
    });

    if (!share || share.userId !== user.id) {
      return NextResponse.json({ error: "Share not found or unauthorized" }, { status: 404 });
    }

    // Delete files from MinIO
    await initializeMinio();
    for (const f of share.files) {
      try {
        await minioClient.removeObject(BUCKET_NAME, f.minioKey);
      } catch (err) {
        console.error(`Failed to delete object from MinIO: ${f.minioKey}`, err);
      }
    }

    // Delete from DB
    await prisma.share.delete({
      where: { id: share.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete share error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
