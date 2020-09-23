import React from 'react';
import moment from 'moment';
import Head from 'next/head';
import { NSPageBlogArticle, NSBreadcrumb, NSContext } from 'aqlrc';
import routes, { Link } from 'routes';
import { withI18next } from 'lib/withI18n';
import Layout from 'components/Layout';
import Error from 'pages/_error';

/**
 * PageBlogArticle - Page article de blog (surcharge NSPageBlogArticle)
 * @return {React.Component}
 */

class PageBlogArticle extends NSPageBlogArticle {
    render() {
        const {
            article, lang, oCmsHeader, oCmsFooter, sitename
        } = this.props;
        if (!article) {
            return (
                <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                    <Error statusCode={404} message="Not found" oCmsHeader={oCmsHeader} oCmsFooter={oCmsFooter} />);
                </NSContext.Provider>
            );
        }
        let pathUrl = this.props.pathUrl;
        if (pathUrl === '') {
            pathUrl = window.location.href;
        }
        const url = pathUrl ? `${pathUrl.split('/')[0]}//${pathUrl.split('/')[2]}` : '';
        return (
            <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                <Layout header={oCmsHeader.content} footer={oCmsFooter.content}>
                    <Head>
                        <title>{sitename} | Blog</title>
                        <meta property="og:type" content="website" />
                    </Head>
                    <div className="main__inner">
                        <div className="shell blog">
                            <NSBreadcrumb gNext={{ routes, Link }} />
                            <section className="section section--table ns-article" itemScope="" itemType="http://schema.org/Article">
                                <div className="shell">
                                    <h1 className="section__title">
                                        <span itemProp="headline">{article.title}</span>
                                    </h1>

                                    <div itemProp="image" itemScope="" itemType="http://schema.org/ImageObject">
                                        <meta itemProp="url" content={`${url}/${article.img}`} />
                                    </div>

                                    <div className="section__body">
                                        <div className="section__inner">
                                            <div className="article-date" itemProp="datePublished" content={moment(article.createdAt).format('DD/MM/YYYY - HH[h]mm')}>
                                                {moment(article.createdAt).format('DD/MM/YYYY - HH[h]mm')}
                                            </div>
                                            <div itemProp="articleBody" className="ns-article-content" dangerouslySetInnerHTML={{ __html: (article.img ? `<img src="/images/blog/450x315/${article._id}/${article.slug[lang]}${article.extension}" alt="${article.title}" />` : '') + article.content.text }} />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </Layout>
            </NSContext.Provider>
        );
    }
}

export default withI18next(['article'])(PageBlogArticle);
