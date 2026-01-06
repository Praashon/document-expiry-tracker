import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(_request: NextRequest) {
  // Middleware can't reliably check Appwrite sessions because:
  // 1. Appwrite client SDK stores sessions in localStorage (client-side only)
  // 2. Middleware runs on the server and can't access localStorage
  // 3. Cookie-based checks are unreliable and can cause redirect loops
  //
  // Instead, let each page handle its own authentication:
  // - Dashboard pages check auth via useEffect and redirect to /login if not authenticated
  // - Login/Register pages check auth via useEffect and redirect to /dashboard if authenticated

  // Just allow all requests to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|assets).*)",
  ],
};
