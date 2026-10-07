# VinylLab v3
Local-first audiophile PWA.

## v3 focus
- Stable Web Audio graph created once, no live graph rebuilds for spatial buttons.
- 20-band EQ + preamp.
- Crossfeed, stereo width, basic M/S-inspired width control.
- Dynamic bass, air, de-harsh, transient, exciter and saturation-style tonal shaping.
- YouTube Restore preset for compressed audio.
- Limiter, loudness-normalize mode, peak/RMS/LUFS-approx analyzer.
- Spectrum analyzer.
- Local file and folder selection.
- PWA install support.

## Important accuracy notes
ReplayGain is exposed as a control but this build does not invent tag values. True ReplayGain requires reading ReplayGain metadata or measuring loudness with a proper implementation.
"LUFS approx" is only an approximate visual indicator, not a standards-compliant EBU R128 measurement.
"Restoration" is perceptual enhancement. It cannot recover information permanently removed by lossy encoding.
The browser cannot silently scan all Android storage. User-selected files/folders are required.


## v4 Library / Playlist
- Local Songs, Artists, Albums, Favorites, Recently Played views.
- Search and playback queue.
- M3U/M3U8 import matched against files already available to the browser.
- No audio upload or server required.
- Browser storage/file access remains permission-based; Android browsers cannot silently scan all storage.
- v4 currently uses filename metadata as a lightweight fallback. Embedded ID3/Vorbis/FLAC cover/tag parsing is reserved for the next metadata pass.


## v5 Google Drive Library
Paste a Google Drive folder link and a Drive API v3 key. VinylLab lists readable audio files and streams them directly from Drive. No Google login flow is used and no music is copied into GitHub. Keep the Drive project/account separate from Batu Kunci/Media Creative.
