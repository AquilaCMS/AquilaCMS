import React from 'react';
import Head from 'next/head';
import {
    NSPageCategory,
    NSBreadcrumb,
    NSContext,
    NSFilters,
    NSProductCard,
} from 'aqlrc';
import ReactPagination from 'react-js-pagination';
import Layout from 'components/Layout';
import { listModulePage } from 'lib/utils';
import { withI18next } from 'lib/withI18n';
import routes, { Link, Router } from 'routes';
import CMS from 'components/CMS';
import Error from './_error';

/**
 * PageCategory - Page catégorie (surcharge NSPageCategory)
 * @return {React.Component}
 */

class PageCategory extends NSPageCategory {
    render() {
        const {
            lang,
            notFound,
            nsCms_extraText,
            nsCms_extraText2,
            nsCms_extraText3,
            oCmsHeader,
            oCmsFooter,
            sitename,
            t,
            themeConfig
        } = this.props;
        if (notFound) {
            return (
                <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                    <Error statusCode={404} message="Not found" oCmsHeader={oCmsHeader} oCmsFooter={oCmsFooter} />
                </NSContext.Provider>
            );
        }
        const {
            category, count, itemsPerPages, productsList, gridDisplay, filters, taxDisplay
        } = this.state;
        if (typeof window !== 'undefined' && /Mobi/.test(window.navigator.userAgent) && !gridDisplay) {
            this.setState({ gridDisplay: true });
            window.localStorage.setItem('gridDisplay', true);
        }

        return (
            <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                <Layout header={oCmsHeader.content} footer={oCmsFooter.content}>
                    <Head>
                        <title>{sitename} | {category.name !== undefined && category.name !== '' ? category.name : ''}</title>
                        {
                            category.metaDescription ? <meta name="description" content={category.metaDescription} /> : null
                        }
                        {parseInt(this.state.current, 0) === 2 && <link rel="prev" href={`${this.state.baseUrl}/`} />}
                        {parseInt(this.state.current, 0) > 2 && <link rel="prev" href={`${this.state.baseUrl}/${this.state.current - 1}`} />}
                        {parseInt(this.state.current, 0) < Math.ceil(count / itemsPerPages) && <link rel="next" href={`${this.state.baseUrl}/${this.state.current + 1}`} />}
                        <meta property="og:type" content="website" />
                    </Head>

                    <div className="page-content">
                        {nsCms_extraText && nsCms_extraText.content !== '' && <CMS content={nsCms_extraText.content} hide_error="1" />}

                        <div className="main">
                            <div className="shell">
                                {
                                    listModulePage('select-date')
                                }
                                <NSBreadcrumb gNext={{ routes, Link }} />

                                {nsCms_extraText2 && nsCms_extraText2.content !== '' && <div style={{ marginBottom: '20px' }}><CMS content={nsCms_extraText2.content} hide_error="1" /></div>}
                                <div className="category-top-modules">
                                    {
                                        listModulePage('category-top', { onPageChange: this.onPageChange, category: category })
                                    }
                                </div>

                                <div className="page-head visible-xs-block">
                                    <h2>{category.name} <span>({count})</span></h2>
                                </div>{/* <!-- /.page-head --> */}

                                <nav className="nav-filters visible-xs-block">
                                    <ul>
                                        <li>
                                            <a role="button" onClick={() => this.changeTab('filter1')}>{t('category:trier')}</a>
                                        </li>

                                        <li>
                                            <a role="button" onClick={() => this.changeTab('filter2')}>{t('category:filtrer')}</a>
                                        </li>
                                    </ul>
                                </nav>{/* <!-- /.nav-filters --> */}

                                <div className={`tab-filter${this.state.tab === 'filter1' ? ' current' : ''}`} id="filter1">
                                    <div className="bar-filters">
                                        <h4 itemProp="numberOfItems">{count} {t('category:results')}</h4>

                                        <div className="form__row form__row--flex">
                                            <label htmlFor="field-sort-by" className="form__label">{t('category:trierPar')}</label>

                                            <div className="form__controls">
                                                <div className="select select--normal">
                                                    <select
                                                        name="field-sort-by"
                                                        id="field-sort-by"
                                                        value={this.state.selectedSort}
                                                        onChange={(e) => this.handleSort(JSON.parse(e.target.value), e.target.value, filters)}
                                                    >
                                                        <option value={JSON.stringify({ field: 'sortWeight', sortValue: '-1' })}>{t('category:pertinence')}</option>
                                                        <option value={JSON.stringify({ field: `translation.${lang}.name`, sortValue: '1' })}>A-Z</option>
                                                        <option value={JSON.stringify({ field: `translation.${lang}.name`, sortValue: '-1' })}>Z-A</option>
                                                        <option value={JSON.stringify({ field: `price.${taxDisplay}.normal`, sortValue: '1' })}>{t('category:prix')} -</option> {/* TODO: trier par prix normal & discount */}
                                                        <option value={JSON.stringify({ field: `price.${taxDisplay}.normal`, sortValue: '-1' })}>{t('category:prix')} +</option>
                                                        <option value={JSON.stringify({ field: 'is_new', sortValue: '-1' })}>{t('category:new')}</option>
                                                        <option value={JSON.stringify({ field: 'reviews.average', sortValue: '-1' })}>{t('category:grade')}</option>
                                                        <option value={JSON.stringify({ field: 'stats.views', sortValue: '-1' })}>{t('category:mostViewed')}</option>
                                                        <option value={JSON.stringify({ field: 'stats.sells', sortValue: '-1' })}>{t('category:sells')}</option>
                                                    </select>
                                                </div>{/* <!-- /.select --> */}
                                            </div>{/* <!-- /.form__controls --> */}
                                        </div>{/* <!-- /.form__row --> */}

                                        <div className="form__row form__row--flex">
                                            <label htmlFor="field-items-per-page" className="form__label">{t('category:produitsParPage')}</label>

                                            <div className="form__controls">
                                                <div className="select select--small">
                                                    <select
                                                        name="field-items-per-page"
                                                        id="field-items-per-page"
                                                        defaultValue="15"
                                                        onChange={
                                                            (e) => this.setState(
                                                                { itemsPerPages: Number(e.target.value) },
                                                                (e) => this.onPageChange(1, itemsPerPages, e, filters)
                                                            )}
                                                    >
                                                        <option value="15">15</option>
                                                        <option value="30">30</option>
                                                        <option value="45">45</option>
                                                    </select>
                                                </div>{/* <!-- /.select --> */}
                                            </div>{/* <!-- /.form__controls --> */}
                                        </div>{/* <!-- /.form__row --> */}

                                        <div className="paging" hidden={count <= itemsPerPages}>
                                            <ReactPagination
                                                hideDisabled
                                                hideFirstLastPages
                                                activePage={this.state.current}
                                                itemsCountPerPage={itemsPerPages}
                                                totalItemsCount={count}
                                                pageRangeDisplayed={5}
                                                onChange={(page) => this.onPageChange(page, itemsPerPages, undefined, filters)}
                                                activeClass="current"
                                                prevPageText={<span>&lt;</span>}
                                                nextPageText={<span>&gt;</span>}
                                            />
                                        </div>

                                        <div className="grid-toggle hidden-xs">
                                            <ul>
                                                <li>
                                                    <button
                                                        type="button"
                                                        className="btn"
                                                        onClick={() => this.setState({ gridDisplay: true }, () => {
                                                            window.localStorage.setItem('gridDisplay', 'true');
                                                        })}
                                                        aria-label={t('category:grid')}
                                                    >
                                                        <i className={`ico-grid${gridDisplay ? ' active' : ''}`} />
                                                    </button>
                                                </li>

                                                <li>
                                                    <button
                                                        type="button"
                                                        className="btn"
                                                        onClick={() => this.setState({ gridDisplay: false }, () => {
                                                            window.localStorage.setItem('gridDisplay', 'false');
                                                        })}
                                                        aria-label={t('category:list')}
                                                    >
                                                        <i className={`ico-list${!gridDisplay ? '-active' : ''}`} />
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>{/* <!-- /.grid-toggle --> */}
                                    </div>{/* <!-- /.bar-filters --> */}
                                </div>{/* <!-- /.tab-filter --> */}

                                <div
                                    className="container container--flex align-top"
                                    style={
                                        themeConfig
                                            && themeConfig.find(t => t.key === 'filters')
                                            && themeConfig.find(t => t.key === 'filters').value === 'right'
                                            ? { flexDirection: "row-reverse" }
                                            : {}
                                    }>

                                    <div
                                        className={`tab-filter${this.state.tab === 'filter2' ? ' current' : ''}`}
                                        id="filter2"
                                        style={
                                            themeConfig
                                                && themeConfig.find(t => t.key === 'filters')
                                                && themeConfig.find(t => t.key === 'filters').value === 'none'
                                                ? { display: "none" }
                                                : {}
                                        }>
                                        {
                                            <NSFilters
                                                category={category}
                                                color="#f00"
                                                globalMin={this.state.globalMin}
                                                min={this.state.min}
                                                location={category.name}
                                                globalMax={this.state.globalMax}
                                                max={this.state.max}
                                                itemspp={itemsPerPages}
                                                page={this.state.current}
                                                t={t}
                                                reload={this.onPageChange}
                                                key={category._id}
                                            />
                                        }
                                    </div>{/* <!-- /.tab-filter --> */}

                                    <div className="content">
                                        <div className="products-grid" itemScope itemType="http://schema.org/ItemList">
                                            {
                                                productsList.map((product, index) => <NSProductCard
                                                    from="category"
                                                    gridDisplay={gridDisplay}
                                                    includeCss={index === 0}
                                                    key={product._id}
                                                    type="data"
                                                    value={product}
                                                    t={t}
                                                    gNext={{ Head, Link, Router }} />)
                                            }
                                            {
                                                productsList.length === 0 && <p style={{ textAlign: 'center', width: '100%' }}>{t('category:aucunResultat')}</p>
                                            }

                                        </div>{/* <!-- /.products-grid --> */}

                                        <div className="content__actions">
                                            <div className="paging" hidden={count <= itemsPerPages}>
                                                <ReactPagination
                                                    hideDisabled
                                                    hideFirstLastPages
                                                    activePage={this.state.current}
                                                    itemsCountPerPage={itemsPerPages}
                                                    totalItemsCount={count}
                                                    pageRangeDisplayed={5}
                                                    onChange={(page) => this.onPageChange(page, itemsPerPages, undefined, filters)}
                                                    activeClass="current"
                                                    prevPageText={<span>&lt;</span>}
                                                    nextPageText={<span>&gt;</span>}
                                                />
                                            </div>{/* <!-- /.paging --> */}

                                        </div>{/* <!-- /.content__actions --> */}
                                    </div>{/* <!-- /.content --> */}
                                </div>{/* <!-- /.container container--flex --> */}
                                <div>
                                    {
                                        listModulePage('category-bottom', { onPageChange: this.onPageChange, category: category })
                                    }
                                </div>

                                {nsCms_extraText3 && nsCms_extraText3.content !== '' && <CMS content={nsCms_extraText3.content} hide_error="1" />}
                            </div>{/* <!-- /.shell --> */}
                        </div>{/* <!-- /.main --> */}
                    </div>

                </Layout>
            </NSContext.Provider>
        );
    }

}

PageCategory.defaultProps = {
    contentHtml: {
        content: '',
    },
    category: {
        productsList: [],
        filters: [],
    },
    oCmsHeader: {
        content: '',
    },
    productsList: [],
    min: 0,
    max: 0,
    count: 0,
    oCmsFooter: {
        content: '',
    }
};

export default withI18next(['category', 'product-card'])(PageCategory);
