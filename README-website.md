# Telegram Kitap Botu Web Sitesi

Bu proje, Telegram kitap botu için modern ve kullanıcı dostu bir web sitesi içerir.

## 🎨 Tasarım

- **Renk Paleti:** Beyaz arka plan, yeşil vurgular
- **Tema:** Modern, temiz ve kullanıcı dostu
- **Responsive:** Mobil ve masaüstü uyumlu

## 🚀 Özellikler

### 📚 Kitap Yönetimi
- Kitapları grid görünümde listeleme
- Kitap başlığı ve açıklaması görüntüleme
- Büyük dosyalar için özel işlem

### 🔍 Arama
- Gerçek zamanlı kitap arama
- Başlık ve açıklama içinde arama
- Temiz arama arayüzü

### 📱 Modal Bilgi
- Kitap detaylarını modal pencerede gösterme
- İndirme butonu ile kolay erişim
- Responsive modal tasarım

### 🔗 Telegram Entegrasyonu
- Telegram kanalına direkt bağlantı
- Büyük dosyalar için kanal yönlendirmesi

## 📁 Dosya Yapısı

```
├── index.html          # Ana HTML sayfası
├── style.css           # CSS stilleri
├── script.js           # JavaScript fonksiyonları
├── server.js           # Express sunucusu
├── books.json          # Bot veritabanı
├── public/
│   └── books.json      # Web sitesi için kitaplar
└── README.md           # Bu dosya
```

## 🛠️ Kurulum

### 1. Bağımlılıkları Yükleyin
```bash
npm install express cors
```

### 2. Sunucuyu Başlatın
```bash
node server.js
```

### 3. Web Sitesini Açın
Tarayıcınızda `http://localhost:3000` adresine gidin.

## 🔧 Konfigürasyon

### Telegram Kanalı Bağlantısı
`index.html` dosyasında Telegram kanalı linkini güncelleyin:
```html
<a href="https://t.me/your_channel" target="_blank" class="telegram-link">
```

### Bot Entegrasyonu
Bot'unuzu web sitesi ile entegre etmek için:

1. Bot'a `/api/books/update` endpoint'ini kullanarak kitapları güncelleme yetkisi verin
2. `books.json` dosyasını düzenli olarak güncelleyin
3. Web sitesi otomatik olarak yeni kitapları gösterecektir

## 📱 Responsive Tasarım

Web sitesi tüm cihazlarda mükemmel çalışır:
- **Masaüstü:** Grid görünüm, geniş ekranlar
- **Tablet:** Orta boyut ekranlar için optimize
- **Mobil:** Tek sütun görünüm, dokunmatik dostu

## 🎯 Kullanım

### Kitap Arama
1. Navbar'daki arama kutusuna kitap adı yazın
2. Sonuçlar gerçek zamanlı olarak filtrelenir
3. Kitap kartlarına tıklayarak detayları görün

### Kitap İndirme
1. Kitap kartındaki "İndir" butonuna tıklayın
2. Normal dosyalar direkt indirilir
3. Büyük dosyalar Telegram kanalına yönlendirir

### Kitap Bilgisi
1. Kitap kartındaki "i" butonuna tıklayın
2. Modal pencerede detaylı bilgi görünür
3. Modal'dan da indirme yapabilirsiniz

## 🔄 Güncelleme

Bot'unuz yeni kitap eklediğinde:
1. `books.json` dosyası güncellenir
2. Web sitesi otomatik olarak yeni kitapları gösterir
3. Arama fonksiyonu yeni kitapları da kapsar

## 🌐 Canlı Yayın

Web sitesini canlı yayına almak için:
1. Heroku, Vercel veya Netlify gibi platformları kullanın
2. `server.js` dosyasını deploy edin
3. `books.json` dosyasını düzenli olarak güncelleyin

## 📞 Destek

Herhangi bir sorunuz varsa:
- GitHub Issues kullanın
- Telegram kanalından iletişime geçin
- Dokümantasyonu kontrol edin

## 📄 Lisans

MIT License - Detaylar için LICENSE dosyasına bakın.
