// Remnawave identity for a local user: resolve / attach / create the panel
// account, apply access settings, and persist the link for activation + sync.

import { env } from "@/lib/env";
import { type DbClient, prisma } from "@/lib/prisma";
import { slugToRemnawaveTag } from "@/lib/utils";
import {
  createRemnawaveUser,
  getRemnawaveUser,
  getRemnawaveUserByUsername,
  isRemnawaveNotFoundError,
  isRemnawaveRecoverableIdentityError,
  listRemnawaveUsersByEmail,
  resetRemnawaveUserTraffic,
  updateRemnawaveUser
} from "@/lib/services/remnawave";
import {
  buildPrimaryProjectUsername,
  resolveRemnawaveIdentityLookup
} from "@/lib/services/remnawave-site-identities";

export type RemnawaveIdentitySeed = {
  expireAt: Date;
  trafficLimitBytes?: bigint;
  description: string;
  tag: string;
  activeInternalSquads: string[];
  externalSquadUuid: string | null;
  hwidDeviceLimit: number | null;
};

export type RemnawaveIdentityUser = {
  id: string;
  email: string;
  remnawaveUuid: string | null;
  remnawaveUsername: string | null;
  remnawaveShortUuid?: string | null;
};

export type RemnawaveIdentityResolutionOutcome =
  | "created"
  | "attached"
  | "alreadyLinked";

export type RemnawaveIdentityResolution = {
  uuid: string;
  username: string;
  shortUuid: string | null;
  outcome: RemnawaveIdentityResolutionOutcome;
  recovered: boolean;
};

export type LinkedRemnawaveUuidRegistry = {
  getLinkedRemoteUuids(userId: string): ReadonlySet<string>;
  reserve(uuid: string, userId: string): boolean;
};

export class RemnawaveIdentitySkipError extends Error {
  constructor(public reason: "conflicting-remote-email-match") {
    super(`Safe Remnawave identity lookup blocked: ${reason}`);
    this.name = "RemnawaveIdentitySkipError";
  }
}

export const FAR_FUTURE_REMNAWAVE_EXPIRY = new Date("2099-12-31T23:59:59.000Z");
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function hasValidRemnawaveUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function buildRemnawaveSubscriptionUrl(shortUuid: string | null | undefined) {
  if (!shortUuid) {
    return null;
  }

  return `${env.REMNAWAVE_BASE_URL.replace(/\/+$/, "")}/api/sub/${shortUuid}`;
}

export function resolveExternalSubscriptionUrl(input: {
  subscriptionUrl?: string | null;
  shortUuid?: string | null;
}, fallbackShortUuid?: string | null) {
  return input.subscriptionUrl ?? buildRemnawaveSubscriptionUrl(input.shortUuid ?? fallbackShortUuid);
}

export async function persistRemnawaveIdentity(userId: string, remote: {
  uuid: string;
  username: string;
  shortUuid?: string | null;
}, db: DbClient = prisma) {
  await db.user.update({
    where: { id: userId },
    data: {
      remnawaveUuid: remote.uuid,
      remnawaveUsername: remote.username,
      remnawaveShortUuid: remote.shortUuid ?? null
    }
  });
}

async function getLinkedRemnawaveUuids(userId: string, db: DbClient) {
  const linkedUsers = await db.user.findMany({
    where: {
      id: { not: userId },
      remnawaveUuid: { not: null }
    },
    select: {
      remnawaveUuid: true
    }
  });

  return new Set(
    linkedUsers
      .map((linkedUser) => linkedUser.remnawaveUuid)
      .filter((uuid): uuid is string => Boolean(uuid))
  );
}

async function getOptionalRemnawaveUserByUsername(username: string) {
  try {
    return await getRemnawaveUserByUsername(username);
  } catch (error) {
    if (isRemnawaveNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

function toRemnawaveSettings(seed: RemnawaveIdentitySeed) {
  return {
    ...seed,
    expireAt: seed.expireAt.toISOString(),
    trafficLimitBytes: Number(seed.trafficLimitBytes ?? BigInt(0)),
    status: "ACTIVE"
  };
}

async function attachOrCreateRemnawaveIdentity(
  user: RemnawaveIdentityUser,
  seed: RemnawaveIdentitySeed,
  options?: {
    recovered?: boolean;
    linkedUuidRegistry?: LinkedRemnawaveUuidRegistry;
    db?: DbClient;
  }
): Promise<RemnawaveIdentityResolution> {
  const primaryUsername = buildPrimaryProjectUsername(user.email);
  const [usernameHit, emailHits] = await Promise.all([
    getOptionalRemnawaveUserByUsername(primaryUsername),
    listRemnawaveUsersByEmail(user.email)
  ]);
  const linkedRemoteUuids = options?.linkedUuidRegistry
    ? options.linkedUuidRegistry.getLinkedRemoteUuids(user.id)
    : await getLinkedRemnawaveUuids(user.id, options?.db ?? prisma);

  const decision = resolveRemnawaveIdentityLookup({
    userId: user.id,
    localEmail: user.email,
    usernameHit: usernameHit
      ? {
          uuid: usernameHit.uuid,
          username: usernameHit.username,
          email: usernameHit.email
        }
      : null,
    emailHits: emailHits.map((remote) => ({
      uuid: remote.uuid,
      username: remote.username,
      email: remote.email
    })),
    linkedRemoteUuids
  });

  if (decision.action === "skip") {
    throw new RemnawaveIdentitySkipError(decision.reason);
  }

  if (decision.action === "attach") {
    if (
      options?.linkedUuidRegistry &&
      !options.linkedUuidRegistry.reserve(decision.remoteUser.uuid, user.id)
    ) {
      throw new RemnawaveIdentitySkipError("conflicting-remote-email-match");
    }

    await persistRemnawaveIdentity(user.id, decision.remoteUser, options?.db);

    return {
      uuid: decision.remoteUser.uuid,
      username: decision.remoteUser.username,
      shortUuid: null,
      outcome: "attached",
      recovered: options?.recovered ?? false
    };
  }

  const created = await createRemnawaveUser({
    ...toRemnawaveSettings(seed),
    username: decision.username,
    trafficLimitStrategy: "NO_RESET",
    email: user.email
  });

  options?.linkedUuidRegistry?.reserve(created.uuid, user.id);
  await persistRemnawaveIdentity(user.id, created, options?.db);

  return {
    uuid: created.uuid,
    username: created.username,
    shortUuid: created.shortUuid ?? null,
    outcome: "created",
    recovered: options?.recovered ?? false
  };
}

export async function ensureRemnawaveIdentity(
  user: RemnawaveIdentityUser,
  seed: RemnawaveIdentitySeed,
  options?: {
    linkedUuidRegistry?: LinkedRemnawaveUuidRegistry;
    db?: DbClient;
  }
): Promise<RemnawaveIdentityResolution> {
  const storedUuid = user.remnawaveUuid;
  if (hasValidRemnawaveUuid(storedUuid)) {
    try {
      const snapshot = await getRemnawaveUser(storedUuid);

      await persistRemnawaveIdentity(user.id, snapshot, options?.db);

      return {
        uuid: snapshot.uuid,
        username: snapshot.username,
        shortUuid: snapshot.shortUuid ?? null,
        outcome: "alreadyLinked",
        recovered: false
      };
    } catch (error) {
      if (!isRemnawaveRecoverableIdentityError(error)) {
        throw error;
      }
    }
  }

  return attachOrCreateRemnawaveIdentity(user, seed, {
    recovered: Boolean(user.remnawaveUuid),
    linkedUuidRegistry: options?.linkedUuidRegistry,
    db: options?.db
  });
}

export function buildSyncRecoverySeed(user: {
  subscription: {
    expiresAt: Date | null;
    trafficLimitBytes: bigint | null;
    plan: {
      name: string;
      slug: string;
      remnawaveInternalSquadUuids: string[];
      remnawaveExternalSquadUuid: string | null;
      remnawaveHwidDeviceLimit: number | null;
    } | null;
  } | null;
}): RemnawaveIdentitySeed | null {
  if (!user.subscription?.plan) {
    return null;
  }

  return {
    expireAt: user.subscription.expiresAt ?? FAR_FUTURE_REMNAWAVE_EXPIRY,
    trafficLimitBytes: user.subscription.trafficLimitBytes ?? BigInt(0),
    description: `Sync recovery: ${user.subscription.plan.name}`,
    tag: slugToRemnawaveTag(user.subscription.plan.slug),
    activeInternalSquads: user.subscription.plan.remnawaveInternalSquadUuids,
    externalSquadUuid: user.subscription.plan.remnawaveExternalSquadUuid,
    hwidDeviceLimit: user.subscription.plan.remnawaveHwidDeviceLimit
  };
}

// The caller owns the transaction, lock and entitlement. Errors propagate so
// each caller keeps its own retry/skip policy and commits the link with its work.
export async function provisionRemnawaveIdentity(
  user: RemnawaveIdentityUser,
  seed: RemnawaveIdentitySeed,
  options: {
    db: DbClient;
    resetTraffic: boolean;
    linkedUuidRegistry?: LinkedRemnawaveUuidRegistry;
  }
) {
  const identity = await ensureRemnawaveIdentity(user, seed, options);
  if (options.resetTraffic && identity.outcome !== "created") {
    // Remnawave has no operation key for reset: a retry after an ambiguous
    // network/commit failure may reset again. Payment expiry/bonuses stay fixed.
    await resetRemnawaveUserTraffic(identity.uuid);
  }
  const snapshot = await updateRemnawaveUser(identity.uuid, toRemnawaveSettings(seed));
  await persistRemnawaveIdentity(user.id, snapshot, options.db);
  return { outcome: identity.outcome, recovered: identity.recovered };
}

export async function getUserWithSubscription(userId: string, db: DbClient = prisma) {
  return db.user.findUnique({
    where: { id: userId },
    // Never surface the password hash: this row is serialized into the admin
    // user-sync API response.
    omit: { passwordHash: true },
    include: {
      subscription: {
        include: {
          plan: true
        }
      }
    }
  });
}

export async function loadLinkedRemnawaveUuidRegistry(): Promise<LinkedRemnawaveUuidRegistry> {
  const linkedUsers = await prisma.user.findMany({
    where: {
      remnawaveUuid: { not: null }
    },
    select: {
      id: true,
      remnawaveUuid: true
    }
  });
  const linkedByUuid = new Map<string, string>();

  for (const linkedUser of linkedUsers) {
    if (linkedUser.remnawaveUuid) {
      linkedByUuid.set(linkedUser.remnawaveUuid, linkedUser.id);
    }
  }

  return {
    getLinkedRemoteUuids(userId: string) {
      return new Set(
        Array.from(linkedByUuid.entries())
          .filter(([, linkedUserId]) => linkedUserId !== userId)
          .map(([uuid]) => uuid)
      );
    },
    reserve(uuid: string, userId: string) {
      const linkedUserId = linkedByUuid.get(uuid);
      if (linkedUserId && linkedUserId !== userId) {
        return false;
      }

      linkedByUuid.set(uuid, userId);
      return true;
    }
  };
}
