# ComfyUI Frontend

A React + Vite frontend for running ComfyUI workflows with a guided setup, server-side history, and operations controls.

## Requirements

- Node.js 18+
- A running ComfyUI server with HTTP and WebSocket routes enabled

## Quick Start

Install dependencies:

```bash
npm install
```

Start local development:

```bash
npm run dev
```

Build production assets:

```bash
npm run build
```

## App Routes

- `/` main generation interface
- `/settings` full settings and operations page

## First-Time Setup

On first load, the app shows a welcome step and then directs to `/settings`.

Required setup:

1. ComfyUI API base URL (for example: `http://your-comfyui-host:8188`)
2. Workflow JSON

You can provide the workflow by:

- Uploading your own JSON file
- Using the bundled sample workflow
- Applying a server template from `/workflow_templates` (when available)

## Core Features

- Real-time generation updates via ComfyUI WebSocket (`/ws`)
- Percentage progress status during generation
- Cancel in-progress execution (`/interrupt`)
- Queue visibility (`/queue`)
- Server-side recent jobs from `/history` (not local-only history)
- Optional model override sourced from server model endpoints
- Optional input image upload (`/upload/image`) for image-driven workflows

## Settings Page

### Configuration

- API URL + connection test
- Workflow upload/sample/template selection
- Model override picker (server-driven)
- Workflow compatibility check via `/object_info`

### Server Dashboard

Shows data from:

- `/features`
- `/system_stats`
- `/extensions`
- `/history` count

### Ops Mode

Admin actions (explicitly gated by an Ops Mode toggle):

- Clear pending queue (`POST /queue`)
- Interrupt running execution (`POST /interrupt`)
- Clear server history (`POST /history`)
- Free VRAM / unload models (`POST /free`)

## ComfyUI API Endpoints Used

- `POST /prompt`
- `GET /history/{prompt_id}`
- `GET /history`
- `GET /queue`
- `POST /queue`
- `POST /interrupt`
- `POST /history`
- `POST /free`
- `GET /object_info`
- `GET /models/checkpoints`
- `GET /models/diffusion_models`
- `POST /upload/image`
- `GET /features`
- `GET /system_stats`
- `GET /extensions`
- `GET /workflow_templates`
- `GET /view`
- `GET /ws` (WebSocket)

## Local Storage Keys

- `comfy_api_url`
- `comfy_workflow`
- `comfy_workflow_name`
- `comfy_selected_model`
- `comfy_onboarding_seen`

## GitHub Actions

Workflows in `.github/workflows`:

- `build.yml`: installs deps and runs `npm run build` on pushes/PRs
- `deploy-pages.yml`: deploys `dist` to GitHub Pages (main branch)
- `release.yml`: on tag `v*`, builds and attaches `dist-<tag>.zip` to GitHub Release

## Release Process

Recommended versioning uses git tags:

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

This triggers the automated release workflow and publishes a downloadable `dist` artifact.

## Project Structure

- `src/App.jsx` routed app shell (`/` and `/settings`)
- `src/hooks/useApiConfig.js` API URL state and connection test logic
- `src/hooks/useWorkflowConfig.js` workflow storage and selection
- `src/hooks/useGeneration.js` generation flow, WebSocket status, queue/cancel handling

## Troubleshooting

- If model list is empty, verify the target model folder endpoints on your server (for example `/models/diffusion_models`).
- If templates show none, your server may return an empty `/workflow_templates` payload.
- If generation fails after upload, confirm your workflow includes compatible image input nodes.
- If API calls fail in browser but work in curl, check CORS/network settings on the ComfyUI host.
