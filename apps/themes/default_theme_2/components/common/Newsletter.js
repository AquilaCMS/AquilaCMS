import { useState }      from 'react';
import useTranslation    from 'next-translate/useTranslation';
import Button            from '@components/ui/Button';
import { setNewsletter } from '@aquilacms/aquila-connector/api/newsletter';

export default function Newsletter() {
    const [message, setMessage]     = useState();
    const [isLoading, setIsLoading] = useState(false);
    const { t }                     = useTranslation();

    const handleNLSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const postForm = e.currentTarget;

        const email = postForm.email.value;
        try {
            await setNewsletter(email);
            setMessage({ type: 'info', message: t('components/newsletter:messageSuccess') });
        } catch (err) {
            setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
        }
        setIsLoading(false);
    };

    return (

        <div className="container-newsletter">
            <h4>
                <span className="text-span-9">
                    {t('components/newsletter:title')}
                </span>
            </h4>
            <div className="w-form">
                {
                    message && message.type === 'info' ? (
                        <div className="w-commerce-commerceinfo">
                            <div>
                                {message.message}
                            </div>
                        </div>
                    ) : (
                        <form className="form-3" onSubmit={handleNLSubmit}>
                            <input type="email" className="text-field-2 w-input" maxLength={256} name="email" placeholder="Email" required />
                            <Button text={t('components/newsletter:submit')} loadingText={t('components/newsletter:submitLoading')} isLoading={isLoading} className="submit-button-newsletter w-button" />
                        </form>
                    )
                }
            </div>
            {
                message && message.type !== 'info' && (
                    <div className={`w-commerce-commerce${message.type}`}>
                        <div>
                            {message.message}
                        </div>
                    </div>
                )
            }
        </div>
    );
}
