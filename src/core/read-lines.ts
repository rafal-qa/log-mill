import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface, type Interface } from "node:readline";

export function readLines(filePath: string): Interface {
  const fileStream = createReadStream(filePath);
  const stream = filePath.endsWith(".gz")
    ? fileStream.pipe(createGunzip())
    : fileStream;

  return createInterface({ input: stream, crlfDelay: Infinity });
}
