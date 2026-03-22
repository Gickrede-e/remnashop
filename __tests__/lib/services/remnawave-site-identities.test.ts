import { describe, expect, it } from "vitest";

import {
  buildFallbackProjectUsername,
  buildPrimaryProjectUsername,
  isProjectManagedRemnawaveUsername,
  resolveRemnawaveIdentityLookup,
  selectSafeAttachCandidate
} from "@/lib/services/remnawave-site-identities";

describe("remnawave site identities", () => {
  it("builds the primary gs username from the email local-part", () => {
    expect(buildPrimaryProjectUsername("Alice.Test+promo@example.com")).toBe("gs_alice_test_promo");
  });

  it("preserves the deterministic suffix while keeping the fallback inside 36 chars", () => {
    const username = buildFallbackProjectUsername(
      "very.long.email.alias.with.many.parts@example.com",
      "cm8abc123xyz987654"
    );

    expect(username).toBe("gs_very_long_email_alias__3xyz987654");
    expect(username.length).toBeLessThanOrEqual(36);
  });

  it("treats only gs-prefixed usernames as project managed", () => {
    expect(isProjectManagedRemnawaveUsername("gs_alice")).toBe(true);
    expect(isProjectManagedRemnawaveUsername("alice-other-project")).toBe(false);
  });

  it("rejects username hits when the remote email does not match", () => {
    const candidate = selectSafeAttachCandidate({
      localEmail: "alice@b.com",
      usernameHit: { uuid: "rw-1", username: "gs_alice", email: "alice@a.com" },
      emailHits: [],
      linkedRemoteUuids: new Set()
    });

    expect(candidate).toBeNull();
  });

  it("rejects remote uuids already linked to another local user", () => {
    const candidate = selectSafeAttachCandidate({
      localEmail: "alice@example.com",
      usernameHit: { uuid: "rw-1", username: "gs_alice", email: "alice@example.com" },
      emailHits: [],
      linkedRemoteUuids: new Set(["rw-1"])
    });

    expect(candidate).toBeNull();
  });

  it("attaches a gs username hit when email matches and uuid is free", () => {
    const decision = resolveRemnawaveIdentityLookup({
      userId: "user_1234567890",
      localEmail: "alice@example.com",
      usernameHit: { uuid: "rw-1", username: "gs_alice", email: "alice@example.com" },
      emailHits: [],
      linkedRemoteUuids: new Set()
    });

    expect(decision).toEqual({
      action: "attach",
      remoteUser: { uuid: "rw-1", username: "gs_alice", email: "alice@example.com" }
    });
  });

  it("uses a single gs email match when username lookup misses", () => {
    const decision = resolveRemnawaveIdentityLookup({
      userId: "user_1234567890",
      localEmail: "alice@example.com",
      usernameHit: null,
      emailHits: [{ uuid: "rw-2", username: "gs_alice", email: "alice@example.com" }],
      linkedRemoteUuids: new Set()
    });

    expect(decision).toEqual({
      action: "attach",
      remoteUser: { uuid: "rw-2", username: "gs_alice", email: "alice@example.com" }
    });
  });

  it("rejects ambiguous gs email matches", () => {
    const decision = resolveRemnawaveIdentityLookup({
      userId: "user_1234567890",
      localEmail: "alice@example.com",
      usernameHit: null,
      emailHits: [
        { uuid: "rw-1", username: "gs_alice", email: "alice@example.com" },
        { uuid: "rw-2", username: "gs_alice_alt", email: "alice@example.com" }
      ],
      linkedRemoteUuids: new Set()
    });

    expect(decision).toEqual({
      action: "skip",
      reason: "conflicting-remote-email-match"
    });
  });

  it("rejects email matches that belong only to non-project usernames", () => {
    const decision = resolveRemnawaveIdentityLookup({
      userId: "user_1234567890",
      localEmail: "alice@example.com",
      usernameHit: null,
      emailHits: [{ uuid: "rw-3", username: "alice-external", email: "alice@example.com" }],
      linkedRemoteUuids: new Set()
    });

    expect(decision).toEqual({
      action: "skip",
      reason: "conflicting-remote-email-match"
    });
  });

  it("creates the primary gs username when no remote matches exist", () => {
    const decision = resolveRemnawaveIdentityLookup({
      userId: "user_1234567890",
      localEmail: "alice@example.com",
      usernameHit: null,
      emailHits: [],
      linkedRemoteUuids: new Set()
    });

    expect(decision).toEqual({
      action: "create",
      username: buildPrimaryProjectUsername("alice@example.com")
    });
  });

  it("creates the fallback gs username when the primary username is already taken", () => {
    const decision = resolveRemnawaveIdentityLookup({
      userId: "user_1234567890",
      localEmail: "alice@example.com",
      usernameHit: { uuid: "rw-9", username: "gs_alice", email: "other@example.com" },
      emailHits: [],
      linkedRemoteUuids: new Set()
    });

    expect(decision).toEqual({
      action: "create",
      username: buildFallbackProjectUsername("alice@example.com", "user_1234567890")
    });
  });
});
