import React from 'react';
import 'aql-utils';
import axios from 'axios';
import App from 'next/app';
import Head from 'next/head';
import parse from 'html-react-parser';
import {
    NSToast,
    initAqlrc,
    initLangAqlrc,
    getCmsBlock,
    initPage,
    jwtManager,
    getUser,
    logoutUser,
    scrollToTop
} from 'aqlrc';
import getAPIUrl from 'lib/getAPIUrl';
import { Router } from 'routes';
import 'styles/global.css';
import 'public/static/css/slider.css';
import 'rc-slider/assets/index.css';
import 'lightbox-react/style.css';
import 'public/static/slick-1.6.0/slick_and_theme.css';
import 'public/static/css/product-card.css';

class AquilaApp extends App {
    static async getInitialProps(bundle) {
        initAqlrc();

        let pageProps = {};
        let cache = null;
        let appurl = null;
        let sitename = null;
        let demo = null;
        let favicon = null;
        let langs = null;
        try {
            // Récupération de variables globales dont nous aurons besoin basées sur la configuration du back-office
            // "appurl" : l'URL de base du site
            // "sitename" : le nom du site
            // "demo" : le booléen d'activation du site en mode démo
            // "favicon" : le chemin du favicon
            // "langs" : tableau des langues
            // Ces données sont cachées (limite de 2 jours) dans le local storage
            // Le cache ne fonctionne donc que côté client !
            if (typeof window !== 'undefined') {
                cache = window.localStorage.getItem('cache');
                if (cache) {
                    cache = JSON.parse(cache);
                }
            }
            if (!cache || (cache && Date.now() >= cache.date)) {
                const resConf = await axios.post(`${getAPIUrl(bundle.ctx)}v2/config`, {
                    PostBody: { structure: { environment: 1 } }
                });
                appurl = resConf.data.environment.appUrl;
                sitename = resConf.data.environment.siteName;
                demo = resConf.data.environment.demoMode;
                favicon = resConf.data.environment.favicon;
                const resLangs = await axios.post(`${getAPIUrl(bundle.ctx)}v2/languages`, { PostBody: { limit: 99 } }); // Récupération des langues
                langs = resLangs.data.datas;
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem('cache', JSON.stringify({
                        appurl, sitename, demo, favicon, langs, date: Date.now() + 172800000
                    }));
                }
            } else {
                appurl = cache.appurl;
                sitename = cache.sitename;
                demo = cache.demo;
                favicon = cache.favicon;
                langs = cache.langs;
            }

            // Récupération des blocs CMS existants
            // On se basera sur cette liste afin d'éviter de récupérer des blocs CMS qui n'existent pas (ce qui peut arriver)
            const resCms = await axios.post(`${getAPIUrl(bundle.ctx)}v2/cmsBlocks`, {
                PostBody: {
                    structure: { translation: 0 },
                    limit: 99
                }
            });
            const cmsBlocks = resCms.data.count > 0 ? resCms.data.datas : [];

            // Affectation de la langue dans le local storage en fonction de l'URL
            const lang = bundle.ctx !== undefined && bundle.ctx.query !== undefined && bundle.ctx.query.lang !== undefined ? bundle.ctx.query.lang : langs.find((l) => l.defaultLanguage === true).code;
            if (typeof window !== 'undefined' && (!window.localStorage.getItem('lang') || window.localStorage.getItem('lang') !== lang)) {
                window.localStorage.setItem('lang', lang);
            }

            // Affection de la langue dans les headers
            axios.defaults.headers.common.lang = lang;
            initLangAqlrc(lang);

            const routerLang = lang === langs.find((l) => l.defaultLanguage === true).code ? null : lang; // NE PAS TOUCHER !
            const urlLang = lang === langs.find((l) => l.defaultLanguage === true).code ? '' : `/${lang}`; // NE PAS TOUCHER !

            /* const jwt = jwtManager.get(bundle.ctx);
            if (jwt) {
                axios.defaults.headers.common.Authorization = jwt;
            } else {
                delete axios.defaults.headers.common.Authorization;
            } */

            // Exécution du getInitialProps de la page
            if (bundle.Component.getInitialProps && bundle) {
                bundle.ctx.nsGlobals = {
                    cmsBlocks, Router, langs, lang, routerLang, urlLang
                }; // Permet d'envoyer les globales dans les getInitialProps de chaque page
                pageProps = await bundle.Component.getInitialProps(bundle.ctx);
            }

            // Récupération des données des blocs CMS header / footer + breadcrumb
            const header = pageProps.layoutCms ? pageProps.layoutCms.header : undefined;
            const footer = pageProps.layoutCms ? pageProps.layoutCms.footer : undefined;
            const initData = await initPage(bundle.ctx, lang, header, footer);

            // La props "userRequired" est un objet défini dans chaque page
            // Il est composé de 2 propriétés :
            // "url" : l'URL de redirection (si on est côté client)
            // "route" : la route de redirection (si on est côté serveur)
            // Elle permet de restreindre les pages qui nécessitent un utilisateur connecté
            // En fonction de ça on redirige ou non vers la page d'acceuil
            let user = jwtManager.getUser(bundle.ctx);
            if (pageProps.userRequired) {
                if (user) {
                    try {
                        const PostBody = {
                            structure: {
                                isActiveAccount: 1,
                                company: 1,
                                civility: 1,
                                preferredLanguage: 1,
                                type: 1,
                                addresses: 1,
                                delivery_address: 1,
                                billing_address: 1,
                                birthDate: 1,
                                attributes: 1
                            }
                        };
                        user = await getUser(user._id, PostBody, bundle.ctx);
                    } catch (err) {
                        if (err.response && err.response.data && err.response.data.message) {
                            NSToast.error(err.response.data.message);
                        } else {
                            NSToast.error('common:error_occured');
                            console.error(err);
                        }
                        user = undefined;
                    }
                }
                if (!user || !Object.keys(user).length) {
                    user = undefined;

                    // Déconnexion
                    await logoutUser(bundle.ctx);

                    if (bundle.ctx.req) {
                        return bundle.ctx.res.redirect(`${urlLang}${pageProps.userRequired.url ? pageProps.userRequired.url : ''}`);
                    }
                    return Router.pushRoute(pageProps.userRequired.route ? pageProps.userRequired.route : 'home', { lang: routerLang });
                }
            }

            // Bloc CMS du contenu custom de <head> et de la barre de cookie
            const { cmsHead, cmsCookieBanner } = await getCmsBlock(['head', 'cookie-banner'], cmsBlocks, lang, bundle.ctx);

            // Surcharge de la config du thème
            const themeConfig = await axios.post(`${getAPIUrl(bundle.ctx)}v2/themeConfig`, { lang, PostBody: {} });

            pageProps = {
                ...pageProps,
                ...initData,
                demo,
                favicon,
                cmsHead: cmsHead.content,
                messageCookie: cmsCookieBanner.content,
                appurl,
                sitename,
                cmsBlocks,
                themeConfig: themeConfig.data.config.values,
                currentUrl: bundle.ctx.asPath, // => NSMenu
                user,
                gNext: { Router },
                langs,
                lang,
                routerLang,
                urlLang,
            };
            return { pageProps };
        } catch (err) {
            return { pageProps };
        }
    }

    constructor(props) {
        super(props);
        this.state = {};
    }

    /* static async getDerivedStateFromProps(nextProps, prevState) {
        const jwt = jwtManager.get();
        if (jwt) {
            axios.defaults.headers.common.Authorization = jwt;
        }
    } */

    componentDidMount = () => {
        const { lang } = this.props.pageProps;
        axios.defaults.headers.common.lang = lang;
        initLangAqlrc(lang);

        /* Évènements levés pour Google Analytics */
        const init = new CustomEvent('init', {});
        window.dispatchEvent(init);
        let logPageView = new CustomEvent('logPageView', { detail: { url: window.location.pathname } });
        window.dispatchEvent(logPageView);

        Router.onRouteChangeStart = () => {
            const routeChange = new CustomEvent('routeChange', {});
            window.dispatchEvent(routeChange);
        };

        Router.router.events.on('routeChangeComplete', (url) => {
            if (typeof window !== 'undefined' && window.location.hash === '') scrollToTop(1000);
            const onChangeLogPageView = new CustomEvent('logPageView', { detail: { url } });
            window.dispatchEvent(onChangeLogPageView);
        });

        // Affectation de la langue dans le local storage en fonction de l'URL
        const { pageProps } = this.props;
        if (!window.localStorage.getItem('lang') || window.localStorage.getItem('lang') !== pageProps.lang) {
            window.localStorage.setItem('lang', pageProps.lang);
        }
    }

    render() {
        const { Component, pageProps } = this.props;
        return (
            <>
                <Head>
                    <meta name="powered-by" content="AquilaCMS"/>
                    <meta property="og:site_name" content={pageProps.sitename} />
                    <meta itemProp="name" content={pageProps.sitename} />
                    {pageProps.favicon && <link rel="shortcut icon" href={pageProps.favicon} />}
                    {
                        !pageProps.demo ? <meta name="robots" content="index,follow" />
                            : (
                                <>
                                    <meta name="robots" content="noindex,nofollow,noarchive" />
                                    <style>{`
                                        body::before {
                                            content: "/!\\\\ This is a demo mode ! /!\\\\";
                                            background-color: red;
                                            color: #000;
                                            padding: 2px;
                                            width: 100%;
                                            text-align: center;
                                            position: fixed;
                                            z-index: 999;
                                            font-size: 11px;
                                        }
                                    `}</style>
                                </>
                            )
                    }
                    {pageProps.cmsHead ? parse(pageProps.cmsHead) : null}
                </Head>
                <Component {...pageProps} />
            </>
        );
    }
}
export default AquilaApp;
