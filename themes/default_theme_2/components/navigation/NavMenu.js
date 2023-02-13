import { Fragment, useEffect, useState } from 'react';
import { useRouter }                     from 'next/router';
import useTranslation                    from 'next-translate/useTranslation';
import Link                              from 'next/link';
import { useNavMenu }                    from '@lib/hooks';
import { isMobile }                      from '@lib/utils';

export default function NavMenu() {
    const [burger, setBurger]                   = useState(false);
    const [view, setView]                       = useState([]);
    const [boolOpenSubMenu, setBoolOpenSubMenu] = useState(false);
    const navMenu                               = useNavMenu();
    const { asPath }                            = useRouter();
    const { lang, t }                           = useTranslation();

    useEffect(() => {
        setBurger(false);
    }, [asPath]);

    const toggleBurger = () => {
        setBurger(!burger);
    };

    const openSubMenu = (id, level) => {
        if (!isMobile()) {
            let array = [...view];
            if (level === 1 && boolOpenSubMenu) {
                array = [];
            }
            array.push(id);
            setView(array);
            if (level === 1) {
                setBoolOpenSubMenu(true);
            }
        }
    };

    const openSubMenuOnClick = (id) => {
        let array   = [...view];
        const index = view.findIndex((i) => i === id);
        if (index > -1) {
            array.splice(index, 1);
        } else {
            array.push(id);
        }
        setView(array);
    };

    const closeSubMenu = () => {
        setView([]);
        setBoolOpenSubMenu(false);
    };

    return (
        <>
            <div className="menu-button w-nav-button" onClick={toggleBurger}>
                <div className="icon w-icon-nav-menu" />
            </div>

            <nav className={`nav-menu w-nav-menu${burger ? ' w-nav-button-open' : ''}`}>
                {navMenu ? navMenu.children?.map((item) => {
                    let current = false;
                    if ((item.action === 'catalog' && asPath.indexOf(`/c/${item.slug[lang]}`) > -1) || asPath.indexOf(`/${item.pageSlug}`) > -1) {
                        current = true;
                    }
                    return (
                        item.children && item.children.length > 0 ? (
                            <div className="nav-link-2 pd w-dropdown" onMouseEnter={() => openSubMenu(item._id, 1)} onMouseLeave={closeSubMenu} key={item._id}>
                                <div className={`dropdown-pd-toggle w-dropdown-toggle${view.find((v) => v === item._id) ? ' w--open' : ''}`} style={current ? { backgroundColor: '#ff8946' } : {}}>
                                    <div>
                                        {
                                            item.action !== 'container' && item.slug ? (
                                                <Link href={item.action === 'catalog' || item.action === 'categorylist' ? `/c/${item.slug[lang]}` : (item.action === 'page' ? `/${item.pageSlug}` : (item.url ? item.url : '/'))} className="w-nav-link" style={{ padding: '0px' }} target={item.url?.indexOf('http') === 0 ? '_blank' : '_self'} key={item._id}>
                                                    {item.name}
                                                </Link>
                                            ) : (
                                                <span>{item.name}</span>
                                            )
                                        }
                                    </div>
                                    <div className="w-icon-dropdown-toggle" onClick={() => openSubMenuOnClick(item._id, 1)} />
                                </div>
                                <nav className={`dropdown-pd-list w-clearfix w-dropdown-list${view.find((v) => v === item._id) ? ' w--open' : ''}`}>
                                    <div className="page1">
                                        {
                                            item.children?.map((item2) => {
                                                return (
                                                    item2.children && item2.children.length > 0 ? (
                                                        <Fragment key={item2._id}>
                                                            <div className="link-to-page">
                                                                <div className="text-block-nav">
                                                                    {
                                                                        item2.action !== 'container' && item.slug && item2.slug ? (
                                                                            <Link href={item2.action === 'catalog' || item2.action === 'categorylist' ? `/c/${item.slug[lang]}/${item2.slug[lang]}` : (item2.action === 'page' ? `/${item2.pageSlug}` : (item2.url ? item2.url : '/'))} className="w-dropdown-link" target={item.url?.indexOf('http') === 0 ? '_blank' : '_self'}>
                                                                                {item2.name}
                                                                            </Link>
                                                                        ) : (
                                                                            <span key={item2._id}>{item2.name}</span>
                                                                        )
                                                                    }
                                                                </div>
                                                                <div className="arrow2 w-icon-dropdown-toggle" onClick={() => openSubMenuOnClick(item2._id, 2)} />
                                                            </div>
                                                            <div className={`page-2${view.find((v) => v === item2._id) ? 'page-2-open' : ''}`}>
                                                                {
                                                                    item2.children?.map((item3) => {
                                                                        return (
                                                                            <div className="dropdown-nav-link-2" key={item3._id}>
                                                                                <div className="icon-3 w-icon-dropdown-toggle" />
                                                                                {
                                                                                    item3.action !== 'container' && item.slug && item2.slug && item3.slug ? (
                                                                                        <Link href={item3.action === 'catalog' || item3.action === 'categorylist' ? `/c/${item.slug[lang]}/${item2.slug[lang]}/${item3.slug[lang]}` : (item3.action === 'page' ? `/${item3.pageSlug}` : (item3.url ? item3.url : '/'))} className="dropdown-link-3 w-dropdown-link" target={item.url?.indexOf('http') === 0 ? '_blank' : '_self'}>
                                                                                            {item3.name}
                                                                                        </Link>
                                                                                    ) : (
                                                                                        <span>{item3.name}</span>
                                                                                    )
                                                                                }
                                                                            </div>
                                                                        );
                                                                    })
                                                                }
                                                            </div>
                                                        </Fragment>
                                                    ) : (
                                                        <Fragment key={item2._id}>
                                                            {
                                                                item2.action !== 'container' && item2.slug ? (
                                                                    <Link href={item2.action === 'catalog' || item.action2 === 'categorylist' ? `/c/${item.slug[lang]}/${item2.slug[lang]}` : (item2.action === 'page' ? `/${item2.pageSlug}` : (item2.url ? item2.url : '/'))} className="dropdown-nav-link w-dropdown-link" target={item.url?.indexOf('http') === 0 ? '_blank' : '_self'}>
                                                                        {item2.name}
                                                                    </Link>
                                                                ) : (
                                                                    <span key={item2._id}>{item2.name}</span>
                                                                )
                                                            }
                                                        </Fragment>
                                                    )
                                                );
                                            })
                                        }
                                    </div>
                                </nav>
                            </div>
                        ) : (
                            <Fragment key={item._id}>
                                {
                                    item.action !== 'container' && item.slug ? (
                                        <Link href={item.action === 'catalog' || item.action === 'categorylist' ? `/c/${item.slug[lang]}` : (item.action === 'page' ? `/${item.pageSlug}` : (item.url ? item.url : '/'))} className="nav-link-2 w-nav-link" style={current ? { backgroundColor: '#ff8946' } : {}} target={item.url?.indexOf('http') === 0 ? '_blank' : '_self'}>
                                            {item.name}
                                        </Link>
                                    ) : (
                                        <span>{item.name}</span>
                                    )
                                }
                            </Fragment>
                        )
                    );
                }) : null}

                <Link href="/account/login" className={`nav-link-2 w-nav-link${asPath.indexOf('/account') > -1 ? ' w--current' : ''}`}>
                    {t('components/navigation:myAccount')}
                </Link>
            </nav>
        </>
    );
}
