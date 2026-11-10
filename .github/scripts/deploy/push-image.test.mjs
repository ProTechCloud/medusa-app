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

const SCRIPT = fileURLToPath(new URL("./push-image.sh", import.meta.url));
const EXISTS = fileURLToPath(new URL("./image-exists.sh", import.meta.url));

const IMAGE = "us-docker.pkg.dev/project/repo/medusa-backend:c0ffee";

// The registry's answer to `describe` is DESCRIBE: `found`, `missing` (the
// error gcloud prints for a tag that is not there) or `denied`. Every call to
// a stub is appended to calls.log.
const GCLOUD = `#!/usr/bin/env bash
echo "gcloud $*" >> "$STUB_DIR/calls.log"
case "$1 $2 $3" in
  "auth configure-docker "*) ;;
  "artifacts docker images")
    case "$DESCRIBE" in
      found) echo "image: $IMAGE" ;;
      missing) echo "ERROR: (gcloud.artifacts.docker.images.describe) Image not found." >&2; exit 1 ;;
      denied) echo "ERROR: (gcloud.artifacts.docker.images.describe) PERMISSION_DENIED: Permission denied." >&2; exit 1 ;;
    esac ;;
  *) echo "unexpected gcloud $*" >&2; exit 2 ;;
esac
`;

const RECORD = `#!/usr/bin/env bash
echo "$(basename "$0") $*" >> "$STUB_DIR/calls.log"
`;

describe("push-image", () => {
	let dir;

	beforeEach(() => {
		dir = mkdtempSync(path.join(tmpdir(), "push-image-"));
		for (const [name, body] of [
			["gcloud", GCLOUD],
			["docker", RECORD],
			["trivy", RECORD],
		]) {
			writeFileSync(path.join(dir, name), body);
			chmodSync(path.join(dir, name), 0o755);
		}
	});

	afterEach(() => rmSync(dir, { recursive: true }));

	function env(overrides) {
		return {
			PATH: `${dir}:${process.env.PATH}`,
			STUB_DIR: dir,
			IMAGE,
			LOCAL_IMAGE: "medusa-backend:c0ffee",
			IMAGE_TAR: "/tmp/image.tar",
			DESCRIBE: "missing",
			...overrides,
		};
	}

	// image-exists.sh on its own, as the workflow's step reads it before
	// deciding whether to install trivy.
	function exists(describe) {
		const run = spawnSync("bash", [EXISTS], {
			encoding: "utf8",
			env: env({ DESCRIBE: describe }),
		});
		return { status: run.status, output: run.stdout.trim() };
	}

	it("reads an existing tag as true", () => {
		assert.deepEqual(exists("found"), { status: 0, output: "true" });
	});

	it("reads a missing tag as false", () => {
		assert.deepEqual(exists("missing"), { status: 0, output: "false" });
	});

	it("fails on any other registry error instead of reading it as absent", () => {
		assert.deepEqual(exists("denied"), { status: 1, output: "" });
	});

	function push(overrides = {}) {
		const run = spawnSync("bash", [SCRIPT], {
			encoding: "utf8",
			env: env(overrides),
		});
		const log = path.join(dir, "calls.log");
		const calls = existsSync(log)
			? readFileSync(log, "utf8").trim().split("\n")
			: [];
		return {
			status: run.status,
			pushed: calls.some((call) => call.startsWith("docker push")),
			scanned: calls.some((call) => call.startsWith("trivy image")),
			calls,
		};
	}

	it("refuses an image path without a registry host", () => {
		const result = push({ IMAGE: "/medusa-backend:c0ffee" });
		assert.equal(result.status, 1);
		assert.deepEqual(result.calls, []);
	});

	it("loads, tags and pushes a tag the registry does not have", () => {
		const result = push();
		assert.equal(result.status, 0);
		assert.equal(result.scanned, false);
		assert.deepEqual(
			result.calls.filter((call) => call.startsWith("docker")),
			[
				"docker load --input /tmp/image.tar",
				`docker tag medusa-backend:c0ffee ${IMAGE}`,
				`docker push ${IMAGE}`,
			],
		);
	});

	it("scans a tag the registry already has instead of pushing it", () => {
		const result = push({ DESCRIBE: "found" });
		assert.equal(result.status, 0);
		assert.equal(result.scanned, true);
		assert.equal(result.pushed, false);
	});

	it("fails without pushing when the registry answers anything but not found", () => {
		const result = push({ DESCRIBE: "denied" });
		assert.equal(result.status, 1);
		assert.equal(result.scanned, false);
		assert.equal(result.pushed, false);
	});
});
