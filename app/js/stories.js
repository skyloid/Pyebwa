// Family stories view
(function() {
    'use strict';

    const STORY_REACTION_OPTIONS = [
        '👏🏿', '🙏🏿', '🫶🏿',
        '👍🏿', '👌🏿', '✌🏿',
        '👊🏿', '✊🏿', '💪🏿', '🤘🏿', '🤎'
    ];

    const STORY_REACTION_LABELS = {
        '👏🏿': 'Applause',
        '🙏🏿': 'Gratitude',
        '🫶🏿': 'Love',
        '👍🏿': 'Approval',
        '👌🏿': 'Perfect',
        '✌🏿': 'Peace',
        '👊🏿': 'Respect',
        '✊🏿': 'Power',
        '💪🏿': 'Strength',
        '🤘🏿': 'Rock on',
        '🤎': 'Care'
    };

    const FamilyStories = {
        filterMemberId: 'all',
        query: '',

        getMembers() {
            return Array.isArray(window.familyMembers) ? window.familyMembers : [];
        },

        getAuthorDisplayName(member) {
            if (!member) return '';
            if (typeof window.getMemberDisplayName === 'function') {
                return window.getMemberDisplayName(member);
            }
            return `${member.firstName || ''} ${member.lastName || ''}`.trim();
        },

        getAllStories() {
            const stories = [];

            this.getMembers().forEach(member => {
                const memberStories = Array.isArray(member.stories) ? member.stories : [];
                memberStories.forEach(story => {
                    if (!story || !story.id) return;
                    stories.push({
                        ...story,
                        authorId: member.id,
                        authorName: this.getAuthorDisplayName(member),
                        authorMember: member
                    });
                });
            });

            return stories.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        },

        getFilteredStories() {
            const normalizedQuery = this.query.trim().toLowerCase();

            return this.getAllStories().filter(story => {
                const matchesMember = this.filterMemberId === 'all' || story.authorId === this.filterMemberId;
                if (!matchesMember) return false;

                if (!normalizedQuery) return true;

                const haystack = [
                    story.title,
                    story.content,
                    story.authorName,
                    ...(Array.isArray(story.tags) ? story.tags : [])
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                return haystack.includes(normalizedQuery);
            });
        },

        getRelatedMemberNames(story) {
            if (!Array.isArray(story.relatedMembers) || story.relatedMembers.length === 0) {
                return [];
            }

            const members = this.getMembers();
            return story.relatedMembers
                .map(id => members.find(member => member.id === id))
                .filter(Boolean)
                .map(member => this.getAuthorDisplayName(member));
        },

        getCurrentViewerMember() {
            const currentUser = window.currentUser || {};
            const currentUserId = currentUser.id || currentUser.uid || currentUser.user?.id || null;
            const currentEmail = String(currentUser.email || '').trim().toLowerCase();

            return this.getMembers().find(member => {
                const memberUserId = member.userId || member.user_id || null;
                const memberEmail = String(member.email || '').trim().toLowerCase();
                return (currentUserId && memberUserId && memberUserId === currentUserId)
                    || (currentEmail && memberEmail && memberEmail === currentEmail);
            }) || null;
        },

        canContributeToStory(story) {
            const viewerMember = this.getCurrentViewerMember();
            if (!viewerMember || !story) return false;
            return viewerMember.id !== story.authorId;
        },

        getContributionCount(story) {
            return Array.isArray(story?.contributions) ? story.contributions.length : 0;
        },

        getStoryReactions(story) {
            if (Array.isArray(story?.reactions)) return story.reactions;
            if (Array.isArray(story?.hearts)) {
                return story.hearts.map(reaction => ({
                    ...reaction,
                    emoji: reaction?.emoji || '🫶🏿'
                }));
            }
            return [];
        },

        getViewerReaction(story) {
            const viewerMember = this.getCurrentViewerMember();
            if (!viewerMember) return null;
            return this.getStoryReactions(story).find(reaction => reaction?.memberId === viewerMember.id) || null;
        },

        getReactionCount(story, emoji) {
            return this.getStoryReactions(story).filter(reaction => reaction?.emoji === emoji).length;
        },

        render() {
            const container = document.getElementById('storiesList');
            if (!container) return;

            const allStories = this.getAllStories();
            const filteredStories = this.getFilteredStories();
            const memberOptions = this.getMembers()
                .map(member => `
                    <option value="${member.id}" ${this.filterMemberId === member.id ? 'selected' : ''}>
                        ${this.getAuthorDisplayName(member)}
                    </option>
                `)
                .join('');

            if (allStories.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📖</div>
                        <h3>${t('noStoriesYet') || 'No stories yet'}</h3>
                        <p>${t('startSharing') || 'Start sharing your family stories and memories.'}</p>
                        <button class="btn btn-primary stories-add-action">
                            <span class="material-icons">add_circle</span>
                            ${t('addStory') || 'Add Story'}
                        </button>
                    </div>
                `;
                container.querySelector('.stories-add-action')?.addEventListener('click', () => this.openAuthorPicker());
                return;
            }

            container.innerHTML = `
                <div class="stories-toolbar">
                    <div class="stories-toolbar-main">
                        <div class="stories-filter-group">
                            <label for="storiesMemberFilter">${t('familyMembers') || 'Family Members'}</label>
                            <select id="storiesMemberFilter">
                                <option value="all">${t('allMembers') || 'All Members'}</option>
                                ${memberOptions}
                            </select>
                        </div>
                        <div class="stories-filter-group stories-search-group">
                            <label for="storiesSearchInput">${t('search') || 'Search...'}</label>
                            <input
                                type="text"
                                id="storiesSearchInput"
                                placeholder="${t('searchStories') || 'Search stories...'}"
                                value="${this.query.replace(/"/g, '&quot;')}"
                            >
                        </div>
                    </div>
                </div>
                <div class="stories-feed">
                    ${filteredStories.length > 0 ? filteredStories.map(story => this.renderStoryCard(story)).join('') : `
                        <div class="empty-state">
                            <div class="empty-icon">🔎</div>
                            <h3>${t('noStoriesMatch') || 'No stories match your filters'}</h3>
                            <p>${t('adjustStoryFilters') || 'Try a different member or search term.'}</p>
                        </div>
                    `}
                </div>
            `;

            container.querySelector('#storiesMemberFilter')?.addEventListener('change', (event) => {
                this.filterMemberId = event.target.value;
                this.render();
            });

            container.querySelector('#storiesSearchInput')?.addEventListener('input', (event) => {
                this.query = event.target.value || '';
                this.render();
            });

            container.querySelectorAll('[data-reaction-menu-trigger]').forEach(button => {
                button.addEventListener('click', (event) => {
                    event.stopPropagation();
                    const card = event.currentTarget.closest('.story-feed-card');
                    const shouldOpen = !card?.classList.contains('reaction-menu-open');
                    container.querySelectorAll('.story-feed-card.reaction-menu-open').forEach(item => {
                        if (item !== card) item.classList.remove('reaction-menu-open');
                    });
                    card?.classList.toggle('reaction-menu-open', shouldOpen);
                });
            });

            container.querySelectorAll('[data-story-action]').forEach(button => {
                button.addEventListener('click', async (event) => {
                    event.stopPropagation();
                    const action = event.currentTarget.getAttribute('data-story-action');
                    const storyId = event.currentTarget.getAttribute('data-story-id');
                    if (!action || !storyId) return;

                    if (action === 'view') this.viewStory(storyId);
                    if (action === 'edit') this.editStory(storyId);
                    if (action === 'delete') await this.deleteStory(storyId);
                    if (action === 'contribute') this.contributeToStory(storyId);
                    if (action === 'react') {
                        const emoji = event.currentTarget.getAttribute('data-reaction-emoji');
                        await this.toggleReaction(storyId, emoji);
                    }
                });
            });

            document.removeEventListener('click', this.handleDocumentReactionClose);
            document.addEventListener('click', this.handleDocumentReactionClose);
        },

        handleDocumentReactionClose(event) {
            if (event.target.closest('.story-reactions-row')) return;
            document.querySelectorAll('.story-feed-card.reaction-menu-open').forEach(card => {
                card.classList.remove('reaction-menu-open');
            });
        },

        renderStoryCard(story) {
            const preview = (story.content || '').length > 260
                ? `${story.content.substring(0, 260)}...`
                : (story.content || '');
            const relatedMemberNames = this.getRelatedMemberNames(story);
            const contributionCount = this.getContributionCount(story);
            const canContribute = this.canContributeToStory(story);
            const viewerReaction = this.getViewerReaction(story);
            const totalReactionCount = this.getStoryReactions(story).length;
            const audioMimeType = story.audioUrl?.includes('.wav')
                ? 'audio/wav'
                : story.audioUrl?.includes('.ogg')
                    ? 'audio/ogg'
                    : 'audio/mpeg';

            return `
                <article class="story-card story-feed-card" data-story-id="${story.id}">
                    <div class="story-header">
                        <div>
                            <h3 class="story-title">${story.title || (t('storyTitle') || 'Story')}</h3>
                            <div class="story-date">${this.formatDate(story.date)}</div>
                        </div>
                        <div class="story-actions">
                            <button class="btn-icon" data-story-action="view" data-story-id="${story.id}" title="${t('view') || 'View'}">
                                <span class="material-icons">visibility</span>
                            </button>
                            <button class="btn-icon" data-story-action="edit" data-story-id="${story.id}" title="${t('edit') || 'Edit'}">
                                <span class="material-icons">edit</span>
                            </button>
                            <button class="btn-icon" data-story-action="delete" data-story-id="${story.id}" title="${t('delete') || 'Delete'}">
                                <span class="material-icons">delete</span>
                            </button>
                            ${canContribute ? `
                                <button class="btn-icon" data-story-action="contribute" data-story-id="${story.id}" title="${t('addToStory') || 'Add to Story'}">
                                    <span class="material-icons">post_add</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="story-meta-row">
                        <span class="story-author-chip">
                            <span class="material-icons">person</span>
                            ${story.authorName}
                        </span>
                        ${story.storyType === 'relationship' ? `
                            <span class="story-type-chip">
                                <span class="material-icons">people</span>
                                ${t('relationshipStory') || 'Relationship Story'}
                            </span>
                        ` : ''}
                        ${story.audioUrl ? `
                            <span class="story-type-chip">
                                <span class="material-icons">mic</span>
                                ${t('audioRecording') || 'Audio Recording'}
                            </span>
                        ` : ''}
                        ${contributionCount > 0 ? `
                            <span class="story-type-chip">
                                <span class="material-icons">forum</span>
                                ${contributionCount} ${contributionCount === 1 ? (t('contribution') || 'contribution') : (t('contributions') || 'contributions')}
                            </span>
                        ` : ''}
                    </div>
                    <p class="story-content">${preview.replace(/\n/g, '<br>')}</p>
                    ${story.audioUrl ? `
                        <div class="story-audio-inline">
                            <audio controls preload="none" class="story-audio">
                                <source src="${story.audioUrl}" type="${audioMimeType}">
                            </audio>
                        </div>
                    ` : ''}
                    <div class="story-reactions-row">
                        <button
                            type="button"
                            class="story-reaction-trigger ${viewerReaction ? 'active' : ''}"
                            data-reaction-menu-trigger="true"
                            aria-haspopup="true"
                            aria-expanded="false"
                            title="${t('reactToStory') || 'React to story'}"
                        >
                            <span class="story-reaction-emoji" aria-hidden="true">${viewerReaction?.emoji || '🙂'}</span>
                            <span>${viewerReaction ? (STORY_REACTION_LABELS[viewerReaction.emoji] || (t('reactToStory') || 'React')) : (t('reactToStory') || 'React to story')}</span>
                            <span class="story-reaction-total">${totalReactionCount}</span>
                        </button>
                        <div class="story-reaction-menu" role="group" aria-label="${t('reactToStory') || 'React to story'}">
                            ${STORY_REACTION_OPTIONS.map(emoji => {
                                const count = this.getReactionCount(story, emoji);
                                const isActive = viewerReaction?.emoji === emoji;
                                const reactionLabel = STORY_REACTION_LABELS[emoji] || (t('reactToStory') || 'React to story');
                                return `
                                    <button
                                        type="button"
                                        class="story-reaction-chip ${isActive ? 'active' : ''}"
                                        data-story-action="react"
                                        data-story-id="${story.id}"
                                        data-reaction-emoji="${emoji}"
                                        title="${isActive ? `${reactionLabel} · ${t('removeReaction') || 'Remove reaction'}` : reactionLabel}"
                                        aria-label="${isActive ? `${reactionLabel} · ${t('removeReaction') || 'Remove reaction'}` : reactionLabel}"
                                    >
                                        <span class="story-reaction-emoji" aria-hidden="true">${emoji}</span>
                                        <span class="story-reaction-count">${count}</span>
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    ${relatedMemberNames.length > 0 ? `
                        <div class="related-members-info">
                            <span class="material-icons">group</span>
                            <span>${t('involving') || 'Involving'}: ${relatedMemberNames.join(', ')}</span>
                        </div>
                    ` : ''}
                    ${Array.isArray(story.tags) && story.tags.length > 0 ? `
                        <div class="story-tags">
                            ${story.tags.map(tag => `<span class="story-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </article>
            `;
        },

        formatDate(dateValue) {
            if (!dateValue) return '—';
            const parsed = new Date(dateValue);
            if (Number.isNaN(parsed.getTime())) return '—';
            return parsed.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        },

        getStoryById(storyId) {
            return this.getAllStories().find(story => story.id === storyId) || null;
        },

        withMemberContext(memberId, callback) {
            const member = this.getMembers().find(item => item.id === memberId);
            if (!member || !window.pyebwaMemberProfile) {
                return;
            }

            window.pyebwaMemberProfile.currentMember = member;
            window.pyebwaMemberProfile.currentMemberId = member.id;
            window.pyebwaMemberProfile.currentTreeId = member.treeId || window.currentFamilyTreeId || window.userFamilyTreeId;
            callback(window.pyebwaMemberProfile, member);
        },

        viewStory(storyId) {
            const story = this.getStoryById(storyId);
            if (!story) return;
            this.withMemberContext(story.authorId, profile => profile.viewStory(storyId));
        },

        contributeToStory(storyId) {
            const story = this.getStoryById(storyId);
            if (!story || !story.authorMember || !this.canContributeToStory(story)) return;

            const viewerMember = this.getCurrentViewerMember();
            if (!viewerMember) {
                if (typeof window.showError === 'function') {
                    window.showError(t('errorSavingStory') || 'Error saving story');
                }
                return;
            }

            const modal = document.createElement('div');
            modal.className = 'story-author-modal-overlay';
            modal.innerHTML = `
                <div class="story-author-modal story-contribution-modal">
                    <div class="story-author-modal-header">
                        <h3>${t('addToStory') || 'Add to Story'}</h3>
                        <button class="close-modal" type="button">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                    <div class="story-author-modal-body">
                        <p>${t('addStoryContributionHelp') || 'Add your memory, perspective, or detail to this family story.'}</p>
                        <form class="story-contribution-form">
                            <label for="storyContributionContent">${t('storyContribution') || 'Your Contribution'}</label>
                            <textarea id="storyContributionContent" name="content" rows="8" required placeholder="${t('storyContributionPlaceholder') || 'Write what you remember...'}"></textarea>
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary contribution-cancel">${t('cancel') || 'Cancel'}</button>
                                <button type="submit" class="btn btn-primary">${t('addContribution') || 'Add Contribution'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            const close = () => modal.remove();
            modal.querySelector('.close-modal')?.addEventListener('click', close);
            modal.querySelector('.contribution-cancel')?.addEventListener('click', close);
            modal.addEventListener('click', (event) => {
                if (event.target === modal) close();
            });

            modal.querySelector('.story-contribution-form')?.addEventListener('submit', async (event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const submitBtn = form.querySelector('button[type="submit"]');
                const content = form.querySelector('textarea[name="content"]')?.value?.trim();
                if (!content) return;

                try {
                    submitBtn.disabled = true;
                    await this.saveContribution(story, viewerMember, content);
                    close();
                } finally {
                    submitBtn.disabled = false;
                }
            });
        },

        async saveContribution(story, contributorMember, content) {
            const author = story.authorMember;
            if (!author) {
                throw new Error('Story author not found');
            }

            const updatedStories = (author.stories || []).map(item => {
                if (item.id !== story.id) return item;

                const contributions = Array.isArray(item.contributions) ? [...item.contributions] : [];
                contributions.push({
                    id: `contrib_${Date.now()}`,
                    contributorMemberId: contributorMember.id,
                    contributorName: this.getAuthorDisplayName(contributorMember),
                    content,
                    createdAt: new Date().toISOString()
                });

                return {
                    ...item,
                    contributions
                };
            });

            author.stories = updatedStories;
            await window.updateFamilyMember(author.id, { stories: updatedStories });

            if (typeof window.showSuccess === 'function') {
                window.showSuccess(t('contributionAdded') || 'Contribution added successfully');
            }

            this.render();
        },

        async toggleReaction(storyId, emoji) {
            const story = this.getStoryById(storyId);
            const viewerMember = this.getCurrentViewerMember();
            if (!story || !story.authorMember || !viewerMember || !emoji) {
                return;
            }

            try {
                const author = story.authorMember;
                const updatedStories = (author.stories || []).map(item => {
                    if (item.id !== story.id) return item;

                    const reactions = Array.isArray(item.reactions)
                        ? [...item.reactions]
                        : Array.isArray(item.hearts)
                            ? item.hearts.map(reaction => ({
                                ...reaction,
                                emoji: reaction?.emoji || '🫶🏿'
                            }))
                            : [];
                    const existingIndex = reactions.findIndex(reaction => reaction?.memberId === viewerMember.id);

                    if (existingIndex >= 0) {
                        if (reactions[existingIndex]?.emoji === emoji) {
                            reactions.splice(existingIndex, 1);
                        } else {
                            reactions[existingIndex] = {
                                ...reactions[existingIndex],
                                emoji,
                                createdAt: new Date().toISOString()
                            };
                        }
                    } else {
                        reactions.push({
                            memberId: viewerMember.id,
                            memberName: this.getAuthorDisplayName(viewerMember),
                            emoji,
                            createdAt: new Date().toISOString()
                        });
                    }

                    return {
                        ...item,
                        reactions
                    };
                });

                author.stories = updatedStories;
                await window.updateFamilyMember(author.id, { stories: updatedStories });
                this.render();
            } catch (error) {
                console.error('Error updating story reaction:', error);
                if (typeof window.showError === 'function') {
                    window.showError(t('errorSavingStory') || 'Error saving story');
                }
            }
        },

        editStory(storyId) {
            const story = this.getStoryById(storyId);
            if (!story) return;

            this.withMemberContext(story.authorId, profile => {
                const storyToEdit = Array.isArray(profile.currentMember?.stories)
                    ? profile.currentMember.stories.find(item => item.id === storyId)
                    : null;
                if (!storyToEdit) return;
                profile.showStoryModal(storyToEdit);
                this.bindStoryModalRefresh();
            });
        },

        async deleteStory(storyId) {
            const story = this.getStoryById(storyId);
            if (!story || !story.authorMember) return;

            if (!window.confirm(t('confirmDeleteStory') || 'Are you sure you want to delete this story?')) {
                return;
            }

            try {
                const author = story.authorMember;
                const updatedStories = (author.stories || []).filter(item => item.id !== storyId);
                author.stories = updatedStories;
                await window.updateFamilyMember(author.id, { stories: updatedStories });

                if (story.storyType === 'relationship' && Array.isArray(story.relatedMembers)) {
                    for (const relatedMemberId of story.relatedMembers) {
                        const relatedMember = this.getMembers().find(member => member.id === relatedMemberId);
                        if (!relatedMember) continue;

                        const updatedRelatedStories = (relatedMember.relatedStories || []).filter(item => item.id !== storyId);
                        relatedMember.relatedStories = updatedRelatedStories;
                        await window.updateFamilyMember(relatedMember.id, { relatedStories: updatedRelatedStories });
                    }
                }

                if (typeof window.showSuccess === 'function') {
                    window.showSuccess(t('storyDeleted') || 'Story deleted successfully');
                }

                this.render();
            } catch (error) {
                console.error('Error deleting story:', error);
                if (typeof window.showError === 'function') {
                    window.showError(t('errorDeletingStory') || 'Error deleting story');
                }
            }
        },

        openAuthorPicker() {
            const members = this.getMembers();
            const modal = document.createElement('div');
            modal.className = 'story-author-modal-overlay';
            modal.innerHTML = `
                <div class="story-author-modal">
                    <div class="story-author-modal-header">
                        <h3>${t('addStory') || 'Add Story'}</h3>
                        <button class="close-modal" type="button">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                    <div class="story-author-modal-body">
                        <p>${t('selectStoryAuthor') || 'Choose the family member this story belongs to.'}</p>
                        <div class="story-author-list">
                            ${members.map(member => `
                                <button type="button" class="story-author-option" data-member-id="${member.id}">
                                    <span class="material-icons">person</span>
                                    <span>${this.getAuthorDisplayName(member)}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.querySelector('.close-modal')?.addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (event) => {
                if (event.target === modal) modal.remove();
            });

            modal.querySelectorAll('.story-author-option').forEach(button => {
                button.addEventListener('click', () => {
                    const memberId = button.getAttribute('data-member-id');
                    modal.remove();
                    this.withMemberContext(memberId, profile => {
                        profile.showStoryModal();
                        this.bindStoryModalRefresh();
                    });
                });
            });
        },

        bindStoryModalRefresh() {
            const modal = document.querySelector('.story-modal-overlay');
            if (!modal) return;

            const observer = new MutationObserver(() => {
                if (!document.body.contains(modal)) {
                    observer.disconnect();
                    this.render();
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        },

        init() {
            const addStoryBtn = document.getElementById('addStoryBtn');
            addStoryBtn?.addEventListener('click', () => this.openAuthorPicker());

            document.addEventListener('memberUpdated', () => {
                const storiesView = document.getElementById('storiesView');
                if (storiesView && getComputedStyle(storiesView).display !== 'none') {
                    this.render();
                }
            });
        }
    };

    window.pyebwaFamilyStories = FamilyStories;
    window.loadStories = () => FamilyStories.render();
    window.showAddStoryModal = () => FamilyStories.openAuthorPicker();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => FamilyStories.init());
    } else {
        FamilyStories.init();
    }
})();
