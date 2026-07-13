import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth(function proxy(req) {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isLoginPage = nextUrl.pathname === "/login"
  const isApiAuth = nextUrl.pathname.startsWith("/api/auth")

  // Allow auth API routes
  if (isApiAuth) return NextResponse.next()

  // Redirect to login if not authenticated
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  // Redirect to dashboard if already logged in and on login page
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
