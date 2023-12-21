import { useEffect, useRef, useState } from 'react';
import useTranslation                  from 'next-translate/useTranslation';
import Button                          from '@components/ui/Button';
import { addDiscount, deleteDiscount } from '@aquilacms/aquila-connector/api/cart';
import { useCart }                     from '@lib/hooks';

export default function CartDiscount() {
    const timer                     = useRef();
    const { cart, setCart }         = useCart();
    const [discount, setDiscount]   = useState(cart.promos[0]?.code || '');
    const [message, setMessage]     = useState();
    const [isLoading, setIsLoading] = useState(false);
    const { t }                     = useTranslation();

    useEffect(() => {
        setDiscount(cart.promos[0]?.code || '');
        return () => clearTimeout(timer.current);
    }, [cart]);

    const onSubmitDiscount = async () => {
        if (!discount) {
            return;
        }

        setIsLoading(true);
        
        try {
            const newCart = await addDiscount(cart._id, discount);
            if (newCart.promos.length) {
                setCart(newCart);
            } else {
                setMessage({ type: 'error', message: t('components/cartDiscount:error') });
                const st      = setTimeout(() => { setMessage(); }, 3000);
                timer.current = st;
            }
        } catch (err) {
            setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
        } finally {
            setIsLoading(false);
        }
    };

    const onDeleteDiscount = async () => {
        try {
            const newCart = await deleteDiscount(cart._id);
            setCart(newCart);
            setDiscount('');
        } catch (err) {
            setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
        } finally {
            setIsLoading(false);
        }
    };

    if (!cart.items?.filter((item) => !item.typeDisplay).length) {
        return null;
    }

    const hasDiscount = cart.promos[0]?.code || '';

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div className="form-3">
                    <input type="text" className="text-field-2 w-input" value={discount} maxLength="30" name="discount" placeholder={t('components/cartDiscount:placeholder')} required disabled={hasDiscount} onChange={(e) => setDiscount(e.target.value)} />
                    {
                        hasDiscount ? (
                            <Button
                                type="button"
                                text={t('components/cartDiscount:delete')}
                                loadingText={t('components/cartDiscount:deleting')}
                                isLoading={isLoading}
                                hookOnClick={onDeleteDiscount}
                                className="submit-button-newsletter w-button"
                            />
                        ) : (
                            <Button
                                type="button"
                                text={t('components/cartDiscount:add')}
                                loadingText={t('components/cartDiscount:addition')}
                                isLoading={isLoading}
                                hookOnClick={onSubmitDiscount}
                                className="submit-button-newsletter w-button"
                            />
                        )
                    }
                </div>
            </div>
            { hasDiscount && <div style={{ display: 'flex', justifyContent: 'center' }}>{cart.promos[0].description}</div> }
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