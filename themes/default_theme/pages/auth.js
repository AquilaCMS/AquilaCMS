import React from 'react';
import Head from 'next/head';
import { NSContext, getCmsBlock, getLangPrefix } from 'aqlrc';
import PropTypes from 'prop-types'
import Layout from 'components/Layout';
import Login from 'components/Login';
import { withI18next } from 'lib/withI18n';
import { Router } from 'routes';

/**
 * Auth - Page d'authentification
 * @return {React.Component}
 */

class Auth extends React.Component {
    static getInitialProps = async function (ctx) {
        const { cmsBlocks, lang } = ctx.nsGlobals;
        const cms = await getCmsBlock(['legalTxt', 'login'], cmsBlocks, lang, ctx);
        return {
            ...cms
        };
    };

    constructor(props) {
        super(props);
        this.state = {
            ...props
        };
    }

    componentDidMount = () => {
        const { routerLang, user } = this.state;
        if (user) {
            Router.pushRoute('account', { lang: routerLang });
        }
    }

    onLangChange = async (lang) => {
        window.location.pathname = `${await getLangPrefix(lang)}/login`;
    }

    render() {
        const {
            oCmsHeader, oCmsFooter, sitename, t
        } = this.props;
        return (
            <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                <Layout header={oCmsHeader.content} footer={oCmsFooter.content}>
                    <Head>
                        <title>{sitename} | {t('login:page.title')}</title>
                        <meta property="og:type" content="website" />
                    </Head>
                    <Login gNext={{ Head, Router }} t={t} />
                </Layout>
            </NSContext.Provider>
        );
    }
}

Auth.propTypes = {
    oCmsHeader: PropTypes.object,
    oCmsFooter: PropTypes.object,
    sitename: PropTypes.string,
    t: PropTypes.func
}

export default withI18next(['login'])(Auth);
