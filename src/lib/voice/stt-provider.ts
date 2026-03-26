const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export function isSttConfigured(): boolean {
  return Boolean(OPENAI_API_KEY?.trim());
}

export async function transcribeAudioWithOpenAi(params: {
  bytes: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<string> {
  const { bytes, fileName, mimeType } = params;
  if (!OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const form = new FormData();
  const blob = new Blob([new Uint8Array(bytes)], { type: mimeType });
  form.append("file", blob, fileName);
  form.append("model", "whisper-1");
  form.append("response_format", "json");
  form.append("temperature", "0");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: form,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI STT error: ${res.status} ${txt}`);
  }

  const json = (await res.json()) as { text?: unknown };
  const transcript = typeof json.text === "string" ? json.text.trim() : "";
  if (!transcript) {
    throw new Error("OpenAI STT returned empty transcript");
  }
  return transcript;
}
