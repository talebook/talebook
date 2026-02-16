.PHONY: all build push test

VER := $(shell git branch --show-current)
IMAGE := talebook/talebook:$(VER)
REPO1 := talebook/talebook:latest
REPO2 := talebook/calibre-webserver:latest
TAG1 := talebook/talebook:server-side-render
TAG2 := talebook/talebook:server-side-render-$(VER)

all: build up

init:
	python3 -m pip install --upgrade pip
	pip3 install -r requirements.txt
	#uv sync

build: test
	docker build --no-cache=false --build-arg BUILD_COUNTRY=CN --build-arg GIT_VERSION=$(VER) \
		-f Dockerfile -t $(IMAGE) -t $(REPO1) --target production -t $(REPO2) .
	docker build --no-cache=false --build-arg BUILD_COUNTRY=CN --build-arg GIT_VERSION=$(VER) \
		-f Dockerfile -t $(TAG1) -t $(TAG2) --target production-ssr .

push:
	docker push $(IMAGE)
	docker push $(REPO1)
	docker push $(REPO2)

test:
	rm -f unittest.log
	docker build --build-arg BUILD_COUNTRY=CN -t talebook/test --target test -f Dockerfile .
	docker run --rm --name=talebook-docker-test -v "$$PWD":"$$PWD" -w "$$PWD" talebook/test pytest --log-file=unittest.log --log-level=INFO tests

lint-ui:
	npm ci
	cd app && npm run lint

lint-py:
	-ruff check webserver --select=E9,F63,F7,F82 --output-format=full --statistics
	-ruff check webserver --statistics

check-i18n:
	uv run check_i18n_translation_missing.py
	uv run check_i18n_translation_useless.py

pytest:
	pytest tests -v --cov=webserver --cov-report=term-missing

testv:
	coverage run -m unittest
	coverage report --include "*talebook*"

testvv: testv
	coverage html -d ".htmlcov" --include "*talebook*"
	cd ".htmlcov" && python3 -m http.server 7777

up:
	docker compose up

down:
	docker compose stop

dev: build
	docker-compose -f dev.yml up

dev-ui:
	cd app && npm run dev