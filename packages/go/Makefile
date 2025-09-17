# Makefile for fraud-catcher Go package

.PHONY: all build test clean run-example install deps lint format vet

# Default target
all: deps test build

# Install dependencies
deps:
	go mod tidy
	go mod download

# Build the package
build:
	go build -v ./...

# Run tests
test:
	go test -v ./...

# Run tests with coverage
test-coverage:
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

# Run benchmarks
bench:
	go test -bench=. -benchmem ./...

# Run the example
run-example:
	go run example/main.go

# Install the package
install:
	go install ./...

# Clean build artifacts
clean:
	go clean
	rm -f coverage.out coverage.html

# Lint the code
lint:
	golangci-lint run

# Format the code
format:
	go fmt ./...

# Vet the code
vet:
	go vet ./...

# Run all checks
check: format vet test lint

# Build for different platforms
build-linux:
	GOOS=linux GOARCH=amd64 go build -o bin/fraud-catcher-linux-amd64 ./example/

build-windows:
	GOOS=windows GOARCH=amd64 go build -o bin/fraud-catcher-windows-amd64.exe ./example/

build-darwin:
	GOOS=darwin GOARCH=amd64 go build -o bin/fraud-catcher-darwin-amd64 ./example/

build-all: build-linux build-windows build-darwin

# Generate documentation
docs:
	godoc -http=:6060

# Run race detector
race:
	go test -race ./...

# Run with memory profiling
memprofile:
	go test -memprofile=mem.prof ./...
	go tool pprof mem.prof

# Run with CPU profiling
cpuprofile:
	go test -cpuprofile=cpu.prof ./...
	go tool pprof cpu.prof

# Help
help:
	@echo "Available targets:"
	@echo "  all          - Run deps, test, and build"
	@echo "  deps         - Install dependencies"
	@echo "  build        - Build the package"
	@echo "  test         - Run tests"
	@echo "  test-coverage- Run tests with coverage"
	@echo "  bench        - Run benchmarks"
	@echo "  run-example  - Run the example program"
	@echo "  install      - Install the package"
	@echo "  clean        - Clean build artifacts"
	@echo "  lint         - Run linter"
	@echo "  format       - Format code"
	@echo "  vet          - Run go vet"
	@echo "  check        - Run all checks"
	@echo "  build-all    - Build for all platforms"
	@echo "  docs         - Generate documentation"
	@echo "  race         - Run race detector"
	@echo "  memprofile   - Run with memory profiling"
	@echo "  cpuprofile   - Run with CPU profiling"
	@echo "  help         - Show this help"
