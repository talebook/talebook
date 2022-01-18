test:
	python3 test_app.py --failfast TestOpds

testv:
	coverage run -m unittest discover .
	coverage report --include "*talebook*"

testvv: testv
	OUT=.htmlcov
	coverage html -d "$${OUT}" --include "*talebook*"
	cd "$${OUT}" && python3 -m http.server 7777

