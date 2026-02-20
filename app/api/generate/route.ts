import Replicate from "replicate";

export const runtime = "nodejs";

// Convert uploaded File -> data URL (Replicate accepts data URLs for many models)
async function fileToDataUrl(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mime = file.type || "image/png";
  return `data:${mime};base64,${base64}`;
}

export async function POST(req: Request) {
  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return Response.json(
        { error: "Missing REPLICATE_API_TOKEN" },
        { status: 500 }
      );
    }

    // Return URL outputs, not file/streams
    const replicate = new Replicate({ auth: token, useFileOutput: false });

    // ✅ Correct model slug (no version needed)
    const MODEL = "google/nano-banana-pro";

    const form = await req.formData();
    const prompt = String(form.get("prompt") || "").trim();
    if (!prompt) {
      return Response.json({ error: "prompt is required" }, { status: 400 });
    }

    // Optional image+mask for edit/inpaint
    const image = form.get("image") as File | null;
    const mask = form.get("mask") as File | null;

    // ✅ Keep inputs minimal to avoid schema mismatch issues
    // (Different models reject unknown fields.)
    const input: Record<string, any> = { prompt };

    // Inpainting/edit: must send BOTH
    if (image || mask) {
      if (!image || !mask) {
        return Response.json(
          { error: "To edit/inpaint, provide BOTH image and mask" },
          { status: 400 }
        );
      }

      input.image = await fileToDataUrl(image);
      input.mask = await fileToDataUrl(mask);
    }

    // Run model
    const output = await replicate.run(MODEL as any, { input });

    // ---- Robust output parsing ----
    let imageUrl: string | null = null;

    if (typeof output === "string") {
      imageUrl = output;
    } else if (Array.isArray(output)) {
      // Most Replicate image models return an array of URLs
      const first = output[0];
      if (typeof first === "string") imageUrl = first;
      // Some return objects with url/href
      else if (first && typeof first === "object") {
        const anyFirst = first as any;
        imageUrl =
          (typeof anyFirst.url === "string" && anyFirst.url) ||
          (typeof anyFirst.href === "string" && anyFirst.href) ||
          null;
      }
    } else if (output && typeof output === "object") {
      const anyOut = output as any;
      imageUrl =
        (typeof anyOut.url === "string" && anyOut.url) ||
        (typeof anyOut.href === "string" && anyOut.href) ||
        (typeof anyOut.output === "string" && anyOut.output) ||
        null;
    }

    if (!imageUrl) {
      return Response.json(
        {
          error: "Unexpected output (after parsing)",
          outputType: typeof output,
          outputPreview: Array.isArray(output) ? output.slice(0, 2) : output,
        },
        { status: 500 }
      );
    }

    return Response.json({ imageUrl });
  } catch (err: any) {
    return Response.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
