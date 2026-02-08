import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.endsWith('/pdf.worker.js') || pathname.endsWith('/pdf.worker.min.js')) {
    const url = request.nextUrl.clone();
    url.pathname = '/api/pdf-worker';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api).*)'],
};
