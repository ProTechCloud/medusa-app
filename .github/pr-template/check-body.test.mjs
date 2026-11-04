import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./check-body.mjs", import.meta.url));

const TEMPLATE = `<!-- The title is the squash commit message. -->

## Why

<!-- The problem this solves. -->

## What changed

<!-- Short summary. -->

## Checklist

- [ ] Tests pass
- [ ] No secrets in code
`;

const FILLED = `## Why
Reason.

## What changed
Stuff.

## Checklist
- [x] Tests pass
- [X] No secrets in code
`;

function withWhy(content) {
	return FILLED.replace("Reason.", content);
}

function withChanged(content) {
	return FILLED.replace("Stuff.", content);
}

describe("check-body", () => {
	let cwd;

	before(() => {
		cwd = mkdtempSync(path.join(tmpdir(), "check-body-"));
		mkdirSync(path.join(cwd, "base/.github"), { recursive: true });
		writeFileSync(
			path.join(cwd, "base/.github/pull_request_template.md"),
			TEMPLATE,
		);
	});

	after(() => rmSync(cwd, { recursive: true }));

	function check(body) {
		const run = spawnSync(process.execPath, [SCRIPT, body], {
			cwd,
			encoding: "utf8",
		});
		return { status: run.status, output: run.stdout };
	}

	const passing = [
		["a filled body", FILLED],
		["windows line endings", FILLED.replaceAll("\n", "\r\n")],
		["a section the template lacks", `${FILLED}\n## Notes\nMore.\n`],
		["an item marked n/a", FILLED.replace("[x] Tests", "[ ] n/a: Tests")],
		["a ticked item the template lacks", withChanged("- [x] did this")],
		["a code block as the content", withWhy("```\ncode\n```")],
		["a heading inside a code block", withWhy("```\n## Fake\n```")],
		["an unticked box inside a code block", withChanged("```\n- [ ] a\n```")],
		["a shorter fence inside a longer one", withWhy("````\ncode\n```\n````")],
		["a tilde inside a backtick fence", withWhy("```\ncode\n~~~\n```")],
		["an info string that does not close", withWhy("```\ncode\n```js\n```")],
	];

	for (const [name, body] of passing) {
		it(`passes ${name}`, () => {
			assert.deepEqual(check(body), { status: 0, output: "" });
		});
	}

	const failing = [
		["an empty body", "", '"Why" is missing'],
		["an empty section", withWhy(""), '"Why" is empty'],
		[
			"a section with only a comment",
			withWhy("<!-- todo -->"),
			'"Why" is empty',
		],
		[
			"a section with only an empty fence",
			withWhy("```\n```"),
			'"Why" is empty',
		],
		[
			"a section with only a blank fence",
			withWhy("~~~\n\n~~~"),
			'"Why" is empty',
		],
		[
			"a renamed section",
			FILLED.replace("## What changed", "## Other"),
			'"What changed" is missing',
		],
		[
			"a heading hidden in a fence",
			FILLED.replace("## What changed", "~~~\n## What changed\n~~~"),
			'"What changed" is missing',
		],
		["an unclosed fence", withWhy("```"), '"What changed" is missing'],
		[
			"an unticked item",
			FILLED.replace("[x] Tests", "[ ] Tests"),
			'"Checklist" has an item neither ticked nor marked n/a: Tests pass',
		],
		[
			"a removed item",
			FILLED.replace("- [X] No secrets in code\n", ""),
			'"Checklist" lost the item: No secrets in code',
		],
		[
			"an unticked task in another section",
			withChanged("- [ ] finish this"),
			'"What changed" has an item neither ticked nor marked n/a: finish this',
		],
		[
			"an unticked task in a section the template lacks",
			`${FILLED}\n## Notes\n- [ ] later\n`,
			'"Notes" has an item neither ticked nor marked n/a: later',
		],
	];

	for (const [name, body, problem] of failing) {
		it(`fails ${name}`, () => {
			const { status, output } = check(body);

			assert.equal(status, 1);
			assert.ok(output.includes(`::error::${problem}\n`), output);
		});
	}
});
