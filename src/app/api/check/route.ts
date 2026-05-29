import { NextRequest, NextResponse } from "next/server";
import { checkInstagramAccount } from "@/lib/instagram";

export type { CheckResult } from "@/lib/instagram";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usernames } = body as { usernames?: unknown };

    if (!Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json(
        { error: "Please provide an array of usernames" },
        { status: 400 }
      );
    }

    const limited = (usernames as string[])
      .slice(0, 50)
      .map((u) => u.trim().toLowerCase())
      .filter((u) => u.length > 0);

    const results = [];
    const batchSize = 2;

    for (let i = 0; i < limited.length; i += batchSize) {
      const batch = limited.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((u) => checkInstagramAccount(u))
      );
      results.push(...batchResults);

      if (i + batchSize < limited.length) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
