const PUBLIC_PATHS = ["/login", "/setup", "/auth/callback"] as const;

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
