module.exports = function (api) {
  api.cache(true);

  const presets = [
    require.resolve('next/babel')
  ];
  const plugins = [
    '@babel/plugin-syntax-dynamic-import'
  ];

  return {
    presets,
    plugins
  };
};
