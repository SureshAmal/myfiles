import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const sessionId = request.headers.get("x-session-id");
    if (!sessionId) {
      return NextResponse.json({ data: [] });
    }

    const user = await prisma.user.findUnique({
      where: { sessionId },
    });

    if (!user) {
      return NextResponse.json({ data: [] });
    }

    const shares = await prisma.share.findMany({
      where: { userId: user.id },
      include: {
        files: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, data: shares });
  } catch (error) {
    console.error("Fetch shares error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
