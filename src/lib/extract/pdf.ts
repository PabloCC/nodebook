import { extractText } from "unpdf";

export async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const { text } = await extractText(new Uint8Array(buffer), {
    mergePages: true,
  });
  const cleaned = text.trim();
  if (!cleaned) {
    throw new Error("No extractable text found in this PDF (is it scanned?)");
  }
  return cleaned;
}
