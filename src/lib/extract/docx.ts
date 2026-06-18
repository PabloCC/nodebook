import mammoth from "mammoth";

export async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
  const cleaned = value.trim();
  if (!cleaned) {
    throw new Error("No extractable text found in this document");
  }
  return cleaned;
}
