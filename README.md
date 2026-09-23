# Karakhana Manager

Garment factory ledger web app. Pehli baar kholne pe sirf **Business Name**
aur **Aapka Naam** poochta hai — koi login ya password nahi. Uske baad
**Karigar** (worker) aur **Vyapari** (trader) ka poora hisaab rakhiye.

**Data sirf isi phone/browser mein save hota hai** (localStorage). Kisi server
pe copy nahi jaati, isliye **Backup** tab se JSON file download karke rakhte
rahiye — phone badalne ya app hatne pe wahi file Import karke sab wapas aata hai.

No build step, no framework, no backend — plain HTML/CSS/JS + jsPDF from a
CDN. Kisi bhi static host (GitHub Pages, Netlify) pe seedha deploy ho jaata hai.

## Files

```
index.html              Setup screen + app shell + all modals
css/style.css            Theme (dark/light) + responsive layout
js/utils.js              Shared helpers (currency, date, toast, escaping)
js/store.js              On-device data store (localStorage) + shared state
js/profile.js            Business name / owner name setup and editing
js/theme.js               Dark/light toggle
js/pdf.js                 jsPDF: karigar statement, vyapari challan, hisaab report
js/karigar.js              Karigar module (list, ledger, calculations, WhatsApp, PDF)
js/vyapari.js               Vyapari module (lot value, payments received, filters, PDF challan)
js/dashboard.js              Home: month ka hisaab (munafa), stat cards, backup reminder
js/kharcha.js                 Factory kharcha (expenses) by month and category
js/report.js                  Hafte/mahine ka karigar hisaab (WhatsApp + PDF)
js/backup.js                  Backup share/download + import
js/app.js                       Bootstraps everything and routing
manifest.json                   PWA manifest
sw.js                             Minimal service worker (offline app shell cache)
icons/icon.svg, icon-192.png, icon-512.png   App icons (placeholders - swap with your logo)
```

## Features

**Setup**
- First launch asks only Business Name and your name; ✏️ in the header edits them
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

**Karigar hisaab report** (Karigar tab → 📊 Hisaab)
- Is hafta / Pichhla hafta / Is mahina / Pichhla mahina, ya apni dates
- Har karigar: pieces, kamai, kharchi, diya, aur kul baaki (shuru se ab tak)
- Total row, WhatsApp share, PDF

**Vyapari module**
- Trader, fabric, lot pieces, **ek piece ka rate**, sizes, color-wise meters,
  total meters, color, design, due date, notes
- Lot value apne aap: `50 pcs × ₹80 = ₹4,000` — card aur challan dono pe dikhta hai
- Vyapari se mila paisa: kitni bhi baar (date, amount, note) → Mila / Baaki
- Delivery status (pending/delivered), lot-received (+date/note)
- Search + filter (All / Pending / Overdue / Baaki)
- PDF challan with letterhead, lot value, payments list, LOT/PAYMENT stamps,
  signature lines

**Kharcha + Munafa**
- Kharcha tab: kiraya, bijli, dhaga/maal, machine repair, chai-nashta, transport,
  staff salary, other — month-wise total aur category-wise
- Home pe "Mahine ka hisaab": vyapari se mila − karigar ko diya − kharcha = munafa
  (jis mahine paisa aaya/gaya usi mahine mein ginti)

**Backup**
- 📤 Backup bhejein: phone ka share sheet (WhatsApp / Drive / email) pe seedha file
- Download aur Import bhi (import purane data ke saath jud jaata hai)
- 7 din se backup nahi liya to Home pe yaad dilata hai

**Other**
- Dashboard: karigar ko dena baaki, vyapari se lena baaki, pending/overdue lots
- Dark / light theme, mobile-responsive
- Works as an installable PWA (offline app shell)

---

## 1. Deploy to GitHub Pages

1. Push this folder's contents to a GitHub repository (root of the repo, or a
   `docs/` folder — either works).
2. Repo → **Settings → Pages** → Source: **Deploy from a branch** → pick your
   branch and the folder that contains `index.html` → Save.
3. GitHub gives you a URL like `https://<username>.github.io/<repo>/`. Open it
   — you should see the Business Name / Aapka Naam screen.

## 2. Build the Android APK and AAB

`.github/workflows/build-android.yml` wraps the deployed site as a Trusted
Web Activity with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)
and produces both files. Run it from **Actions → Build Android APK & AAB →
Run workflow**; it attaches `karakhana-manager.apk` and
`karakhana-manager.aab` to the `latest` release.

`twa-manifest.json` holds the app's identity — package id, name, colors,
`startUrl`. The version code comes from the workflow run number, so every
run is a higher version than the last, which is what Play requires.

### Signing key (one-time setup)

The app's permanent upload key is created **inside GitHub Actions** and only
its encrypted copy is committed (`signing/upload-keystore.jks.enc`, AES-256
with PBKDF2). Nothing needs to be copied or pasted:

1. **Settings → Secrets and variables → Actions → New repository secret** —
   name `SIGNING_PASSWORD`, value: a password you make up, at least 12
   characters. Type it yourself and keep it somewhere safe; nobody else
   needs to see it.
2. **Actions → Create signing key → Run workflow.** It generates the key,
   encrypts it with that password, commits it, and writes the certificate's
   SHA-256 fingerprint into `.well-known/assetlinks.json`.

After that every **Build Android APK & AAB** run signs with this key.

> **The key and its password are permanent.** Play accepts every update only
> if it is signed with the same key as the first upload. Lose the password
> and you can never update that Play listing. The workflow refuses to
> replace an existing key unless you tick *replace existing* - only ever do
> that before the app is on Play.

`.well-known/assetlinks.json` is how Android verifies the app owns the site
and hides the browser address bar. Android only reads it from the **domain
root** (`https://shahnawazzafarsiddiquee-bit.github.io/.well-known/assetlinks.json`),
not from this repo's `/KarkhanaManager-/` path, so the live copy lives in the
`shahnawazzafarsiddiquee-bit.github.io` repo. The copy here is the one the
signing workflow writes; whenever it changes, copy it to that repo too.
`.nojekyll` is what makes GitHub Pages serve that dot-directory at all.

> Running the workflow with **use test key** checked signs with a key
> generated inside the run. That is only for checking the build works — the
> artifacts are not published and cannot be updated later.

## 3. Publish the AAB to Google Play

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
> SHA-256 that Play Console shows under **Setup → App signing** must be
> **added** to `sha256_cert_fingerprints` in the root `assetlinks.json`
> (keep the upload key's one too, so directly installed APKs still verify).
> Until then the Play Store app works, but it shows the browser address bar.

---

## Test checklist: Setup → Karigar → Vyapari → PDF

1. Open the deployed URL → fill Business Name and Aapka Naam → **Shuru
   Karein**. You land on the Dashboard, header shows your business name.
2. **Karigar tab → + Naya Karigar** → enter a name → Save. Click the karigar
   card to open their ledger.
3. In **Daily Work** tab, add a row (date, pieces, rate, advance) → it appears
   in the table and the summary numbers update instantly.
4. Click **📄 PDF Statement** → a PDF downloads with your business letterhead,
   the work table, and the earnings/remaining summary.
5. Click **📱 WhatsApp** → opens WhatsApp with a pre-filled summary message
   (you still have to hit Send yourself — WhatsApp doesn't allow silent
   auto-sending from a web page).
6. **Vyapari tab → + Naya Vyapari** → fill trader, lot pieces and ek piece ka
   rate (lot value shows live) → Save. Reopen the card → **Paisa mila** form →
   add a payment → Mila / Baaki update, card shows "Baaki ₹…".
7. Reopen that vyapari card → **📄 PDF Challan** → downloads a PDF with
   letterhead, lot value, payments and green "DONE"/red "PENDING" stamps.
8. **Kharcha tab** → add an expense → Home pe "Mahine ka hisaab" mein munafa
   update hota hai. **Karigar tab → 📊 Hisaab** → hafte ka report, PDF/WhatsApp.
9. **Backup tab → 📤 Backup bhejo** (or Download) → your full business data
   as a `.json` file. Open the app in another browser or phone and **Import**
   that file to confirm restore works.
10. Toggle the 🌙/☀️ button in the header to confirm dark/light theme, and
   resize the browser (or open on a phone) to confirm the layout stays usable.

## Notes / known limits

- **WhatsApp share** opens `wa.me` with the message pre-filled; actually
  sending still requires the user to tap Send inside WhatsApp (this is a
  WhatsApp platform restriction, not something a web app can bypass).
- **Data lives on one device.** Nothing is sent to a server, so the app
  works fully offline, but clearing the browser's site data, uninstalling the
  app or losing the phone loses the data. The Backup tab's file is the
  only copy that can survive that - take one regularly.
- Deleting a karigar also deletes their work log / sample work / payment
  history — this is intentional (Delete is a destructive action with a
  confirm prompt).
