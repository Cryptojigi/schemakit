import archiver from "archiver";
import { Writable } from "stream";

export interface FileContent {
  name: string;
  content: string;
}

export async function createZipStream(files: FileContent[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    
    const stream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
        callback();
      }
    });

    stream.on("finish", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    archive.on("error", reject);

    archive.pipe(stream);

    for (const file of files) {
      archive.append(file.content, { name: file.name });
    }

    archive.finalize();
  });
}
