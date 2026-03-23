export type RemnawaveLookupUser = {
  uuid: string;
  username: string;
  email?: string | null;
};

type SelectSafeAttachCandidateInput = {
  localEmail: string;
  usernameHit: RemnawaveLookupUser | null;
  emailHits: RemnawaveLookupUser[];
  linkedRemoteUuids: ReadonlySet<string>;
};

type ResolveRemnawaveIdentityLookupInput = SelectSafeAttachCandidateInput & {
  userId: string;
};

export type RemnawaveIdentityLookupDecision =
  | {
      action: "attach";
      remoteUser: RemnawaveLookupUser;
    }
  | {
      action: "create";
      username: string;
    }
  | {
      action: "skip";
      reason: "conflicting-remote-email-match";
    };

const PROJECT_USERNAME_PREFIX = "gs_";
const REMNAWAVE_USERNAME_LIMIT = 36;
const FALLBACK_SUFFIX_LENGTH = 10;

function normalizeLocalPart(email: string) {
  const localPart = email.split("@")[0] ?? "";
  const normalized = localPart
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized.length > 0 ? normalized : "user";
}

function trimToLimit(value: string, limit: number) {
  return value.slice(0, Math.max(0, limit));
}

function buildUsername(localPart: string, suffix?: string) {
  if (suffix) {
    const maxLocalPartLength =
      REMNAWAVE_USERNAME_LIMIT - PROJECT_USERNAME_PREFIX.length - suffix.length - 1;
    const trimmedLocalPart = trimToLimit(localPart, maxLocalPartLength);
    return `${PROJECT_USERNAME_PREFIX}${trimmedLocalPart}_${suffix}`;
  }

  const maxLocalPartLength = REMNAWAVE_USERNAME_LIMIT - PROJECT_USERNAME_PREFIX.length;
  const trimmedLocalPart = trimToLimit(localPart, maxLocalPartLength);
  return `${PROJECT_USERNAME_PREFIX}${trimmedLocalPart}`;
}

function getDeterministicSuffix(userId: string) {
  return userId.slice(-FALLBACK_SUFFIX_LENGTH).toLowerCase();
}

function hasMatchingEmail(remote: RemnawaveLookupUser, localEmail: string) {
  return remote.email === localEmail;
}

export function buildPrimaryProjectUsername(email: string) {
  return buildUsername(normalizeLocalPart(email));
}

export function buildFallbackProjectUsername(email: string, userId: string) {
  return buildUsername(normalizeLocalPart(email), getDeterministicSuffix(userId));
}

export function isProjectManagedRemnawaveUsername(username: string) {
  return username.startsWith(PROJECT_USERNAME_PREFIX);
}

function isAttachableRemoteUser(
  remote: RemnawaveLookupUser,
  localEmail: string,
  linkedRemoteUuids: ReadonlySet<string>
) {
  return (
    isProjectManagedRemnawaveUsername(remote.username) &&
    hasMatchingEmail(remote, localEmail) &&
    !linkedRemoteUuids.has(remote.uuid)
  );
}

export function selectSafeAttachCandidate({
  localEmail,
  usernameHit,
  emailHits,
  linkedRemoteUuids
}: SelectSafeAttachCandidateInput) {
  if (
    usernameHit &&
    isAttachableRemoteUser(usernameHit, localEmail, linkedRemoteUuids)
  ) {
    return usernameHit;
  }

  const eligibleEmailHits = emailHits.filter((remote) =>
    isAttachableRemoteUser(remote, localEmail, linkedRemoteUuids)
  );

  if (eligibleEmailHits.length !== 1) {
    return null;
  }

  return eligibleEmailHits[0] ?? null;
}

export function resolveRemnawaveIdentityLookup({
  userId,
  localEmail,
  usernameHit,
  emailHits,
  linkedRemoteUuids
}: ResolveRemnawaveIdentityLookupInput): RemnawaveIdentityLookupDecision {
  const attachCandidate = selectSafeAttachCandidate({
    localEmail,
    usernameHit,
    emailHits,
    linkedRemoteUuids
  });

  if (attachCandidate) {
    return {
      action: "attach",
      remoteUser: attachCandidate
    };
  }

  if (emailHits.length > 0) {
    return {
      action: "skip",
      reason: "conflicting-remote-email-match"
    };
  }

  if (usernameHit) {
    return {
      action: "create",
      username: buildFallbackProjectUsername(localEmail, userId)
    };
  }

  return {
    action: "create",
    username: buildPrimaryProjectUsername(localEmail)
  };
}
