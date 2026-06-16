# Release Checklist

Devflow Native is published to npm as `devflow-native`. Public releases use a
local npm publish followed by the tag-driven GitHub Actions workflow in
`.github/workflows/release.yml`.

## Release Model

The release source of truth is a git tag that matches the package version:

```text
package.json version 0.1.4 -> git tag v0.1.4
```

When a `v*` tag is pushed, the release workflow:

1. verifies that the tag matches `package.json`
2. installs Node dependencies
3. runs `npm run publish:check`
4. verifies that the exact npm package version is already published
5. creates or updates the matching GitHub Release

The workflow intentionally does not run `npm publish`. This avoids failed
release runs when GitHub Trusted Publishing is not configured for this package.
If the npm package is missing, the workflow emits a notice and exits green
without creating the GitHub Release; publish from an authenticated local shell
and rerun the workflow.

## Npm Publishing Model

Use local npm authentication for publishing until npm Trusted Publishing is
configured and verified for this repository.

The known working path is:

```powershell
npm run publish:check
npm publish --access public
```

After npm publish succeeds, push the matching tag so GitHub Actions can verify
the package and create the GitHub Release without attempting a publish from CI.

## Future Trusted Publisher Setup

If moving back to CI publishing, use npm Trusted Publishing rather than a
long-lived `NPM_TOKEN` secret.

Configure the `devflow-native` package on npm with:

```text
Repository owner: Sungblab
Repository name: devflow-native
Workflow file: release.yml
Environment name: npm-publish
```

In GitHub, create an environment named `npm-publish` and add required reviewers
when a human approval gate is desired. The workflow declares `id-token: write`
for OIDC publishing. Do not re-enable CI `npm publish` until a test release has
proved that Trusted Publishing works without a permission or `E404` failure.

## Pre-Release Checks

Run from the repository root before tagging:

```powershell
npm run publish:check
```

This command verifies:

- documentation links
- the full Node test suite
- packed tarball install into a temporary consumer project
- packaged `devflow --help` and `devflow --version`
- `npm publish --dry-run --json`
- required package files are present
- local state, git internals, Obsidian notes, and private research paper paths
  are not included in the package

## Release Steps

After the release commit is on `main`:

```powershell
npm run publish:check
npm publish --access public
git push origin main
git tag v0.1.4
git push origin v0.1.4
```

The workflow should verify the npm package and create or update the GitHub
Release from `docs/releases/<tag>.md` when that notes file exists. If the notes
file is missing, it falls back to generated GitHub notes.

## Manual Recovery

```powershell
npm run publish:check
npm publish --access public
gh release create v0.1.4 --title "Devflow Native v0.1.4" --notes-file docs/releases/v0.1.4.md
```

Use this only when the tag workflow could not create the GitHub Release or when
the maintainer explicitly asks for a local release recovery.

After publishing, verify from the registry:

```powershell
npm view devflow-native version dist-tags --json
npx devflow-native@latest --version
```
