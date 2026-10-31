# Push / Commit Guide — Final Website

## 🔗 Sob dorkari link (Dev / GitHub Settings)
- Repo (main): https://github.com/Mithun-Mutsuddi/Mithun-Mutsuddi.github.io
- **File upload (Add file):** https://github.com/Mithun-Mutsuddi/Mithun-Mutsuddi.github.io/upload/main
- **index.html edit:** https://github.com/Mithun-Mutsuddi/Mithun-Mutsuddi.github.io/edit/main/index.html
- **Images folder upload:** https://github.com/Mithun-Mutsuddi/Mithun-Mutsuddi.github.io/upload/main/images
- **images/thumbs upload:** https://github.com/Mithun-Mutsuddi/Mithun-Mutsuddi.github.io/upload/main/images/thumbs
- **images/thumbs/small upload (notun folder age Create korte hobe, niche dekho)**
- GitHub Pages settings (Deploy check): https://github.com/Mithun-Mutsuddi/Mithun-Mutsuddi.github.io/settings/pages
- Repo settings: https://github.com/Mithun-Mutsuddi/Mithun-Mutsuddi.github.io/settings
- Deploy/actions obostha: https://github.com/Mithun-Mutsuddi/Mithun-Mutsuddi.github.io/actions
- Live site: https://mithun-mutsuddi.github.io/
- my-cv.pdf delete page: https://github.com/Mithun-Mutsuddi/Mithun-Mutsuddi.github.io/blob/main/my-cv.pdf

## ✅ Ponṭha A: Browser diye upload (sohoj)
1. Uporer **File upload** link-e giye ei folder-er `index.html`, `robots.txt`, `sitemap.xml`, `404.html` drag kore dao → Commit message: `Luxury finance redesign + image/video bug fixes` → **Commit changes**
2. **Images folder upload** link-e: `images/` folder-er `avatar.png`, `cv-page-1.jpg` upload (replace confirm)
3. **images/thumbs upload** link-e: `01.jpg`–`06.jpg` upload (replace)
4. Notun `small` folder: GitHub web-e khali folder hoy na — `images/thumbs/` te giye **Add file → Create new file** → file name box-e `small/01.jpg` type kore... asole eta file create kore; sohoj pontha: PC te Git Bash/GitHub Desktop diye push (Ponṭha B). Na parle small folder charao site cholbe (sudhu mobile-e ektu boro image load hobe).
5. `my-cv.pdf` delete: uporের delete page link → `...` → Delete file → Commit. **(Na korle CV public thakbe!)**

## ✅ Ponṭha B: PC theke Git diye (sob files ekbare, BEST)
PC-te Git Bash install thakle:
```bash
git clone https://github.com/Mithun-Mutsuddi/Mithun-Mutsuddi.github.io.git
cd Mithun-Mutsuddi.github.io
# ei push-ready folder-er sob file copy kore ekhane paste/replace koro
rm -f my-cv.pdf
git add -A
git commit -m "Luxury finance redesign: fix image loading, video facade, all bugs"
git push origin main
```
2–5 min por https://mithun-mutsuddi.github.io/ te Ctrl+Shift+R.

## 🖥️ Local dev (PC-te site chaliye dekha)
```bash
cd Mithun-Mutsuddi.github.io
python -m http.server 8000
# browser: http://localhost:8000
```

## 📦 Ki ki ache ei package-e
- `index.html` — final redesigned + fixed website (ek file-i sob design)
- `images/` — **SOB image**: avatar, bg, cv-page-1 (notun), fulls 01–06 (ferot), thumbs 01–06 (optimized), thumbs/small 01–06 (notun), WhatsApp jpegs shoho ja ja chilo sob (mot 28 image)
- `robots.txt`, `sitemap.xml`, `404.html` — SEO r not found page
- `assets/` — purono template files (kono change nai, thakleo khoti nai)
- ⚠️ `my-cv.pdf` **ichcha kore bad deya**: eta public leak chilo. Ferot chaile repo history thekei paba; kintu push korle abar sobai download korte parbe.

---

## Token দিয়ে নিজের PC থেকে Push (নিরাপদ পদ্ধতি)

⚠️ **Token কখনো chat/messenger-এ কাউকে পাঠাবেন না।** Token = আপনার GitHub-এর চাবি।

1. Token বানান: https://github.com/settings/tokens/new → নাম দিন, **repo** scope-এ টিক দিন, Generate → token টা কপি করে নিরাপদ জায়গায় রাখুন (একবারই দেখায়)।
   - সব token দেখা/বাতিল: https://github.com/settings/tokens
   - Developer settings: https://github.com/settings/developers
2. নিজের PC-te (Git Bash / Terminal):
   ```
   git clone https://github.com/Mithun-Mutsuddi/Mithun-Mutsuddi.github.io.git
   cd Mithun-Mutsuddi.github.io
   ```
   তারপর `mithun-website-push-ready` ফোল্ডারের সব ফাইল এখানে কপি করুন (পুরোনো ফাইল replace), আর `my-cv.pdf` থাকলে delete করুন।
   ```
   git add .
   git commit -m "Luxury finance redesign with HR profile and specimen signature"
   git push origin main
   ```
3. Password চাইলে account password নয় — **token-টা paste করুন** (paste করার সময় screen-এ কিছু দেখা যাবে না, এটাই নিয়ম)।
4. যাচাই: https://github.com/Mithun-Mutsuddi/Mithun-Mutsuddi.github.io/actions (সবুজ ✓) → ১–২ মিনিট পর https://mithun-mutsuddi.github.io/
   - Pages settings: https://github.com/Mithun-Mutsuddi/Mithun-Mutsuddi.github.io/settings/pages
