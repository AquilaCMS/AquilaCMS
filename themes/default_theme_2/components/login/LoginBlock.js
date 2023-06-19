import { useState }                    from 'react';
import { useRouter }                   from 'next/router';
import useTranslation                  from 'next-translate/useTranslation';
import Button                          from '@components/ui/Button';
import { auth, sendMailResetPassword } from '@aquilacms/aquila-connector/api/login';

export default function LoginBlock() {
    const [step, setStep]                 = useState(0);
    const [messageLogin, setMessageLogin] = useState();
    const [messageReset, setMessageReset] = useState();
    const [isLoading, setIsLoading]       = useState(false);
    const router                          = useRouter();
    const { lang, t }                     = useTranslation();
    const redirect                        = router?.query?.redirect || '/account/informations';


    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const postForm = e.currentTarget;

        // Get form data
        const email    = postForm.email.value;
        const password = postForm.password.value;
        try {
            await auth(email, password);

            // Event
            const addTransaction = new CustomEvent('login', { detail: {} });
            window.dispatchEvent(addTransaction);

            router.push(redirect);
        } catch (err) {
            setMessageLogin({ type: 'error', message: err.message || t('common:message.unknownError') });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const postForm = e.currentTarget;
        
        const email = postForm.email.value;
        try {
            await sendMailResetPassword(email, lang);
            setMessageReset({ type: 'info', message: t('components/login/loginBlock:forgot.infoGetMail') });
        } catch (err) {
            setMessageReset({ type: 'error', message: err.message || t('common:message.unknownError') });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {
                step === 0 && (
                    <form className="col-log-int w-col w-col-5" onSubmit={handleLoginSubmit}>
                        <div className="log-label">
                            {t('components/login/loginBlock:title1')}
                            <br/>
                            {t('components/login/loginBlock:title2')}
                        </div>
                        <div className="w-form">
                            <div>
                                <div><input type="email" className="w-input" maxLength={256} name="email" placeholder="Email" required autoComplete="username" /></div>
                                <div>
                                    <input type="password" className="w-input" maxLength={256} name="password" placeholder={t('components/login/loginBlock:password')} required autoComplete="current-password" />
                                    <div className="small-text marg-b-20" style={{ cursor: 'pointer' }} onClick={() => setStep(1)}>
                                        <em>{t('components/login/loginBlock:forgotPass')}</em>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {
                            messageLogin && (
                                <div className={`w-commerce-commerce${messageLogin.type}`}>
                                    <div>
                                        {messageLogin.message}
                                    </div>
                                </div>
                            )
                        }
                
                        <Button text={t('components/login/loginBlock:signin')} loadingText={t('components/login/loginBlock:signinLoading')} isLoading={isLoading} className="log-button w-button" />
                    </form>
                )
            }
            {
                step === 1 && (
                    <form className="col-log-int w-col w-col-5" onSubmit={handleResetSubmit}>
                        <div className="log-label">{t('components/login/loginBlock:forgot.email')}</div>
                        <div className="w-form">
                            <div>
                                <div>
                                    <input type="email" className="w-input" maxLength={256} name="email" placeholder="Email" required />
                                    <Button text={t('components/login/loginBlock:forgot.send')} loadingText={t('components/login/loginBlock:forgot.sendLoading')} isLoading={isLoading} className="log-button w-button" />
                                </div>
                            </div>
                        </div>
                        {
                            messageReset && (
                                <div className={`w-commerce-commerce${messageReset.type}`}>
                                    <div>
                                        {messageReset.message}
                                    </div>
                                </div>
                            )
                        }
                        <button className="log-button w-button" onClick={() => setStep(0)}>{t('components/login/loginBlock:forgot.back')}</button>
                    </form>
                )
            }
        </>
    );
}