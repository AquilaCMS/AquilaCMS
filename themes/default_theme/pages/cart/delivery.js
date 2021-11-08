import React from 'react';
import moment from 'moment';
import {
    NSCartResume,
    NSContext,
    NSToast,
    cartToOrder,
    getCart,
    getLangPrefix,
    getShipmentsCart,
    updateDeliveryCart
} from 'aqlrc';
import PropTypes from 'prop-types'
import nsModules from 'modules/list_modules';
import Head from 'next/head';
import CartStructure from 'components/CartStructure';
import { withI18next } from 'lib/withI18n';
import { Link, Router } from 'routes';

/**
 * CartDelivery - Page des modes de livraison dans le panier
 * @return {React.Component}
 */

class CartDelivery extends React.Component {
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
            shipments: [],
            arrayPrices: [],
            isRelayPoint: false, // Check si on selectionne le transporteur en point relais
            // si un point relais est selectionné alors l'utilisateur doit sauvegarder l'adresse de livraison
            relayPointAddressSaved: false,
            // Addresse de livraison initial: si l'utilisateur choisi un point relais alors cart.addresses.delivery
            // sera l'addresse du point relais selectionné. Si il choisi un autre mode d'expédition après avoir selectionné un point relais,
            // alors on ajoutera deliveryAddress a cart.addresses.delivery
            deliveryAddress: null
        };
    }

    onLangChange = async (lang) => {
        window.location.pathname = `${await getLangPrefix(lang)}/cart/delivery`;
    }

    relayPointAddressSavedListener = (e) => {
        if (!this.state.isRelayPoint) {
            return;
        }
        // true ou false
        this.setState({ relayPointAddressSaved: e.detail });
    }

    componentDidMount = async () => {
        const { lang, routerLang, user } = this.props;
        const cartId = window.localStorage.getItem('cart_id');
        if (!cartId) {
            return Router.pushRoute('cart', { lang: routerLang });
        }
        // Récupération du panier
        let cart;
        try {
            const PostBody = { structure: { addresses: 1 }, populate: ['items.id'] };
            cart = await getCart(cartId, lang, PostBody);
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                NSToast.error(err.response.data.message);
            } else {
                NSToast.error('common:error_occured');
                console.error(err);
            }
            return setTimeout(() => {
                Router.pushRoute('cart', { lang: routerLang });
            }, 5000);
        }
        let deliveryAddress = null;
        if (user.addresses && user.addresses.length) {
            // On récupére l'adresse de livraison de l'utilisateur
            deliveryAddress = user.addresses[user.delivery_address];
        }

        let shipments;
        try {
            const PostBody = {
                limit: 999999,
                structure: {
                    component_template_front: 1,
                    config: 1
                }
            };
            shipments = await getShipmentsCart(cart, null, lang, PostBody);
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                NSToast.error(err.response.data.message);
            } else {
                NSToast.error('common:error_occured');
                console.error(err);
            }
            return;
        }

        this.setState({
            deliveryAddress,
            cart,
            index: shipments.datas.findIndex((ship) => ship._id === cart.delivery.method),
            shipments: shipments.datas,
            arrayPrices: shipments.arrayPrices
        });

        // Lorsque un point relais est saisi
        document.addEventListener('relayPointAddressSaved', this.relayPointAddressSavedListener);
    }

    onChangeSelect = async (e, index) => {
        // Si le transporteur est en point relais
        if (this.state.shipments[index].type === 'RELAY_POINT') {
            return this.setState({ index: e.target.checked ? index : -1, isRelayPoint: true });
        }
        return this.setState({ index: e.target.checked ? index : -1, isRelayPoint: false });
    };

    selectDelivery = async () => {
        const {
            lang, routerLang, cart, index, isRelayPoint, relayPointAddressSaved, shipments
        } = this.state;
        const cartId = window.localStorage.getItem('cart_id');

        if (index === -1) {
            return NSToast.warn('delivery:choose_delivery_mode');
        }

        // Un point relais a été selectionné mais aucune addresse n'a été sauvegardé
        if (isRelayPoint && !relayPointAddressSaved) {
            return NSToast.warn('delivery:choose_relay_point');
        }

        // Modification du mode de livraison du panier
        try {
            const updatedCart = await updateDeliveryCart(cartId, shipments[index], cart.addresses.delivery.isoCountryCode, lang);
            if (updatedCart.priceTotal.ati === 0) {
                // Transformation du panier en commande
                const order = await cartToOrder(cartId, lang);

                window.localStorage.removeItem('cart_id');
                window.localStorage.setItem('order', JSON.stringify(order));

                // Event pour Google Analytics
                const saveTransaction = new CustomEvent('saveTransaction', { detail: order });
                window.dispatchEvent(saveTransaction);

                return Router.pushRoute('cartSuccess', { lang: routerLang });
            }

            Router.pushRoute('cartPayment', { lang: routerLang });
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                NSToast.error(err.response.data.message);
            } else {
                NSToast.error('common:error_occured');
                console.error(err);
            }
        }
    };


    displayFrontModule = (ship, index) => {
        const Comp = nsModules.find((module) => module.code === ship.component_template_front).jsx.default;
        if (Comp) {
            return (
                <div key={ship.code} hidden={index !== this.state.index}>
                    {React.cloneElement(<Comp />, { onSuccess: () => console.log('trigger onSuccess'), shipment: ship, cart: this.state.cart })}
                </div>
            );
        }
    }

    render() {
        const {
            oCmsHeader, oCmsFooter, sitename, t
        } = this.props;
        const {
            shipments, cart, isRelayPoint, arrayPrices, relayPointAddressSaved
        } = this.state;
        return (
            <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                <CartStructure oCmsFooter={oCmsFooter} oCmsHeader={oCmsHeader} step={3}>
                    <Head>
                        <title>{sitename} | {t('delivery:livraison')}</title>
                        <meta property="og:type" content="website" />
                    </Head>
                    {
                        cart.items.length > 0 && (
                            <div className="container--flex align-top">
                                <div className="content content--left">
                                    <div className="section__content">
                                        <div className="form-shipping-address">
                                            <form onSubmit={(e) => { e.preventDefault(); this.selectDelivery(); }}>
                                                <div className="form__head hidden-xs">
                                                    <h3>{t('delivery:livraison')}</h3>
                                                </div>{ /* <!-- /.form__head --> */}

                                                <div className="form__body">
                                                    {
                                                        shipments.length ? shipments.map((ship, index) => (
                                                            <div key={ship._id} className="delivery-option delivery-option--featured">
                                                                <div className="radio radio-square radio-delivery">
                                                                    <input hidden type="radio" name="delivery-option" onChange={(e) => this.onChangeSelect(e, index)} id={`checkbox_${ship._id}_pickup`} checked={(this.state.index === -1 && cart && cart.delivery && cart.delivery.method === ship._id) || (this.state.index === index)} />

                                                                    <label htmlFor={`checkbox_${ship._id}_pickup`}>
                                                                        <img src={ship.url_logo} alt="" style={{ display: 'inline-block' }} />
                                                                        <strong>{ship.name}</strong>
                                                                        <em>{t('delivery:livraisonApartir')} {ship ? moment(ship.dateDelivery).format('DD/MM/YYYY') : '-'}
                                                                        </em>
                                                                    </label>
                                                                </div>{ /* <!-- /.radio --> */}
                                                                <strong className="delivery-price">{arrayPrices[ship.code].aqlRound(2)}€</strong>
                                                                {(ship.component_template_front && nsModules) ? this.displayFrontModule(ship, index) : null}
                                                            </div>
                                                        )) : <p>{t('delivery:no_shipment')}</p>
                                                    }
                                                </div>{ /* <!-- /.form__body --> */}
                                                <div className="form__actions  text-right" style={{ marginTop: '40px' }}>
                                                    <button className="btn btn--grey" style={{ float: 'left' }} onClick={() => { Router.back(); }} type="button">
                                                        {t('common:retour')}
                                                    </button>
                                                    {shipments.length ? <button disabled={isRelayPoint && !relayPointAddressSaved} type="submit" className="form__btn btn btn--red">{t('common:valider')}</button> : ''}
                                                </div>
                                            </form>
                                        </div>{ /* <!-- /.form-shipping-address --> */}
                                    </div>{ /* <!-- /.section__content --> */}
                                </div>{ /* <!-- /.content --> */}

                                {cart.items !== undefined && <NSCartResume t={t} gNext={{ Link }} showAddresses />}
                            </div>
                        )
                    }
                </CartStructure>
            </NSContext.Provider>
        );
    }

    componentWillUnmount() {
        document.removeEventListener('relayPointAddressSaved', this.relayPointAddressSavedListener);
    }
}

CartDelivery.propTypes = {
    lang: PropTypes.string,
    routerLang: PropTypes.string,
    user: PropTypes.object,
    oCmsHeader: PropTypes.object,
    oCmsFooter: PropTypes.object,
    sitename: PropTypes.string,
    t: PropTypes.func
}

export default withI18next(['delivery', 'cart', 'common'])(CartDelivery);
