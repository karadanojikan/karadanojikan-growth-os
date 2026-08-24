const PUBLIC_EXACT_PATHS = [
  "/login",
  "/setup",
  "/api/instagram/callback",
  "/api/instagram/webhook",
  "/api/internal/instagram-publish",
] as const;
const PUBLIC_PREFIX_PATHS = ["/auth/callback"] as const;

export function isPublicPath(pathname: string) {
  return PUBLIC_EXACT_PATHS.includes(pathname as (typeof PUBLIC_EXACT_PATHS)[number])
    || PUBLIC_PREFIX_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
