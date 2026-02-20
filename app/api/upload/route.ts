import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const kind = String(form.get("kind") || "file");

    if (!file) {
      return Response.json({ error: "file is required" }, { status: 400 });
    }

    const ext =
      file.name.split(".").pop()?.toLowerCase() ||
      (file.type.includes("png") ? "png" : "jpg");

    const filename = `${kind}-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.${ext}`;

    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type || "application/octet-stream",
    });

    return Response.json({ url: blob.url });
  } catch (err: any) {
    return Response.json(
      { error: err?.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}
