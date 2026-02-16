# ComfyUI Frontend (Vite + React)

Minimal frontend to send prompts to a ComfyUI REST endpoint and preview the generated image.

Quick start

1. Install dependencies

```bash
cd comfy-frontend
npm install
```

2. Run dev server

```bash
npm run dev
```

3. Open the app at the printed Vite URL (usually `http://localhost:5173`).

Usage

 - On first load, if no API URL or workflow is saved in local storage, the app opens Settings onboarding.
 - Enter your ComfyUI REST endpoint base URL in Settings (example: `http://your-comfyui-host:8188`).
 - Upload your workflow JSON, or click **Use Sample** if you want to start with the bundled sample workflow.
- Type a prompt and click **Generate**.

Workflow-based runs

- This frontend sends the entire ComfyUI workflow JSON (default file: `01_get_started_text_to_image.json`) to the API URL you provide. Before sending, it injects your prompt into nodes that look like prompt encoders (for example `CLIPTextEncode` nodes with an `inputs.text` field). The payload is wrapped as `{ "prompt": <workflow> }` to match ComfyUI `/prompt`.
- The workflow includes a `PreviewImage` node (node 61) that outputs the generated image to the outputs dict (not just saves to disk).
- The frontend POSTs to `/prompt`, receives a `prompt_id`, then polls `/history/{prompt_id}` every second until the job status shows `completed: true`.
- Once an image is in the history outputs, the app constructs a `/view` URL to display the generated image from the server's output directory.
- This frontend currently expects ComfyUI's `/prompt` + `/history/{prompt_id}` + `/view` flow. If your backend uses a different response format, update `src/App.jsx`.

Want me to start the dev server here? I can run `npm install` and `npm run dev` for you.
