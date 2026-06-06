# Release Guide

NeuralTerm uses GitHub Releases as the default distribution channel.

## What The Workflow Builds

The release workflow in `.github/workflows/release.yml` creates a draft GitHub Release and uploads desktop installers for:

- macOS Apple Silicon: `aarch64-apple-darwin`
- macOS Intel: `x86_64-apple-darwin`
- Windows: default Windows Tauri bundles
- Linux: default Linux Tauri bundles

The workflow runs when a version tag is pushed, such as `v0.2.0`, or when it is started manually from GitHub Actions.

## First Release

The project must be in a GitHub repository before the workflow can run.

```bash
git init
git add .
git commit -m "Initial NeuralTerm release"
gh repo create neuralterm --private --source=. --remote=origin --push
git tag v0.2.0
git push origin v0.2.0
```

After the workflow finishes, review the draft release on GitHub and publish it.

## Versioning

Keep these versions aligned before tagging:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`

For example, release tag `v0.2.0` should match app version `0.2.0`.

## Cost

The GitHub Release workflow itself can run for free in public repositories. Private repositories use the GitHub Actions minutes included in the account plan, then bill usage above the included quota.

Unsigned GitHub Release assets are free to create. Production trust requires external credentials:

- macOS notarization: paid Apple Developer Program
- Direct Windows installer signing: paid code-signing certificate
- Microsoft Store distribution: currently free account registration and Microsoft-hosted signing for Store packages
- Linux AppImage signing: free GPG key

Tauri updater artifacts use a separate free signing key. The private updater key is stored as the
`TAURI_SIGNING_PRIVATE_KEY` GitHub Actions secret, while the public key is configured in
`src-tauri/tauri.conf.json`.

## Current Signing State

The current workflow produces unsigned macOS and Windows assets. They are usable for testing and direct distribution, but users may see platform trust warnings.

Signing can be added later without changing the release model.
