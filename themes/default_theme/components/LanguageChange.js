import React from 'react';
import moment from 'moment';
import { NSLanguageChange } from 'aqlrc';
import { initLangAqlrc } from 'aqlrc';

/**
 * NSLanguageChange - Affiche le bloc des langues
 * @return {React.Component}
 */

export default class LanguageChange extends NSLanguageChange {
    constructor(props, context) {
        super(props, context);
        moment.locale(props.i18n.language);
    }

    componentDidMount = () => {
        // if (typeof window !== 'undefined' && document.querySelector('#toggle-lang')) {
           
        //     };
        // }

    }

    switchLang = (code) => {
        const { i18n } = this.props;
        i18n.changeLanguage(code);
        initLangAqlrc(code);
        (['filters', 'page']).forEach((k) => window.localStorage.removeItem(k));
        window.localStorage.setItem('lang', code);
        moment.locale(code);
        this.context.onLangChange(code);
    }

    render() {
        const currentLanguage = this.props.i18n.language;
        const { i18n } = this.props;
        const { props } = this.context;
        if (!props) { return null; }
        const { langs } = props;
        
        return (
            <div hidden={langs.length < 2} className="nav-lang" id="toggle-lang">
              <select className="select-lang" value={currentLanguage} onChange={(e) => this.switchLang(e.target.value)}>
                {
                    langs.map((lang) => {
                        if (lang.status === 'invisible') return;
                        return (
                            <option key={lang._id} value={lang.code}>{lang.code.toUpperCase()}</option>
                        );
                    }
                )}   
                </select>
            </div>
        )
    }
}
