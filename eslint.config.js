eslint:
  root: true
  parserOptions:
    ecmaVersion: latest
    sourceType: module
    ecmaFeatures:
      jsx: true
  env:
    browser: true
    es2021: true
    node: true
  extends:
    - eslint:recommended
    - plugin:react/recommended
    - plugin:react/jsx-runtime
  overrides:
    - files:
        - .eslintrc.{js,cjs}
      parserOptions:
        sourceType: script
  rules:
    react/prop-types: off
