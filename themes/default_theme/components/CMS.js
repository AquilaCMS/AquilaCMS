import React from 'react';
import { withRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import parse, { domToReact } from 'html-react-parser';
import attributesToProps from 'html-react-parser/lib/attributes-to-props';
import PropTypes from 'prop-types';
import { NSContext } from 'aqlrc';
import nsComponents from './_config';
import routes, { Link, Router } from 'routes';
import { withI18next } from 'lib/withI18n';
import nsModules from 'modules/list_modules';

/**
 * CMS - Affichage d'un bloc CMS
 * @return {React.Component}
 */

class CMS extends React.Component {
    // Cette fonction fournie par html-react-parser permet de customiser le parse HTML pour chaque node
    // A noter que la fonction "domToReact" permet de convertir directement un bloc HTML en React (sert pour les "children" des éléments)
    replace = ({
        type, name, attribs, children
    }) => {
        const { props } = this.context;
        if (!props) { return; }
        const { appurl } = props;
        // Composant Next Sourcia : <ns-[...]>
        if (name && type === 'tag' && nsComponents[name] !== undefined && nsComponents[name]) {
            const component = React.cloneElement(
                nsComponents[name],
                {
                    ...attribs,
                    children: domToReact(children, { replace: (obj) => this.replace(obj) }),
                    url: this.props.router,
                    i18n: this.props.i18n,
                    t: this.props.t,
                    gNext: {
                        routes,
                        Head,
                        Link,
                        Router,
                        dynamic
                    }
                }
            );
            return component;
        }
        // Module Next Sourcia : <aq-[...]>
        if (name && type === 'tag' && nsModules.find((comp) => comp.code === name)) {
            const NsModule = nsModules.find((comp) => comp.code === name).jsx.default;
            const component = React.cloneElement(
                <NsModule />,
                {
                    ...attribs,
                    url: this.props.router
                }
            );
            return component;
        }
        // Cas particulier : <ns-cms> pour insérer un bloc CMS (récursivité)
        if (name === 'ns-cms') {
            if (!attribs['ns-code']) {
                console.warn(`Bloc CMS${this.props['ns-code'] ? ` [${this.props['ns-code']}]` : ''} : Le composant <ns-cms> doit comporter un attribut ns-code !`);
                return;
            }
            const component = React.cloneElement(
                <CMS />,
                {
                    ...attribs,
                    url: this.props.router,
                    i18n: this.props.i18n,
                    t: this.props.t,
                    gNext: {
                        routes,
                        Head,
                        Link,
                        Router,
                        dynamic
                    }
                }
            );
            return component;
        }
        // Cas particulier pour les balises <a> : on tranforme automatiquement en <Link> sous certaines conditions
        if (type === 'tag' && name === 'a') {
            // Si pas de href => page home par défaut
            if (!attribs.href) {
                console.warn(`Bloc CMS${this.props['ns-code'] ? ` [${this.props['ns-code']}]` : ''} : La balise <a> doit comporter un attribut href !`);
                attribs.href = '/';
            }
            // Si l'URL comment par le nom de domaine ou un slash et qu'il n'y a pas d'extension, on insère un <Link>
            if ((attribs.href.startsWith(appurl) || attribs.href.startsWith('/')) && !attribs.href.match(/\.[a-z0-9]{1,}$/i)) {
                const route = routes.findAndGetUrls(attribs.href); // Récupération de la route correspondante à l'URL (dans routes.js)
                if (route && route.urls) {
                    return React.cloneElement(
                        <Link>
                            {
                                React.createElement(
                                    'a',
                                    { ...attributesToProps(attribs) },
                                    domToReact(children, { replace: (obj) => this.replace(obj) })
                                )
                            }
                        </Link>,
                        {
                            href: route.urls.href,
                            as: route.urls.as
                        }
                    );
                }
            }
        }
        // Cas particulier : <ns-link> pour insérer un lien Next (évite le rechargement de la page)
        // A GARDER POUR RETROCOMPATIBILITÉ : A VIRER DÈS QUE TOUS LES ns-link AURONT ÉTÉ SUPPR DE TOUS LES BLOCS CMS
        if (name === 'ns-link') {
            // Si pas de href => page home par défaut
            if (!attribs.href) {
                console.warn(`Bloc CMS${this.props['ns-code'] ? ` [${this.props['ns-code']}]` : ''} : Le composant <ns-link> doit comporter un attribut href !`);
                attribs.href = '/';
            }
            // Si le href est un lien externe, on insère une balise <a>
            if (attribs.href.indexOf('http') === 0) {
                console.warn(`Bloc CMS${this.props['ns-code'] ? ` [${this.props['ns-code']}]` : ''} : L'attribut href du composant <ns-link> ne peut pas être un lien externe !`);
                return <a href={attribs.href}>{domToReact(children, { replace: (obj) => this.replace(obj) })}</a>;
            }
            const route = routes.findAndGetUrls(attribs.href); // Récupération de la route correspondante à l'URL (dans routes.js)
            if (route && route.urls) {
                return React.cloneElement(
                    <Link>
                        <a className={attribs.class ? attribs.class : null}>{domToReact(children, { replace: (obj) => this.replace(obj) })}</a>
                    </Link>,
                    {
                        href: route.urls.href,
                        as: route.urls.as
                    }
                );
            }
        }
    }

    render() {
        const content = this.props.content !== '' ? this.props.content : (this.context.props && this.context.props[`nsCms_${this.props['ns-code']}`] ? this.context.props[`nsCms_${this.props['ns-code']}`].content : '');
        return content ? (
            <>{parse(content, { replace: (obj) => this.replace(obj) })}</> // Customisation du parse HTML via la fonction "replace"
        ) : (
                this.props.hide_error ? null : <div>Bloc CMS{this.props['ns-code'] ? ` [${this.props['ns-code']}]` : null} introuvable !</div>
            );
    }

}
CMS.contextType = NSContext;

CMS.defaultProps = {
    'ns-code': '',
    content: '',
    hide_error: null
};

CMS.propTypes = {
    'ns-code': PropTypes.string,
    content: PropTypes.string,
    router: PropTypes.object,
    i18n: PropTypes.object,
    t: PropTypes.func,
    hide_error: PropTypes.string
};

export default withRouter(withI18next([])(CMS));
