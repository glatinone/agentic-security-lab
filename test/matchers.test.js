import test from "node:test";
import assert from "node:assert/strict";
import { findSecretKinds, getTenantFromResource, globMatches } from "../src/matchers.js";

test("single star does not cross resource segments", () => {
  assert.equal(globMatches("repository://glatinone/*", "repository://glatinone/README.md"), true);
  assert.equal(globMatches("repository://glatinone/*", "repository://glatinone/src/app.js"), false);
});

test("double star crosses resource segments", () => {
  assert.equal(globMatches("repository://glatinone/**", "repository://glatinone/src/app.js"), true);
});

test("regex characters in a policy pattern are treated literally", () => {
  assert.equal(globMatches("record://team/a+b.json", "record://team/a+b.json"), true);
  assert.equal(globMatches("record://team/a+b.json", "record://team/abXjson"), false);
});

test("unsupported matcher values fail closed", () => {
  assert.equal(globMatches(null, "resource"), false);
  assert.equal(globMatches("*", null), false);
});

test("secret scanner reports kinds without returning secret values", () => {
  const kinds = findSecretKinds({ authorization: "Bearer github_pat_EXAMPLE0000000000000000" });
  assert.deepEqual(kinds.sort(), ["GitHub token", "bearer token"].sort());
  assert.equal(JSON.stringify(kinds).includes("EXAMPLE"), false);
});

test("ordinary identifiers do not trigger secret scanning", () => {
  assert.deepEqual(findSecretKinds({ patchDigest: "sha256:6d679f", ticket: "SEC-1842" }), []);
});

test("tenant is parsed only from tenant resources", () => {
  assert.equal(getTenantFromResource("tenant:northwind/tickets/1"), "northwind");
  assert.equal(getTenantFromResource("repository://northwind/readme"), null);
});
