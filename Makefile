.PHONY: test

# npm list --all - show dependency tree
app0-install-deps:
	@npm install

app0-update-deps:
	@npm update; npm install; npm outdated; npm find-dupes

app1-lint:
	@npm run lint

app1-lint-fix:
	@npm run lint:fix

app2-test:
	@npm run test

# does not run integration tests, bcz they are slow and do not contribute to coverage
app2-test-coverage:
	@npm run test-coverage

app3-build:
	@npm run build

git-fetch-tags:
	@git fetch --tags --force

# ---------------------------------------------------

x-install-git-hooks:
	@cp .github/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
