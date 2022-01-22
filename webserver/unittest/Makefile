test:
	python3 test_app.py --failfast

testv:
	coverage run -m unittest discover .
	coverage report --include "*talebook*"

testvv: testv
	coverage html -d ".htmlcov" --include "*talebook*"
	cd ".htmlcov" && python3 -m http.server 7777

