import React from 'react';
import Lightbox from 'lightbox-react';
import Head from 'next/head';
import ModalR from 'react-responsive-modal';
import moment from 'moment';
import { withRouter } from 'next/router';
import {
    NSPageProduct,
    NSBreadcrumb,
    NSContext,
    NSDrawStars,
    NSBundleProduct,
    NSProductCard,
    NSProductCardList,
    NSProductStock,
    imgDefaultBase64,
    NSToast,
    truncate
} from 'aqlrc';
import { withI18next } from 'lib/withI18n';
import {
    listModulePage,
    getCurrencySymbol,
    caculateNewPrice
} from 'lib/utils';
import CMS from 'components/CMS';
import Layout from 'components/Layout';
import routes, { Link, Router } from 'routes';
import Error from './_error';

/**
 * PageProduct - Page produit (surcharge NSPageProduct)
 * @return {React.Component}
 */

class PageProduct extends NSPageProduct {
    constructor(props) {
        super(props);
        const { lang } = this.props;
        this.state = {
            ...this.state,
            options: this.setDefaultOptions(this.state.product, lang)
        };
        this.state = {
            ...this.state,
            optionsModifier: caculateNewPrice(this.state.product, this.state.options, this.state.taxDisplay)
        };
    }

    changeOneOptions = (optionsCode, event) => {
        const { lang } = this.props;
        const optionsValue = event.target.value;
        let { options } = this.state;
        if (!options) {
            options = [];
        }
        const { product } = this.state;
        const base = product.options;

        const index = options.findIndex((element) => {
            return element.code === optionsCode
        });
        let id;
        const optionsType = product.options.find(element => element.code == optionsCode).type;
        if (optionsType === "textfield" || optionsType === "number") {
            id = product.options.find(element => element.code == optionsCode).values[0]._id;
        } else {
            id = product.options.find(element => element.code == optionsCode).values.find(oneValue => oneValue.name[lang] == optionsValue)._id;
        }
        if (index > -1) {
            if (optionsType == "checkbox") {
                const indexOfValue = options[index].values.findIndex(element => element._id == id);
                if (indexOfValue > -1) {
                    options[index].values[indexOfValue] = {
                        _id: id,
                        values: optionsValue
                    };
                } else {
                    options[index].values.push({
                        _id: id,
                        values: optionsValue
                    });
                }
            } else {
                // only one value
                options[index].values = [{
                    _id: id,
                    values: optionsValue
                }];
            }
        } else {
            options.push({
                code: optionsCode,
                _id: product.options.find(element => element.code == optionsCode)._id,
                values: [{
                    _id: id,
                    values: optionsValue
                }]
            });
        }
        this.setState({
            options,
        });
        const { taxDisplay } = this.state;
        this.setState({
            optionsModifier: caculateNewPrice(product, options, taxDisplay)
        });
    };

    setDefaultOptions = (product, lang) => {
        let options = []
        if (typeof product !== "undefined" && typeof product.options !== "undefined") {
            for (const oneOptions of product.options) {
                if (oneOptions.mandatory === true && oneOptions.type !== "number" || oneOptions.type !== "textfield") {
                    const defaultValue = oneOptions.values.find(element => element.control.default === true);
                    if (typeof defaultValue !== "undefined") {
                        options.push({
                            code: oneOptions.code,
                            _id: oneOptions._id,
                            values: [{
                                _id: defaultValue._id,
                                values: defaultValue.name[lang]
                            }]
                        });
                    }
                }
            }
        }
        return options;
    }



    verifOptions = (options) => {
        const { product } = this.state;
        for (const oneOptions of product.options) {
            const indexOfOptions = options.findIndex((element) => {
                return element.code == oneOptions.code;
            });
            if (indexOfOptions > -1) {
                // the options is in the product
                if (oneOptions.mandatory === true && typeof options[indexOfOptions].values !== "undefined" && options[indexOfOptions].values.length > 0) {
                    // there is an options
                    // we need to check the oneOptions.control for values
                }
            } else {
                // the options isn't in the product
                // we check if it's mandatory
                if (oneOptions.mandatory) {
                    NSToast.warn('product:mandatoryOptionsNotSelected');
                    // the options is mandatory but not selected /!\ error
                    return false;
                }
            }
        }
        return true;
    }

    preAddToCart = () => {
        // check options
        const { lang } = this.props;
        const { product } = this.state;
        if (product && product.options) {
            // there is options in the product
            let { options } = this.state;
            if (typeof options === "undefined") {
                options = [];
            }
            if (typeof options === "undefined") {
                // we add mandatory options
                options = []
                for (const oneOptions of product.options) {
                    if (oneOptions && oneOptions.mandatory === true) {
                        const indexInOptions = options.findIndex(element => element._id === oneOptions._id);
                        if (index > -1) {
                            if (typeof options[indexInOptions].values === "undefined"
                                || options[indexInOptions].values === null
                                || options[indexInOptions].values.length == 0) {
                                NSToast.warn('product:mandatoryOptionsNotSelected');
                                return false;
                            }
                        } else {
                            NSToast.warn('product:mandatoryOptionsNotSelected');
                            return false;
                        }
                    }
                }
            }
            this.setState({
                options,
            });
            const res = this.verifOptions(options);
            if (res === true) {
                this.addToCart();
            }
        } else {
            return false;
        }
    }

    renderOptions = (element) => {
        const { lang } = this.props;
        if (element.type == "checkbox") {
            return (element.values.map((elementValue, index) => {
                if (elementValue.name && elementValue.name[lang]) {
                    return <>
                        <label key={elementValue._id}>{elementValue.name[lang]}</label>
                        <input key={elementValue._id + index} type="checkbox" />
                    </>
                }
            }));
        } else if (element.type == "number") {
            return (element.values.map((elementValue, index) => {
                if (elementValue.name && elementValue.name[lang]) {
                    return <>
                        <label key={elementValue._id}>{elementValue.name[lang]}</label>
                        <input onChange={(event) => { this.changeOneOptions(element.code, event) }} key={elementValue._id + index} type="number" />
                    </>
                }
            }));
        } else if (element.type == "textfield") {
            return (element.values.map((elementValue, index) => {
                if (elementValue.name && elementValue.name[lang]) {
                    return <>
                        <label key={elementValue._id}>{elementValue.name[lang]}</label>
                        <input onChange={(event) => { this.changeOneOptions(element.code, event) }} key={elementValue._id + index} type="text" />
                    </>
                }
            }));
        } else if (element.type == "list") {
            return (
                <select value={element.values.find((elementValue) => {
                    if (elementValue && element.control) {
                        return elementValue.control.mandatory === true
                    }
                    return false;
                })} onChange={(event) => { this.changeOneOptions(element.code, event) }}>
                    {
                        element.values.map((elementValue, index) => {
                            if (elementValue.name && elementValue.name[lang]) {
                                return (<option key={elementValue._id} value={elementValue.name[lang]}>{elementValue.name[lang]}</option>)
                            }
                        })
                    }
                </select >
            )
        }
    }

    render = () => {
        const {
            appurl,
            cmsProductContentBottom,
            lang,
            notFound,
            oCmsHeader,
            oCmsFooter,
            routerLang,
            sitename,
            t,
            themeConfig
        } = this.props;
        if (notFound) {
            return (
                <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                    <Error statusCode={404} message="Not found" oCmsHeader={oCmsHeader} oCmsFooter={oCmsFooter} />);
                </NSContext.Provider>
            );
        }
        const currencySymbol = getCurrencySymbol();
        const calcPrice = (price, modifier) => {
            let priceFinal;
            if (price[taxDisplay].special && price[taxDisplay].special > 0) {
                priceFinal = price[taxDisplay].special
            } else {
                priceFinal = price[taxDisplay].normal
            }
            if (typeof modifier !== "undefined") {
                priceFinal += modifier;
            }
            return priceFinal.toFixed(2);
        };
        const {
            openModal,
            openComment,
            photoIndex,
            isOpen,
            modalComment,
            openReviews,
            product,
            allCommentsDisplayed,
            hideReviewsLanguage,
            taxDisplay,
            optionsModifier
        } = this.state;
        const canonical = product.canonical ? `${appurl}${product.canonical.substr(1)}` : '';
        const imgStar = '/static/images/sprite/ico-star-full@2x.png';
        // Chemin de l'image non trouvé
        let imgDefault = imgDefaultBase64;
        let imgAlt = 'illustration produit';
        if (product && product.images && product.images.length) {
            const foundImg = product.images.find((img) => img.default);
            if (foundImg) {
                imgDefault = foundImg._id !== 'undefined' ? `/images/products/516x400/${foundImg._id}/${product.slug[lang]}${foundImg.extension}` : imgDefault;
                imgAlt = foundImg.alt || imgAlt;
            } else {
                imgDefault = product.images[0]._id !== 'undefined' ? `/images/products/516x400/${product.images[0]._id}/${product.slug[lang]}${foundImg.extension}` : imgDefault;
                imgAlt = product.images[0].alt || imgAlt;
            }
        }
        // Pictos
        const pictos = [];
        if (product.pictos) {
            product.pictos.forEach((picto) => {
                if (pictos.find((p) => p.location === picto.location) !== undefined) {
                    pictos.find((p) => p.location === picto.location).pictos.push(picto);
                } else {
                    const cardinals = picto.location.split('_');
                    const style = { top: 0, left: 0, zIndex: 0 };
                    if (cardinals.includes('RIGHT')) {
                        style.left = 'inherit';
                        style.right = 0;
                    }
                    if (cardinals.includes('BOTTOM')) {
                        style.top = 'inherit';
                        style.bottom = 0;
                    }
                    if (cardinals.includes('CENTER')) {
                        style.left = '50%';
                        style.transform = 'translate(-50%, 0)';
                    }
                    if (cardinals.includes('MIDDLE')) {
                        style.top = '50%';
                        style.transform = 'translate(0, -50%)';
                    }
                    pictos.push({ location: picto.location, style, pictos: [picto] });
                }
            });
        }

        let options = [];
        if (product && product.options) {
            options = product.options;
        }




        return (
            <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                <Layout header={oCmsHeader.content} footer={oCmsFooter.content}>
                    <Head>
                        <title>{sitename} | {product.name !== undefined && product.name !== '' ? product.name : ''}</title>
                        {
                            product.description2 && product.description2.text ? <meta name="description" content={product.description2.title} /> : null
                        }
                        <link rel="canonical" href={canonical} />
                        <meta property="og:title" content={`${sitename} | ${product.name !== undefined && product.name !== '' ? product.name : ''}`} />
                        <meta property="og:url" content={canonical} />
                        <meta property="og:type" content="article" />
                        <meta property="og:image" content={`${appurl}${imgDefault}`} />
                    </Head>
                    <div className="main">
                        <div className="shell">
                            {
                                listModulePage('select-date')
                            }
                            <NSBreadcrumb gNext={{ routes, Link }} />

                            <section className="section-product-main">
                                <header className="section__head visible-xs-block">
                                    <h1 className="section__title">{product.name}</h1>{/* <!-- /.section__title --> */}

                                    <h2 className="section__subtitle">{product.description1 && product.description1.title ? product.description1.title : null}</h2>

                                    <div className="row-flex" style={
                                        themeConfig
                                            && themeConfig.find(t => t.key === 'reviews') !== undefined
                                            && themeConfig.find(t => t.key === 'reviews').value === false
                                            ? { display: 'none' }
                                            : {}
                                    }>
                                        <div className="rating">
                                            <div className="rating-split align-star">
                                                <NSDrawStars
                                                    average={(product.reviews && product.reviews.average) || 0} size="16"
                                                    src={imgStar}
                                                />
                                            </div>
                                            <span>
                                                {
                                                    product.reviews && product.reviews.reviews_nb
                                                        ? `${product.reviews.average}/5 `
                                                        : ''
                                                }
                                                <a onClick={() => this.goTo('reviews_mobile')}>
                                                    {
                                                        product.reviews.reviews_nb > 1
                                                            ? `(${product.reviews.reviews_nb} ${t('product:avis', {})})`
                                                            : `(${product.reviews.reviews_nb} ${t('product:un_avis')})`
                                                    }
                                                </a>
                                            </span>
                                        </div>{/* <!-- /.rating --> */}
                                    </div>{/* <!-- /.row-flex --> */}
                                </header>{/* <!-- /.section__head --> */}

                                <div className="section__image">
                                    {
                                        pictos ? pictos.map((picto) => (
                                            <div className="product_picto" style={picto.style} key={picto.location + Math.random()}>
                                                {
                                                    picto.pictos && picto.pictos.map((p) => <img src={`/images/picto/32x32-70/${p.pictoId}/${p.image}`} alt={p.title} title={p.title} key={p._id} />)
                                                }
                                            </div>
                                        )) : ''
                                    }
                                    <div className="product__images">
                                        <figure
                                            className="product__image" style={{ cursor: product.images.length ? 'pointer' : 'unset' }}
                                            onClick={() => (product.images.length ? this.openLightBox(product.images.findIndex((img) => img.default)) : false)}
                                        >
                                            <img itemProp="image" src={imgDefault} alt={imgAlt} />
                                        </figure>
                                        {typeof window !== 'undefined' && isOpen
                                            && (
                                                <Lightbox
                                                    mainSrc={`/images/products/max-80/${product.images[photoIndex]._id}/${product.slug[lang]}${product.images[photoIndex].extension}`}
                                                    nextSrc={`/images/products/max-80/${product.images[(photoIndex + 1) % product.images.length]._id}/${product.slug[lang]}${product.images[(photoIndex + 1) % product.images.length].extension}`}
                                                    prevSrc={`/images/products/max-80/${product.images[(photoIndex + product.images.length - 1) % product.images.length]._id}/${product.slug[lang]}${product.images[(photoIndex + product.images.length - 1) % product.images.length].extension}`}
                                                    imageTitle={product.images[photoIndex].alt}
                                                    onCloseRequest={() => this.setState({ isOpen: false })}
                                                    onMovePrevRequest={() => this.setState({ photoIndex: (photoIndex + product.images.length - 1) % product.images.length })}
                                                    onMoveNextRequest={() => this.setState({ photoIndex: (photoIndex + 1) % product.images.length })}
                                                />
                                            )}
                                        <ul className="list-images">
                                            {
                                                product.images && product.images.filter((img) => !img.default) ? product.images.filter((img) => !img.default).map((img, index) => (
                                                    <li key={img.url}>
                                                        <a onClick={() => this.openLightBox(product.images.findIndex((im) => im._id === img._id))}>
                                                            <img
                                                                itemProp="image"
                                                                src={`/images/products/82x82/${img._id}/${product.slug[lang]}-${index}${img.extension}`}
                                                                alt={img.alt}
                                                            />
                                                        </a>
                                                    </li>
                                                )) : ''
                                            }
                                        </ul>
                                    </div>
                                </div>

                                <div className="section__content">
                                    <div className="product__actions-mobile visible-xs-block">
                                        <NSProductStock stock={product.stock} />
                                        <div className="product-price">
                                            <del hidden={!product.price.et.special || product.price.et.special === 0}>{product.price[taxDisplay].normal.toFixed(2)} {currencySymbol} <sub>{t(`common:price.${taxDisplay}`)}</sub></del>

                                            <strong>
                                                <span>{(product.price.et.special && product.price.et.special > 0 ? product.price[taxDisplay].special : product.price[taxDisplay].normal).toFixed(2)}</span>{currencySymbol} <sub>{t(`common:price.${taxDisplay}`)}</sub>
                                            </strong>
                                        </div>

                                        {
                                            product.type === 'virtual' && product.downloadInfos && (product.price[taxDisplay].special === 0 || product.price[taxDisplay].normal === 0) && (
                                                <div>{product.downloadInfos}</div>
                                            )
                                        }

                                        <button type="button" className="btn btn--red btn-cart" onClick={product.type === 'virtual' && (product.price[taxDisplay].special === 0 || product.price[taxDisplay].normal === 0) ? this.downloadVirtual : (product.type === 'bundle' ? this.onOpenModal : this.preAddToCart)} aria-label={t('product:ajoutPanier')}>
                                            <i className="ico-shopping-cart-white" />
                                            <span>{product.type === 'virtual' && (product.price[taxDisplay].special === 0 || product.price[taxDisplay].normal === 0) ? t('product:download') : (product.type === 'bundle' ? t('product:composer') : t('product:ajoutPanier'))}</span>
                                        </button>
                                    </div>{/* <!-- /.product__actions-mobile --> */}

                                    <header className="section__head hidden-xs">
                                        <h1 className="section__title" style={{ width: '85%' }}>{product.name}</h1>{/* <!-- /.section__title --> */}
                                    </header>{/* <!-- /.section__head --> */}

                                    <h2 className="section__subtitle">{product.description1 && product.description2.title ? product.description2.title : null}</h2>
                                    {
                                        product.description2 && product.description2.text && (
                                            <div dangerouslySetInnerHTML={{ __html: product.description2.text }} />
                                        )
                                    }
                                    <div className="product-options" style={{ textAlign: "right" }}>
                                        {options.map((element) => {
                                            return (
                                                <>
                                                    <div>{element.name[lang]}{element.mandatory == true ? <span> ({t('product:mandatory')})</span> : <span> ({t('product:optional')})</span>}</div>

                                                    {this.renderOptions(element)}
                                                </>
                                            )
                                        })}
                                    </div>
                                    <div className="product-actions">
                                        <div className="product-stock hidden-xs">
                                            <NSProductStock stock={product.stock} />
                                        </div>

                                        <div className="product-price_reviews">

                                            <div className="product-reviews hidden-xs" style={themeConfig && themeConfig.find(t => t.key === 'reviews') && themeConfig.find(t => t.key === 'reviews').value === false ? { display: 'none' } : {}}>
                                                <div className="rating">
                                                    <div className="rating-split align-star">
                                                        <NSDrawStars
                                                            average={product.reviews.average} size="16"
                                                            src={imgStar}
                                                        />
                                                    </div>
                                                    <span>
                                                        {
                                                            product.reviews.reviews_nb
                                                                ? `${product.reviews.average}/5 `
                                                                : ''
                                                        }
                                                        <a onClick={() => this.goTo('reviews')}>
                                                            {
                                                                product.reviews.reviews_nb > 1
                                                                    ? `(${product.reviews.reviews_nb} ${t('product:avis')})`
                                                                    : `(${product.reviews.reviews_nb} ${t('product:un_avis')})`
                                                            }
                                                        </a>
                                                    </span>
                                                </div>{/* <!-- /.rating --> */}
                                            </div>{/* <!-- /.product-reviews --> */}
                                            <div className="product-price hidden-xs">
                                                {
                                                    product.price.et.special && product.price.et.special > 0 && <del>{product.price[taxDisplay].normal.toFixed(2)} {currencySymbol} <sub>{t(`common:price.${taxDisplay}`)}</sub></del>
                                                }

                                                <strong>
                                                    <span>
                                                        {
                                                            calcPrice(product.price, optionsModifier)
                                                        }
                                                    </span> {currencySymbol} <sub>{t(`common:price.${taxDisplay}`)}</sub>
                                                </strong>
                                            </div>
                                        </div>

                                        <div className="row-flex hidden-xs">
                                            {
                                                product.stock && product.stock.status !== 'epu'
                                                && (
                                                    <div className="product-qty">
                                                        <div className="form__row form__row--flex">
                                                            <label htmlFor="field-qty" className="form__label">{t('quantite')}</label>

                                                            <div className="form__controls qty-controls">
                                                                <button type="button" className="btn-qty-change btn-decrement" onClick={this.decrementQty}>-</button>
                                                                <input readOnly type="text" className="field" name="field-qty" id="field-qty" value={this.state.selectedQty} placeholder="" />
                                                                <button type="button" className="btn-qty-change btn-increment" onClick={this.incrementQty}>+</button>
                                                            </div>{/* <!-- /.form__controls --> */}
                                                        </div>{/* <!-- /.form__row --> */}
                                                    </div>
                                                )
                                            }
                                        </div>

                                        <footer className="section__foot">
                                            {
                                                (!product.stock || (product.stock && product.stock.status !== 'epu'))
                                                && (
                                                    <button type="button" className="btn btn--red btn-cart hidden-xs" onClick={product.type === 'virtual' && (product.price[taxDisplay].special === 0 || product.price[taxDisplay].normal === 0) ? this.downloadVirtual : (product.type === 'bundle' ? this.onOpenModal : this.preAddToCart)} aria-label={t('product:ajoutPanier')}>
                                                        <i className="ico-shopping-cart-white" />
                                                        <span>{product.type === 'virtual' && (product.price[taxDisplay].special === 0 || product.price[taxDisplay].normal === 0) ? t('product:download') : (product.type === 'bundle' ? t('product:composer') : t('product:ajoutPanier'))}</span>
                                                    </button>
                                                )
                                            }
                                        </footer>{/* <!-- /.section__foot --> */}
                                    </div>{/* <!-- /.product-actions --> */}
                                </div>{/* <!-- /.section__content --> */}
                            </section>{/* <!-- /.section-product-main --> */}

                            {
                                product.description1 && product.description1.length > 0 && (
                                    <section className="section-product-description">
                                        <header className="section__head">
                                            <h4>{product.description1.title ? product.description1.title : null}</h4>
                                        </header>{/* <!-- /.section__head --> */}
                                        {product.description1.text && <div dangerouslySetInnerHTML={{ __html: product.description1.text }} />}
                                    </section>/* <!-- /.section-product-description --> */
                                )
                            }

                            {
                                product.attributes && product.attributes.length > 0 && (
                                    <section className="section-product-characteristics">
                                        <header className="section__head">
                                            <h4>{t('product:caracteristiques')}</h4>
                                        </header>{/* <!-- /.section__head --> */}
                                        <div className="table-specs">
                                            <table>
                                                <tbody>
                                                    {
                                                        product.attributes
                                                            .filter((attrib) => attrib.name && attrib.name.indexOf('Picto') === -1) // Retire les éléments qui sont en liens avec les pictogrammes
                                                            .sort((a, b) => a.position - b.position) // Trie les attributs en fonction de la position
                                                            .map((attrib) => {
                                                                if (attrib.value === undefined || attrib.value === '') return;
                                                                if (typeof attrib.value === 'boolean') {
                                                                    return (
                                                                        <tr key={attrib.code}>
                                                                            <td style={{ width: '30%' }}>
                                                                                {attrib.name}
                                                                            </td>
                                                                            <td style={{ fontWeight: 'bold', width: '70%' }}>
                                                                                {t(`common:${attrib.value.toString()}`)}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                }
                                                                if (attrib.type === 'textfield' || attrib.type === 'textarea') {
                                                                    return (
                                                                        <tr key={attrib.code}>
                                                                            <td style={{ width: '30%' }}>
                                                                                {attrib.name}
                                                                            </td>
                                                                            <td style={{ fontWeight: 'bold', width: '70%' }}>
                                                                                <div dangerouslySetInnerHTML={{ __html: attrib.value }} />
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                }
                                                                if (attrib.type === 'color') {
                                                                    return (
                                                                        <tr key={attrib.code}>
                                                                            <td style={{ width: '30%' }}>
                                                                                {attrib.name}
                                                                            </td>
                                                                            <td style={{ fontWeight: 'bold', width: '70%' }}>
                                                                                <div style={{
                                                                                    width: '30px',
                                                                                    height: '20px',
                                                                                    backgroundColor: attrib.value.toString(),
                                                                                    borderRadius: '5px'
                                                                                }}
                                                                                />
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                }
                                                                if (Array.isArray(attrib.value)) {
                                                                    return (
                                                                        <tr key={attrib.code}>
                                                                            <td style={{ width: '30%' }}>
                                                                                {attrib.name}
                                                                            </td>
                                                                            <td style={{ fontWeight: 'bold', width: '70%' }}>
                                                                                <div dangerouslySetInnerHTML={{ __html: attrib.value.join(', ') }} />
                                                                            </td>

                                                                        </tr>
                                                                    );
                                                                }
                                                                return (
                                                                    <tr key={attrib.code}>
                                                                        <td>
                                                                            {attrib.name}
                                                                        </td>
                                                                        <td style={{ fontWeight: 'bold' }}>
                                                                            {attrib.value}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                    }
                                                </tbody>
                                            </table>
                                        </div>{/* <!-- /.table --> */}
                                    </section>/* <!-- /.section-product-characteristics --> */
                                )
                            }

                            {
                                product.associated_prds && product.associated_prds.length > 0 && (
                                    <section className="section-ratings associated_product">
                                        <header className="section__head">
                                            <h4>{t('product:crossSelling')}</h4>
                                        </header>{/* <!-- /.section__head --> */}
                                        <div className="hidden-xs">
                                            <NSProductCardList ProductCard={NSProductCard} type="data" value={product.associated_prds} itemsperslides={5} t={t} gNext={{ Head, Link, Router }} />
                                        </div>
                                        <div className="hidden-lg">
                                            <NSProductCardList ProductCard={NSProductCard} type="data" value={product.associated_prds} itemsperslides={1} t={t} gNext={{ Head, Link, Router }} />
                                        </div>
                                    </section>
                                )
                            }

                            <section className="section-ratings customer_reviews" id="reviews" hidden={themeConfig && themeConfig.find(t => t.key === 'reviews') && themeConfig.find(t => t.key === 'reviews').value === false}>
                                <header className="section__head">
                                    <h4>{t('avisClients')}</h4>
                                </header>{/* <!-- /.section__head --> */}
                                <div className="section__body">
                                    <div className="rating-box rating-box--featured rating-head-box">
                                        <aside className="rating__aside rating__head">
                                            <h3>{t('product:moyenne')}</h3>
                                            <div className="rating-value">
                                                {
                                                    product.reviews && product.reviews.average
                                                        ? <strong>{product.reviews.average.toFixed(1)}/5</strong>
                                                        : t('product:noReview')
                                                }
                                            </div>{/* <!-- /.rating-value --> */}
                                            {/* <ul className="list-rate list-rate--medium"> */}
                                            <div className="rating-split">
                                                <NSDrawStars average={product.reviews.average} size="16" src={imgStar} />
                                            </div>
                                            {/* </ul><!-- /.list-rate --> */}
                                            <button type="button" className="link-more nbb">
                                                <i className="ico-profile" />
                                                <span>{product.reviews.reviews_nb} {t('product:total')}</span>
                                            </button>
                                        </aside>{/* <!-- /.rating__aside --> */}

                                        <div className="rating__content">
                                            <div className="rating__inner">
                                                <div className="rating-split">
                                                    {
                                                        product.reviews.questions.length > 0 && product.reviews.questions.map((question) => {
                                                            const labelQuestion = question.question;
                                                            return (
                                                                <div key={question._id} className="commentQuestionLabelStar">
                                                                    <div className="commentQuestionLabelMain" title={labelQuestion}>
                                                                        {truncate(labelQuestion, this.maxCharTitle)} {question.average ? `${question.average}/5` : ''}
                                                                    </div>
                                                                    <div>
                                                                        <NSDrawStars average={question.average} size="16" src={imgStar} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    }
                                                </div>
                                            </div>{/* <!-- /.rating__inner --> */}
                                            <div className="addCommentButton">
                                                <button type="button" className="btn btn--red" onClick={this.onOpenModalComment}>
                                                    <span>{t('product:add_comment')}</span>
                                                </button>
                                            </div>
                                            <div className="rating__actions">
                                                <button type="button" className="btn btn--grey nbb" onClick={this.toggleAllComment}>
                                                    {t('product:voirAvisClients', { x: product.reviews.reviews_nb })}
                                                </button>
                                            </div>{/* <!-- /.rating__actions --> */}
                                        </div>{/* <!-- /.rating__content --> */}
                                    </div>{/* <!-- /.rating-box --> */}
                                    {
                                        !hideReviewsLanguage ? product.reviews && product.reviews.datas && product.reviews.datas.length > 0
                                            ? <p>{t('product:reviews_of_your_languages')} :</p>
                                            : <p>{t('product:no_reviews_for_your_language')}</p> : ''
                                    }
                                    <div className="rating-boxes">
                                        {
                                            product.reviews.datas.map((review, index) => {
                                                if (allCommentsDisplayed === true || review.lang === lang) {
                                                    let extendClass = '';
                                                    if (openReviews && openReviews[index] && openReviews[index] === true) {
                                                        extendClass = 'extend';
                                                    }
                                                    return (
                                                        <div key={review._id} className={`rating-box rating-box--featured ${extendClass}`}>
                                                            <aside className="rating__aside">
                                                                <div className="rating-value">
                                                                    <strong>{review.rate}</strong><span>/5</span>
                                                                </div>
                                                                <div className="rating-split">
                                                                    <NSDrawStars
                                                                        average={review.rate} size="16"
                                                                        src={imgStar}
                                                                    />
                                                                </div>
                                                                {
                                                                    extendClass
                                                                        ? (
                                                                            review.questions.map((question) => {
                                                                                const labelQuestion = question.question;
                                                                                return (
                                                                                    <div key={question._id} className="commentQuestionLabelStar rating-split modify-star">
                                                                                        <div className="commentQuestionLabel" title={labelQuestion}>
                                                                                            {labelQuestion}:
                                                                                        </div>
                                                                                        <div>
                                                                                            <NSDrawStars average={question.rate} size="10" src={imgStar} />
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })
                                                                        )
                                                                        : ''
                                                                }
                                                                <sub>{moment(review.review_date).format('DD/MM/YYYY HH:mm')}</sub>
                                                            </aside>
                                                            <div className="rating__content commentTitleText">
                                                                {
                                                                    extendClass
                                                                        ? <h5 title={review.title}>{review.title}</h5>
                                                                        : <h5 title={review.title}>{truncate(review.title, this.maxCharTitle)}</h5>
                                                                }
                                                                {
                                                                    extendClass
                                                                        ? <p className="commentText extend">{review.review}</p>
                                                                        : <p className="commentText">{truncate(review.review, this.maxCharComment)}</p>
                                                                }
                                                                <button type="button" className="read-more hidden-xs nbb" onClick={() => this.toggleOpenReview(index)}>
                                                                    {
                                                                        extendClass
                                                                            ? <span>&lt;&lt; {t('product:cacherSuite')}</span>
                                                                            : <span>{t('product:lireSuite')} &gt;&gt;</span>
                                                                    }
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            })
                                        }
                                    </div>
                                </div>{/* <!-- /.section__body --> */}
                            </section>{/* <!-- /.section-ratings --> */}
                            <section>
                                {
                                    listModulePage('product')
                                }
                            </section>
                            {
                                cmsProductContentBottom && (
                                    <section>
                                        <CMS ns-code="product-content-bottom" content={cmsProductContentBottom.content || ''} hide_error="1" />
                                    </section>
                                )
                            }
                        </div>{/* <!-- /.shell --> */}
                    </div>
                    <ModalR
                        animationDuration={0} classNames={{ modal: 'popup__container', overlay: 'popup active' }}
                        open={openModal} onClose={this.onCloseModal} center
                    >
                        {
                            product.type === 'bundle' ? (
                                <div className="modifier-popup__wrap">
                                    <h3 className="modifier-popup__header">{t('product:composeMenu')}</h3>
                                    <form ref={(form) => this.formMenu = form}>
                                        <div className="form__body">
                                            <NSBundleProduct product={product} />

                                            <div className="product-price">
                                                <strong>{((product.price.ati.normal + this.state.bundleGlobalModifierPrice) || 0).toFixed(2)} {currencySymbol} </strong>
                                            </div>
                                        </div>
                                        <div className="form-footer">
                                            <button type="button" className="btn btn--red btn-cart" onClick={this.addToCart} aria-label={t('product:ajoutPanier')}>
                                                <i className="ico-shopping-cart-white" />
                                                <span>{t('ajoutPanier')}</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            ) : (
                                <>
                                    <h3 className="popup__title">{t('product:productAdded')} :</h3>
                                    <div className="popup__body">
                                        <div className="product-simple">
                                            <figure className="product__image">
                                                <img src={imgDefault} alt={imgAlt} width="256" height="197" />
                                            </figure>

                                            <h4 className="product__title">{this.state.selectedQty} x {product.name}</h4>

                                            <div className="product__actions">
                                                <button type="button" className="btn btn--with-icon btn--red" onClick={this.onCloseModal}>
                                                    {t('product:continueShopping')}
                                                </button>

                                                <Link route="cart" params={{ lang: routerLang }}>
                                                    <a className="btn btn--with-icon btn--red">
                                                        {t('product:viewCart')}
                                                    </a>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )
                        }
                    </ModalR>
                    <ModalR open={openComment} onClose={this.onCloseModalComment} delay={0} center>
                        <div className="modal-wrapper-add-comment is-open" style={{ overflowY: 'auto' }}>
                            <button type="button" className="modal-backdrop nbb" />
                            <div className="modal is-open">
                                <button type="button" className="modal-close nbb">
                                    <i className="ico-close" onClick={this.onCloseModalComment} />
                                </button>
                                <div className="subscribe-modal">
                                    <div>
                                        <p style={{ color: '#4A4A4A', fontSize: '16px', paddingLeft: '20px' }}>
                                            <span style={{ fontWeight: '600', fontSize: '22px' }}>{product.name}</span><br />
                                            {product.description1 && product.description1.title ? product.description1.title : null}
                                        </p>
                                    </div>
                                    <br />
                                    <div className="rating-boxes" style={{ justifyContent: 'space-between', padding: '0 36px 0 36px' }}>
                                        <span style={{ fontSize: '22px', fontWeight: '700' }}>{t('product:overall_rating')}</span>
                                        {
                                            // Si des questions existent alors on ne pourra pas cliquer sur les etoiles de la note globale,
                                            // ce sont le cumule des notes des questions qui définirons la note globale
                                            modalComment.noteQuestions && modalComment.noteQuestions.length > 0
                                                ? (
                                                    <div className="rating-split modify-star">
                                                        <NSDrawStars average={modalComment.rate} size="20" src={imgStar} />
                                                    </div>
                                                )
                                                : (
                                                    <div className="rating-split modify-star">
                                                        <NSDrawStars
                                                            editmode
                                                            average={modalComment.rate}
                                                            size="20"
                                                            idQuestion="global"
                                                            src={imgStar}
                                                            onClickStar={this.onClickSelectNote}
                                                        />
                                                    </div>
                                                )

                                        }
                                    </div>
                                    <form onSubmit={(e) => this.onSuccessComment(e)}>
                                        <div style={{ marginBottom: '18px' }}>
                                            {
                                                modalComment.noteQuestions.length > 0 && modalComment.noteQuestions.map((question) => (
                                                    <div key={question.idQuestion} className="rating-boxes" style={{ justifyContent: 'space-between', padding: '0 36px 0 36px' }}>
                                                        <span style={{ maxWidth: '75%' }}>{question.question}</span>
                                                        <div className="rating-split modify-star">
                                                            <NSDrawStars
                                                                editmode
                                                                average={question.rate}
                                                                size="20"
                                                                idQuestion={question.idQuestion}
                                                                src={imgStar}
                                                                onClickStar={this.onClickSelectNote}
                                                            />
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                        <div className="subscribe__body" style={{ paddingTop: '10px', paddingBottom: '0px' }}>
                                            <label htmlFor="title">{t('product:reviewTitle')}</label>
                                            <input type="text" id="title" name="title" ref={this.title} className="subscribe__field" style={{ height: '40px' }} maxLength="140" required />
                                        </div>
                                        <div className="subscribe__body" style={{ paddingTop: '10px', paddingBottom: '0px' }}>
                                            <label htmlFor="review">{t('product:feedback')}</label>
                                            <textarea type="text" id="review" name="review" ref={this.review} className="subscribe__field" style={{ height: '70px', lineHeight: '27px' }} required />
                                        </div>
                                        <div className="subscribe__body" style={{ paddingTop: '10px', paddingBottom: '0px' }}>
                                            <label htmlFor="surname">{t('product:reviewNickname')}</label>
                                            <input type="text" id="surname" name="surname" className="subscribe__field" required style={{ height: '40px' }} />
                                        </div>
                                        <br />
                                        <div className="subscribe__actions">
                                            <button type="submit" className="subscribe__btn btn btn--grey btn--medium">{t('product:send')}</button>
                                        </div>
                                        <br />
                                        <div>
                                            <div dangerouslySetInnerHTML={{ __html: this.state.cmsLegalTxt.content || '' }} />
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </ModalR>
                </Layout>
            </NSContext.Provider >
        );
    }
}

export default withRouter(withI18next(['product', 'common', 'product-card'])(PageProduct));
