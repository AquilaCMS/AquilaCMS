import { useState }         from 'react';
import useTranslation       from 'next-translate/useTranslation';
import DrawStars            from '@components/common/DrawStars';
import Button               from '@components/ui/Button';
import { setProductReview } from '@aquilacms/aquila-connector/api/product';

export default function PostReview({ product, onCloseModal }) {
    const [review, setReview]       = useState({
        rate  : 0,
        title : '',
        review: ''
    });
    const [message, setMessage]     = useState();
    const [isLoading, setIsLoading] = useState(false);
    const { lang, t }               = useTranslation();

    const onChangeReview = (e) => {
        setReview({ ...review, [e.target.name]: e.target.value });
    };

    const onClickStar = (rate) => {
        setReview({ ...review, rate });
    };

    const onSubmitReview = async (e) => {
        e.preventDefault();
        
        setIsLoading(true);
        setMessage();

        try {
            // Check title length
            if (review.title.length > 100) {
                review.title = review.title.substring(0, 100);
            }

            // Check review length
            if (review.review.length > 5000) {
                review.review = review.review.substring(0, 5000);
            }

            // Adding bundle product to cart
            await setProductReview(product._id, review, lang);
            onCloseModal();

            // Event
            const addTransaction = new CustomEvent('postReview', { detail: { review } });
            window.dispatchEvent(addTransaction);
        } catch (err) {
            setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={onSubmitReview}>
            <div className="title-wrap-centre">
                <h3 className="header-h4">{t('components/postReview:postReview')}</h3>
                <h5 className="seprateur-carte">{product.name}</h5>
            </div>
            <div className="block-content-tunnel">
                <label className="field-label">{t('components/postReview:rate')}</label>
                <div>
                    <DrawStars mode="edit" onClickStar={onClickStar} />
                </div>
                <label className="field-label">{t('components/postReview:title')}</label>
                <input type="text" className="w-input" name="title" maxLength={100} value={review.title} onChange={onChangeReview} required />
                <label className="field-label">{t('components/postReview:review')}</label>
                <textarea placeholder="Votre avis" maxLength={5000} rows={6} className="w-input" name="review" value={review.review} onChange={onChangeReview} required />
                <span className="text-small">{5000 - review.review.length} {t('components/postReview:remainingCharacters')}</span>
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
                text="Valider"
                loadingText={t('components/bundleProduct:submitLoading')}
                isLoading={isLoading}
                className="button full w-button"
                style={{ width: '100%', marginTop: '10px' }}
            />
        </form>
    );
}