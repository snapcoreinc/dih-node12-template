.DEFAULT_GOAL := build

build: clean
	@echo "Building...";
	{ npm i --no-package-lock && tsc && docker build .; }
clean:
	rm -rf node_modules package-lock.json
