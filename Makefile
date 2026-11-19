# npm list --all - show dependency tree
deps-install:
	@npm install

deps-update:
	@npm update; npm install; npm outdated; npm find-dupes --ignore-scripts

# fix: npm run lint -- --fix
lint:
	@npm run lint

test-app:
	@npm run test

# local git repos in a temp dir, no network
test-it:
	@npm run test-integration

build:
	@npm run build
