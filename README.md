# JARVIS — Personal AI Assistant

A browser-first personal JARVIS interface using OpenRouter. The app is currently a single-file static web app so it can be tested without a local development environment.

## Run

Open `index.html` in a browser or deploy the repository with GitHub Pages.

## Configure

Open **System settings** inside JARVIS and paste your OpenRouter API key. The key is stored locally in the browser and is not committed to GitHub.

## Current features

- JARVIS dark/futuristic interface
- Multi-conversation history
- OpenRouter integration
- Automatic task classification and model routing
- Optional OpenRouter web search plugin
- Browser speech recognition input where supported
- Markdown/code response rendering
- Local persistence
- Responsive mobile layout

## Routing

- Coding/engineering prompts → Claude Sonnet latest alias
- Long-context/document/web/image-oriented prompts → Gemini 2.5 Pro
- General/fast prompts → GPT-4o

OpenRouter's Auto Router remains available as an architecture option for later versions.

## Security note

This first browser version is intentionally personal-use only. An API key entered into a client-side web app can be exposed to anyone who can inspect that browser session. For a public deployment, move the OpenRouter call behind a server-side proxy before publishing the app broadly.

## Next phase

After the browser version is tested, the UI and router will be moved into an Expo/React Native shell and built as an Android APK.
