import test from "node:test";
import assert from "node:assert/strict";
import { completeManagerLogin } from "../lib/manager-auth";
test("expired or replayed magic links never reach membership checks", async () => {
  let checked = false;
  assert.equal(
    await completeManagerLogin({
      verify: async () => false,
      authorized: async () => {
        checked = true;
        return true;
      },
      signout: async () => {},
    }),
    "expired",
  );
  assert.equal(checked, false);
});
test("manager login requires fresh tenant authorization after email verification", async () => {
  let signedOut = false;
  assert.equal(
    await completeManagerLogin({
      verify: async () => true,
      authorized: async () => true,
      signout: async () => {
        signedOut = true;
      },
    }),
    "ok",
  );
  assert.equal(signedOut, false);
  assert.equal(
    await completeManagerLogin({
      verify: async () => true,
      authorized: async () => false,
      signout: async () => {
        signedOut = true;
      },
    }),
    "access",
  );
  assert.equal(signedOut, true);
});
test("membership lookup failures discard the new session", async () => {
  let signedOut = false;
  assert.equal(
    await completeManagerLogin({
      verify: async () => true,
      authorized: async () => {
        throw new Error("Unavailable");
      },
      signout: async () => {
        signedOut = true;
      },
    }),
    "access",
  );
  assert.equal(signedOut, true);
});
