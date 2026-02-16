
.PHONY: all test lint

all:
	NODE_OPTIONS=--openssl-legacy-provider npm run build-spa

test:
	npx playwright test

lint:
	npm run lint
