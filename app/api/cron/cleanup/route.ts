import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { minioClient, BUCKET_NAME } from "@/lib/minio";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";

export async function DELETE(request: Request) {
  try {
    // 1. Find all expired shares
    const expiredShares = await prisma.share.findMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
      include: {
        files: true,
      },
    });

    if (expiredShares.length === 0) {
      return NextResponse.json({ message: "No expired shares found." });
    }

    let deletedFilesCount = 0;
    const shareIdsToDelete = expiredShares.map((share) => share.id);

    // 2. Delete files from MinIO
    for (const share of expiredShares as any[]) {
      const objectsList = share.files.map((file: any) => ({ Key: file.minioKey }));
      
      if (objectsList.length > 0) {
        await minioClient.send(
          new DeleteObjectsCommand({
            Bucket: BUCKET_NAME,
            Delete: { Objects: objectsList },
          })
        );
        deletedFilesCount += objectsList.length;
      }
    }

    // 3. Delete Shares from DB
    // Because of onDelete: Cascade, this will also delete the associated Files
    await prisma.share.deleteMany({
      where: {
        id: { in: shareIdsToDelete },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${expiredShares.length} shares and ${deletedFilesCount} files.`,
    });
  } catch (error) {
    console.error("Cleanup API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
