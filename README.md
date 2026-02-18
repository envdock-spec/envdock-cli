# EnvDock CLI

<div align="center">

**Stop sharing `.env` files on Slack.**




Secure, synchronized, and runtime-injected secrets for developers and teams.

**[Get Started for Free](https://envdock.cloud)** • **[Read the Documentation](https://envdock.cloud/docs)**

</div>

---

## 🚀 Why EnvDock?

Managing secrets is broken. You have `.env.local`, `.env.production`, and sensitive keys pasted in chat history. **EnvDock fixes this.**

* **⚡ Zero-Config Runtime Injection:** We inject secrets directly into `process.env` at boot time. No `.env` files are ever written to your disk.
* **🔮 Universal Framework Support:** We automatically detect **React, Next.js, Vite, and Python** and inject the required prefixes (`REACT_APP_`, `NEXT_PUBLIC_`) instantly.
* **🔒 Bank-Grade Security:** Secrets are encrypted AES-256 at rest and in transit.
* **👥 Team Sync:** Add a variable, and your whole team gets it instantly. No more "Can you send me the new API key?"

---

## 🔮 The Magic: Universal Injection

EnvDock is smart. You store your secret **once**, and we format it for whatever framework you are running.

**In EnvDock Dashboard:** `API_URL=https://api.example.com`

| If you run... | We inject... | You access it via... |
| --- | --- | --- |
| **Node / Express** | `API_URL` | `process.env.API_URL` |
| **Next.js** | `NEXT_PUBLIC_API_URL` | `process.env.NEXT_PUBLIC_API_URL` |
| **React (CRA)** | `REACT_APP_API_URL` | `process.env.REACT_APP_API_URL` |
| **Vite** | `VITE_API_URL` | `import.meta.env.VITE_API_URL` |
| **Python** | `API_URL` | `os.getenv('API_URL')` |

---

## 📦 Installation

```bash
npm install -g envdock-cli

```
WARN envdock-cli@1.0.0 should be installed with -g

---

## ⚡ Quick Start

### 1. Login

Authenticate securely via your browser.

```bash
edk login
# Opens your browser to authenticate...
# Success! Logged in as user@example.com

```

### 2. Link Directory

Connect your local project folder to an EnvDock project.

```bash
cd my-cool-app
edk link
# ? Select a project: My Cool App
# ✔ Linked current directory to project ID: 65a...

```

### 3. Run!

Stop running `npm start`. Run your app through EnvDock to inject secrets automatically.

```bash
edk run npm start
# ✔ Injecting 14 secrets into process (Environment: development)
# > next dev
# ready - started server on 0.0.0.0:3000...

```

---

## 🛠 Command Reference

### 🔐 Setup & Authentication

#### `edk login`

Opens a browser window to authenticate your CLI session.

* **Usage:** `edk login [email]`
* **Example:** `edk login` (Browser) or `edk login user@mail.com` (Manual)

#### `edk link`

Links the current working directory to a project in the EnvDock cloud. Creates a `.envdock/config.json` file.

* **Result:** Interactive menu to select your project.

#### `edk status`

Checks the current link status and user session.

* **Flags:** `-e, --env <env>` (Check specific environment status)
* **Output:**
```text
User:    dev@company.com
Project: Frontend-Dashboard (Linked)
Env:     Development
Secrets: 15 active

```



---

### 💻 Development Workflow

#### `edk run <command...>`

**The Hero Command.** Fetches secrets into memory and runs your command.

* **Flags:** `-e, --env <env>` (Default: `development`)
* **Examples:**
```bash
# Run in development (default)
edk run npm run dev

# Run in production mode
edk run -e production node server.js

# Run a python script
edk run python3 main.py

```



#### `edk pull`

**Legacy Mode.** Downloads secrets to a local `.env` file. Use this only if you cannot use `edk run`.

* **Flags:** `-e, --env <env>`
* **Result:** Creates a `.env` file in the current directory.

#### `edk push`

Uploads your local `.env` file to the cloud. Perfect for migrating existing projects.

* **Flags:**
* `-e, --env <env>` (Target environment, e.g., `production`)
* `-f, --file <path>` (Source file, default `.env`)


* **Example:**
```bash
edk push -f .env.local -e production
# ✔ Parsed 12 secrets from .env.local
# ✔ Encrypted and pushed to Production
# ✔ New version created: v14

```



---

### 🛡 Management & Governance

#### `edk versions`

View the version history of your secrets.

* **Flags:** `-e, --env <env>`
* **Output:**
```text
v14  (Current)  Updated by: You          2 mins ago
v13             Updated by: Alex         1 day ago
v12             Updated by: CI-Bot       2 days ago

```



#### `edk history`

View the audit log. See exactly who changed what.

* **Output:**
```text
[PUSH]   user@corp.com pushed 5 secrets to Production  (10m ago)
[VIEW]   alex@corp.com revealed secrets in Dashboard   (2h ago)
[TOKEN]  CI-Bot fetched secrets for Deployment         (5h ago)

```



#### `edk team`

Manage collaborators directly from the terminal.

* **Commands:**
* `edk team ls` - List all members.
* `edk team add <email>` - Add a new member.
* `edk team remove <email>` - Revoke access.



---

### 🤖 CI/CD Automation

#### `edk tokens`

Manage Service Tokens for GitHub Actions, Vercel, or Jenkins.

* **Commands:**
* `edk tokens create <name>` - Generate a new token.
* `edk tokens ls` - List active tokens.
* `edk tokens revoke <id>` - Invalidate a token.



#### **GitHub Actions Example**

1. Generate a token: `edk tokens create github-actions`
2. Add it to GitHub Secrets as `ENVDOCK_TOKEN`.
3. Update your workflow:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install EnvDock
        run: npm install -g envdock-cli
      
      - name: Build with Secrets
        env:
          ENVDOCK_TOKEN: ${{ secrets.ENVDOCK_TOKEN }}
        run: |
          # Injects secrets into the build process automatically
          edk run -e production npm run build

```

---

## ⚙️ Configuration

#### `edk config`

View or update local CLI settings.

* **Usage:** `edk config [key] [value]`
* **Example:** `edk config set default_env production`

#### `edk whoami`

Displays the currently authenticated user and tier.

#### `edk logout`

Clears local credentials and removes the session token.

---

## 📄 License

MIT © [EnvDock](https://envdock.cloud)

<div align="center">
<sub>Built for developers who value security and speed.</sub>
</div>
