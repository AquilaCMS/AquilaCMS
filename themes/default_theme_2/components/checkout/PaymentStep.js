import { useEffect, useRef, useState }                    from 'react';
import Link                                               from 'next/link';
import { useRouter }                                      from 'next/router';
import useTranslation                                     from 'next-translate/useTranslation';
import parse                                              from 'html-react-parser';
import Button                                             from '@components/ui/Button';
import { getShipmentCart, cartToOrder }                   from '@aquilacms/aquila-connector/api/cart';
import { makePayment }                                    from '@aquilacms/aquila-connector/api/payment';
import { useCart, usePaymentMethods }                     from '@lib/hooks';
import { formatPrice, isAllVirtualProducts, unsetCookie } from '@lib/utils';
import i18n                                               from '/i18n';

export default function PaymentStep() {
    const timer                         = useRef();
    const [show, setShow]               = useState(false);
    const [paymentForm, setPaymentForm] = useState('');
    const [isLoading, setIsLoading]     = useState(false);
    const [message, setMessage]         = useState();
    const router                        = useRouter();
    const { cart }                      = useCart();
    const paymentMethods                = usePaymentMethods();
    const { lang, t }                   = useTranslation();

    const defaultLanguage = i18n.defaultLocale;
    
    useEffect(() => {
        const fetchData = async () => {
            let redirect = true;
            try {
                const res = await getShipmentCart({ _id: cart._id }, null, {}, lang);
                if (res.datas?.length) {
                    if (res.datas.find((item) => item.code === cart.delivery.code && item.price === cart.delivery.price.ati)) {
                        redirect = false;
                        setShow(true);
                    }
                }
            } catch (err) {
                setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
            }
            if (redirect) {
                router.push('/checkout/delivery');
            }
        };

        // Check if the cart is empty
        if (!cart?.items?.length) {
            router.push('/checkout/cart');
        } else if (!cart.addresses || !cart.addresses.billing || !cart.addresses.delivery) {
            // Check if the billing & delivery addresses exists
            router.push('/checkout/address');
        } else if (!isAllVirtualProducts(cart.items) && !cart.delivery?.method) {
            // Check if the delivery method exists
            router.push('/checkout/delivery');
        } else if (!isAllVirtualProducts(cart.items) && cart.orderReceipt?.method !== 'withdrawal' && cart.delivery?.code) {
            fetchData();
        } else {
            setShow(true);
        }
        return () => clearTimeout(timer.current);
    }, []);

    useEffect(() => {
        if (paymentForm) {
            document.getElementById('paymentid').submit();
        }
    }, [paymentForm]);

    const onSubmitPayment = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const postForm = e.currentTarget;

        const payment_code = postForm.payment.value;
        if (!payment_code) {
            return setIsLoading(false);
        }

        try {
            // Cart to order
            const order = await cartToOrder(cart._id, lang);

            // Payment
            const returnURL = `/${defaultLanguage === lang ? '' : `${lang}/`}checkout/confirmation`;
            const form      = await makePayment(order.number, payment_code, returnURL, lang);
            if (form) {
                if (form?.status && form.status !== 200) {
                    return setMessage({ type: 'error', message: form.message || t('common:message.unknownError') });
                } else {
                    setPaymentForm(form);
                }
            }

            document.cookie = 'order_id=' + order._id + '; path=/;';
            unsetCookie('cart_id');
        } catch (err) {
            if (err.messageCode === 'NOTAVAILABLE_PRODUCTS_FOR_ORDER') {
                // Redirect to cart page with delay
                setMessage({ type: 'error', message: t('components/checkout/paymentStep:error.notFoundProducts') });
                const st      = setTimeout(() => {
                    router.push('/checkout/cart');
                }, 3000);
                timer.current = st;
            } else {
                setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!show) {
        return null;
    }
    
    return (
        <>
            <form className="form-mode-paiement-tunnel" onSubmit={onSubmitPayment}>
                <div className="columns-picker-paiement-tunnel delivery">
                    {
                        paymentMethods ? paymentMethods.map((payment, index) => (
                            <div key={payment._id} className="column-center w-col w-col-12">
                                <label className="checkbox-click-collect w-radio">
                                    <input type="radio" name="payment" value={payment.code} defaultChecked={index === 0} required style={{ opacity: 0, position: 'absolute', zIndex: -1 }} />
                                    <div className="w-form-formradioinput w-form-formradioinput--inputType-custom radio-retrait w-radio-input"></div>
                                    {
                                        payment.urlLogo ? (
                                            <img src={payment.urlLogo} alt={payment.code} style={{ width: '100px' }} />
                                        ) : (
                                            <span className="checkbox-label w-form-label">{payment.name}</span>
                                        )
                                    }
                                </label>
                            </div>
                        )) : <p>{t('components/checkout/paymentStep:noPayment')}</p>
                    }
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
                    {
                        cart.delivery?.value && (
                            <div className="w-commerce-commercecartlineitem cart-line-item">
                                <div>{t('components/cart:cartListItem.delivery')}</div>
                                <div>{formatPrice(cart.delivery.value.ati)}</div>
                            </div>
                        )
                    }
                    <div className="w-commerce-commercecartlineitem cart-line-item">
                        <div>{t('components/cart:cartListItem.total')}</div>
                        <div className="w-commerce-commercecartordervalue text-block">
                            {formatPrice(cart.priceTotal.ati)}
                        </div>
                    </div>
                </div>

                <Link href={isAllVirtualProducts(cart.items) ? '/checkout/address' : '/checkout/delivery'} className="log-button-03 w-button">
                    {t('components/checkout/paymentStep:previous')}
                </Link>
                &nbsp;
                {
                    paymentMethods.length > 0 && (
                        <Button 
                            text={t('components/checkout/paymentStep:pay')}
                            loadingText={t('components/checkout/paymentStep:submitLoading')}
                            isLoading={isLoading}
                            className="log-button-03 w-button"
                        />
                    )
                }

                <div className="content" style={{ display: 'none' }}>
                    {parse(paymentForm)}
                </div>
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