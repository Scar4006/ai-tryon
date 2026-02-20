export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) return new Response("Missing url", { status: 400 });

  const upstream = await fetch(url);
  if (!upstream.ok) return new Response("Upstream fetch failed", { status: 502 });

  const contentType = upstream.headers.get("content-type") || "image/jpeg";
  const buf = await upstream.arrayBuffer();

  return new Response(buf, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=86400",
    },
  });
}
