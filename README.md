# A Letter Between the Stars

HTML + CSS + JavaScript murni. Tidak ada build, backend, atau API.

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
- Chapter interlude setelah Constellation (urutan: Make a Wish -> Constellation -> Wish in a Bottle -> Final Reveal).
- Botol digambar dengan SVG + CSS (tanpa gambar). Ketuk botol: gabus terangkat, gulungan naik, lalu panel surat terbuka berisi satu wish dan tanggalnya.
- Jika wish lebih dari satu: tombol sebelumnya/berikutnya atau panah kiri/kanan. Pembukaan botol berikutnya selalu memilih wish yang berbeda dari yang terakhir dibaca. Hanya satu wish tampil sekali waktu.
- **Tidak ada penyimpanan baru**: hanya memanggil `Wishes.all()` dan mendengarkan `wishes:changed`, sama seperti Constellation. Wish tidak disalin atau dihapus.
- Tanpa wish: "Some wishes are still waiting to be written." dengan tombol "Write a Wish" menuju form Make a Wish yang sudah ada.
- Teks di `config.js` pada blok `chapterBottle` (opsional; bila dihapus, bawaan dipakai).
- Saat panel terbuka, latar, bar atas dan menu menjadi `inert`; Escape menutup dan fokus kembali ke botol.
