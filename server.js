require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const multer = require('multer');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const ngrok = require('ngrok');

const app = express();
const PORT = process.env.PORT || 3000;
const API = "212.87.221.194";
// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads', 'book-images');
const pdfsDir = path.join(__dirname, 'uploads', 'books');
const audioDir = path.join(__dirname, 'uploads', 'audiobooks');
fsExtra.ensureDirSync(uploadsDir);
fsExtra.ensureDirSync(pdfsDir);
fsExtra.ensureDirSync(audioDir);

// Configure multer for image uploads
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'book-' + uniqueSuffix + ext);
    }
});

const uploadImage = multer({
    storage: imageStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Sadece resim dosyaları yüklenebilir!'));
        }
    }
});

// Configure multer for PDF uploads
const pdfStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, pdfsDir);
    },
    filename: (req, file, cb) => {
        const cleanName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, Date.now() + '-' + cleanName);
    }
});

const uploadPdf = multer({
    storage: pdfStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
            cb(null, true);
        } else {
            cb(new Error('Sadece PDF dosyaları yüklenebilir!'));
        }
    }
});

// Configure multer for audio uploads
const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, audioDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'audio-' + uniqueSuffix + ext);
    }
});

const uploadAudio = multer({
    storage: audioStorage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /mp3|wav|m4a|ogg|aac/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Sadece ses dosyaları yüklenebilir! (MP3, WAV, M4A, OGG, AAC)'));
        }
    }
});

// Combined upload for books (PDF + optional image)
const uploadBook = multer({
    storage: multer.memoryStorage(),
    limits: { 
        fileSize: 50 * 1024 * 1024,
        files: 2 // PDF + optional image
    }
});

// Combined upload for audiobooks (audio + optional image)
const uploadAudiobook = multer({
    storage: multer.memoryStorage(),
    limits: { 
        fileSize: 100 * 1024 * 1024,
        files: 2 // Audio + optional image
    }
});

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'sessionId', // Explicit session name
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax', // Allow cross-page cookie sharing
        path: '/' // Ensure cookie is available for all paths
    }
}));
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// File upload endpoints must be before express.json()
// Admin - Add new book endpoint
app.post('/api/admin/books', uploadBook.fields([{ name: 'pdf', maxCount: 1 }, { name: 'image', maxCount: 1 }]), async (req, res) => {
    try {
        const { title, description, categories, imageUrl } = req.body;
        const pdfFile = req.files && req.files['pdf'] ? req.files['pdf'][0] : null;
        const imageFile = req.files && req.files['image'] ? req.files['image'][0] : null;

        if (!pdfFile) {
            return res.status(400).json({ error: 'PDF dosyası yüklenmedi' });
        }

        if (!title) {
            return res.status(400).json({ error: 'Kitab başlığı gerekli' });
        }

        // Save PDF file
        const pdfFilename = Date.now() + '-' + pdfFile.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const pdfPath = path.join(pdfsDir, pdfFilename);
        fs.writeFileSync(pdfPath, pdfFile.buffer);

        // Save image if provided
        let finalImageUrl = imageUrl || undefined;
        if (imageFile) {
            const imageExt = path.extname(imageFile.originalname);
            const imageFilename = 'book-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + imageExt;
            const imagePath = path.join(uploadsDir, imageFilename);
            fs.writeFileSync(imagePath, imageFile.buffer);
            finalImageUrl = `/uploads/book-images/${imageFilename}`;
        }

        // Parse categories
        let categoriesArray = [];
        if (categories) {
            try {
                categoriesArray = JSON.parse(categories);
            } catch {
                categoriesArray = categories.split(',').map(c => c.trim()).filter(c => c.length > 0);
            }
        }

        // Create book object
        const fileId = 'manual-' + Date.now() + '-' + Math.round(Math.random() * 1E9);
        const now = new Date();
        const addedAt = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        const newBook = {
            title: title,
            description: description || `PDF dosyası: ${pdfFile.originalname}`,
            categories: categoriesArray,
            filename: pdfFile.originalname,
            fileId: fileId,
            fileUrl: `/uploads/books/${pdfFilename}`,
            addedAt: addedAt,
            isLargeFile: pdfFile.size > 50 * 1024 * 1024,
            imageUrl: finalImageUrl
        };

        // Read existing books
        const booksPath = path.join(__dirname, 'books.json');
        const booksData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
        booksData.books.push(newBook);

        // Save to both files
        fs.writeFileSync(booksPath, JSON.stringify(booksData, null, 2));
        const publicBooksPath = path.join(__dirname, 'public', 'books.json');
        if (fs.existsSync(path.dirname(publicBooksPath))) {
            fs.writeFileSync(publicBooksPath, JSON.stringify(booksData, null, 2));
        }

        res.json({ success: true, book: newBook });
    } catch (error) {
        console.error('Error adding book:', error);
        res.status(500).json({ error: 'Failed to add book: ' + error.message });
    }
});

// Admin - Upload image file endpoint
app.post('/api/admin/upload-image/:fileId', uploadImage.single('image'), async (req, res) => {
    try {
        const { fileId } = req.params;
        
        if (!req.file) {
            return res.status(400).json({ error: 'Resim dosyası yüklenmedi' });
        }
        
        const booksPath = path.join(__dirname, 'books.json');
        const booksData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
        
        const bookIndex = booksData.books.findIndex(b => b.fileId === fileId);
        if (bookIndex === -1) {
            // Delete uploaded file if book not found
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Book not found' });
        }
        
        // Delete old image if exists
        if (booksData.books[bookIndex].imageUrl && booksData.books[bookIndex].imageUrl.startsWith('/uploads/')) {
            const oldImagePath = path.join(__dirname, booksData.books[bookIndex].imageUrl);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }
        
        // Update book image URL
        const imageUrl = `/uploads/book-images/${req.file.filename}`;
        booksData.books[bookIndex].imageUrl = imageUrl;
        
        // Save to both files
        fs.writeFileSync(booksPath, JSON.stringify(booksData, null, 2));
        const publicBooksPath = path.join(__dirname, 'public', 'books.json');
        if (fs.existsSync(path.dirname(publicBooksPath))) {
            fs.writeFileSync(publicBooksPath, JSON.stringify(booksData, null, 2));
        }
        
        res.json({ success: true, imageUrl });
    } catch (error) {
        console.error('Upload image error:', error);
        // Delete uploaded file on error
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to upload image: ' + error.message });
    }
});

// JSON body parser for other endpoints
app.use(express.json());

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET';
let REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
let NGROK_URL = null;

// Validate Google OAuth credentials
if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID' || GOOGLE_CLIENT_SECRET === 'YOUR_GOOGLE_CLIENT_SECRET') {
    console.warn('⚠️  WARNING: Google OAuth credentials are not configured!');
    console.warn('Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file');
}

// Get Google OAuth URL
app.get('/api/auth/google', (req, res) => {
    if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID' || GOOGLE_CLIENT_SECRET === 'YOUR_GOOGLE_CLIENT_SECRET') {
        return res.status(500).json({ 
            error: 'Google OAuth credentials not configured',
            message: 'Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file'
        });
    }
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `response_type=code&` +
        `scope=openid email profile&` +
        `access_type=offline&` +
        `prompt=consent`;
    res.json({ authUrl });
});

// Google OAuth Callback
app.get('/api/auth/google/callback', async (req, res) => {
    try {
        // Check if credentials are configured
        if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID' || GOOGLE_CLIENT_SECRET === 'YOUR_GOOGLE_CLIENT_SECRET') {
            return res.redirect('/?error=auth_failed&message=' + encodeURIComponent('Google OAuth credentials not configured'));
        }
        
        const { code } = req.query;
        
        if (!code) {
            return res.redirect('/?error=no_code');
        }
        
        // Exchange code for tokens
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', 
            new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        const { access_token } = tokenResponse.data;
        
        if (!access_token) {
            console.error('No access token received:', tokenResponse.data);
            return res.redirect('/?error=no_token');
        }
        
        // Get user info from Google
        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        });
        
        const userData = userResponse.data;
        
        console.log('Google user data received:', {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            picture: userData.picture ? 'present' : 'missing',
            pictureUrl: userData.picture
        });
        
        // Ensure picture is properly extracted
        const userPicture = userData.picture || '';
        console.log('Extracted picture URL:', userPicture);
        
        // Get or create user
        const user = getOrCreateUser({
            email: userData.email,
            name: userData.name,
            picture: userPicture
        });
        
        console.log('User after getOrCreateUser:', {
            email: user.email,
            picture: user.picture,
            pictureLength: user.picture ? user.picture.length : 0
        });
        
        // Check if user is banned
        if (user.banned) {
            console.log('Banned user attempted to login:', user.email);
            return res.redirect('/banned.html');
        }
        
        // Save user data to session (use picture from database which was just updated)
        const sessionPicture = user.picture || userData.picture || '';
        console.log('Setting session picture:', sessionPicture);
        console.log('User picture from DB:', user.picture);
        console.log('UserData picture from Google:', userData.picture);
        
        req.session.user = {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            picture: sessionPicture,
            verified: user.verified || userData.verified_email,
            banned: user.banned || false
        };
        
        console.log('Session saved with picture:', {
            email: req.session.user.email,
            picture: req.session.user.picture,
            pictureLength: req.session.user.picture ? req.session.user.picture.length : 0
        });
        
        // Redirect to home page
        res.redirect('/');
    } catch (error) {
        console.error('Google OAuth error:', error.response?.data || error.message);
        const errorMessage = error.response?.data?.error_description || error.message;
        res.redirect(`/?error=auth_failed&message=${encodeURIComponent(errorMessage)}`);
    }
});

// Get current user
app.get('/api/auth/user', (req, res) => {
    if (req.session && req.session.user) {
        // Check if user is banned in users.json
        const usersData = loadUsers();
        const userInDb = usersData.users.find(u => u.email === req.session.user.email);
        
        if (userInDb && userInDb.banned) {
            // Update session with banned status
            req.session.user.banned = true;
            return res.json({ 
                user: req.session.user,
                banned: true 
            });
        }
        
        // Update session with latest data from database (including picture)
        if (userInDb) {
            if (userInDb.picture && userInDb.picture.trim() !== '') {
                req.session.user.picture = userInDb.picture;
            }
            if (userInDb.name) {
                req.session.user.name = userInDb.name;
            }
            req.session.user.banned = userInDb.banned || false;
        }
        
        res.json({ 
            user: req.session.user,
            banned: req.session.user.banned 
        });
    } else {
        res.json({ user: null, banned: false });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

// API endpoint to get books
app.get('/api/books', (req, res) => {
    try {
        const booksPath = path.join(__dirname, 'books.json');
        
        if (fs.existsSync(booksPath)) {
            const booksData = fs.readFileSync(booksPath, 'utf8');
            const books = JSON.parse(booksData);
            res.json(books);
        } else {
            res.json({ books: [] });
        }
    } catch (error) {
        console.error('Error reading books:', error);
        res.status(500).json({ error: 'Failed to read books' });
    }
});

// API endpoint to get books from public folder
app.get('/books.json', (req, res) => {
    try {
        const publicBooksPath = path.join(__dirname, 'public', 'books.json');
        
        if (fs.existsSync(publicBooksPath)) {
            res.sendFile(publicBooksPath);
        } else {
            // Fallback to main books.json
            const booksPath = path.join(__dirname, 'books.json');
            if (fs.existsSync(booksPath)) {
                res.sendFile(booksPath);
            } else {
                res.status(404).json({ error: 'Books file not found' });
            }
        }
    } catch (error) {
        console.error('Error serving books:', error);
        res.status(500).json({ error: 'Failed to serve books' });
    }
});

// Update books endpoint (for bot to update)
app.post('/api/books/update', (req, res) => {
    try {
        const booksData = req.body;
        const publicBooksPath = path.join(__dirname, 'public', 'books.json');
        
        fs.writeFileSync(publicBooksPath, JSON.stringify(booksData, null, 2));
        
        res.json({ success: true, message: 'Books updated successfully' });
    } catch (error) {
        console.error('Error updating books:', error);
        res.status(500).json({ error: 'Failed to update books' });
    }
});

// Admin login endpoint
app.post('/api/admin/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        const adminPath = path.join(__dirname, 'admin.json');
        if (!fs.existsSync(adminPath)) {
            return res.status(401).json({ error: 'Admin not found' });
        }
        
        const adminData = JSON.parse(fs.readFileSync(adminPath, 'utf8'));
        const admin = adminData.admins.find(a => a.username === username && a.password === password);
        
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create session token
        const token = crypto.randomBytes(32).toString('hex');
        
        res.json({ success: true, token, username: admin.username });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Admin - Update book endpoint
app.put('/api/admin/books/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const updates = req.body;
        
        const booksPath = path.join(__dirname, 'books.json');
        const booksData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
        
        const bookIndex = booksData.books.findIndex(b => b.fileId === fileId);
        if (bookIndex === -1) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        // Update book
        booksData.books[bookIndex] = {
            ...booksData.books[bookIndex],
            ...updates
        };
        
        // Save to both files
        fs.writeFileSync(booksPath, JSON.stringify(booksData, null, 2));
        const publicBooksPath = path.join(__dirname, 'public', 'books.json');
        if (fs.existsSync(path.dirname(publicBooksPath))) {
            fs.writeFileSync(publicBooksPath, JSON.stringify(booksData, null, 2));
        }
        
        res.json({ success: true, book: booksData.books[bookIndex] });
    } catch (error) {
        console.error('Update book error:', error);
        res.status(500).json({ error: 'Failed to update book' });
    }
});

// Admin - Delete book endpoint
app.delete('/api/admin/books/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        
        const booksPath = path.join(__dirname, 'books.json');
        const booksData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
        
        const bookIndex = booksData.books.findIndex(b => b.fileId === fileId);
        if (bookIndex === -1) {
            return res.status(404).json({ error: 'Book not found' });
        }

        // Get book info for file deletion
        const book = booksData.books[bookIndex];
        
        // Delete local PDF file if it exists
        if (book.url && book.url.includes('/uploads/books/')) {
            const pdfPath = path.join(__dirname, book.url);
            if (fs.existsSync(pdfPath)) {
                try {
                    fs.unlinkSync(pdfPath);
                    console.log('Deleted PDF file:', pdfPath);
                } catch (err) {
                    console.error('Error deleting PDF file:', err);
                }
            }
        }

        // Delete local image file if it exists
        if (book.imageUrl && book.imageUrl.includes('/uploads/book-images/')) {
            const imagePath = path.join(__dirname, book.imageUrl);
            if (fs.existsSync(imagePath)) {
                try {
                    fs.unlinkSync(imagePath);
                    console.log('Deleted image file:', imagePath);
                } catch (err) {
                    console.error('Error deleting image file:', err);
                }
            }
        }
        
        // Remove book from array
        booksData.books.splice(bookIndex, 1);
        
        // Save to both files
        fs.writeFileSync(booksPath, JSON.stringify(booksData, null, 2));
        const publicBooksPath = path.join(__dirname, 'public', 'books.json');
        if (fs.existsSync(path.dirname(publicBooksPath))) {
            fs.writeFileSync(publicBooksPath, JSON.stringify(booksData, null, 2));
        }
        
        res.json({ success: true, message: 'Book deleted successfully' });
    } catch (error) {
        console.error('Delete book error:', error);
        res.status(500).json({ error: 'Failed to delete book' });
    }
});

// Admin - Upload image file endpoint
app.post('/api/admin/upload-image/:fileId', uploadImage.single('image'), async (req, res) => {
    try {
        const { fileId } = req.params;
        
        if (!req.file) {
            return res.status(400).json({ error: 'Resim dosyası yüklenmedi' });
        }
        
        const booksPath = path.join(__dirname, 'books.json');
        const booksData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
        
        const bookIndex = booksData.books.findIndex(b => b.fileId === fileId);
        if (bookIndex === -1) {
            // Delete uploaded file if book not found
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Book not found' });
        }
        
        // Delete old image if exists
        if (booksData.books[bookIndex].imageUrl && booksData.books[bookIndex].imageUrl.startsWith('/uploads/')) {
            const oldImagePath = path.join(__dirname, booksData.books[bookIndex].imageUrl);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }
        
        // Update book image URL
        const imageUrl = `/uploads/book-images/${req.file.filename}`;
        booksData.books[bookIndex].imageUrl = imageUrl;
        
        // Save to both files
        fs.writeFileSync(booksPath, JSON.stringify(booksData, null, 2));
        const publicBooksPath = path.join(__dirname, 'public', 'books.json');
        if (fs.existsSync(path.dirname(publicBooksPath))) {
            fs.writeFileSync(publicBooksPath, JSON.stringify(booksData, null, 2));
        }
        
        res.json({ success: true, imageUrl });
    } catch (error) {
        console.error('Upload image error:', error);
        // Delete uploaded file on error
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to upload image: ' + error.message });
    }
});

// Admin - Upload image URL endpoint (for backward compatibility)
app.post('/api/admin/upload-image-url/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const { imageUrl } = req.body;
        
        const booksPath = path.join(__dirname, 'books.json');
        const booksData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
        
        const bookIndex = booksData.books.findIndex(b => b.fileId === fileId);
        if (bookIndex === -1) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        // Update book image
        booksData.books[bookIndex].imageUrl = imageUrl;
        
        // Save to both files
        fs.writeFileSync(booksPath, JSON.stringify(booksData, null, 2));
        const publicBooksPath = path.join(__dirname, 'public', 'books.json');
        if (fs.existsSync(path.dirname(publicBooksPath))) {
            fs.writeFileSync(publicBooksPath, JSON.stringify(booksData, null, 2));
        }
        
        res.json({ success: true, imageUrl });
    } catch (error) {
        console.error('Upload image URL error:', error);
        res.status(500).json({ error: 'Failed to upload image URL' });
    }
});

// Serve admin login page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve admin panel page
app.get('/admin-panel.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-panel.html'));
});

// Admin - Get all categories with counts
app.get('/api/admin/categories', (req, res) => {
    try {
        const booksPath = path.join(__dirname, 'books.json');
        const booksData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
        
        const categoryCounts = {};
        booksData.books.forEach(book => {
            if (book.categories && Array.isArray(book.categories)) {
                book.categories.forEach(cat => {
                    if (cat && cat.trim()) {
                        const categoryName = cat.trim();
                        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
                    }
                });
            }
        });
        
        const categories = Object.keys(categoryCounts).map(name => ({
            name,
            count: categoryCounts[name]
        })).sort((a, b) => b.count - a.count);
        
        res.json({ categories });
    } catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({ error: 'Failed to get categories' });
    }
});

// Admin - Add category to all books (optional, just for reference)
app.post('/api/admin/categories', (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Category name is required' });
        }
        
        // This endpoint just confirms the category exists in the system
        // Categories are managed through book updates
        res.json({ success: true, message: 'Category can be used in books' });
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({ error: 'Failed to add category' });
    }
});

// Admin - Remove category from all books
app.delete('/api/admin/categories/:categoryName', (req, res) => {
    try {
        const { categoryName } = req.params;
        const decodedCategoryName = decodeURIComponent(categoryName);
        
        const booksPath = path.join(__dirname, 'books.json');
        const booksData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
        
        let updated = false;
        booksData.books.forEach(book => {
            if (book.categories && Array.isArray(book.categories)) {
                const originalLength = book.categories.length;
                book.categories = book.categories.filter(cat => cat.trim() !== decodedCategoryName);
                if (book.categories.length !== originalLength) {
                    updated = true;
                }
            }
        });
        
        if (updated) {
            // Save to both files
            fs.writeFileSync(booksPath, JSON.stringify(booksData, null, 2));
            const publicBooksPath = path.join(__dirname, 'public', 'books.json');
            if (fs.existsSync(path.dirname(publicBooksPath))) {
                fs.writeFileSync(publicBooksPath, JSON.stringify(booksData, null, 2));
            }
            
            res.json({ success: true, message: 'Category removed from all books' });
        } else {
            res.json({ success: true, message: 'Category not found in any books' });
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

// Status management endpoints
const statusesPath = path.join(__dirname, 'statuses.json');
const usersPath = path.join(__dirname, 'users.json');

// Initialize users.json if it doesn't exist
if (!fs.existsSync(usersPath)) {
    fs.writeFileSync(usersPath, JSON.stringify({ users: [] }, null, 2));
}

// Helper function to load users
function loadUsers() {
    try {
        if (fs.existsSync(usersPath)) {
            const data = fs.readFileSync(usersPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
    return { users: [] };
}

// Helper function to save users
function saveUsers(usersData) {
    try {
        fs.writeFileSync(usersPath, JSON.stringify(usersData, null, 2));
    } catch (error) {
        console.error('Error saving users:', error);
        throw error;
    }
}

// Helper function to get or create user
function getOrCreateUser(userData) {
    const usersData = loadUsers();
    let user = usersData.users.find(u => u.email === userData.email);
    
    console.log('getOrCreateUser called with:', {
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        pictureType: typeof userData.picture,
        pictureLength: userData.picture ? userData.picture.length : 0
    });
    
    if (!user) {
        // New user - always save picture if provided
        const pictureUrl = (userData.picture && userData.picture.trim() !== '') ? userData.picture : '';
        console.log('Creating new user with picture:', pictureUrl);
        
        user = {
            email: userData.email,
            name: userData.name,
            picture: pictureUrl,
            verified: false,
            banned: false,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        usersData.users.push(user);
        saveUsers(usersData);
        console.log('New user created and saved:', {
            email: user.email,
            picture: user.picture
        });
    } else {
        // Existing user - update data
        console.log('Updating existing user:', user.email);
        console.log('Current user picture:', user.picture);
        user.lastLogin = new Date().toISOString();
        if (userData.name) user.name = userData.name;
        
        // Always update picture if Google provides a valid (non-empty) picture URL
        // Also update if current picture is empty/missing
        if (userData.picture && userData.picture.trim() !== '') {
            console.log('Updating user picture from:', user.picture, 'to:', userData.picture);
            user.picture = userData.picture;
        } else if ((!user.picture || user.picture.trim() === '') && userData.picture && userData.picture.trim() !== '') {
            // If user has no picture but Google provides one, save it
            console.log('User has no picture, saving Google picture:', userData.picture);
            user.picture = userData.picture;
        } else {
            console.log('No picture provided or picture is empty, keeping existing:', user.picture);
        }
        
        saveUsers(usersData);
        console.log('User updated and saved:', {
            email: user.email,
            picture: user.picture,
            pictureSaved: !!user.picture && user.picture.trim() !== ''
        });
    }
    
    return user;
}

// Initialize statuses.json if it doesn't exist
if (!fs.existsSync(statusesPath)) {
    fs.writeFileSync(statusesPath, JSON.stringify({ statuses: [] }, null, 2));
}

// Helper function to enrich status with verified status
function enrichStatusWithVerified(status) {
    const usersData = loadUsers();
    const user = usersData.users.find(u => u.email === status.author || u.name === status.author);
    if (user) {
        status.authorVerified = user.verified || false;
    } else {
        status.authorVerified = status.authorVerified || false;
    }
    return status;
}

// Helper function to enrich comment with verified status
function enrichCommentWithVerified(comment) {
    const usersData = loadUsers();
    const user = usersData.users.find(u => u.email === comment.author || u.name === comment.author);
    if (user) {
        comment.authorVerified = user.verified || false;
    } else {
        comment.authorVerified = comment.authorVerified || false;
    }
    return comment;
}

// Admin - Get all statuses
app.get('/api/admin/statuses', (req, res) => {
    try {
        const statusesData = JSON.parse(fs.readFileSync(statusesPath, 'utf8'));
        res.json({ statuses: statusesData.statuses || [] });
    } catch (error) {
        console.error('Error getting statuses:', error);
        res.status(500).json({ error: 'Failed to get statuses' });
    }
});

// Public - Get all statuses
app.get('/api/statuses', (req, res) => {
    try {
        // Prevent caching
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        const statusesData = JSON.parse(fs.readFileSync(statusesPath, 'utf8'));
        console.log('Getting statuses, count:', statusesData.statuses?.length || 0);
        const statuses = (statusesData.statuses || []).map(status => enrichStatusWithVerified(status));
        res.json({ statuses });
    } catch (error) {
        console.error('Error getting statuses:', error);
        res.status(500).json({ error: 'Failed to get statuses' });
    }
});

// Public - Get comments for a status
app.get('/api/statuses/:id/comments', (req, res) => {
    try {
        const { id } = req.params;
        const statusesData = JSON.parse(fs.readFileSync(statusesPath, 'utf8'));
        const status = statusesData.statuses.find(s => s.id === id);
        
        if (!status) {
            return res.status(404).json({ error: 'Status not found' });
        }
        
        const comments = (status.comments || []).map(comment => enrichCommentWithVerified(comment));
        res.json({ comments });
    } catch (error) {
        console.error('Error getting comments:', error);
        res.status(500).json({ error: 'Failed to get comments' });
    }
});

// Public - Add comment to a status
app.post('/api/statuses/:id/comments', (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Comment text is required' });
        }

        // Check if user is logged in
        const user = req.session && req.session.user;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const statusesData = JSON.parse(fs.readFileSync(statusesPath, 'utf8'));
        const statusIndex = statusesData.statuses.findIndex(s => s.id === id);
        
        if (statusIndex === -1) {
            return res.status(404).json({ error: 'Status not found' });
        }
        
        const status = statusesData.statuses[statusIndex];
        status.comments = status.comments || [];
        
        const newComment = {
            id: Date.now().toString() + '-' + Math.round(Math.random() * 1E9),
            text: text.trim(),
            date: new Date().toISOString(),
            author: user.name || user.email || 'İstifadəçi',
            authorImage: user.picture || '',
            authorVerified: user.verified || false
        };
        
        status.comments.push(newComment);
        
        fs.writeFileSync(statusesPath, JSON.stringify(statusesData, null, 2));
        
        res.json({ success: true, comment: newComment });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// Public - Add status (for logged-in users)
app.post('/api/statuses', (req, res) => {
    try {
        console.log('POST /api/statuses called');
        console.log('Request body:', req.body);
        console.log('Session user:', req.session?.user);
        
        const { text, isQuote, bookData } = req.body;
        
        if (!text || !text.trim()) {
            console.log('Error: Status text is empty');
            return res.status(400).json({ error: 'Status text is required' });
        }

        // Validate quote data
        if (isQuote && !bookData) {
            console.log('Error: Book data required for quotes');
            return res.status(400).json({ error: 'Book data is required for quotes' });
        }

        // Check if user is logged in
        const user = req.session && req.session.user;
        if (!user) {
            console.log('Error: User not authenticated');
            return res.status(401).json({ error: 'Authentication required' });
        }

        console.log('Reading statuses file:', statusesPath);
        const statusesData = JSON.parse(fs.readFileSync(statusesPath, 'utf8'));
        console.log('Current statuses count:', statusesData.statuses?.length || 0);
        
        const newStatus = {
            id: Date.now().toString() + '-' + Math.round(Math.random() * 1E9),
            text: text.trim(),
            date: new Date().toISOString(),
            author: user.name || user.email || 'İstifadəçi',
            authorImage: user.picture || '',
            authorVerified: user.verified || false,
            isQuote: isQuote || false,
            bookData: bookData || null
        };
        
        statusesData.statuses = statusesData.statuses || [];
        statusesData.statuses.unshift(newStatus); // Add to beginning
        
        console.log('Writing to file:', statusesPath);
        console.log('File exists before write:', fs.existsSync(statusesPath));
        console.log('New status to add:', {
            id: newStatus.id,
            author: newStatus.author,
            textPreview: newStatus.text.substring(0, 50) + '...'
        });
        console.log('Total statuses after adding:', statusesData.statuses.length);
        
        // Ensure file exists
        if (!fs.existsSync(statusesPath)) {
            console.log('Statuses file does not exist, creating it...');
            fs.writeFileSync(statusesPath, JSON.stringify({ statuses: [] }, null, 2));
        }
        
        // Write file with error handling
        try {
            const jsonString = JSON.stringify(statusesData, null, 2);
            console.log('JSON string length:', jsonString.length);
            fs.writeFileSync(statusesPath, jsonString, 'utf8');
            console.log('File written successfully');
            
            // Verify file was written correctly
            const verifyData = JSON.parse(fs.readFileSync(statusesPath, 'utf8'));
            console.log('Verification - statuses count:', verifyData.statuses?.length || 0);
            console.log('Verification - first status ID:', verifyData.statuses?.[0]?.id);
            
            if (verifyData.statuses?.[0]?.id !== newStatus.id) {
                console.error('ERROR: New status was not written correctly!');
                console.error('Expected ID:', newStatus.id);
                console.error('Got ID:', verifyData.statuses?.[0]?.id);
            }
        } catch (writeError) {
            console.error('Error writing file:', writeError);
            console.error('Error details:', writeError.message);
            console.error('Error stack:', writeError.stack);
            throw writeError;
        }
        
        console.log('Status added successfully:', {
            id: newStatus.id,
            author: newStatus.author,
            textLength: newStatus.text.length,
            totalStatuses: statusesData.statuses.length
        });
        
        res.json({ success: true, status: newStatus });
    } catch (error) {
        console.error('Error adding status:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to add status', details: error.message });
    }
});

// Admin - Add status
app.post('/api/admin/statuses', (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Status text is required' });
        }

        const statusesData = JSON.parse(fs.readFileSync(statusesPath, 'utf8'));
        
        const newStatus = {
            id: Date.now().toString() + '-' + Math.round(Math.random() * 1E9),
            text: text.trim(),
            date: new Date().toISOString()
        };
        
        statusesData.statuses = statusesData.statuses || [];
        statusesData.statuses.unshift(newStatus); // Add to beginning
        
        fs.writeFileSync(statusesPath, JSON.stringify(statusesData, null, 2));
        
        res.json({ success: true, status: newStatus });
    } catch (error) {
        console.error('Error adding status:', error);
        res.status(500).json({ error: 'Failed to add status' });
    }
});

// Admin - Update status
app.put('/api/admin/statuses/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        
        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'Status text is required' });
        }

        const statusesData = JSON.parse(fs.readFileSync(statusesPath, 'utf8'));
        statusesData.statuses = statusesData.statuses || [];
        
        const statusIndex = statusesData.statuses.findIndex(s => s.id === id);
        if (statusIndex === -1) {
            return res.status(404).json({ error: 'Status not found' });
        }
        
        statusesData.statuses[statusIndex].text = text.trim();
        statusesData.statuses[statusIndex].date = new Date().toISOString(); // Update date
        
        fs.writeFileSync(statusesPath, JSON.stringify(statusesData, null, 2));
        
        res.json({ success: true, status: statusesData.statuses[statusIndex] });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// Public - Delete own status
app.delete('/api/statuses/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if user is logged in
        const user = req.session && req.session.user;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const statusesData = JSON.parse(fs.readFileSync(statusesPath, 'utf8'));
        statusesData.statuses = statusesData.statuses || [];
        
        const statusIndex = statusesData.statuses.findIndex(s => s.id === id);
        if (statusIndex === -1) {
            return res.status(404).json({ error: 'Status not found' });
        }
        
        const status = statusesData.statuses[statusIndex];
        const userEmail = user.email || '';
        const userName = user.name || '';
        
        // Check if user owns this status
        if (status.author !== userName && status.author !== userEmail) {
            return res.status(403).json({ error: 'You can only delete your own status' });
        }
        
        statusesData.statuses.splice(statusIndex, 1);
        fs.writeFileSync(statusesPath, JSON.stringify(statusesData, null, 2));
        
        console.log('Status deleted by user:', { id, author: status.author, deletedBy: userName || userEmail });
        res.json({ success: true, message: 'Status deleted successfully' });
    } catch (error) {
        console.error('Error deleting status:', error);
        res.status(500).json({ error: 'Failed to delete status' });
    }
});

// Public - Delete own comment
app.delete('/api/statuses/:statusId/comments/:commentId', (req, res) => {
    try {
        const { statusId, commentId } = req.params;
        
        // Check if user is logged in
        const user = req.session && req.session.user;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const statusesData = JSON.parse(fs.readFileSync(statusesPath, 'utf8'));
        const statusIndex = statusesData.statuses.findIndex(s => s.id === statusId);
        
        if (statusIndex === -1) {
            return res.status(404).json({ error: 'Status not found' });
        }
        
        const status = statusesData.statuses[statusIndex];
        status.comments = status.comments || [];
        
        const commentIndex = status.comments.findIndex(c => c.id === commentId);
        if (commentIndex === -1) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        
        const comment = status.comments[commentIndex];
        const userEmail = user.email || '';
        const userName = user.name || '';
        
        // Check if user owns this comment
        if (comment.author !== userName && comment.author !== userEmail) {
            return res.status(403).json({ error: 'You can only delete your own comment' });
        }
        
        status.comments.splice(commentIndex, 1);
        fs.writeFileSync(statusesPath, JSON.stringify(statusesData, null, 2));
        
        console.log('Comment deleted by user:', { statusId, commentId, author: comment.author, deletedBy: userName || userEmail });
        res.json({ success: true, message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

// Admin - Delete status
app.delete('/api/admin/statuses/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        const statusesData = JSON.parse(fs.readFileSync(statusesPath, 'utf8'));
        statusesData.statuses = statusesData.statuses || [];
        
        const statusIndex = statusesData.statuses.findIndex(s => s.id === id);
        if (statusIndex === -1) {
            return res.status(404).json({ error: 'Status not found' });
        }
        
        statusesData.statuses.splice(statusIndex, 1);
        fs.writeFileSync(statusesPath, JSON.stringify(statusesData, null, 2));
        
        res.json({ success: true, message: 'Status deleted successfully' });
    } catch (error) {
        console.error('Error deleting status:', error);
        res.status(500).json({ error: 'Failed to delete status' });
    }
});

// Audiobook management endpoints
const audiobooksPath = path.join(__dirname, 'audiobooks.json');

// Initialize audiobooks.json if it doesn't exist
if (!fs.existsSync(audiobooksPath)) {
    fs.writeFileSync(audiobooksPath, JSON.stringify({ audiobooks: [] }, null, 2));
}

// Admin - Add audiobook (before express.json())
app.post('/api/admin/audiobooks', uploadAudiobook.fields([{ name: 'audio', maxCount: 1 }, { name: 'image', maxCount: 1 }]), async (req, res) => {
    try {
        const { author, title, description, categories, imageUrl } = req.body;
        
        if (!author || !title) {
            return res.status(400).json({ error: 'Müəllif və başlıq tələb olunur' });
        }

        if (!req.files || !req.files.audio) {
            return res.status(400).json({ error: 'Ses faylı tələb olunur' });
        }

        let audioUrl = '';
        let finalImageUrl = imageUrl || '';

        // Save audio file
        const audioFile = req.files.audio[0];
        const audioExt = path.extname(audioFile.originalname);
        const audioFilename = 'audio-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + audioExt;
        const audioPath = path.join(audioDir, audioFilename);
        
        fs.writeFileSync(audioPath, audioFile.buffer);
        audioUrl = `/uploads/audiobooks/${audioFilename}`;

        // Save image file if uploaded
        if (req.files.image) {
            const imageFile = req.files.image[0];
            const imageExt = path.extname(imageFile.originalname);
            const imageFilename = 'audiobook-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + imageExt;
            const imagePath = path.join(uploadsDir, imageFilename);
            
            fs.writeFileSync(imagePath, imageFile.buffer);
            finalImageUrl = `/uploads/book-images/${imageFilename}`;
        }

        // Parse categories
        let categoriesArray = [];
        if (categories) {
            try {
                categoriesArray = JSON.parse(categories);
            } catch (e) {
                categoriesArray = categories.split(',').map(c => c.trim()).filter(c => c);
            }
        }

        const audiobookData = JSON.parse(fs.readFileSync(audiobooksPath, 'utf8'));
        
        const newAudiobook = {
            id: Date.now().toString() + '-' + Math.round(Math.random() * 1E9),
            author: author.trim(),
            title: title.trim(),
            description: description ? description.trim() : '',
            categories: categoriesArray,
            audioUrl: audioUrl,
            imageUrl: finalImageUrl,
            date: new Date().toISOString()
        };
        
        audiobookData.audiobooks = audiobookData.audiobooks || [];
        audiobookData.audiobooks.unshift(newAudiobook);
        
        fs.writeFileSync(audiobooksPath, JSON.stringify(audiobookData, null, 2));
        
        res.json({ success: true, audiobook: newAudiobook });
    } catch (error) {
        console.error('Error adding audiobook:', error);
        res.status(500).json({ error: 'Failed to add audiobook' });
    }
});

// Public - Get all audiobooks
app.get('/api/audiobooks', (req, res) => {
    try {
        const audiobookData = JSON.parse(fs.readFileSync(audiobooksPath, 'utf8'));
        res.json({ audiobooks: audiobookData.audiobooks || [] });
    } catch (error) {
        console.error('Error getting audiobooks:', error);
        res.status(500).json({ error: 'Failed to get audiobooks' });
    }
});

// Admin - Get all audiobooks
app.get('/api/admin/audiobooks', (req, res) => {
    try {
        const audiobookData = JSON.parse(fs.readFileSync(audiobooksPath, 'utf8'));
        res.json({ audiobooks: audiobookData.audiobooks || [] });
    } catch (error) {
        console.error('Error getting audiobooks:', error);
        res.status(500).json({ error: 'Failed to get audiobooks' });
    }
});

// Admin - Update audiobook (before express.json())
app.put('/api/admin/audiobooks/:id', uploadAudiobook.fields([{ name: 'audio', maxCount: 1 }, { name: 'image', maxCount: 1 }]), async (req, res) => {
    try {
        const { id } = req.params;
        const { author, title, description, categories, imageUrl } = req.body;
        
        const audiobookData = JSON.parse(fs.readFileSync(audiobooksPath, 'utf8'));
        audiobookData.audiobooks = audiobookData.audiobooks || [];
        
        const audiobookIndex = audiobookData.audiobooks.findIndex(a => a.id === id);
        if (audiobookIndex === -1) {
            return res.status(404).json({ error: 'Sesli kitab tapılmadı' });
        }
        
        const audiobook = audiobookData.audiobooks[audiobookIndex];
        
        // Update fields
        if (author) audiobook.author = author;
        if (title) audiobook.title = title;
        if (description !== undefined) audiobook.description = description;
        
        let categoriesArray = [];
        if (categories) {
            try {
                categoriesArray = JSON.parse(categories);
            } catch (e) {
                categoriesArray = categories.split(',').map(c => c.trim()).filter(c => c);
            }
        }
        audiobook.categories = categoriesArray;
        
        // Update audio file if provided
        if (req.files && req.files.audio) {
            const audioFile = req.files.audio[0];
            const audioExt = path.extname(audioFile.originalname);
            const audioFilename = 'audio-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + audioExt;
            const audioPath = path.join(audioDir, audioFilename);
            
            fs.writeFileSync(audioPath, audioFile.buffer);
            audiobook.audioUrl = `/uploads/audiobooks/${audioFilename}`;
        }
        
        // Update image if provided
        if (req.files && req.files.image) {
            const imageFile = req.files.image[0];
            const imageExt = path.extname(imageFile.originalname);
            const imageFilename = 'audiobook-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + imageExt;
            const imagePath = path.join(uploadsDir, imageFilename);
            
            fs.writeFileSync(imagePath, imageFile.buffer);
            audiobook.imageUrl = `/uploads/book-images/${imageFilename}`;
        } else if (imageUrl !== undefined) {
            audiobook.imageUrl = imageUrl || '';
        }
        
        audiobookData.audiobooks[audiobookIndex] = audiobook;
        fs.writeFileSync(audiobooksPath, JSON.stringify(audiobookData, null, 2));
        
        res.json({ success: true, audiobook: audiobook });
    } catch (error) {
        console.error('Error updating audiobook:', error);
        res.status(500).json({ error: 'Failed to update audiobook' });
    }
});

// Admin - Delete audiobook
app.delete('/api/admin/audiobooks/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        const audiobookData = JSON.parse(fs.readFileSync(audiobooksPath, 'utf8'));
        audiobookData.audiobooks = audiobookData.audiobooks || [];
        
        const audiobookIndex = audiobookData.audiobooks.findIndex(a => a.id === id);
        if (audiobookIndex === -1) {
            return res.status(404).json({ error: 'Sesli kitab tapılmadı' });
        }
        
        audiobookData.audiobooks.splice(audiobookIndex, 1);
        fs.writeFileSync(audiobooksPath, JSON.stringify(audiobookData, null, 2));
        
        res.json({ success: true, message: 'Sesli kitab uğurla silindi' });
    } catch (error) {
        console.error('Error deleting audiobook:', error);
        res.status(500).json({ error: 'Failed to delete audiobook' });
    }
});

// Proxy endpoint for viewing PDF files (inline)
app.get('/api/view/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        
        // Read books to find the file
        const booksPath = path.join(__dirname, 'books.json');
        const booksData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
        const book = booksData.books.find(b => b.fileId === fileId);
        
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        if (!book.fileUrl) {
            return res.status(404).json({ error: 'File URL not found' });
        }
        
        // Check if it's a local file or remote URL
        if (book.fileUrl.startsWith('/uploads/')) {
            // Local file - serve directly
            const filePath = path.join(__dirname, book.fileUrl);
            
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found on server' });
            }
            
            // Set headers for inline viewing
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
            
            // Send file directly
            return res.sendFile(filePath);
        } else {
            // Remote URL (Telegram) - download via axios
            try {
                const response = await axios.get(book.fileUrl, {
                    responseType: 'stream'
                });
                
                // Set headers for inline viewing
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'inline');
                
                // Pipe the file to response
                response.data.pipe(res);
            } catch (error) {
                console.error('Error loading from remote URL:', error);
                return res.status(500).json({ error: 'Failed to load file from remote source' });
            }
        }
        
    } catch (error) {
        console.error('View proxy error:', error);
        res.status(500).json({ error: 'Failed to load file' });
    }
});

// Proxy endpoint for downloading files
app.get('/api/download/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        
        // Read books to find the file
        const booksPath = path.join(__dirname, 'books.json');
        const booksData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
        const book = booksData.books.find(b => b.fileId === fileId);
        
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        if (!book.fileUrl) {
            return res.status(404).json({ error: 'File URL not found' });
        }
        
        // Check if it's a local file or remote URL
        let filePath;
        if (book.fileUrl.startsWith('/uploads/')) {
            // Local file - serve directly
            filePath = path.join(__dirname, book.fileUrl);
            
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found on server' });
            }
            
            // Set headers for download
            const filename = book.filename || book.title + '.pdf';
            
            // Clean filename for header - remove ALL non-ASCII characters and special chars
            const cleanFilename = filename
                .replace(/[^\x20-\x7E]/g, '_') // Remove non-ASCII characters
                .replace(/[<>:"/\\|?*]/g, '_')  // Remove special characters
                .replace(/\s+/g, '_')          // Replace spaces with underscores
                .replace(/_+/g, '_')           // Replace multiple underscores with single
                .replace(/^_|_$/g, '');        // Remove leading/trailing underscores
            
            res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
            res.setHeader('Content-Type', 'application/pdf');
            
            // Send file directly
            return res.sendFile(filePath);
        } else {
            // Remote URL (Telegram) - download via axios
            try {
                const response = await axios.get(book.fileUrl, {
                    responseType: 'stream'
                });
                
                // Set headers for download
                const filename = book.filename || book.title + '.pdf';
                
                // Clean filename for header
                const cleanFilename = filename
                    .replace(/[^\x20-\x7E]/g, '_')
                    .replace(/[<>:"/\\|?*]/g, '_')
                    .replace(/\s+/g, '_')
                    .replace(/_+/g, '_')
                    .replace(/^_|_$/g, '');
                
                res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
                res.setHeader('Content-Type', 'application/pdf');
                
                // Pipe the file to response
                response.data.pipe(res);
            } catch (error) {
                console.error('Error downloading from remote URL:', error);
                return res.status(500).json({ error: 'Failed to download file from remote source' });
            }
        }
        
    } catch (error) {
        console.error('Download proxy error:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

// Admin - Get all users
app.get('/api/admin/users', (req, res) => {
    try {
        const usersData = loadUsers();
        res.json({ users: usersData.users || [] });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).json({ error: 'Failed to load users' });
    }
});

// Admin - Ban user
app.put('/api/admin/users/:email/ban', (req, res) => {
    try {
        const { email } = req.params;
        const usersData = loadUsers();
        const user = usersData.users.find(u => u.email === email);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.banned = true;
        saveUsers(usersData);
        
        res.json({ success: true, user });
    } catch (error) {
        console.error('Error banning user:', error);
        res.status(500).json({ error: 'Failed to ban user' });
    }
});

// Admin - Unban user
app.put('/api/admin/users/:email/unban', (req, res) => {
    try {
        const { email } = req.params;
        const usersData = loadUsers();
        const user = usersData.users.find(u => u.email === email);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.banned = false;
        saveUsers(usersData);
        
        res.json({ success: true, user });
    } catch (error) {
        console.error('Error unbanning user:', error);
        res.status(500).json({ error: 'Failed to unban user' });
    }
});

// Admin - Toggle verified status
app.put('/api/admin/users/:email/verified', (req, res) => {
    try {
        const { email } = req.params;
        const usersData = loadUsers();
        const user = usersData.users.find(u => u.email === email);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        user.verified = !user.verified;
        saveUsers(usersData);
        
        res.json({ success: true, user });
    } catch (error) {
        console.error('Error toggling verified status:', error);
        res.status(500).json({ error: 'Failed to toggle verified status' });
    }
});

// Start server
app.listen(PORT, '212.87.221.194', async () => {
    console.log(`🌐 Website running at http://${API}:${PORT}`);
    console.log(`📚 Books API available at http://${API}:${PORT}/api/books`);
    console.log(`📖 Books JSON available at http://${API}:${PORT}/books.json`);
    
    // Start NGROK tunnel for Google OAuth
    try {
        const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;
        if (ngrokAuthToken) {
            await ngrok.authtoken(ngrokAuthToken);
        }
        
        NGROK_URL = await ngrok.connect({
            addr: PORT,
            proto: 'http'
        });
        
        // Update REDIRECT_URI with NGROK URL
        REDIRECT_URI = `${NGROK_URL}/api/auth/google/callback`;
        
        console.log(`\n🔗 NGROK Tunnel created:`);
        console.log(`   Public URL: ${NGROK_URL}`);
        console.log(`   Google OAuth Redirect URI: ${REDIRECT_URI}`);
        console.log(`\n⚠️  IMPORTANT: Update your Google OAuth credentials with this redirect URI:`);
        console.log(`   ${REDIRECT_URI}\n`);
    } catch (error) {
        console.error('❌ Error starting NGROK tunnel:', error.message);
        console.log('⚠️  Continuing without NGROK. Google OAuth may not work properly.');
        console.log('   To enable NGROK, set NGROK_AUTH_TOKEN in your .env file (optional but recommended)');
    }
});

module.exports = app;
