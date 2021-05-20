import React from 'react';
import Head from 'next/head';
import { NSPageStatic, NSContext } from 'aqlrc';
import { withRouter } from 'next/router';
import CMS from 'components/CMS';
import Layout from 'components/Layout';
import { withI18next } from 'lib/withI18n';
import Error from './_error';

/**
 * PageStatic - Page statique (surcharge NSPageStatic)
 * @return {React.Component}
 */

class PageStatic extends NSPageStatic {
    render() {
        const { oCmsHeader, oCmsFooter, sitename, t } = this.props;
        const _slug = this.props.router.query._slug !== undefined && this.props.router.query._slug.length !== 2 ? this.props.router.query._slug : 'home';
        if (this.props.notFound) {
            return (
                <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                    <Error statusCode={404} message={this.props.message} oCmsHeader={oCmsHeader} oCmsFooter={oCmsFooter} />
                </NSContext.Provider>
            );
        }
        return (
            <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                <Layout header={oCmsHeader.content} footer={oCmsFooter.content}>
                    {this.props.isEmpty ? (
                        <Head>
                            <title>{sitename} | {t('static:no_page')}</title>
                            <meta property="og:type" content="website" />
                        </Head>
                    ) : (
                            <>
                                <Head>
                                    <title>{sitename} | {this.props[`nsCms_${_slug}`].title || ''}</title>
                                    <meta name="description" content={this.props[`nsCms_${_slug}`].metaDesc || ''} />
                                    <meta property="og:title" content={this.props[`nsCms_${_slug}`].title || ''} />
                                    <meta property="og:description" content={this.props[`nsCms_${_slug}`].metaDesc || ''} />
                                    <meta property="og:type" content="website" />
                                </Head>
                                <CMS {...this.props} ns-code={_slug} content={this.props[`nsCms_${_slug}`].content || '<p>Vide</p>'} />
                            </>
                        )}
                    {this.jsxHook}
                </Layout>
            </NSContext.Provider>
        );
    }
}

export default withRouter(withI18next(['static'])(PageStatic));
