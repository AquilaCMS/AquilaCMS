import React from 'react';
import Head from 'next/head';
import {
    NSCartResume,
    NSContext,
    NSToast,
    getCart,
    getPayementMethodsCart,
    getLangPrefix,
    jwtManager,
    cartToOrder,
    deferredPaymentOrder
} from 'aqlrc';
import PropTypes from 'prop-types'
import CartStructure from 'components/CartStructure';
import { withI18next } from 'lib/withI18n';
import { Link, Router } from 'routes';
import nsModules from 'modules/list_modules';

/**
 * CartPayment - Page des modes de paiement dans le panier
 * @return {React.Component}
 */

class CartPayment extends React.Component {
    static getInitialProps = async function () {
        return {
            userRequired: { url: '/cart/login', route: 'cartLogin' },
            layoutCms: { header: 'header_cart', footer: 'footer_cart' }
        };
    };

    constructor(props) {
        super(props);
        this.state = {
            ...props,
            cart: {
                items: []
            },
            paymentMethods: [],
            paymentForm: null
        };
    }

    onLangChange = async (lang) => {
        window.location.pathname = `${await getLangPrefix(lang)}/cart/payment`;
    }

    componentDidMount = async () => {
        const { lang, routerLang } = this.props;
        const cartId = window.localStorage.getItem('cart_id');
        if (!cartId) {
            return Router.pushRoute('cart', { lang: routerLang });
        }

        let cart;
        let paymentMethods;
        try {
            // Récupération du panier
            let PostBody = { structure: { addresses: 1 }, populate: ['items.id'] };
            cart = await getCart(cartId, lang, PostBody);

            // Récupération des modes de paiement
            PostBody = {
                structure: { component_template_front: 1, makePayment: 1, details: 1 },
                limit: 100
            };
            paymentMethods = await getPayementMethodsCart(lang, PostBody);
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                NSToast.error(err.response.data.message);
            } else {
                NSToast.error('common:error_occured');
                console.error(err);
            }
            setTimeout(() => {
                Router.pushRoute('cart', { lang: routerLang });
            }, 5000);
            return;
        }

        this.setState({
            cart,
            paymentMethods: paymentMethods.datas
        });
    }

    handlePaymentSubmit = async (paymentMethod) => {
        const { lang, routerLang } = this.props;
        const cartId = window.localStorage.getItem('cart_id');

        if (paymentMethod === undefined) {
            NSToast.warn('payment:no_payment_sel');
            return;
        }

        // Transformation du panier en commande
        let order;
        try {
            order = await cartToOrder(cartId, lang);
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                NSToast.error(err.response.data.message);
            } else {
                NSToast.error('common:error_occured');
                console.error(err);
            }
        }

        // Event pour Google Analytics
        const saveTransaction = new CustomEvent('saveTransaction', { detail: order });
        window.dispatchEvent(saveTransaction);

        window.localStorage.setItem('order', JSON.stringify(order));

        if (order.priceTotal.ati === 0) {
            if (Router !== undefined) {
                Router.pushRoute('cartSuccess', { lang: routerLang });
            } else {
                window.location.pathname = `/${routerLang}/cart/success`;
            }
            return;
        }

        // Paiement de la commande
        try {
            const paymentForm = await deferredPaymentOrder(order.number, paymentMethod.code, lang); // /!\ S'APPELLE deffered MAIS RENVOIE BIEN VERS LA FONCTION GENERIQUE
            if (paymentForm.status && paymentForm.status !== 200) {
                if (paymentForm.message) {
                    NSToast.error(paymentForm.message);
                } else {
                    NSToast.error('common:error_occured');
                }
            } else {
                this.setState({ paymentForm }, () => {
                    document.getElementById('paymentid').submit();
                });
            }
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                NSToast.error(err.response.data.message);
            } else {
                NSToast.error('common:error_occured');
                console.error(err);
            }
        }
    };

    renderPaymentMethod = (pm) => {
        const { cart } = this.state;
        if (pm.component_template_front && nsModules) {
            const Comp = nsModules.find((module) => module.code === pm.component_template_front).jsx.default;
            if (Comp) {
                return (
                    <div key={pm.code} className="payment-option payment-option--featured">
                        <div className="radio radio-square radio-payment radio-payment-cards">
                            {React.cloneElement(<Comp />, { amount: cart.priceTotal[jwtManager.getTaxDisplay()], paymentMethod: pm, currency: 'EUR' })}
                        </div>
                    </div>
                );
            }
        } else {
            return (
                <div key={pm.code} className="payment-option payment-option--featured">
                    <div className="radio radio-square radio-payment radio-payment-cards">
                        <input hidden onClick={() => this.setState({ pm })} type="radio" name="payment-options" id={`field-payment-card-${pm.code}`} />

                        {pm.name ? (
                            <label htmlFor={`field-payment-card-${pm.code}`}>
                                <i>
                                    <img src={pm.urlLogo ? pm.urlLogo : ''} alt={pm.name} width="62" height="134" />
                                </i>
                                {pm.description}
                            </label>
                        ) : (
                                <label htmlFor={`field-payment-card-${pm.code}`}>{pm.code}</label>
                            )}
                    </div>
                </div>
            );
        }
    }

    render() {
        const {
            oCmsHeader, oCmsFooter, sitename, t
        } = this.props;
        const {
            cart, pm, paymentMethods, paymentForm
        } = this.state;
        const sortedArray = paymentMethods.sort((a, b) => a.sort - b.sort);
        return (
            <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                <CartStructure oCmsFooter={oCmsFooter} oCmsHeader={oCmsHeader} step={4}>
                    <Head>
                        <title>{sitename} | {t('common:steps.paiement')}</title>
                        <meta property="og:type" content="website" />
                    </Head>
                    {
                        cart.items.length > 0 && (
                            <section className="section-payment">
                                <div className="container--flex align-top">
                                    <div className="content content--left">
                                        <div className="section__content">
                                            <div className="form-payment">
                                                    <div className="form__head">
                                                        <h3 className="hidden-xs">{t('common:steps.paiement')}</h3>

                                                        <p><em>{t('common:choisirMoyen')}&nbsp;:</em></p>
                                                    </div>
                                                    <div className="form__body">
                                                        {
                                                            sortedArray ? sortedArray.map(this.renderPaymentMethod) : (
                                                                <div>{t('payment:no_method')}</div>
                                                            )
                                                        }
                                                    </div>
                                                    <div className="form__actions  text-right" style={{ marginTop: '40px' }}>
                                                        <button
                                                            className="btn btn--grey"
                                                            style={{ float: 'left' }}
                                                            onClick={() => Router.back()}
                                                            type="button"
                                                        >
                                                            {t('common:retour')}
                                                        </button>
                                                        <button type="button" className="form__btn btn btn--red" onClick={() => this.handlePaymentSubmit(pm)}>
                                                            {t('common:steps.paiement')}
                                                        </button>
                                                    </div>
                                                <div className="content" dangerouslySetInnerHTML={{ __html: paymentForm }} hidden />
                                            </div>
                                        </div>{/* <!-- /.section__content --> */}
                                    </div>{/* <!-- /.content --> */}

                                    {cart.items !== undefined && <NSCartResume t={t} gNext={{ Link }} showAddresses />}
                                </div>{/* <!-- /.container--flex --> */}
                            </section>
                        )
                    }
                </CartStructure>
            </NSContext.Provider>
        );
    }
}

CartPayment.propTypes = {
    lang: PropTypes.string,
    routerLang: PropTypes.string,
    oCmsHeader: PropTypes.object,
    oCmsFooter: PropTypes.object,
    sitename: PropTypes.string,
    t: PropTypes.func.isRequired,
}

export default withI18next(['cart', 'payment'])(CartPayment);
