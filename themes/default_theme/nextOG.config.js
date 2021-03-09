const withSourceMap = require('@zeit/next-source-maps');
// const withBundleAnalyzer = require('@next/bundle-analyzer')({
//     enabled: process.env.ANALYZE === 'true',
// })

module.exports = withSourceMap({
    webpack : (config, { dev }) => {
        const _config = { ...config };
        if (dev) {
            _config.devtool = 'cheap-module-source-map';
        }
        return _config;
    },
});
