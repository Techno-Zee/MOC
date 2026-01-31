# Shell Dashboard
<p align="center">
  <img src="static/description/scallop.png" width="80" />
</p>

<p align="center">
  <b>Flexible & Modular Dashboard Framework for Odoo</b>
</p>

Shell Dashboard adalah modul **dashboard custom independen** untuk Odoo yang terinspirasi dari modul **Dynamic Dashboard** karya Cybrosys Technologies.

Modul ini dikembangkan dengan **pendekatan arsitektur dan sudut pandang yang berbeda**, dengan fokus pada fleksibilitas layout, performa visualisasi, serta kemudahan ekstensi. Shell Dashboard memanfaatkan **Chart.js**, **Gridstack.js**, **Bootstrap Icons / Font Awesome**, dan beberapa **komponen UI kustom berbasis jQuery** untuk menyajikan data secara interaktif di backend Odoo.

---

## Tujuan Pengembangan

Shell Dashboard dibuat untuk:

* Menyediakan dashboard backend yang **fleksibel dan modular**
* Memberikan **kendali penuh** kepada pengguna dalam menyusun layout dashboard
* Menjadi **fondasi dashboard generik** yang mudah dikembangkan ulang oleh developer
* Menghindari ketergantungan pada struktur dashboard Odoo bawaan yang kaku

---

## Fitur Utama

Fitur-fitur yang diimplementasikan dan dikembangkan dalam modul ini meliputi:

* **Dynamic Interactive Dashboard**

  * Widget dapat diperbarui secara dinamis tanpa reload halaman
  * Mendukung berbagai jenis visualisasi data

* **Drag & Drop Layout (Gridstack.js)**

  * Penyusunan widget berbasis grid
  * Resize dan reposition widget secara real-time
  * Layout responsif mengikuti ukuran layar

* **Chart Visualization (Chart.js)**

  * Bar Chart
  * Line Chart
  * Pie / Doughnut Chart
  * Mudah diperluas untuk jenis chart lain

* **Custom Icon Support**

  * Menggunakan **Bootstrap Icons**
  * Mendukung **Font Awesome**
  * Ikon dapat dikonfigurasi per-widget

* **Custom UI Component**

  * Komponen visual kustom berbasis jQuery
  * Desain ringan dan mudah dimodifikasi

* **Independen & Modular**

  * Tidak bergantung pada modul dashboard pihak ketiga
  * Mudah diintegrasikan dengan modul internal Odoo

---

## Teknologi yang Digunakan

Modul ini dibangun menggunakan kombinasi teknologi berikut:

* **Odoo Backend Framework**
* **JavaScript (ES6)**
* **Chart.js** – visualisasi data
* **Gridstack.js** – sistem layout drag & drop
* **jQuery** – manipulasi DOM & interaksi UI
* **Bootstrap Icons / Font Awesome** – ikonografi

---

## Struktur Modul (Gambaran Umum)

```
shell_dashboard/
├── controllers/
│   └── main.py
├── models/
│   └── dashboard.py
├── views/
│   ├── dashboard_views.xml
│   └── assets.xml
├── static/
│   ├── description/
│   │   ├── icon.png (main icon for odoo18)
│   │   ├── scallop.png (icon with documentation)
│   ├── src/
│   │   ├── js/
│   │   ├── xml/
│   │   ├── css
│   └── lib/
├── security/
│   └── ir.model.access.csv
├── __manifest__.py
└── README.md
```

> Struktur dapat berubah sesuai kebutuhan pengembangan lanjutan.

---

## Instalasi

1. Salin modul ke direktori addons Odoo:

   ```bash
   cp -r shell_dashboard /mnt/extra-addons/
   ```

2. Update apps list di Odoo

3. Install modul **Shell Dashboard** melalui menu Apps

---

## Konfigurasi

Saat ini modul menggunakan konfigurasi default.
Pengembangan ke depan direncanakan mencakup:

* Konfigurasi widget berbasis UI
* Penyimpanan layout per-user
* Hak akses dashboard berbasis role

---

## Roadmap Pengembangan

Beberapa fitur yang direncanakan untuk versi selanjutnya:

* Dashboard per-user & per-group
* Builder widget berbasis UI
* Data source dinamis (ORM / SQL / RPC)
* Export & import layout dashboard
* Dukungan tema (dark / light)

---

## Kontribusi

Kontribusi sangat terbuka dalam bentuk:

* Bug report
* Feature request
* Pull request

Silakan sesuaikan dengan standar pengembangan Odoo dan sertakan dokumentasi yang jelas.

---

## Lisensi

Modul ini dirilis di bawah lisensi **LGPL-3** sesuai dengan standar modul Odoo.

---

## Catatan

Shell Dashboard dikembangkan sebagai **modul eksploratif dan fondasi**.
Struktur dan implementasi dapat berubah seiring pengembangan dan penyempurnaan arsitektur.
