import React from 'react';
import Head from 'next/head';
import {
    NSContext, NSToast, getLangPrefix, resetPasswordUser
} from 'aqlrc';
import PropTypes from 'prop-types'
import Layout from 'components/Layout';
import { withI18next } from 'lib/withI18n';
import { Router } from 'routes';

/**
 * ResetPass - Page de changement de mot de passe
 * @return {React.Component}
 */

class ResetPass extends React.Component {
    static getInitialProps = async function (ctx) {
        try {
            const res = await resetPasswordUser(ctx.query.token, undefined, ctx);
            if (res.message === 'Token invalide') {
                ctx.res.redirect(`/${ctx.query.lang ? ctx.query.lang : ''}`);
            }
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                NSToast.error(err.response.data.message);
            } else {
                NSToast.error('common:error_occured');
                console.error(err);
            }
        }

        return {
            hash: ctx.query.token,
        };
    };

    constructor(props) {
        super(props);
        this.state = {
            ...props,
            password: '',
            passwordCheck: '',
        };
    }

    onLangChange = async (lang) => {
        window.location.pathname = `${await getLangPrefix(lang)}/resetpass`;
    }

    handleChangePassword(e) {
        this.setState({ [e.target.name]: e.target.value });
    }


    handlePasswordSubmit = async (event) => {
        event.preventDefault();
        const { routerLang } = this.props;
        const { password, passwordCheck, hash } = this.state;
        if (!password || !passwordCheck) { return NSToast.error('login:error_msg.invalid_password'); }
        if (password !== passwordCheck) { return NSToast.error('login:error_msg.password_mismatch'); }

        // Reset du mot de passe
        try {
            const res = await resetPasswordUser(hash, password);
            NSToast.success(res.message);
            Router.pushRoute('auth', { lang: routerLang });
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
        const {
            oCmsHeader, oCmsFooter, sitename, t
        } = this.props;
        const { password, passwordCheck } = this.state;
        return (
            <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                <Layout header={oCmsHeader.content} footer={oCmsFooter.content}>
                    <Head>
                        <title>{sitename} | {t('resetpass:page.title')}</title>
                        <meta property="og:type" content="website" />
                    </Head>
                    <section className="section-sign-in shell">
                        <div className="tabs__body" style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
                            <div className="form form-login form-login--alt" style={{ width: '50%' }}>
                                <form onSubmit={(e) => this.handlePasswordSubmit(e)} method="post">
                                    <div className="form__head">
                                        <h2>{t('resetpass:page.password_recovery.title')}</h2>
                                        <h3>{t('resetpass:page.password_recovery.sub_title')}</h3>
                                    </div>

                                    <div className="form__body">
                                        <div className="form__row">
                                            <label htmlFor="password" className="form__label">{t('resetpass:page.password_recovery.password.label')}</label>

                                            <div className="form__controls">
                                                <input type="password" className="field" name="password" id="password" value={password} onChange={(e) => this.handleChangePassword(e)} required />
                                            </div>
                                        </div>
                                        <div className="form__row">
                                            <label htmlFor="passwordCheck" className="form__label">{t('resetpass:page.password_recovery.passwordCheck.label')}</label>

                                            <div className="form__controls">
                                                <input type="password" className="field" name="passwordCheck" id="passwordCheck" value={passwordCheck} onChange={(e) => this.handleChangePassword(e)} required />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form__actions text-center" style={{ display: 'flex', justifyContent: 'center' }}>
                                        <button type="submit" className="form__btn btn btn--red">
                                            {t('resetpass:page.password_recovery.button_label')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </section>
                </Layout>
            </NSContext.Provider>
        );
    }
}

ResetPass.propTypes = {
    routerLang: PropTypes.string,
    oCmsHeader: PropTypes.object,
    oCmsFooter: PropTypes.object,
    sitename: PropTypes.string,
    t: PropTypes.func.isRequired
}

export default withI18next(['resetpass', 'login'])(ResetPass);
