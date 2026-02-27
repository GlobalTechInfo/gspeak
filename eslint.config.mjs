import tseslint from 'typescript-eslint'

export default tseslint.config(
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts', 'bin/**/*.ts'],
        languageOptions: {
            parserOptions: {
                project: true
            }
        }
    },
    {
        ignores: ['dist/**']
    }
)