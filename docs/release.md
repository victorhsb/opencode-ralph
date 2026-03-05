# Release Process

This project uses a lightweight release flow.

## Prerequisites

- Clean working tree
- Passing checks:

```bash
bun run test
bun test
bun run build
```

## 1. Choose Version

- Follow semantic versioning.
- Use major/minor/patch based on compatibility impact.

## 2. Update Version

Update `package.json` version.

## 3. Validate Build Artifacts

Rebuild generated outputs from source:

```bash
bun run build
```

## 4. Commit and Tag

```bash
git add .
git commit -m "release: vX.Y.Z"
git tag vX.Y.Z
```

## 5. Push and Publish

```bash
git push origin <branch>
git push origin vX.Y.Z
npm publish
```

If publishing is handled externally, skip `npm publish` and follow your CI/CD release job.

## 6. Create GitHub Release

- Create a GitHub release from the tag.
- Include key highlights and migration notes when applicable.
