export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return new Response("Missing url", { status: 400 });
    }
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return new Response("Upstream fetch failed", { status: 502 });
    }

    const contentType =
      upstream.headers.get("content-type") || "image/jpeg";

    const contentLength = upstream.headers.get("content-length");

    // ✅ STREAM response (no memory blowup)
    return new Response(upstream.body, {
      headers: {
        "content-type": contentType,
        ...(contentLength && { "content-length": contentLength }),

        // caching
        "cache-control": "public, max-age=86400, immutable",

        // allow browser usage
        "access-control-allow-origin": "*",
      },
    });
  } catch (err) {
    return new Response("Proxy error", { status: 500 });
  }
}
