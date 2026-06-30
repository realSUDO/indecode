# Indecode

> **Build software at the speed of thought.**

[![Live Demo](https://img.shields.io/badge/Live_Site-indecode.in-blue?style=for-the-badge&logo=vercel)](https://indecode.in)
[![Demo Video](https://img.shields.io/badge/Demo_Video-Google_Drive-green?style=for-the-badge&logo=googledrive)](https://drive.google.com/drive/folders/1a9HrcTVykX-f4mU2g2LB7Kz5CRUB2zq3?usp=sharing)

---

## 📖 Overview

**Indecode** is a production-grade, autonomous AI software development platform built for modern engineering teams. It bridges the gap between raw product requirements and deployable code. Rather than acting as a simple auto-complete tool or chat interface, Indecode functions as an autonomous agentic worker that integrates directly into your repository and development lifecycle.

The core philosophy behind Indecode is that **writing boilerplate, scaffolding features, and manually opening Pull Requests is low-leverage work**. By automating the translation of plain-english requirements into a structured Product Requirements Document (PRD), a Kanban task list, and finally into merged source code, Indecode empowers engineers and founders to focus on high-level architecture and product strategy.

### The Problem It Solves
The modern software development lifecycle is fraught with friction:
1. **Context Switching:** Developers constantly switch between Jira/Linear, the IDE, GitHub, and deployment platforms.
2. **Boilerplate Fatigue:** Setting up routes, database schemas, and standard UI components consumes a disproportionate amount of time.
3. **AI Limitations:** Most AI coding tools (like Copilot or ChatGPT) lack holistic repository context and cannot execute complex, multi-step workflows autonomously.

### Who Is This For?
- **Solo Founders / Indie Hackers:** Move incredibly fast by delegating feature implementations to an autonomous agent.
- **Open Source Maintainers:** Quickly scaffold out community feature requests.
- **Engineering Teams:** Standardize feature development by ensuring every feature goes through a rigorous PRD -> Task -> Implementation pipeline.

---

## ✨ Key Features

### 🧑‍💻 User-Facing Capabilities
- **Frictionless Onboarding:** Seamless GitHub OAuth integration. Your organization repositories are automatically synced and ready for AI ingestion.
- **Cross-Domain Context Preservation:** Start typing your feature request on the landing page, and through advanced cookie-based state management, watch it seamlessly transfer into the core application post-authentication.
- **Autonomous Feature Execution:** 
  - **Discovery Phase:** The AI scans your repository to understand its architecture and style guidelines.
  - **PRD Generation:** Translates vague feature ideas into a concrete, technical Product Requirements Document.
  - **Task Planning:** Breaks the PRD down into a kanban board of actionable, granular engineering tasks (To Do, In Progress, Done).
  - **Implementation & Review:** The AI writes the code, self-reviews against the PRD, and resolves syntax errors.
  - **Shipping:** Automatically opens a Pull Request in your GitHub repository.
- **Real-Time Execution Pipeline UI:** A highly visual, state-machine-driven SVG timeline combined with Framer Motion animations that gives you granular, real-time transparency into exactly what the AI agent is thinking and doing.
- **Premium Dark-Mode Aesthetic:** A meticulously designed interface focusing on typography, subtle micro-animations, and a distraction-free environment.

### ⚙️ System-Level Engineering
- **Asynchronous Agent Orchestration:** Leveraging **Inngest**, AI inferences are decoupled from the request-response cycle. This ensures the UI remains snappy while handling minute-long LLM generation tasks.
- **End-to-End Type Safety:** Utilizing **tRPC**, types are shared seamlessly from the **Drizzle ORM** database schema all the way to the frontend React components. No more out-of-sync APIs.
- **Monorepo Architecture:** Powered by **Turborepo** and **PNPM**, the codebase is strictly segregated into multiple specialized applications (Marketing, Web App, Authentication, Billing) and shared packages (Database, UI, tRPC routes, Services).
- **Intelligent Polling:** The frontend utilizes smart React Query polling that dynamically adjusts its frequency based on the active state of the AI agent, optimizing both responsiveness and server load.

---

## 🛠️ Tech Stack & Architecture

Indecode is built on a bleeding-edge, robust architecture optimized for scalability, maintainability, and exceptional developer experience.

### Core Stack
- **Framework:** Next.js 15+ (App Router)
- **Language:** TypeScript (Strict Mode)
- **Monorepo Tooling:** Turborepo, PNPM workspaces
- **Styling:** Tailwind CSS, Radix UI primitives, Framer Motion
- **API Layer:** tRPC for strongly-typed client/server communication
- **Database:** PostgreSQL (Neon / Supabase), Drizzle ORM
- **Authentication:** Better-Auth (GitHub Provider)
- **Background Jobs:** Inngest, `@inngest/ai`

### High-Level System Architecture

The monorepo is divided into two primary zones: **Apps** and **Packages**.

#### Apps Directory (`/apps`)
1. **`web`**: The core SaaS application where users manage projects, view the Kanban boards, and monitor the AI execution timeline.
2. **`marketing`**: The highly optimized, SEO-friendly landing page (`indecode.in`).
3. **`auth`**: A dedicated authentication micro-frontend (`auth.indecode.in`) handling GitHub OAuth and onboarding sequences.
4. **`payment`**: A dedicated billing interface for managing Pro subscriptions.

#### Packages Directory (`/packages`)
1. **`database`**: Contains the Drizzle schema, migrations, and database client configuration. Single source of truth for data structures.
2. **`trpc`**: The centralized API router. Contains protected procedures, middleware, and business logic.
3. **`services`**: Contains the Inngest client and background event definitions.

#### The AI Orchestration Flow
When a user clicks "Implement with AI":
1. The frontend fires a `trpc.featureRequest.triggerImplementation` mutation.
2. The tRPC router validates the user's Pro subscription, locks the feature request state, and emits a `feature/implement` event to Inngest.
3. The Inngest background worker picks up the event. It orchestrates a multi-step workflow: fetching GitHub repository contents, generating a PRD via LLM, splitting the PRD into tasks, and systematically executing each task.
4. Throughout this process, the worker updates the PostgreSQL database.
5. The Next.js frontend, via tRPC and React Query, polls the database and updates the UI timeline and Kanban board in real-time.

---

## 🚀 Getting Started

Indecode is designed as a deployment-first SaaS product, heavily reliant on external services. However, if you wish to run it locally or contribute, follow these steps:

### Prerequisites
- Node.js (v20+)
- PNPM (v9+)
- A PostgreSQL instance (e.g., local Docker, Neon, Supabase)
- GitHub OAuth Application (for Auth)
- Inngest Cloud Account or Local Dev Server

### Installation Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/realSUDO/indecode.git
   cd indecode
   ```

2. **Install dependencies:**
   Ensure you are using `pnpm` to respect the workspace configuration.
   ```bash
   pnpm install
   ```

3. **Environment Configuration:**
   Copy the example environment files in the respective apps and packages. You will need to configure:
   - `DATABASE_URL` (in `@repo/database`)
   - `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET` (in `@repo/auth-core`)
   - `BETTER_AUTH_SECRET` (in `@repo/auth-core`)
   - `INNGEST_EVENT_KEY` & `INNGEST_SIGNING_KEY` (in `@repo/services`)

4. **Database Migrations:**
   Push the Drizzle schema to your PostgreSQL database.
   ```bash
   cd packages/database
   pnpm db:push
   ```

5. **Start the Development Server:**
   Boot up all applications simultaneously using Turborepo.
   ```bash
   pnpm dev
   ```
   - Marketing: `http://localhost:3000`
   - Web App: `http://localhost:3003`
   - Auth: `http://localhost:3002`

---

## 🧠 Design & Product Decisions

- **Domain-Level Cookies:** To create a magical onboarding experience, user intent (e.g., typing a feature on the landing page) is preserved using a top-level domain cookie (`.indecode.in`). When the user redirects to `auth.indecode.in` and finally lands on the app (`in.indecode.in`), the context is perfectly restored.
- **Elimination of "Theme Toggles":** In a bold design choice, Indecode strictly enforces a highly polished, unified Dark Mode across all subdomains. This guarantees a consistent, premium aesthetic and reduces CSS overhead.
- **Kanban over Lists:** Initially implemented as a vertical list, the task view was redesigned into a 3-column Kanban board to provide users with a recognizable, project-management-style interface that immediately communicates progress.

---

## 🗺️ Roadmap & Future Improvements

While Indecode is highly functional, the vision extends much further:

- [ ] **Interactive PRD Refinement:** Introduce a chat interface allowing users to converse with the AI to refine the PRD before the implementation phase begins.
- [ ] **Custom Agent Personas:** Allow engineering teams to upload their own `.indecode` config files to dictate architectural guidelines, coding standards, and preferred libraries.
- [ ] **Multi-Branch Management:** Enable the AI to manage long-lived feature branches, automatically rebasing against `main` and resolving merge conflicts.
- [ ] **Automated Testing Integration:** Expand the AI's capabilities to not only write code but autonomously run Jest/Vitest suites and iterate until tests pass.

---

## 👤 Credits & Author

Engineered with focus, precision, and a passion for developer tools.

- **GitHub:** [github.com/realSUDO/indecode](https://github.com/realSUDO/indecode)
- **LinkedIn:** [linkedin.com/in/realsudo](https://linkedin.com/in/realsudo)
- **X (Twitter):** [x.com/sudo_core](https://x.com/sudo_core)
- **Email:** sumitomvishwkarma@gmail.com

---
*Built for the future of software development. Copyright © 2026 Indecode.*
