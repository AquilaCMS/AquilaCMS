import React from 'react';
import Head from 'next/head';
import {
    NSPageSearch, NSBreadcrumb, NSContext, NSFilters, NSProductCard, getLangPrefix
} from 'aqlrc';
import ReactPagination from 'react-js-pagination';
import { withRouter } from 'next/router';
import Layout from 'components/Layout';
import { withI18next } from 'lib/withI18n';
import routes, { Link, Router } from 'routes';

/**
 * PageSearch - Page de recherche (surcharge NSPageSearch)
 * @return {React.Component}
 */

class PageSearch extends NSPageSearch {
    constructor(props) {
        super(props);
        this.state = {
            ...props,
            itemsPerPages: 15,
            productsList: props.products,
            selectedSort: JSON.stringify({ field: 'sortWeight', sortValue: -1 }),
            gridDisplay: false,
        };
    }

    componentDidMount = () => {
        // EVENT ADD TO CART
        const event = new CustomEvent('searchItems', { detail: { products: this.props.products, searchQuery: this.props.router.query.search } });
        window.dispatchEvent(event);
        // Si un seul produit est trouvé alors on va directement sur la page du produit
        if (this.props.products.length === 1 && this.props.products[0].canonical) {
            Router.pushRoute(this.props.products[0].canonical);
        }
    }

    onLangChange = async (lang) => {
        window.location.pathname = `${await getLangPrefix(lang)}/search/${this.props.router.query.search}`;
    }

    render() {
        const {
            baseUrl, lang, oCmsHeader, oCmsFooter, sitename, t, themeConfig
        } = this.props;
        const {
            count, current, filters, gridDisplay, itemsPerPages, products, taxDisplay
        } = this.state;
        return (
            <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                <Layout header={oCmsHeader.content} footer={oCmsFooter.content}>
                    <Head>
                        <title>{sitename} | {this.props.router.query.search}</title>
                        {/* <meta name="description" content={category.metaDescription} /> */}
                        {parseInt(current, 10) === 2 && <link rel="prev" href={`${baseUrl}/`} />}
                        {parseInt(current, 10) > 2 && <link rel="prev" href={`${baseUrl}/${current - 1}`} />}
                        {parseInt(current, 10) < Math.ceil(count / itemsPerPages) && <link rel="next" href={`${baseUrl}/${parseInt(current, 10) + 1}`} />}
                        <meta property="og:type" content="website" />
                    </Head>

                    <div className="page-content">
                        <div className="main">
                            <div className="shell">
                                <NSBreadcrumb gNext={{ routes, Link }} />

                                <div className="page-head visible-xs-block">
                                    <h2>Recherche <span>({count})</span></h2>
                                </div>{/* <!-- /.page-head --> */}
                                <div className={`tab-filter${this.state.tab === 'filter1' ? ' current' : ''}`} id="filter1">
                                    <div className="bar-filters">
                                        <h4 itemProp="numberOfItems">{count} {t('results')}</h4>

                                        <div className="form__row form__row--flex">
                                            <label htmlFor="field-sort-by" className="form__label">{t('trierPar')}</label>

                                            <div className="form__controls">
                                                <div className="select select--normal">
                                                    <select name="field-sort-by" id="field-sort-by" value={this.state.selectedSort} onChange={(e) => this.handleSort(JSON.parse(e.target.value), e.target.value, filters)}>
                                                        <option value={JSON.stringify({ field: 'sortWeight', sortValue: '-1' })}>{t('pertinence')}</option>
                                                        <option value={JSON.stringify({ field: `translation.${lang}.name`, sortValue: '1' })}>A-Z</option>
                                                        <option value={JSON.stringify({ field: `translation.${lang}.name`, sortValue: '-1' })}>Z-A</option>
                                                        <option value={JSON.stringify({ field: `price.${taxDisplay}.normal`, sortValue: '1' })}>{t('prix')} -</option> {/* TODO: trier par prix normal & discount */}
                                                        <option value={JSON.stringify({ field: `price.${taxDisplay}.normal`, sortValue: '-1' })}>{t('prix')} +</option>
                                                    </select>
                                                </div>{/* <!-- /.select --> */}
                                            </div>{/* <!-- /.form__controls --> */}
                                        </div>{/* <!-- /.form__row --> */}

                                        <div className="form__row form__row--flex">
                                            <label htmlFor="field-items-per-page" className="form__label">{t('produitsParPage')}</label>

                                            <div className="form__controls">
                                                <div className="select select--small">
                                                    <select name="field-items-per-page" id="field-items-per-page" defaultValue="15" onChange={(e) => this.setState({ itemsPerPages: Number(e.target.value) }, (e) => this.onPageChange(1, this.state.itemsPerPages, e, filters))}>
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
                                                    <button type="button" className="btn" onClick={() => this.setState({ gridDisplay: true }, () => { window.localStorage.setItem('gridDisplay', 'true'); })}>
                                                        <i className={`ico-grid${gridDisplay ? ' active' : ''}`} />
                                                    </button>
                                                </li>

                                                <li>
                                                    <button type="button" className="btn" onClick={() => this.setState({ gridDisplay: false }, () => { window.localStorage.setItem('gridDisplay', 'false'); })}>
                                                        <i className={`ico-list${!gridDisplay ? '-active' : ''}`} />
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>{/* <!-- /.grid-toggle --> */}
                                    </div>{/* <!-- /.bar-filters --> */}
                                </div>{/* <!-- /.tab-filter --> */}

                                <div className="container container--flex align-top" style={themeConfig && themeConfig.find(t => t.key === 'filters') && themeConfig.find(t => t.key === 'filters').value === 'right' ? { flexDirection: "row-reverse" } : {}}>

                                    <div className={`tab-filter${this.state.tab === 'filter2' ? ' current' : ''}`} id="filter2" style={themeConfig && themeConfig.find(t => t.key === 'filters') && themeConfig.find(t => t.key === 'filters').value === 'none' ? { display: "none" } : {}}>
                                        <NSFilters
                                            search={this.props.router.query.search}
                                            color="#f00"
                                            globalMin={this.state.globalMin}
                                            min={this.state.min}
                                            location="search"
                                            globalMax={this.state.globalMax}
                                            max={this.state.max}
                                            itemspp={itemsPerPages}
                                            page={current}
                                            t={t}
                                            reload={this.onPageChange}
                                        />
                                    </div>{/* <!-- /.tab-filter --> */}

                                    <div className="content">
                                        <div className="products-grid" itemScope itemType="http://schema.org/ItemList">
                                            {
                                                products.map((product) => <NSProductCard from="search" gridDisplay={gridDisplay} key={product._id} type="data" value={product} t={t} gNext={{ Head, Link, Router }} />)
                                            }
                                            {
                                                products.length === 0 && <p style={{ textAlign: 'center', width: '100%' }}>{t('aucunResultat')}</p>
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
                            </div>{/* <!-- /.shell --> */}
                        </div>{/* <!-- /.main --> */}
                    </div>
                </Layout>
            </NSContext.Provider>
        );
    }
}

export default withRouter(withI18next(['category', 'product-card'])(PageSearch));
