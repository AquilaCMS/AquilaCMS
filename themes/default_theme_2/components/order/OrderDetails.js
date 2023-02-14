import { useEffect, useRef, useState }                               from 'react';
import { Modal }                                                     from 'react-responsive-modal';
import useTranslation                                                from 'next-translate/useTranslation';
import Button                                                        from '@components/ui/Button';
import { askCancelOrder, downloadbillOrder, getOrders }              from '@aquilacms/aquila-connector/api/order';
import { downloadVirtualProduct }                                    from '@aquilacms/aquila-connector/api/product';
import { getImage }                                                  from '@aquilacms/aquila-connector/api/product/helpersProduct';
import { useSelectPage }                                             from '@lib/hooks';
import { formatDate, formatTime, formatPrice, isAllVirtualProducts } from '@lib/utils';

export default function OrderDetails({ order, setOrders = undefined }) {
    const [message, setMessage]     = useState();
    const [openModal, setOpenModal] = useState();
    const [isLoading, setIsLoading] = useState(false);
    const timer                     = useRef();
    const { selectPage }            = useSelectPage();
    const { lang, t }               = useTranslation();

    useEffect(() => {
        return () => clearTimeout(timer.current);
    }, []);

    const downloadBill = async (bill, index) => {
        try {
            const res  = await downloadbillOrder(bill.billId); // get a blob
            const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href  = url;
            link.setAttribute('download', `${bill.avoir === false ? 'bill' : 'asset'}_${index}_${order.number}.pdf`);
            document.body.appendChild(link);
            link.click();
        } catch (err) {
            setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
            const st      = setTimeout(() => { setMessage(); }, 3000);
            timer.current = st;
        }
    };

    const cancelOrder = async () => {
        setIsLoading(true);
        try {
            const res = await askCancelOrder(order._id);
            if (res.code === 'ORDER_ASK_CANCEL_SUCCESS') {
                const orders = await getOrders(lang, { PostBody: { page: selectPage, limit: 15 } });
                setOrders(orders);
                onCloseModal();
            }
        } catch (err) {
            setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
        } finally {
            setIsLoading(false);
        }
    };

    const onOpenModal = () => {
        setOpenModal(true);
    };

    const onCloseModal = () => {
        setOpenModal(false);
    };

    const onDownloadVirtualProduct = async (item) => {
        setIsLoading(true);

        try {
            const res  = await downloadVirtualProduct(item._id);
            const url  = URL.createObjectURL(res.data);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = item.filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err) {
            setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container-order">
            <div className="columns-tunnel w-row">
                <div className="w-col w-col-8">
                    <div className="div-block-tunnel">
                        <div className="w-commerce-commercecheckoutsummaryblockheader block-header">
                            <h5>{t('components/orderDetails:orderDetail')}</h5>
                        </div>
                        <div className="block-content-tunnel">
                            <div className="collection-list-wrapper-2 w-dyn-list">
                                <div role="list" className="w-dyn-items">
                                    <div role="listitem" className="w-dyn-item">
                                        {
                                            order.items.map((item) => {
                                                return (
                                                    <div className="item-tunnel w-row" key={item._id}>
                                                        <div className="w-col w-col-3">
                                                            <div className="food-image-square-tunnel w-inline-block">
                                                                <img src={getImage({ _id: item.image, title: item.code, extension: '.png', alt: item.code }, '60x60', item.selected_variant).url || '/images/no-image.svg'} alt={item.code} className="food-image" />
                                                            </div>
                                                        </div>
                                                        <div className="w-col w-col-9">
                                                            <div className="food-title-wrap w-inline-block">
                                                                <h6 className="heading-9">{item.name}</h6>
                                                                <div className="div-block-prix">
                                                                    <div className="price">{ item.price?.special ? formatPrice(item.price.special.ati) : formatPrice(item.price.unit.ati) }</div>
                                                                    { item.price?.special ? <div className="price sale">{formatPrice(item.price.unit.ati)}</div> : null }
                                                                </div>
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
                                                            <p className="paragraph">{t('components/orderDetails:quantity')} : {item.quantity}</p>
                                                            <div>
                                                                {
                                                                    item.type === 'virtual' && ['PAID', 'BILLED'].includes(order.status) && (
                                                                        <button type="button" className="button-link-tunnel w-button" onClick={() => onDownloadVirtualProduct(item)}>{t('components/orderDetails:download')}</button>
                                                                    )
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="div-block-tunnel w-form">
                        {
                            !isAllVirtualProducts(order.items) && (
                                <>
                                    <div className="w-commerce-commercecheckoutsummaryblockheader block-header">
                                        <h5>{t('components/orderDetails:deliveryMethod')}</h5>
                                    </div>
                                    <div className="block-content-tunnel-space-flex">
                                        <div className="w-col w-col-6">
                                            <label htmlFor="email-2">
                                                {order.orderReceipt.method === 'withdrawal' ? t('components/orderDetails:withdrawal') : t('components/orderDetails:delivery')}
                                            </label>
                                            <p className="label-tunnel">
                                                {order.orderReceipt.method === 'withdrawal' ? (
                                                    formatDate(order.orderReceipt.date, lang, { year: 'numeric', month: 'numeric', day: 'numeric' }) + ' ' + formatTime(order.orderReceipt.date, lang, { hour: 'numeric', minute: 'numeric' })
                                                ) : (
                                                    <>{order.delivery?.name}<br />{t('components/orderDetails:estimatedDelivery')} :<br/>{formatDate(order.delivery.date, lang)}</>
                                                )
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )
                        }
                        <div className="w-commerce-commercecheckoutsummaryblockheader block-header">
                            <h5>{t('components/orderDetails:yourInformations')}</h5>
                        </div>
                        <div className="block-content-tunnel">
                            <div className="w-row">
                                <div className="w-col w-col-6">
                                    <label htmlFor="email-3">{t('components/orderDetails:name')}</label>
                                    <p className="label-tunnel">{order.customer.fullname}</p>
                                    <label htmlFor="email-3">{t('components/orderDetails:email')}</label>
                                    <p className="label-tunnel">{order.customer.email}</p>
                                </div>
                                <div className="w-col w-col-6">
                                    <label htmlFor="email-2">{order.orderReceipt.method === 'withdrawal' ? t('components/orderDetails:withdrawalAddress') : t('components/orderDetails:deliveryAddress')}</label>
                                    <p className="label-tunnel">
                                        {order.addresses.delivery.line1}<br />
                                        {order.addresses.delivery.line2 ? <>{order.addresses.delivery.line2}<br /></> : null}
                                        {order.addresses.delivery.zipcode}<br />
                                        {order.addresses.delivery.city}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="w-commerce-commercecheckoutsummaryblockheader block-header">
                            <h5>{t('components/orderDetails:paymentInformations')}</h5>
                        </div>
                        <div className="block-content-tunnel">
                            <div className="w-row">
                                <div className="w-col w-col-6"><label htmlFor="email-2">{t('components/orderDetails:paymentMethod')}</label>
                                    <p className="label-tunnel">{order.payment[0] ? order.payment[0].name : 'N/A'}</p>
                                </div>
                                {
                                    order.addresses.billing.line1 && (
                                        <div className="w-col w-col-6"><label htmlFor="email-2">{t('components/orderDetails:billingAddress')}</label>
                                            <p className="label-tunnel">
                                                {order.addresses.billing.line1}<br />
                                                {order.addresses.billing.line2 ? <>{order.addresses.billing.line2}<br /></> : null}
                                                {order.addresses.billing.zipcode}<br />
                                                {order.addresses.billing.city}
                                            </p>
                                        </div>
                                    )
                                }
                                    
                            </div>
                        </div>
                    </div>
                </div>
                <div className="column-tunnel-prix w-col w-col-4">
                    <div className="w-commerce-commercecheckoutsummaryblockheader block-header">
                        <h5>{t('components/orderDetails:priceDetail')}</h5>
                    </div>
                    <div className="block-content-tunnel">
                        <div>
                            <div className="w-row">
                                <div className="w-col w-col-7 w-col-medium-7 w-col-small-7 w-col-tiny-7">
                                    <p className="label-tunnel">{t('components/orderDetails:subTotal')}</p>
                                </div>
                                <div className="w-col w-col-5 w-col-medium-5 w-col-small-5 w-col-tiny-5">
                                    <p className="prix-tunnel">{formatPrice(order.priceSubTotal.ati)}</p>
                                </div>
                            </div>
                            {
                                order.promos[0] && (
                                    <div className="w-row">
                                        <div className="w-col w-col-7 w-col-small-7 w-col-tiny-7">
                                            <p className="label-tunnel">{t('components/orderDetails:discount')} <span style={{ fontSize: '12px' }}>({order.promos[0].name})</span></p>
                                        </div>
                                        <div className="w-col w-col-5 w-col-small-5 w-col-tiny-5">
                                            <p className="prix-tunnel">- {formatPrice(order.promos[0].discountATI)}</p>
                                        </div>
                                    </div>
                                )
                            }
                            <div className="w-row">
                                <div className="w-col w-col-7 w-col-small-7 w-col-tiny-7">
                                    <p className="label-tunnel">{t('components/orderDetails:delivery')}</p>
                                </div>
                                <div className="w-col w-col-5 w-col-small-5 w-col-tiny-5">
                                    <p className="prix-tunnel">{formatPrice(order.delivery.price.ati)}</p>
                                </div>
                            </div>
                            <div className="w-row">
                                <div className="w-col w-col-7 w-col-small-7 w-col-tiny-7">
                                    <p className="label-tunnel">{t('components/orderDetails:total')}</p>
                                </div>
                                <div className="w-col w-col-5 w-col-small-5 w-col-tiny-5">
                                    <p className="prix-tunnel">{formatPrice(order.priceTotal.ati)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {
                        order.bills.length > 0 && order.bills.map((bill, index) => (
                            <div key={bill._id} style={{ marginBottom: '20px' }}>
                                <button type="button" className="log-button w-button" onClick={() => downloadBill(bill, index)}>
                                    {t(`components/orderDetails:download${bill.avoir === false ? 'Bill' : 'Asset'}`)}
                                </button>
                            </div>
                        ))
                    }
                    {
                        setOrders && !['BILLED', 'DELIVERY_PROGRESS', 'DELIVERY_PARTIAL_PROGRESS', 'ASK_CANCEL', 'CANCELED', 'RETURNED'].includes(order.status) && (
                            <div style={{ marginBottom: '20px' }}>
                                <button type="button" className="log-button w-button" onClick={onOpenModal}>
                                    {t('components/orderDetails:cancelOrder')}
                                </button>
                            </div>
                        )
                    }
                    <Modal open={openModal} onClose={onCloseModal} center>
                        <h3>{t('components/orderDetails:modalTitle')}</h3>
                        <p>{t('components/orderDetails:modalWarning')}</p>
                        <div>
                            <Button
                                type="button"
                                text={t('components/orderDetails:yes')}
                                loadingText={t('components/orderDetails:cancelLoading')}
                                isLoading={isLoading}
                                className="button w-button"
                                hookOnClick={cancelOrder}
                            />
                            &nbsp;
                            <button type="button" className="button w-button" onClick={onCloseModal}>
                                {t('components/orderDetails:no')}
                            </button>
                        </div>
                    </Modal>
                    {
                        message && (
                            <div className={`w-commerce-commerce${message.type}`}>
                                <div>
                                    {message.message}
                                </div>
                            </div>
                        )
                    }
                </div>
            </div>
        </div>
    );
}