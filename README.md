# VinylLab Private Music Player

PWA music player yang fokus ke file musik lokal di HP.

## Fitur
- 20-band graphic EQ: 31 Hz sampai 18 kHz, ±12 dB
- Preset Rock, Pop, Jazz, Classical, Bass Boost, Vocal, Electronic
- Parametric EQ tambahan: Peaking / Low Shelf / High Shelf
- XWide 1/2/3
- XBass 1/2/3
- Surround 1/2/3
- Compressor
- Loudness
- Shuffle, Repeat One/All, seek, mute
- Media Session: kontrol dari lock screen / notification pada browser yang mendukung
- PWA installable
- File musik diproses lokal di browser dan tidak di-upload oleh aplikasi
- Offline shell via Service Worker

## Catatan penting soal "widget vinyl"
Website/PWA tidak bisa membuat Android home-screen widget native seperti widget aplikasi Kotlin/Java hanya dengan HTML/JS. Yang bisa dilakukan di versi ini adalah:
1. Install PWA ke home screen.
2. Gunakan Media Session untuk kontrol playback dari lock screen/notification.
3. Vinyl player interaktif tersedia di dalam PWA.

Kalau nanti mau widget Android sungguhan berupa vinyl berputar, project ini perlu companion Android app (misalnya Kotlin + Jetpack Glance) yang berkomunikasi dengan player. Itu bukan sekadar upload GitHub Pages.

## Deploy GitHub Pages
1. Buat repository baru di GitHub, misalnya `vinyllab-player`.
2. Upload seluruh isi folder ZIP ini ke root repository. Jangan upload folder ZIP-nya sebagai satu file.
3. Buka **Settings → Pages**.
4. Pada **Build and deployment**, pilih **Deploy from a branch**.
5. Branch: `main`, folder: `/ (root)`.
6. Save.
7. Tunggu GitHub Pages selesai deploy.
8. Buka URL Pages dari HP. Di Chrome/Edge Android, pilih menu browser → **Add to Home screen / Install app**.

### Kalau GitHub Pages tidak mau service worker/PWA
Pastikan URL memakai HTTPS dan file `manifest.webmanifest` + `sw.js` berada di root yang sama dengan `index.html`. GitHub Pages menyediakan HTTPS.

## Batasan audio
Web Audio API bukan Poweramp/Neutron native DSP. EQ dan efek di sini nyata menggunakan BiquadFilterNode dan DynamicsCompressorNode, tetapi XWide/Surround adalah implementasi stereo-spatial sederhana, bukan DSP proprietary. Kualitas akhir tetap bergantung pada browser, OS, output Bluetooth/USB, dan codec.

## Struktur
- `index.html` UI
- `app.js` player + Web Audio DSP
- `manifest.webmanifest` PWA
- `sw.js` offline cache
- `icons/` ikon aplikasi
