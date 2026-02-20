import Replicate from "replicate";

export const runtime = "nodejs";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mime = file.type || "image/png";
      resolve(`data:${mime};base64,${base64}`);
    } catch (e) {
      reject(e);
    }
  });
}

export async function POST(req: Request) {
  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return Response.json({ error: "Missing REPLICATE_API_TOKEN" }, { status: 500 });

    // ✅ Important: return URL outputs, not File/stream objects
    const replicate = new Replicate({ auth: token, useFileOutput: false });

    const MODEL = "ideogram-ai/ideogram-v3-turbo";
    const VERSION =
      "f8a8eb2c75d7d86ec58e3b8309cee63acb437fbab2695bc5004acf64d2de61a7";

    const form = await req.formData();
    const prompt = String(form.get("prompt") || "").trim();
    if (!prompt) return Response.json({ error: "prompt is required" }, { status: 400 });

    const aspect_ratio = String(form.get("aspect_ratio") || "1:1");
    const magic_prompt_option = String(form.get("magic_prompt_option") || "Auto");

    const person = form.get("image") as File | null;
    const mask = form.get("mask") as File | null;

    const input: Record<string, any> = { prompt, aspect_ratio, magic_prompt_option };

    // Inpainting: only if you send BOTH image + mask
    if (person || mask) {
      if (!person || !mask) {
        return Response.json({ error: "To inpaint, provide BOTH image and mask" }, { status: 400 });
      }
      input.image = await fileToDataUrl(person);
      input.mask = await fileToDataUrl(mask);
    }

    const output = await replicate.run(`${MODEL}:${VERSION}` as any, { input });

    // Robust output parsing
    let imageUrl: string | null = null;

    if (typeof output === "string") {
      imageUrl = output;
    } else if (Array.isArray(output) && typeof output[0] === "string") {
      imageUrl = output[0];
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
    return Response.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
