import React from 'react';
import moment from 'moment';
import {
    NSCartResume, NSContext, NSToast, getCart, getLangPrefix, updateAddressesCart, getShipmentsCart, updateDeliveryCart
} from 'aqlrc';
import Head from 'next/head';
import CartStructure from 'components/CartStructure';
import { withI18next } from 'lib/withI18n';
import { Link, Router } from 'routes';

/**
 * CartDelivery - Page des modes de livraison dans le panier
 * @return {React.Component}
 */

class CartDelivery extends React.Component {
    static getInitialProps = async function (ctx) {
        return {
            userRequired : { url: '/cart/login', route: 'cartLogin' },
            layoutCms    : { header: 'header_cart', footer: 'footer_cart' }
        };
    };

    constructor(props) {
        super(props);
        this.state = {
            ...props,
            cart : {
                items : []
            },
            shipments                : [],
            arrayPrices              : [],
            isMondialRelay           : false, // Check si on selectionne le transporteur mondial relay
            MondialRelay             : null, // Composant mondial relay
            // si mondial relay est selectionné alors l'utilisateur doit sauvegarder l'adresse de livraison
            mondialRelayAddressSaved : false,
            // Addresse de livraison initial: si l'utilisateur choisi mondial relay alors cart.addresses.delivery
            // sera l'addresse mondial relay selectionné. Si il choisi un autre mode d'expédition après avoir selectionné MondialRelay,
            // alors on ajoutera deliveryAddress a cart.addresses.delivery
            deliveryAddress          : null
        };
    }

    onLangChange = async (lang) => {
        window.location.pathname = `${await getLangPrefix(lang)}/cart/delivery`;
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

        const MondialRelay = null;
        /* try {
            const list_modules = await import('modules/list_modules');
            const ModuleMondialRelay = list_modules.default.find((module) => module.code === 'aq-mondialrelay');
            if (ModuleMondialRelay) {
                MondialRelay = ModuleMondialRelay.jsx;
            }
        } catch (error) {
            MondialRelay = null;
            console.error(error);
        } */

        let shipments;
        try {
            shipments = await getShipmentsCart(cart, lang);
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
            MondialRelay,
            deliveryAddress,
            cart,
            index       : shipments.datas.findIndex((ship) => ship._id === cart.delivery.method),
            shipments   : shipments.datas,
            arrayPrices : shipments.arrayPrices
        });

        // Lorsque le module mondial relay sauvegarde l'adresse
        document.addEventListener('MondialRelayAddressSaved', (e) => {
            if (!this.state.isMondialRelay) {
                return;
            }
            // true ou false
            this.setState({ mondialRelayAddressSaved: e.detail });
        });
    }

    getDeliveryDate = (ship) => {
        const { cart } = this.state;
        const countryFound = ship.countries.find((country) => cart.addresses.delivery.isoCountryCode === country.country);
        if (!countryFound) return;
        const momentDate = moment()
            .add(Number(ship.preparation.delay), ship.preparation.unit)
            .add(Number(countryFound.delay), countryFound.unit);
        // We can't deliver on sunday
        if (new Date(momentDate._d).getDay() === 0) {
            return momentDate.add(1, 'days').format('L');
        }
        return momentDate.format('L');
    }

    onChangeSelect = async (e, index) => {
        // Si le transporteur est mondial relay
        if (this.state.shipments[index].code === 'MD') {
            return this.setState({ index: e.target.checked ? index : -1, isMondialRelay: true });
        }
        return this.setState({ index: e.target.checked ? index : -1, isMondialRelay: false });
    };

    selectDelivery = async () => {
        const {
            lang, routerLang, cart, index, isMondialRelay, deliveryAddress, mondialRelayAddressSaved, shipments
        } = this.state;
        const cartId = window.localStorage.getItem('cart_id');

        if (index === -1) {
            return NSToast.warn('delivery:choose_delivery_mode');
        }
        // MondialRelay a été selectionné mais aucune addresse n'a été sauvegardé
        /* if (isMondialRelay === true && mondialRelayAddressSaved === false) {
            return NSToast.warn('delivery:choose_relay_point');
        }
        // Une addresse MondialRelay a été sauvegardé et MondialRelay n'est plus selectionné (l'utilisateur a changé de transporteur)
        if (isMondialRelay === false) {
            // Alors cart.addresses.delivery a été modifié par MondialRelay, on défait ce changement avec l'addresse de l'utilisateur
            const addresses = { delivery: { ...deliveryAddress } };

            // Modification des adresses du panier
            try {
                await updateAddressesCart(cartId, addresses);
            } catch (err) {
                if (err.response && err.response.data && err.response.data.message) {
                    NSToast.error(err.response.data.message);
                } else {
                    NSToast.error('common:error_occured');
                    console.error(err);
                }
            }
        } */

        // Modification du mode de livraison du panier
        try {
            await updateDeliveryCart(cartId, shipments[index], cart.addresses.delivery.isoCountryCode, lang);

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

    render() {
        const {
            oCmsHeader, oCmsFooter, sitename, t
        } = this.props;
        const {
            routerLang, shipments, cart, MondialRelay, isMondialRelay, arrayPrices,
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
                                                </div>{ /* <!-- /.form__head --> */ }

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
                                                                </div>{ /* <!-- /.radio --> */ }
                                                                <strong className="delivery-price">{arrayPrices[ship.code].toFixed(2)}€</strong>
                                                                {
                                                                    this.state.shipments[index].code === 'MD' && isMondialRelay && MondialRelay
                                                                && (
                                                                    <div
                                                                        className="form__entry" style={{
                                                                            zIndex : 10, display : 'flex', width : '100%', justifyContent : 'center',
                                                                        }}
                                                                    >
                                                                        <MondialRelay />
                                                                    </div>
                                                                )
                                                                }
                                                            </div>
                                                        )) : <p>{t('delivery:no_shipment')}</p>
                                                    }
                                                </div>{ /* <!-- /.form__body --> */ }
                                                <div className="form__actions  text-right" style={{ marginTop: '40px' }}>
                                                    <button className="btn btn--grey" style={{ float: 'left' }} onClick={() => { Router.pushRoute('cartAddress', { lang: routerLang }); }} type="button">
                                                        {t('common:retour')}
                                                    </button>
                                                    {shipments.length ? <button type="submit" className="form__btn btn btn--red">{t('common:valider')}</button> : ''}
                                                </div>
                                            </form>
                                        </div>{ /* <!-- /.form-shipping-address --> */ }
                                    </div>{ /* <!-- /.section__content --> */ }
                                </div>{ /* <!-- /.content --> */ }

                                {cart.items !== undefined && <NSCartResume t={t} gNext={{ Link }} showAddresses />}
                            </div>
                        )
                    }
                </CartStructure>
            </NSContext.Provider>
        );
    }
}

export default withI18next(['delivery', 'cart', 'common'])(CartDelivery);
