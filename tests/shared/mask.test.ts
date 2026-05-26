import { describe, expect, it } from "vitest";

import { maskSecret } from "../../src/shared/mask.js";

describe("maskSecret", () => {
  it("returns undefined when no secret is configured", () => {
    expect(maskSecret(undefined)).toBeUndefined();
  });
});
