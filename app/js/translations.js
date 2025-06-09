// Translation system for Pyebwa app
const translations = {
    en: {
        // Navigation
        navTree: "Family Tree",
        navMembers: "Members",
        navStories: "Stories",
        
        // User menu
        profile: "Profile",
        settings: "Settings",
        logout: "Logout",
        
        // Common
        loading: "Loading...",
        search: "Search...",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        view: "View",
        
        // Family tree
        familyTree: "My Family Tree",
        addMember: "Add Member",
        addFamilyMember: "Add Family Member",
        
        // Member fields
        firstName: "First Name",
        lastName: "Last Name",
        gender: "Gender",
        male: "Male",
        female: "Female",
        birthDate: "Birth Date",
        deathDate: "Death Date",
        biography: "Biography",
        photo: "Photo",
        
        // Relationships
        relationship: "Relationship",
        selectRelationship: "Select relationship",
        relatedTo: "Related to",
        parent: "Parent",
        child: "Child",
        spouse: "Spouse",
        sibling: "Sibling",
        
        // Members view
        familyMembers: "Family Members",
        memberCount: "{count} members",
        
        // Stories
        familyStories: "Family Stories",
        addStory: "Add Story",
        storyTitle: "Title",
        storyContent: "Story",
        storyDate: "Date",
        
        // Messages
        welcomeBack: "Welcome back",
        noMembersYet: "No family members added yet.",
        startBuilding: "Start building your family tree by adding your first member.",
        confirmDelete: "Are you sure you want to delete {name}?",
        savedSuccessfully: "Saved successfully!",
        errorSaving: "Error saving. Please try again.",
        update: "Update",
        editFamilyMember: "Edit Family Member",
        selectPerson: "Select person",
        updatedSuccessfully: "Updated successfully!",
    },
    
    fr: {
        // Navigation
        navTree: "Arbre Généalogique",
        navMembers: "Membres",
        navStories: "Histoires",
        
        // User menu
        profile: "Profil",
        settings: "Paramètres",
        logout: "Déconnexion",
        
        // Common
        loading: "Chargement...",
        search: "Rechercher...",
        save: "Enregistrer",
        cancel: "Annuler",
        delete: "Supprimer",
        edit: "Modifier",
        view: "Voir",
        
        // Family tree
        familyTree: "Mon Arbre Généalogique",
        addMember: "Ajouter Membre",
        addFamilyMember: "Ajouter un Membre de la Famille",
        
        // Member fields
        firstName: "Prénom",
        lastName: "Nom",
        gender: "Sexe",
        male: "Homme",
        female: "Femme",
        birthDate: "Date de Naissance",
        deathDate: "Date de Décès",
        biography: "Biographie",
        photo: "Photo",
        
        // Relationships
        relationship: "Relation",
        selectRelationship: "Sélectionner la relation",
        relatedTo: "Lié à",
        parent: "Parent",
        child: "Enfant",
        spouse: "Conjoint(e)",
        sibling: "Frère/Sœur",
        
        // Members view
        familyMembers: "Membres de la Famille",
        memberCount: "{count} membres",
        
        // Stories
        familyStories: "Histoires Familiales",
        addStory: "Ajouter Histoire",
        storyTitle: "Titre",
        storyContent: "Histoire",
        storyDate: "Date",
        
        // Messages
        welcomeBack: "Bon retour",
        noMembersYet: "Aucun membre de famille ajouté.",
        startBuilding: "Commencez à construire votre arbre en ajoutant votre premier membre.",
        confirmDelete: "Êtes-vous sûr de vouloir supprimer {name}?",
        savedSuccessfully: "Enregistré avec succès!",
        errorSaving: "Erreur lors de l'enregistrement. Veuillez réessayer.",
        update: "Mettre à jour",
        editFamilyMember: "Modifier Membre de la Famille",
        selectPerson: "Sélectionner une personne",
        updatedSuccessfully: "Mis à jour avec succès!",
    },
    
    ht: {
        // Navigation
        navTree: "Pyebwa Fanmi",
        navMembers: "Manm yo",
        navStories: "Istwa",
        
        // User menu
        profile: "Pwofil",
        settings: "Paramèt",
        logout: "Dekonekte",
        
        // Common
        loading: "Chajman...",
        search: "Chèche...",
        save: "Anrejistre",
        cancel: "Anile",
        delete: "Efase",
        edit: "Modifye",
        view: "Gade",
        
        // Family tree
        familyTree: "Pyebwa Fanmi Mwen",
        addMember: "Ajoute Manm",
        addFamilyMember: "Ajoute Manm Fanmi",
        
        // Member fields
        firstName: "Non",
        lastName: "Siyati",
        gender: "Sèks",
        male: "Gason",
        female: "Fi",
        birthDate: "Dat nesans",
        deathDate: "Dat lanmò",
        biography: "Biyografi",
        photo: "Foto",
        
        // Relationships
        relationship: "Relasyon",
        selectRelationship: "Chwazi relasyon",
        relatedTo: "An relasyon ak",
        parent: "Paran",
        child: "Pitit",
        spouse: "Mari/Madanm",
        sibling: "Frè/Sè",
        
        // Members view
        familyMembers: "Manm Fanmi yo",
        memberCount: "{count} manm",
        
        // Stories
        familyStories: "Istwa Fanmi",
        addStory: "Ajoute Istwa",
        storyTitle: "Tit",
        storyContent: "Istwa",
        storyDate: "Dat",
        
        // Messages
        welcomeBack: "Byenveni ankò",
        noMembersYet: "Poko gen manm fanmi ki ajoute.",
        startBuilding: "Kòmanse bati pyebwa w nan ajoute premye manm lan.",
        confirmDelete: "Ou sèten ou vle efase {name}?",
        savedSuccessfully: "Anrejistre avèk siksè!",
        errorSaving: "Erè pandan anrejistreman. Tanpri eseye ankò.",
        update: "Mete ajou",
        editFamilyMember: "Modifye Manm Fanmi",
        selectPerson: "Chwazi yon moun",
        updatedSuccessfully: "Mete ajou avèk siksè!",
    }
};

// Current language (default to Haitian Creole)
let currentLanguage = localStorage.getItem('pyebwaLang') || 'ht';

// Translation function
window.t = function(key, params = {}) {
    let text = translations[currentLanguage][key] || translations['en'][key] || key;
    
    // Replace parameters like {count} with actual values
    Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
    });
    
    return text;
}

// Update all elements with data-i18n attribute
window.updateTranslations = function() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = t(key);
    });
    
    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = t(key);
    });
}

// Change language
window.setLanguage = function(lang) {
    currentLanguage = lang;
    localStorage.setItem('pyebwaLang', lang);
    updateTranslations();
    
    // Update active language button
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
}