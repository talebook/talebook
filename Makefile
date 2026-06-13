.PHONY: all build push test build-base push-base build-slim smoke-convert

VER := $(shell git branch --show-current | tr '/' '-')
IMAGE := talebook/talebook:$(VER)
REPO1 := talebook/talebook:latest
REPO2 := talebook/calibre-webserver:latest
TAG1 := talebook/talebook:server-side-render
TAG2 := talebook/talebook:server-side-render-$(VER)
BASE := talebook/talebook-base

all: lint-py-fix build up

init:
	pip3 install -r requirements.txt
	#python3 -m pip install --upgrade pip
	#uv sync

build: test build-spa build-ssr

# 基础镜像：本地构建/发布。主 Dockerfile 默认 FROM talebook/talebook-base:8.6，
# 基础镜像有变更时需先执行 make build-base push-base 引导出对应版本标签。
BASE_VER := 8.6
build-base:
	docker build -f Dockerfile.base --build-arg BUILD_COUNTRY=CN -t $(BASE):latest -t $(BASE):$(BASE_VER) .

push-base:
	docker push $(BASE):latest
	docker push $(BASE):$(BASE_VER)

build-spa:
	docker build --no-cache=false --build-arg BUILD_COUNTRY=CN --build-arg GIT_VERSION=$(VER) \
		-f Dockerfile -t $(IMAGE) -t $(REPO1) --target production -t $(REPO2) .

build-ssr:
	docker build --no-cache=false --build-arg BUILD_COUNTRY=CN --build-arg GIT_VERSION=$(VER) \
		-f Dockerfile -t $(TAG1) -t $(TAG2) --target production-ssr .

# slim 镜像：不支持转换输出 PDF，体积约为完整版的一半，详见 Dockerfile 的 production-slim
build-slim:
	docker build --no-cache=false --build-arg BUILD_COUNTRY=CN --build-arg GIT_VERSION=$(VER) \
		-f Dockerfile -t talebook/talebook:slim --target production-slim .

# 转换链冒烟测试：验证镜像内 ebook-convert 六条互转链（slim 必跑，防止强删清单误伤）
smoke-convert:
	docker run --rm -v "$$PWD/tools/convert_smoke.sh:/smoke.sh:ro" \
		--entrypoint sh talebook/talebook:slim /smoke.sh

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
	ruff check ./webserver --no-cache
	ruff format --diff ./webserver --output-format concise --no-cache

lint-py-fix:
	ruff check ./webserver --fix
	ruff format ./webserver

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
	docker-compose -f dev.yml up # stable server env with develop code
	npm run dev # run app dev

dev-ui:
	cd app && npm run dev
