const crypto = require('crypto');

/**
 * Password Generator Service
 * Generates secure 16-character alphanumeric passwords
 */
class PasswordGenerator {
    constructor() {
        // Character sets for password generation
        // Excluding ambiguous characters: 0, O, l, 1
        this.uppercase = 'ABCDEFGHJKMNPQRSTUVWXYZ';
        this.lowercase = 'abcdefghijkmnopqrstuvwxyz';
        this.numbers = '23456789';
        this.allChars = this.uppercase + this.lowercase + this.numbers;
    }

    /**
     * Generate a secure 16-character alphanumeric password
     * @returns {string} Generated password
     */
    generatePassword() {
        const passwordLength = 16;
        let password = '';

        // Ensure at least one character from each set
        password += this.getRandomChar(this.uppercase);
        password += this.getRandomChar(this.lowercase);
        password += this.getRandomChar(this.numbers);

        // Fill the rest with random characters from all sets
        for (let i = 3; i < passwordLength; i++) {
            password += this.getRandomChar(this.allChars);
        }

        // Shuffle the password to avoid predictable patterns
        return this.shuffleString(password);
    }

    /**
     * Get a random character from a given character set
     * @param {string} charSet - Character set to choose from
     * @returns {string} Random character
     */
    getRandomChar(charSet) {
        const randomIndex = crypto.randomInt(0, charSet.length);
        return charSet[randomIndex];
    }

    /**
     * Shuffle a string using Fisher-Yates algorithm
     * @param {string} str - String to shuffle
     * @returns {string} Shuffled string
     */
    shuffleString(str) {
        const arr = str.split('');
        for (let i = arr.length - 1; i > 0; i--) {
            const j = crypto.randomInt(0, i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr.join('');
    }

    /**
     * Validate password meets requirements
     * @param {string} password - Password to validate
     * @returns {boolean} True if valid
     */
    validatePassword(password) {
        if (password.length !== 16) return false;
        
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasOnlyAlphanumeric = /^[A-Za-z0-9]+$/.test(password);
        
        return hasUppercase && hasLowercase && hasNumber && hasOnlyAlphanumeric;
    }

    /**
     * Generate multiple unique passwords
     * @param {number} count - Number of passwords to generate
     * @returns {string[]} Array of unique passwords
     */
    generateMultiplePasswords(count) {
        const passwords = new Set();
        while (passwords.size < count) {
            passwords.add(this.generatePassword());
        }
        return Array.from(passwords);
    }
}

// Export singleton instance
module.exports = new PasswordGenerator();