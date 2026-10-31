<div align="center">

<img src="./public/images/fallen-angels.png" alt="Fallen X Angels project artwork" width="720">

# Fallen X Angels

<img src="./public/images/readme-typing.svg" alt="WhatsApp automation, built for real communities">

<p>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 20 or newer"></a>
  <a href="https://www.whatsapp.com/"><img src="https://img.shields.io/badge/WhatsApp-Baileys-25D366?style=flat-square&logo=whatsapp&logoColor=white" alt="WhatsApp powered by Baileys"></a>
  <img src="https://img.shields.io/badge/Database-SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite database">
  <img src="https://img.shields.io/badge/License-ISC-64748B?style=flat-square" alt="ISC license">
</p>

<p>
  A modular WhatsApp bot for group administration, media workflows, AI tools, and a secure session dashboard.
</p>

</div>

---

## Overview

Fallen X Angels is a Node.js WhatsApp automation project built on Baileys. It combines group management, media and sticker utilities, AI integrations, and personal productivity commands in a dynamically loaded command system.

The project also includes a web dashboard for managing linked sessions and viewing activity. The dashboard is protected by an administrator password.

## Features

| Area | Capabilities |
| --- | --- |
| Group management | Group information, invite links, polls, rules, welcome messages, join approvals, member moderation, and slow mode |
| Media | Audio downloads, image effects, sticker creation, video conversions, QR codes, and public media tools |
| AI | Claude, Gemini, Groq, and Mistral chat providers; Gemini image generation |
| Utilities | Translation, reminders, notes, to-do lists, weather, lookups, and text tools |
| Dashboard | Session status, usage statistics, activity charts, and session controls |
| Operations | SQLite persistence, structured logs, configurable prefix, and multiple WhatsApp sessions |

See the [command guide](./desc.md) for usage, examples, access requirements, and API-dependent features.

## Requirements

- Node.js 20 or newer
- npm
- A WhatsApp account to link to the bot
- API keys only for the optional integrations you plan to use

## Quick start

### 1. Install dependencies

```powershell
npm ci
```

### 2. Configure the environment

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set a unique, high-entropy `ADMIN_PASSWORD`. Keep this file and your WhatsApp session data private.

The default prefix is `.`. You can change it with `DEFAULT_PREFIX`.

### 3. Start the application

```powershell
npm start
```

On first launch, follow the terminal prompts to link the WhatsApp account using the displayed pairing code. In WhatsApp, open **Settings → Linked Devices → Link a Device → Link with phone number** and enter the code.

### 4. Open the dashboard

Visit `http://localhost:3000/dashboard` (or the configured `PORT`) and authenticate with `ADMIN_PASSWORD`.

## Optional integrations

Add only the keys for features you intend to use. Do not send API keys in group chats or commit them to source control.

| Environment variable | Used for |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude chat commands |
| `GEMINI_API_KEY` | Gemini chat and `.imagine` image generation |
| `GROQ_API_KEY` | Groq chat commands |
| `MISTRAL_API_KEY` | Mistral chat commands |
| `REMOVE_BG_API_KEY` | `.removebg` background removal |
| `TELEGRAM_BOT_TOKEN` | Telegram sticker-pack import |

Optional model settings include `CLAUDE_MODEL`, `GEMINI_MODEL`, `GEMINI_IMAGE_MODEL`, `GROQ_MODEL`, and `MISTRAL_MODEL`. Other deployment settings, such as `PORT`, `DATA_DIR`, `DATABASE_PATH`, and `SESSIONS_DIR`, are documented in [`.env.example`](./.env.example).

## Deployment

The included `Dockerfile` and [`railway.json`](./railway.json) configure a Railway deployment. Set `ADMIN_PASSWORD` in the service variables and attach a persistent volume mounted at `/data`; the container stores the SQLite database and WhatsApp sessions there. Railway supplies `PORT` automatically. For another Docker host, also mount persistent storage at `/data`.

## Project layout

```text
src/
  bot/
    commands/       Dynamically loaded bot commands
    sessionManager.js
    messageHandler.js
  database/
    models/         Sequelize models and SQLite persistence
  server/           Express dashboard and API
  utils/            Shared media and application utilities
public/
  images/           Dashboard, menu, and README artwork
  assets/           Bot media assets
desc.md             Full command guide
index.js            Application entry point
```

## Development

Commands are loaded from `src/bot/commands`. Follow the existing command-module patterns and add new user-facing commands to the relevant menu category and `desc.md`.

Run the production entry point with:

```powershell
npm start
```

The package does not currently define a test or development-watch script.

## Security

- Set a strong `ADMIN_PASSWORD` before starting the application.
- Treat `.env`, linked-device credentials, and session directories as secrets.
- Configure API keys through your private environment or deployment variables, never in chat.
- Be considerate with group-wide actions and comply with WhatsApp's terms and applicable laws.

## Community

- [Official WhatsApp channel](https://whatsapp.com/channel/0029VbDvjLfE50UqjuQXVJ1m)
- [WhatsApp support channel](https://whatsapp.com/channel/0029VbCiqwyBVJl3Jv5T4I15)
- [Telegram community](https://t.me/+a61RXuTFGH85ZjAx)

## License

This project is distributed under the [ISC License](./LICENSE).
