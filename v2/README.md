# VinylLab v2

## Yang diperbaiki
- Crash/mati saat pindah Surround 2/3: audio graph tidak lagi dibongkar-pasang secara agresif.
- Bottom bar dibuat stabil dengan `100dvh`, safe-area dan compositing.
- Lebih ringan: graph DSP dibuat sekali dan tidak direbuild saat ganti mode.
- Preamp ±12 dB.
- Replay Gain toggle + dukungan field `replayGain` internal. Catatan: browser tidak otomatis membaca tag ReplayGain FLAC/MP3 tanpa parser metadata khusus. Versi ini tidak mengarang nilai RG.
- Parametric EQ sekarang slider adaptif/log-ish untuk Frequency, Q, Gain, bukan input angka.
- Folder picker (`showDirectoryPicker`) dicoba bila browser mendukung, plus file picker.
- Format target: MP3, FLAC, Opus, OGG, WAV, M4A, AAC/MP4 dan audio yang dikenali browser.

## Penting soal "scan storage"
Website tidak diberi izin diam-diam untuk meng-scan seluruh storage Android. Folder picker tetap memerlukan user memilih folder dan dukungan browser. Ini batas keamanan browser, bukan bug aplikasi.

## Replay Gain
ReplayGain yang benar membutuhkan pembacaan tag seperti `REPLAYGAIN_TRACK_GAIN` atau analisis loudness. Tanpa parser, jangan menebak nilai. Arsitektur sudah menyediakan field per-track dan toggle. Langkah berikutnya bisa menambahkan parser metadata lokal.

## Deploy
Upload isi folder ini ke root repository GitHub → Settings → Pages → Deploy from branch → `main` + `/ (root)` → Save. Pastikan HTTPS.

## PWA
Install dari Chrome/Edge Android. Media Session dapat memberikan kontrol lock-screen pada browser yang mendukung.

## Widget Android
Home-screen widget native tidak bisa dibuat dari PWA saja. Untuk widget vinyl sungguhan diperlukan companion Android app, misalnya Kotlin + Jetpack Glance, yang berkomunikasi dengan player.
