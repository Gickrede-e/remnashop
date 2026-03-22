import { describe, expect, it } from "vitest";

import {
  buildFallbackProjectUsername,
  buildPrimaryProjectUsername,
  isProjectManagedRemnawaveUsername,
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
});
