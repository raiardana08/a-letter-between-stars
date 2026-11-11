# A Letter Between the Stars

HTML + CSS + JavaScript murni. Tidak ada build, backend, atau API.

## Mulai di sini (versi final, Phase 9)

### 1. Isi konfigurasi personal (wajib sebelum dikirim)
Semua ada di **`config.js`**. Placeholder bawaan sengaja dibiarkan; situs tetap berjalan tanpa error jika belum diganti (konsol hanya mencetak info daftar yang belum diganti).

| Konfigurasi | Lokasi | Nilai saat ini | Tindakan |
|---|---|---|---|
| Nama penerima | `config.js` → `recipientName` (baris 28) | `[NAMA_PENERIMA]` | Perlu diisi |
| Nama pengirim | `config.js` → `senderName` (baris 29) | `[NAMA_PENGIRIM]` | Perlu diisi |
| Pesan personal | `config.js` → `personalMessage` (baris 30) | `[PESAN_PERSONAL]` | Perlu diisi |
| Kenangan | `config.js` → `memory` (baris 31) | `[KENANGAN]` | Perlu diisi |
| Tanggal spesial | `config.js` → `specialDate` (baris 32) | `[TANGGAL_SPESIAL]` | Perlu diisi |
| Tanda tangan surat (opsional) | `config.js` → `chapter3.signature` | `someone, quietly` | Boleh dibiarkan atau diganti |

Catatan: jangan dikosongkan (`""`); surat akan menampilkan "Dear ," dan "Written on" tanpa isi. Karakter khusus/HTML di nilai config ditampilkan sebagai teks biasa (aman). Jika `config.js` gagal dimuat, layar menampilkan pesan "config.js not found" (bukan layar kosong).

### 2. Musik
`assets/music.mp3` dipakai lewat `config.js` → `music.src`. Volume diatur dari `music.volume` (0–1, default 0,15); tidak ada slider volume di antarmuka. Musik tidak pernah berbunyi sebelum sentuhan pengunjung; `autoStartOnFirstJourney` memulainya saat tombol pembuka disentuh. Jika file hilang/kosong, musik ambient bawaan (WebAudio) dipakai.

### 3. Upload ke GitHub Pages (manual)
Lihat bagian "Deploy ke GitHub Pages" di bawah. Pastikan `config.js`, `css/`, `js/`, `assets/`, dan `.nojekyll` ikut terunggah di root bersama `index.html` (nama file huruf kecil semua; GitHub Pages membedakan huruf besar/kecil).

### 4. Status QA
Ringkasan hasil uji ada di laporan Phase 9. Pengujian pada perangkat nyata (HP Android, screen reader, audio dengan telinga) belum dilakukan dan perlu dicoba sendiri sebelum dikirim.

## Struktur
```
index.html        kerangka halaman
config.js         semua teks (nama, surat, kartu, bintang, Make a Wish)
css/style.css     tampilan
js/main.js        alur chapter, navigasi, kartu, surat, bintang, Make a Wish, amplop
js/sky.js         canvas bintang, partikel, bintang jatuh, bintang permohonan
js/music.js       musik latar (satu pemutar)
js/wishes.js      penyimpanan wish (localStorage), satu-satunya tempat wish dibaca/ditulis
js/constellation.js  Constellation of Wishes: membaca Wishes.all() dan menggambar satu bintang per wish
js/bottle.js      Wish in a Bottle: botol kaca (SVG) yang membuka satu wish dari Wishes.all()
js/moon.js        A Message from the Moon: bulan (SVG) + 28 pesan dalam larik lokal
assets/music.mp3  musik Anda
.nojekyll         agar GitHub Pages menyajikan file apa adanya
```

## Menjalankan lokal
Klik dua kali `index.html`, atau:
```
python3 -m http.server 8080     # lalu buka http://localhost:8080
```

## Deploy ke GitHub Pages
1. Upload seluruh isi folder ke repository publik (`index.html` harus berada di root repository).
2. Repository -> Settings -> Pages -> Build and deployment -> Source: **Deploy from a branch**.
3. Pilih branch `main`, folder `/ (root)`, lalu Save.
4. Tunggu 1-2 menit; alamatnya `https://<username>.github.io/<nama-repo>/`.
5. Setiap perubahan: commit dan push ke `main`, lalu tunggu deploy ulang. Jika tampilan lama masih muncul, refresh keras (Ctrl+Shift+R).

Semua path aset bersifat relatif, jadi situs berjalan di subfolder seperti `/<nama-repo>/`.
Alamat bisa membocorkan identitas pengirim: hindari nama asli di username atau nama repo.

## Make a Wish: penyimpanan
- Disimpan di `localStorage` dengan key `letter.wishes.v1`:
  `[{ "id": "...", "text": "...", "createdAt": "2026-11-08T03:12:45.000Z" }]`
- **Hanya ada di browser dan perangkat penerima.** Tidak dikirim ke mana pun dan tidak disinkronkan,
  jadi Anda sebagai pembuat tidak akan melihat wish yang ditulis penerima.
- Menambah wish selalu membaca data terbaru lalu menambah satu item; koleksi lama tidak ditimpa.
- Data rusak disalin dulu ke `letter.wishes.v1.corrupt` sebelum koleksi dimulai ulang.
- Jika penyimpanan diblokir (mis. mode privat), wish hanya bertahan selama halaman terbuka dan pengunjung diberi tahu.
- Menghapus semua wish (untuk menguji): di console browser, `localStorage.removeItem('letter.wishes.v1')`.

## Constellation of Wishes
- Chapter interlude setelah Make a Wish (nav menampilkan ✦). Satu wish = satu bintang; ketuk bintang untuk membaca wish dan tanggalnya di panel kaca.
- **Tidak ada penyimpanan baru.** Fitur ini hanya memanggil `Wishes.all()` dan mendengarkan event `wishes:changed`, sehingga selalu sama dengan data `letter.wishes.v1`.
- **Posisi stabil tanpa disimpan**: dihitung dari ID wish (hash -> generator acak berbenih), diurutkan menurut waktu dibuat. Wish baru ditambahkan di akhir, jadi bintang lama tidak pernah bergeser; refresh menghasilkan posisi yang sama.
- Posisi berupa persentase area langit, jadi tata letak relatif sama di semua ukuran layar.
- Maksimal `chapterConst.maxStars` bintang (default 200, tertinggi 400) digambar, yang terbaru; sisanya tetap tersimpan.
- Tanpa wish: tampil "Your constellation is waiting for its first star." dengan tombol menuju form Make a Wish yang sudah ada.
- Teks di `config.js` pada blok `chapterConst` (opsional; bila dihapus, bawaan dipakai).
- Tata letak di-cache: hanya wish baru yang dihitung; selama urutan wish lama sama, hasilnya dipakai ulang (hasil identik dengan perhitungan penuh).
- Saat panel terbuka, area konstelasi, bar atas (kembali/menu/musik) dan menu chapter dibuat `inert`; panel berada di atas semuanya (z-index 40).

## Wish in a Bottle
- Chapter interlude setelah Constellation (urutan: Make a Wish -> Constellation -> Wish in a Bottle -> A Message from the Moon -> Final Reveal).
- Botol digambar dengan SVG + CSS (tanpa gambar). Ketuk botol: gabus terangkat, gulungan naik, lalu panel surat terbuka berisi satu wish dan tanggalnya.
- Jika wish lebih dari satu: tombol sebelumnya/berikutnya atau panah kiri/kanan. Pembukaan botol berikutnya selalu memilih wish yang berbeda dari yang terakhir dibaca. Hanya satu wish tampil sekali waktu.
- **Tidak ada penyimpanan baru**: hanya memanggil `Wishes.all()` dan mendengarkan `wishes:changed`, sama seperti Constellation. Wish tidak disalin atau dihapus.
- Tanpa wish: "Some wishes are still waiting to be written." dengan tombol "Write a Wish" menuju form Make a Wish yang sudah ada.
- Teks di `config.js` pada blok `chapterBottle` (opsional; bila dihapus, bawaan dipakai).
- Saat panel terbuka, latar, bar atas dan menu menjadi `inert`; Escape menutup dan fokus kembali ke botol.

## A Message from the Moon
- Chapter interlude setelah Wish in a Bottle. Urutan: ... -> Wish in a Bottle -> A Message from the Moon -> Final Reveal.
- Ketuk bulan: cahaya lembut, lalu satu pesan muncul kata demi kata di panel kaca. Tombol "Another Message" menampilkan pesan lain.
- 28 pesan asli ada di larik `MESSAGES` dalam `js/moon.js`. Bukan chatbot: tanpa API, tanpa internet, tanpa localStorage, tanpa permintaan jaringan.
- **Pemilihan acak ("kartu kocok")**: pesan dikocok menjadi satu tumpukan dan ditarik satu per satu, jadi tidak ada pesan yang muncul lagi sebelum semua pesan lain terbaca. Saat tumpukan habis dikocok ulang, dan pesan pertama tumpukan baru dipastikan berbeda dari yang terakhir, sehingga tidak pernah ada pesan sama berturut-turut. Bila jumlah pesan berubah, tumpukan dibangun ulang.
- Pesan sendiri: di `config.js`, hapus komentar `messages: [...]` pada blok `chapterMoon` (opsional; entri kosong/duplikat disaring, larik kosong kembali ke bawaan).
- Panel: Escape/tombol Close/klik latar menutup; Tab berputar di antara Close dan Another Message; fokus kembali ke bulan; latar, bar atas, dan menu `inert` selama panel terbuka.

## Before You Leave (halaman penutup)
- Chapter terakhir, tepat setelah Final Reveal. Urutan lengkap: Beginning -> Little Things -> Unspoken Words -> A Universe for You -> Make a Wish -> Constellation of Wishes -> Wish in a Bottle -> A Message from the Moon -> Final Reveal -> Before You Leave.
- Final Reveal tidak diubah: amplop, "It was me.", nama pengirim, dan pesan penutupnya tetap utuh. Tombol **Continue** di layar pengungkapan membawa ke Before You Leave, jadi nama pengirim tetap menjadi kejutan dan penutupnya adalah salam perpisahan.
- Teks (judul, pesan utama, kalimat penutup, tombol) ada di blok `chapterLeave` pada `config.js`. Pesan muncul kata demi kata; dengan reduced-motion semua teks langsung tampil.
- **Experience It Again** kembali ke chapter pertama TANPA memuat ulang halaman: kemajuan chapter, kartu, form wish, dan amplop dikembalikan. Wish yang tersimpan (`letter.wishes.v1`) tidak disentuh, pemutar musik tidak disentuh (tidak dinyalakan, dimatikan, atau dibuat ulang), dan tidak ada instance audio baru.

## Phase 8 — Premium UI/UX & Motion polish

Penyempurnaan visual dan gerak tanpa fitur baru. File berubah: `css/style.css` (blok "Phase 8" di akhir + 4 edit kecil), `js/main.js` (2 pemicu animasi kecil). HTML, config, dan modul lain tidak berubah; penyimpanan wish (`letter.wishes.v1`) tidak berubah.

- Sistem pantulan (spring) berbasis CSS: token `--spring`, `--spring-soft`; tombol mengecil saat ditekan dan memantul halus saat dilepas; hover mengambang hanya di perangkat berhover.
- Kartu masuk berundak dengan pantulan halus; angkat saat hover; flip + keyboard tetap utuh.
- Bulan dan botol memantul lembut saat diklik; panel (Constellation/Botol/Bulan) masuk spring 0,42 s, keluar 0,26 s.
- Navigasi: label chapter bertransisi, menu berundak, titik progres elastis.
- Form: transisi fokus textarea, pesan validasi beranimasi ringan.
- Performa: animasi tak-berhenti (amplop, cincin tombol) hanya berjalan di chapter aktif.
- `prefers-reduced-motion`: tanpa overshoot/skala/gerak, hanya pudar/kecerahan.

### Phase 8b — Celestial Signature (tambahan)
- Token desain tambahan: skala tipografi fluida (`--fs-*`), radius (`--r-*`), elevasi (`--elev-*`), safe-area kiri/kanan; breakpoint acuan didokumentasikan di CSS.
- Magnetik halus (`setupMagnetic` di `js/main.js`): maks. 5 px, hanya pointer mouse + hover, mati di layar sentuh dan saat reduced-motion; memakai properti `translate`, tidak mengubah area klik.
- Floating tidak serempak (bintang bulan, bulan, botol); amplop punya umpan balik tekan; kartu sukses wish masuk dengan pantulan halus; judul chapter memudar dari blur kecil.

## Phase 8c — Final Experience Polish
Perubahan hanya CSS (`css/style.css`, blok "Phase 8c") dan tiga nilai `--d` pada chapter Before You Leave di `index.html`. Teks, mekanisme reveal, restart, penyimpanan wish, dan audio tidak berubah.
- **Final Reveal:** sinar bulan lembut (muncul sekali, tanpa loop), vinyet hangat, judul/nama masuk dengan blur sinematik, urutan dipadatkan (semua terbaca penuh ~7,5 s, sebelumnya ~9,8 s), hierarki teks lebih jelas.
- **Before You Leave:** pacing dipadatkan (semua terlihat ~7 s, sebelumnya ~8,5 s), pemisah halus sebelum kalimat penutup, tombol lebih menonjol dengan bayangan lembut. Tinggi tata letak tidak berubah agar layar pendek tetap muat.
- **Panel detail wish (Constellation):** kaca bergradasi dengan sorot cahaya atas, judul bergaya eyebrow, teks lebih nyaman dibaca, pemisah + tanggal. Teks wish tetap plain text (`textContent`).
- Catatan: panel Constellation tidak punya tombol sebelumnya/berikutnya (hanya panel botol yang punya); tidak ditambahkan karena itu fitur baru.

## Deploy ke GitHub Pages
1. Buat repository GitHub dan unggah **isi** folder proyek (bukan folder pembungkusnya) ke root: `index.html`, `config.js`, `css/`, `js/`, `assets/`, `.nojekyll`.
2. Settings → Pages → Source: *Deploy from a branch*, Branch: `main`, folder `/ (root)`.
3. Tunggu 1–2 menit, buka `https://<username>.github.io/<repo>/`.
4. Semua path relatif; wish tersimpan per browser (localStorage), tidak tersinkron antar perangkat.
