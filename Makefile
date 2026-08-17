.PHONY: all build test check-design

VER = $(shell git branch --show-current | tr '/' '-')
IMAGE = talebook/talebook:$(VER)
REPO1 := talebook/talebook:latest
REPO2 := talebook/calibre-webserver:latest
TAG1 := talebook/talebook:server-side-render
TAG2 = talebook/talebook:server-side-render-$(VER)

all: lint-py-fix build up

init:
	pip3 install -r requirements.txt -r requirements-test.txt
	#python3 -m pip install --upgrade pip
	#uv sync

build: test build-spa build-ssr

build-spa:
	docker build --no-cache=false --build-arg BUILD_COUNTRY=CN --build-arg GIT_VERSION=$(VER) \
		-f Dockerfile -t $(IMAGE) -t $(REPO1) --target production -t $(REPO2) .

build-ssr:
	docker build --no-cache=false --build-arg BUILD_COUNTRY=CN --build-arg GIT_VERSION=$(VER) \
		-f Dockerfile -t $(TAG1) -t $(TAG2) --target production-ssr .

build-dev:
	docker build --no-cache=false --build-arg BUILD_COUNTRY=CN \
		-f Dockerfile -t talebook/talebook:dev --target dev .

test:
	rm -f unittest.log
	docker build --build-arg BUILD_COUNTRY=CN -t talebook/test --target test -f Dockerfile .
	docker run --rm --name=talebook-docker-test -v "$$PWD":"$$PWD" -w "$$PWD" talebook/test pytest --log-file=unittest.log --log-level=INFO tests

lint-ui:
	npm ci
	cd app && npm run lint

lint-py:
	ruff check ./webserver --no-cache
	ruff format --diff ./webserver --output-format concise --no-cache

lint-py-fix:
	ruff check ./webserver --fix
	ruff format ./webserver

check-i18n:
	uv run check_i18n_translation_missing.py
	uv run check_i18n_translation_useless.py

check-design:
	python3 scripts/check_design_docs.py

pytest:
	pytest tests -v --cov=webserver --cov-report=term-missing

testv:
	coverage run -m unittest
	coverage report --include "webserver/*"

testvv: testv
	coverage html -d ".htmlcov" --include "webserver/*"
	cd ".htmlcov" && python3 -m http.server 7777

up:
	docker compose up

down:
	docker compose stop

dev: build-dev
	docker-compose -f docker-compose.dev.yml up

dev/ui:
	cd app && npm run dev
