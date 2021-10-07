import React from 'react';
import {
    NSSidebarAccount,
    NSContext,
    NSToast,
    logoutUser,
    getModulesHookFunctionsByType
} from 'aqlrc';
import { withI18next } from 'lib/withI18n'
import { Link, Router } from 'routes';
import listModules from '../modules/list_modules'

class SidebarAccount extends NSSidebarAccount {
    constructor(props, context) {
        super(props, context)
        this.state = {};
    }

    logout = async () => {
        const routerLang = this.context.props ? this.context.props.routerlang : null;

        // Déconnexion de l'utilisateur
        try {
            await logoutUser();
            // HOOK => onLogout
            const onLogoutFunctions = (await getModulesHookFunctionsByType(listModules)).onLogout
            if (onLogoutFunctions) {
                for(const func of onLogoutFunctions) {
                    if(typeof func === 'function') {
                        await func()
                    }
                }
            }
            Router.pushRoute('home', { lang: routerLang });
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
        const { t } = this.props;
        const routerLang = this.context.props ? this.context.props.routerlang : null;
        return (
            <aside className="sidebar sidebar--spaced-top sidebar--alt">
                <div className="widget-links">
                    <h5>{t('account:sidebar.account')}</h5>
                    <ul>
                        <li>
                            {
                                this.props.active === 'infos'
                                    ? <strong>{t('account:sidebar.coordinates')}</strong>
                                    : <Link route="account" params={{ lang: routerLang }}><a style={{ textDecoration: 'none' }}>{t('account:sidebar.coordinates')}</a></Link>
                            }
                        </li>
                        <li>
                            {
                                this.props.active === 'addresses'
                                    ? <strong>{t('account:sidebar.addresses')}</strong>
                                    : <Link route="addresses" params={{ lang: routerLang }}><a style={{ textDecoration: 'none' }}>{t('account:sidebar.addresses')}</a></Link>
                            }
                        </li>
                        <li>
                            {
                                this.props.active === 'rgpd'
                                    ? <strong>{t('account:sidebar.GDPR')}</strong>
                                    : <Link route="rgpd" params={{ lang: routerLang }}><a style={{ textDecoration: 'none' }}>{t('account:sidebar.GDPR')}</a></Link>
                            }
                        </li>
                    </ul>
                    <hr />
                    <h5>{t('sidebar.trackingOrder')}</h5>
                    <ul>
                        <li>
                            {
                                this.props.active === 'orders'
                                    ? <strong>{t('account:sidebar.orders')}</strong>
                                    : <Link route="orders" params={{ lang: routerLang }}><a style={{ textDecoration: 'none' }}>{t('account:sidebar.orders')}</a></Link>
                            }
                        </li>
                    </ul>
                    <footer className="widget__foot">
                        <button type="button" onClick={this.logout} className="btn btn--red">{t('account:sidebar.logout')}</button>
                    </footer>{/* <!-- /.widget__foot --> */}
                </div> {/* <!-- /.widget-links --> */}
            </aside>
        );
    }

    static contextType = NSContext;
}

export default withI18next(['account'])(SidebarAccount);