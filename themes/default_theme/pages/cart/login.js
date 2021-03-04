import React from 'react';
import Head from 'next/head';
import {
    NSContext, getCmsBlock, getLangPrefix
} from 'aqlrc';
import PropTypes from 'prop-types'
import CartStructure from 'components/CartStructure';
import Login from 'components/Login';
import { withI18next } from 'lib/withI18n';
import { Router } from 'routes';

/**
 * CartLogin - Page de connexion / inscription dans le panier
 * @return {React.Component}
 */

class CartLogin extends React.Component {
    static getInitialProps = async function (ctx) {
        const { cmsBlocks, lang } = ctx.nsGlobals;
        const cmsLegalTxt = await getCmsBlock('legalTxt', cmsBlocks, lang, ctx);

        return {
            cmsLegalTxt,
            layoutCms: { header: 'header_cart', footer: 'footer_cart' }
        };
    };

    constructor(props) {
        super(props);
        this.state = {
            ...props,
            email: ''
        };
    }

    componentDidMount = () => {
        const { routerLang, user } = this.state;
        if (user) {
            Router.pushRoute('cartAddress', { lang: routerLang });
        }
    }

    onLangChange = async (lang) => {
        window.location.pathname = `${await getLangPrefix(lang)}/cart/login`;
    }

    render() {
        const {
            oCmsHeader, oCmsFooter, sitename, t
        } = this.props;
        return (
            <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                <CartStructure oCmsFooter={oCmsFooter} oCmsHeader={oCmsHeader} step={1}>
                    <Head>
                        <title>{sitename} | {t('login:page.title')}</title>
                        <meta property="og:type" content="website" />
                    </Head>
                    <Login gNext={{ Head, Router }} t={t} />
                </CartStructure>
            </NSContext.Provider>
        );
    }
}

CartLogin.propTypes = {
    oCmsHeader: PropTypes.object,
    oCmsFooter: PropTypes.object,
    sitename: PropTypes.string,
    t: PropTypes.func.isRequired,
}

export default withI18next(['login'])(CartLogin);
