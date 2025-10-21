# BRO Token Webapp Turbo - Makefile

.PHONY: dev build install clean-port clean

# Kill port 5180, clear cache and start dev server
dev: clean-port clean
	npm run dev

# Kill any process using port 5180
clean-port:
	@lsof -ti:5180 | xargs kill -9 2>/dev/null || true

# Clear Vite cache
clean:
	@rm -rf node_modules/.vite

# Build for production
build:
	npm run build

# Install dependencies
install:
	npm install
