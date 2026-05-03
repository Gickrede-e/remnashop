import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readRepoFile(filePath: string) {
  return readFileSync(path.join(process.cwd(), filePath), "utf8");
}

function extractServiceBlock(content: string, serviceName: string) {
  const match = content.match(
    new RegExp(`\\n  ${serviceName}:\\n([\\s\\S]*?)(?=\\n  [a-zA-Z0-9_-]+:|\\nvolumes:|\\nnetworks:|\\nsecrets:|$)`)
  );

  return match?.[1] ?? "";
}

describe("SMTP compose manifests", () => {
  for (const fileName of ["docker-compose.yml", "docker-compose.hub.yml"]) {
    it(`defines an internal smtp service in ${fileName}`, () => {
      const content = readRepoFile(fileName);
      const smtpBlock = extractServiceBlock(content, "smtp");
      const appBlock = extractServiceBlock(content, "app");

      expect(smtpBlock).toContain("image: foxcpp/maddy:0.8.1");
      expect(smtpBlock).toContain('MAIL_DOMAIN:?MAIL_DOMAIN is required');
      expect(smtpBlock).toContain("exec /bin/maddy run");
      expect(smtpBlock).toContain("tls off");
      expect(smtpBlock).toContain("- mail_internal");
      expect(smtpBlock).not.toContain("ports:");
      expect(smtpBlock).not.toContain("/config/entrypoint.sh");
      expect(appBlock).toContain("smtp:");
      expect(appBlock).toContain("- mail_internal");
      expect(content).toContain("smtp_data:");
      expect(content).toContain("mail_internal:");
    });
  }
});
