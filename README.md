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

 - Enter your ComfyUI REST endpoint URL in the **API URL** field. Example endpoint (adjust to your ComfyUI setup): `http://10.18.20.10:8188/prompt`.
- Type a prompt and click **Generate**.

Workflow-based runs

- This frontend sends the entire ComfyUI workflow JSON (the file `01_get_started_text_to_image.json`) to the API URL you provide, after injecting your prompt into the `CLIPTextEncode` node (`83:27`). The payload is wrapped as `{ "prompt": <workflow> }` to match the ComfyUI `/prompt` route expectations.
- The workflow includes a `PreviewImage` node (node 61) that outputs the generated image to the outputs dict (not just saves to disk).
- The frontend POSTs to `/prompt`, receives a `prompt_id`, then polls `/history/{prompt_id}` every second until the job status shows `completed: true`.
- Once an image is in the history outputs, the app constructs a `/view` URL to display the generated image from the server's output directory.
- The frontend is intentionally flexible about response shapes. It handles image blobs, JSON with `image` (base64) or `images` (array) fields, and simple `url` fields. If your ComfyUI REST plugin uses a different schema, update `src/App.jsx` accordingly.
- If the server returns a base64 string without a data URL prefix, the frontend assumes PNG and prefixes `data:image/png;base64,`.

Want me to start the dev server here? I can run `npm install` and `npm run dev` for you.
