# Telegram Book Search Bot

Bu proje, Telegram kanallarındaki PDF kitapları otomatik olarak algılayan, kategorilere ayıran ve web sitesinde görüntüleyen bir bot sistemidir.

## 🚀 Hızlı Başlangıç

### 1. Kurulum
```bash
npm install
```

### 2. Konfigürasyon
`.env` dosyasını oluşturun:
```bash
cp config.example.env .env
```

`.env` dosyasında bot token'ınızı güncelleyin:
```
BOT_TOKEN=your_bot_token_here
DB_FILE=books.json
PORT=3000
```

### 3. Çalıştırma
```bash
npm start
```

Bu komut hem bot'u hem de web sitesini çalıştırır:
- **Bot:** Telegram kanallarını dinler ve PDF'leri işler
- **Web Sitesi:** http://localhost:3000 adresinde çalışır

## 📚 Özellikler

### Bot Özellikleri
- ✅ Telegram kanallarındaki PDF'leri otomatik algılama
- ✅ Kategori sistemi (`#Roman #Azerbaycan` formatında)
- ✅ PDF içeriğinden kitap başlığı çıkarma
- ✅ Büyük dosya desteği (50MB+)
- ✅ Arama sistemi (kitap adı/yazar adı ile)

### Web Sitesi Özellikleri
- ✅ Modern, responsive tasarım
- ✅ Kategori filtreleme
- ✅ Sayfa başına kitap sayısı seçimi (10, 50, 100, Tümü)
- ✅ Pagination sistemi
- ✅ Görüntüleme ve indirme sayacı
- ✅ Direkt PDF indirme
- ✅ Modal ile kitap detayları

## 🎯 Kullanım

### Bot'ta Kitap Ekleme
```
#Roman
#Azerbaycan
Kitap Adı
Kitap açıklaması...
```

### Kategori Sistemi
- `#Roman` - Roman kategorisi
- `#Azerbaycan` - Azerbaycan kategorisi
- `#Cinayyet` - Cinayet kategorisi
- `#English` - İngilizce kategorisi

Aynı satırda birden fazla kategori: `#Roman #Azerbaycan`

### Web Sitesi
- **Ana Sayfa:** http://localhost:3000
- **API:** http://localhost:3000/api/books
- **JSON:** http://localhost:3000/books.json

## 🛠️ Geliştirme

### Sadece Bot
```bash
npm run bot
```

### Sadece Web Sitesi
```bash
npm run web
```

### Geliştirme Modu (Auto-reload)
```bash
npm run dev
```

## 📁 Proje Yapısı

```
├── bot.js              # Telegram bot ana dosyası
├── server.js           # Express web sunucusu
├── books.json          # Kitap veritabanı
├── index.html          # Web sitesi ana sayfa
├── style.css           # CSS stilleri
├── script.js           # JavaScript mantığı
├── package.json        # NPM konfigürasyonu
├── config.example.env  # Örnek environment dosyası
└── README.md           # Bu dosya
```

## 🔧 Teknolojiler

- **Node.js** - Runtime
- **Telegraf** - Telegram Bot API
- **Express** - Web sunucusu
- **pdf-parse** - PDF içerik okuma
- **fs-extra** - Dosya işlemleri
- **axios** - HTTP istekleri
- **concurrently** - Paralel process yönetimi

## 📝 Lisans

MIT License