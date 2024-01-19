import { NextRequest, NextResponse } from 'next/server';

export const middleware = (request: NextRequest) => {
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
};
