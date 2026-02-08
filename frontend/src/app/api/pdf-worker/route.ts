import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WORKER_CANDIDATES = [
  path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'),
  path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.js'),
];

export async function GET() {
  for (const candidate of WORKER_CANDIDATES) {
    try {
      const data = await fs.readFile(candidate);
      return new Response(data, {
        status: 200,
        headers: {
          'content-type': 'text/javascript',
          'cache-control': 'public, max-age=31536000, immutable',
        },
      });
    } catch {
      // Try next candidate
    }
  }

  return new Response('PDF worker not found', { status: 404 });
}
