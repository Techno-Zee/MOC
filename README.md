# Module Odoo Community (MOC)

**Module Odoo Community (MOC)** adalah repository yang berisi kumpulan **modul custom untuk Odoo Community Edition**, dikembangkan sebagai sarana **edukasi, eksplorasi teknis, dan kontribusi terhadap ekosistem Odoo komunitas**.

Seluruh modul dalam repository ini:
- Dikembangkan dan diuji pada **Odoo 18**
- Ditujukan untuk **Community Edition**
- Menggunakan lisensi **AGPL-3.0**
- Fokus pada **customization yang realistis**, bukan sekadar contoh CRUD

Repository ini juga berfungsi sebagai **portfolio teknis** untuk menunjukkan pemahaman pengembangan Odoo pada level modul, security, dan business logic.

---

## 🎯 Tujuan Repository

- Menyediakan contoh **modul Odoo Community yang terstruktur dan reusable**
- Menjadi referensi bagi developer Odoo pemula hingga menengah
- Mengeksplorasi keterbatasan fitur native Odoo Community dan cara mengatasinya melalui modul custom
- Mendorong praktik pengembangan yang **bersih, aman, dan sesuai standar Odoo**

---

## 📦 Daftar Modul

Berikut adalah modul-modul yang tersedia dalam repository ini:

### 🔐 Custom Login
**Path:** `/custom_login`

Modul untuk melakukan kustomisasi pada proses autentikasi Odoo, dengan fokus pada:
- Modifikasi alur login
- Validasi tambahan saat autentikasi
- Eksplorasi keamanan pada layer login

> Cocok untuk memahami bagaimana Odoo menangani authentication flow di level backend dan web.

---

### 💳 VA POS
**Path:** `/va_pos`

Modul Point of Sale dengan integrasi **Virtual Account (VA)** sebagai metode pembayaran.

Fokus pengembangan:
- Custom payment method di POS
- Integrasi alur pembayaran non-tunai
- Penyesuaian logic transaksi sesuai kebutuhan bisnis lokal

---

### 🔁 Shell Dashboard
**Path:** `/addons/dynamic_login`

Modul shell dashboard yang memungkinkan custom dashboard disesuaikan dengan kondisi tertentu.

Modul ini **terinspirasi dari pendekatan yang digunakan oleh Cybrosys Technologies**, namun dikembangkan ulang dengan:
- Implementasi mandiri
- Penyesuaian untuk Odoo 18
- Fokus edukatif dan eksploratif

---

## 🛠️ Requirement

- Odoo **18.x**
- Python sesuai versi yang direkomendasikan Odoo
- PostgreSQL

---

## ⚖️ Lisensi

Seluruh modul dalam repository ini dilisensikan di bawah **GNU Affero General Public License v3.0 (AGPL-3.0)**.

Lisensi ini memastikan:
- Kebebasan penggunaan dan modifikasi
- Kewajiban distribusi source code jika digunakan secara publik
- Konsistensi dengan lisensi inti Odoo Community

---

## 🤝 Kontribusi

Kontribusi terbuka untuk siapa pun yang ingin:
- Menambahkan modul baru
- Memperbaiki bug
- Meningkatkan dokumentasi

Silakan gunakan mekanisme **Pull Request** dan sertakan penjelasan teknis yang jelas.

---

## 📌 Catatan

Repository ini difokuskan pada **pembelajaran dan eksplorasi teknis**, bukan sebagai pengganti modul enterprise resmi.  
Gunakan modul-modul di sini dengan pemahaman penuh terhadap konteks dan risiko implementasi di lingkungan produksi.
