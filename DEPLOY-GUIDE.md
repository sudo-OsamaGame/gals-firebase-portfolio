# Portfolio — setup and deploy

Step-by-step guide for this Firebase Hosting site (`public/` is what gets published).

---

## 1. Install Node.js (includes `npm`)

You need this on your Mac **once**.

1. Open [https://nodejs.org](https://nodejs.org) and download the **LTS** macOS installer (`.pkg`).
2. Run the installer and finish with the default options.
3. **Quit Cursor completely** and open it again so the terminal sees `node` and `npm`.

**Check in Cursor’s terminal (or Terminal.app):**

```bash
node -v
npm -v
```

You should see version numbers, not `command not found`.

---

## 2. Open the project and install CLI dependencies

```bash
cd "/Users/galnakel/Desktop/גליום/portfolio/portfolio- cursor"
npm install
```

This installs **`firebase-tools`** locally (for `firebase deploy`). It is **not** the same as the Firebase JS SDK in the browser (that loads from Google’s CDN in `public/js/firebase-init.js`).

---

## 3. Log in to Firebase (browser, one time per machine)

The `firebase` command is **not** installed globally unless you chose that yourself, so use **`npx`** from this folder:

```bash
cd "/Users/galnakel/Desktop/גליום/portfolio/portfolio- cursor"
npx firebase-tools login
```

- A browser window opens → choose the Google account that owns **gals-portfolio** → allow access.
- When the terminal says login succeeded, you are done with this step.

**Alternative (same effect):**

```bash
./node_modules/.bin/firebase login
```

**Do not rely on** typing `firebase login` alone unless you installed the CLI globally (`npm install -g firebase-tools`).

---

## 4. Confirm the Firebase project

This repo already points at **`gals-portfolio`** via `.firebaserc`. To double-check:

```bash
npx firebase-tools projects:list
```

You should see `gals-portfolio` in the list.

---

## 5. Deploy to live Hosting

From the project root:

```bash
npm run deploy
```

That runs `firebase deploy --only hosting`. When it finishes, the output shows your live URLs (for example `https://gals-portfolio.web.app` and `https://gals-portfolio.firebaseapp.com`).

---

## 6. After you change the site

1. Edit files under **`public/`** (HTML, CSS, JS, images in `public/media/`, copy in `public/js/projects.json`).
2. Run again:

```bash
npm run deploy
```

---

## 7. Optional: preview without deploying

```bash
npm run serve
```

Then open the URL the emulator prints (often `http://127.0.0.1:5000`).

---

## 8. Optional: automated browser checks (Playwright)

After `npm install`, install the browser once:

```bash
npx playwright install chromium
```

Run tests (default URL is the live site):

```bash
npm run test:e2e
```

Against the local emulator:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5000 npm run test:e2e
```

---

## 9. Optional: deploy without a browser (CI or agents)

1. On a machine where you are already logged in:

   ```bash
   npx firebase-tools login:ci
   ```

2. Copy the token and set the environment variable **`FIREBASE_TOKEN`** (never commit it). Then `npm run deploy` uses that token instead of an interactive login.

---

## 10. If Cursor’s agent cannot run `npm run deploy`

Some agent terminals do not inherit your Mac’s full `PATH`, so they may not see `node`. Fix it on the Mac side (Node in `/usr/local/bin` after the official installer, restart Cursor, or launch Cursor from a terminal where `node -v` works). Deploying from **your** terminal with the steps above always works once Node and login are set up.

---

## Quick reference

| Goal              | Command |
|-------------------|--------|
| Install deps      | `npm install` |
| Log in            | `npx firebase-tools login` |
| Deploy live       | `npm run deploy` |
| Local preview     | `npm run serve` |
| Browser E2E tests | `npm run test:e2e` |
