# Contributing

Contributions are always welcome, no matter how large or small!

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

## Development workflow

This project is a monorepo managed using [Bun workspaces](https://bun.sh/docs/install/workspaces). It contains the following packages:

- The library package in the root directory.
- An example app in the `example/` directory.

To get started, install Bun 1.3.1 and the version of [Node.js](https://nodejs.org/) specified in [`.nvmrc`](./.nvmrc).

Run `bun install` in the root directory to install the required dependencies for each package:

```sh
bun install
```

The [example app](/example/) demonstrates usage of the library. You need to run it to test any changes you make.

It is configured to use the local version of the library, so any changes you make to the library's source code will be reflected in the example app. Changes to the library's JavaScript code will be reflected in the example app without a rebuild, but native code changes will require a rebuild of the example app.

You can use various commands from the root directory to work with the project.

To start the packager:

```sh
bun example start
```

To run the example app on Android:

```sh
bun example android
```

To run the example app on iOS:

```sh
bun example ios
```

To confirm that the app is running with the new architecture, you can check the Metro logs for a message like this:

```sh
Running "GraphExample" with {"fabric":true,"initialProps":{"concurrentRoot":true},"rootTag":1}
```

Note the `"fabric":true` and `"concurrentRoot":true` properties.

To run the example app on Web:

```sh
bun example web
```

Make sure your code passes TypeScript:

```sh
bun typecheck
```

To check for linting errors, run the following:

```sh
bun lint
```

To fix formatting errors, run the following:

```sh
bun lint --fix
```

Remember to add tests for your change if possible. Run the unit tests by:

```sh
bun run test
```



### Publishing to npm

We use [release-it](https://github.com/release-it/release-it) to make it easier to publish new versions. It handles common tasks like bumping version based on semver, creating tags and releases etc.

To publish new versions, run the following:

```sh
bun release
```


### Scripts

The `package.json` file contains various scripts for common tasks:

- `bun install`: set up the project by installing dependencies.
- `bun typecheck`: type-check files with TypeScript.
- `bun lint`: lint files with [ESLint](https://eslint.org/).
- `bun run test`: run unit tests with [Jest](https://jestjs.io/).
- `bun example start`: start the Metro server for the example app.
- `bun example android`: run the example app on Android.
- `bun example ios`: run the example app on iOS.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.
