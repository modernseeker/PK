import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const client = path.join(dist, 'client');
const server = path.join(dist, 'server');
const rootExtensions = new Set(['.css', '.html', '.js', '.json', '.txt', '.webmanifest', '.xml']);

await rm(dist, { recursive: true, force: true });
await mkdir(client, { recursive: true });
await mkdir(server, { recursive: true });

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && rootExtensions.has(path.extname(entry.name))) {
    await cp(path.join(root, entry.name), path.join(client, entry.name));
  }
}

for (const directory of ['admin', 'assets', 'data']) {
  await cp(path.join(root, directory), path.join(client, directory), { recursive: true });
}

await writeFile(path.join(server, 'index.js'), `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/') url.pathname = '/index.html';
    return env.ASSETS.fetch(new Request(url, request));
  }
};
`);

console.log('YK Electric storefront build completed.');