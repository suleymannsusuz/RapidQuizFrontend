import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist/**', 'node_modules/**', '.venv/**', 'src/api/schema.d.ts']),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    rules: {
      // Sayfa adları tek sözcük olabilir (Home, Quiz, ...)
      'vue/multi-word-component-names': 'off',
      // v-html güvenlik kuralı: oyuncu adı gibi içerik asla HTML olarak basılmaz.
      'vue/no-v-html': 'error',
    },
  },
  prettier,
])
