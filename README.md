# ComfyUI Frontend

A React + Vite frontend for sending prompts to a ComfyUI server and previewing generated images.

## Requirements

- Node.js 18+
- A running ComfyUI server with API routes available

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Then open the local URL printed by Vite (usually `http://localhost:5173`).

## Build

```bash
npm run build
```

## First-Time Setup

On first launch, the app opens Settings and requires:

1. ComfyUI API base URL (example: `http://your-comfyui-host:8188`)
2. A workflow JSON file

In Settings you can:

- Click `Test Connection` to verify the API URL
- Upload your own workflow JSON
- Use the bundled sample workflow

The app will not allow image generation until both API URL and workflow are configured.

## How Generation Works

1. You enter a prompt.
2. The app injects that prompt into compatible text nodes in the workflow.
3. The app POSTs the workflow to `/prompt`.
4. It polls `/history/{prompt_id}` until completion.
5. It resolves the output image via `/view` and displays it.

## Stored Local Data

The app stores configuration in browser local storage:

- `comfy_api_url`
- `comfy_workflow`
- `comfy_workflow_name`

## Project Structure

- `src/App.jsx`: main UI shell and settings/onboarding layout
- `src/hooks/useApiConfig.js`: API URL state, persistence, and connection testing
- `src/hooks/useWorkflowConfig.js`: workflow upload/sample selection and persistence
- `src/hooks/useGeneration.js`: prompt submission, polling, and output resolution

## Troubleshooting

- If connection testing fails, verify the ComfyUI host/port and browser CORS/network access.
- If generation fails with prompt-node errors, your workflow may not include compatible text input nodes.
- If settings seem stale, clear local storage for this site and reload.
