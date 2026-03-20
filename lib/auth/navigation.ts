export function sanitizeNextPath(nextPath?: string | null) {
  if (!nextPath) {
    return undefined;
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return undefined;
  }

  return nextPath;
}

export function buildLoginHref(nextPath?: string | null) {
  const safeNextPath = sanitizeNextPath(nextPath);
  if (!safeNextPath) {
    return "/login";
  }

  return `/login?next=${encodeURIComponent(safeNextPath)}`;
}

export function buildRegisterHref(nextPath?: string | null, referralCode?: string | null) {
  const params = new URLSearchParams();
  const safeNextPath = sanitizeNextPath(nextPath);

  if (safeNextPath) {
    params.set("next", safeNextPath);
  }

  if (referralCode) {
    params.set("ref", referralCode);
  }

  const query = params.toString();
  return query ? `/register?${query}` : "/register";
}
