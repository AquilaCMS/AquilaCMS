import { useState }   from 'react';
import Link           from 'next/link';
import { useRouter }  from 'next/router';
import useTranslation from 'next-translate/useTranslation';
import { useNavMenu } from '@lib/hooks';

export default function MenuCategories() {
    const [open, setOpen] = useState(false);
    const navMenu         = useNavMenu();
    const { asPath }      = useRouter();
    const { lang, t }     = useTranslation();

    const openBlock = () => {
        setOpen(!open);
    };

    const menuCat = navMenu?.children?.filter((item) => item.action === 'catalog');

    if (menuCat?.length > 0) {
        return (
            <>
                <div className="lien_carte w-inline-block" onClick={openBlock}>
                    <h6 className="heading-bouton-carte">{t('components/navigation:viewMore')}</h6>
                    <img src="/images/Plus.svg" alt="" className="plus-2" />
                </div>

                <div className={`tab-menu-round w-tab-menu${open ? ' tab-menu-round-open' : ''}`}>
                    {menuCat?.map((item) => {
                        let current = false;
                        if (asPath.indexOf(`/c/${item.slug[lang]}`) > -1) {
                            current = true;
                        }
                        return (
                            <Link key={item._id} href={`/c/${item.slug[lang]}`} className={`tab-link-round w-inline-block w-tab-link${current ? ' w--current' : ''}`}>
                                <div>{item.name}</div>
                            </Link>
                            
                        );
                    })}
                </div>
            </>
        );
    }
    else
        return null;
}
