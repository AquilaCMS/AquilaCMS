import { useEffect, useState }  from 'react';
import Link                     from 'next/link';
import { useRouter }            from 'next/router';
import useTranslation           from 'next-translate/useTranslation';
import Button                   from '@components/ui/Button';
import { setCartAddresses }     from '@aquilacms/aquila-connector/api/cart';
import { getTerritories }       from '@aquilacms/aquila-connector/api/territory';
import { setAddressesUser }     from '@aquilacms/aquila-connector/api/user';
import { useCart }              from '@lib/hooks';
import { isAllVirtualProducts } from '@lib/utils';

export default function AddressStep({ user }) {
    const [territories, setTerritories] = useState(null);
    const [sameAddress, setSameAddress] = useState(false);
    const [message, setMessage]         = useState();
    const [isLoading, setIsLoading]     = useState(false);
    const router                        = useRouter();
    const { cart, setCart }             = useCart();
    const { t }                         = useTranslation();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const resTerritories = await getTerritories();
                if (resTerritories?.datas?.length) {
                    setTerritories(resTerritories.datas.map((t) => ({ code: t.code, name: t.name })));
                } else {
                    setTerritories([]);
                }
            } catch (err) {
                console.error(err);
            }
        };

        // Check if the cart is empty
        if (!cart?.items?.length) {
            router.push('/checkout/cart');
        } else {
            const billingAddress  = user.addresses[user.billing_address];
            const deliveryAddress = user.addresses[user.delivery_address];
            if (billingAddress) {
                delete billingAddress['_id'];
            }
            if (deliveryAddress){
                delete deliveryAddress['_id'];
            }
            if (JSON.stringify(billingAddress) === JSON.stringify(deliveryAddress)) { 
                setSameAddress(true);
            }
            fetchData();
        }
    }, []);

    const onSubmitAddress = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const postForm = e.currentTarget;

        // Get form data
        let addresses         = [];
        const deliveryAddress = {
            firstname     : postForm.delivery_address_firstname.value,
            lastname      : postForm.delivery_address_lastname.value,
            line1         : postForm.delivery_address_line1.value,
            line2         : postForm.delivery_address_line2.value,
            city          : postForm.delivery_address_city.value,
            zipcode       : postForm.delivery_address_zipcode.value,
            isoCountryCode: postForm.delivery_address_isoCountryCode.value
        };
        if (sameAddress) {
            addresses = [deliveryAddress, deliveryAddress];
        } else {
            const billingAddress = {
                firstname     : postForm.billing_address_firstname.value,
                lastname      : postForm.billing_address_lastname.value,
                line1         : postForm.billing_address_line1.value,
                line2         : postForm.billing_address_line2.value,
                city          : postForm.billing_address_city.value,
                zipcode       : postForm.billing_address_zipcode.value,
                isoCountryCode: postForm.billing_address_isoCountryCode.value
            };
            addresses            = [billingAddress, deliveryAddress];
        }

        try {
            // Set user addresses
            await setAddressesUser(user._id, 0, 1, addresses);

            // Set cart addresses
            const newCart = await setCartAddresses(cart._id, { billing: addresses[0], delivery: addresses[1] });
            setCart(newCart);

            router.push(isAllVirtualProducts(cart.items) ? '/checkout/payment' : '/checkout/delivery');
        } catch (err) {
            setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
        } finally {
            setIsLoading(false);
        }
    };

    if (!cart?.items?.length) {
        return null;
    }

    return (
        <>
            <form className="form-mode-paiement-tunnel" onSubmit={onSubmitAddress}>
                {
                    territories && (
                        <div style={{ width: '100%' }}>
                            <div className="w-commerce-commercecheckoutsummaryblockheader block-header">
                                <h5>{t('components/checkout/addressStep:titleDelivery')}</h5>
                                <label className="required">* {t('components/checkout/addressStep:mandatory')}</label>
                            </div>
                            <div className="block-content-tunnel">
                                <div className="w-commerce-commercecheckoutrow">
                                    <div className="w-commerce-commercecheckoutcolumn">
                                        <label>{t('components/checkout/addressStep:firstname')} *</label>
                                        <input type="text" className="input-field w-input" name="delivery_address_firstname" defaultValue={user.addresses[user.delivery_address]?.firstname} maxLength={256} required />
                                    </div>
                                    <div className="w-commerce-commercecheckoutcolumn">
                                        <label>{t('components/checkout/addressStep:lastname')} *</label>
                                        <input type="text" className="input-field w-input" name="delivery_address_lastname" defaultValue={user.addresses[user.delivery_address]?.lastname} maxLength={256} required />
                                    </div>
                                </div>
                                <label className="field-label">{t('components/checkout/addressStep:line1')} *</label>
                                <input type="text" className="input-field w-input" name="delivery_address_line1" defaultValue={user.addresses[user.delivery_address]?.line1} maxLength={256} required />
                                <label className="field-label">{t('components/checkout/addressStep:line2')}</label>
                                <input type="text" className="input-field w-input" name="delivery_address_line2" defaultValue={user.addresses[user.delivery_address]?.line2} maxLength={256} />
                                <div className="w-commerce-commercecheckoutrow">
                                    <div className="w-commerce-commercecheckoutcolumn">
                                        <label className="w-commerce-commercecheckoutlabel field-label">{t('components/checkout/addressStep:city')} *</label>
                                        <input type="text" className="w-commerce-commercecheckoutshippingcity input-field" name="delivery_address_city" defaultValue={user.addresses[user.delivery_address]?.city} required />
                                    </div>
                                    <div className="w-commerce-commercecheckoutcolumn">
                                        <label className="w-commerce-commercecheckoutlabel field-label">{t('components/checkout/addressStep:postal')} *</label>
                                        <input type="text" className="w-commerce-commercecheckoutshippingzippostalcode input-field" name="delivery_address_zipcode" defaultValue={user.addresses[user.delivery_address]?.zipcode} required />
                                    </div>
                                </div>
                                <label className="w-commerce-commercecheckoutlabel field-label">{t('components/checkout/addressStep:country')} *</label>
                                <select name="delivery_address_isoCountryCode" defaultValue={user.addresses[user.delivery_address]?.isoCountryCode} className="w-commerce-commercecheckoutshippingcountryselector dropdown" required>
                                    {
                                        territories.map((territory) => (
                                            <option key={territory.code} value={territory.code}>{territory.name}</option>
                                        ))
                                    }
                                </select>
                                <br />
                                <div className="w-commerce-commercecheckoutrow">
                                    <div className="w-commerce-commercecheckoutcolumn">
                                        <label className="w-checkbox checkbox-field-allergene">
                                            <input 
                                                type="checkbox"
                                                name="sameAddress"
                                                checked={sameAddress}
                                                onChange={(e) => setSameAddress(e.target.checked)}
                                                style={{ opacity: 0, position: 'absolute', zIndex: -1 }}
                                            />
                                            <div className="w-checkbox-input w-checkbox-input--inputType-custom checkbox-allergene"></div>
                                            <span className="checkbox-label-allergene w-form-label">{t('components/checkout/addressStep:sameAddress')}</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
            
                            {
                                sameAddress === false && (
                                    <>
                                        <div className="w-commerce-commercecheckoutsummaryblockheader block-header">
                                            <h5>{t('components/checkout/addressStep:titleBilling')}</h5>
                                            <label className="required">* {t('components/checkout/addressStep:mandatory')}</label>
                                        </div>
                                        <div className="block-content-tunnel">
                                            <div className="w-commerce-commercecheckoutrow">
                                                <div className="w-commerce-commercecheckoutcolumn">
                                                    <label>{t('components/checkout/addressStep:firstname')} *</label>
                                                    <input type="text" className="input-field w-input" name="billing_address_firstname" defaultValue={user.addresses[user.billing_address]?.firstname} maxLength={256} required />
                                                </div>
                                                <div className="w-commerce-commercecheckoutcolumn">
                                                    <label>{t('components/checkout/addressStep:lastname')} *</label>
                                                    <input type="text" className="input-field w-input" name="billing_address_lastname" defaultValue={user.addresses[user.billing_address]?.lastname} maxLength={256} required />
                                                </div>
                                            </div>
                                            <label className="field-label">{t('components/checkout/addressStep:line1')} *</label>
                                            <input type="text" className="input-field w-input" name="billing_address_line1" defaultValue={user.addresses[user.billing_address]?.line1} maxLength={256} required />
                                            <label className="field-label">{t('components/checkout/addressStep:line2')}</label>
                                            <input type="text" className="input-field w-input" name="billing_address_line2" defaultValue={user.addresses[user.billing_address]?.line2} maxLength={256} />
                                            <div className="w-commerce-commercecheckoutrow">
                                                <div className="w-commerce-commercecheckoutcolumn">
                                                    <label className="w-commerce-commercecheckoutlabel field-label">{t('components/checkout/addressStep:city')} *</label>
                                                    <input type="text" className="w-commerce-commercecheckoutshippingcity input-field" name="billing_address_city" defaultValue={user.addresses[user.billing_address]?.city} required />
                                                </div>
                                                <div className="w-commerce-commercecheckoutcolumn">
                                                    <label className="w-commerce-commercecheckoutlabel field-label">{t('components/checkout/addressStep:postal')} *</label>
                                                    <input type="text" className="w-commerce-commercecheckoutshippingzippostalcode input-field" name="billing_address_zipcode" defaultValue={user.addresses[user.billing_address]?.zipcode} required />
                                                </div>
                                            </div>
                                            <label className="w-commerce-commercecheckoutlabel field-label">{t('components/checkout/addressStep:country')} *</label>
                                            <select name="billing_address_isoCountryCode" defaultValue={user.addresses[user.billing_address]?.isoCountryCode} className="w-commerce-commercecheckoutshippingcountryselector dropdown" required>
                                                {
                                                    territories.map((territory) => (
                                                        <option key={territory.code} value={territory.code}>{territory.name}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                    </>
                                )
                            }
                        </div>
                    )
                }
                
                <Link href="/checkout/cart" className="log-button-03 w-button">
                    {t('components/checkout/addressStep:previous')}
                </Link>
                &nbsp;
                <Button 
                    text={t('components/checkout/addressStep:next')}
                    loadingText={t('components/checkout/addressStep:nextLoading')}
                    isLoading={isLoading}
                    className="log-button-03 w-button"
                />
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