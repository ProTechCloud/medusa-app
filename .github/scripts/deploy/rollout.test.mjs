import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	chmodSync,
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./rollout.sh", import.meta.url));

const DIGEST = `sha256:${"a".repeat(64)}`;
const COMMIT = "c0ffee";
const REGISTRY_IMAGE = "us-docker.pkg.dev/project/repo/medusa-backend";

// gcloud as the script calls it: the registry answers with DIGEST_OUT, the
// service is held by `previous` until `services update` creates `latest`, and
// every call is appended to calls.log so a test can see what was done.
// NO_SERVING (`before` or `after` the update) splits the traffic so that no
// revision holds 100%, and RESTORE_FAILS makes the restore's
// `update-traffic --to-revisions` fail.
const GCLOUD = `#!/usr/bin/env bash
echo "$*" >> "$STUB_DIR/calls.log"
case "$1 $2 $3" in
  "artifacts docker images") echo "$DIGEST_OUT" ;;
  "run services describe")
    revision=previous
    stage=before
    [ -f "$STUB_DIR/updated" ] && revision=latest && stage=after
    if [ "\${NO_SERVING:-}" = "$stage" ]; then
      echo "{\\"status\\":{\\"traffic\\":[{\\"revisionName\\":\\"$revision\\",\\"percent\\":50}]}}"
    else
      echo "{\\"status\\":{\\"traffic\\":[{\\"revisionName\\":\\"$revision\\",\\"percent\\":100}]}}"
    fi ;;
  "run services update")
    [ "\${UPDATE_FAILS:-}" = "true" ] && exit 1
    touch "$STUB_DIR/updated" ;;
  "run services update-traffic")
    case "$*" in
      *--to-revisions*) [ "\${RESTORE_FAILS:-}" = "true" ] && exit 1 ;;
    esac ;;
  "run revisions describe")
    echo "{\\"spec\\":{\\"containers\\":[{\\"image\\":\\"$SPEC_IMAGE\\"}]},\\"status\\":{\\"imageDigest\\":\\"$STATUS_IMAGE\\"}}" ;;
  *) echo "unexpected gcloud $*" >&2; exit 2 ;;
esac
`;

// The hostname gives no answer for the first CURL_FAILS calls, as while the
// new revision starts, then serves SERVED_COMMIT.
const CURL = `#!/usr/bin/env bash
echo "$*" >> "$STUB_DIR/curl.log"
[ "$(wc -l < "$STUB_DIR/curl.log")" -le "\${CURL_FAILS:-0}" ] && exit 7
echo "{\\"commit\\":\\"$SERVED_COMMIT\\"}"
`;

const SLEEP = `#!/usr/bin/env bash
echo "$*" >> "$STUB_DIR/sleep.log"
`;

describe("rollout", () => {
	let dir;

	beforeEach(() => {
		dir = mkdtempSync(path.join(tmpdir(), "rollout-"));
		for (const [name, body] of [
			["gcloud", GCLOUD],
			["curl", CURL],
			["sleep", SLEEP],
		]) {
			writeFileSync(path.join(dir, name), body);
			chmodSync(path.join(dir, name), 0o755);
		}
	});

	afterEach(() => rmSync(dir, { recursive: true }));

	function rollout(overrides = {}) {
		const run = spawnSync("bash", [SCRIPT], {
			encoding: "utf8",
			env: {
				PATH: `${dir}:${process.env.PATH}`,
				STUB_DIR: dir,
				IMAGE: `${REGISTRY_IMAGE}:${COMMIT}`,
				SERVICE: "medusa-stg-api",
				REGION: "us-central1",
				PROJECT: "project",
				COMMIT,
				API_HOSTNAME: "api.example.test",
				DIGEST_OUT: DIGEST,
				SPEC_IMAGE: `${REGISTRY_IMAGE}@${DIGEST}`,
				STATUS_IMAGE: `${REGISTRY_IMAGE}@${DIGEST}`,
				SERVED_COMMIT: COMMIT,
				...overrides,
			},
		});
		const read = (file) =>
			existsSync(path.join(dir, file))
				? readFileSync(path.join(dir, file), "utf8").trim().split("\n")
				: [];
		const calls = read("calls.log");
		return {
			status: run.status,
			output: run.stdout,
			calls,
			updated: calls.some((call) => call.startsWith("run services update ")),
			restored: calls.some((call) =>
				call.includes("--to-revisions previous=100"),
			),
			curls: read("curl.log"),
			sleeps: read("sleep.log"),
		};
	}

	it("passes when the revision names the digest and the hostname serves the commit", () => {
		const result = rollout();
		assert.equal(result.status, 0);
		assert.equal(result.restored, false);
		assert.deepEqual(result.curls, [
			"-fsS --max-time 20 https://api.example.test/version",
		]);
		// The roll forward that undoes a rollback's pin, after the update.
		const update = result.calls.findIndex((call) =>
			call.startsWith("run services update "),
		);
		const toLatest = result.calls.findIndex(
			(call) =>
				call.startsWith("run services update-traffic ") &&
				call.includes("--to-latest"),
		);
		assert.ok(update >= 0 && toLatest > update);
	});

	it("passes once the hostname answers after a few attempts, with one sleep per failed attempt", () => {
		const result = rollout({ CURL_FAILS: "3" });
		assert.equal(result.status, 0);
		assert.equal(result.restored, false);
		assert.equal(result.curls.length, 4);
		assert.equal(result.sleeps.length, 3);
	});

	it("passes when the revision keeps the tag and only status.imageDigest names the digest", () => {
		const result = rollout({ SPEC_IMAGE: `${REGISTRY_IMAGE}:${COMMIT}` });
		assert.equal(result.status, 0);
		assert.equal(result.restored, false);
	});

	it("fails before any change when the registry has no digest", () => {
		const result = rollout({ DIGEST_OUT: "" });
		assert.equal(result.status, 1);
		assert.equal(result.updated, false);
		assert.equal(result.restored, false);
	});

	it("fails before any change when no revision holds all the traffic", () => {
		const result = rollout({ NO_SERVING: "before" });
		assert.equal(result.status, 1);
		assert.equal(result.updated, false);
		assert.equal(result.restored, false);
	});

	it("restores the previous revision when no revision holds all the traffic after the update", () => {
		const result = rollout({ NO_SERVING: "after" });
		assert.equal(result.status, 1);
		assert.equal(result.updated, true);
		assert.equal(result.restored, true);
		assert.deepEqual(result.curls, []);
	});

	it("still fails, and says so, when the restore itself fails", () => {
		const result = rollout({ UPDATE_FAILS: "true", RESTORE_FAILS: "true" });
		assert.equal(result.status, 1);
		assert.equal(result.restored, true);
		assert.match(result.output, /could not restore previous/);
	});

	it("restores the previous revision when the update fails", () => {
		const result = rollout({ UPDATE_FAILS: "true" });
		assert.equal(result.status, 1);
		assert.equal(result.restored, true);
	});

	it("restores the previous revision when the serving revision runs another digest", () => {
		const other = `${REGISTRY_IMAGE}@sha256:${"b".repeat(64)}`;
		const result = rollout({ SPEC_IMAGE: other, STATUS_IMAGE: other });
		assert.equal(result.status, 1);
		assert.equal(result.restored, true);
		assert.deepEqual(result.curls, []);
	});

	it("restores the previous revision when the hostname never serves the commit, with no sleep after the last attempt", () => {
		const result = rollout({ SERVED_COMMIT: "0ld" });
		assert.equal(result.status, 1);
		assert.equal(result.restored, true);
		assert.equal(result.curls.length, 15);
		assert.equal(result.sleeps.length, 14);
	});
});
