import Document, { Html, Head, Main, NextScript } from 'next/document';
import Script                                     from 'next/script';
import Cookies                                    from 'cookies';
import Favicon                                    from '@components/layouts/Favicon';
import FbpScripts                                 from '@components/tools/FbpScripts';
import { moduleHookScripts }                      from '@lib/utils';
export default class MyDocument extends Document {
    static async getInitialProps(ctx) {
        const initialProps          = await Document.getInitialProps(ctx);
        const cookiesServerInstance = new Cookies(ctx.req, ctx.res);
        return { ...initialProps, locale: ctx.locale, cookieNotice: cookiesServerInstance.get('cookie_notice') };
    }
      
    render() {
        return (
            <Html lang={this.props.locale}>
                <Head>
                    <FbpScripts cookieNotice={this.props.cookieNotice} />
                    
                    <meta name="powered-by" content="AquilaCMS" />

                    <Favicon />
                    {
                        moduleHookScripts().map((script, index) => (
                            <Script key={index} src={script} strategy="beforeInteractive" />
                        ))
                    }
                </Head>
                <body>
                    <Main />
                    <NextScript />
                </body>
            </Html>
        );
    }
}
