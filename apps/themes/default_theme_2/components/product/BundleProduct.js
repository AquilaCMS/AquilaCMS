import { Fragment, useEffect, useRef, useState } from 'react';
import useTranslation                            from 'next-translate/useTranslation';
import Button                                    from '@components/ui/Button';
import { addToCart, deleteCartShipment }         from '@aquilacms/aquila-connector/api/cart';
import { getImage }                              from '@aquilacms/aquila-connector/api/product/helpersProduct';
import { useCart, useShowCartSidebar }           from '@lib/hooks';
import { formatPrice }                           from '@lib/utils';

export default function BundleProduct({ product, qty, onCloseModal }) {
    const formRef                                 = useRef();
    const [priceBundle, setPriceBundle]           = useState(0);
    const [selectionsBundle, setSelectionsBundle] = useState({});
    const [message, setMessage]                   = useState();
    const [isLoading, setIsLoading]               = useState(false);
    const { cart, setCart }                       = useCart();
    const { setShowCartSidebar }                  = useShowCartSidebar();
    const { t }                                   = useTranslation();

    useEffect(() => {
        const price = product.price.ati.special ? product.price.ati.special : product.price.ati.normal;
        setPriceBundle(price);

        const selections = {};
        if (product.bundle_sections) {
            for (const section of product.bundle_sections) {
                selections[section.ref] = [];
            }
        }
        setSelectionsBundle(selections);
    }, []);

    const updateBundle = (e, sectionId, sectionDisplayMode, sectionType) => {
        const itemId = e.target.value.split('|')[0];

        // Updating price bundle
        let price    = product.price.ati.special ? product.price.ati.special : product.price.ati.normal;
        const inputs = [...formRef.current.elements].filter(elem => elem.nodeName !== 'BUTTON');
        for (const input of inputs) {
            if (input.checked || input.checked === undefined) { // If select box, input.checked is undefined
                const value = parseFloat(input.value.split('|')[1]);
                price      += value;
            }
        }
        setPriceBundle(price);

        // Updating selections bundle
        const selections = { ...selectionsBundle };
        if (sectionType === 'SINGLE') selections[sectionId] = []; // Resetting selected products each time if type of section is SINGLE
        if (itemId) {
            if (e.target.checked || sectionDisplayMode === 'SELECT') {
                selections[sectionId] = selections[sectionId].includes(itemId) ? [...selections[sectionId]] : [...selections[sectionId], itemId];
            } else {
                selections[sectionId].splice(selections[sectionId].indexOf(itemId), 1);
            }
        }
        setSelectionsBundle(selections);
    };

    const onAddToCart = async (e) => {
        e.preventDefault();
        
        setIsLoading(true);
        setMessage();

        // Error checking and formatting selectionsBundle
        const selections = [];
        for (const index in selectionsBundle) {
            const section = product.bundle_sections.find((s) => s.ref === index);
            let mess;
            if (section.isRequired && selectionsBundle[index].length === 0) {
                mess = { type: 'error', message: t('components/bundleProduct:error1', { title: section.title }) };
            }
            else if (section.minSelect && selectionsBundle[index].length < section.minSelect) {
                mess = { type: 'error', message: t('components/bundleProduct:error2', { min: section.minSelect, title: section.title }) };
            }
            else if (section.maxSelect && selectionsBundle[index].length > section.maxSelect) {
                mess = { type: 'error', message: t('components/bundleProduct:error3', { max: section.maxSelect, title: section.title }) };
            }
            if (mess) {
                setIsLoading(false);
                return setMessage(mess);
            }
            selections.push({ bundle_section_ref: index, products: selectionsBundle[index] });
        }

        try {
            // Adding bundle product to cart
            let newCart     = await addToCart(cart._id, product, qty, selections);
            document.cookie = 'cart_id=' + newCart._id + '; path=/;';
            onCloseModal();

            // Deletion of the cart delivery
            if (newCart.delivery?.method) {
                newCart = await deleteCartShipment(newCart._id);
            }

            setCart(newCart);

            // Event
            const addTransaction = new CustomEvent('addToCart', { detail: { product, quantity: qty } });
            window.dispatchEvent(addTransaction);

            setShowCartSidebar(true, newCart);
        } catch (err) {
            setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
        } finally {
            setIsLoading(false);
        }
    };

    if (!product.bundle_sections?.length) {
        return (
            <div>{t('components/bundleProduct:noProduct')}</div>
        );
    }

    return (
        <form ref={formRef} onSubmit={onAddToCart}>
            <div className="title-wrap-centre">{t('components/bundleProduct:compose')}</div>
            {
                product.bundle_sections.map((section) => {
                    return (
                        <Fragment key={section._id}>
                            <h5 className="seprateur-carte">{section.title}</h5>
                            <div className="w-dyn-list">
                                {
                                    section.displayMode === 'SELECT' ? (
                                        <select className="text-ville w-select" name={`select_${section._id}`} onChange={(e) => updateBundle(e, section.ref, section.displayMode, section.type)}>
                                            <option value="|0">--</option>
                                            {
                                                section.products && section.products.map((item) => (
                                                    <option 
                                                        key={item._id}
                                                        value={`${item.id._id}|${item.modifier_price?.ati || 0}`}
                                                    >
                                                        {item.id.name} {item.modifier_price?.ati ? `(${item.modifier_price.ati > 0 ? '+' : ''}${formatPrice(item.modifier_price.ati)})` : ''}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                    ) : (
                                        <div role="list" className="collection-list-3 w-dyn-items w-row">
                                            {
                                                section.products.map((item) => (
                                                    <div role="listitem" className="menu-item w-dyn-item w-col w-col-4" key={item._id}>
                                                        <div className="food-card-3col">
                                                            <div className="columns-4 w-row">
                                                                <div className="w-col w-col-6">
                                                                    <div className="food-image-square-3col">
                                                                        <img src={getImage(item.id.images[0], '130x130').url || '/images/no-image.svg'} alt={getImage(item.id.images[0], '130x130').alt} className="food-image" style={{ 'width': '130px' }} />
                                                                    </div>
                                                                </div>
                                                                <div className="w-col w-col-6">
                                                                    <div className="food-title-wrap-3col">
                                                                        <h6 className="heading-14">{item.id.name}</h6>
                                                                    </div>
                                                                    <div className="form-block-4 w-form">
                                                                        <div>
                                                                            {
                                                                                section.type === 'MULTIPLE' ? (
                                                                                    <label className="w-checkbox checkbox-field-allergene">
                                                                                        <input 
                                                                                            type="checkbox"
                                                                                            name={`checkbox_${section._id}`}
                                                                                            value={`${item.id._id}|${item.modifier_price?.ati || 0}`}
                                                                                            style={{ opacity: 0, position: 'absolute', zIndex: -1 }}
                                                                                            onChange={(e) => updateBundle(e, section.ref, section.displayMode, section.type)}
                                                                                        />
                                                                                        <div className="w-checkbox-input w-checkbox-input--inputType-custom checkbox-allergene"></div>
                                                                                        <span className="checkbox-label-allergene w-form-label">{t('components/bundleProduct:select')}</span>
                                                                                    </label>
                                                                                ) : (
                                                                                    <label className="checkbox-field-allergene w-radio">
                                                                                        <input 
                                                                                            type="radio"
                                                                                            name={`radio_${section._id}`}
                                                                                            value={`${item.id._id}|${item.modifier_price?.ati || 0}`}
                                                                                            style={{ opacity: 0, position: 'absolute', zIndex: -1 }}
                                                                                            onChange={(e) => updateBundle(e, section.ref, section.displayMode, section.type)}
                                                                                        />
                                                                                        <div className="w-form-formradioinput w-form-formradioinput--inputType-custom radio-retrait w-radio-input"></div>
                                                                                        <span className="w-form-label">{t('components/bundleProduct:select')}</span>
                                                                                    </label>
                                                                                )
                                                                            }
                                                                        </div>
                                                                        <div className="div-block-prix">
                                                                            { item.modifier_price?.ati ? <div className="price">{item.modifier_price.ati > 0 ? '+' : ''}{formatPrice(item.modifier_price.ati)}</div> : null }
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    )
                                }
                            </div>
                        </Fragment>
                    );
                })
            }
            <div className="seprateur-carte">
                {formatPrice(priceBundle)}
            </div>
            {
                message && (
                    <div className={`w-commerce-commerce${message.type}`}>
                        <div>
                            {message.message}
                        </div>
                    </div>
                )
            }
            <Button 
                text={t('components/bundleProduct:submit')}
                loadingText={t('components/bundleProduct:submitLoading')}
                isLoading={isLoading}
                className="button full w-button"
                style={{ width: '100%', marginTop: '10px' }}
            />
        </form>
    );
}