# One release workflow for every package

`.github/workflows/reusable-release.yml` is the whole release, written once. A package repo's own `release.yml` is a few lines that call it.

## Does npm trusted publishing accept a called workflow?

Yes, with one rule: **the trusted-publisher entry on npmjs.com names the calling workflow's file** (the repo's own `release.yml`), not the reusable one.

From npm's trusted-publishing documentation, https://docs.npmjs.com/trusted-publishers (Troubleshooting), read 2026-11-02:

- Workflows that use `workflow_call` to invoke another workflow that runs `npm publish` are a named case: "validation checks the calling workflow's name instead of the workflow that actually contains the publish command".
- "The `id-token: write` permission must also be given to both parent and child workflows."
- The entry takes the workflow filename only, with its `.yml` extension, as a file in `.github/workflows/` of the repository, case-sensitive: "Enter only the filename, not the full path".
- It needs npm CLI 11.5.1 or later and Node 22.14.0 or later. Provenance is generated automatically; the `--provenance` flag is harmless.

The page does not say in one sentence which name the entry must carry; that follows from the first quote (the caller's name is the one checked). It is also proved: kazoku-ui 0.7.2 was released on 2026-11-02 by running `release.yml` (which only calls `reusable-release.yml`) from `main` at c107297. It published to npm by trusted publishing with provenance and tagged `v0.7.2`, with the publisher entry naming `release.yml`. If npm ever refuses a called workflow, the error names the workflow it saw; fix the entry, no code change. John runs releases; an agent never does.

So for each repo: package settings on npmjs.com → Trusted Publisher → GitHub Actions → repository `johnmorrisdotca/<repo>`, workflow filename `release.yml`. kazoku-ui's entry already says `release.yml`, so switching it to the call changes nothing on npmjs.com.

## What it does

Run by hand from main (Actions → Release → Run workflow), or by pushing a `v<version>` tag:

1. Refuses to run from any branch but `main` (or a version tag).
2. Checks that a pushed tag equals `v` plus `package.json`'s version, and that an existing `v<version>` tag is on this commit.
3. Asks npm whether `name@version` is already published. If it is, it skips the install, the check and the publish.
4. Runs the repo's check script.
5. Tags `v<version>` if the tag is missing (this also repairs a version that is on npm but untagged).
6. `npm publish --access public --provenance --ignore-scripts` by trusted publishing: no token, no secret.
7. With `github-release: true`, makes a GitHub release with the packed tarball (notes from the repo's `scripts/release-notes.mjs` when it has one, else generated).

A rerun of a half-done release is safe: each step looks at what is already there.

## Calling it

```yaml
name: Release
on:
  push:
    tags: ["v*"]
  workflow_dispatch:
permissions:
  contents: write   # to tag
  id-token: write   # trusted publishing; the called workflow needs it too
jobs:
  release:
    uses: johnmorrisdotca/kazoku-ui/.github/workflows/reusable-release.yml@v0.7.2
    with:
      check-command: pnpm check   # the default
```

| Input | Default | |
|---|---|---|
| `node-version` | `24` | 22.14 or later. |
| `install-command` | `pnpm install --frozen-lockfile` | |
| `check-command` | `pnpm check` | Must pass before anything is published. |
| `github-release` | `false` | Also make a GitHub release with the tarball. |

It expects pnpm with a `packageManager` field in `package.json` (the `pnpm/action-setup` step reads it). A repo on npm needs a variant; ask before copying.

Pin `@` to a released tag of kazoku-ui (a tag exists only after John's release run), not `@main`, so a change here reaches a repo only when that repo moves its pin. Inside kazoku-ui itself `release.yml` uses `./.github/workflows/reusable-release.yml`.

## Moving a repo over

Only when the repo is being touched anyway, one agent per repo:

1. Replace the repo's `release.yml` with the call above. Keep the file name `release.yml`, so its npmjs.com entry stays valid.
2. A repo with no trusted publisher yet (fuda-cards) needs John to add the entry first: workflow filename `release.yml`.
3. Delete the steps the repo's old file had; the check script (`pnpm check`) must itself build and test what is published.
4. CI and Pages are not shared yet.
