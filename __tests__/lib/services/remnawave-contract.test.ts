import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

type OpenApiSpec = {
  paths: Record<string, Record<string, { requestBody?: { content?: { "application/json"?: { schema?: { $ref?: string } } } } }>>;
  components: {
    schemas: Record<string, { properties?: Record<string, unknown> }>;
  };
};

function readSpec(): OpenApiSpec {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "remnawave_api.json"), "utf8")
  ) as OpenApiSpec;
}

describe("remnawave OpenAPI contract", () => {
  it("contains every user and device endpoint used by the integration", () => {
    const spec = readSpec();

    expect(spec.paths["/api/users"]?.post).toBeDefined();
    expect(spec.paths["/api/users"]?.patch).toBeDefined();
    expect(spec.paths["/api/users/{uuid}"]?.get).toBeDefined();
    expect(spec.paths["/api/users/by-username/{username}"]?.get).toBeDefined();
    expect(spec.paths["/api/users/by-email/{email}"]?.get).toBeDefined();
    expect(spec.paths["/api/users/{uuid}/actions/revoke"]?.post).toBeDefined();
    expect(spec.paths["/api/users/{uuid}/actions/disable"]?.post).toBeDefined();
    expect(spec.paths["/api/users/{uuid}/actions/enable"]?.post).toBeDefined();
    expect(spec.paths["/api/users/{uuid}/actions/reset-traffic"]?.post).toBeDefined();
    expect(spec.paths["/api/hwid/devices/{userUuid}"]?.get).toBeDefined();
    expect(spec.paths["/api/hwid/devices/delete"]?.post).toBeDefined();
    expect(spec.paths["/api/hwid/devices/delete-all"]?.post).toBeDefined();
    expect(spec.paths["/api/subscriptions/by-short-uuid/{shortUuid}"]?.get).toBeDefined();
    expect(spec.paths["/api/sub/{shortUuid}"]?.get).toBeDefined();
  });

  it("still documents every request body field sent by create/update user calls", () => {
    const spec = readSpec();
    const createUserProperties = spec.components.schemas.CreateUserRequestDto?.properties ?? {};
    const updateUserProperties = spec.components.schemas.UpdateUserRequestDto?.properties ?? {};

    for (const key of [
      "username",
      "expireAt",
      "status",
      "trafficLimitBytes",
      "trafficLimitStrategy",
      "description",
      "email",
      "tag",
      "activeInternalSquads",
      "externalSquadUuid",
      "hwidDeviceLimit"
    ]) {
      expect(createUserProperties[key]).toBeDefined();
    }

    for (const key of [
      "uuid",
      "expireAt",
      "status",
      "trafficLimitBytes",
      "description",
      "tag",
      "activeInternalSquads",
      "externalSquadUuid",
      "hwidDeviceLimit"
    ]) {
      expect(updateUserProperties[key]).toBeDefined();
    }
  });
});
