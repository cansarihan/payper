# Görev: Ürün genelinde logoyu ve marka kimliğini "payper" ile değiştir

## Bağlam
Yeni marka: **payper** (her zaman küçük harf yazılır).
Logo dosyaları `payper-logo/` klasöründe hazır: `svg/` ve `png/` alt klasörleri + `kullanim-kurallari.html`.
Simge: iki dalgalı çizgi (üst dalga tam opak, alt dalga aynı rengin %50 opaklığı). Tek renk kullanılır, gradyan yoktur.

## 1. Dosyaları projeye kopyala
- `payper-logo/svg/*` ve `payper-logo/png/*` dosyalarını statik varlık klasörüne koy (ör. `public/brand/` veya `src/assets/brand/`).
- Eski logo dosyalarını (önceki marka adına ait svg/png/ico) projeden **sil**; referansta kalan hiçbir yol eski dosyaya gitmesin.

## 2. Favicon ve uygulama simgeleri
`index.html` (veya framework'ün head bileşeni) içinde:
```html
<link rel="icon" type="image/svg+xml" href="/brand/favicon-16.svg">
<link rel="alternate icon" href="/brand/icon-32.png" sizes="32x32">
<link rel="icon" href="/brand/icon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="/brand/icon-256.png">
<meta name="theme-color" content="#0A0A0A">
```
- `site.webmanifest` / `manifest.json`: `name` ve `short_name` = "payper", `icons` dizisini 192/256/512 PNG'lere yönlendir, `background_color` ve `theme_color` = `#0A0A0A`.
- Varsa `favicon.ico` referanslarını kaldır veya yeni PNG ile değiştir.

## 3. Uygulama içi logo kullanımları
Şu yerlerde logoyu değiştir — hepsini tara, hiçbirini atlama:
- Navbar / header (koyu zemin → `icon-mint.svg`, açık zemin → `icon-ink.svg`)
- Sidebar, panel başlığı, mobil üst çubuk
- Giriş / kayıt / şifre sıfırlama ekranları
- Boş durum (empty state), yükleniyor ekranı, splash
- E-posta şablonları (PNG kullan: `lockup-on-ink-1040.png` veya `lockup-ink-1040.png`)
- PDF / fatura / makbuz çıktıları
- 404 ve hata sayfaları
- Open Graph ve Twitter kart görselleri (`og:image`)

Kilit (simge + yazı) gereken yerde hazır SVG kullan: `lockup-mint-on-ink.svg`, `lockup-ink.svg`, `lockup-white.svg`.
Kod içinde kilidi elle dizersen: simge yüksekliği = yazının x-height'ının 2 katı, aradaki boşluk simge genişliğinin %32'si, yazı `Urbanist 800, letter-spacing:-0.055em, text-transform:lowercase`.

## 4. Metinsel marka adı
- Tüm kullanıcıya görünen metinlerde eski marka adını "payper" ile değiştir (cümle başında/özel ad olarak "Payper" kabul edilir; logo ve kelime markasında **daima küçük**).
- `<title>`, meta description, OG başlıkları, e-posta konuları, push bildirim başlıkları, hata mesajları, yasal metinler.
- Değişken/paket adları, env anahtarları ve DB kayıtları gibi teknik tanımlayıcıları **değiştirme** (kırılma riski) — yalnızca kullanıcıya görünen dizeler.

## 5. Renk ve tipografi token'ları
CSS değişkenlerini/tema dosyasını güncelle:
```css
:root{
  --payper-ink:#0A0A0A;      /* zemin, birincil metin */
  --payper-mint:#3DE29C;     /* marka, birincil aksiyon, başarı */
  --payper-forest:#1A8F63;   /* açık zeminde yeşil metin */
  --payper-paper:#F5F7FA;    /* açık yüzey */
  --payper-graphite:#1C1C1E; /* koyu kart */
  --payper-font:'Urbanist',sans-serif;
  --payper-mono:'JetBrains Mono',monospace;
}
```
Fontlar: Urbanist (400/500/600/700/800) + JetBrains Mono (400/500/600), Google Fonts.
Kural: tutar, oran, tarih, hash, cüzdan adresi ve kod daima mono; başlık ve gövde Urbanist.

## 6. Kabul kriterleri
- Projede eski marka adına veya eski logo dosya adına ait **hiçbir** referans kalmadı (grep ile doğrula: eski isim, eski dosya adları, eski hex renkler).
- Favicon tarayıcı sekmesinde ve yer imlerinde yeni simge olarak görünüyor.
- Koyu ve açık zeminli tüm ekranlarda logo doğru versiyonla (mint / ink / forest) görünüyor, hiçbir yerde kontrast düşük değil.
- Logo hiçbir yerde esnetilmemiş, döndürülmemiş, gölge veya çerçeve eklenmemiş; en-boy oranı korunmuş.
- Mobilde logo minimum 16px simge / 22px kilit yüksekliğinin altına düşmüyor.
- Build hatasız geçiyor, hiçbir 404 varlık isteği yok.

Detaylı kurallar: `payper-logo/kullanim-kurallari.html`.
