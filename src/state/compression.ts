import { gunzipSync, gzipSync } from "zlib";

const GZIP_MAGIC_FIRST_BYTE = 0x1f;
const GZIP_MAGIC_SECOND_BYTE = 0x8b;

export function compressState(data: string): Buffer {
  return gzipSync(Buffer.from(data, "utf-8"));
}

export function decompressState(compressed: Buffer): string {
  return gunzipSync(compressed).toString("utf-8");
}

export function isGzipBuffer(buffer: Buffer): boolean {
  if (buffer.length < 2) {
    return false;
  }

  return buffer[0] === GZIP_MAGIC_FIRST_BYTE && buffer[1] === GZIP_MAGIC_SECOND_BYTE;
}
