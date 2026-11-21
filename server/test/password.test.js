import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/utils/password.js";

test("verifyPassword: right password true, wrong password false (awaited, never a truthy promise)", async () => {
  const stored = hashPassword("open-sesame");
  assert.equal(await verifyPassword("open-sesame", stored), true);
  assert.equal(await verifyPassword("open-sesame!", stored), false);
  assert.equal(await verifyPassword("", stored), false);
  assert.equal(await verifyPassword("open-sesame", "garbage"), false);
  assert.equal(await verifyPassword("open-sesame", null), false);
});
