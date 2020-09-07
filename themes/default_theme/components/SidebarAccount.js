import React, { Component } from 'react';
import {NSSidebarAccount, NSContext, NSToast, logoutUser} from 'aqlrc';

export default class SidebarAccount extends NSSidebarAccount {
    constructor(props, context) {
        super(props, context)
        this.state = {};
    }

    logout = async () => {
        const { gNext } = this.props;
        const { routerLang, urlLang } = this.context.state;
        const Router = (gNext && gNext.Router) || undefined;

        // Déconnexion de l'utilisateur
        try {
            await logoutUser();
            // HOOK => onLogout
            if(this.context.props.hooksFunctions && this.context.props.hooksFunctions.onLogout) this.context.props.hooksFunctions.onLogout.map(func => func())
            if (Router !== undefined) {
                Router.pushRoute('home', { lang: routerLang });
            } else {
                window.location.pathname = urlLang;
            }
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                NSToast.error(err.response.data.message);
            } else {
                NSToast.error('common:error_occured');
                console.error(err);
            }
        }
    }

    render() {
        const { gNext, t } = this.props;
        const { urlLang, routerLang } = this.context.state;
        const Link = (gNext && gNext.Link) || undefined;
        return (
            <aside className="sidebar sidebar--spaced-top sidebar--alt">
                <div className="widget-links">
                    <h5>{t('sidebar.account')}</h5>
                    <ul>
                        <li>
                            {
                                this.props.active === 'infos'
                                    ? <strong>{t('sidebar.coordinates')}</strong>
                                    : (
                                        Link !== undefined ? (
                                            <Link route="account" params={{ lang: routerLang }}><a style={{ textDecoration: 'none' }}>{t('sidebar.coordinates')}</a></Link>
                                        ) : (
                                            <a href={`${urlLang}/account`} style={{ textDecoration: 'none' }}>{t('sidebar.coordinates')}</a>
                                        )
                                    )
                            }
                        </li>
                        <li>
                            {
                                this.props.active === 'addresses'
                                    ? <strong>{t('sidebar.addresses')}</strong>
                                    : (
                                        Link !== undefined ? (
                                            <Link route="addresses" params={{ lang: routerLang }}><a style={{ textDecoration: 'none' }}>{t('sidebar.addresses')}</a></Link>
                                        ) : (
                                            <a href={`${urlLang}/account/addresses`} style={{ textDecoration: 'none' }}>{t('sidebar.addresses')}</a>
                                        )
                                    )
                            }
                        </li>
                        <li>
                            {
                                this.props.active === 'rgpd'
                                    ? <strong>{t('sidebar.GDPR')}</strong>
                                    : (
                                        Link !== undefined ? (
                                            <Link route="rgpd" params={{ lang: routerLang }}><a style={{ textDecoration: 'none' }}>{t('sidebar.GDPR')}</a></Link>
                                        ) : (
                                            <a href={`${urlLang}/account/rgpd`} style={{ textDecoration: 'none' }}>{t('sidebar.GDPR')}</a>
                                        )
                                    )
                            }
                        </li>
                    </ul>
                    <hr />
                    <h5>{t('sidebar.trackingOrder')}</h5>
                    <ul>
                        <li>
                            {
                                this.props.active === 'orders'
                                    ? <strong>{t('sidebar.orders')}</strong>
                                    : (
                                        Link !== undefined ? (
                                            <Link route="orders" params={{ lang: routerLang }}><a style={{ textDecoration: 'none' }}>{t('sidebar.orders')}</a></Link>
                                        ) : (
                                            <a href={`${urlLang}/account/orders`} style={{ textDecoration: 'none' }}>{t('sidebar.orders')}</a>
                                        )
                                    )
                            }
                        </li>
                    </ul>
                    <footer className="widget__foot">
                        <button type="button" onClick={this.logout} className="btn btn--red">{t('sidebar.logout')}</button>
                    </footer>{/* <!-- /.widget__foot --> */}
                </div> {/* <!-- /.widget-links --> */}
            </aside>
        );
    }

    static contextType = NSContext;
}
