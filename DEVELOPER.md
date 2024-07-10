# Development

This document describes how you can test, build and publish this project.

## Prerequisite

Before you can start you must install and configure the following products on your development machine:

* [Node.js][nodejs]
* [Git][git]

You will then need to clone this project and install the required dependencies:

```sh
git clone <repository_url> <dir_name>
cd <dir_name>
npm install
```

## Testing locally

You can test the library while developing it, as follow:

1. Modify one of the test files

   ```sh
   cd <library_path>/tests
   ```

2. Run the test file

   ```sh
   npm run test:cjs (or) npm run test:mjs
   ```

## Building the library

The library will be built in the `./dist` directory.

```sh
npm run build
```

## Publishing to NPM repository

This project comes with automatic continuous delivery (CD) using *GitHub Actions*.

1. Bump the library version in `./package.json`
2. Push the changes
3. Create a new [GitHub release](https://github.com/badisi/samsung-tv-remote/releases/new)
4. Watch the results in: [Actions](https://github.com/badisi/samsung-tv-remote/actions)



[git]: https://git-scm.com/
[nodejs]: https://nodejs.org/
