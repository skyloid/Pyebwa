// Different Tree View Modes for Pyebwa Family Tree
(function() {
    'use strict';
    
    const TreeViews = {
        // Get filtered members based on view mode
        getFilteredMembers(mode, focusPerson = null) {
            if (!window.familyMembers || window.familyMembers.length === 0) {
                return [];
            }
            
            // If no focus person, use the first person or logged-in user's profile
            if (!focusPerson) {
                focusPerson = this.findFocusPerson();
            }
            
            switch (mode) {
                case 'ancestors':
                    return this.getAncestors(focusPerson);
                case 'descendants':
                    return this.getDescendants(focusPerson);
                case 'hourglass':
                    return this.getHourglass(focusPerson);
                case 'full':
                default:
                    return window.familyMembers;
            }
        },
        
        // Find the focus person for filtered views
        findFocusPerson() {
            // Try to find the logged-in user's profile
            const currentUserId = window.currentUser?.uid;
            if (currentUserId) {
                const userProfile = window.familyMembers.find(m => m.userId === currentUserId);
                if (userProfile) return userProfile;
            }
            
            // Otherwise, find the person with the most connections
            let maxConnections = 0;
            let focusPerson = window.familyMembers[0];
            
            window.familyMembers.forEach(member => {
                const connections = this.countConnections(member);
                if (connections > maxConnections) {
                    maxConnections = connections;
                    focusPerson = member;
                }
            });
            
            return focusPerson;
        },
        
        // Count connections for a person
        countConnections(person) {
            let count = 0;
            
            window.familyMembers.forEach(member => {
                if (member.id === person.id) return;
                
                if (member.relationship === 'parent' && member.relatedTo === person.id) count++;
                if (member.relationship === 'child' && member.relatedTo === person.id) count++;
                if (member.relationship === 'spouse' && member.relatedTo === person.id) count++;
                if (person.relationship === 'parent' && person.relatedTo === member.id) count++;
                if (person.relationship === 'child' && person.relatedTo === member.id) count++;
                if (person.relationship === 'spouse' && person.relatedTo === member.id) count++;
            });
            
            return count;
        },
        
        // Get all ancestors of a person
        getAncestors(person) {
            const ancestors = new Set();
            const processed = new Set();
            
            const findAncestors = (p) => {
                if (!p || processed.has(p.id)) return;
                processed.add(p.id);
                ancestors.add(p);
                
                // Find parents
                window.familyMembers.forEach(member => {
                    if (member.relationship === 'parent' && member.relatedTo === p.id) {
                        findAncestors(member);
                    }
                });
                
                // Also check if this person is marked as child of someone
                if (p.relationship === 'child' && p.relatedTo) {
                    const parent = window.familyMembers.find(m => m.id === p.relatedTo);
                    if (parent) {
                        findAncestors(parent);
                        
                        // Include parent's spouse
                        window.familyMembers.forEach(member => {
                            if (member.relationship === 'spouse' && member.relatedTo === parent.id) {
                                ancestors.add(member);
                            }
                        });
                    }
                }
            };
            
            findAncestors(person);
            return Array.from(ancestors);
        },
        
        // Get all descendants of a person
        getDescendants(person) {
            const descendants = new Set();
            const processed = new Set();
            
            const findDescendants = (p) => {
                if (!p || processed.has(p.id)) return;
                processed.add(p.id);
                descendants.add(p);
                
                // Find children
                window.familyMembers.forEach(member => {
                    if (member.relationship === 'child' && member.relatedTo === p.id) {
                        findDescendants(member);
                    }
                });
                
                // Also check if this person is marked as parent of someone
                if (p.relationship === 'parent' && p.relatedTo) {
                    const child = window.familyMembers.find(m => m.id === p.relatedTo);
                    if (child) {
                        findDescendants(child);
                    }
                }
                
                // Include spouse to show family units
                window.familyMembers.forEach(member => {
                    if (member.relationship === 'spouse' && member.relatedTo === p.id) {
                        descendants.add(member);
                    }
                });
            };
            
            findDescendants(person);
            return Array.from(descendants);
        },
        
        // Get hourglass view (ancestors and descendants)
        getHourglass(person) {
            const ancestors = this.getAncestors(person);
            const descendants = this.getDescendants(person);
            
            // Combine and remove duplicates
            const combined = new Set([...ancestors, ...descendants]);
            return Array.from(combined);
        },
        
        // Create relationship path finder
        findRelationshipPath(person1Id, person2Id) {
            if (person1Id === person2Id) return [];
            
            const visited = new Set();
            const queue = [{id: person1Id, path: []}];
            
            while (queue.length > 0) {
                const {id, path} = queue.shift();
                
                if (visited.has(id)) continue;
                visited.add(id);
                
                const person = window.familyMembers.find(m => m.id === id);
                if (!person) continue;
                
                // Get all connections
                const connections = this.getConnections(person);
                
                for (const conn of connections) {
                    const newPath = [...path, {from: id, to: conn.id, type: conn.type}];
                    
                    if (conn.id === person2Id) {
                        return newPath;
                    }
                    
                    queue.push({id: conn.id, path: newPath});
                }
            }
            
            return null; // No path found
        },
        
        // Get all connections for a person
        getConnections(person) {
            const connections = [];
            
            window.familyMembers.forEach(member => {
                if (member.id === person.id) return;
                
                // Direct relationships
                if (person.relationship && person.relatedTo === member.id) {
                    connections.push({id: member.id, type: person.relationship});
                }
                
                // Reverse relationships
                if (member.relationship && member.relatedTo === person.id) {
                    const reverseType = this.getReverseRelationship(member.relationship);
                    connections.push({id: member.id, type: reverseType});
                }
            });
            
            return connections;
        },
        
        // Get reverse relationship type
        getReverseRelationship(type) {
            const reverseMap = {
                'parent': 'child',
                'child': 'parent',
                'spouse': 'spouse',
                'sibling': 'sibling'
            };
            return reverseMap[type] || type;
        },
        
        // Calculate relationship between two people
        calculateRelationship(person1Id, person2Id) {
            const path = this.findRelationshipPath(person1Id, person2Id);
            if (!path || path.length === 0) return 'No relation found';
            
            // Analyze path to determine relationship
            // This is a simplified version - can be expanded
            if (path.length === 1) {
                return path[0].type;
            }
            
            // Complex relationships
            let relationship = '';
            let generationDiff = 0;
            
            path.forEach(step => {
                if (step.type === 'parent') generationDiff++;
                if (step.type === 'child') generationDiff--;
            });
            
            if (generationDiff === 0) {
                // Same generation
                if (path.some(s => s.type === 'sibling')) {
                    relationship = 'Sibling';
                } else if (path.length === 2 && path.every(s => s.type === 'child' || s.type === 'parent')) {
                    relationship = 'Cousin';
                } else {
                    relationship = 'Relative';
                }
            } else if (generationDiff > 0) {
                // Ancestor
                if (generationDiff === 1) relationship = 'Parent';
                else if (generationDiff === 2) relationship = 'Grandparent';
                else relationship = `${generationDiff}x Great-Grandparent`;
            } else {
                // Descendant
                generationDiff = Math.abs(generationDiff);
                if (generationDiff === 1) relationship = 'Child';
                else if (generationDiff === 2) relationship = 'Grandchild';
                else relationship = `${generationDiff}x Great-Grandchild`;
            }
            
            return relationship;
        },
        
        // Find common ancestors
        findCommonAncestors(person1Id, person2Id) {
            const ancestors1 = this.getAncestors(window.familyMembers.find(m => m.id === person1Id));
            const ancestors2 = this.getAncestors(window.familyMembers.find(m => m.id === person2Id));
            
            const ancestors1Ids = new Set(ancestors1.map(a => a.id));
            const common = ancestors2.filter(a => ancestors1Ids.has(a.id));
            
            return common;
        },
        
        // Export view mode filter
        applyViewFilter(members, mode, focusPerson = null) {
            return this.getFilteredMembers(mode, focusPerson);
        }
    };
    
    // Export for use
    window.pyebwaTreeViews = TreeViews;
})();