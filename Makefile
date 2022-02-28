.PHONY: all build push test

VER := $(shell git describe --tag | sed 's/-[^-]*$$//' | tr - . )
IMAGE := talebook/talebook:$(VER)
REPO1 := talebook/talebook:latest
REPO2 := talebook/calibre-webserver:latest

all: build

build:
	docker build --no-cache=false --build-arg BUILD_COUNTRY=CN --build-arg GIT_VERSION=$(VER) \
		-f Dockerfile -t $(IMAGE) -t $(REPO1) -t $(REPO2) .

push:
	docker push $(IMAGE)
	docker push $(REPO1)
	docker push $(REPO2)

docker-test:
	docker build --build-arg BUILD_COUNTRY=CN -t talebook/test --target test -f Dockerfile .
	docker run --rm --name talebook-docker-test talebook/test

lint:
	flake8 webserver --count --select=E9,F63,F7,F82 --show-source --statistics
	flake8 webserver --count --exit-zero --statistics --config .style.yapf

test: lint
	pytest tests

testv:
	coverage run -m unittest
	coverage report --include "*talebook*"

testvv: testv
	coverage html -d ".htmlcov" --include "*talebook*"
	cd ".htmlcov" && python3 -m http.server 7777

