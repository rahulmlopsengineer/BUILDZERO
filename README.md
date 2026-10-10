# 🚀 BUILDZERO — AI-Powered In-Browser Cloud IDE

> Build full-stack applications with AI in your browser — zero setup, zero latency, and instant live previews.

---

## 🌟 Overview

**BuildZero** is an end-to-end, AI-powered cloud development environment running entirely inside the browser. It combines conversational AI requirements engineering (powered by Claude AI) with local browser WebContainer technology to stream, compile, and execute full-stack web applications without remote server delays.

---

## ✨ Features

- ⚡ **WebAssembly WebContainers:** Runs a full Node.js POSIX environment inside your browser via StackBlitz WebContainers. Zero latency, instant hot-module-reloading (HMR), and no cloud VM boot times.
- 🗣️ **Conversational Onboarding:** Interactive 5-question AI interview that extracts project goals, target audience, framework, and design preferences.
- 🎨 **Component Library Architecture:** Automatically generates modular `shadcn/ui` style primitives (`Button`, `Card`, `Badge`, `Input`) and composes them into complete applications.
- 🎭 **Rich Micro-Frontend Animations:** Features an interactive WebGL Shader Orb, Canvas TechText typography, Liquid Gooey particle navigation, and GSAP MagicBento cards.
- 🤖 **Built-in AI Coding Agent & Chat:** Context-aware AI assistant that can view open files, answer questions, and perform direct multi-file code refinements.
- 🐙 **1-Click GitHub Export & Vercel Deploy:** Connect your GitHub account to automatically create repositories, push code, and deploy live production sites.

---

## 🚀 Quick Start & Installation

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **Package Manager**: `npm` or `pnpm`
- **Browser**: Modern Chromium-based browser (Chrome, Edge, Brave) with Cross-Origin Isolation support.

### 1. Clone the Repository

```bash
git clone https://github.com/rahulmlopsengineer/BUILDZERO.git
cd BUILDZERO
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory and add the following keys:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key

# GitHub OAuth App (for GitHub Sign-In & Code Push)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Anthropic Claude API Key (for AI Onboarding & Agent)
ANTHROPIC_API_KEY=your-anthropic-api-key

# Database Connection (MongoDB)
MONGODB_URI=mongodb://localhost:27017/buildzero
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start building!

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/) + [React 18](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Browser Engine**: [StackBlitz WebContainer API](https://webcontainers.io/)
- **AI Integration**: [Vercel AI SDK](https://sdk.vercel.ai/) & Anthropic Claude 3.5 Sonnet
- **Visuals & Physics**: OGL (WebGL Shaders), HTML5 Canvas API, GSAP Animations
- **Database & Auth**: MongoDB (Mongoose) + NextAuth.js

---

## 📁 Project Structure

```
webide/
├── app/                          # Next.js App Router Pages & API Routes
│   ├── api/                      # REST API Endpoints (auth, projects, ai, db)
│   ├── auth/signin/              # Sign-In Page with OAuth
│   ├── create-project/           # 5-Question AI Onboarding & File Streaming
│   ├── dashboard/                # User Projects Dashboard & Quick Delete
│   ├── projects/[projectId]/     # Full IDE Layout (Editor, Preview, Chat)
│   ├── layout.tsx                # Root Layout with Animated ShapeGrid Background
│   └── page.tsx                  # Landing Page (Hero, Bento Grid, Features)
│
├── components/                   # Shared UI Components & Animations
│   ├── GooeyNav.tsx              # Liquid Bubble Particle Nav
│   ├── MagicBento.tsx            # GSAP Interactive Card Grid
│   ├── Orb.tsx                   # WebGL Animated Shader Orb Background
│   ├── ShapeGrid.tsx             # Interactive Canvas Background Grid
│   ├── TechText.tsx              # Dynamic Canvas Typography Component
│   ├── ide-header.tsx            # IDE Top Bar Navigation
│   └── sidebar.tsx               # IDE File Explorer Sidebar
│
├── features/                     # Core IDE Subsystems
│   ├── agent/                    # AI Coding Agent Panel
│   ├── conversations/            # Context-Aware AI Chat Panel
│   ├── database/                 # Project File Persistence Hooks
│   └── preview/                  # WebContainer Hook & Live Preview Container
│
├── lib/                          # Utility functions, Mongoose models & Auth
└── models/                       # MongoDB Schemas (User, Project)
```

---

## ⌨️ Keyboard Shortcuts (IDE)

| Shortcut | Action |
| :--- | :--- |
| `⌘K` / `Ctrl+K` | Open Command Palette / File Search |
| `⌘S` / `Ctrl+S` | Save Active File & Persist |
| `⌘\` / `Ctrl+\` | Toggle Left Sidebar / Explorer |
| `⌘P` / `Ctrl+P` | Switch Right Panel to Live Preview |
| `Esc` | Close Command Palette |

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

---

## 📄 License

This project is licensed under the MIT License.
