import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the login session fresh and sends logged-out visitors to /login.
export async function middleware(request: NextRequest) {
  // Sign-in pages manage the session themselves; touching it here could put the old one back.
  if (request.nextUrl.pathname.startsWith("/auth")) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // If Supabase sends a sign-in back to the wrong page (e.g. the homepage),
  // forward it to the callback so the sign-in still finishes.
  const q = request.nextUrl.searchParams;
  if (!path.startsWith("/auth") && (q.has("code") || q.has("error_description"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  const isPublic =
    path === "/login" ||
    path === "/privacy" ||
    path === "/terms" ||
    path === "/contact" ||
    path.startsWith("/auth") ||
    path.startsWith("/api/stripe/webhook") ||
    path.startsWith("/email/"); // email designs and their images, loaded by Mailchimp and inboxes

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)$).*)"],
};
