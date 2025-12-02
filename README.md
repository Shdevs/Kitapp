# Telegram Book Search Bot

This project is a bot system that automatically detects PDF books in Telegram channels, categorizes them and displays them on the website.

## 🚀 Quick Start

### 1. Setup
```bash
npm install
```

### 2. Configuration
`.env` Create the file:
```bash
cp config.example.env .env
```

`.env` Update your bot token in the file:
```
BOT_TOKEN=your_bot_token_here
DB_FILE=books.json
PORT=3000
```

### 3. Operating
```bash
npm start
```

This command runs both the bot and the website:
- **Bot:** listens to Telegram channels and processes PDFs
- **Website:** runs at http://localhost:3000

## 📚 Features

### Bot Features
- ✅ Automatic detection of PDFs in Telegram channels
- ✅ Category system (in `#Novel #Azerbaijan` format)
- ✅ Extract book titles from PDF content
- ✅ Large file support (50MB+)
- ✅ Search system (by book title/author name)
### Website Features
- ✅ Modern, responsive design
- ✅ Category filtering
- ✅ Number of books per page selection (10, 50, 100, All)
- ✅ Pagination system
- ✅ View and download counter
- ✅ Direct PDF download
- ✅ Book details with Modal

## 📁 Project Structure

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

## 🔧 Technologies

- **Node.js** - Runtime
- **Telegraf** - Telegram Bot API
- **Express** - Web server
- **pdf-parse** - PDF content reading
- **fs-extra** - File operations
- **axios** - HTTP requests
- **concurrently** - Parallel process management

## 📝 Lisans


MIT License
