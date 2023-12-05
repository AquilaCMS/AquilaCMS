import { useEffect, useRef, useState } from 'react';
import useTranslation                  from 'next-translate/useTranslation';
import Button                          from '@components/ui/Button';
import { setContact }                  from '@aquilacms/aquila-connector/api/contact';
import { useUser }                     from '@lib/hooks';

export default function Contact({ classdiv, classinput, 'button-title': value, mode = 'send', firstnameid = 'First-Name', lastnameid = 'Last-Name', emailid = 'Email' }) {
    const divRef                    = useRef();
    const [message, setMessage]     = useState();
    const [isLoading, setIsLoading] = useState(false);
    const user                      = useUser();
    const { t }                     = useTranslation();

    useEffect(() => {
        let form = divRef.current;
        do { form = form.parentNode; } while (form.tagName !== 'FORM' && form.tagName !== 'HTML');
        form.onsubmit = onSubmitForm;

        // Auto fill for first/last name and email
        if (user) {
            if (form.querySelector(`#${firstnameid}`)) {
                form.querySelector(`#${firstnameid}`).value = user.firstname;
            }
            if (form.querySelector(`#${lastnameid}`)) {
                form.querySelector(`#${lastnameid}`).value = user.lastname;
            }
            if (form.querySelector(`#${emailid}`)) {
                form.querySelector(`#${emailid}`).value = user.email;
            }
        }
    }, [user]);

    const onSubmitForm = async (e) => {
        e.preventDefault();

        setIsLoading(true);
        const formdata = new FormData(e.target);
        try {
            await setContact(mode, formdata);
            setMessage({ type: 'info', message: t('components/contact:messageSuccess') });

            // Form reset
            let form = divRef.current;
            do { form = form.parentNode; } while (form.tagName !== 'FORM' && form.tagName !== 'HTML');
            form.reset();
        } catch(err) {
            setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div ref={divRef} className={classdiv}>
            <Button 
                text={value}
                loadingText={t('components/contact:submitLoading')}
                isLoading={isLoading}
                className={classinput}
            />
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
    );
}