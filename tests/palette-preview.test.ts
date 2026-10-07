import { test } from "node:test";
import assert from "node:assert/strict";
import { isPalettePreviewEnabled } from "../lib/palette-preview";

test("palette overlay is restricted to development and staging/preview", () => {
  assert.equal(isPalettePreviewEnabled({ NODE_ENV: "development" }), true);
  assert.equal(
    isPalettePreviewEnabled({ NODE_ENV: "production", VERCEL_ENV: "preview" }),
    true,
  );
  assert.equal(
    isPalettePreviewEnabled({ NODE_ENV: "production", VIEWFLO_ENV: "staging" }),
    true,
  );
  assert.equal(isPalettePreviewEnabled({ NODE_ENV: "production" }), false);
  assert.equal(
    isPalettePreviewEnabled({
      VERCEL_ENV: "production",
      VIEWFLO_ENV: "staging",
    }),
    false,
  );
  assert.equal(
    isPalettePreviewEnabled({
      VIEWFLO_ENV: "production",
      NODE_ENV: "development",
    }),
    false,
  );
});
