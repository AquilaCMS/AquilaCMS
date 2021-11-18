import React from 'react';
import {
    NSPageCart, NSCodePromo, NSContext, NSProductStock
} from 'aqlrc';
import Head from 'next/head';
import { Link, Router } from 'routes';
import Layout from 'components/Layout';
import { withI18next } from 'lib/withI18n';
import { listModulePage } from 'lib/utils';

/**
 * PageCart - Page panier (surcharge NSPageCart)
 * @return {React.Component}
 */

class PageCart extends NSPageCart {
    render() {
        const {
            lang, oCmsHeader, oCmsFooter, routerLang, sitename, t
        } = this.props;
        const {
            cart, countries, estimatedFee, shipment, countryCode, taxDisplay
        } = this.state;
        return (
            <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                <Layout header={oCmsHeader.content} footer={oCmsFooter.content}>
                    <Head>
                        <title>{sitename} | {t('cart:page.title')}</title>
                        <meta property="og:type" content="website" />
                    </Head>
                    <div className="main">
                        <div className="shell">
                            <section className="section-shopping-cart">
                                <header className="section__head section__head--mobile-flex">
                                    <h1>
                                        <i className="ico-shopping-cart-large hidden-xs" />{t('cart:page.header.title')}
                                    </h1>
                                    <button type="submit" className="btn btn--red visible-xs-block" onClick={() => this.validateCart(Router)}>{t('cart:page.header.link')}</button>
                                </header>
                                {/* <!-- /.section__head --> */}

                                <div className="container--flex align-top">
                                    <div className="content content--left">
                                        <div className="section__content">
                                            <div className="section__body">
                                                <div className="products-cart">
                                                    <div className="products__head">
                                                        <span className="counter">{cart && cart.items ? cart.items.filter(item => !item.typeDisplay).length : 0} {t('cart:page.cart.products')}</span>

                                                        <div className="products__labels">
                                                            <ul>
                                                                <li>
                                                                    <span>{t('cart:page.cart.quantity')}</span>
                                                                </li>

                                                                <li>
                                                                    <span>{t(`cart:page.cart.unit_price.${taxDisplay}`)}</span>
                                                                </li>

                                                                <li>
                                                                    <span>{t(`cart:page.cart.price_total.${taxDisplay}`)}</span>
                                                                </li>
                                                            </ul>
                                                        </div>
                                                        {/* <!-- /.products__labels --> */}
                                                    </div>
                                                    {/* <!-- /.products__head --> */}

                                                    <div className="products__body">
                                                        {
                                                            cart && cart.items && cart.items.filter(item => !item.typeDisplay).map((item, index) => {
                                                                let basePriceATI = null;
                                                                let descPromo    = '';
                                                                let descPromoT   = '';
                                                                if (cart.quantityBreaks && cart.quantityBreaks.productsId && cart.quantityBreaks.productsId.length) {
                                                                    // On check si le produit courant a recu une promo
                                                                    const prdPromoFound = cart.quantityBreaks.productsId.find((productId) => productId.productId === item.id);
                                                                    if (prdPromoFound) {
                                                                        basePriceATI = prdPromoFound.basePriceATI;
                                                                        descPromo = (
                                                                            <del><span className="price" style={{ color: '#979797' }}>{(basePriceATI).aqlRound(2)}€</span></del>
                                                                        );
                                                                        descPromoT = (
                                                                            <del><span className="price" style={{ color: '#979797' }}>{(basePriceATI * item.quantity).aqlRound(2)}€</span></del>
                                                                        );
                                                                    }
                                                                }
                                                                let imgAlt     = 'illustration produit';
                                                                
                                                                return (
                                                                    <div key={item._id} hidden={item.typeDisplay} className="product-cart" style={{ cursor: 'pointer' }} onClick={() => Router.pushRoute(item.canonical)}>
                                                                        <div className="product__image">
                                                                            <button style={{ border: '0', background: 'transparent', height: '100%' }} type="button">
                                                                                <img src={`/images/${item.selected_variant ? 'productsVariant' : 'products'}/196x173/${item.image}/${item.code}.jpg`} alt={imgAlt} />
                                                                            </button>
                                                                        </div>
                                                                        {/* <!-- /.product__image --> */}

                                                                        <div className="product__content">
                                                                            <button
                                                                                style={{ border: '0', background: 'transparent' }} type="button" className="btn-delete" onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    this.deleteProduct(index);
                                                                                }}
                                                                            >
                                                                                <i className="ico-trash-cans" />
                                                                            </button>

                                                                            <div className="product__entry">
                                                                                <h2 style={{ overflow: 'hidden' }}>
                                                                                    <button
                                                                                        style={{
                                                                                            border : '0', background : 'transparent', overflow : 'hidden', textAlign : 'left'
                                                                                        }} type="button"
                                                                                    >
                                                                                        {item.name}
                                                                                    </button>
                                                                                </h2>

                                                                                <h5>
                                                                                    {item.description1 ? item.description1.title : ''}
                                                                                </h5>

                                                                                {
                                                                                    item.selections && item.selections.length > 0 && (
                                                                                        <div className="menu-product">
                                                                                            <ul>
                                                                                                {
                                                                                                    item.selections.map((section) => (
                                                                                                        section.products.map((productSection, indexSel) => {
                                                                                                            const bundleSection = item.bundle_sections.find((bundle_section) => bundle_section.ref === section.bundle_section_ref);
                                                                                                            const correctProduct = bundleSection ? bundleSection.products.find((product) => product.id === productSection._id) : null;
                                                                                                            let toDisplay = '';
                                                                                                            if (bundleSection && correctProduct && correctProduct.modifier_price && correctProduct.modifier_price[taxDisplay]) {
                                                                                                                toDisplay = (correctProduct.modifier_price[taxDisplay] > 0 ? '+' : '') + correctProduct.modifier_price[taxDisplay] + '€'
                                                                                                            }
                                                                                                            return (<li key={indexSel}>{productSection.name} {toDisplay}</li>)
                                                                                                        })
                                                                                                    ))
                                                                                                }
                                                                                            </ul> 
                                                                                        </div>
                                                                                    )
                                                                                }

                                                                                <NSProductStock stock={item.stock} />
                                                                            </div>
                                                                            {/* <!-- /.product__entry --> */}

                                                                            <div className="product__actions">
                                                                                <div className="product-qty">
                                                                                    <div className="form__row form__row--flex">
                                                                                        <label htmlFor={`field-qty-${item._id}`} className="form__label hidden">{t('cart:page.cart.quantity')}</label>
                                                                                        <div className="form__controls qty-controls">
                                                                                            <button
                                                                                                type="button" className="btn-qty-change btn-decrement" onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    this.qtyModifier('-', index);
                                                                                                }}
                                                                                            >-
                                                                                            </button>
                                                                                            <input type="text" className="field" name={`field-qty-${item._id}`} id={`field-qty-${item._id}`} value={item.quantity} readOnly />
                                                                                            <button
                                                                                                type="button" className="btn-qty-change btn-increment" onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    this.qtyModifier('+', index);
                                                                                                }}
                                                                                            >+
                                                                                            </button>
                                                                                        </div>
                                                                                        {/* <!-- /.form__controls --> */}
                                                                                    </div>
                                                                                    {/* <!-- /.form__row --> */}
                                                                                </div>
                                                                                {/* <!-- /.product-qty --> */}

                                                                                <div className="product-price product-price-single">
                                                                                    {
                                                                                        item.price.special && item.price.special.ati
                                                                                            ? (
                                                                                                <del><span
                                                                                                    className="price__old"
                                                                                                >{item.price.unit.ati.aqlRound(2)}€</span>
                                                                                                </del>
                                                                                            )
                                                                                            : descPromo
                                                                                    }
                                                                                    <strong>
                                                                                        <span>
                                                                                            {
                                                                                                this.getUnitPrice(item).aqlRound(2)
                                                                                            }
                                                                                        </span>€
                                                                                    </strong>
                                                                                </div>

                                                                                <div className="product-price">
                                                                                    {
                                                                                        item.price.special && item.price.special.ati
                                                                                            ? (
                                                                                                <del><span
                                                                                                    className="price__old"
                                                                                                >{(item.price.unit.ati * item.quantity).aqlRound(2)}€</span>
                                                                                                </del>
                                                                                            )
                                                                                            : descPromoT
                                                                                    }
                                                                                    <strong>
                                                                                        {(this.getUnitPrice(item) * item.quantity).aqlRound(2)}€
                                                                                    </strong>
                                                                                </div>
                                                                            </div>
                                                                            {/* <!-- /.product__actions --> */}
                                                                        </div>
                                                                        {/* <!-- /.product__content --> */}
                                                                    </div>
                                                                );
                                                            })
                                                        }
                                                        {
                                                            (!cart || !cart.items || cart.items.length === 0) && (
                                                                <div className="product-cart">
                                                                    <p style={{ textAlign: 'center', width: 'auto' }}>{t('cart:page.cart.empty')}</p>
                                                                </div>
                                                            )
                                                        }
                                                    </div>
                                                    {/* <!-- /.products__body --> */}
                                                    <footer className="products__foot">
                                                        <Link route="home" params={{ lang: routerLang }}>
                                                            <a className="btn btn--silver">{t('cart:page.cart.continue_buying')}</a>
                                                        </Link>
                                                    </footer>{/* <!-- /.products__foot --> */}
                                                </div>{/* <!-- /.products --> */}
                                            </div>{/* <!-- /.section__body --> */}
                                        </div>{/* <!-- /.section__content --> */}
                                        <div>
                                            {
                                                listModulePage('cart')
                                            }
                                        </div>
                                    </div>{/* <!-- /.content --> */}

                                    <aside className="sidebar sidebar--alt sidebar-visible-on-mobile">
                                        <div className="widget-form">
                                            <div className="form-order-additions">
                                                {cart.priceSubTotal && (
                                                    <div className="form__group">
                                                        <div className="price price-total">
                                                            <span>{`${t('cart:page.cart.sousTotal')} ${t(`common:price.${taxDisplay}`)}`}</span>

                                                            <span style={{ whiteSpace: 'nowrap' }}>{cart.priceSubTotal[taxDisplay].aqlRound(2)} €</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {/* <!-- /.form__group --> */}

                                                <div className="form__group">
                                                    <div className="form__head">
                                                        <h6>{t('cart:page.delivery.question_discount')}</h6>
                                                    </div>
                                                    {/* <!-- /.form__head --> */}

                                                    <div className="form__body">
                                                        <NSCodePromo t={t} />
                                                    </div>
                                                </div>
                                                {/* <!-- /.form__group --> */}

                                                <div className="form__group">
                                                    {
                                                        cart.items.length > 0 && (
                                                            <>
                                                                <div className="form__head">
                                                                    <h6>{t('cart:page.cart.estimated_delivery')}</h6>
                                                                </div>
                                                                {/* <!-- /.form__head --> */}

                                                                <div className="form__body" style={{ borderBottom: 'solid 1px #d5d5d5', marginBottom: '5px' }}>
                                                                    <div className="form__row">
                                                                        <label htmlFor="field-country" hidden className="form__label">{t('cart:page.delivery.country')}</label>
                                                                        <div className="form__controls">
                                                                            <div className="select">
                                                                                <select name="field-country" id="field-country" value={countryCode} onChange={(e) => this.changeEstimatedShipment(e.target.value)}>
                                                                                    {
                                                                                        countries.map((c) => <option key={c._id} value={c.code}>{c.name}</option>)
                                                                                    }
                                                                                </select>
                                                                            </div>
                                                                            {/* <!-- /.select --> */}
                                                                        </div>
                                                                        {/* <!-- /.form__controls --> */}
                                                                        <div style={{
                                                                            fontSize     : '14px',
                                                                            height       : '16px',
                                                                            marginBottom : '10px',
                                                                            color        : '#576fa1'
                                                                        }}
                                                                        >
                                                                            {
                                                                                shipment && estimatedFee >= 0
                                                                                    ? (
                                                                                        <>
                                                                                            <span style={{ float: 'left' }}>{t(`cart:page.delivery.estimate_fee.${taxDisplay}`)}</span>
                                                                                            <span style={{ float: 'right', fontWeight: 'bold' }}>{estimatedFee.aqlRound(2)} €</span>
                                                                                        </>
                                                                                    )
                                                                                    : <span>{t('cart:page.delivery.no_shipment')}</span>
                                                                            }
                                                                        </div>
                                                                        {
                                                                            cart.additionnalFees[taxDisplay] > 0
                                                                                && (
                                                                                    <div style={{
                                                                                        fontSize     : '14px',
                                                                                        height       : '16px',
                                                                                        marginBottom : '10px',
                                                                                        color        : '#576fa1'
                                                                                    }}
                                                                                    >
                                                                                        <span style={{ float: 'left' }}>{t('cart:page.cart.additionnal_fees')}</span>
                                                                                        <span style={{ float: 'right', fontWeight: 'bold' }}>{cart.additionnalFees[taxDisplay].aqlRound(2)} €</span>
                                                                                    </div>
                                                                                )
                                                                        }
                                                                    </div>
                                                                    {/* <!-- /.form__row --> */}
                                                                </div>

                                                                {/* <!-- /.form__body --> */}
                                                                <div className="form__actions">
                                                                    {
                                                                        cart.quantityBreaks && cart.quantityBreaks.discountATI
                                                                            ? (
                                                                                <div style={{
                                                                                    fontSize : '15px', marginBottom : '15px', height : '16px'
                                                                                }}
                                                                                >
                                                                                    <span style={{ float: 'left' }}>{t('cart:page.cart.cart_discount')}</span>
                                                                                    <span style={{ float: 'right' }}>-{cart.quantityBreaks.discountATI}€</span>
                                                                                </div>
                                                                            ) : ''
                                                                    }
                                                                    <div className="price price-total">
                                                                        <span>{`${t('cart:page.cart.total')} ${t(`common:price.${taxDisplay}`)}`}</span>
                                                                        <strong style={{ whiteSpace: 'nowrap' }}>{this.getTotalPrice()} €</strong>
                                                                    </div>
                                                                    {/* <!-- /.price --> */}
                                                                    <button type="submit" className="form__btn btn btn--block btn--red" onClick={() => this.validateCart(Router)}>{t('cart:page.cart.toOrder')}</button>
                                                                </div>
                                                            </>
                                                        )
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </aside>
                                </div>
                            </section>
                        </div>
                    </div>
                </Layout>
            </NSContext.Provider>
        );
    }
}

export default withI18next(['cart', 'common'])(PageCart);
