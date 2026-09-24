# Play Store listing – Karakhana Manager

Is folder mein Play Console ke liye sab kuch taiyar hai. Neeche wala text copy-paste karo.

## Files

| File | Play Console mein kahan |
|---|---|
| `icon-512.png` | Store listing → App icon (512 x 512) |
| `feature-graphic-1024x500.png` | Store listing → Feature graphic |
| `screenshots/01 … 06` | Store listing → Phone screenshots (sabhi 6 daalo) |
| `karakhana-manager.aab` | Release → Create new release → App bundles |

AAB ka seedha link (har build ke baad yahi rehta hai):

```
https://github.com/shahnawazzafarsiddiquee-bit/KarkhanaManager-/releases/download/latest/karakhana-manager.aab
```

Phone par install karne wala APK:

```
https://github.com/shahnawazzafarsiddiquee-bit/KarkhanaManager-/releases/download/latest/karakhana-manager.apk
```

## Store listing text

**App name** (30 akshar tak)

```
Karakhana Manager
```

**Short description** (80 akshar tak)

```
Garment factory ledger: karigar, vyapari, hazri, kharcha aur munafa ka hisaab.
```

**Full description**

```
Karakhana Manager is a simple ledger for garment factories and tailoring units. Keep the full hisaab of your karigars (workers) and vyaparis (traders) on your phone – no login, no internet needed.

KARIGAR
• Daily work: pieces, rate, advance / kharchi – earnings calculate apne aap
• Sample work and payments, Paid / Unpaid status
• Hazri: Present / Half day / Absent, "Sabko Present" ek tap mein, mahine ki hazri table
• Maal diya / wapas aaya: kitne pcs karigar ke paas hain
• Hafte / mahine ka hisaab report – WhatsApp aur PDF

VYAPARI
• Lot: pieces × rate = lot value, sizes, colours, design, due date
• Vyapari se mila paisa – kitni bhi baar, Mila / Baaki
• Kapda stock: kitne meter aaya, kata, bacha
• PDF challan with your business letterhead and logo
• WhatsApp pe baaki paise ka reminder

KHARCHA & MUNAFA
• Kiraya, bijli, dhaga, machine repair, chai-nashta, salary – month-wise
• Home pe mahine ka munafa aur pichhle 6 mahine ka graph
• Poora hisaab PDF ek hi file mein
• Delivery kal / aaj / late ho gayi – Home pe yaad dilata hai

SAFE & PRIVATE
• 4 digit PIN lock
• Data sirf aapke phone mein – kisi server pe nahi jaata
• Backup file WhatsApp / Drive pe bhejo, naye phone mein Import karo
• Dark / light theme
```

**Release notes** (pehli release)

```
First release: karigar, vyapari, hazri, maal, kharcha, munafa, PDF challan aur WhatsApp hisaab.
```

**Category:** Business  **Tags:** Business, Accounting

**Privacy policy URL** (PR merge hone ke baad chalega):

```
https://shahnawazzafarsiddiquee-bit.github.io/KarkhanaManager-/privacy.html
```

**Contact details** (Store settings → Store listing contact details): Email `mh66152@gmail.com`, Phone `+91 78610 22592`

## App content (Policy → App content) ke jawab

| Form | Jawab |
|---|---|
| Privacy policy | Upar wala link |
| Ads | No, my app does not contain ads |
| App access | All functionality is available without special access |
| Content rating | Category "Utility, Productivity, Communication or other" → sab sawaal "No" |
| Target audience | 18 and over |
| Data safety | "Does your app collect or share any of the required user data types?" → **No** (sab data sirf phone par rehta hai) |
| Government app | No |
| Financial features | My app doesn't provide any financial features |
| Health | No health features |
| News app | No |

## Upload kaise karein (step by step)

1. **Account:** play.google.com/console → developer account (ek hi account dono apps ke liye kaafi hai).
2. **Create app:** App name `Karakhana Manager`, Default language English, App, Free → declarations tick karke Create.
3. **Store listing:** Grow users → Store presence → Main store listing → upar ka text, icon, feature graphic, 6 screenshots → Save.
4. **App content:** Policy → App content → upar ki table ke hisaab se har form bharo.
5. **Testing:** Naya personal account hai to Test and release → Testing → **Closed testing** → testers ki email list (kam se kam 12) → Create release → `karakhana-manager.aab` upload → release notes → Save → Review → Start rollout. 12 testers ko 14 din lagatar app install rakhna zaruri hai.
6. **Address bar hatane ke liye (zaruri):** pehla AAB upload hone ke baad Play Console → Test and release → Setup → **App signing** → "App signing key certificate" ka **SHA-256** copy karo. Ye fingerprint `shahnawazzafarsiddiquee-bit.github.io` repo ki `.well-known/assetlinks.json` mein `sha256_cert_fingerprints` list mein **jodna** hai (purana wala bhi rehne do). Bina iske Play wala app upar browser ki address bar dikhayega.
7. **Production:** 14 din baad Dashboard par "Apply for production" → approval ke baad Production → Create new release → AAB → Rollout.
8. **Update:** App asal mein website hai, isliye HTML/JS badalne par Play update ki zaroorat nahi – app khud naya version dikhata hai. Sirf icon, naam ya `twa-manifest.json` badle to naya AAB banta hai (Actions → Build Android APK & AAB) aur Play par naya release daalo.

**Zaruri:** signing key ka password (`SIGNING_PASSWORD` secret) kabhi mat khona. Play par har update isi key se jaata hai.
