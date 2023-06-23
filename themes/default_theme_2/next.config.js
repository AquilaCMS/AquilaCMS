const nextTranslate = require('next-translate-plugin');
module.exports      = nextTranslate({
    async headers() {
        return [
            {
                source : '/(.*)',
                headers: [
                    {
                        key  : 'Powered-by',
                        value: 'AquilaCMS',
                    },
                    {
                        key  : 'Cache-Control',
                        value: 'no-store',
                    }
                ],
            },
        ];
    },
    // disable eslint during build https://nextjs.org/docs/api-reference/next.config.js/ignoring-eslint
    eslint: {
        ignoreDuringBuilds: true,
    },
    optimizeFonts: false,
});