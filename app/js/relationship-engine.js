// Relationship Engine — computes family relationships from parent-child-spouse graph
(function() {
    'use strict';

    var graph = null;
    var cache = { focusId: null, relationships: null };

    // Build bidirectional graph from familyMembers array
    function buildGraph(members) {
        var g = new Map();
        members.forEach(function(m) {
            g.set(m.id, { id: m.id, parents: new Set(), children: new Set(), spouses: new Set() });
        });

        members.forEach(function(m) {
            var rels = m.relationships || [];
            // Also include the flat relationship/relatedTo
            if (m.relationship && m.relatedTo) {
                rels = rels.slice();
                var hasFlat = rels.some(function(r) { return r.type === m.relationship && r.personId === m.relatedTo; });
                if (!hasFlat) rels.push({ type: m.relationship, personId: m.relatedTo });
            }

            rels.forEach(function(rel) {
                var target = g.get(rel.personId);
                var self = g.get(m.id);
                if (!target || !self) return;

                if (rel.type === 'child') {
                    // m is child of target
                    self.parents.add(rel.personId);
                    target.children.add(m.id);
                } else if (rel.type === 'parent') {
                    self.children.add(rel.personId);
                    target.parents.add(m.id);
                } else if (rel.type === 'spouse') {
                    self.spouses.add(rel.personId);
                    target.spouses.add(m.id);
                } else if (rel.type === 'sibling') {
                    // Infer shared parents
                    if (target.parents.size > 0) {
                        target.parents.forEach(function(pid) {
                            self.parents.add(pid);
                            var parent = g.get(pid);
                            if (parent) parent.children.add(m.id);
                        });
                    }
                }
            });
        });

        graph = g;
        return g;
    }

    // Get all ancestors with their generation depth
    function getAncestors(personId) {
        var ancestors = new Map(); // ancestorId -> depth
        var visited = new Set();
        var queue = [{ id: personId, depth: 0 }];

        while (queue.length > 0) {
            var item = queue.shift();
            if (visited.has(item.id)) continue;
            visited.add(item.id);

            if (item.depth > 0) {
                if (!ancestors.has(item.id) || ancestors.get(item.id) > item.depth) {
                    ancestors.set(item.id, item.depth);
                }
            }

            var node = graph.get(item.id);
            if (node) {
                node.parents.forEach(function(pid) {
                    if (!visited.has(pid)) {
                        queue.push({ id: pid, depth: item.depth + 1 });
                    }
                });
            }
        }
        return ancestors;
    }

    // Guard against recursive in-law checks
    var _computing = new Set();

    // Compute relationship between focus person and target
    function computeRelationship(focusId, targetId, members) {
        if (focusId === targetId) {
            return { type: 'self', category: 'self', label: 'You', gX: 0, gY: 0 };
        }

        var pairKey = focusId + ':' + targetId;
        if (_computing.has(pairKey)) return null;
        _computing.add(pairKey);

        if (!graph) buildGraph(members);

        var focusNode = graph.get(focusId);
        var targetNode = graph.get(targetId);
        if (!focusNode || !targetNode) return null;

        // Check direct spouse
        if (focusNode.spouses.has(targetId)) {
            return { type: 'spouse', category: 'direct', gX: 0, gY: 0 };
        }

        // Get ancestors of both
        var focusAncestors = getAncestors(focusId);
        focusAncestors.set(focusId, 0);
        var targetAncestors = getAncestors(targetId);
        targetAncestors.set(targetId, 0);

        // Find common ancestors
        var commonAncestors = [];
        focusAncestors.forEach(function(fDepth, aid) {
            if (targetAncestors.has(aid)) {
                commonAncestors.push({ id: aid, gX: fDepth, gY: targetAncestors.get(aid) });
            }
        });

        // Sort by total distance (closest common ancestor first)
        commonAncestors.sort(function(a, b) { return (a.gX + a.gY) - (b.gX + b.gY); });

        if (commonAncestors.length > 0) {
            var ca = commonAncestors[0];
            _computing.delete(pairKey);
            return classifyByGenerations(ca.gX, ca.gY);
        }

        // Check in-law: target is spouse of someone related by blood
        var inlawResult = checkInLaw(focusId, targetId, members);
        _computing.delete(pairKey);
        if (inlawResult) return inlawResult;

        return { type: 'distant', category: 'other', label: 'Relative', gX: -1, gY: -1 };
    }

    // Classify relationship by generation distances to common ancestor
    function classifyByGenerations(gX, gY) {
        // Direct line
        if (gX === 0 && gY === 0) return { type: 'self', category: 'self', gX: gX, gY: gY };

        // Ancestors
        if (gY === 0 && gX === 1) return { type: 'parent', category: 'direct', gX: gX, gY: gY };
        if (gY === 0 && gX === 2) return { type: 'grandparent', category: 'extended', gX: gX, gY: gY };
        if (gY === 0 && gX === 3) return { type: 'greatGrandparent', category: 'extended', gX: gX, gY: gY };
        if (gY === 0 && gX > 3) return { type: 'greatGrandparent', category: 'extended', gX: gX, gY: gY, greats: gX - 2 };

        // Descendants
        if (gX === 0 && gY === 1) return { type: 'child', category: 'direct', gX: gX, gY: gY };
        if (gX === 0 && gY === 2) return { type: 'grandchild', category: 'extended', gX: gX, gY: gY };
        if (gX === 0 && gY === 3) return { type: 'greatGrandchild', category: 'extended', gX: gX, gY: gY };
        if (gX === 0 && gY > 3) return { type: 'greatGrandchild', category: 'extended', gX: gX, gY: gY, greats: gY - 2 };

        // Siblings
        if (gX === 1 && gY === 1) return { type: 'sibling', category: 'direct', gX: gX, gY: gY };

        // Uncle/Aunt (parent's sibling)
        if (gX === 2 && gY === 1) return { type: 'uncleAunt', category: 'lateral', gX: gX, gY: gY };

        // Great-uncle/aunt
        if (gX === 3 && gY === 1) return { type: 'greatUncleAunt', category: 'lateral', gX: gX, gY: gY };

        // Nephew/Niece (sibling's child)
        if (gX === 1 && gY === 2) return { type: 'nephewNiece', category: 'lateral', gX: gX, gY: gY };

        // Grand-nephew/niece
        if (gX === 1 && gY === 3) return { type: 'grandNephewNiece', category: 'lateral', gX: gX, gY: gY };

        // Cousins
        var minG = Math.min(gX, gY);
        var removed = Math.abs(gX - gY);
        var cousinDegree = minG - 1;

        if (cousinDegree >= 1) {
            return {
                type: 'cousin',
                category: 'cousin',
                degree: cousinDegree,
                removed: removed,
                gX: gX,
                gY: gY
            };
        }

        return { type: 'relative', category: 'other', gX: gX, gY: gY };
    }

    // Check if target is an in-law (spouse of a blood relative)
    function checkInLaw(focusId, targetId, members) {
        if (!graph) return null;
        var targetNode = graph.get(targetId);
        if (!targetNode) return null;

        // Check each of target's spouses — are any of them blood-related to focus?
        var result = null;
        targetNode.spouses.forEach(function(spouseId) {
            if (result) return;
            var bloodRel = computeRelationship(focusId, spouseId, members);
            if (bloodRel && bloodRel.category !== 'other' && bloodRel.type !== 'distant') {
                if (bloodRel.type === 'child') {
                    result = { type: 'childInLaw', category: 'inlaw', via: bloodRel, gX: 0, gY: 1 };
                } else if (bloodRel.type === 'parent') {
                    result = { type: 'parentInLaw', category: 'inlaw', via: bloodRel, gX: 1, gY: 0 };
                } else if (bloodRel.type === 'sibling') {
                    result = { type: 'siblingInLaw', category: 'inlaw', via: bloodRel, gX: 1, gY: 1 };
                } else {
                    result = { type: 'inlaw', category: 'inlaw', via: bloodRel, gX: bloodRel.gX, gY: bloodRel.gY };
                }
            }
        });

        // Also check: is focus's spouse's relative?
        if (!result) {
            var focusNode = graph.get(focusId);
            if (focusNode) {
                focusNode.spouses.forEach(function(spouseId) {
                    if (result) return;
                    var spouseRel = computeRelationship(spouseId, targetId, members);
                    if (spouseRel && spouseRel.category !== 'other' && spouseRel.type !== 'distant' && spouseRel.type !== 'spouse') {
                        if (spouseRel.type === 'parent') {
                            result = { type: 'parentInLaw', category: 'inlaw', via: spouseRel, gX: 1, gY: 0 };
                        } else if (spouseRel.type === 'sibling') {
                            result = { type: 'siblingInLaw', category: 'inlaw', via: spouseRel, gX: 1, gY: 1 };
                        } else {
                            result = { type: 'inlaw', category: 'inlaw', via: spouseRel, gX: spouseRel.gX, gY: spouseRel.gY };
                        }
                    }
                });
            }
        }

        return result;
    }

    // Get gendered label for a relationship
    function getLabel(rel, gender, lang) {
        if (!rel) return '';
        lang = lang || window.currentLanguage || 'en';
        var isMale = gender === 'male';
        var isFemale = gender === 'female';

        var labels = {
            en: {
                self: 'You',
                spouse: isMale ? 'Husband' : isFemale ? 'Wife' : 'Spouse',
                parent: isMale ? 'Father' : isFemale ? 'Mother' : 'Parent',
                child: isMale ? 'Son' : isFemale ? 'Daughter' : 'Child',
                sibling: isMale ? 'Brother' : isFemale ? 'Sister' : 'Sibling',
                grandparent: isMale ? 'Grandfather' : isFemale ? 'Grandmother' : 'Grandparent',
                grandchild: isMale ? 'Grandson' : isFemale ? 'Granddaughter' : 'Grandchild',
                greatGrandparent: isMale ? 'Great-Grandfather' : isFemale ? 'Great-Grandmother' : 'Great-Grandparent',
                greatGrandchild: isMale ? 'Great-Grandson' : isFemale ? 'Great-Granddaughter' : 'Great-Grandchild',
                uncleAunt: isMale ? 'Uncle' : isFemale ? 'Aunt' : 'Uncle/Aunt',
                greatUncleAunt: isMale ? 'Great-Uncle' : isFemale ? 'Great-Aunt' : 'Great-Uncle/Aunt',
                nephewNiece: isMale ? 'Nephew' : isFemale ? 'Niece' : 'Nephew/Niece',
                grandNephewNiece: isMale ? 'Grand-Nephew' : isFemale ? 'Grand-Niece' : 'Grand-Nephew/Niece',
                parentInLaw: isMale ? 'Father-in-Law' : isFemale ? 'Mother-in-Law' : 'Parent-in-Law',
                childInLaw: isMale ? 'Son-in-Law' : isFemale ? 'Daughter-in-Law' : 'Child-in-Law',
                siblingInLaw: isMale ? 'Brother-in-Law' : isFemale ? 'Sister-in-Law' : 'Sibling-in-Law',
                inlaw: 'In-Law',
                relative: 'Relative',
                distant: 'Distant Relative'
            },
            fr: {
                self: 'Vous',
                spouse: isMale ? 'Mari' : isFemale ? 'Femme' : 'Conjoint(e)',
                parent: isMale ? 'P\u00e8re' : isFemale ? 'M\u00e8re' : 'Parent',
                child: isMale ? 'Fils' : isFemale ? 'Fille' : 'Enfant',
                sibling: isMale ? 'Fr\u00e8re' : isFemale ? 'S\u0153ur' : 'Fr\u00e8re/S\u0153ur',
                grandparent: isMale ? 'Grand-p\u00e8re' : isFemale ? 'Grand-m\u00e8re' : 'Grand-parent',
                grandchild: isMale ? 'Petit-fils' : isFemale ? 'Petite-fille' : 'Petit-enfant',
                greatGrandparent: isMale ? 'Arri\u00e8re-grand-p\u00e8re' : isFemale ? 'Arri\u00e8re-grand-m\u00e8re' : 'Arri\u00e8re-grand-parent',
                greatGrandchild: isMale ? 'Arri\u00e8re-petit-fils' : isFemale ? 'Arri\u00e8re-petite-fille' : 'Arri\u00e8re-petit-enfant',
                uncleAunt: isMale ? 'Oncle' : isFemale ? 'Tante' : 'Oncle/Tante',
                greatUncleAunt: isMale ? 'Grand-oncle' : isFemale ? 'Grand-tante' : 'Grand-oncle/tante',
                nephewNiece: isMale ? 'Neveu' : isFemale ? 'Ni\u00e8ce' : 'Neveu/Ni\u00e8ce',
                grandNephewNiece: isMale ? 'Petit-neveu' : isFemale ? 'Petite-ni\u00e8ce' : 'Petit-neveu/ni\u00e8ce',
                parentInLaw: isMale ? 'Beau-p\u00e8re' : isFemale ? 'Belle-m\u00e8re' : 'Beau-parent',
                childInLaw: isMale ? 'Gendre' : isFemale ? 'Belle-fille' : 'Beau-enfant',
                siblingInLaw: isMale ? 'Beau-fr\u00e8re' : isFemale ? 'Belle-s\u0153ur' : 'Beau-fr\u00e8re/belle-s\u0153ur',
                inlaw: 'Par alliance',
                relative: 'Parent(e)',
                distant: 'Parent(e) \u00e9loign\u00e9(e)'
            },
            ht: {
                self: 'Ou menm',
                spouse: isMale ? 'Mari' : isFemale ? 'Madanm' : 'Konj\u0175en',
                parent: isMale ? 'Papa' : isFemale ? 'Manman' : 'Paran',
                child: isMale ? 'Pitit gason' : isFemale ? 'Pitit fi' : 'Pitit',
                sibling: isMale ? 'Fr\u00e8' : isFemale ? 'S\u00e8' : 'Fr\u00e8/S\u00e8',
                grandparent: isMale ? 'Granpapa' : isFemale ? 'Grann' : 'Granparan',
                grandchild: isMale ? 'Pitit pitit gason' : isFemale ? 'Pitit pitit fi' : 'Pitit pitit',
                greatGrandparent: isMale ? 'Ary\u00e8 granpapa' : isFemale ? 'Ary\u00e8 grann' : 'Ary\u00e8 granparan',
                greatGrandchild: isMale ? 'Ary\u00e8 pitit pitit gason' : isFemale ? 'Ary\u00e8 pitit pitit fi' : 'Ary\u00e8 pitit pitit',
                uncleAunt: isMale ? 'Tonton' : isFemale ? 'Matant' : 'Tonton/Matant',
                greatUncleAunt: isMale ? 'Gran tonton' : isFemale ? 'Gran matant' : 'Gran tonton/matant',
                nephewNiece: isMale ? 'Nev\u00e8' : isFemale ? 'Ny\u00e8s' : 'Nev\u00e8/Ny\u00e8s',
                grandNephewNiece: isMale ? 'Pitit nev\u00e8' : isFemale ? 'Pitit ny\u00e8s' : 'Pitit nev\u00e8/ny\u00e8s',
                parentInLaw: isMale ? 'B\u00f2p\u00e8' : isFemale ? 'B\u00e8lm\u00e8' : 'B\u00f2paran',
                childInLaw: isMale ? 'Bofi gason' : isFemale ? 'B\u00e8lfi' : 'Bofi',
                siblingInLaw: isMale ? 'B\u00f2fr\u00e8' : isFemale ? 'B\u00e8ls\u00e8' : 'B\u00f2fr\u00e8/B\u00e8ls\u00e8',
                inlaw: 'Pa alyans',
                relative: 'Fanmi',
                distant: 'Fanmi lwen'
            }
        };

        var dict = labels[lang] || labels.en;
        var type = rel.type;

        // Cousin labels
        if (type === 'cousin') {
            var ordinals = { en: ['First', 'Second', 'Third', 'Fourth', 'Fifth'], fr: ['Premier', 'Deuxi\u00e8me', 'Troisi\u00e8me', 'Quatri\u00e8me', 'Cinqui\u00e8me'], ht: ['Premye', 'Dezy\u00e8m', 'Twazy\u00e8m', 'Katry\u00e8m', 'Senky\u00e8m'] };
            var ords = ordinals[lang] || ordinals.en;
            var degreeStr = ords[rel.degree - 1] || (rel.degree + 'th');
            var cousinWord = lang === 'fr' ? 'Cousin(e)' : lang === 'ht' ? 'Kouzen' : 'Cousin';
            var label = degreeStr + ' ' + cousinWord;
            if (rel.removed > 0) {
                var removedStr = lang === 'en' ? (rel.removed === 1 ? 'Once Removed' : rel.removed + 'x Removed') :
                                 lang === 'fr' ? ('(' + rel.removed + ' degr\u00e9)') :
                                 ('(' + rel.removed + ' degre)');
                label += ' ' + removedStr;
            }
            return label;
        }

        // Great- prefix for multiple greats
        if ((type === 'greatGrandparent' || type === 'greatGrandchild') && rel.greats > 1) {
            var prefix = '';
            for (var i = 1; i < rel.greats; i++) prefix += (lang === 'en' ? 'Great-' : lang === 'fr' ? 'Arri\u00e8re-' : 'Ary\u00e8 ');
            return prefix + (dict[type] || type);
        }

        return dict[type] || type;
    }

    // Compute all relationships for a focus person
    function computeAll(focusId, members) {
        if (cache.focusId === focusId && cache.relationships) return cache.relationships;

        _computing = new Set();
        buildGraph(members);

        var results = new Map();
        var byCategory = { direct: [], extended: [], lateral: [], cousin: [], inlaw: [], other: [], self: [] };

        members.forEach(function(m) {
            var rel = computeRelationship(focusId, m.id, members);
            if (rel) {
                var targetMember = members.find(function(mm) { return mm.id === m.id; });
                rel.label = getLabel(rel, targetMember ? targetMember.gender : null);
                rel.personId = m.id;
                results.set(m.id, rel);
                if (byCategory[rel.category]) {
                    byCategory[rel.category].push(m.id);
                }
            }
        });

        cache = { focusId: focusId, relationships: results, byCategory: byCategory };
        return results;
    }

    // Invalidate cache
    function invalidate() {
        graph = null;
        cache = { focusId: null, relationships: null };
    }

    // Category display info
    var categories = {
        all: { label: { en: 'All', fr: 'Tous', ht: 'Tout' }, icon: 'groups' },
        direct: { label: { en: 'Direct Family', fr: 'Famille directe', ht: 'Fanmi dirèk' }, icon: 'family_restroom' },
        extended: { label: { en: 'Extended', fr: '\u00c9tendue', ht: 'Laj' }, icon: 'diversity_1' },
        lateral: { label: { en: 'Uncles & Aunts', fr: 'Oncles & Tantes', ht: 'Tonton & Matant' }, icon: 'people' },
        cousin: { label: { en: 'Cousins', fr: 'Cousins', ht: 'Kouzen' }, icon: 'group' },
        inlaw: { label: { en: 'In-Laws', fr: 'Par alliance', ht: 'Pa alyans' }, icon: 'handshake' }
    };

    window.pyebwaRelationshipEngine = {
        buildGraph: buildGraph,
        computeRelationship: computeRelationship,
        computeAll: computeAll,
        getLabel: getLabel,
        invalidate: invalidate,
        categories: categories,
        getCache: function() { return cache; }
    };
})();
