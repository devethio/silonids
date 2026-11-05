# Silondis Pharmacy website and demo app

A static website: no build step, no server, no database. It deploys to Vercel as it is.

## Pages

| Page | File | What it has |
| --- | --- | --- |
| Home | `index.html` | Animated hero, payment methods, who we serve (tabs), how ordering works, traceability, shop categories, FAQ |
| About | `about.html` | Story, services, values, licensing and compliance, roadmap, team |
| Contact | `contact.html` | General question, wholesale account application, tender enquiry; contact details and hours |
| App | `app.html` | `#shop`, `#track`, `#b2b` (pharmacy portal), `#office` (back office) |
| Not found | `404.html` | Shown by Vercel for unknown paths |

### App features
- **Shop:** search in English or Amharic, categories, product details, prescription upload, delivery slots, telebirr / bank / card / cash on delivery (simulated), refill reminders for long-term medicines.
- **Track order:** order number + phone, step-by-step timeline with batch numbers. Sample: `SO-DEMO1` / `0900000000`.
- **Pharmacy portal:** EFDA licence check (expired licences are blocked), credit limit and terms, quick reorder and "same again", short-expiry deals, invoices and simulated balance payment.
- **Back office:** sales dashboard, order workflow with prescription approval, stock by batch and expiry (FEFO picking, quarantine), receiving by GS1 barcode string, purchasing suggestions and purchase orders, wholesale application approval, messages, EFDA-MVC event export, reset demo data.

## Languages
Amharic is the default for visitors without a saved language preference. The language button switches to English or Amharic and remembers the choice across visits. Amharic also works as the default when browser storage is unavailable.

Every page and app screen switches between English and Amharic with the language button. All Amharic text is in `assets/js/i18n-am.js`: the key is the English text, the value is the Amharic. To correct a translation, edit the value; to translate new text, add a line. Text with numbers or names in it (counts, dates, messages) is handled by the patterns at the bottom of that file. Delivery and opening times in Amharic use the Ethiopian clock (4 pm = 10 ሰዓት). Medicine names, batch numbers and GTINs stay in English to match the pack.

## Demo data
All data lives in each visitor's browser (`localStorage`), seeded from `assets/js/store.js`. Two people on different phones do not see each other's orders. "Reset demo data" in the back office restores the sample set.

Before real launch, replace `assets/js/store.js` with calls to a real backend (for example Supabase or a Node API hosted in Ethiopia to meet Proclamation 1321/2024), add staff sign-in for the back office, and connect Chapa for payments.

## Fill in before going public
Search the files for `[` to find placeholders: phone, email, address, opening hours, EFDA licence and TIN numbers, team names and photos, founding story. Prices, batches and pharmacy accounts are sample data.

## Deploy to Vercel

**Option A: drag and drop**
1. Sign in at vercel.com with the account you want to use.
2. Add New → Project → choose "Deploy without Git" / upload, and drop this folder (or the zip).
3. Framework preset: **Other**. Build command: none. Output directory: `.` (the folder itself).

**Option B: from your computer with the CLI**
```bash
npm i -g vercel
cd silondis-site
vercel          # first deploy, follow the prompts (framework: Other)
vercel --prod   # publish to production
```

**Option C: GitHub**
Push this folder to a GitHub repository, then in Vercel choose Add New → Project → Import that repository.

Use these project settings:
- **Root Directory:** the repository root (leave the field empty). `index.html` and `vercel.json` are at the root of this repository, even though the local folder path contains `silondis-site` twice.
- **Framework Preset:** Other.
- **Build Command:** empty (no build step).
- **Install Command:** empty (no dependencies).
- **Output Directory:** `.`.

`vercel.json` explicitly sets the framework, build, install, and output settings. The Root Directory must still point to the folder containing `index.html` and `vercel.json`.

If an existing deployment fails, check its build logs. Errors about `package.json`, `npm run build`, or a missing `dist` / `public` folder can indicate incorrect build settings. A `404: NOT_FOUND` response can indicate the wrong root or output directory. After pushing this configuration, deploy the new commit; redeploying an older commit will not include the changes.

Custom domain: Project → Settings → Domains → add your domain and follow the DNS steps.

`vercel.json` turns on clean URLs (`/about` instead of `/about.html`) and adds basic security headers.
