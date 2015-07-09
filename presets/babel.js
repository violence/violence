preset('babel', function () {
    eslint({
        parser: 'babel-eslint',
        plugins: [
            'babel'
        ],
        rules: {
            strict: 0
        }
    });
});
