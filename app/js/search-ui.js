// Search UI Components for Pyebwa Family Tree
(function() {
    'use strict';
    
    // Safe translation function wrapper
    const t = (key, params) => {
        if (typeof window.t === 'function') {
            return window.t(key, params);
        }
        // Fallback translations
        const fallbacks = {
            searchFamily: 'Search family...',
            search: 'Search',
            advancedSearch: 'Advanced Search',
            searchTerms: 'Search Terms',
            enterNamesLocationsDates: 'Enter names, locations, or dates',
            filters: 'Filters',
            gender: 'Gender',
            any: 'Any',
            male: 'Male',
            female: 'Female',
            other: 'Other',
            livingStatus: 'Living Status',
            living: 'Living',
            deceased: 'Deceased',
            birthYear: 'Birth Year',
            from: 'From',
            to: 'To',
            location: 'Location',
            enterLocation: 'Enter location',
            relationship: 'Relationship',
            ancestors: 'Ancestors',
            descendants: 'Descendants',
            siblings: 'Siblings',
            spouses: 'Spouses',
            clearFilters: 'Clear Filters',
            savedSearches: 'Saved Searches',
            noResults: 'No results',
            seeAllResults: 'See all results',
            noDetails: 'No details available',
            searchResultsFor: params => `Search results for "${params.query}"`,
            withFilters: params => `${params.count} filters`,
            searching: 'Searching...',
            noResultsFound: 'No results found',
            tryDifferentSearch: 'Try a different search term',
            didYouMean: 'Did you mean:',
            relevance: 'Relevance',
            showingXofY: params => `Showing ${params.shown} of ${params.total} results`,
            searchError: 'Search error',
            tryAgainLater: 'Please try again later'
        };
        const translation = fallbacks[key];
        if (typeof translation === 'function') {
            return translation(params);
        }
        return translation || key;
    };
    
    const SearchUI = {
        // UI state
        state: {
            isSearchOpen: false,
            isAdvancedOpen: false,
            currentQuery: '',
            currentFilters: {},
            isSearching: false,
            results: []
        },
        
        // Initialize search UI
        init() {
            this.createSearchComponents();
            this.attachEventListeners();
            this.setupKeyboardShortcuts();
        },
        
        // Create search UI components
        createSearchComponents() {
            // Quick search in header
            this.createQuickSearch();
            
            // Advanced search modal
            this.createAdvancedSearchModal();
            
            // Search results container
            this.createSearchResults();
            
            // Add styles
            this.addStyles();
        },
        
        // Create quick search box
        createQuickSearch() {
            const header = document.querySelector('.app-header');
            if (!header) return;
            
            const searchContainer = document.createElement('div');
            searchContainer.className = 'quick-search-container';
            searchContainer.innerHTML = `
                <div class="quick-search">
                    <input type="text" 
                           class="quick-search-input" 
                           placeholder="${t('searchFamily')}"
                           autocomplete="off">
                    <button class="search-btn" aria-label="${t('search')}">
                        <i class="material-icons">search</i>
                    </button>
                    <button class="advanced-search-btn" aria-label="${t('advancedSearch')}">
                        <i class="material-icons">tune</i>
                    </button>
                    <div class="search-suggestions"></div>
                </div>
            `;
            
            // Insert after logo/title
            const title = header.querySelector('.app-title');
            if (title && title.nextSibling) {
                header.insertBefore(searchContainer, title.nextSibling);
            } else {
                header.appendChild(searchContainer);
            }
            
            this.quickSearchInput = searchContainer.querySelector('.quick-search-input');
            this.searchSuggestions = searchContainer.querySelector('.search-suggestions');
        },
        
        // Create advanced search modal
        createAdvancedSearchModal() {
            const modal = document.createElement('div');
            modal.className = 'search-modal';
            modal.innerHTML = `
                <div class="search-modal-content">
                    <div class="search-modal-header">
                        <h2>${t('advancedSearch')}</h2>
                        <button class="close-search-modal">
                            <i class="material-icons">close</i>
                        </button>
                    </div>
                    
                    <div class="search-modal-body">
                        <div class="search-form">
                            <div class="form-group">
                                <label>${t('searchTerms')}</label>
                                <input type="text" class="advanced-search-input" 
                                       placeholder="${t('enterNamesLocationsDates')}">
                            </div>
                            
                            <div class="search-filters">
                                <h3>${t('filters')}</h3>
                                
                                <div class="filter-row">
                                    <div class="form-group">
                                        <label>${t('gender')}</label>
                                        <select class="filter-gender">
                                            <option value="">${t('any')}</option>
                                            <option value="male">${t('male')}</option>
                                            <option value="female">${t('female')}</option>
                                            <option value="other">${t('other')}</option>
                                        </select>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>${t('livingStatus')}</label>
                                        <select class="filter-living">
                                            <option value="">${t('any')}</option>
                                            <option value="living">${t('living')}</option>
                                            <option value="deceased">${t('deceased')}</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="filter-row">
                                    <div class="form-group">
                                        <label>${t('birthYear')}</label>
                                        <div class="year-range">
                                            <input type="number" class="filter-birth-min" 
                                                   placeholder="${t('from')}" min="1000" max="2100">
                                            <span>-</span>
                                            <input type="number" class="filter-birth-max" 
                                                   placeholder="${t('to')}" min="1000" max="2100">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="filter-row">
                                    <div class="form-group">
                                        <label>${t('location')}</label>
                                        <input type="text" class="filter-location" 
                                               placeholder="${t('enterLocation')}">
                                    </div>
                                </div>
                                
                                <div class="filter-row">
                                    <div class="form-group">
                                        <label>${t('relationship')}</label>
                                        <select class="filter-relationship">
                                            <option value="">${t('any')}</option>
                                            <option value="ancestors">${t('ancestors')}</option>
                                            <option value="descendants">${t('descendants')}</option>
                                            <option value="siblings">${t('siblings')}</option>
                                            <option value="spouses">${t('spouses')}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="search-actions">
                                <button class="btn btn-secondary clear-filters">${t('clearFilters')}</button>
                                <button class="btn btn-primary perform-search">${t('search')}</button>
                            </div>
                        </div>
                        
                        <div class="saved-searches">
                            <h3>${t('savedSearches')}</h3>
                            <div class="saved-searches-list"></div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            this.searchModal = modal;
        },
        
        // Create search results container
        createSearchResults() {
            const container = document.createElement('div');
            container.className = 'search-results-container';
            container.innerHTML = `
                <div class="search-results-header">
                    <h3 class="search-results-title"></h3>
                    <button class="close-results">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                <div class="search-results-filters"></div>
                <div class="search-results-list"></div>
                <div class="search-results-pagination"></div>
            `;
            
            document.querySelector('.view-container').appendChild(container);
            this.resultsContainer = container;
        },
        
        // Add CSS styles
        addStyles() {
            const style = document.createElement('style');
            style.textContent = `
                /* Quick Search */
                .quick-search-container {
                    flex: 1;
                    max-width: 400px;
                    margin: 0 20px;
                }
                
                .quick-search {
                    position: relative;
                    display: flex;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    padding: 4px;
                }
                
                .quick-search-input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: white;
                    padding: 8px 12px;
                    font-size: 14px;
                    outline: none;
                }
                
                .quick-search-input::placeholder {
                    color: rgba(255, 255, 255, 0.7);
                }
                
                .search-btn, .advanced-search-btn {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.8);
                    padding: 8px;
                    cursor: pointer;
                    transition: color 0.2s;
                }
                
                .search-btn:hover, .advanced-search-btn:hover {
                    color: white;
                }
                
                /* Search Suggestions */
                .search-suggestions {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    border-radius: 8px;
                    margin-top: 4px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                    display: none;
                    z-index: 1000;
                }
                
                .search-suggestions.active {
                    display: block;
                }
                
                .suggestion-item {
                    padding: 12px 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    transition: background 0.2s;
                }
                
                .suggestion-item:hover {
                    background: #f5f5f5;
                }
                
                .suggestion-item img {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    object-fit: cover;
                }
                
                .suggestion-info {
                    flex: 1;
                }
                
                .suggestion-name {
                    font-weight: 500;
                    color: #333;
                }
                
                .suggestion-details {
                    font-size: 12px;
                    color: #666;
                }
                
                /* Search Modal */
                .search-modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 2000;
                    padding: 20px;
                    overflow-y: auto;
                }
                
                .search-modal.active {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .search-modal-content {
                    background: white;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 800px;
                    max-height: 90vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                
                .search-modal-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                
                .search-modal-body {
                    padding: 24px;
                    overflow-y: auto;
                    flex: 1;
                }
                
                .search-filters {
                    margin-top: 24px;
                }
                
                .filter-row {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                    margin-bottom: 16px;
                }
                
                .year-range {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .year-range input {
                    flex: 1;
                }
                
                .search-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    margin-top: 24px;
                }
                
                /* Search Results */
                .search-results-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: white;
                    z-index: 100;
                    transform: translateX(100%);
                    transition: transform 0.3s ease;
                    overflow-y: auto;
                }
                
                .search-results-container.active {
                    transform: translateX(0);
                }
                
                .search-results-header {
                    position: sticky;
                    top: 0;
                    background: white;
                    padding: 16px 24px;
                    border-bottom: 1px solid #e0e0e0;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    z-index: 10;
                }
                
                .search-result-item {
                    padding: 16px 24px;
                    border-bottom: 1px solid #f0f0f0;
                    cursor: pointer;
                    transition: background 0.2s;
                    display: flex;
                    gap: 16px;
                    align-items: center;
                }
                
                .search-result-item:hover {
                    background: #f8f9fa;
                }
                
                .result-photo {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    object-fit: cover;
                    background: #e0e0e0;
                }
                
                .result-info {
                    flex: 1;
                }
                
                .result-name {
                    font-size: 18px;
                    font-weight: 500;
                    margin-bottom: 4px;
                }
                
                .result-dates {
                    font-size: 14px;
                    color: #666;
                }
                
                .result-highlight {
                    font-size: 14px;
                    color: #666;
                    margin-top: 4px;
                }
                
                .result-highlight mark {
                    background: #fff59d;
                    padding: 0 2px;
                    border-radius: 2px;
                }
                
                /* Dark mode support */
                body.dark-mode .quick-search {
                    background: rgba(255, 255, 255, 0.05);
                }
                
                body.dark-mode .search-suggestions {
                    background: #2a2a2a;
                    color: #f0f0f0;
                }
                
                body.dark-mode .suggestion-item:hover {
                    background: #3a3a3a;
                }
                
                body.dark-mode .search-modal-content {
                    background: #1a1a1a;
                    color: #f0f0f0;
                }
                
                body.dark-mode .search-results-container {
                    background: #1a1a1a;
                    color: #f0f0f0;
                }
                
                /* Loading state */
                .search-loading {
                    text-align: center;
                    padding: 40px;
                }
                
                .search-loading .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #00217D;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 16px;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                /* No results */
                .no-results {
                    text-align: center;
                    padding: 60px 20px;
                    color: #666;
                }
                
                .no-results-icon {
                    font-size: 64px;
                    color: #e0e0e0;
                    margin-bottom: 16px;
                }
                
                /* Mobile responsive */
                @media (max-width: 768px) {
                    .quick-search-container {
                        margin: 0 10px;
                    }
                    
                    .search-modal-content {
                        margin: 10px;
                        max-height: calc(100vh - 20px);
                    }
                    
                    .filter-row {
                        grid-template-columns: 1fr;
                    }
                }
            `;
            
            document.head.appendChild(style);
        },
        
        // Attach event listeners
        attachEventListeners() {
            // Quick search
            this.quickSearchInput.addEventListener('input', 
                this.debounce(() => this.handleQuickSearch(), 300));
            
            this.quickSearchInput.addEventListener('focus', 
                () => this.showSuggestions());
            
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.quick-search')) {
                    this.hideSuggestions();
                }
            });
            
            // Advanced search button
            document.querySelector('.advanced-search-btn').addEventListener('click', 
                () => this.openAdvancedSearch());
            
            // Modal controls
            document.querySelector('.close-search-modal').addEventListener('click', 
                () => this.closeAdvancedSearch());
            
            document.querySelector('.perform-search').addEventListener('click', 
                () => this.performAdvancedSearch());
            
            document.querySelector('.clear-filters').addEventListener('click', 
                () => this.clearFilters());
            
            // Results controls
            document.querySelector('.close-results').addEventListener('click', 
                () => this.closeResults());
            
            // Click outside modal to close
            this.searchModal.addEventListener('click', (e) => {
                if (e.target === this.searchModal) {
                    this.closeAdvancedSearch();
                }
            });
        },
        
        // Setup keyboard shortcuts
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Cmd/Ctrl + K for search
                if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                    e.preventDefault();
                    this.quickSearchInput.focus();
                }
                
                // Escape to close
                if (e.key === 'Escape') {
                    if (this.state.isSearchOpen) {
                        this.closeResults();
                    } else if (this.state.isAdvancedOpen) {
                        this.closeAdvancedSearch();
                    }
                }
            });
        },
        
        // Handle quick search
        async handleQuickSearch() {
            const query = this.quickSearchInput.value.trim();
            
            if (query.length < 2) {
                this.hideSuggestions();
                return;
            }
            
            this.state.currentQuery = query;
            
            // Show loading in suggestions
            this.showSuggestions();
            this.updateSuggestions([{ loading: true }]);
            
            try {
                // Perform search
                const results = await window.pyebwaSearch.search(
                    query, 
                    {}, 
                    window.userFamilyTreeId
                );
                
                // Show top 5 as suggestions
                this.updateSuggestions(results.results.slice(0, 5));
                
            } catch (error) {
                console.error('Search error:', error);
                this.hideSuggestions();
            }
        },
        
        // Show suggestions dropdown
        showSuggestions() {
            this.searchSuggestions.classList.add('active');
        },
        
        // Hide suggestions
        hideSuggestions() {
            this.searchSuggestions.classList.remove('active');
        },
        
        // Update suggestions
        updateSuggestions(suggestions) {
            if (suggestions.length === 0) {
                this.searchSuggestions.innerHTML = `
                    <div class="no-suggestions">${t('noResults')}</div>
                `;
                return;
            }
            
            if (suggestions[0].loading) {
                this.searchSuggestions.innerHTML = `
                    <div class="search-loading">
                        <div class="spinner"></div>
                    </div>
                `;
                return;
            }
            
            const html = suggestions.map(person => `
                <div class="suggestion-item" data-id="${person.id}">
                    <img src="${person.photoUrl || '/app/images/default-avatar.svg'}" 
                         alt="${person.firstName} ${person.lastName}">
                    <div class="suggestion-info">
                        <div class="suggestion-name">
                            ${person.highlights?.firstName || person.firstName} 
                            ${person.highlights?.lastName || person.lastName}
                        </div>
                        <div class="suggestion-details">
                            ${this.formatPersonDetails(person)}
                        </div>
                    </div>
                </div>
            `).join('');
            
            this.searchSuggestions.innerHTML = html + `
                <div class="suggestion-item see-all" style="background: #f5f5f5;">
                    <i class="material-icons" style="margin-left: 12px;">search</i>
                    <div class="suggestion-info">
                        <div class="suggestion-name">${t('seeAllResults')}</div>
                    </div>
                </div>
            `;
            
            // Add click handlers
            this.searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    if (item.classList.contains('see-all')) {
                        this.showAllResults();
                    } else {
                        const personId = item.dataset.id;
                        this.viewPerson(personId);
                    }
                });
            });
        },
        
        // Format person details for display
        formatPersonDetails(person) {
            const parts = [];
            
            if (person.birthDate || person.deathDate) {
                const birth = person.birthDate ? new Date(person.birthDate).getFullYear() : '?';
                const death = person.deathDate ? new Date(person.deathDate).getFullYear() : '';
                parts.push(`${birth}${death ? ' - ' + death : ''}`);
            }
            
            if (person.birthPlace) {
                parts.push(person.birthPlace);
            }
            
            return parts.join(' • ') || t('noDetails');
        },
        
        // View person profile
        viewPerson(personId) {
            this.hideSuggestions();
            this.quickSearchInput.value = '';
            
            // Navigate to person view
            if (window.viewMemberProfile) {
                window.viewMemberProfile(personId);
            }
        },
        
        // Show all search results
        async showAllResults() {
            this.hideSuggestions();
            this.state.isSearching = true;
            
            // Show results container
            this.resultsContainer.classList.add('active');
            this.updateResultsHeader();
            this.showLoadingResults();
            
            try {
                const results = await window.pyebwaSearch.search(
                    this.state.currentQuery,
                    this.state.currentFilters,
                    window.userFamilyTreeId
                );
                
                this.state.results = results.results;
                this.displayResults(results);
                
            } catch (error) {
                console.error('Search error:', error);
                this.showErrorResults();
            } finally {
                this.state.isSearching = false;
            }
        },
        
        // Update results header
        updateResultsHeader() {
            const title = document.querySelector('.search-results-title');
            const query = this.state.currentQuery;
            const filterCount = Object.keys(this.state.currentFilters).length;
            
            let text = t('searchResultsFor', { query });
            if (filterCount > 0) {
                text += ` (${t('withFilters', { count: filterCount })})`;
            }
            
            title.textContent = text;
        },
        
        // Show loading state
        showLoadingResults() {
            document.querySelector('.search-results-list').innerHTML = `
                <div class="search-loading">
                    <div class="spinner"></div>
                    <p>${t('searching')}</p>
                </div>
            `;
        },
        
        // Display search results
        displayResults(searchResults) {
            const container = document.querySelector('.search-results-list');
            
            if (searchResults.results.length === 0) {
                container.innerHTML = `
                    <div class="no-results">
                        <div class="no-results-icon">
                            <i class="material-icons">search_off</i>
                        </div>
                        <h3>${t('noResultsFound')}</h3>
                        <p>${t('tryDifferentSearch')}</p>
                        ${searchResults.suggestions.length > 0 ? `
                            <div class="suggestions">
                                <p>${t('didYouMean')}</p>
                                ${searchResults.suggestions.map(s => 
                                    `<button class="suggestion-link">${s}</button>`
                                ).join(' ')}
                            </div>
                        ` : ''}
                    </div>
                `;
                
                // Add suggestion click handlers
                container.querySelectorAll('.suggestion-link').forEach((btn, index) => {
                    btn.addEventListener('click', () => {
                        this.state.currentQuery = searchResults.suggestions[index];
                        this.quickSearchInput.value = this.state.currentQuery;
                        this.showAllResults();
                    });
                });
                
                return;
            }
            
            const html = searchResults.results.map(person => `
                <div class="search-result-item" data-id="${person.id}">
                    <img class="result-photo" 
                         src="${person.photoUrl || '/app/images/default-avatar.svg'}" 
                         alt="${person.firstName} ${person.lastName}">
                    <div class="result-info">
                        <div class="result-name">
                            ${person.highlights?.firstName || person.firstName} 
                            ${person.highlights?.lastName || person.lastName}
                        </div>
                        <div class="result-dates">
                            ${this.formatPersonDetails(person)}
                        </div>
                        ${person.highlights?.biography ? `
                            <div class="result-highlight">
                                ...${person.highlights.biography}...
                            </div>
                        ` : ''}
                    </div>
                    <div class="result-score" style="color: #999; font-size: 12px;">
                        ${t('relevance')}: ${Math.round(person.score)}%
                    </div>
                </div>
            `).join('');
            
            container.innerHTML = html;
            
            // Add info about total results
            if (searchResults.totalCount > searchResults.results.length) {
                container.innerHTML += `
                    <div style="text-align: center; padding: 20px; color: #666;">
                        ${t('showingXofY', { 
                            shown: searchResults.results.length, 
                            total: searchResults.totalCount 
                        })}
                    </div>
                `;
            }
            
            // Add click handlers
            container.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const personId = item.dataset.id;
                    this.closeResults();
                    this.viewPerson(personId);
                });
            });
        },
        
        // Show error state
        showErrorResults() {
            document.querySelector('.search-results-list').innerHTML = `
                <div class="error-state" style="text-align: center; padding: 60px 20px;">
                    <i class="material-icons" style="font-size: 64px; color: #ef5350;">error_outline</i>
                    <h3>${t('searchError')}</h3>
                    <p>${t('tryAgainLater')}</p>
                </div>
            `;
        },
        
        // Close results
        closeResults() {
            this.resultsContainer.classList.remove('active');
            this.state.isSearchOpen = false;
            this.quickSearchInput.value = '';
        },
        
        // Open advanced search
        openAdvancedSearch() {
            this.searchModal.classList.add('active');
            this.state.isAdvancedOpen = true;
            
            // Focus on search input
            setTimeout(() => {
                document.querySelector('.advanced-search-input').focus();
            }, 100);
        },
        
        // Close advanced search
        closeAdvancedSearch() {
            this.searchModal.classList.remove('active');
            this.state.isAdvancedOpen = false;
        },
        
        // Perform advanced search
        performAdvancedSearch() {
            const query = document.querySelector('.advanced-search-input').value.trim();
            
            if (!query) {
                return;
            }
            
            // Collect filters
            this.state.currentFilters = {
                gender: document.querySelector('.filter-gender').value,
                living: document.querySelector('.filter-living').value,
                birthYearMin: document.querySelector('.filter-birth-min').value,
                birthYearMax: document.querySelector('.filter-birth-max').value,
                location: document.querySelector('.filter-location').value,
                relationship: document.querySelector('.filter-relationship').value
            };
            
            // Remove empty filters
            Object.keys(this.state.currentFilters).forEach(key => {
                if (!this.state.currentFilters[key]) {
                    delete this.state.currentFilters[key];
                }
            });
            
            this.state.currentQuery = query;
            this.quickSearchInput.value = query;
            
            this.closeAdvancedSearch();
            this.showAllResults();
        },
        
        // Clear filters
        clearFilters() {
            document.querySelector('.advanced-search-input').value = '';
            document.querySelector('.filter-gender').value = '';
            document.querySelector('.filter-living').value = '';
            document.querySelector('.filter-birth-min').value = '';
            document.querySelector('.filter-birth-max').value = '';
            document.querySelector('.filter-location').value = '';
            document.querySelector('.filter-relationship').value = '';
            
            this.state.currentFilters = {};
        },
        
        // Debounce helper
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SearchUI.init());
    } else {
        SearchUI.init();
    }
    
    // Export for use
    window.pyebwaSearchUI = SearchUI;
})();