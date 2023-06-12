import { useState }   from 'react';
import { useRouter }  from 'next/router';
import useTranslation from 'next-translate/useTranslation';
import Button         from '@components/ui/Button';
import { auth }       from '@aquilacms/aquila-connector/api/login';
import { setUser }    from '@aquilacms/aquila-connector/api/user';

export default function RegisterBlock() {
    const [messageRegister, setMessageRegister] = useState();
    const [isLoading, setIsLoading]             = useState(false);
    const router                                = useRouter();
    const { t }                                 = useTranslation();
    const redirect                              = router?.query?.redirect || '/account/informations';

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const postForm = e.currentTarget;

        // Get form data
        const user = {
            firstname   : postForm.firstname.value,
            lastname    : postForm.lastname.value,
            email       : postForm.email.value,
            password    : postForm.password.value,
            phone_mobile: postForm.phone_mobile.value
        };
        try {
            await setUser(user);

            // Event
            const addTransaction = new CustomEvent('signUp', { detail: {} });
            window.dispatchEvent(addTransaction);

            await auth(user.email, user.password);

            // Event
            const addTransaction2 = new CustomEvent('login', { detail: {} });
            window.dispatchEvent(addTransaction2);

            router.push(redirect);
        } catch (err) {
            setMessageRegister({ type: 'error', message: err.message || t('common:message.unknownError') });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form className="col-log-int w-col w-col-5" onSubmit={handleRegisterSubmit}>
            <div className="log-label">{t('components/login/registerBlock:title')}</div>
            <div className="w-form">
                <div>
                    <div><input type="text" className="w-input" maxLength={256} name="firstname" placeholder={t('components/login/registerBlock:firstname')} required /></div>
                    <div><input type="text" className="w-input" maxLength={256} name="lastname" placeholder={t('components/login/registerBlock:name')} required /></div>
                    <div><input type="email" className="w-input" maxLength={256} name="email" placeholder={t('components/login/registerBlock:email')} required /></div>
                    <div><input type="password" className="w-input" maxLength={256} name="password" placeholder={t('components/login/registerBlock:password')} required /></div>
                    <div><input type="text" className="w-input" maxLength={256} name="phone_mobile" placeholder={t('components/login/registerBlock:phone')} required /></div>
                </div>
            </div>
            {
                messageRegister && (
                    <div className={`w-commerce-commerce${messageRegister.type}`}>
                        <div>
                            {messageRegister.message}
                        </div>
                    </div>
                )
            }
            <Button text={t('components/login/registerBlock:register')} loadingText={t('components/login/registerBlock:registerLoading')} isLoading={isLoading} className="log-button w-button" />
        </form>
    );
}