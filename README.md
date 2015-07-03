# violence

A painful tool to make developer's life harder.

## What is it?

With `violence` you have to make a set of code style and linting config files to check your code base as a package and use it in every project you want to check.

Used packages inside: [`eslint`][], [`jscs`][], [`git-hooks`][].

## How it works?

On installation it makes (or updates) current hooks and configuration files, creates git hook for checking files and commit messages on precommit (with git-hooks), etc.

## Usage

### TL;DR

Run in your project root to quick start:
```sh
npm i violence violence-default --save-dev
```

### Installation

Install `violence` package via `npm`:
```
npm install violence --save-dev
```

### Configuration

<!-- Make a config file `/.violencerc`. -->

### Profit

Enjoy your pain!

## Contribution

1. [File an issue](https://github.com/theprotein/violence/issues/new) with properly described suggestion or problem;
2. Decide which presets or rules your issue affects;
3. Create a feature-branch with an issue number (`issues/<issue_number>`). E.g. for an issue 42 it will looks like `issues/42`;
4. Commit changes with a proper message in [Angular Commit Message Format](https://github.com/angular/angular.js/blob/master/CONTRIBUTING.md#commit-message-format), e.g.:
  ```
  <type>(<scope>): <subject>
  <BLANK LINE>
  <body>
  <BLANK LINE>
  <footer>
  ```
5. Push and make a pull-request from your feature-branch.
6. Link your pull request with an issue number any way you like (if you forget to do it in commit message). A comment will work perfectly.
7. Wait for your pull request and the issue to be closed :smirk_cat:.

## License

Code and documentation copyright 2015 The Protein Corp. Code released under [The MIT License](LICENSE).

[`jscs`]: http://jscs.info/
[`eslint`]: http://eslint.org/
[`git-hooks`]: https://github.com/tarmolov/git-hooks-js
