.PHONY: all build push test

VER := $(shell git fetch --tags && git describe --tag | sed 's/-[^-]*$$//' | tr - . )
IMAGE := talebook/talebook:$(VER)
REPO1 := talebook/talebook:latest
REPO2 := talebook/calibre-webserver:latest

all: build

build:
	docker build --no-cache=false --build-arg GIT_VERSION=$(VER) -t $(IMAGE) .

push:
	docker tag $(IMAGE) $(REPO1)
	docker tag $(IMAGE) $(REPO2)
	docker push $(IMAGE)
	docker push $(REPO1)
	docker push $(REPO2)

docker-test:
	docker build -t talebook/test --target test .
	docker run --rm --name talebook-docker-test talebook/test

lint:
	flake8 webserver --count --select=E9,F63,F7,F82 --show-source --statistics
	flake8 webserver --count --exit-zero --statistics --config .style.yapf

test: lint
	pytest tests

testv:
	coverage run -m unittest discover tests
	coverage report --include "*talebook*"

testvv: testv
	coverage html -d ".htmlcov" --include "*talebook*"
	cd ".htmlcov" && python3 -m http.server 7777

