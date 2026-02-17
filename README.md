# ComfyUI Frontend

A React + Vite frontend for running ComfyUI workflows with guided onboarding, template browsing, prerequisite checks, server-side job history, and operations controls.

## Requirements

- Node.js 18+
- A running ComfyUI server reachable from your browser

## Quick Start

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build production assets:

```bash
npm run build
```

## App Routes

- `/` main generation screen
- `/settings` full settings and server operations page

## First-Time Setup

On first load, the app shows onboarding and routes to `/settings` until setup is complete.

Required setup:

1. Configure ComfyUI API connection
2. Select a workflow JSON

### API Connection UX

The API form is host-first:

- Enter host/IP only (for example `10.0.0.25` or `comfy.local`)
- Default resolved URL uses `http` and port `8188`
- Optional advanced controls allow protocol/port overrides
- `Test Connection` uses a timeout to fail fast on unreachable hosts

### Workflow Sources

You can choose a workflow by:

- Uploading your own JSON file
- Using the bundled sample workflow
- Applying templates discovered from:
  - local `/templates/index.json` (if exposed)
  - remote Comfy template index fallback

## Main Features

- Real-time generation via WebSocket updates
- Single or dual prompt mode (prompt + negative prompt) based on workflow analysis
- Optional input image upload for image-based workflows
- Queue status display and cancel running job
- Server-backed recent jobs and per-job details

## Workflow Health and Prerequisites

Settings includes `Check Workflow Health (/object_info + prerequisites)`:

- Validates required node classes against `/object_info`
- Checks required models for the selected workflow
- Shows missing models with download and copy URL actions

When a template or manual JSON is applied, prerequisite checks are integrated into the flow so users can resolve missing requirements early.

## Server Dashboard

Dashboard data is loaded from server endpoints and shown as structured cards:

- ComfyUI version
- GPU/compute devices and VRAM details
- Feature flags (flattened and humanized)
- Extensions count with expandable list
- Server history item count

## Danger Zone

Destructive operations are grouped in a dedicated Danger Zone section:

- Clear pending queue
- Interrupt running execution
- Clear server history
- Free VRAM / unload models

## API Endpoints Used

The frontend uses these ComfyUI-style endpoints (availability depends on server version/config):

- `POST /prompt`
- `GET /queue`
- `POST /queue`
- `POST /interrupt`
- `GET /history`
- `GET /history/{prompt_id}`
- `POST /history`
- `POST /free`
- `GET /object_info`
- `POST /upload/image`
- `GET /features`
- `GET /system_stats`
- `GET /extensions`
- `GET /models`
- `GET /{model_folder}` (per-folder model inventory checks)
- `GET /view`
- `GET /templates/index.json` (local template index, when available)
- WebSocket `GET /ws`

## Local Storage Keys

- `comfy_api_url`
- `comfy_workflow`
- `comfy_workflow_name`
- `comfy_onboarding_seen`

## CI/CD

Workflows in `.github/workflows`:

- `build.yml`: install + `npm run build` on push/PR
- `deploy-pages.yml`: deploy `dist` to GitHub Pages
- `release.yml`: on `v*` tag, build and attach release artifact

## Release Process

Create and push a tag:

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

## Project Structure

- `src/App.jsx` app shell and route orchestration
- `src/features/onboarding` onboarding wizard pages
- `src/features/settings` API/workflow/server ops settings UI
- `src/features/templates` template browser, cards, and modals
- `src/features/generation` generation form and runtime status UI
- `src/features/history` server-backed recent jobs and job details UI
- `src/features/home` home screen composition
- `src/hooks` API/workflow/generation/template/admin state hooks
- `src/lib` pure helpers and transforms (URLs, templates, models, formatting)

## Architecture Notes

The app is organized as a thin orchestration layer plus feature modules:

1. `App.jsx` owns app-level state and wires hooks to pages/components.
2. Feature components under `src/features/*` are mostly presentational and receive explicit props.
3. Shared logic lives in hooks (`src/hooks/*`) and pure utility modules (`src/lib/*`).

High-level flow:

1. Onboarding/settings establish API connectivity and workflow selection.
2. Generation uses the selected workflow + prompts and streams execution status over WebSocket.
3. History and job details are fetched from server endpoints and rendered in dedicated history components.
4. Templates are loaded from local/remote indexes, validated for prerequisites, and then applied into workflow state.

## Troubleshooting

- If `Test Connection` fails, verify host/IP, port, and browser reachability (CORS/network).
- If templates appear empty, verify local `/templates/index.json` or network access to remote template index.
- If generation fails with validation errors, run Workflow Health check and install missing models.
- If model download links are shown but unavailable, verify internet access and upstream model hosting.
