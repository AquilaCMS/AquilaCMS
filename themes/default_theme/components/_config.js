import React from 'react';
import {
    _NSconfig
} from 'aqlrc'; // Import depuis AQLRC de la config par défaut
import BlockSlider from './BlockSlider';
import SearchBar from './SearchBar';
import ButtonLogin from './ButtonLogin';
import CartCounter from './CartCounter';

// On surcharge la config par défaut de AQLRC si besoin
// A noter que <Link> et <CMS> sont déjà gérés directement dans le composant CMS, il faut utiliser respectivement "ns-link" et "ns-cms"
// A garder dans l'ordre alphabétique en fonction du nom du composant SVP
export default {
    ..._NSconfig,
    'ns-block-slider' : <BlockSlider />,
    'ns-search' : <SearchBar />,
    'ns-btn-login' : <ButtonLogin />,
    'ns-cart-counter' : <CartCounter />
};