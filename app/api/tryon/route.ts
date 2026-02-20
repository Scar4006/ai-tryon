import Replicate from "replicate";

export const runtime = "nodejs";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mime = file.type || "image/jpeg";
      resolve(`data:${mime};base64,${base64}`);
    } catch (e) {
      reject(e);
    }
  });
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: Request) {
  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return Response.json({ error: "Missing REPLICATE_API_TOKEN" }, { status: 500 });
    }

    const form = await req.formData();
    const person = form.get("person") as File | null;
    const top = form.get("top") as File | null;
    const bottom = form.get("bottom") as File | null;

    if (!person || !top) {
      return Response.json({ error: "Required: person + top image" }, { status: 400 });
    }

    const personUrl = await fileToDataUrl(person);
    const topUrl = await fileToDataUrl(top);
    const bottomUrl = bottom ? await fileToDataUrl(bottom) : null;

    const replicate = new Replicate({ auth: token });

    /**
     * IMPORTANT:
     * Pick a Replicate model from https://replicate.com/explore
     * Then open its page and copy the "Version" id from the API example.
     *
     * Below is a placeholder.
     * Replace MODEL_VERSION with the exact version string from your chosen model.
     */
    const MODEL_VERSION = "REPLACE_WITH_MODEL_VERSION_ID";

    // Input keys MUST match the model’s schema.
    // Replace these field names according to the model page.
    const input: Record<string, any> = {
      person_image: personUrl,
      garment_image: topUrl,
    };
    if (bottomUrl) input.garment_image_2 = bottomUrl;

    const prediction = await replicate.predictions.create({
      version: MODEL_VERSION,
      input,
    });

    let cur = prediction;
    for (let i = 0; i < 80; i++) {
      if (cur.status === "succeeded") break;
      if (cur.status === "failed" || cur.status === "canceled") break;
      await sleep(1500);
      cur = await replicate.predictions.get(cur.id);
    }

    if (cur.status !== "succeeded") {
      return Response.json(
        { error: "Generation failed", status: cur.status, logs: cur.logs ?? null },
        { status: 500 }
      );
    }

    const output = cur.output;
    const outUrl =
      typeof output === "string"
        ? output
        : Array.isArray(output) && typeof output[0] === "string"
          ? output[0]
          : null;

    if (!outUrl) {
      return Response.json({ error: "Unexpected output format", output }, { status: 500 });
    }

    return Response.json({ imageUrl: outUrl });
  } catch (err: any) {
    return Response.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
