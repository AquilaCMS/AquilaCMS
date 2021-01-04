import React from 'react';
import moment from 'moment';
import Head from 'next/head';
import {
    NSContext, NSToast, getOrderById, getLangPrefix, imgDefaultBase64
} from 'aqlrc';
import CartStructure from 'components/CartStructure';
import { withI18next } from 'lib/withI18n';
import { Router } from 'routes';

/**
 * CartSuccess - Page de confirmation de commande dans le panier
 * @return {React.Component}
 */

class CartSuccess extends React.Component {
    static getInitialProps = async function (ctx) {
        return {
            userRequired : { url: '/cart/login', route: 'cartLogin' }
        };
    };

    constructor(props) {
        super(props);
        this.state = {
            ...props,
            order      : {},
            taxDisplay : 'ati'
        };
    }

    componentDidMount = async () => {
        const { lang, routerLang } = this.props;
        const contextLang = window.localStorage.getItem('lang');
        if (contextLang && contextLang !== this.props.lang) {
            return this.onLangChange(contextLang);
        }
        const orderTemp = await JSON.parse(window.localStorage.getItem('order'));
        if (!orderTemp) {
            return Router.pushRoute('home', { lang: routerLang });
        }
        window.localStorage.removeItem('order');
        // EVENT ADD TO CART
        const event = new CustomEvent('placeOrder', { detail: { order: orderTemp } });
        window.dispatchEvent(event);

        try {
            // Récupération de la commande
            const PostBody = { populate: ['items.id'] };
            const order = await getOrderById(orderTemp._id, lang, PostBody);

            this.setState({ order, taxDisplay: order.priceTotal.paidTax ? 'ati' : 'et' });
            window.onpopstate = (event) => {
                Router.pushRoute('orders', { lang: routerLang });
            };
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                NSToast.error(err.response.data.message);
            } else {
                NSToast.error('common:error_occured');
                console.error(err);
            }
            setTimeout(() => {
                Router.pushRoute('home', { lang: routerLang });
            }, 5000);
        }
    }

    onLangChange = async (lang) => {
        window.location.pathname = `${await getLangPrefix(lang)}/cart/success`;
    };

    /**
     * Permet de récupérer le prix unitaire du produit avec promo appliqué si necessaire
     * @param {*} item item pour lequel on calcul le prix unitaire
     * @param {*} withTax withTax
     * @returns {number} prix unitaire
     */
    getUnitPrice(item, withTax) {
        const { order } = this.state;
        let { taxDisplay } = this.state;

        if (withTax !== undefined) {
            taxDisplay = withTax ? 'ati' : 'et';
        }

        let price = item.price.unit[taxDisplay];
        if (item.price && item.price.special && item.price.special[taxDisplay] >= 0) {
            price = item.price.special[taxDisplay];
        }
        if (order.quantityBreaks && order.quantityBreaks.productsId && order.quantityBreaks.productsId.length) {
            const qtyBreakFound = order.quantityBreaks.productsId.find((prdId) => prdId.productId === item.id._id);
            if (qtyBreakFound) {
                price -= qtyBreakFound[`discount${taxDisplay.toUpperCase()}`];
            }
        }
        return price;
    }

    checkDate = (date) => {
        const momentDate = moment(date);
        // We can't deliver on sunday
        if (new Date(momentDate._d).getDay() === 0) {
            return momentDate.add(1, 'days').format('DD/MM/YYYY');
        }
        return momentDate.format('DD/MM/YYYY');
    };

    render() {
        const {
            lang, oCmsHeader, oCmsFooter, routerLang, sitename, t
        } = this.props;
        const { order, taxDisplay } = this.state;
        const priceBefore = [];
        let messageOrder = '';
        if (order.status === 'PAID') {
            messageOrder = (
                <div className="shell">
                    <h5>
                        {t('success:page.title')}<strong>{order.id}</strong> {t('success:page.is_register')}.</h5>
                    <h6><i className="ico-check-green" />&nbsp;{t('success:page.mail_sent')}<strong>{order.customer.email}</strong></h6>
                </div>
            );
        } else if (order.status === 'PAYMENT_RECEIPT_PENDING') {
            messageOrder = (
                <div className="shell">
                    <h5>
                        {t('success:page.title')}<strong>{order.id}</strong> {t('success:page.is_register')} {t('success:page.payment_receipt_pending')}</h5>
                    <h6><i className="ico-check-green" />&nbsp;{t('success:page.mail_sent')}<strong>{order.customer.email}</strong></h6>
                </div>
            );
        } else {
            messageOrder = (
                <div className="shell">
                    <h5>
                        {t('success:page.title')}<strong>{order.id}</strong> {t('success:page.is_not_register')}</h5>
                    <h6><i className="ico-check-green" />&nbsp;{t('success:page.contact_us')}</h6>
                </div>
            );
        }
        return (
            <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                <CartStructure oCmsFooter={oCmsFooter} oCmsHeader={oCmsHeader} step={5} isClickable={false}>
                    <Head>
                        <title>{sitename} | {t('success:title')}</title>
                        <meta property="og:type" content="website" />
                    </Head>
                    <div className="main__inner">
                        <div className="shell ns-order-success">
                            {
                                order.addresses ? (
                                    <section className="section section--table">
                                        {messageOrder}
                                        <br /><br />
                                        <div className="shell">
                                            <h4>{t('success:page.sub_title')}</h4>
                                        </div>
                                        <div className="section__body" style={{ marginTop: '20px' }}>
                                            <div className="section__container">
                                                <div style={{ textAlign: 'center' }}>
                                                    <h5>
                                                        {t('success:page.delivery')} {order.delivery && order.delivery.name ? order.delivery.name : ''}
                                                    </h5>
                                                    {`${order.addresses.billing.lastname} ${order.addresses.billing.firstname}`}
                                                    <br />
                                                    {order.addresses.delivery.line1}
                                                    {order.addresses.delivery.line2 && <br />}
                                                    {order.addresses.delivery.line2}
                                                    <br />
                                                    {`${order.addresses.delivery.zipcode} ${order.addresses.delivery.city}`}
                                                    <br />
                                                    {order.addresses.delivery.isoCountryCode}
                                                    <br />
                                                    {
                                                        order.addresses.delivery.phone
                                                            ? `T. ${order.addresses.delivery.phone}`
                                                            : ''
                                                    }
                                                    <br />
                                                    <h5>
                                                        {t('success:page.deliveryDate')} :
                                                    </h5>
                                                    <h6>
                                                        {order.delivery && order.delivery.date && <strong>{this.checkDate(order.delivery.date)}</strong>}
                                                    </h6>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="section__body" style={{ marginTop: '30px' }}>
                                            <div className="section__container">
                                                <div style={{ textAlign: 'center', borderTop: '1px solid black' }}>
                                                    <br />
                                                    <h4 style={{ textAlign: 'left' }}>
                                                        {t('success:page.articles')}
                                                    </h4>
                                                </div>
                                                <div className="orders">
                                                    <div className="orders__body">
                                                        <div className="order__body">
                                                            <div className="table-order">
                                                                <table>
                                                                    <thead>
                                                                        <tr>
                                                                            <th>{t('success:page.label.article')}</th>
                                                                            <th>{t('success:page.label.quantity')}</th>
                                                                            <th>{t(`success:page.label.unit_price.${taxDisplay}`)}</th>
                                                                            <th>{t(`success:page.label.total.${taxDisplay}`)}</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {
                                                                            order.items.length > 0 ? order.items.map((item) => {
                                                                                let basePrice = null;
                                                                                let descPromo = '';
                                                                                let descPromoT = '';
                                                                                if (order.quantityBreaks && order.quantityBreaks.productsId.length) {
                                                                                // On check si le produit courant a recu une promo
                                                                                    const prdPromoFound = order.quantityBreaks.productsId.find((productId) => productId.productId === item.id.id);
                                                                                    if (prdPromoFound) {
                                                                                        basePrice = prdPromoFound[`basePrice${taxDisplay.toUpperCase()}`];
                                                                                        descPromo = (
                                                                                            <del><span className="price" style={{ color: '#979797' }}>{(basePrice).toFixed(2)}€</span></del>
                                                                                        );
                                                                                        descPromoT = (
                                                                                            <><del><span className="price" style={{ color: '#979797' }}>{(basePrice * item.quantity).toFixed(2)}€</span></del><br /></>
                                                                                        );
                                                                                    }
                                                                                }
                                                                                let imgDefault = imgDefaultBase64;
                                                                                let imgAlt = 'illustration produit';
                                                                                if (item.id.images && item.id.images.length) {
                                                                                    const foundImg = item.id.images.find((img) => img.default);
                                                                                    if (foundImg) {
                                                                                        imgDefault = foundImg._id !== 'undefined' ? `/images/products/82x82/${foundImg._id}/${item.id.slug[lang]}${foundImg.extension}` : imgDefault;
                                                                                        imgAlt = foundImg.alt || imgAlt;
                                                                                    } else {
                                                                                        imgDefault = item.id.images[0]._id !== 'undefined' ? `/images/products/82x82/${item.id.images[0]._id}/${item.id.slug[lang]}${foundImg.extension}` : imgDefault;
                                                                                        imgAlt = item.id.images[0].alt || imgAlt;
                                                                                    }
                                                                                }
                                                                                return (
                                                                                    <tr key={item.id._id} className="cart-item cart-item--small">
                                                                                        <td>
                                                                                            <div className="cart__container">
                                                                                                <figure className="cart__image" style={{ width: '82px' }}>
                                                                                                    <img src={imgDefault} alt={imgAlt} />
                                                                                                </figure>

                                                                                                <h5 className="cart__title">
                                                                                                    {item.id.name}
                                                                                                    {
                                                                                                        item.selections && <ul style={{fontSize: '13px'}}>
                                                                                                        {
                                                                                                            item.selections.map((section) => (
                                                                                                                section.products.map((productSection, indexSel) => (
                                                                                                                <li style={{listStyle: 'none'}} key={indexSel}>{productSection.name} {`${
                                                                                                                    (item.id.bundle_sections.find((bundle_section) => bundle_section.ref === section.bundle_section_ref) &&
                                                                                                                    item.id.bundle_sections.find((bundle_section) => bundle_section.ref === section.bundle_section_ref).products.find((product) => product.id === productSection.id) &&
                                                                                                                    item.id.bundle_sections.find((bundle_section) => bundle_section.ref === section.bundle_section_ref).products.find((product) => product.id === productSection.id).modifier_price &&
                                                                                                                    item.id.bundle_sections.find((bundle_section) => bundle_section.ref === section.bundle_section_ref).products.find((product) => product.id === productSection.id).modifier_price[taxDisplay]) ?
                                                                                                                        (item.id.bundle_sections.find((bundle_section) => bundle_section.ref === section.bundle_section_ref).products.find((product) => product.id === productSection.id).modifier_price[taxDisplay] > 0 ?
                                                                                                                        '+' :
                                                                                                                        '') +
                                                                                                                    item.id.bundle_sections.find((bundle_section) => bundle_section.ref === section.bundle_section_ref).products.find((product) => product.id === productSection.id).modifier_price[taxDisplay] + '€' :
                                                                                                                    ''
                                                                                                                }`}</li>
                                                                                                                ))
                                                                                                            ))
                                                                                                        }
                                                                                                        </ul>
                                                                                                    }
                                                                                                    <span
                                                                                                        className="cart__qty visible-sm-inline"
                                                                                                    > x {item.quantity}</span>
                                                                                                    <span className="price cart__price-single visible-sm-block">
                                                                                                        <span className="price__label">{t('success:page.label.unit_price')}</span>
                                                                                                        <span className="cart__price-inner">
                                                                                                            {
                                                                                                                item.price.special && item.price.special[taxDisplay]
                                                                                                                    ? (
                                                                                                                        <del><span
                                                                                                                            className="price__old"
                                                                                                                        >{item.price.unit[taxDisplay].toFixed(2)} €</span>
                                                                                                                        </del>
                                                                                                                    )
                                                                                                                    : descPromo
                                                                                                            }
                                                                                                            <span>{this.getUnitPrice(item).toFixed(2)}</span> €
                                                                                                        </span>
                                                                                                    </span>
                                                                                                </h5>
                                                                                            </div>
                                                                                        </td>

                                                                                        <td>
                                                                                            <span className="cart__qty">{item.quantity}</span>
                                                                                        </td>

                                                                                        <td className="hidden-sm">
                                                                                            <span className="price cart__price-single">
                                                                                                {
                                                                                                    item.price.special && item.price.special[taxDisplay]
                                                                                                        ? (
                                                                                                            <del><span
                                                                                                                className="price__old"
                                                                                                            >{item.price.unit[taxDisplay].toFixed(2)} €</span>
                                                                                                            </del>
                                                                                                        )
                                                                                                        : descPromo
                                                                                                }
                                                                                                <span>{this.getUnitPrice(item).toFixed(2)} €</span>
                                                                                            </span>
                                                                                        </td>
                                                                                        <td>
                                                                                            <span className="price cart__price-total">
                                                                                                {
                                                                                                    item.price.special && item.price.special[taxDisplay]
                                                                                                        ? (
                                                                                                            <><del><span
                                                                                                                className="price__old"
                                                                                                            >{(item.price.unit[taxDisplay] * item.quantity).toFixed(2)} €</span>
                                                                                                            </del><br /></>
                                                                                                        )
                                                                                                        : descPromoT
                                                                                                }
                                                                                                <span>{(this.getUnitPrice(item) * item.quantity).toFixed(2)}</span> €
                                                                                                {taxDisplay === 'ati' && (
                                                                                                    <span className="price__meta"><br />{t('success:page.taxes_includes')} : <span>{((this.getUnitPrice(item, true) * item.quantity) - (this.getUnitPrice(item, false) * item.quantity)).toFixed(2)}</span> €
                                                                                                    </span>
                                                                                                )}
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            }) : ''
                                                                        }
                                                                    </tbody>
                                                                </table>
                                                                <br />
                                                                <div className="table__total">
                                                                    <div className="table__cols">
                                                                        <div className="table__col">
                                                                            {
                                                                                order.payment && order.payment[0] ? (
                                                                                    <dl>
                                                                                        <dt>{t('success:page.payment_method')}</dt>
                                                                                        {/* <dd><strong>{order.payment[0].mode === 'CB' ? t('success:page.credit_card') : t('success:page.transfert')}</strong></dd> */}
                                                                                        <dd><strong>{order.payment[0].mode}</strong></dd>
                                                                                    </dl>
                                                                                ) : ''
                                                                            }
                                                                        </div>

                                                                        <div className="table__col">
                                                                            {
                                                                                order.quantityBreaks && order.quantityBreaks[`discount${taxDisplay.toUpperCase()}`]
                                                                                    ? (
                                                                                        <div style={{
                                                                                            fontSize : '14px', marginBottom : '10px', height : '16px', textAlign : 'center'
                                                                                        }}
                                                                                        >
                                                                                            <span>{t('success:page.cart_discount')} -{order.quantityBreaks[`discount${taxDisplay.toUpperCase()}`]}€</span>
                                                                                        </div>
                                                                                    ) : ''
                                                                            }
                                                                            {
                                                                                order.promos && order.promos.length > 0 ? order.promos.map((promo, index) => {
                                                                                    if (index === 0) {
                                                                                        priceBefore.push((order.priceTotal[taxDisplay] + promo[`discount${taxDisplay.toUpperCase()}`]).toFixed(2));
                                                                                    } else {
                                                                                        const find = index - 1;
                                                                                        priceBefore.push((parseFloat(priceBefore[find]) + promo[`discount${taxDisplay.toUpperCase()}`]).toFixed(2));
                                                                                    }
                                                                                    return '';
                                                                                }) : ''
                                                                            }
                                                                            {
                                                                                order.promos && order.promos.length > 0 ? order.promos.map((promo, index) => {
                                                                                    const count = order.promos.length - (index + 1);
                                                                                    return (
                                                                                        <h6 key={promo.code} className="table__total-value">
                                                                                            {t(`page.sous_total_order.${taxDisplay}`)}: {priceBefore[count]}€
                                                                                            <br />
                                                                                            <span>
                                                                                                <small style={{ color: '#dc5d45' }}>
                                                                                                    {t('success:page.discount_code')} ({promo.code}) : -{promo[`discount${taxDisplay.toUpperCase()}`].toFixed(2)}€<br />
                                                                                                    {promo.description}
                                                                                                </small>
                                                                                            </span>
                                                                                        </h6>
                                                                                    );
                                                                                }) : ''
                                                                            }
                                                                            <h6 className="table__total-value">
                                                                                {t(`page.total_order.${taxDisplay}`)}: {order.priceTotal[taxDisplay].toFixed(2)}€
                                                                                <br />
                                                                                {taxDisplay === 'ati' && <small style={{ color: '#dc5d45' }}>{t('success:page.taxes_includes')} : {(order.priceTotal.ati - order.priceTotal.et).toFixed(2)} €</small>}
                                                                                {
                                                                                    order.delivery.price[taxDisplay] > 0 ? <><br /><small style={{ color: '#dc5d45' }}> {t(`page.fee_shipping.${taxDisplay}`)}: {(order.delivery.price[taxDisplay]).toFixed(2)} €</small></> : ''
                                                                                }
                                                                                {
                                                                                    order.additionnalFees[taxDisplay] > 0 ? <><br /><small style={{ color: '#dc5d45' }}> {t('page.additionnal_fees')}: {order.additionnalFees[taxDisplay].toFixed(2)} €</small></> : ''
                                                                                }
                                                                            </h6>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                ) : ''
                            }
                        </div>
                    </div>
                    <div>
                        <button className="btn btn--grey btn-retour" onClick={() => Router.pushRoute('orders', { lang: routerLang })} type="button">
                            {t('common:retour')}
                        </button>
                    </div>
                    <style jsx>{`
                    td{
                        text-align: center;
                    }
                `}</style>
                </CartStructure>
            </NSContext.Provider>
        );
    }
}

export default withI18next(['success', 'common'])(CartSuccess);
