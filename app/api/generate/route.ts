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

    const replicate = new Replicate({ auth: token });

    // Ideogram v3 Turbo version shown on Replicate (schema page)
    const MODEL_VERSION =
      "f8a8eb2c75d7d86ec58e3b8309cee63acb437fbab2695bc5004acf64d2de61a7"; // :contentReference[oaicite:1]{index=1}

    const form = await req.formData();

    const prompt = String(form.get("prompt") || "").trim();
    const aspect_ratio = String(form.get("aspect_ratio") || "1:1"); // default 1:1 :contentReference[oaicite:2]{index=2}
    const magic_prompt_option = String(form.get("magic_prompt_option") || "Auto"); // :contentReference[oaicite:3]{index=3}
    const style_type = String(form.get("style_type") || "").trim();

    if (!prompt) return Response.json({ error: "prompt is required" }, { status: 400 });

    const person = form.get("image") as File | null; // inpainting image :contentReference[oaicite:4]{index=4}
    const mask = form.get("mask") as File | null;   // black=inpaint, white=preserve :contentReference[oaicite:5]{index=5}

    const input: Record<string, any> = {
      prompt,
      aspect_ratio,
      magic_prompt_option,
    };

    // Optional: style_type + style_reference_images supported by schema :contentReference[oaicite:6]{index=6}
    if (style_type) input.style_type = style_type;

    // Inpainting mode: must provide BOTH image + mask :contentReference[oaicite:7]{index=7}
    if (person || mask) {
      if (!person || !mask) {
        return Response.json({ error: "To inpaint, provide BOTH image and mask" }, { status: 400 });
      }
      input.image = await fileToDataUrl(person);
      input.mask = await fileToDataUrl(mask);
    }

    const output = await replicate.run(MODEL_VERSION as any, { input });

    // Output schema is a single URI string :contentReference[oaicite:8]{index=8}
    const imageUrl = typeof output === "string" ? output : null;
    if (!imageUrl) return Response.json({ error: "Unexpected output", output }, { status: 500 });

    return Response.json({ imageUrl });
  } catch (err: any) {
    return Response.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
