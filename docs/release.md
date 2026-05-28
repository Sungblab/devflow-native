# Release Checklist

Devflow Native is source-first today, but the package metadata is prepared for
an npm release as `@sungblab/devflow-native`.

Do not run the final publish command from an agent session unless the maintainer
explicitly asks for a real public npm release.

## Pre-Publish Checks

Run from the repository root:

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

## Manual Npm Dry Run

For inspection:

```powershell
npm publish --dry-run --json
```

The dry run should identify the package as:

```text
@sungblab/devflow-native@0.1.0
```

## Publish

Only after the maintainer explicitly approves a real release:

```powershell
npm publish --access public
```

After publishing, verify from a clean environment:

```powershell
npm install -g @sungblab/devflow-native
devflow --help
devflow --version
```

Then update the quickstart to promote the npm install path above `npm link`.

