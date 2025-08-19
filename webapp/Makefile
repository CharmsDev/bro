.PHONY: dev clean

dev: clean
	npm run dev

clean:
	@echo "🧹 Killing any process on port 5179..."
	@lsof -ti:5179 | xargs kill -9 2>/dev/null || true
	@echo "✅ Port 5179 cleared"
