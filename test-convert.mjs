import fs from "node:fs/promises";
import { run } from "./src/worker.js";

globalThis.postMessage = data => { if (data.type === "progress") process.stdout.write(`\r${data.percent}% ${data.message}`); };
const source = process.argv[2];
if (!source) throw new Error("usage: node test-convert.mjs backup.gz");
const input = await fs.readFile(source);
const { out, report } = await run(input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength), { storyMode:"both", keyMode:"full", stripStatus:true, includeForum:true });
await fs.writeFile("test-output.zip", new Uint8Array(out));
console.log("\n" + report.join("\n"));
