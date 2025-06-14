// Advanced Search Engine for Pyebwa Family Tree
(function() {
    'use strict';
    
    const SearchEngine = {
        // Configuration
        config: {
            minSearchLength: 2,
            maxResults: 50,
            debounceDelay: 300,
            cacheExpiry: 5 * 60 * 1000, // 5 minutes
            searchFields: ['firstName', 'lastName', 'nicknames', 'biography', 'locations']
        },
        
        // Cache for search results
        cache: new Map(),
        
        // Search history
        searchHistory: [],
        maxHistoryItems: 10,
        
        // Initialize search engine
        init() {
            this.loadSearchHistory();
            this.setupSearchIndex();
            console.log('Search engine initialized');
        },
        
        // Tokenize text for search
        tokenize(text) {
            if (!text) return [];
            
            // Convert to lowercase and split by word boundaries
            return text
                .toLowerCase()
                .normalize('NFD') // Normalize unicode
                .replace(/[\u0300-\u036f]/g, '') // Remove accents
                .replace(/[^\w\s]/g, ' ') // Replace non-word chars with space
                .split(/\s+/) // Split by whitespace
                .filter(token => token.length >= 2); // Min length tokens
        },
        
        // Generate search terms for a family member
        generateSearchTerms(member) {
            const terms = new Set();
            
            // Add name tokens
            if (member.firstName) {
                this.tokenize(member.firstName).forEach(t => terms.add(t));
            }
            if (member.lastName) {
                this.tokenize(member.lastName).forEach(t => terms.add(t));
            }
            
            // Add nicknames
            if (member.nicknames && Array.isArray(member.nicknames)) {
                member.nicknames.forEach(nickname => {
                    this.tokenize(nickname).forEach(t => terms.add(t));
                });
            }
            
            // Add biography tokens (limited)
            if (member.biography) {
                const bioTokens = this.tokenize(member.biography);
                // Only add first 50 unique tokens from biography
                bioTokens.slice(0, 50).forEach(t => terms.add(t));
            }
            
            // Add locations
            if (member.birthPlace) {
                this.tokenize(member.birthPlace).forEach(t => terms.add(t));
            }
            if (member.deathPlace) {
                this.tokenize(member.deathPlace).forEach(t => terms.add(t));
            }
            
            // Add years
            if (member.birthDate) {
                const year = new Date(member.birthDate).getFullYear();
                if (year) terms.add(year.toString());
            }
            if (member.deathDate) {
                const year = new Date(member.deathDate).getFullYear();
                if (year) terms.add(year.toString());
            }
            
            return Array.from(terms);
        },
        
        // Create or update search index for a member
        async updateSearchIndex(member, treeId) {
            if (!member || !member.id || !treeId) return;
            
            const searchTerms = this.generateSearchTerms(member);
            const soundex = {
                firstName: this.soundex(member.firstName),
                lastName: this.soundex(member.lastName)
            };
            
            const searchDoc = {
                searchTerms,
                firstName: member.firstName || '',
                lastName: member.lastName || '',
                nicknames: member.nicknames || [],
                birthDate: member.birthDate || null,
                deathDate: member.deathDate || null,
                birthPlace: member.birthPlace || '',
                deathPlace: member.deathPlace || '',
                gender: member.gender || '',
                photoUrl: member.photoUrl || '',
                firstNameSoundex: soundex.firstName,
                lastNameSoundex: soundex.lastName,
                parentIds: member.parentIds || [],
                childIds: member.childIds || [],
                spouseIds: member.spouseIds || [],
                lastUpdated: firebase.firestore.Timestamp.now()
            };
            
            try {
                await firebase.firestore()
                    .collection('familyTrees')
                    .doc(treeId)
                    .collection('searchIndex')
                    .doc(member.id)
                    .set(searchDoc);
                    
                console.log(`Search index updated for ${member.firstName} ${member.lastName}`);
            } catch (error) {
                console.error('Error updating search index:', error);
            }
        },
        
        // Soundex algorithm for phonetic matching
        soundex(name) {
            if (!name) return '';
            
            const a = name.toLowerCase().split('');
            const codes = {
                a: '', e: '', i: '', o: '', u: '', y: '', h: '', w: '',
                b: 1, f: 1, p: 1, v: 1,
                c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2,
                d: 3, t: 3,
                l: 4,
                m: 5, n: 5,
                r: 6
            };
            
            const firstLetter = a[0].toUpperCase();
            const soundex = a
                .map(v => codes[v])
                .filter(v => v)
                .join('');
            
            return (firstLetter + soundex + '000').slice(0, 4);
        },
        
        // Calculate Levenshtein distance for fuzzy matching
        levenshteinDistance(str1, str2) {
            const a = str1.toLowerCase();
            const b = str2.toLowerCase();
            const matrix = [];
            
            if (a.length === 0) return b.length;
            if (b.length === 0) return a.length;
            
            for (let i = 0; i <= b.length; i++) {
                matrix[i] = [i];
            }
            
            for (let j = 0; j <= a.length; j++) {
                matrix[0][j] = j;
            }
            
            for (let i = 1; i <= b.length; i++) {
                for (let j = 1; j <= a.length; j++) {
                    if (b.charAt(i - 1) === a.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j - 1] + 1,
                            matrix[i][j - 1] + 1,
                            matrix[i - 1][j] + 1
                        );
                    }
                }
            }
            
            return matrix[b.length][a.length];
        },
        
        // Perform search
        async search(query, filters = {}, treeId) {
            if (!query || query.length < this.config.minSearchLength) {
                return { results: [], suggestions: [] };
            }
            
            // Check cache
            const cacheKey = JSON.stringify({ query, filters, treeId });
            const cached = this.getCached(cacheKey);
            if (cached) return cached;
            
            const queryTokens = this.tokenize(query);
            const querySoundex = this.soundex(query.split(' ')[0]); // Soundex of first word
            
            try {
                // Start with basic query
                let searchQuery = firebase.firestore()
                    .collection('familyTrees')
                    .doc(treeId)
                    .collection('searchIndex');
                
                // Apply filters
                if (filters.gender) {
                    searchQuery = searchQuery.where('gender', '==', filters.gender);
                }
                
                if (filters.birthYearMin) {
                    searchQuery = searchQuery.where('birthDate', '>=', new Date(filters.birthYearMin, 0, 1));
                }
                
                if (filters.birthYearMax) {
                    searchQuery = searchQuery.where('birthDate', '<=', new Date(filters.birthYearMax, 11, 31));
                }
                
                // Execute query
                const snapshot = await searchQuery.limit(200).get();
                const results = [];
                const suggestions = new Set();
                
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const score = this.calculateScore(queryTokens, data, querySoundex);
                    
                    if (score > 0) {
                        results.push({
                            id: doc.id,
                            ...data,
                            score,
                            highlights: this.getHighlights(query, data)
                        });
                        
                        // Collect suggestions for "did you mean"
                        if (score < 50) {
                            this.collectSuggestions(query, data, suggestions);
                        }
                    }
                });
                
                // Sort by score
                results.sort((a, b) => b.score - a.score);
                
                // Limit results
                const finalResults = results.slice(0, this.config.maxResults);
                
                const searchResult = {
                    results: finalResults,
                    suggestions: Array.from(suggestions).slice(0, 5),
                    totalCount: results.length,
                    query
                };
                
                // Cache results
                this.setCached(cacheKey, searchResult);
                
                // Add to search history
                this.addToHistory(query);
                
                return searchResult;
                
            } catch (error) {
                console.error('Search error:', error);
                return { results: [], suggestions: [], error: error.message };
            }
        },
        
        // Calculate relevance score
        calculateScore(queryTokens, memberData, querySoundex) {
            let score = 0;
            const searchTerms = memberData.searchTerms || [];
            
            // Exact matches in name (highest weight)
            queryTokens.forEach(token => {
                if (memberData.firstName && memberData.firstName.toLowerCase().includes(token)) {
                    score += 100;
                }
                if (memberData.lastName && memberData.lastName.toLowerCase().includes(token)) {
                    score += 100;
                }
            });
            
            // Token matches
            queryTokens.forEach(token => {
                if (searchTerms.includes(token)) {
                    score += 50;
                }
            });
            
            // Soundex matches (phonetic)
            if (querySoundex && (
                memberData.firstNameSoundex === querySoundex ||
                memberData.lastNameSoundex === querySoundex
            )) {
                score += 30;
            }
            
            // Fuzzy matching for names
            queryTokens.forEach(token => {
                const firstNameDistance = this.levenshteinDistance(token, memberData.firstName || '');
                const lastNameDistance = this.levenshteinDistance(token, memberData.lastName || '');
                
                if (firstNameDistance <= 2) score += (20 - firstNameDistance * 5);
                if (lastNameDistance <= 2) score += (20 - lastNameDistance * 5);
            });
            
            // Nickname matches
            if (memberData.nicknames) {
                memberData.nicknames.forEach(nickname => {
                    queryTokens.forEach(token => {
                        if (nickname.toLowerCase().includes(token)) {
                            score += 75;
                        }
                    });
                });
            }
            
            // Location matches (lower weight)
            queryTokens.forEach(token => {
                if (memberData.birthPlace && memberData.birthPlace.toLowerCase().includes(token)) {
                    score += 20;
                }
                if (memberData.deathPlace && memberData.deathPlace.toLowerCase().includes(token)) {
                    score += 20;
                }
            });
            
            return score;
        },
        
        // Get highlighted snippets
        getHighlights(query, memberData) {
            const highlights = {};
            const queryLower = query.toLowerCase();
            const queryTokens = this.tokenize(query);
            
            // Highlight in names
            ['firstName', 'lastName'].forEach(field => {
                if (memberData[field]) {
                    const highlighted = this.highlightText(memberData[field], queryTokens);
                    if (highlighted !== memberData[field]) {
                        highlights[field] = highlighted;
                    }
                }
            });
            
            // Highlight in biography (show snippet)
            if (memberData.biography) {
                const bioLower = memberData.biography.toLowerCase();
                const index = bioLower.indexOf(queryLower);
                if (index !== -1) {
                    const start = Math.max(0, index - 50);
                    const end = Math.min(memberData.biography.length, index + queryLower.length + 50);
                    const snippet = memberData.biography.substring(start, end);
                    highlights.biography = this.highlightText(snippet, queryTokens);
                }
            }
            
            return highlights;
        },
        
        // Highlight matching text
        highlightText(text, tokens) {
            let highlighted = text;
            tokens.forEach(token => {
                const regex = new RegExp(`(${token})`, 'gi');
                highlighted = highlighted.replace(regex, '<mark>$1</mark>');
            });
            return highlighted;
        },
        
        // Collect spelling suggestions
        collectSuggestions(query, memberData, suggestions) {
            const queryTokens = this.tokenize(query);
            
            // Check for close matches in names
            ['firstName', 'lastName'].forEach(field => {
                if (memberData[field]) {
                    queryTokens.forEach(token => {
                        const distance = this.levenshteinDistance(token, memberData[field]);
                        if (distance > 0 && distance <= 2) {
                            suggestions.add(memberData[field]);
                        }
                    });
                }
            });
        },
        
        // Cache management
        getCached(key) {
            const cached = this.cache.get(key);
            if (cached) {
                const age = Date.now() - cached.timestamp;
                if (age < this.config.cacheExpiry) {
                    return cached.data;
                }
                this.cache.delete(key);
            }
            return null;
        },
        
        setCached(key, data) {
            this.cache.set(key, {
                data,
                timestamp: Date.now()
            });
            
            // Limit cache size
            if (this.cache.size > 100) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
        },
        
        // Search history management
        addToHistory(query) {
            // Remove duplicates
            this.searchHistory = this.searchHistory.filter(q => q !== query);
            
            // Add to beginning
            this.searchHistory.unshift(query);
            
            // Limit size
            if (this.searchHistory.length > this.maxHistoryItems) {
                this.searchHistory.pop();
            }
            
            // Save to localStorage
            this.saveSearchHistory();
        },
        
        loadSearchHistory() {
            try {
                const saved = localStorage.getItem('pyebwaSearchHistory');
                if (saved) {
                    this.searchHistory = JSON.parse(saved);
                }
            } catch (e) {
                console.error('Error loading search history:', e);
            }
        },
        
        saveSearchHistory() {
            try {
                localStorage.setItem('pyebwaSearchHistory', JSON.stringify(this.searchHistory));
            } catch (e) {
                console.error('Error saving search history:', e);
            }
        },
        
        // Get search suggestions based on history and common searches
        getSearchSuggestions(query) {
            if (!query) return this.searchHistory.slice(0, 5);
            
            const queryLower = query.toLowerCase();
            return this.searchHistory
                .filter(h => h.toLowerCase().includes(queryLower))
                .slice(0, 5);
        },
        
        // Setup search index for existing data
        async setupSearchIndex() {
            // This will be called when needed to index existing family members
            console.log('Search index setup ready');
        },
        
        // Clear search cache
        clearCache() {
            this.cache.clear();
        },
        
        // Get search statistics
        getStats() {
            return {
                cacheSize: this.cache.size,
                historySize: this.searchHistory.length,
                recentSearches: this.searchHistory.slice(0, 5)
            };
        }
    };
    
    // Initialize when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SearchEngine.init());
    } else {
        SearchEngine.init();
    }
    
    // Export for use
    window.pyebwaSearch = SearchEngine;
})();