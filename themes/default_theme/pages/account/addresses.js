import React from 'react';
import Head from 'next/head';
import {
    NSPageAccount, NSAddressMultiple, NSContext, getCmsBlock, getLangPrefix
} from 'aqlrc';
import Layout from 'components/Layout';
import SidebarAccount from 'components/SidebarAccount';
import { Link, Router } from 'routes';
import { withI18next } from 'lib/withI18n';

/**
 * PageAddresses - Page des adresses client (surcharge NSPageAccount)
 * @return {React.Component}
 */

class PageAddresses extends NSPageAccount {
    static getInitialProps = async function (ctx) {
        const { cmsBlocks, lang } = ctx.nsGlobals;

        const cmsLegalTxt = await getCmsBlock('legalTxt', cmsBlocks, lang, ctx);

        return {
            cmsLegalTxt,
            userRequired : { url: '/login', route: 'auth' }
        };
    };

    constructor(props) {
        super(props);
        this.state = {
            ...props
        };
    }

    onLangChange = async (lang) => {
        window.location.pathname = `${await getLangPrefix(lang)}/account/addresses`;
    }

    render() {
        const {
            oCmsHeader, oCmsFooter, sitename, t
        } = this.props;
        return (
            <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                <Layout header={oCmsHeader.content} footer={oCmsFooter.content}>
                    <Head>
                        <title>{sitename} | {t('addresses.title')}</title>
                    </Head>
                    <div className="main">
                        <div className="shell">
                            <div className="container container--flex align-top">
                                <div className="content content--alt content--left">
                                    <section className="section-client-area">
                                        <header className="section__head">
                                            <h2 className="section__title"><i className="ico-profile-large" />{t('account.page.title')}</h2>{/* <!-- /.section__title --> */}
                                        </header>{/* <!-- /.section__head --> */}
                                        <h6>{t('addresses.sub_title')}</h6>
                                        <div className="container--flex align-top">
                                            <NSAddressMultiple t={t} />
                                        </div>
                                    </section>{/* <!-- /.section-client-area --> */}
                                </div>{/* <!-- /.content --> */}
                                <SidebarAccount active="addresses" />
                            </div>{/* <!-- /.container container--flex --> */}
                        </div>{/* <!-- /.shell --> */}
                    </div>
                </Layout>
            </NSContext.Provider>
        );
    }
}

export default withI18next(['account', 'addresses'])(PageAddresses);
