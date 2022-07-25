import React from 'react';
import { NSCartProductCounter } from 'aqlrc';

/**
 * NSCartProductCounter - Affiche l'icône du panier avec le nombre de produits qu'il contient
 * @prop t: (function) fonction translation de i18n
 * @prop gNext: (object) variables Next : Link
 * @return {React.Component}
 *
 * Nécessite pour fonctionner des données de contexte suivantes :
 * - "routerLang" / "urlLang" présents dans le contexte de la state de la page (chargés dans _app.js)
 */

class CartCounter extends NSCartProductCounter {
   render() {
        const { t, gNext } = this.props;
        const Link = (gNext && gNext.Link) || undefined;
        const { cart } = this.state;
        const { props } = this.context;
        if (!props) { return null; }
        const { routerLang, urlLang } = props;
        return (
            <span>
                {
                    cart && cart.items && cart.items.filter((item) => !item.typeDisplay).length > 0 ? <div className="cart-product-counter">{cart.items.filter((item) => !item.typeDisplay).length}</div> : null
                }
                {
                    Link !== undefined
                        ? (
                            <Link route="cart" params={{ lang: routerLang }}>
                                <a style={{ position: 'relative' }}>
                                <span className="material-symbols-outlined">shopping_cart</span>
                                </a>
                            </Link>
                        ) : (
                            <a href={`${urlLang}/cart`} style={{ position: 'relative' }}>
                                <span className="material-symbols-outlined">shopping_cart</span>
                            </a>
                        )
                }
            </span>
        );
    }
}

export default CartCounter;
