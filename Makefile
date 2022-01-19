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
	docker push $(REPO1)
	docker push $(REPO2)

test:
	make -C webserver/unittest/
