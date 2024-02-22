import { Fragment, useEffect, useMemo, useState }                      from 'react';
import Link                                                            from 'next/link';
import dynamic                                                         from 'next/dynamic';
import { useRouter }                                                   from 'next/router';
import useTranslation                                                  from 'next-translate/useTranslation';
import Button                                                          from '@components/ui/Button';
import { getShipmentCart, setCartShipment }                            from '@aquilacms/aquila-connector/api/cart';
import { useCart }                                                     from '@lib/hooks';
import { formatDate, formatPrice, isAllVirtualProducts, getAqModules } from '@lib/utils';

export default function DeliveryStep({ user }) {
    const [show, setShow]                         = useState(false);
    const [shipments, setShipments]               = useState([]);
    const [selectedShipment, setSelectedShipment] = useState(null);
    const { cart, setCart }                       = useCart();
    const [deliveryValue, setDeliveryValue]       = useState(0);
    const [total, setTotal]                       = useState(cart.priceTotal?.ati);
    const [message, setMessage]                   = useState();
    const [isLoading, setIsLoading]               = useState(false);
    const router                                  = useRouter();
    const { lang, t }                             = useTranslation();

    const aqModules = getAqModules();
    
    useEffect(() => {
        if (!cart?.items?.length) {
            // Check if the cart is empty
            router.push('/checkout/cart');
        } else if (!cart.addresses || !cart.addresses.billing || !cart.addresses.delivery) {
            // Check if the billing & delivery addresses exists
            router.push('/checkout/address');
        } else if (isAllVirtualProducts(cart.items)) {
            // If have only virtual products, go to payment step
            router.push('/checkout/payment');
        } else {
            const fetchData = async () => {
                try {
                    const res = await getShipmentCart({ _id: cart._id }, null, { structure: { component_template_front: 1, config: 1 } }, lang);
                    setShipments(res.datas);
                    if (res.datas.length > 0) {
                        if (cart.delivery?.method && cart.delivery?.value?.ati) {
                            setSelectedShipment(cart.delivery.method);
                            return setDeliveryValue(cart.delivery.value.ati);
                        }
                        const defaultPrice = res.datas[0].price;
                        setDeliveryValue(defaultPrice);
                        setTotal(cart.priceTotal.ati + res.datas[0].price);
                    }
                } catch (err) {
                    setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
                }
            };
            fetchData();
            setShow(true);
        }
    }, []);

    const calculateDelivery = (id) => {
        setSelectedShipment(id);
        const ship    = shipments.find((s) => s._id === id);
        const newCart = JSON.parse(JSON.stringify(cart));
        if (ship.type === 'DELIVERY') {
            newCart.addresses.delivery = user.addresses[user.delivery_address];
        } else {
            newCart.addresses.delivery = '';
        }
        setCart(newCart);
        setDeliveryValue(ship.price);
        if (cart.delivery?.method && cart.delivery?.value?.ati) {
            setTotal((cart.priceTotal.ati - cart.delivery.value.ati) + ship.price);
        } else {
            setTotal(cart.priceTotal.ati + ship.price);
        }
    };

    const onSubmitDelivery = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const ship = shipments.find((s) => s._id === selectedShipment);

        if (!cart.addresses.delivery) {
            setMessage({ type: 'error', message: t('components/checkout/deliveryStep:noDeliveryAddress') });
            setIsLoading(false);
            return;
        }

        try {
            // Set cart addresses
            const newCart = await setCartShipment(cart._id, ship, cart.addresses.delivery, lang);
            setCart(newCart);

            router.push('/checkout/payment');
        } catch (err) {
            setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
        } finally {
            setIsLoading(false);
        }
    };

    const shipmentsFiltered = useMemo(() => {
        return (
            <>
                {
                    shipments.length ? shipments.map((ship, index) => {
                        const AqModule = ship.component_template_front ? dynamic(() => aqModules.find((comp) => comp.code === ship.component_template_front)?.jsx) : null;
                        return (
                            <Fragment key={ship._id}>
                                <div className="column-center w-col w-col-12" style={{ justifyContent: 'unset', marginTop: '10px' }}>
                                    <label className="checkbox-click-collect w-radio">
                                        <input type="radio" name="shipment" value={ship._id} defaultChecked={ship._id === cart.delivery?.method || index === 0} onClick={(e) => calculateDelivery(e.target.value)} required style={{ opacity: 0, position: 'absolute', zIndex: -1 }} />
                                        <div className="w-form-formradioinput w-form-formradioinput--inputType-custom radio-retrait w-radio-input"></div>
                                        <div className="labels">
                                            {
                                                ship.url_logo ? (
                                                    <>
                                                        <img src={ship.url_logo} alt={ship.name} style={{ width: '100px' }} />
                                                        <span className="checkbox-label w-form-label">{ship.name}</span>
                                                    </>
                                                ) : (
                                                    <span className="checkbox-label w-form-label">{ship.name}</span>
                                                )   
                                            }
                                            <span>&nbsp;({formatDate(ship.dateDelivery, lang, { year: 'numeric', month: 'numeric', day: 'numeric' })})</span>
                                        </div>
                                        <div className="price">{ship.price > 0 ? formatPrice(ship.price) : 'GRATUIT'}</div>
                                    </label>
                                </div>
                                {
                                    AqModule && selectedShipment === ship._id && (
                                        <div>
                                            <AqModule user={user} shipment={ship} />
                                        </div>
                                    )
                                }
                            </Fragment>
                        );
                    }) : <p>{t('components/checkout/deliveryStep:noDelivery')}</p>
                }
            </>
        );
    }, [shipments, selectedShipment]);

    if (!show) {
        return null;
    }

    return (
        <>
            <form className="form-mode-paiement-tunnel" onSubmit={onSubmitDelivery}>
                <div className="columns-picker-paiement-tunnel delivery">
                    { shipmentsFiltered }
                </div>

                <div className="w-commerce-commercecartfooter" style={{ width: '100%' }}>
                    <div className="w-commerce-commercecartlineitem cart-line-item">
                        <div>{t('pages/checkout:cart.subTotal')}</div>
                        <div>{formatPrice(cart.priceSubTotal.ati)}</div>
                    </div>
                    {
                        cart.promos[0] && (
                            <div className="w-commerce-commercecartlineitem cart-line-item">
                                <div>{t('pages/checkout:cart.discount')}</div>
                                <div>- {formatPrice(cart.promos[0].discountATI)}</div>
                            </div>
                        )
                    }
                    <div className="w-commerce-commercecartlineitem cart-line-item">
                        <div>{t('components/cart:cartListItem.delivery')}</div>
                        <div>{formatPrice(deliveryValue)}</div>
                    </div>
                    <div className="w-commerce-commercecartlineitem cart-line-item">
                        <div>{t('components/cart:cartListItem.total')}</div>
                        <div className="w-commerce-commercecartordervalue text-block">
                            {formatPrice(total)}
                        </div>
                    </div>
                </div>

                <Link href="/checkout/address" className="log-button-03 w-button">
                    {t('components/checkout/deliveryStep:previous')}
                </Link>
                &nbsp;
                {
                    shipments.length > 0 && (
                        <Button 
                            text={t('components/checkout/deliveryStep:next')}
                            loadingText={t('components/checkout/deliveryStep:nextLoading')}
                            isLoading={isLoading}
                            className="log-button-03 w-button"
                        />
                    )
                }
                        
            </form>
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