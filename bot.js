require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const pdf = require('pdf-parse');


// JSON veritabanı dosyası
const DB_FILE = 'books.json';

// Bot token'ını environment'dan al
const BOT_TOKEN = process.env.BOT_TOKEN;

// Bot instance'ını oluştur
const bot = new Telegraf(BOT_TOKEN);

// Veritabanını başlat
async function initDatabase() {
    try {
        const exists = await fs.pathExists(DB_FILE);
        if (!exists) {
            await fs.writeJson(DB_FILE, { books: [] });
            console.log('Veritabanı dosyası oluşturuldu.');
        }
    } catch (error) {
        console.error('Veritabanı başlatma hatası:', error);
    }
}

// Veritabanından kitapları oku
async function getBooks() {
    try {
        const data = await fs.readJson(DB_FILE);
        return data.books || [];
    } catch (error) {
        console.error('Kitapları okuma hatası:', error);
        return [];
    }
}

// Kitabı veritabanına ekle
async function addBook(book) {
    try {
        const data = await fs.readJson(DB_FILE);
        data.books.push(book);
        await fs.writeJson(DB_FILE, data, { spaces: 2 });
        console.log(`Kitap eklendi: ${book.title}`);
    } catch (error) {
        console.error('Kitap ekleme hatası:', error);
    }
}

// PDF içeriğini oku ve ilk satırı al
async function readPdfContent(fileUrl) {
    try {
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        const pdfBuffer = Buffer.from(response.data);
        
        // Dosya boyutu kontrolü (20MB limit)
        if (pdfBuffer.length > 20 * 1024 * 1024) {
            console.log('PDF dosyası çok büyük, içerik okunamıyor');
            return 'Büyük Dosya';
        }
        
        const pdfData = await pdf(pdfBuffer);
        
        // İlk satırı al (genellikle kitap adı)
        const firstLine = pdfData.text.split('\n')[0].trim();
        return firstLine || 'Bilinməyən';
    } catch (error) {
        console.error('PDF okuma hatası:', error);
        return 'Bilinmeyen Kitap';
    }
}

// Kitap başlığını ve açıklamasını belirle (açıklama öncelikli)
function getBookTitleAndDescription(caption, filename, pdfTitle) {
    let title = '';
    let description = '';
    let categories = [];
    
    // 1. Önce açıklama metnini kontrol et
    if (caption && caption.trim()) {
        const lines = caption.trim().split('\n');
        
        // Tüm satırlarda kategori kontrolü (# ile başlayanlar)
        const nonCategoryLines = [];
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Aynı satırda birden fazla kategori olabilir (#Cinayyet #English)
            const categoryMatches = trimmedLine.match(/#\w+/g);
            if (categoryMatches) {
                // Bu satırdaki tüm kategorileri ekle
                categoryMatches.forEach(match => {
                    const category = match.substring(1).trim(); // # işaretini çıkar
                    if (category) {
                        categories.push(category);
                    }
                });
                
                // Kategorileri satırdan çıkar ve kalan metni kontrol et
                let remainingText = trimmedLine.replace(/#\w+/g, '').trim();
                if (remainingText) {
                    nonCategoryLines.push(remainingText);
                }
            } else {
                // Normal içerik satırı
                nonCategoryLines.push(trimmedLine);
            }
        }
        
        // İlk normal satır kitap adı
        if (nonCategoryLines.length > 0) {
            title = nonCategoryLines[0];
            if (nonCategoryLines.length > 1) {
                description = nonCategoryLines.slice(1).join('\n').trim();
            }
        }
        
        // Eğer açıklama yoksa, varsayılan açıklama
        if (!description) {
            description = `PDF dosyası: ${filename}`;
        }
    } else {
        // 2. Dosya adını kontrol et
        if (filename && filename !== 'Bilinməyən.pdf') {
            title = filename.replace('.pdf', '').replace(/_/g, ' ');
        } else {
            // 3. PDF içeriğini kontrol et
            if (pdfTitle && pdfTitle !== 'Bilinməyən') {
                title = pdfTitle;
            } else {
                title = 'Bilinməyən';
            }
        }
        description = `PDF Faylı: ${filename}`;
    }
    
    return { title, description, categories };
}

// Bu fonksiyon artık kullanılmıyor - PDF'ler otomatik ekleniyor

// Kitapları ara
async function searchBooks(query) {
    try {
        const books = await getBooks();
        const lowerQuery = query.toLowerCase();
        
        return books.filter(book => 
            book.title.toLowerCase().includes(lowerQuery) ||
            book.description.toLowerCase().includes(lowerQuery)
        );
    } catch (error) {
        console.error('Kitap arama hatası:', error);
        return [];
    }
}

// Bot komutları
bot.start((ctx) => {
    ctx.reply(`Salam,
Kitab axtarış botuna xoş gəldiniz. 
Bu lahiyə ilə istər Telegram kanalımızdan, botumuzdan və ya Web saytımıdan kitab axtarıb yükləyə bilərsiniz.

Aşağıdan düymələri istifadə edin`,{
    reply_markup:{
        inline_keyboard:[
            [{
                text:'Kanal',
                url:'t.me/samil'
            }],
            [{
                text:'Web',
                url:'t.me/samil'
            }]
        ]
    }
});
});

// // Admin kontrolü
// async function isAdmin(ctx) {
//     try {
//         if (ctx.chat.type === 'private') return true;
        
//         const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.botInfo.id);
//         return member.status === 'administrator' || member.status === 'creator';
//     } catch (error) {
//         console.error('Admin kontrol hatası:', error);
//         return false;
//     }
// }

// Metin araması (komut olmadan)
bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    
    // Komut değilse arama yap
    if (!text.startsWith('/')) {
        const results = await searchBooks(text);
        
        if (results.length === 0) {
            return ctx.reply(`🔍 "${text}" Üçün nəticə tapılmadı.`);
        }
        
        let message = `Axtarış nəticəsində tapılan kitablar: \n\n`;
        
        // İlk 5 sonucu göster
        const displayResults = results.slice(0, 5);
        
        displayResults.forEach((book, index) => {
            message += `${index + 1}. ${book.title}\n`;
        });
        
        if (results.length > 5) {
            message += `\n... və ${results.length - 5} nəticə daha.`;
        }
        
        // Inline keyboard oluştur
        const keyboard = [];
        displayResults.forEach((book, index) => {
            keyboard.push([
                Markup.button.callback(
                    `${book.title}`,
                    `send_book_${book.messageId}`
                )
            ]);
        });
        
        const inlineKeyboard = Markup.inlineKeyboard(keyboard);
        
        ctx.reply(message, inlineKeyboard);
    }
});



// PDF dosyalarını yakala (normal mesajlar)
bot.on('document', async (ctx) => {
    const document = ctx.message.document;
    
    // PDF dosyası kontrolü
    if (document.mime_type === 'application/pdf') {
        const fileId = document.file_id;
        const filename = document.file_name || 'Bilinməyən.pdf';
        const caption = ctx.message.caption || '';
        
        try {
            // Dosya boyutu kontrolü
            if (document.file_size && document.file_size > 50 * 1024 * 1024) { // 50MB limit
                console.log(`PDF faylı çox böyükdür: ${filename} (${Math.round(document.file_size / 1024 / 1024)}MB)`);
                
                const { title, description, categories } = getBookTitleAndDescription(caption, filename, 'Böyük fayl');
                
                const book = {
                    title: title,
                    description: description || `PDF faylı: ${filename} (${Math.round(document.file_size / 1024 / 1024)}MB)`,
                    categories: categories,
                    filename: filename,
                    fileId: fileId,
                    fileUrl: '',
                    addedAt: new Date().toLocaleString('tr-TR'),
                    channelId: ctx.chat.id,
                    messageId: ctx.message.message_id,
                    messageLink: `https://t.me/c/${String(ctx.chat.id).slice(4)}/${ctx.message.message_id}`,
                    isLargeFile: true
                };
                
                await addBook(book);
                // ctx.reply(`✅ Büyük kitap kaydedildi: ${title}\n📁 Boyut: ${Math.round(document.file_size / 1024 / 1024)}MB`);
                return;
            }
            
            // Dosya bilgilerini al
            const fileInfo = await ctx.telegram.getFile(fileId);
            const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
            
            // PDF içeriğini oku
            const pdfTitle = await readPdfContent(fileUrl);
            
            // Kitap başlığını ve açıklamasını belirle
            const { title, description, categories } = getBookTitleAndDescription(caption, filename, pdfTitle);
            
            const book = {
                title: title,
                description: description,
                categories: categories,
                filename: filename,
                fileId: fileId,
                fileUrl: fileUrl,
                addedAt: new Date().toLocaleString('tr-TR'),
                channelId: ctx.chat.id,
                messageId: ctx.message.message_id,
                messageLink: `https://t.me/c/${String(ctx.chat.id).slice(4)}/${ctx.message.message_id}`,
                isLargeFile: false
            };
            
            await addBook(book);
            
            // ctx.reply(`✅ Kitap kaydedildi: ${title}`);
            
        } catch (error) {
            console.error('PDF işleme hatası:', error);
            
            // Hata durumunda da kaydet (dosya çok büyük olabilir)
            const { title, description, categories } = getBookTitleAndDescription(caption, filename, 'Hata');
            
            const book = {
                title: title,
                description: description || `PDF faylı: ${filename} (işlənmədi)`,
                categories: categories,
                filename: filename,
                fileId: fileId,
                fileUrl: '',
                addedAt: new Date().toLocaleString('tr-TR'),
                channelId: ctx.chat.id,
                messageId: ctx.message.message_id,
                messageLink: `https://t.me/c/${String(ctx.chat.id).slice(4)}/${ctx.message.message_id}`,
                isLargeFile: true
            };
            
            await addBook(book);
            ctx.reply(`✅ Kitab yadda saxlandı (xəta ilə): ${title}`);
        }
    }
});


// Fotoğraf dosyalarını yakala (PDF simgeleri için)
bot.on('photo', async (ctx) => {
    const photos = ctx.message.photo;
    const caption = ctx.message.caption || '';
    
    // Eğer fotoğrafın açıklamasında PDF kelimesi varsa
    if (caption.toLowerCase().includes('pdf') || caption.toLowerCase().includes('kitap')) {
        const photo = photos[photos.length - 1]; // En yüksek kaliteli fotoğraf
        const fileId = photo.file_id;
        
        try {
            const fileInfo = await ctx.telegram.getFile(fileId);
            const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
            
            const { title, description, categories } = getBookTitleAndDescription(caption, `photo_${fileId}.jpg`, 'PDF Simgesi');
            
            const book = {
                title: title,
                description: `PDF simgesi: ${caption}`,
                categories: categories,
                filename: `photo_${fileId}.jpg`,
                fileId: fileId,
                fileUrl: fileUrl,
                addedAt: new Date().toLocaleString('tr-TR'),
                channelId: ctx.chat.id,
                messageId: ctx.message.message_id,
                messageLink: `https://t.me/c/${String(ctx.chat.id).slice(4)}/${ctx.message.message_id}`
            };
            
            await addBook(book);
            
            ctx.reply(`✅ PDF simgesi kaydedildi: ${title}`);
            
        } catch (error) {
            console.error('Fotoğraf işleme hatası:', error);
            ctx.reply('❌ Fotoğraf işlenirken hata oluştu.');
        }
    }
});

// Kanal mesajlarını yakala (komutlar için)
bot.on('channel_post', async (ctx) => {
    const post = ctx.channelPost;
    
    // PDF dosyası kontrolü
    if (post.document && post.document.mime_type === 'application/pdf') {
        const fileId = post.document.file_id;
        const filename = post.document.file_name || 'Bilinmeyen Dosya.pdf';
        const caption = post.caption || '';
        
        try {
            // Dosya boyutu kontrolü
            if (post.document.file_size && post.document.file_size > 50 * 1024 * 1024) { // 50MB limit
                console.log(`Kanal PDF dosyası çok büyük: ${filename} (${Math.round(post.document.file_size / 1024 / 1024)}MB)`);
                
                const { title, description, categories } = getBookTitleAndDescription(caption, filename, 'Büyük Dosya');
                
                const book = {
                    title: title,
                    description: description || `PDF dosyası: ${filename} (${Math.round(post.document.file_size / 1024 / 1024)}MB)`,
                    categories: categories,
                    filename: filename,
                    fileId: fileId,
                    fileUrl: '',
                    addedAt: new Date().toLocaleString('tr-TR'),
                    channelId: ctx.chat.id,
                    messageId: post.message_id,
                    messageLink: `https://t.me/c/${String(ctx.chat.id).slice(4)}/${post.message_id}`,
                    isLargeFile: true
                };
                
                await addBook(book);
                // await ctx.reply(`✅ Büyük kitap kaydedildi: ${title}\n📁 Boyut: ${Math.round(post.document.file_size / 1024 / 1024)}MB`);
                return;
            }
            
            // Dosya bilgilerini al
            const fileInfo = await ctx.telegram.getFile(fileId);
            const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.file_path}`;
            
            // PDF içeriğini oku
            const pdfTitle = await readPdfContent(fileUrl);
            
            // Kitap başlığını ve açıklamasını belirle
            const { title, description, categories } = getBookTitleAndDescription(caption, filename, pdfTitle);
            
            const book = {
                title: title,
                description: description,
                categories: categories,
                filename: filename,
                fileId: fileId,
                fileUrl: fileUrl,
                addedAt: new Date().toLocaleString('tr-TR'),
                channelId: ctx.chat.id,
                messageId: post.message_id,
                messageLink: `https://t.me/c/${String(ctx.chat.id).slice(4)}/${post.message_id}`,
                isLargeFile: false
            };
            
            await addBook(book);
            
            // Kanalda mesaj gönder
            // await ctx.reply(`✅ Kitap kaydedildi: ${title}`);
            
        } catch (error) {
            console.error('Kanal PDF işleme hatası:', error);
            
            // Hata durumunda da kaydet
            const { title, description, categories } = getBookTitleAndDescription(caption, filename, 'Hata');
            
            const book = {
                title: title,
                description: description || `PDF dosyası: ${filename} (İşlenemedi)`,
                categories: categories,
                filename: filename,
                fileId: fileId,
                fileUrl: '',
                addedAt: new Date().toLocaleString('tr-TR'),
                channelId: ctx.chat.id,
                messageId: post.message_id,
                messageLink: `https://t.me/c/${String(ctx.chat.id).slice(4)}/${post.message_id}`,
                isLargeFile: true
            };
            
            await addBook(book);
            // await ctx.reply(`✅ Kitap kaydedildi (hata ile): ${title}`);
        }
    }
    
    // Komut kontrolü
    if (post.text && post.text.startsWith('/')) {
        const command = post.text.split(' ')[0];
        
        switch (command) {
            case '/list':
                const books = await getBooks();
                if (books.length > 0) {
                    let responseText = `📚 Toplam ${books.length} kitap tapıldı:\n\n`;
                    books.slice(0, 10).forEach((book, index) => {
                        responseText += `${index + 1}. 📖 ${book.title}\n`;
                    });
                    await ctx.reply(responseText);
                } else {
                    await ctx.reply('📚 Henüz hiç kitap kaydedilmemiş.');
                }
                break;
        }
    }
    
    // Metin araması (komut olmadan)
    if (post.text && !post.text.startsWith('/')) {
        const text = post.text.trim();
        const results = await searchBooks(text);
        
        if (results.length === 0) {
            return await ctx.reply(`🔍 "${text}" için sonuç bulunamadı.`);
        }
        
        let message = `Axtaris neticesinde tapilan kitablar: \n\n`;
        
        // İlk 5 sonucu göster
        const displayResults = results.slice(0, 5);
        
        displayResults.forEach((book, index) => {
            message += `${index + 1}. ${book.title}\n`;
        });
        
        if (results.length > 5) {
            message += `\n... ve ${results.length - 5} sonuç daha.`;
        }
        
        // Inline keyboard oluştur
        const keyboard = [];
        displayResults.forEach((book, index) => {
            keyboard.push([
                Markup.button.callback(
                    `${book.title}`,
                    `send_book_${book.messageId}`
                )
            ]);
        });
        
        const inlineKeyboard = Markup.inlineKeyboard(keyboard);
        
        await ctx.reply(message, inlineKeyboard);
    }
});

// Callback query handler (buton tıklamaları)
bot.on('callback_query', async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    
    if (callbackData.startsWith('send_book_')) {
        const messageId = callbackData.replace('send_book_', '');
        
        try {
            // Kitabı bul
            const books = await getBooks();
            const book = books.find(b => b.messageId == messageId);
            
            if (book) {
                // Büyük dosya kontrolü
                if (book.isLargeFile) {
                    const keyboard = Markup.inlineKeyboard([
                        [Markup.button.url('📖 Kitabı İndir', book.messageLink)]
                    ]);
                    
                    await ctx.reply(`${book.title}\n\n${book.description || ''}\n\n⚠️ Bu fayl çox böyük olduğu üçün birbaşa göndərilə bilməz..`, keyboard);
                    await ctx.answerCbQuery('Böyük fayl - düymə göndərildi');
                    return;
                }
                
                // PDF dosyasını gönder
                await ctx.replyWithDocument(book.fileId, {
                    caption: `${book.title}\n\n${book.description || ''}`
                });
                
                // Callback query'yi yanıtla
                await ctx.answerCbQuery('Kitap gönderildi!');
            } else {
                await ctx.answerCbQuery('Kitap bulunamadı!');
            }
        } catch (error) {
            console.error('PDF gönderme hatası:', error);
            
            // Hata durumunda buton gönder
            if (book && book.messageLink) {
                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.url('📖 Kitabı İndir', book.messageLink)]
                ]);
                
                await ctx.reply(`${book.title}\n\n${book.description || ''}\n\n⚠️ PDF göndərilərkən xəta baş verdi.`, keyboard);
                await ctx.answerCbQuery('Xəta - düymə göndərildi');
            } else {
                await ctx.answerCbQuery('PDF göndərərkən xəta baş verdi!');
            }
        }
    }
});

// Hata yakalama
bot.catch((err, ctx) => {
    console.error('Bot hatası:', err);
    if (ctx.message) {
        ctx.reply('❌ Bir hata oluştu. Lütfen tekrar deneyin.');
    }
});

// Botu başlat
async function startBot() {
    try {
        await initDatabase();
        console.log('Veritabanı hazırlandı.');
        
        // Bot komutlarını ayarla
        await bot.telegram.setMyCommands([
            { command: 'start', description: 'Botu başlatır' },
            { command: 'help', description: 'Yardım menüsü' },
            { command: 'list', description: 'Tüm kitapları listeler' }
        ]);
        
        console.log('Bot komutları ayarlandı.');
        
        await bot.launch();
        console.log('🤖 Bot başlatıldı!');
        
        // Graceful stop
        process.once('SIGINT', () => bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot.stop('SIGTERM'));
        
    } catch (error) {
        console.error('Bot başlatma hatası:', error);
    }
}

// Botu başlat
startBot();
