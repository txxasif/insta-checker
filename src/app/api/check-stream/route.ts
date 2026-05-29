import { NextRequest } from "next/server";
import { checkInstagramAccount } from "@/lib/instagram";

// Re-export the runtime config so this route also runs in Node.js
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { usernames } = body as { usernames?: unknown };

  if (!Array.isArray(usernames) || usernames.length === 0) {
    return new Response(
      JSON.stringify({ error: "Please provide an array of usernames" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const limited = (usernames as string[])
    .map((u) => u.trim().toLowerCase())
    .filter((u) => u.length > 0);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Emit total count first so the client can show a progress bar
      controller.enqueue(
        encoder.encode(
          JSON.stringify({ type: "total", count: limited.length }) + "\n"
        )
      );

      const batchSize = 2;
      let completed = 0;

      for (let i = 0; i < limited.length; i += batchSize) {
        const batch = limited.slice(i, i + batchSize);

        // Run each batch in parallel, emit results as they come in
        await Promise.all(
          batch.map(async (username) => {
            const result = await checkInstagramAccount(username);
            completed++;
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "result",
                  result,
                  progress: { done: completed, total: limited.length },
                }) + "\n"
              )
            );
          })
        );

        // Small delay between batches to avoid rate-limiting
        if (i + batchSize < limited.length) {
          await new Promise((r) => setTimeout(r, 800));
        }
      }

      controller.enqueue(
        encoder.encode(JSON.stringify({ type: "done" }) + "\n")
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache, no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
