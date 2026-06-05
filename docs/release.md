# Release Checklist

Devflow Native is published to npm as `devflow-native`. Public releases should
use the tag-driven GitHub Actions workflow in `.github/workflows/release.yml`.

## Release Model

The release source of truth is a git tag that matches the package version:

```text
package.json version 0.1.4 -> git tag v0.1.4
```

When a `v*` tag is pushed, the release workflow:

1. verifies that the tag matches `package.json`
2. installs Node dependencies
3. runs `npm run publish:check`
4. publishes the package to npm when that exact version is not already present
5. creates or updates the matching GitHub Release

## Npm Trusted Publisher Setup

Use npm Trusted Publishing rather than a long-lived `NPM_TOKEN` secret.

Configure the `devflow-native` package on npm with:

```text
Repository owner: Sungblab
Repository name: devflow-native
Workflow file: release.yml
Environment name: npm-publish
```

In GitHub, create an environment named `npm-publish` and add required reviewers
when a human approval gate is desired. The workflow declares `id-token: write`
for OIDC publishing. If the npm Trusted Publisher is not configured yet, the
workflow will pass local checks and then fail at the real `npm publish` step.

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
git tag v0.1.4
git push origin main
git push origin v0.1.4
```

The workflow should publish to npm and create or update the GitHub Release from
`docs/releases/<tag>.md` when that notes file exists. If the notes file is
missing, it falls back to generated GitHub notes.

## Manual Fallback

Only use this after the maintainer explicitly asks for a real public npm
release from a local terminal session:

```powershell
npm run publish:check
npm publish --access public
gh release create v0.1.4 --title "Devflow Native v0.1.4" --notes-file docs/releases/v0.1.4.md
```

After publishing, verify from the registry:

```powershell
npm view devflow-native version dist-tags --json
npx devflow-native@latest --version
```
