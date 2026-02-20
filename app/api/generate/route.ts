import Replicate from "replicate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return Response.json({ error: "Missing REPLICATE_API_TOKEN" }, { status: 500 });
    }

    const replicate = new Replicate({ auth: token, useFileOutput: false });
    const MODEL = "google/nano-banana-pro";

    const form = await req.formData();
    const prompt = String(form.get("prompt") || "").trim();
    if (!prompt) return Response.json({ error: "prompt is required" }, { status: 400 });

    // Now we expect URLs (strings), not Files
    const imageUrl = String(form.get("imageUrl") || "").trim();
    const maskUrl = String(form.get("maskUrl") || "").trim();

    const input: Record<string, any> = { prompt };
    if (imageUrl || maskUrl) {
      if (!imageUrl || !maskUrl) {
        return Response.json(
          { error: "To edit/inpaint, provide BOTH imageUrl and maskUrl" },
          { status: 400 }
        );
      }
      input.image = imageUrl;
      input.mask = maskUrl;
    }

    const output = await replicate.run(MODEL as any, { input });
    let outUrl: string | null = null;

    if (typeof output === "string") outUrl = output;
    else if (Array.isArray(output)) {
      const first = output[0];
      if (typeof first === "string") outUrl = first;
      else if (first && typeof first === "object") {
        const anyFirst = first as any;
        outUrl = (typeof anyFirst.url === "string" && anyFirst.url) || null;
      }
    } else if (output && typeof output === "object") {
      const anyOut = output as any;
      outUrl =
        (typeof anyOut.url === "string" && anyOut.url) ||
        (typeof anyOut.href === "string" && anyOut.href) ||
        null;
    }

    if (!outUrl) {
      return Response.json(
        { error: "Unexpected output", outputPreview: output },
        { status: 500 }
      );
    }

    return Response.json({ imageUrl: outUrl });
  } catch (err: any) {
    return Response.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
