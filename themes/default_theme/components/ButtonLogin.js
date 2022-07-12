import React from 'react';
import {NSButtonLoginAccount} from 'aqlrc';

/**
 * NSButtonLoginAccount - Affiche l'icône du compte client
 * @prop t: (function) fonction translation de i18n
 * @prop gNext: (object) variables Next : Link
 * @return {React.Component}
 *
 * Nécessite pour fonctionner des données de contexte suivantes :
 * - "routerLang" / "urlLang" / "user" présents dans le contexte de la state de la page (chargés dans _app.js)
 *
 */

class ButtonLogin extends NSButtonLoginAccount {
    render() {
        const { t, gNext } = this.props;
        const Link = (gNext && gNext.Link) || undefined;
        const { props } = this.context;
        if (!props) { return null; }
        const { routerLang, urlLang, user } = props;
        return (
            <span>
                {
                    Link !== undefined
                        ? (
                            <Link route={user ? 'account' : 'auth'} params={{ lang: routerLang }}>
                                <a><span class="material-symbols-outlined">account_circle</span></a>
                            </Link>
                        )
                        : <a href={`${urlLang}/${user ? 'account' : 'login'}`}><span class="material-symbols-outlined">account_circle</span> <span>{user ? t('common:monCompte') : t('common:connecter')}</span></a>
                }
            </span>
        );
    }
}

export default ButtonLogin;
