# Installation Guide

## Table of Contents

- [Prerequisites](#prerequisites)
- [Node.js Installation](#nodejs-installation)
- [Python Installation](#python-installation)
- [Development Setup](#development-setup)
- [Docker Installation](#docker-installation)
- [Troubleshooting](#troubleshooting)
- [Verification](#verification)

## Prerequisites

### System Requirements

- **Node.js**: Version 14.0.0 or higher
- **Python**: Version 3.8 or higher
- **Memory**: Minimum 512MB RAM
- **Storage**: 100MB free space

### Supported Platforms

- **Operating Systems**: Windows, macOS, Linux
- **Node.js**: 14.x, 16.x, 18.x, 20.x
- **Python**: 3.8, 3.9, 3.10, 3.11, 3.12

## Node.js Installation

### Method 1: npm (Recommended)

```bash
# Install the package
npm install fraud-catcher

# Or install globally
npm install -g fraud-catcher
```

### Method 2: Yarn

```bash
# Install the package
yarn add fraud-catcher

# Or install globally
yarn global add fraud-catcher
```

### Method 3: pnpm

```bash
# Install the package
pnpm add fraud-catcher

# Or install globally
pnpm add -g fraud-catcher
```

### Method 4: From Source

```bash
# Clone the repository
git clone https://github.com/enexspecial/fraud-catcher.git
cd fraud-catcher

# Install dependencies
cd packages/node
npm install

# Build the package
npm run build

# Install locally
npm link
```

### TypeScript Support

If you're using TypeScript, install the types:

```bash
npm install --save-dev @types/node
```

## Python Installation

### Method 1: pip (Recommended)

```bash
# Install the package
pip install fraud-catcher

# Or install with specific version
pip install fraud-catcher==1.0.0
```

### Method 2: pip with virtual environment

```bash
# Create virtual environment
python -m venv fraud-catcher-env

# Activate virtual environment
# On Windows:
fraud-catcher-env\Scripts\activate
# On macOS/Linux:
source fraud-catcher-env/bin/activate

# Install the package
pip install fraud-catcher
```

### Method 3: conda

```bash
# Install via conda-forge (if available)
conda install -c conda-forge fraud-catcher

# Or create environment first
conda create -n fraud-catcher python=3.9
conda activate fraud-catcher
pip install fraud-catcher
```

### Method 4: From Source

```bash
# Clone the repository
git clone https://github.com/enexspecial/fraud-catcher.git
cd fraud-catcher

# Install in development mode
cd packages/python
pip install -e .

# Or install with development dependencies
pip install -e .[dev]
```

### Python Dependencies

The package automatically installs required dependencies:

- `numpy>=1.21.0` - Numerical computing
- `scikit-learn>=1.0.0` - Machine learning
- `pandas>=1.3.0` - Data manipulation
- `requests>=2.25.0` - HTTP requests
- `python-dateutil>=2.8.0` - Date utilities

## Development Setup

### Prerequisites for Development

- **Node.js**: 16.x or higher
- **Python**: 3.8 or higher
- **Git**: Latest version
- **Docker**: Optional, for containerized development

### Full Development Environment

```bash
# Clone the repository
git clone https://github.com/enexspecial/fraud-catcher.git
cd fraud-catcher

# Install Node.js dependencies
cd packages/node
npm install

# Install Python dependencies
cd ../python
pip install -e .[dev]

# Install development tools
npm install -g typescript jest
pip install pytest black isort flake8 mypy

# Build both packages
cd ../../
npm run build:all
```

### Development Scripts

#### Node.js Development

```bash
cd packages/node

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Build TypeScript
npm run build

# Clean build artifacts
npm run clean
```

#### Python Development

```bash
cd packages/python

# Run tests
pytest

# Run tests with coverage
pytest --cov=fraud_catcher

# Format code
black src/
isort src/

# Lint code
flake8 src/
mypy src/
```

## Docker Installation

### Using Docker Compose

```bash
# Clone the repository
git clone https://github.com/enexspecial/fraud-catcher.git
cd fraud-catcher

# Build and run with Docker Compose
docker-compose up --build
```

### Using Docker directly

```bash
# Build Node.js image
docker build -f packages/node/Dockerfile -t fraud-catcher-node .

# Build Python image
docker build -f packages/python/Dockerfile -t fraud-catcher-python .

# Run Node.js container
docker run -it fraud-catcher-node

# Run Python container
docker run -it fraud-catcher-python
```

### Dockerfile Examples

#### Node.js Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY packages/node/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY packages/node/dist ./dist
COPY packages/node/README.md ./
COPY packages/node/LICENSE ./

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/index.js"]
```

#### Python Dockerfile

```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY packages/python/requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY packages/python/src/fraud_catcher ./fraud_catcher
COPY packages/python/README.md ./
COPY packages/python/LICENSE ./

# Set Python path
ENV PYTHONPATH=/app

# Start application
CMD ["python", "-m", "fraud_catcher"]
```

## Troubleshooting

### Common Issues

#### Node.js Issues

**Issue**: `Module not found` errors
```bash
# Solution: Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Issue**: TypeScript compilation errors
```bash
# Solution: Check TypeScript version and configuration
npx tsc --version
npm install typescript@latest
```

**Issue**: Permission errors on macOS/Linux
```bash
# Solution: Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

#### Python Issues

**Issue**: `pip` not found
```bash
# Solution: Install pip
python -m ensurepip --upgrade
# Or on Ubuntu/Debian:
sudo apt-get install python3-pip
```

**Issue**: `Permission denied` errors
```bash
# Solution: Use user installation
pip install --user fraud-catcher
# Or use virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install fraud-catcher
```

**Issue**: `Microsoft Visual C++ 14.0 is required` (Windows)
```bash
# Solution: Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
# Or install pre-compiled wheels
pip install --only-binary=all fraud-catcher
```

**Issue**: `No module named 'fraud_catcher'`
```bash
# Solution: Check Python path and installation
python -c "import sys; print(sys.path)"
pip show fraud-catcher
```

### Platform-Specific Issues

#### Windows

**Issue**: Long path names
```bash
# Solution: Enable long path support
# Run as Administrator:
git config --system core.longpaths true
```

**Issue**: PowerShell execution policy
```powershell
# Solution: Set execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### macOS

**Issue**: Xcode command line tools missing
```bash
# Solution: Install Xcode command line tools
xcode-select --install
```

**Issue**: Homebrew conflicts
```bash
# Solution: Use system Python or create isolated environment
python3 -m venv fraud-catcher-env
source fraud-catcher-env/bin/activate
pip install fraud-catcher
```

#### Linux

**Issue**: Missing system dependencies
```bash
# Ubuntu/Debian:
sudo apt-get update
sudo apt-get install python3-dev python3-pip build-essential

# CentOS/RHEL:
sudo yum install python3-devel python3-pip gcc gcc-c++

# Fedora:
sudo dnf install python3-devel python3-pip gcc gcc-c++
```

## Verification

### Node.js Verification

```javascript
// test-installation.js
const { FraudDetector } = require('fraud-catcher');

console.log('Testing FraudCatcher installation...');

try {
  const detector = new FraudDetector({
    rules: ['velocity', 'amount'],
    thresholds: { velocity: 0.8, amount: 0.9 },
    globalThreshold: 0.7
  });

  console.log('✅ FraudDetector created successfully');

  const result = await detector.analyze({
    id: 'test_001',
    userId: 'test_user',
    amount: 100,
    currency: 'USD',
    timestamp: new Date()
  });

  console.log('✅ Transaction analysis successful');
  console.log('Risk score:', result.riskScore);
  console.log('Installation verified! 🎉');

} catch (error) {
  console.error('❌ Installation verification failed:', error.message);
  process.exit(1);
}
```

Run the test:
```bash
node test-installation.js
```

### Python Verification

```python
# test_installation.py
from fraud_catcher import FraudDetector, Transaction
from datetime import datetime

print('Testing FraudCatcher installation...')

try:
    detector = FraudDetector({
        'rules': ['velocity', 'amount'],
        'thresholds': {'velocity': 0.8, 'amount': 0.9},
        'global_threshold': 0.7
    })

    print('✅ FraudDetector created successfully')

    transaction = Transaction(
        id='test_001',
        user_id='test_user',
        amount=100.0,
        currency='USD',
        timestamp=datetime.now()
    )

    result = await detector.analyze(transaction)

    print('✅ Transaction analysis successful')
    print(f'Risk score: {result.risk_score}')
    print('Installation verified! 🎉')

except Exception as error:
    print(f'❌ Installation verification failed: {error}')
    exit(1)
```

Run the test:
```bash
python test_installation.py
```

### Quick Test Script

Create a simple test to verify both installations:

```bash
#!/bin/bash
# test-both.sh

echo "Testing Node.js installation..."
node -e "
const { FraudDetector } = require('fraud-catcher');
const detector = new FraudDetector({
  rules: ['velocity'],
  thresholds: { velocity: 0.8 },
  globalThreshold: 0.7
});
console.log('Node.js: ✅ OK');
" || echo "Node.js: ❌ FAILED"

echo "Testing Python installation..."
python3 -c "
from fraud_catcher import FraudDetector
detector = FraudDetector({
    'rules': ['velocity'],
    'thresholds': {'velocity': 0.8},
    'global_threshold': 0.7
})
print('Python: ✅ OK')
" || echo "Python: ❌ FAILED"

echo "Installation test complete!"
```

## Next Steps

After successful installation:

1. **Read the [API Documentation](API.md)** for detailed usage
2. **Check out [Examples](examples/)** for practical usage patterns
3. **Review [Architecture](ARCHITECTURE.md)** for advanced configuration
4. **Join [Discussions](https://github.com/enexspecial/fraud-catcher/discussions)** for community support

## Support

If you encounter issues during installation:

1. **Check the [Troubleshooting](#troubleshooting) section**
2. **Search [GitHub Issues](https://github.com/enexspecial/fraud-catcher/issues)**
3. **Create a new issue** with detailed error information
4. **Join [GitHub Discussions](https://github.com/enexspecial/fraud-catcher/discussions)** for help
