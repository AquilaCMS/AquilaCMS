import { useEffect, useRef, useState }                   from 'react';
import useTranslation                                    from 'next-translate/useTranslation';
import { deleteCartShipment, deleteItem, updateQtyItem } from '@aquilacms/aquila-connector/api/cart';
import { getImage }                                      from '@aquilacms/aquila-connector/api/product/helpersProduct';
import { useCart, useSiteConfig }                        from '@lib/hooks';
import { formatPrice, formatStock }                      from '@lib/utils';

export default function CartItem({ item }) {
    const [qty, setQty]         = useState(item.quantity);
    const [message, setMessage] = useState();
    const timer                 = useRef();
    const { cart, setCart }     = useCart();
    const { themeConfig }       = useSiteConfig();
    const { t }                 = useTranslation();

    // Getting boolean stock display
    const stockDisplay = themeConfig?.values?.find(t => t.key === 'displayStockCart')?.value !== undefined ? themeConfig?.values?.find(t => t.key === 'displayStockCart')?.value : false;

    useEffect(() => {
        return () => clearTimeout(timer.current);
    }, []);

    const onChangeQtyItem = async (e) => {
        if (!e.target.value) {
            return setQty('');
        }
        const quantity = Number(e.target.value);
        if (quantity < 1) {
            onDeleteItem();
        } else {
            try {
                // Update quantity
                let newCart = await updateQtyItem(cart._id, item._id, quantity);
                setQty(quantity);

                // Deletion of the cart delivery
                if (newCart.delivery?.method) {
                    newCart = await deleteCartShipment(newCart._id);
                }
                setCart(newCart);
            } catch (err) {
                setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
                const st      = setTimeout(() => { setMessage(); }, 3000);
                timer.current = st;
            }
        }
    };
    
    const onDeleteItem = async () => {
        try {
            // Product deletion
            let newCart = await deleteItem(cart._id, item._id);

            // Deletion of the cart delivery
            if (newCart.delivery?.method) {
                newCart = await deleteCartShipment(newCart._id);
            }

            setCart(newCart);

            // Event
            const addTransaction = new CustomEvent('removeFromCart', { detail: { product: item } });
            window.dispatchEvent(addTransaction);
        } catch (err) {
            setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
            const st      = setTimeout(() => { setMessage(); }, 3000);
            timer.current = st;
        }
    };

    return (
        <>
            <div className="w-commerce-commercecartitem cart-item">
                <img src={getImage({ _id: item.image, title: item.code, extension: '.png', alt: item.code }, '60x60', item.selected_variant).url || '/images/no-image.svg'} alt={item.code} className="w-commerce-commercecartitemimage" />
                <div className="w-commerce-commercecartiteminfo div-block-4">
                    <div>
                        <div className="w-commerce-commercecartproductname">{item.name}</div>
                        <div>
                            { item.price?.special ? <><del>{formatPrice(item.price.unit.ati)}</del>&nbsp;</> : null }
                            { item.price?.special ? formatPrice(item.price.special.ati) : formatPrice(item.price.unit.ati) }
                        </div>
                        { stockDisplay && <div style={{ fontSize: '10px' }}>{formatStock(item.stock)}</div> }
                    </div>
                    {
                        item.selections && item.selections.length > 0 && (
                            <ul className="w-commerce-commercecartoptionlist">
                                {
                                    item.selections.map((section) => (
                                        section.products.map((itemSection) => {
                                            const diffPrice = item.bundle_sections?.find((bundle_section) => bundle_section.ref === section.bundle_section_ref)?.products?.find((product) => product.id === itemSection.id)?.modifier_price?.ati;
                                            return (
                                                <li key={itemSection._id}>{itemSection.name}{diffPrice && diffPrice !== 0 ? <> ({diffPrice > 0 ? '+' : ''}{formatPrice(diffPrice)})</> : null}</li>
                                            );
                                        })
                                    ))
                                }
                            </ul>
                        )
                    }
                    <button type="button" className="remove-button-cart w-inline-block" onClick={onDeleteItem}>
                        <div className="text-block-2">X</div>
                    </button>
                </div>
                <input type="number" className="w-commerce-commercecartquantity" value={qty} onChange={onChangeQtyItem} onWheel={(e) => e.target.blur()} />
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
        </>
    );

}