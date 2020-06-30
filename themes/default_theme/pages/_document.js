import React from 'react';
import Document, { Head, Main, NextScript } from 'next/document';
import { withI18next } from 'lib/withI18n';

class MyDocument extends Document {
    static getInitialProps = async (ctx) => {
        let url = ctx.asPath;
        if (url.indexOf('?') > -1) {
            url = url.substr(0, url.indexOf('?'));
        }
        if (url && (url.indexOf('.') > -1 || url.indexOf('admin') > -1)) ctx.res.end();

        const initialProps = await Document.getInitialProps(ctx);
        return { ...initialProps };
    };

    render() {
        const urlWebsite = typeof window !== 'undefined' ? window.location.origin : '';
        return (
            <html xmlnsog="http://ogp.me/ns#" itemScope="" itemType="http://schema.org/WebSite" lang={this.props.i18n.language}>
                <Head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, shrink-to-fit=no" />
                    <meta itemProp="url" content={urlWebsite} />
                </Head>
                <body className="custom_class">
                    <Main />
                    <NextScript />
                </body>
            </html>
        );
    }
}

export default withI18next([])(MyDocument);
