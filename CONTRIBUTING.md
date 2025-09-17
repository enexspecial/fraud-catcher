# Contributing to FraudCatcher

Thank you for your interest in contributing to FraudCatcher! This document provides guidelines and information for contributors.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/enexspecial/fraud-catcher.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Install dependencies for both packages:
   ```bash
   # Node.js package
   cd packages/node
   npm install
   
   # Python package
   cd ../python
   pip install -e .[dev]
   ```

## Development Setup

### Node.js Package
```bash
cd packages/node
npm install
npm run build
npm test
```

### Python Package
```bash
cd packages/python
pip install -e .[dev]
python -m pytest
```

## Code Style

### TypeScript/JavaScript
- Use ESLint configuration provided
- Follow TypeScript best practices
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Use `_` prefix for unused parameters
- Prefer `const` over `let`, avoid `var`
- Use async/await over Promises
- Export types and interfaces explicitly

### Python
- Follow PEP 8 style guide
- Use Black for code formatting
- Use type hints for all functions
- Add docstrings for all public methods
- Use `_` prefix for unused parameters
- Prefer f-strings over .format()
- Use dataclasses for data structures
- Follow async/await patterns consistently

## Code Quality Standards

### TypeScript/JavaScript
```typescript
// ✅ Good
export interface UserConfig {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

export class UserService {
  private readonly config: UserConfig;
  
  constructor(config: UserConfig) {
    this.config = config;
  }
  
  /**
   * Creates a new user with the given configuration
   * @param userData - User data to create
   * @returns Promise resolving to created user
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    // Implementation
  }
}

// ❌ Bad
export class userService {
  config;
  
  constructor(config) {
    this.config = config;
  }
  
  createUser(userData) {
    // Implementation
  }
}
```

### Python
```python
# ✅ Good
from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class UserConfig:
    id: str
    name: str
    email: str

class UserService:
    def __init__(self, config: UserConfig) -> None:
        self.config = config
    
    async def create_user(self, user_data: CreateUserRequest) -> User:
        """
        Creates a new user with the given configuration.
        
        Args:
            user_data: User data to create
            
        Returns:
            Created user instance
        """
        # Implementation

# ❌ Bad
class userService:
    def __init__(self, config):
        self.config = config
    
    def create_user(self, user_data):
        # Implementation
```

## Testing

### Node.js
```bash
npm test
npm run test:watch
```

### Python
```bash
pytest
pytest --cov=fraud_catcher
```

## Submitting Changes

1. Ensure all tests pass
2. Run linting tools
3. Update documentation if needed
4. Commit your changes with descriptive messages
5. Push to your fork
6. Create a Pull Request

## Pull Request Guidelines

- Provide a clear description of changes
- Reference any related issues
- Ensure CI/CD checks pass
- Request review from maintainers

## Reporting Issues

When reporting issues, please include:
- Package version (Node.js or Python)
- Steps to reproduce
- Expected vs actual behavior
- Environment details

## Feature Requests

We welcome feature requests! Please:
- Check existing issues first
- Provide detailed use cases
- Consider implementation complexity
- Discuss with maintainers before major changes

## Code of Conduct

Please be respectful and constructive in all interactions. We follow the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
