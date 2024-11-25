.PHONY: all build push test

VER := $(shell git branch --show-current)
IMAGE := talebook/talebook:$(VER)
REPO1 := talebook/talebook:latest
REPO2 := talebook/calibre-webserver:latest
TAG1 := talebook/talebook:server-side-render
TAG2 := talebook/talebook:server-side-render-$(VER)

all: build up

build: test
	docker build --no-cache=false --build-arg BUILD_COUNTRY=CN --build-arg GIT_VERSION=$(VER) \
		-f Dockerfile -t $(IMAGE) -t $(REPO1) --target production -t $(REPO2) .
	docker build --no-cache=false --build-arg BUILD_COUNTRY=CN --build-arg GIT_VERSION=$(VER) \
		-f Dockerfile -t $(TAG1) -t $(TAG2) --target production-ssr .

push:
	docker push $(IMAGE)
	docker push $(REPO1)
	docker push $(REPO2)

test: lint
	rm -f unittest.log
	docker build --build-arg BUILD_COUNTRY=CN -t talebook/test --target test -f Dockerfile .
	docker run --rm --name=talebook-docker-test -v "$$PWD":"$$PWD" -w "$$PWD" talebook/test pytest --log-file=unittest.log --log-level=INFO tests

lint:
	flake8 webserver --count --select=E9,F63,F7,F82 --show-source --statistics
	flake8 webserver --count --statistics --config .style.yapf

pytest: lint
	pytest tests

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
