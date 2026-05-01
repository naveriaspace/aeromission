# AeroMission — Naveria Internal Mission Manager

Aerospace UAV mission planning tool with Gantt charts, resource tracking, and Google Drive/Calendar sync.

---

## Deployment to GitHub Pages + mission.naveria.space

### 1. Create GitHub Repository

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/<your-org>/aeromission.git
git push -u origin main
```

### 2. Enable GitHub Pages

- Go to your repo → **Settings → Pages**
- Source: **Deploy from a branch**
- Branch: `main` / `(root)`
- Click **Save**
- GitHub will give you a URL like `https://<org>.github.io/aeromission`

### 3. Add Custom Domain

- In **Settings → Pages → Custom domain**, enter:
  ```
  mission.naveria.space
  ```
- Enable **Enforce HTTPS**
- In your DNS provider (wherever naveria.space is managed), add:
  ```
  Type:  CNAME
  Name:  mission
  Value: <your-github-username>.github.io
  ```
- Wait 5–30 minutes for DNS propagation

---

## Google Cloud Console Setup

### 4. Enable APIs

Go to [console.cloud.google.com](https://console.cloud.google.com) → project **naveriagantt**:

- **APIs & Services → Library** → enable:
  - `Google Drive API`
  - `Google Calendar API`

### 5. Configure OAuth Client

- **APIs & Services → Credentials → OAuth 2.0 Client ID** (the web client)
- Add to **Authorized JavaScript origins**:
  ```
  https://mission.naveria.space
  ```
- Save

### 6. Create & Restrict API Key

- **APIs & Services → Credentials → + Create Credentials → API Key**
- Edit the key:
  - **Application restrictions:** HTTP referrers
  - Add: `https://mission.naveria.space/*`
  - **API restrictions:** Restrict to:
    - Google Drive API
    - Google Calendar API
- Copy the key — you'll need it in the app

### 7. Publish OAuth Consent Screen

- **APIs & Services → OAuth consent screen**
- Add `naveria.space` to **Authorized domains**
- Click **Publish App** (removes 100-user testing limit)

---

## First-time App Setup (in browser)

Once deployed to `mission.naveria.space`:

1. Open the app — you'll see the sign-in screen
2. Click **Configure API credentials**
3. Enter:
   - **OAuth Client ID:** `732243213522-mchnbdj1r8ofnml8isaklrjqov94f3lu.apps.googleusercontent.com`
   - **API Key:** *(paste the key you created in step 6)*
   - **Master Drive File ID:** leave blank on first use — the app will create one automatically on first save
4. Click **Save Settings**
5. Click **Sign in with Google**
6. On first save, a file called `AeroMission_Data.json` will be created in your Google Drive
7. Copy that file's ID from the URL and paste it back into Settings → Master Drive File ID
8. Share that Drive file with all team members who need access

---

## Access Control

- Only Google accounts with access to the Drive file can use the app
- Share the Drive file with specific accounts via Google Drive sharing
- Revoke access by removing them from Drive sharing
- Non-Google email users cannot sign in

---

## Files

```
index.html          ← Main app shell + all React components
gantt.jsx           ← Gantt chart engine (SVG, drag, critical path)
missions.jsx        ← Mission sidebar + data model
resources.jsx       ← Resource allocation panel + heatmap
app.jsx             ← Dashboard, Calendar, modals
tweaks-panel.jsx    ← In-app tweaks UI (auto-generated)
gdrive.js           ← Google Drive/Calendar helpers (reference)
README.md           ← This file
```

---

## Tech Stack

- Pure HTML + React 18 (via Babel CDN) — no build step
- Google Identity Services (GIS) for OAuth
- Google Drive API v3 for data sync
- Google Calendar API v3 for calendar integration
- All state stored in a single JSON file on Google Drive
