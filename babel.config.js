module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { browsers: 'last 2 versions' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  plugins: [
    [require.resolve('@adv-frontend/l10n/babelI18nPlugin'), { lang: 'ru' }],
  ],
};
