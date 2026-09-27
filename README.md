# AudibleGraphics

Generate narrated infographics using your own Google Gemini API key. Enter any topic and get a full-screen infographic with an AI-generated narration script and audio. Your projects stay in your browser.

## Examples

### Marcus Aurelius

https://github.com/user-attachments/assets/99b58f9d-c39c-4b42-a3e3-f4bf3569471e

### Snow Leopards

https://github.com/user-attachments/assets/ab58daba-5dbf-4435-a976-bfa4b88b6eed

## Features

- **AI-generated infographics** - Gemini generates the image, script, and narration from a single topic or question
- **Text-to-speech narration** - Gemini voices bring the infographic to life
- **Multiple aspect ratios** - 16:9 (landscape) and 9:16 (portrait)
- **4 voice options** - Puck, Aoede, Charon, Laomedeia
- **MP4 export** - Download your infographic as a shareable video
- **Browser-local storage** - Everything is saved in IndexedDB, no cloud account needed
- **Bring your own key** - Your Gemini key is kept in the current browser tab

## Prerequisites

- **Node.js 20.9+** (required by Next.js 16)
- **npm** (bundled with Node.js)
- **Windows, macOS, or Linux**. No separate FFmpeg installation is required.

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Cp557/audiblegraphics.git
   cd audiblegraphics
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the app**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

4. Open **Settings** in the sidebar and paste your Gemini API key. The key is stored only in `sessionStorage` for the current tab.

For a trusted local or self-hosted instance, you can instead set `GEMINI_API_KEY` in `.env`. The server key is used only when the browser does not provide one.

## Getting API Keys

- **Gemini** - [aistudio.google.com](https://aistudio.google.com) -> Get API key. Make sure billing is enabled for the API key's Google Cloud project before generating infographics or voice samples.

## How It Works

1. Enter a topic or question in the input box
2. Choose a voice and aspect ratio
3. Click **Generate** - Gemini creates the script, image, and narration audio
4. Your infographic is saved in your browser and listed in the sidebar
5. Optionally download as MP4 video

## Local Storage

Infographics are stored in the site's IndexedDB database as metadata plus image, audio, and optional video blobs. They survive refreshes but belong to that browser and device. Clearing site data removes them, so download anything you want to keep permanently.

Gemini generation runs through a stateless API route. Temporary conversion files are removed before the request finishes; generated projects are not retained on the server.

MP4 export runs in the browser with FFmpeg WebAssembly. The first export downloads the browser video engine.

## Model Configuration

The defaults can be overridden with environment variables:

```env
GEMINI_TEXT_MODEL=gemini-flash-latest
GEMINI_IMAGE_MODEL=gemini-3.1-flash-image
GEMINI_IMAGE_FALLBACK_MODEL=gemini-3-pro-image
GEMINI_TTS_MODEL=gemini-3.8-flash-tts
```

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui**
- **Google Gemini** (`@google/genai`) - image, script, and text-to-speech generation
- **IndexedDB** - browser-local project and media storage
- **FFmpeg + ffmpeg.wasm** - server audio conversion and browser MP4 export
