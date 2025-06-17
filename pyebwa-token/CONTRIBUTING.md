# Contributing to PYEBWA Token

Thank you for your interest in contributing to PYEBWA Token! This project aims to connect Haitian diaspora heritage preservation with environmental restoration in Haiti. Every contribution helps us plant more trees and create more jobs.

## 🤝 Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## 🚀 Getting Started

1. **Fork the repository** and clone your fork
2. **Set up your development environment** following the README
3. **Create a branch** for your feature or fix
4. **Make your changes** with clear commits
5. **Test thoroughly** and update documentation
6. **Submit a pull request** with a detailed description

## 📋 Ways to Contribute

### 🐛 Bug Reports

Found a bug? Help us fix it by:
1. Checking if it's already reported in [Issues](https://github.com/pyebwa/pyebwa-token/issues)
2. Creating a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details

### 💡 Feature Requests

Have an idea? We'd love to hear it!
1. Check existing [feature requests](https://github.com/pyebwa/pyebwa-token/issues?q=is%3Aissue+label%3Aenhancement)
2. Open a new issue describing:
   - The problem it solves
   - Proposed solution
   - Alternative approaches
   - Mockups or examples

### 💻 Code Contributions

#### Smart Contracts (Rust/Anchor)
```bash
cd programs/pyebwa-token
anchor build
anchor test
```

**Guidelines:**
- Follow Rust idioms and Anchor best practices
- Add comprehensive tests for new instructions
- Document all public functions
- Check for arithmetic overflows
- Validate all inputs

#### Frontend (React/TypeScript)
```bash
cd web
npm run dev
npm run test
npm run lint
```

**Guidelines:**
- Use TypeScript strictly (no `any` types)
- Follow React hooks best practices
- Ensure responsive design
- Add i18n support for new text
- Write unit tests for components

#### Mobile App (React Native)
```bash
cd mobile
npm run start
npm run test
```

**Guidelines:**
- Test on both iOS and Android
- Handle offline scenarios
- Optimize for low-end devices
- Follow platform-specific guidelines
- Consider battery usage

#### Backend (Node.js)
```bash
cd backend
npm run dev
npm run test
npm run lint
```

**Guidelines:**
- Use async/await for all async operations
- Add proper error handling
- Validate all inputs
- Add rate limiting where appropriate
- Document API endpoints

### 🌍 Translations

Help us reach more people by translating to:
- Haitian Creole (Kreyòl)
- French
- Spanish
- Portuguese

Translation files are in `/web/src/locales/` and `/mobile/src/locales/`.

### 📚 Documentation

Good documentation is crucial! You can help by:
- Improving README files
- Writing tutorials
- Creating video guides
- Documenting API endpoints
- Adding code comments

### 🎨 Design

We welcome design contributions:
- UI/UX improvements
- Logo and branding
- Marketing materials
- Infographics
- Mobile app designs

## 🔄 Development Workflow

### 1. Branch Naming
```
feature/description    # New features
fix/description       # Bug fixes
docs/description      # Documentation
refactor/description  # Code refactoring
test/description      # Test additions
```

### 2. Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add token purchase with credit card
fix: resolve GPS validation in rural areas
docs: update planter onboarding guide
test: add verification service tests
refactor: optimize IPFS upload batching
```

### 3. Pull Request Process

1. **Update your fork**
   ```bash
   git remote add upstream https://github.com/pyebwa/pyebwa-token.git
   git fetch upstream
   git merge upstream/main
   ```

2. **Create focused PRs**
   - One feature/fix per PR
   - Keep changes minimal
   - Include tests
   - Update documentation

3. **PR Description Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex code
   - [ ] Documentation updated
   - [ ] No new warnings
   ```

## 🧪 Testing

### Running Tests
```bash
# All tests
npm run test:all

# Specific suites
npm run test:contracts
npm run test:web
npm run test:mobile
npm run test:backend
```

### Writing Tests
- Aim for >80% code coverage
- Test edge cases
- Mock external dependencies
- Use descriptive test names
- Group related tests

## 📏 Code Style

### General
- Use ESLint and Prettier
- Configure your editor for auto-formatting
- Follow language-specific conventions
- Keep functions small and focused
- Write self-documenting code

### TypeScript
```typescript
// Good
interface UserProfile {
  id: string;
  name: string;
  walletAddress: PublicKey;
}

// Avoid
interface UserProfile {
  id: any;
  name: any;
  walletAddress: any;
}
```

### Rust
```rust
// Good
pub fn calculate_tree_cost(amount: u64) -> Result<u64> {
    amount
        .checked_mul(TOKENS_PER_TREE)
        .ok_or(ErrorCode::MathOverflow)
}

// Avoid
pub fn calculate_tree_cost(amount: u64) -> u64 {
    amount * TOKENS_PER_TREE // Can overflow!
}
```

## 🚀 Deployment

### Smart Contracts
1. Run all tests
2. Get code review from 2+ maintainers
3. Deploy to devnet first
4. Test thoroughly on devnet
5. Deploy to mainnet with multisig

### Web/Mobile Apps
1. Create production build
2. Test on staging environment
3. Run performance tests
4. Get approval from maintainers
5. Deploy with feature flags if needed

## 🏆 Recognition

We value all contributions! Contributors will be:
- Listed in our [Contributors](CONTRIBUTORS.md) file
- Mentioned in release notes
- Eligible for PYEBWA token rewards
- Invited to contributor events

## ❓ Questions?

- Join our [Discord](https://discord.gg/pyebwa)
- Check the [FAQ](docs/FAQ.md)
- Email: dev@pyebwa.com
- Open a [Discussion](https://github.com/pyebwa/pyebwa-token/discussions)

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for helping us rebuild Haiti's forests, one contribution at a time!** 🌳🇭🇹