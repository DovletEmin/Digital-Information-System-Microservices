import { NextRequest } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const authHeader = request.headers.get('authorization');

  const upstream = await fetch(`${API_URL}/api/v1/books/${context.params.id}/download`, {
    headers: authHeader ? { Authorization: authHeader } : undefined,
  });

  if (!upstream.ok) {
    const message = await upstream.text();
    return new Response(message, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'text/plain',
      },
    });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');
  const contentDisposition = upstream.headers.get('content-disposition');

  if (contentType) headers.set('content-type', contentType);
  if (contentDisposition) headers.set('content-disposition', contentDisposition);

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
