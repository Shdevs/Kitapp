// Global variables
let books = [];
let filteredBooks = [];
let currentPage = 1;
let itemsPerPage = 10;
let totalPages = 1;
let selectedCategory = 'all';

// View and download counters
let viewCounts = {};
let downloadCounts = {};

// DOM elements
const booksGrid = document.getElementById('booksGrid');
const searchInput = document.getElementById('searchInput');
const loading = document.getElementById('loading');
const noResults = document.getElementById('noResults');
const pagination = document.getElementById('pagination');
const paginationNumbers = document.getElementById('paginationNumbers');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const itemsPerPageSelect = document.getElementById('itemsPerPage');
const categoryFilter = document.getElementById('categoryFilter');
const totalBooksSpan = document.getElementById('totalBooks');
const showingBooksSpan = document.getElementById('showingBooks');
const bookModal = document.getElementById('bookModal');
const modalTitle = document.getElementById('modalTitle');
const modalDescription = document.getElementById('modalDescription');
const modalDate = document.getElementById('modalDate');
const modalSize = document.getElementById('modalSize');
const modalCategory = document.getElementById('modalCategory');
const closeModal = document.getElementById('closeModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const downloadBtn = document.getElementById('downloadBtn');
const readBtn = document.getElementById('readBtn');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize book-related functionality if on index.html or audiobooks.html
    if (booksGrid) {
        loadBooks();
        setupEventListeners();
        if (typeof loadCounters === 'function') {
            loadCounters();
        }
        
        // Check for book highlighting from blog page
        setTimeout(() => {
            highlightBookFromBlog();
        }, 1000);
    }
    // Sidebar toggle should work on all pages
    setupSidebarToggle();
    
    // Initialize rotating text on all pages
    initializeRotatingText();
    
    // Initialize background decorations
    initializeBackgroundDecorations();
});

// Highlight book from blog page - reset to "Tümü" and go to book
function highlightBookFromBlog() {
    const highlightBookId = localStorage.getItem('highlightBookId');
    if (!highlightBookId) {
        console.log('No highlightBookId found in localStorage');
        return;
    }
    
    console.log('=== HIGHLIGHTING BOOK FROM BLOG ===');
    console.log('Highlighting book with ID:', highlightBookId);
    
    // Reset to "Tümü" (all) category
    selectedCategory = 'all';
    if (categoryFilter) {
        categoryFilter.value = 'all';
    }
    
    // Clear search
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Update filtered books to show all books first
    filterBooks('');
    
    // Wait a bit for filter to apply, then find the book in filtered books
    setTimeout(() => {
        // Find the book in filteredBooks
        const bookIndex = filteredBooks.findIndex(book => book.fileId === highlightBookId);
        if (bookIndex === -1) {
            console.log('Book not found in filtered books array');
            return;
        }
        
        // Calculate which page the book is on (based on filtered books)
        const targetPage = Math.ceil((bookIndex + 1) / itemsPerPage);
        console.log('Book is on page:', targetPage, 'Current page:', currentPage);
        
        // Navigate to the target page
        currentPage = targetPage;
        updateDisplay();
        
        // Wait for page to update, then highlight and scroll
        setTimeout(() => {
            highlightBook(highlightBookId);
        }, 600);
    }, 200);
}

// Helper function to actually highlight the book
function highlightBook(bookId) {
    console.log('Highlighting book:', bookId);
    
    // Find the book card
    const bookCard = document.querySelector(`[data-file-id="${bookId}"]`);
    console.log('Book card found:', bookCard);
    
    if (!bookCard) {
        console.log('Book card not found for ID:', bookId);
        console.log('Available book cards:', document.querySelectorAll('.book-card').length);
        // Try again after a short delay
        setTimeout(() => {
            const retryCard = document.querySelector(`[data-file-id="${bookId}"]`);
            if (retryCard) {
                applyHighlight(retryCard);
            } else {
                console.error('Book card still not found after retry');
            }
        }, 500);
        return;
    }
    
    applyHighlight(bookCard);
}

// Apply highlight effect to book card
function applyHighlight(bookCard) {
    console.log('Adding highlight class to book card');
    
    // Add highlight class
    bookCard.classList.add('book-highlight');
    
    // Scroll to the book
    bookCard.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
    });
    
    console.log('Book highlighted successfully');
    
    // Remove highlight after 3 seconds
    setTimeout(() => {
        console.log('Removing highlight class');
        bookCard.classList.remove('book-highlight');
        localStorage.removeItem('highlightBookId');
    }, 3000);
}

// Setup sidebar toggle
window.setupSidebarToggle = function() {
    const sidebarToggleFixed = document.getElementById('sidebarToggleFixed');
    const sidebarToggleInside = document.getElementById('sidebarToggleInside');
    const sidebar = document.getElementById('sidebar');
    const toggleIconFixed = document.getElementById('toggleIconFixed');
    const toggleIconInside = document.getElementById('toggleIconInside');
    const sidebarToggleContainer = document.getElementById('sidebarToggleContainer');
    
    // Open/Close sidebar function
    function toggleSidebar() {
        const isOpen = sidebar.classList.contains('open');
        
        if (isOpen) {
            // Close
            sidebar.classList.remove('open');
            document.body.classList.remove('sidebar-container-open');
            if (toggleIconFixed) {
                toggleIconFixed.classList.remove('fa-times');
                toggleIconFixed.classList.add('fa-bars');
            }
            if (toggleIconInside) {
                toggleIconInside.classList.remove('fa-times');
                toggleIconInside.classList.add('fa-bars');
            }
        } else {
            // Open
            sidebar.classList.add('open');
            document.body.classList.add('sidebar-container-open');
            if (toggleIconFixed) {
                toggleIconFixed.classList.remove('fa-bars');
                toggleIconFixed.classList.add('fa-times');
            }
            if (toggleIconInside) {
                toggleIconInside.classList.remove('fa-bars');
                toggleIconInside.classList.add('fa-times');
            }
        }
    }
    
    // Open sidebar from fixed button
    if (sidebarToggleFixed) {
        sidebarToggleFixed.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleSidebar();
        });
    }
    
    // Toggle sidebar from inside button
    if (sidebarToggleInside) {
        sidebarToggleInside.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleSidebar();
        });
    }
    
    // Close sidebar
    function closeSidebar() {
        sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-container-open');
        if (toggleIconFixed) {
            toggleIconFixed.classList.remove('fa-times');
            toggleIconFixed.classList.add('fa-bars');
        }
        if (toggleIconInside) {
            toggleIconInside.classList.remove('fa-times');
            toggleIconInside.classList.add('fa-bars');
        }
    }
    
    // Close on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });
}

// Load counters from localStorage
function loadCounters() {
    const savedViewCounts = localStorage.getItem('bookViewCounts');
    const savedDownloadCounts = localStorage.getItem('bookDownloadCounts');
    
    if (savedViewCounts) {
        viewCounts = JSON.parse(savedViewCounts);
    }
    
    if (savedDownloadCounts) {
        downloadCounts = JSON.parse(savedDownloadCounts);
    }
}

// Save counters to localStorage
function saveCounters() {
    localStorage.setItem('bookViewCounts', JSON.stringify(viewCounts));
    localStorage.setItem('bookDownloadCounts', JSON.stringify(downloadCounts));
}

// Increment view count
function incrementViewCount(fileId) {
    if (!viewCounts[fileId]) {
        viewCounts[fileId] = 0;
    }
    viewCounts[fileId]++;
    saveCounters();
}

// Increment download count
function incrementDownloadCount(fileId) {
    if (!downloadCounts[fileId]) {
        downloadCounts[fileId] = 0;
    }
    downloadCounts[fileId]++;
    saveCounters();
}

// Get view count
function getViewCount(fileId) {
    return viewCounts[fileId] || 0;
}

// Get download count
function getDownloadCount(fileId) {
    return downloadCounts[fileId] || 0;
}

// Setup event listeners
function setupEventListeners() {
    // Check if elements exist (for blog.html compatibility)
    if (!searchInput || !itemsPerPageSelect || !categoryFilter || !prevBtn || !nextBtn || !closeModal || !closeModalBtn || !bookModal) {
        return; // These elements don't exist on blog.html, so skip setup
    }
    
    // Search functionality
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        currentPage = 1; // Reset to first page when searching
        filterBooks(query);
    });

    // Items per page change
    itemsPerPageSelect.addEventListener('change', function() {
        itemsPerPage = this.value === 'all' ? filteredBooks.length : parseInt(this.value);
        currentPage = 1; // Reset to first page
        updateDisplay();
    });

    // Category filter change
    categoryFilter.addEventListener('change', function() {
        selectedCategory = this.value;
        currentPage = 1; // Reset to first page
        filterBooks(searchInput.value.toLowerCase().trim());
    });

    // Pagination buttons
    prevBtn.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            updateDisplay();
        }
    });

    nextBtn.addEventListener('click', function() {
        if (currentPage < totalPages) {
            currentPage++;
            updateDisplay();
        }
    });

    // Modal close events
    closeModal.addEventListener('click', closeBookModal);
    closeModalBtn.addEventListener('click', closeBookModal);
    
    // Close modal when clicking outside
    bookModal.addEventListener('click', function(e) {
        if (e.target === bookModal) {
            closeBookModal();
        }
    });

    // Escape key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && bookModal.classList.contains('show')) {
            closeBookModal();
        }
    });
    
    // Category slider events
    const categorySlider = document.getElementById('categorySlider');
    const sliderDot = document.querySelector('.category-slider-dot');
    
    if (categorySlider && sliderDot) {
        // Update dot position based on slider value
        function updateSliderDot() {
            const value = parseInt(categorySlider.value);
            const percentage = (value / 2) * 100;
            sliderDot.style.left = percentage + '%';
        }
        
        // Initialize dot position
        updateSliderDot();
        
        // Update on slider change - filter main page books
        categorySlider.addEventListener('input', function() {
            updateSliderDot();
            const sliderValue = parseInt(categorySlider.value);
            
            // Update selectedCategory based on slider
            if (sliderValue === 0) {
                selectedCategory = 'user-read';
            } else if (sliderValue === 1) {
                selectedCategory = 'all';
            } else if (sliderValue === 2) {
                selectedCategory = 'user-will-read';
            }
            
            // Update category filter dropdown
            categoryFilter.value = selectedCategory;
            
            // Filter books on main page
            filterBooks(searchInput.value.toLowerCase().trim());
        });
        
        categorySlider.addEventListener('change', function() {
            updateSliderDot();
            const sliderValue = parseInt(categorySlider.value);
            
            // Update selectedCategory based on slider
            if (sliderValue === 0) {
                selectedCategory = 'user-read';
            } else if (sliderValue === 1) {
                selectedCategory = 'all';
            } else if (sliderValue === 2) {
                selectedCategory = 'user-will-read';
            }
            
            // Update category filter dropdown
            categoryFilter.value = selectedCategory;
            
            // Filter books on main page
            filterBooks(searchInput.value.toLowerCase().trim());
        });
    }
}

// Load books from JSON file
async function loadBooks() {
    // Check if booksGrid exists (for blog.html compatibility)
    if (!booksGrid) {
        return; // This page doesn't have books, so skip loading
    }
    
    try {
        showLoading(true);
        
        // In a real application, you would fetch from an API
        // For now, we'll simulate loading with sample data
        await simulateApiCall();
        
        // Load from books.json (you'll need to serve this file)
        const response = await fetch('books.json');
        if (response.ok) {
            const data = await response.json();
            books = data.books || [];
        } else {
            // No books available
            books = [];
        }
        
        filteredBooks = [...books];
        populateCategoryFilter();
        updateDisplay();
        
    } catch (error) {
        console.error('Error loading books:', error);
        // No books available
        books = [];
        filteredBooks = [];
        populateCategoryFilter();
        if (typeof updateDisplay === 'function') {
            updateDisplay();
        }
        if (typeof updateUserCategoryBooks === 'function') {
            updateUserCategoryBooks();
        }
    } finally {
        showLoading(false);
    }
}

// Simulate API call delay
function simulateApiCall() {
    return new Promise(resolve => setTimeout(resolve, 1000));
}


// Get unique categories from books with counts
function getCategoriesWithCounts() {
    const categoryCounts = {};
    
    books.forEach(book => {
        if (book.categories && Array.isArray(book.categories)) {
            book.categories.forEach(category => {
                categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            });
        }
    });
    
    return Object.entries(categoryCounts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([category, count]) => ({ category, count }));
}

// Populate category filter with counts
function populateCategoryFilter() {
    const categoriesWithCounts = getCategoriesWithCounts();
    categoryFilter.innerHTML = '<option value="all">Tüm Kategoriler</option>';
    
    categoriesWithCounts.forEach(({ category, count }) => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = `${category} (${count})`;
        categoryFilter.appendChild(option);
    });
}

// Filter books based on search query and category
function filterBooks(query) {
    let filtered = [...books];
    
    // Filter by search query
    if (query) {
        filtered = filtered.filter(book => 
            book.title.toLowerCase().includes(query) ||
            book.description.toLowerCase().includes(query)
        );
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
        if (selectedCategory === 'user-read') {
            // Filter by user's read books
            const selections = getUserBookSelections();
            filtered = filtered.filter(book => selections.read.includes(book.fileId));
        } else if (selectedCategory === 'user-will-read') {
            // Filter by user's will-read books
            const selections = getUserBookSelections();
            filtered = filtered.filter(book => selections.willRead.includes(book.fileId));
        } else {
            // Filter by regular category
            filtered = filtered.filter(book => 
                book.categories && book.categories.length > 0 && book.categories.includes(selectedCategory)
            );
        }
    }
    
    filteredBooks = filtered;
    updateDisplay();
}

// Update user category books display
function updateUserCategoryBooks() {
    const userCategoryBooks = document.getElementById('userCategoryBooks');
    if (!userCategoryBooks) return;
    
    const selections = getUserBookSelections();
    const categorySlider = document.getElementById('categorySlider');
    
    if (!categorySlider) return;
    
    const sliderValue = parseInt(categorySlider.value);
    let selectedBookIds = [];
    let showAll = false;
    
    // 0 = Oxudum, 1 = Hamısı, 2 = Oxuyacam
    if (sliderValue === 0) {
        // Oxudum
        selectedBookIds = selections.read;
    } else if (sliderValue === 1) {
        // Hamısı
        showAll = true;
        selectedBookIds = [...selections.read, ...selections.willRead];
    } else if (sliderValue === 2) {
        // Oxuyacam
        selectedBookIds = selections.willRead;
    }
    
    if (showAll && selectedBookIds.length === 0) {
        userCategoryBooks.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Heç bir kitab seçilməyib</p>';
        return;
    }
    
    if (!showAll && selectedBookIds.length === 0) {
        userCategoryBooks.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Bu kateqoriyada kitab yoxdur</p>';
        return;
    }
    
    // Remove duplicates
    selectedBookIds = [...new Set(selectedBookIds)];
    
    const selectedBooks = books.filter(book => selectedBookIds.includes(book.fileId));
    
    userCategoryBooks.innerHTML = `
        <div class="user-category-books-grid">
            ${selectedBooks.map(book => {
                const imageUrl = book.imageUrl || '';
                const hasImage = imageUrl && imageUrl.trim() !== '';
                const isRead = selections.read.includes(book.fileId);
                const isWillRead = selections.willRead.includes(book.fileId);
                
                return `
                    <div class="user-category-book-card" onclick="showBookInfo('${book.fileId}')">
                        ${hasImage 
                            ? `<img src="${imageUrl}" alt="${escapeHtml(book.title)}" class="user-category-book-image">`
                            : `<div class="user-category-book-placeholder"><i class="fas fa-book"></i></div>`
                        }
                        <div class="user-category-book-title">${escapeHtml(book.title)}</div>
                        ${showAll ? `<div class="user-category-book-badge ${isRead ? 'read' : 'will-read'}">
                            ${isRead ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-bookmark"></i>'}
                        </div>` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Update display with pagination
function updateDisplay() {
    // Update stats
    updateStats();
    
    // Calculate pagination
    calculatePagination();
    
    // Get books for current page
    const itemsPerPageNum = itemsPerPage === 'all' ? filteredBooks.length : parseInt(itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPageNum;
    const endIndex = startIndex + itemsPerPageNum;
    const booksToShow = filteredBooks.slice(startIndex, endIndex);
    
    // Display books
    displayBooks(booksToShow);
    
    // Update pagination UI
    updatePaginationUI();
}

// Update statistics
function updateStats() {
    totalBooksSpan.textContent = books.length;
    showingBooksSpan.textContent = filteredBooks.length;
}

// Calculate pagination
function calculatePagination() {
    const itemsPerPageNum = itemsPerPage === 'all' ? filteredBooks.length : parseInt(itemsPerPage);
    
    if (itemsPerPage === 'all' || itemsPerPageNum >= filteredBooks.length) {
        totalPages = 1;
    } else {
        totalPages = Math.ceil(filteredBooks.length / itemsPerPageNum);
    }
    
    // Ensure current page is valid
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    if (currentPage < 1) {
        currentPage = 1;
    }
}

// Update pagination UI
function updatePaginationUI() {
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    
    // Update prev/next buttons
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    
    // Generate page numbers
    generatePageNumbers();
}

// Generate page numbers
function generatePageNumbers() {
    const numbers = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
        // Show all pages
        for (let i = 1; i <= totalPages; i++) {
            numbers.push(i);
        }
    } else {
        // Show pages with ellipsis
        if (currentPage <= 3) {
            // Show first pages
            for (let i = 1; i <= 4; i++) {
                numbers.push(i);
            }
            numbers.push('...');
            numbers.push(totalPages);
        } else if (currentPage >= totalPages - 2) {
            // Show last pages
            numbers.push(1);
            numbers.push('...');
            for (let i = totalPages - 3; i <= totalPages; i++) {
                numbers.push(i);
            }
        } else {
            // Show middle pages
            numbers.push(1);
            numbers.push('...');
            for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                numbers.push(i);
            }
            numbers.push('...');
            numbers.push(totalPages);
        }
    }
    
    // Render page numbers
    paginationNumbers.innerHTML = numbers.map(num => {
        if (num === '...') {
            return '<span class="page-number dots">...</span>';
        }
        const isActive = num === currentPage;
        return `<span class="page-number ${isActive ? 'active' : ''}" onclick="goToPage(${num})">${num}</span>`;
    }).join('');
}

// Go to specific page
function goToPage(page) {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
        currentPage = page;
        updateDisplay();
    }
}

// Display books in grid
function displayBooks(booksToShow) {
    if (booksToShow.length === 0) {
        booksGrid.style.display = 'none';
        noResults.style.display = 'block';
        pagination.style.display = 'none';
        return;
    }
    
    booksGrid.style.display = 'grid';
    noResults.style.display = 'none';
    
    booksGrid.innerHTML = booksToShow.map(book => createBookCard(book)).join('');
    
    // Check if we need to highlight a book after page change
    const highlightBookId = localStorage.getItem('highlightBookId');
    if (highlightBookId) {
        // Check if this book is on the current page
        const bookOnPage = booksToShow.find(book => book.fileId === highlightBookId);
        if (bookOnPage) {
            console.log('Book found on current page, highlighting...');
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                const bookCard = document.querySelector(`[data-file-id="${highlightBookId}"]`);
                if (bookCard) {
                    applyHighlight(bookCard);
                } else {
                    console.log('Book card not found on current page');
                }
            }, 200);
        } else {
            console.log('Book not on current page, waiting for page change...');
        }
    }
}

// Get user book selections from localStorage
function getUserBookSelections() {
    const saved = localStorage.getItem('userBookSelections');
    return saved ? JSON.parse(saved) : { read: [], willRead: [] };
}

// Save user book selections to localStorage
function saveUserBookSelections(selections) {
    localStorage.setItem('userBookSelections', JSON.stringify(selections));
}

// Toggle book selection (read or will-read)
function toggleBookSelection(fileId, category, event) {
    if (event) {
        event.stopPropagation(); // Prevent card click
    }
    
    const selections = getUserBookSelections();
    
    if (category === 'read') {
        const index = selections.read.indexOf(fileId);
        if (index > -1) {
            selections.read.splice(index, 1);
        } else {
            selections.read.push(fileId);
            // Remove from willRead if exists
            const willReadIndex = selections.willRead.indexOf(fileId);
            if (willReadIndex > -1) {
                selections.willRead.splice(willReadIndex, 1);
            }
        }
    } else if (category === 'willRead') {
        const index = selections.willRead.indexOf(fileId);
        if (index > -1) {
            selections.willRead.splice(index, 1);
        } else {
            selections.willRead.push(fileId);
            // Remove from read if exists
            const readIndex = selections.read.indexOf(fileId);
            if (readIndex > -1) {
                selections.read.splice(readIndex, 1);
            }
        }
    }
    
    saveUserBookSelections(selections);
    updateDisplay();
}

// Check if book is selected
function isBookSelected(fileId, category) {
    const selections = getUserBookSelections();
    if (category === 'read') {
        return selections.read.includes(fileId);
    } else if (category === 'willRead') {
        return selections.willRead.includes(fileId);
    }
    return false;
}

// Create book card HTML
function createBookCard(book) {
    const viewCount = getViewCount(book.fileId);
    const downloadCount = getDownloadCount(book.fileId);
    
    const imageUrl = book.imageUrl || '';
    const hasImage = imageUrl && imageUrl.trim() !== '';
    
    const isRead = isBookSelected(book.fileId, 'read');
    const isWillRead = isBookSelected(book.fileId, 'willRead');
    
    return `
        <div class="book-card" data-file-id="${book.fileId}" onclick="showBookInfo('${book.fileId}')" style="cursor: pointer;">
            <div class="book-cover-container">
                <div class="book-action-icons">
                    <button class="book-action-icon ${isRead ? 'active' : ''}" 
                            onclick="toggleBookSelection('${book.fileId}', 'read', event)" 
                            title="Oxudum">
                        <i class="fas fa-check-circle"></i>
                    </button>
                    <button class="book-action-icon ${isWillRead ? 'active' : ''}" 
                            onclick="toggleBookSelection('${book.fileId}', 'willRead', event)" 
                            title="Oxuyacam">
                        <i class="fas fa-bookmark"></i>
                    </button>
                </div>
                ${hasImage 
                    ? `<img src="${imageUrl}" alt="${escapeHtml(book.title)}" class="book-cover" onerror="this.onerror=null; this.src=''; this.closest('.book-cover-container').innerHTML='<div class=\"book-cover-placeholder\"><i class=\"fas fa-book\"></i></div>';"/>`
                    : '<div class="book-cover-placeholder"><i class="fas fa-book"></i></div>'
                }
                <div class="book-overlay">
                    <div class="book-title-overlay">${escapeHtml(book.title)}</div>
                    <div class="book-stats-overlay">
                        <span class="stat-overlay" title="Bakış sayısı">
                            <i class="fas fa-eye"></i> ${viewCount}
                        </span>
                        <span class="stat-overlay" title="İndirme sayısı">
                            <i class="fas fa-download"></i> ${downloadCount}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Show book information modal
function showBookInfo(fileId) {
    const book = books.find(b => b.fileId === fileId);
    if (!book) return;
    
    // Increment view count
    incrementViewCount(fileId);
    
    modalTitle.textContent = book.title;
    modalDescription.textContent = book.description;
    modalDate.textContent = `Əlavə edildi: ${book.addedAt}`;
    modalSize.textContent = book.isLargeFile ? 'Böyük fayl' : 'Normal Fayl';
    
    // Show categories
    if (book.categories && book.categories.length > 0) {
        modalCategory.textContent = `Kateqoriya: ${book.categories.join(', ')}`;
    } else {
        modalCategory.textContent = ''; // Kategori yoksa boş bırak
    }
    
    // Store current book for download and read
    downloadBtn.onclick = () => downloadBook(fileId);
    
    // Add read button handler if it exists
    if (readBtn) {
        readBtn.onclick = () => openBookPDF(book);
    }
    
    bookModal.classList.add('show');
}

// Open book PDF in viewer
function openBookPDF(book) {
    if (!book) return;
    
    // For large files, redirect to Telegram
    if (book.isLargeFile) {
        if (book.messageLink) {
            window.open(book.messageLink, '_blank');
            showNotification(`"${book.title}" böyük fayl - Telegram kanalına yönləndirilir...`, 'info');
        } else {
            showNotification(`"${book.title}" faylı tapılmadı.`, 'error');
        }
        return;
    }
    
    // For normal files, open PDF viewer page
    try {
        const viewerUrl = `pdf-viewer.html?fileId=${book.fileId}`;
        window.open(viewerUrl, '_blank');
        
        // Close modal
        closeBookModal();
        
        // Update display to reflect new view count
        updateDisplay();
    } catch (error) {
        console.error('Open book error:', error);
        showNotification(`"${book.title}" açıla bilmədi.`, 'error');
    }
}

// Close book modal
function closeBookModal() {
    bookModal.classList.remove('show');
}

// Download book
function downloadBook(fileId) {
    const book = books.find(b => b.fileId === fileId);
    if (!book) return;
    
    // Increment download count
    incrementDownloadCount(fileId);
    
    if (book.isLargeFile) {
        // For large files, try direct download first, then fallback to Telegram
        if (book.fileUrl) {
            simulateDownload(book);
        } else if (book.messageLink) {
            window.open(book.messageLink, '_blank');
            showNotification(`"${book.title}" büyük dosya - Telegram kanalına yönlendiriliyor...`, 'info');
        } else {
            showNotification(`"${book.title}" dosyası bulunamadı.`, 'error');
        }
    } else {
        // For normal files, direct download
        simulateDownload(book);
    }
}

// Download file directly
function simulateDownload(book) {
    try {
        // Ensure filename is properly formatted
        let filename = book.filename || book.title + '.pdf';
        
        // Clean filename - remove invalid characters
        filename = filename.replace(/[<>:"/\\|?*]/g, '_');
        
        // Ensure .pdf extension
        if (!filename.toLowerCase().endsWith('.pdf')) {
            filename += '.pdf';
        }
        
        console.log('Downloading:', filename);
        console.log('File ID:', book.fileId);
        
        // Use proxy endpoint to avoid CORS issues
        const proxyUrl = `/api/download/${book.fileId}`;
        
        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.href = proxyUrl;
        downloadLink.download = filename;
        downloadLink.target = '_blank';
        downloadLink.style.display = 'none';
        
        // Add to DOM temporarily
        document.body.appendChild(downloadLink);
        
        // Trigger download
        downloadLink.click();
        
        // Remove from DOM
        document.body.removeChild(downloadLink);
        
        // Show success message
        showNotification(`"${filename}" Yüklənir...`, 'success');
        
        // Close modal after download
        closeBookModal();
        
    } catch (error) {
        console.error('Download error:', error);
        
        // Fallback: try to open in new tab
        if (book.fileUrl) {
            window.open(book.fileUrl, '_blank');
            showNotification(`"${book.title}" kitabı yeni sekmede açılıyor...`, 'info');
        } else {
            showNotification(`"${book.title}" kitabı indirilemedi. Dosya bulunamadı.`, 'error');
        }
        
        closeBookModal();
    }
}

// Show/hide loading spinner
function showLoading(show) {
    // Check if elements exist (for blog.html compatibility)
    if (loading) {
        loading.style.display = show ? 'block' : 'none';
    }
    if (booksGrid) {
        booksGrid.style.display = show ? 'none' : 'grid';
    }
    if (noResults) {
        noResults.style.display = 'none';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Utility function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Hide notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Get notification icon based on type
function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

// Auto-refresh books every 30 seconds (optional)
setInterval(() => {
    // In a real application, you might want to refresh the books list
    // loadBooks();
}, 30000);

// Global Audio Player for all pages
(function() {
    let audioPlayerHTML = null;
    let audioElement = null;
    let currentAudioId = null;

    function initGlobalPlayer() {
        if (audioPlayerHTML) return audioPlayerHTML;

        audioPlayerHTML = document.createElement('div');
        audioPlayerHTML.id = 'globalAudioPlayer';
        audioPlayerHTML.innerHTML = `
            <div class="audio-player-content">
                <div class="audio-info">
                    <div class="audio-title" id="globalPlayerTitle">Sesli Kitab</div>
                    <div class="audio-author-row">
                        <div class="audio-author" id="globalPlayerAuthor"></div>
                        <div class="audio-volume-control-inline">
                            <button id="globalVolumeBtn" class="audio-volume-btn" onclick="toggleGlobalMute()">
                                <i class="fas fa-volume-up"></i>
                            </button>
                            <div class="audio-volume-slider" id="globalVolumeSlider">
                                <div class="audio-volume-bar" id="globalVolumeBar"></div>
                                <div class="audio-volume-thumb" id="globalVolumeThumb"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <audio id="globalAudioElement" style="display: none;">
                    <source src="" type="audio/mpeg">
                </audio>
                <div class="custom-audio-controls">
                    <button id="globalPlayPauseBtn" class="audio-control-btn" onclick="toggleGlobalPlayPause()">
                        <i class="fas fa-play"></i>
                    </button>
                    <div class="audio-progress-container" onclick="seekGlobalAudio(event)">
                        <div id="globalProgressBar" class="audio-progress-bar"></div>
                    </div>
                    <div class="audio-time-display" id="globalTimeDisplay">0:00 / 0:00</div>
                </div>
                <button class="audio-close-btn" onclick="closeGlobalAudioPlayer()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        audioPlayerHTML.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            padding: 20px;
            z-index: 1000;
            min-width: 300px;
            max-width: 500px;
            display: none;
        `;
        document.body.appendChild(audioPlayerHTML);
        audioElement = document.getElementById('globalAudioElement');
        return audioPlayerHTML;
    }

    function loadPlayerState() {
        const savedState = localStorage.getItem('audioPlayerState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                const player = initGlobalPlayer();
                
                document.getElementById('globalPlayerTitle').textContent = state.title;
                document.getElementById('globalPlayerAuthor').textContent = state.author || '';
                audioElement.src = state.audioUrl;
                
                audioElement.addEventListener('loadedmetadata', function() {
                    if (state.currentTime && state.currentTime > 0) {
                        audioElement.currentTime = state.currentTime;
                    }
                    // If it was playing before, resume playback
                    if (state.isPlaying) {
                        audioElement.play().catch(e => {
                            console.log('Auto-resume prevented:', e);
                        });
                    }
                }, { once: true });
                
                audioElement.load();
                
                player.style.display = 'block';
                currentAudioId = state.audiobookId;

                // Save current time periodically and update controls
                function updateGlobalProgress() {
                    if (audioElement && audioElement.duration) {
                        const progress = (audioElement.currentTime / audioElement.duration) * 100;
                        const progressBar = document.getElementById('globalProgressBar');
                        const timeDisplay = document.getElementById('globalTimeDisplay');
                        
                        if (progressBar) {
                            progressBar.style.width = progress + '%';
                        }
                        
                        if (timeDisplay) {
                            const currentTime = formatGlobalTime(audioElement.currentTime);
                            const duration = formatGlobalTime(audioElement.duration);
                            timeDisplay.textContent = `${currentTime} / ${duration}`;
                        }
                    }
                    
                    if (currentAudioId === state.audiobookId) {
                        const playerState = {
                            ...state,
                            currentTime: audioElement.currentTime,
                            isPlaying: !audioElement.paused
                        };
                        localStorage.setItem('audioPlayerState', JSON.stringify(playerState));
                    }
                }

                function formatGlobalTime(seconds) {
                    if (isNaN(seconds)) return '0:00';
                    const mins = Math.floor(seconds / 60);
                    const secs = Math.floor(seconds % 60);
                    return `${mins}:${secs.toString().padStart(2, '0')}`;
                }

                function updateGlobalPlayPauseButton() {
                    const playPauseBtn = document.getElementById('globalPlayPauseBtn');
                    if (playPauseBtn && audioElement) {
                        if (audioElement.paused) {
                            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                            playPauseBtn.classList.remove('pause-btn');
                        } else {
                            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
                            playPauseBtn.classList.add('pause-btn');
                        }
                    }
                }

                audioElement.addEventListener('timeupdate', updateGlobalProgress);
                audioElement.addEventListener('play', function() {
                    updateGlobalPlayPauseButton();
                    // Save playing state
                    if (currentAudioId === state.audiobookId) {
                        const playerState = {
                            ...state,
                            isPlaying: true
                        };
                        localStorage.setItem('audioPlayerState', JSON.stringify(playerState));
                    }
                });
                audioElement.addEventListener('pause', function() {
                    updateGlobalPlayPauseButton();
                    // Save paused state
                    if (currentAudioId === state.audiobookId) {
                        const playerState = {
                            ...state,
                            isPlaying: false
                        };
                        localStorage.setItem('audioPlayerState', JSON.stringify(playerState));
                    }
                });
                audioElement.addEventListener('loadedmetadata', updateGlobalProgress);
                
                // Initial update
                setTimeout(() => {
                    updateGlobalProgress();
                    updateGlobalPlayPauseButton();
                    setupGlobalVolumeControl();
                }, 100);
            } catch (e) {
                console.error('Error loading player state:', e);
            }
        }
    }

    window.toggleGlobalPlayPause = function() {
        const player = initGlobalPlayer();
        const audioElement = document.getElementById('globalAudioElement');
        if (audioElement) {
            if (audioElement.paused) {
                audioElement.play();
            } else {
                audioElement.pause();
            }
        }
    };

    window.seekGlobalAudio = function(event) {
        const audioElement = document.getElementById('globalAudioElement');
        if (!audioElement || !audioElement.duration) return;
        
        const container = event.currentTarget;
        const rect = container.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const percent = x / rect.width;
        
        audioElement.currentTime = percent * audioElement.duration;
    };

    let globalCurrentVolume = 1;
    let globalIsMuted = false;

    function setupGlobalVolumeControl() {
        const audioElement = document.getElementById('globalAudioElement');
        if (!audioElement) return;

        const volumeBtn = document.getElementById('globalVolumeBtn');
        const volumeSlider = document.getElementById('globalVolumeSlider');
        const volumeBar = document.getElementById('globalVolumeBar');
        const volumeThumb = document.getElementById('globalVolumeThumb');

        if (!volumeBtn || !volumeSlider || !volumeBar || !volumeThumb) return;

        // Load saved volume
        const savedVolume = localStorage.getItem('audioVolume');
        if (savedVolume !== null) {
            globalCurrentVolume = parseFloat(savedVolume);
            audioElement.volume = globalCurrentVolume;
            updateGlobalVolumeUI();
        } else {
            audioElement.volume = 1;
        }

        // Volume slider click
        volumeSlider.addEventListener('click', function(e) {
            const rect = volumeSlider.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percent = Math.max(0, Math.min(1, x / rect.width));
            
            globalCurrentVolume = percent;
            audioElement.volume = globalCurrentVolume;
            globalIsMuted = globalCurrentVolume === 0;
            localStorage.setItem('audioVolume', globalCurrentVolume);
            updateGlobalVolumeUI();
        });

        // Volume thumb drag
        let isDragging = false;
        volumeThumb.addEventListener('mousedown', function(e) {
            isDragging = true;
            e.preventDefault();
        });

        document.addEventListener('mousemove', function(e) {
            if (isDragging) {
                const rect = volumeSlider.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = Math.max(0, Math.min(1, x / rect.width));
                
                globalCurrentVolume = percent;
                audioElement.volume = globalCurrentVolume;
                globalIsMuted = globalCurrentVolume === 0;
                localStorage.setItem('audioVolume', globalCurrentVolume);
                updateGlobalVolumeUI();
            }
        });

        document.addEventListener('mouseup', function() {
            isDragging = false;
        });

        function updateGlobalVolumeUI() {
            if (volumeBar && volumeThumb) {
                const volumePercent = globalCurrentVolume * 100;
                volumeBar.style.width = volumePercent + '%';
                volumeThumb.style.left = volumePercent + '%';
                volumeThumb.style.transform = 'translate(-50%, -50%)';
            }

            if (volumeBtn) {
                if (globalIsMuted || globalCurrentVolume === 0) {
                    volumeBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
                } else if (globalCurrentVolume < 0.5) {
                    volumeBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
                } else {
                    volumeBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                }
            }
        }

        window.updateGlobalVolumeUI = updateGlobalVolumeUI;
        updateGlobalVolumeUI();
    }

    window.toggleGlobalMute = function() {
        const audioElement = document.getElementById('globalAudioElement');
        if (!audioElement) return;

        if (globalIsMuted) {
            audioElement.volume = globalCurrentVolume || 0.5;
            globalIsMuted = false;
        } else {
            audioElement.volume = 0;
            globalIsMuted = true;
        }
        if (window.updateGlobalVolumeUI) {
            window.updateGlobalVolumeUI();
        }
    };

    window.closeGlobalAudioPlayer = function() {
        const player = initGlobalPlayer();
        const audioElement = document.getElementById('globalAudioElement');
        if (audioElement) {
            audioElement.pause();
        }
        localStorage.removeItem('audioPlayerState');
        player.style.display = 'none';
        currentAudioId = null;
    };

    // Save state before page unload to prevent interruption
    window.addEventListener('beforeunload', function() {
        if (audioElement && currentAudioId) {
            const playerState = {
                audiobookId: currentAudioId,
                title: document.getElementById('globalPlayerTitle')?.textContent || '',
                author: document.getElementById('globalPlayerAuthor')?.textContent || '',
                audioUrl: audioElement.src,
                currentTime: audioElement.currentTime,
                isPlaying: !audioElement.paused
            };
            localStorage.setItem('audioPlayerState', JSON.stringify(playerState));
        }
    });

    // Initialize player when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadPlayerState);
    } else {
        loadPlayerState();
    }
})();

// Authentication functions
let authCheckRetries = 0;
const MAX_AUTH_RETRIES = 50;
let cachedAuthData = null; // Cache auth data

// Clear cache on page load to force fresh check
cachedAuthData = null;
authCheckRetries = 0;

async function checkAuth() {
    try {
        console.log('checkAuth called');
        
        // ALWAYS check session, don't rely on cache for cross-page navigation
        console.log('Checking authentication with fresh request...');
        const response = await fetch('/api/auth/user', {
            credentials: 'include',
            cache: 'no-cache'
        });
        
        if (!response.ok) {
            console.error('Auth check failed:', response.status);
            cachedAuthData = { user: null };
        } else {
            const data = await response.json();
            console.log('Auth response:', data);
            
            // Check if user is banned
            if (data.banned === true || (data.user && data.user.banned === true)) {
                console.log('User is banned, redirecting to banned page...');
                // Only redirect if not already on banned page
                if (window.location.pathname !== '/banned.html' && !window.location.pathname.includes('banned.html')) {
                    window.location.href = '/banned.html';
                    return;
                }
            }
            
            cachedAuthData = data;
        }
        
        // Now check if navbar elements exist and update UI
        const userProfile = document.getElementById('userProfile');
        const loginSection = document.getElementById('loginSection');
        
        console.log('Navbar elements check:', {
            userProfile: !!userProfile,
            loginSection: !!loginSection
        });
        
        // Skip navbar update if on banned page
        if (window.location.pathname.includes('banned.html')) {
            return;
        }
        
        if (!userProfile || !loginSection) {
            if (authCheckRetries < MAX_AUTH_RETRIES) {
                authCheckRetries++;
                console.log(`Navbar elements not found, retrying... (${authCheckRetries}/${MAX_AUTH_RETRIES})`);
                setTimeout(() => {
                    checkAuth();
                }, 150);
                return;
            } else {
                console.warn('Navbar elements not found after maximum retries');
                return;
            }
        }
        
        authCheckRetries = 0; // Reset retry counter on success
        
        // Update UI based on auth status
        console.log('Updating UI, user data:', cachedAuthData);
        if (cachedAuthData && cachedAuthData.user) {
            console.log('User found, showing profile:', cachedAuthData.user);
            console.log('User picture URL:', cachedAuthData.user.picture);
            showUserProfile(cachedAuthData.user);
        } else {
            console.log('No user found, showing login button');
            showLoginButton();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        cachedAuthData = { user: null };
        setTimeout(() => showLoginButton(), 100);
    }
}

// Function to refresh auth (used after login/logout)
function refreshAuth() {
    cachedAuthData = null;
    authCheckRetries = 0;
    checkAuth();
}

function showUserProfile(user) {
    console.log('showUserProfile called with user:', user);
    
    const userProfile = document.getElementById('userProfile');
    const loginSection = document.getElementById('loginSection');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userProfileTrigger = document.getElementById('userProfileTrigger');
    
    console.log('Profile elements check:', {
        userProfile: !!userProfile,
        loginSection: !!loginSection,
        userAvatar: !!userAvatar,
        userName: !!userName,
        userProfileTrigger: !!userProfileTrigger
    });
    
    if (!userProfile || !loginSection || !userAvatar || !userName || !userProfileTrigger) {
        console.error('Profile elements not found, retrying...');
        // Retry after a short delay
        setTimeout(() => {
            if (user) {
                showUserProfile(user);
            }
        }, 200);
        return;
    }
    
    // Set user data
    if (user.picture && user.picture.trim() !== '') {
        console.log('Setting avatar:', user.picture);
        
        // Clear any previous error handlers and attributes
        userAvatar.onerror = null;
        userAvatar.onload = null;
        
        // Remove any CORS/referrer attributes (Google images don't need them)
        userAvatar.removeAttribute('crossorigin');
        userAvatar.removeAttribute('referrerpolicy');
        userAvatar.crossOrigin = '';
        
        // Set up load handler
        userAvatar.onload = function() {
            console.log('Avatar loaded successfully');
            console.log('Image dimensions:', this.naturalWidth, 'x', this.naturalHeight);
            // Ensure image is visible after loading
            this.style.display = 'block';
            this.style.visibility = 'visible';
            // Force a reflow to ensure the image is rendered
            this.offsetHeight;
        };
        
        // Set up error handler with retry logic
        userAvatar.dataset.retryCount = '0';
        userAvatar.onerror = function() {
            const retryCount = parseInt(this.dataset.retryCount || '0') + 1;
            this.dataset.retryCount = retryCount.toString();
            
            console.error(`Avatar image failed to load (attempt ${retryCount}):`, user.picture);
            
            if (retryCount === 1) {
                // First retry: add cache buster
                console.log('Retrying with cache buster...');
                const separator = user.picture.includes('?') ? '&' : '?';
                this.src = user.picture + separator + 'v=' + Date.now();
            } else {
                // Final failure: hide the image
                console.warn('Avatar failed to load after retry, hiding image');
                this.style.display = 'none';
            }
        };
        
        // Set the image source (this will trigger load/error handlers)
        // Make sure to set display before src to avoid flickering
        userAvatar.style.display = 'block';
        userAvatar.style.visibility = 'visible';
        userAvatar.style.opacity = '1';
        
        // Set src - this will trigger onload/onerror handlers
        console.log('Setting image source:', user.picture);
        userAvatar.src = user.picture;
    } else {
        console.warn('No picture provided for user:', user.email || 'unknown');
        userAvatar.style.display = 'none';
    }
    
    userName.textContent = user.name || user.email || 'İstifadəçi';
    
    // Show profile, hide login
    userProfile.classList.add('visible');
    loginSection.classList.remove('visible');
    
    // Setup dropdown toggle
    setupUserDropdown();
    
    console.log('Profile displayed successfully', {
        name: user.name || user.email,
        picture: user.picture,
        profileVisible: userProfile.classList.contains('visible')
    });
}

function setupUserDropdown() {
    const userProfileTrigger = document.getElementById('userProfileTrigger');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    
    if (!userProfileTrigger || !userDropdownMenu) return;
    
    // Remove existing listeners by cloning
    const existingTrigger = userProfileTrigger.cloneNode(true);
    userProfileTrigger.parentNode.replaceChild(existingTrigger, userProfileTrigger);
    const newTrigger = document.getElementById('userProfileTrigger');
    
    // Add click event listener to trigger
    newTrigger.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleUserDropdown();
    });
    
    // Close dropdown when clicking outside (only add once)
    if (!window.dropdownClickHandler) {
        window.dropdownClickHandler = function(e) {
            const menu = document.getElementById('userDropdownMenu');
            const trigger = document.getElementById('userProfileTrigger');
            if (menu && trigger && 
                !menu.contains(e.target) && 
                !trigger.contains(e.target)) {
                closeUserDropdown();
            }
        };
        document.addEventListener('click', window.dropdownClickHandler);
    }
}

function toggleUserDropdown() {
    const userProfileTrigger = document.getElementById('userProfileTrigger');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    
    if (!userProfileTrigger || !userDropdownMenu) return;
    
    const isOpen = userDropdownMenu.style.display === 'block';
    
    if (isOpen) {
        closeUserDropdown();
    } else {
        openUserDropdown();
    }
}

function openUserDropdown() {
    const userProfileTrigger = document.getElementById('userProfileTrigger');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    
    if (!userProfileTrigger || !userDropdownMenu) return;
    
    userDropdownMenu.style.display = 'block';
    userProfileTrigger.classList.add('open');
}

function closeUserDropdown() {
    const userProfileTrigger = document.getElementById('userProfileTrigger');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    
    if (!userProfileTrigger || !userDropdownMenu) return;
    
    userDropdownMenu.style.display = 'none';
    userProfileTrigger.classList.remove('open');
}

function showProfile() {
    closeUserDropdown();
    // Get current page path to determine correct profile path
    const currentPath = window.location.pathname;
    const isInProfiles = currentPath.includes('/profiles/');
    const profilePath = isInProfiles ? 'profile.html' : 'profiles/profile.html';
    window.location.href = profilePath;
}

function showLoginButton() {
    const userProfile = document.getElementById('userProfile');
    const loginSection = document.getElementById('loginSection');
    
    if (userProfile && loginSection) {
        userProfile.classList.remove('visible');
        loginSection.classList.add('visible');
    }
}

async function loginWithGoogle() {
    try {
        console.log('loginWithGoogle called');
        const response = await fetch('/api/auth/google', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Auth URL received:', data);
        
        if (data.authUrl) {
            window.location.href = data.authUrl;
        } else {
            const errorMsg = 'Giriş URL-i alına bilmədi';
            if (typeof showNotification === 'function') {
                showNotification(errorMsg, 'error');
            } else {
                alert(errorMsg);
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        const errorMsg = 'Giriş zamanı xəta baş verdi: ' + error.message;
        if (typeof showNotification === 'function') {
            showNotification(errorMsg, 'error');
        } else {
            alert(errorMsg);
        }
    }
};

// Make loginWithGoogle globally available IMMEDIATELY
window.loginWithGoogle = loginWithGoogle;

async function logout() {
    try {
        closeUserDropdown();
        
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            refreshAuth(); // Refresh auth state
            showNotification('Çıxış uğurla həyata keçirildi', 'success');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Çıxış zamanı xəta baş verdi', 'error');
    }
}

// Make logout and showProfile globally available
window.logout = logout;
window.showProfile = showProfile;

// Check authentication on page load
function initAuth() {
    // Reset everything
    cachedAuthData = null;
    authCheckRetries = 0;
    
    console.log('initAuth called, document readyState:', document.readyState);
    
    // Start checking immediately - checkAuth will handle retries
    function startAuthCheck() {
        console.log('Starting auth check...');
        checkAuth();
        checkURLErrors();
    }
    
    // Start checking when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOMContentLoaded fired');
            setTimeout(startAuthCheck, 100);
        });
    } else {
        console.log('DOM already ready, starting auth check immediately');
        setTimeout(startAuthCheck, 100);
    }
    
    // Also try after a longer delay as backup
    setTimeout(function() {
        const userProfile = document.getElementById('userProfile');
        const loginSection = document.getElementById('loginSection');
        if (!userProfile || !loginSection) {
            console.log('Navbar elements still not found after delay, forcing checkAuth...');
            checkAuth();
        }
    }, 1000);
}

// Initialize auth when script loads
initAuth();

function checkURLErrors() {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const message = urlParams.get('message');
    
    if (error) {
        let errorMessage = 'Giriş zamanı xəta baş verdi';
        
        if (error === 'no_code') {
            errorMessage = 'Giriş kodu tapılmadı';
        } else if (error === 'no_token') {
            errorMessage = 'Giriş tokeni alına bilmədi';
        } else if (error === 'auth_failed') {
            errorMessage = message ? decodeURIComponent(message) : 'Giriş uğursuz oldu';
        }
        
        showNotification(errorMessage, 'error');
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Rotating text function
let rotatingTextInterval = null;
let currentTextIndex = 0;

async function initializeRotatingText() {
    const rotatingTextElement = document.getElementById('rotatingText');
    if (!rotatingTextElement) {
        return; // Element not found on this page
    }
    
    // Determine page name based on current path
    let pageName = 'index';
    const path = window.location.pathname.toLowerCase();
    if (path.includes('blog')) {
        pageName = 'blog';
    } else if (path.includes('audiobooks') || path.includes('sesli')) {
        pageName = 'audiobooks';
    } else if (path.includes('profile')) {
        pageName = 'profile';
    }
    
    console.log('Initializing rotating text for page:', pageName);
    
    try {
        // Load texts from JSON file
        const response = await fetch('/page-texts.json');
        if (!response.ok) {
            console.error('Failed to load page texts');
            return;
        }
        
        const data = await response.json();
        const texts = data[pageName];
        
        if (!texts || texts.length === 0) {
            console.log('No texts found for page:', pageName);
            return;
        }
        
        console.log('Loaded texts for', pageName, ':', texts);
        
        // Set initial text
        currentTextIndex = 0;
        updateRotatingText(rotatingTextElement, texts[currentTextIndex]);
        
        // Rotate text every 3 seconds
        rotatingTextInterval = setInterval(() => {
            currentTextIndex = (currentTextIndex + 1) % texts.length;
            updateRotatingText(rotatingTextElement, texts[currentTextIndex]);
        }, 6000);
        
    } catch (error) {
        console.error('Error loading rotating texts:', error);
    }
}

function updateRotatingText(element, text) {
    // Add fade effect
    element.style.opacity = '0';
    element.style.transition = 'opacity 0.5s ease-in-out';
    
    setTimeout(() => {
        element.textContent = `"${text}"`;
        element.style.opacity = '1';
    }, 250);
}

// Clean up interval on page unload
window.addEventListener('beforeunload', () => {
    if (rotatingTextInterval) {
        clearInterval(rotatingTextInterval);
    }
});

// Initialize background decorative images
function initializeBackgroundDecorations() {
    // Remove existing decorations if any
    const existing = document.querySelectorAll('.bg-decoration-img');
    existing.forEach(el => el.remove());
    
    // Create background decorations - only 6.png and 4.webp, bigger size
    const decorations = [
        // Image 6 - Left side, bigger
        { img: '6.png', pos: { top: '50%', left: '20px' }, size: { w: '250px', h: '320px' } },
        
        // Image 4 - Right side, bigger
        { img: '4.webp', pos: { top: '50%', right: '20px' }, size: { w: '240px', h: '300px' } }
    ];
    
    decorations.forEach((dec, index) => {
        const div = document.createElement('div');
        div.className = 'bg-decoration-img';
        div.style.cssText = `
            position: fixed;
            ${dec.pos.top ? `top: ${dec.pos.top};` : ''}
            ${dec.pos.bottom ? `bottom: ${dec.pos.bottom};` : ''}
            ${dec.pos.left ? `left: ${dec.pos.left};` : ''}
            ${dec.pos.right ? `right: ${dec.pos.right};` : ''}
            width: ${dec.size.w};
            height: ${dec.size.h};
            background-image: url('/uploads/images/${dec.img}');
            background-size: contain;
            background-position: center;
            background-repeat: no-repeat;
            z-index: -1;
            pointer-events: none;
            opacity: 0.3;
            ${dec.pos.top === '50%' ? 'transform: translateY(-50%);' : ''}
        `;
        document.body.appendChild(div);
    });
}
