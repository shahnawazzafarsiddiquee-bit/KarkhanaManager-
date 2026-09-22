# Karakhana Manager

Garment factory ledger web app. Har factory owner apne email se sign up karke,
apne business ke naam se **Karigar** (worker) aur **Vyapari** (trader) ka poora
hisaab rakh sakta hai. Data Firebase (Firestore) mein private rehta hai — sirf
aapka account hi apna data dekh sakta hai.

No build step, no framework — plain HTML/CSS/JS, Firebase compat SDK + jsPDF,
sab CDN se load hota hai. Kisi bhi static host (GitHub Pages, Netlify, Firebase
Hosting) pe seedha deploy ho jaata hai.

## Files

```
index.html              Auth screens + app shell + all modals
css/style.css            Theme (dark/light) + responsive layout
js/firebase-config.js    Firebase init (PASTE YOUR CONFIG HERE)
js/utils.js              Shared helpers (currency, date, toast, escaping)
js/db.js                 Firestore CRUD, scoped to businesses/{uid}
js/theme.js               Dark/light toggle (localStorage)
js/pdf.js                 jsPDF: karigar statement + vyapari challan
js/karigar.js              Karigar module (list, ledger, calculations, WhatsApp, PDF)
js/vyapari.js               Vyapari module (list, statuses, filters, PDF challan)
js/dashboard.js              Dashboard stat cards
js/backup.js                  JSON export/import
js/auth.js                     Sign up / sign in / logout / forgot password
js/app.js                       Bootstraps everything, routing, auth-state wiring
manifest.json                   PWA manifest
sw.js                             Minimal service worker (offline app shell cache)
icons/icon.svg, icon-192.png, icon-512.png   App icons (placeholders - swap with your logo)
firestore.rules                   Sample Firestore security rules
```

## Features

**Auth (Email/Password only, no phone/OTP)**
- Sign Up: Business Name, Owner Name, Email, Password
- Sign In, Logout, Forgot Password (email reset link)
- Business name shown in header, PDFs, WhatsApp messages

**Karigar module**
- Add / edit / delete karigars (name, phone, default rate)
- Daily work log (date, pieces, rate, advance/kharchi, note)
- Sample work (date, qty, rate, note)
- Payments to karigar (date, amount, note)
- Auto-calculated: work earnings, sample earnings, total earnings, remaining,
  Paid/Unpaid status
- Search + filter (All / Unpaid)
- WhatsApp summary share, PDF statement with your business letterhead

**Vyapari module**
- Trader, fabric, lot pieces, rate/piece, sizes, color-wise meters, total
  meters, color, design, due date, notes
- Delivery status (pending/delivered), lot-received (+date/note),
  payment-received-from-vyapari (+date/note)
- Search + filter (All / Pending / Overdue)
- PDF challan with letterhead + LOT/PAYMENT status stamps + signature lines

**Other**
- Dashboard with totals (karigars, pieces this month, payable, vyapari
  pending/overdue)
- Dark / light theme, mobile-responsive
- JSON export/import backup
- Works as an installable PWA (offline app shell)

---

## 1. Create a Firebase project

1. Go to <https://console.firebase.google.com> → **Add project** → give it a
   name (e.g. `karakhana-manager`) → finish the wizard.
2. In the project, click the **web icon (`</>`)** under "Get started by adding
   Firebase to your app" → register an app (any nickname) → Firebase will show
   you a `firebaseConfig` object. Keep that tab open.

## 2. Enable Email/Password auth

Firebase console → **Build → Authentication → Get started → Sign-in method**
→ enable **Email/Password** → Save.

## 3. Create Firestore

Firebase console → **Build → Firestore Database → Create database** → start
in **production mode** → pick a region close to your users → Enable.

Then open the **Rules** tab and replace the default rules with the contents
of [`firestore.rules`](./firestore.rules) from this project, then **Publish**.

## 4. Paste your firebaseConfig

Open `js/firebase-config.js` and replace every `"REPLACE_ME_..."` value with
the real values from step 1:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "karakhana-manager.firebaseapp.com",
  projectId: "karakhana-manager",
  storageBucket: "karakhana-manager.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
};
```

Save the file. That's the only code change needed to go live.

## 5. Deploy to GitHub Pages

1. Push this folder's contents to a GitHub repository (root of the repo, or a
   `docs/` folder — either works).
2. Repo → **Settings → Pages** → Source: **Deploy from a branch** → pick your
   branch and the folder that contains `index.html` → Save.
3. GitHub gives you a URL like `https://<username>.github.io/<repo>/`. Open it
   — you should see the Sign In / Sign Up screen.

> Firebase Auth needs your Pages domain to be authorized: Firebase console →
> Authentication → Settings → **Authorized domains** → add
> `<username>.github.io` (it's usually added automatically, but check if
> sign-in fails with a domain error).

## 6. Build the Android APK and AAB

`.github/workflows/build-android.yml` wraps the deployed site as a Trusted
Web Activity with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)
and produces both files. Run it from **Actions → Build Android APK & AAB →
Run workflow**; it attaches `karakhana-manager.apk` and
`karakhana-manager.aab` to the `latest` release.

`twa-manifest.json` holds the app's identity — package id, name, colors,
`startUrl`. The version code comes from the workflow run number, so every
run is a higher version than the last, which is what Play requires.

### Signing secrets

Add these under **Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | the keystore as one line of base64 (~3700 characters) |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_PASSWORD` | key password |

The keystore itself is never committed. To create one and print the base64:

```
keytool -genkeypair -v -keystore upload-keystore.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 upload-keystore.jks
```

Keep `upload-keystore.jks` and its password backed up somewhere safe. Lose
them and you can never ship an update to the same Play listing.

`.well-known/assetlinks.json` carries the SHA-256 fingerprint of that
certificate, which is how Android verifies the app owns the site and drops
the browser address bar. Change the signing key and the fingerprint there
must change too:

```
keytool -list -v -keystore upload-keystore.jks -alias upload | grep SHA256
```

`.nojekyll` is what makes GitHub Pages serve that dot-directory at all.

> Running the workflow with **use test key** checked signs with a key
> generated inside the run. That is only for checking the build works — the
> artifacts are not published and cannot be updated later.

## 7. Publish the AAB to Google Play

1. Create a Google Play Console account (one-time $25 registration) at
   <https://play.google.com/console>.
2. Create a new app → fill in store listing (title, description, screenshots,
   privacy policy URL, etc. — required by Play Store).
3. **Production → Create new release** → upload `karakhana-manager.aab` from
   the `latest` release → fill release notes → **Review release** →
   **Start rollout**.
4. Play Store review typically takes a few hours to a few days.

This last step is manual on Google's side and can't be automated — Play
Console requires your own developer account and human review.

> With Play App Signing, Google re-signs the app with its own key, so the
> fingerprint in `.well-known/assetlinks.json` must be replaced with the one
> Play Console shows under **Setup → App signing**. Until then the installed
> app still works, but it shows the browser address bar.

---

## Test checklist: Sign Up → Karigar → Vyapari → PDF

1. Open the deployed URL → **Sign Up** tab → fill Business Name, Owner Name,
   Email, Password → Submit. You land on the Dashboard, header shows your
   business name.
2. **Karigar tab → + Naya Karigar** → enter a name → Save. Click the karigar
   card to open their ledger.
3. In **Daily Work** tab, add a row (date, pieces, rate, advance) → it appears
   in the table and the summary numbers update instantly.
4. Click **📄 PDF Statement** → a PDF downloads with your business letterhead,
   the work table, and the earnings/remaining summary.
5. Click **📱 WhatsApp** → opens WhatsApp with a pre-filled summary message
   (you still have to hit Send yourself — WhatsApp doesn't allow silent
   auto-sending from a web page).
6. **Vyapari tab → + Naya Vyapari** → fill trader/fabric/lot details, tick
   "Lot Received" and/or "Payment Received" with dates → Save.
7. Reopen that vyapari card → **📄 PDF Challan** → downloads a PDF with
   letterhead, lot details, and green "DONE"/red "PENDING" status stamps.
8. **Backup tab → Export JSON** → downloads your full business data as a
   `.json` file. Try **Import JSON** with that same file on another account to
   confirm restore works.
9. Toggle the 🌙/☀️ button in the header to confirm dark/light theme, and
   resize the browser (or open on a phone) to confirm the layout stays usable.

## Notes / known limits

- **WhatsApp share** opens `wa.me` with the message pre-filled; actually
  sending still requires the user to tap Send inside WhatsApp (this is a
  WhatsApp platform restriction, not something a web app can bypass).
- **Offline mode**: the service worker caches the app shell (HTML/CSS/JS) for
  offline loading, but live data always comes from Firestore — without
  internet you can view the last-loaded data via Firestore's own local cache,
  but new writes sync once you're back online.
- Deleting a karigar also deletes their work log / sample work / payment
  history — this is intentional (Delete is a destructive action with a
  confirm prompt).
