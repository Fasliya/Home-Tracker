# Household Ledger

A family expense, income, and budget tracker. Built with React + Vite. Data is saved
in your phone's browser storage, so it stays on your device between visits.

## Deploy it for free (no coding required) — recommended path

**Step 1 — Put this folder on GitHub**
1. Go to https://github.com and create a free account if you don't have one.
2. Click the "+" in the top right → "New repository". Name it `household-ledger`, keep it Public, and click "Create repository".
3. On the new repo's page, click "uploading an existing file".
4. Drag this entire `household-ledger` folder's contents (not the folder itself — its contents) into the browser window, then click "Commit changes".

**Step 2 — Deploy on Vercel**
1. Go to https://vercel.com and sign up using your GitHub account.
2. Click "Add New" → "Project".
3. Select your `household-ledger` repository and click "Import".
4. Vercel automatically detects this is a Vite app — just click "Deploy".
5. After about a minute, you'll get a live link like `household-ledger.vercel.app`.

## Add it to your phone's home screen

1. Open your live link in **Chrome** (Android) or **Safari** (iPhone).
2. **Android/Chrome:** tap the ⋮ menu → "Add to Home screen".
   **iPhone/Safari:** tap the Share icon → "Add to Home Screen".
3. It now appears as an app icon and opens full-screen, just like a normal app.

## Alternative: Netlify Drop (if you have Node.js on your computer)

If you have Node.js installed on a laptop/desktop:
```
npm install
npm run build
```
This creates a `dist` folder. Go to https://app.netlify.com/drop and drag that `dist`
folder in — you'll get a live link instantly, no GitHub needed.

## Notes

- Your data lives in your browser's local storage on whichever device/browser you use.
  It does **not** sync between your phone and a computer automatically.
- If you ever clear your browser data/cache for this site, your entries will be lost —
  there's no cloud backup in this version.
