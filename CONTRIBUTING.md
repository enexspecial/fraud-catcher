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

### Python
- Follow PEP 8 style guide
- Use Black for code formatting
- Use type hints for all functions
- Add docstrings for all public methods

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
