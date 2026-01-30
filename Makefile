.PHONY: test

# npm list --all - show dependency tree
app0-install-deps:
	@npm install

app0-update-deps:
	@npm update; npm install; npm outdated

app1-lint:
	@npm run lint

app1-lint-fix:
	@npm run lint:fix

app2-test:
	@npm run test

app3-build:
	@npm run build

git-fetch-tags:
	@git fetch --tags --force
