# Arowana POS — Panduan Pengguna

## 1. Memulai

### Pengaturan Pertama Kali
1. Buka aplikasi di browser Anda.
2. Masukkan nama Anda (untuk identifikasi perangkat/kasir).
3. Masukkan kode akses toko yang diberikan oleh pemilik toko.
4. Tekan **Set Up Store** (perangkat pertama) atau **Register Device** (perangkat tambahan).
5. Anda akan diarahkan ke Dashboard.

### Masuk Kembali
Setelah perangkat terdaftar, aplikasi akan mengingat Anda. Cukup buka aplikasi dan Anda siap bekerja.

---

## 2. Dashboard

Dashboard adalah halaman utama yang menampilkan ringkasan bisnis hari ini.

| Kartu | Isi |
|-------|-----|
| **Today's Revenue** | Total penjualan dan jumlah transaksi hari ini |
| **Cash Balance** | Saldo awal + penjualan tunai - pengeluaran |
| **Cash / Transfer** | Pembagian penjualan berdasarkan metode pembayaran |
| **Expenses Today** | Total pengeluaran yang dicatat hari ini |

### Peringatan Stok
- **Out of Stock** (bagian merah) — produk dengan stok nol. Tidak bisa dijual sampai diisi ulang.
- **Low Stock** (bagian kuning) — produk hampir habis. Segera isi ulang.

### Transaksi Terakhir
Menampilkan 10 penjualan terakhir dengan nomor penjualan, pelanggan, jumlah, dan metode pembayaran.

---

## 3. Melakukan Penjualan

### Langkah 1: Tambahkan Barang ke Keranjang
1. Buka halaman **Stocks** (tekan "Stocks" di navigasi bawah).
2. Cari produk yang ingin dijual.
3. Tekan **+ Cart** pada produk.
4. Jika produk memiliki beberapa ukuran, pilih ukuran terlebih dahulu.
5. Atur jumlah menggunakan tombol +/- atau ketik angka.
6. Tekan **Add to Cart**.
7. Ulangi untuk barang lainnya.

### Langkah 2: Checkout
1. Buka halaman **POS** (tekan ikon POS di navigasi bawah).
2. Tinjau keranjang — Anda bisa mengubah jumlah atau menghapus barang.
3. **Pelanggan** (opsional): Tekan "Search" untuk mencari pelanggan yang ada, atau "Add New" untuk membuat baru.
4. **Diskon** (opsional): Pilih "Flat (Rp)" untuk potongan jumlah tetap, atau "% Off" untuk persentase.
5. **Metode Pembayaran**: Tekan **Cash** atau **Bank Transfer**.
6. Tekan **Complete Sale** di bagian bawah.

### Langkah 3: Struk
Setelah menyelesaikan penjualan, Anda akan melihat halaman struk di mana Anda bisa:
- **Print** struk
- **Download PDF** untuk arsip digital
- **New Sale** untuk memulai transaksi baru

### Penjualan Offline
Jika koneksi internet terputus, Anda tetap bisa melakukan **penjualan tunai**. Penjualan akan disimpan secara lokal dan otomatis diunggah saat terhubung kembali. Penjualan transfer bank memerlukan koneksi internet.

---

## 4. Mengelola Produk

### Menambahkan Produk Baru
1. Buka **Stocks** > tekan **+ Add**.
2. Isi nama produk (wajib).
3. Opsional: pilih atau buat kategori.
4. **Track stock quantity** — aktifkan untuk melacak inventaris. Nonaktifkan untuk barang yang tidak dihitung.
5. **Low stock alert** — atur batas minimum untuk mendapat peringatan di Dashboard saat stok hampir habis.
6. **Sizes / Variants** — tambahkan ukuran berbeda dengan harga dan stok masing-masing:
   - Untuk produk satu ukuran: kosongkan label ukuran, cukup isi harga dan stok.
   - Untuk produk multi-ukuran: masukkan label (misal "500g", "1kg"), harga, dan stok untuk setiap ukuran.
7. Tekan **Add Product**.

### Mengedit Produk
1. Buka **Stocks** > tekan **Adjust Stock**.
2. Cari dan pilih produk.
3. Edit bidang apa saja — nama, kategori, harga, jumlah stok, dll.
4. Jika Anda mengubah jumlah stok, **kolom catatan** akan muncul. Masukkan alasan perubahan (misal "terima kiriman baru", "selisih hitung").
5. Tekan **Save Changes**.

Perubahan stok otomatis dicatat untuk keperluan audit dan akan muncul di Reports > tab Stock Adj.

### Menghapus Produk
1. Buka **Stocks** > **Adjust Stock** > pilih produk.
2. Tekan tombol merah **Delete** di bagian bawah.
3. Konfirmasi penghapusan.

Catatan: Menghapus produk adalah soft delete — produk tidak akan muncul di daftar tetapi data penjualan historis tetap tersimpan.

---

## 5. Pengeluaran

Catat pengeluaran bisnis harian (listrik, perlengkapan, sewa, dll.).

1. Buka halaman **Expenses**.
2. Masukkan deskripsi (misal "Tagihan listrik").
3. Masukkan jumlah dalam Rupiah.
4. Tekan **Record Expense**.

Pengeluaran akan dikurangi dari saldo kas di Dashboard dan memengaruhi perhitungan kas EOD.

Semua pengeluaran hari ini ditampilkan di bawah formulir beserta waktu pencatatan.

---

## 6. Hitungan Kas (Akhir Hari)

Di akhir setiap hari kerja, hitung kas Anda dan catat hasilnya.

1. Buka halaman **Cash EOD**.
2. Tinjau ringkasan:
   - **Opening Balance** — dibawa dari hitungan kemarin.
   - **Cash Sales** — total penjualan tunai hari ini.
   - **Expenses** — total pengeluaran tunai hari ini.
   - **Expected Cash** — kas yang seharusnya ada (saldo awal + penjualan - pengeluaran).
3. Hitung uang tunai fisik di kasir Anda.
4. Masukkan jumlah sebenarnya di kolom **Physical Cash Count**.
5. Sistem langsung menampilkan selisih:
   - **Hijau** = hitungan Anda cocok atau lebih.
   - **Merah** = hitungan Anda kurang.
6. Tambahkan catatan jika perlu (misal "kasih kembalian ke toko sebelah").
7. Tekan **Submit Count**.

Saldo pembukaan besok akan otomatis diatur sesuai jumlah aktual Anda.

---

## 7. Laporan

### Riwayat Penjualan
1. Buka **Reports** > tab **Sales**.
2. Gunakan panah tanggal untuk berpindah hari.
3. Cari berdasarkan nama pelanggan atau filter berdasarkan metode pembayaran.
4. Ketuk penjualan untuk melihat detail barang.

### Memproses Refund
1. Di Reports > tab Sales, buka detail sebuah penjualan.
2. Centang kotak di sebelah barang yang ingin di-refund.
3. Tekan tombol **Refund** yang muncul di bagian bawah.
4. Refund akan:
   - Mengembalikan stok untuk produk yang dilacak.
   - Mencatat perubahan stok sebagai penyesuaian "refund".
   - Menandai barang sebagai sudah di-refund (ditampilkan dengan coretan).
5. Barang yang sudah di-refund tidak bisa di-refund lagi.

### Riwayat Pengeluaran
1. Buka **Reports** > tab **Expenses**.
2. Lihat semua pengeluaran pada tanggal yang dipilih.

### Penyesuaian Stok
1. Buka **Reports** > tab **Stock Adj.**.
2. Lihat semua perubahan stok: penyesuaian manual, pengurangan penjualan, dan pengembalian refund.
3. Setiap entri menampilkan perubahan jumlah (+/-), nama produk, alasan/catatan, dan waktu.

---

## 8. Mode Offline

Aplikasi bekerja offline dengan fungsi terbatas:

| Fitur | Online | Offline |
|-------|--------|---------|
| Penjualan tunai | Ya | Ya (diantrikan) |
| Penjualan transfer bank | Ya | Tidak |
| Lihat produk/stok | Ya | Cache |
| Tambah/edit produk | Ya | Tidak |
| Catat pengeluaran | Ya | Tidak |
| Hitungan kas EOD | Ya | Tidak |
| Lihat laporan | Ya | Tidak |

Saat koneksi internet kembali, penjualan tunai yang diantrikan akan otomatis tersinkronisasi. Anda akan melihat notifikasi untuk setiap penjualan yang berhasil disinkronkan.

---

## 9. Referensi Cepat

| Halaman | Cara mengakses | Apa yang bisa dilakukan |
|---------|---------------|------------------------|
| Dashboard | Nav bawah: Home | Lihat metrik hari ini, peringatan stok, penjualan terbaru |
| Checkout (POS) | Nav bawah: POS | Tinjau keranjang, tambah pelanggan, beri diskon, selesaikan penjualan |
| Stocks | Nav bawah: Stocks | Lihat produk, tambahkan ke keranjang, kelola produk |
| Add Product | Stocks > + Add | Buat produk baru dengan varian |
| Edit Product | Stocks > Adjust Stock | Edit detail produk, sesuaikan stok |
| Expenses | Nav bawah: Expenses | Catat dan lihat pengeluaran harian |
| Cash EOD | Nav bawah: Cash EOD | Rekonsiliasi kas akhir hari |
| Reports | Nav bawah: Reports | Lihat riwayat penjualan, pengeluaran, penyesuaian stok, proses refund |

### Tips
- Gunakan **kotak pencarian** di halaman daftar untuk menemukan yang Anda cari dengan cepat.
- Tombol **?** di setiap halaman membuka dialog bantuan cepat.
- Warna stok: **merah** = habis, **kuning** = hampir habis.
- Badge penjualan: **Cash** (gelap), **Transfer** (terang), **Refund** (kuning).
