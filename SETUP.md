# Setting up the VATSIM Currency Tracker on GitHub Pages

These instructions will get the app live at a permanent URL in about 10 minutes.
You will need a free GitHub account and the two files: `currency-tracker.html` and `README.md`.

---

## Step 1 — Create a GitHub account (skip if you already have one)

1. Go to **https://github.com**
2. Click **Sign up** in the top-right corner
3. Enter your email, create a password, and choose a username
4. Verify your email address when GitHub sends you a confirmation email
5. On the welcome screens, you can skip all the optional steps — just get to your dashboard

---

## Step 2 — Create a new repository

A repository (repo) is just a folder on GitHub that holds your files.

1. Once logged in, click the **+** icon in the top-right corner of any GitHub page
2. Select **New repository** from the dropdown
3. Fill in the details:
   - **Repository name:** `vatsim-currency-tracker` (or any name you like — this will appear in your URL)
   - **Description:** `VATSIM ATC and pilot currency tracker` (optional)
   - **Visibility:** Select **Public** — GitHub Pages requires public repos on free accounts
   - **Add a README file:** Leave this **unchecked** (you'll upload your own)
   - **Add .gitignore:** Leave as **None**
   - **Choose a license:** Leave as **None**
4. Click **Create repository**

You'll land on an empty repository page with some setup instructions — ignore those for now.

---

## Step 3 — Upload your files

1. On your empty repository page, click **uploading an existing file** (it's a link in the middle of the page)
   - If you don't see that link, click **Add file** → **Upload files** near the top-right

2. A file upload area appears. Drag and drop **both** files onto it:
   - `currency-tracker.html`
   - `README.md`

   Or click **choose your files** and select them both together using Ctrl+Click (Windows) or Cmd+Click (Mac)

3. Wait for both files to appear with green checkmarks in the upload list

4. Scroll down to the **Commit changes** section at the bottom:
   - The first box says "Add files via upload" — you can leave this as is, or change it to something like "Initial upload"
   - Leave everything else as default
   - Click **Commit changes**

5. You'll be taken back to your repository page and should now see both files listed

---

## Step 4 — Enable GitHub Pages

This is the step that turns your repository into a live website.

1. Click the **Settings** tab near the top of your repository page (it has a gear icon)

2. In the left sidebar, scroll down and click **Pages**
   - It's under the **Code and automation** section

3. Under **Source**, click the dropdown that says **None** and select **Deploy from a branch**

4. A second dropdown appears for the branch. Click it and select **main**

5. Leave the folder dropdown set to **/ (root)**

6. Click **Save**

7. The page will refresh. At the top you'll see a message:
   > "Your site is live at https://YOUR-USERNAME.github.io/vatsim-currency-tracker/"
   
   If you don't see this immediately, wait 60–90 seconds and refresh the page — GitHub takes a moment to build the site the first time.

---

## Step 5 — Find your live URL

Your app is now live at:

```
https://YOUR-USERNAME.github.io/REPOSITORY-NAME/currency-tracker.html
```

For example, if your GitHub username is `jsmith` and you named the repo `vatsim-currency-tracker`, the URL is:

```
https://jsmith.github.io/vatsim-currency-tracker/currency-tracker.html
```

To confirm it's working:
1. Open the URL in your browser
2. You should see the Currency Tracker welcome screen
3. Enter your VATSIM CID and click Load data

---

## Step 6 — Share the link

Copy your URL and share it with anyone you want to give access to. When they open it, they enter their own VATSIM CID and the app loads their own data. Your data is never visible to them — everything is stored locally in each person's own browser.

---

## Updating the app in future

When a new version of `currency-tracker.html` is available:

1. Go to your repository on GitHub
2. Click on `currency-tracker.html` in the file list
3. Click the **pencil icon** (Edit) — or if it's a large update, use the upload method below
4. For uploading a new version:
   - Click **Add file** → **Upload files**
   - Upload the new `currency-tracker.html`
   - When it asks about the existing file, it will just replace it
   - Click **Commit changes**
5. GitHub Pages usually updates within 1–2 minutes

---

## Troubleshooting

**The page shows a 404 error**
- Double-check the URL — make sure it includes `/currency-tracker.html` at the end
- Wait another minute and try again — Pages can take up to 5 minutes on the first deploy
- Go back to Settings → Pages and confirm the source is set to the `main` branch

**"Could not load data" error when entering a CID**
- This means the app is still being opened as a `file://` link, not from the GitHub Pages URL
- Make sure you're using the `https://username.github.io/...` URL, not a local file

**The site shows the README instead of the app**
- GitHub Pages serves `index.html` automatically, but your file is named `currency-tracker.html`
- Make sure the full URL includes `/currency-tracker.html`
- Alternatively, rename the file to `index.html` before uploading — then the base URL works without specifying the filename

**Changes aren't showing after an update**
- GitHub Pages caches aggressively. Try a hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or open in a private/incognito window

---

## Optional: rename to index.html for a cleaner URL

If you want a cleaner URL without the filename at the end, rename `currency-tracker.html` to `index.html` before uploading. Then your URL becomes simply:

```
https://YOUR-USERNAME.github.io/vatsim-currency-tracker/
```

GitHub Pages serves `index.html` automatically when no filename is specified.
