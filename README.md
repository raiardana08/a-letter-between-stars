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
