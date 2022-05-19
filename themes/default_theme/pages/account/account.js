import React from 'react';
// import axios from 'axios';
import Head from 'next/head';
import {
    NSPageAccount,
    NSContext,
    NSToast,
    getLangPrefix,
    createOrUpdateUser,
    getNewsletterUser,
    sendMailResetPasswordUser,
    updateNewsletterUser
} from 'aqlrc';
import Layout from 'components/Layout';
import SidebarAccount from 'components/SidebarAccount';
import { Link, Router } from 'routes';
// import getAPIUrl from 'lib/getAPIUrl';
import { withI18next } from 'lib/withI18n';

/**
 * PageAccount - Page des coordonnées client (surcharge NSPageAccount)
 * @return {React.Component}
 */

class PageAccount extends NSPageAccount {
    constructor(props) {
        super(props);
        this.state = {
            ...props,
            birthDate: {
                day: '',
                month: '',
                year: ''
            },
            password: {
                oldPassword: '',
                newPassword: '',
                confirmPassword: ''
            },
            optinNewsletter: false,
            open: false
        };
    }

    componentDidMount = async () => {
        const { user } = this.state;
        try {
            const resNewsletter = await getNewsletterUser(user.email);
            if (resNewsletter && resNewsletter.segment.length) {
                this.setState({ optinNewsletter: resNewsletter.segment.find((n) => n.name === 'DefaultNewsletter').optin });
            }
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                NSToast.error(err.response.data.message);
            } else {
                NSToast.error('common:error_occured');
                console.error(err);
            }
        }
        if (user.birthDate) {
            const date = new Date(user.birthDate);
            const birthDate = {
                day: date.getDate(),
                month: date.getMonth() + 1,
                year: date.getFullYear()
            }
            this.setState({ birthDate });
        }
    }

    onLangChange = async (lang) => {
        window.location.pathname = `${await getLangPrefix(lang)}/account`;
    }

    handleFormChange = (event) => {
        const { user } = this.state;
        if (event.target.name.includes('.')) {
            const name = event.target.name.split('.')[1];
            user.company[name] = event.target.value;
        } else if (event.target.name === 'civility') {
            user[event.target.name] = Number(event.target.value);
        } else {
            user[event.target.name] = event.target.value;
        }
        return this.setState({ user });
    };

    handleBirthDateChange = (e, type) => {
        const { birthDate, user } = this.state;
        birthDate[type] = e.target.value;
        if (birthDate.day && birthDate.month && birthDate.year) {
            const date = new Date(birthDate.year, birthDate.month - 1, birthDate.day)
            user['birthDate'] = date;
        } else {
            user['birthDate'] = null;
        }
        this.setState({ birthDate, user });
    }

    sendMailResetPassword = async (event) => {
        event.preventDefault();
        const { lang } = this.props;
        const { user } = this.state;

        // Reset du password
        try {
            await sendMailResetPasswordUser(user.email, lang);
            NSToast.success('account:account.success_msg.mail_sent');
            this.setState({ open: false });
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                NSToast.error(err.response.data.message);
            } else {
                NSToast.error('common:error_occured');
                console.error(err);
            }
        }
    }

    // Nico G : Vu avec Bertrand, on garde ça au chaud si jamais pour la suite
    /* handleActiveAccountMail = async () => {
        try {
            const { lang, user } = this.props;
            const resMail = await axios.get(`${getAPIUrl()}v2/mail/activation/account/sent/${user._id}/${lang}`);
            NSToast.success('account:account.success_msg.mail_sent');
        } catch (error) {
            console.error(error);
        }
    } */

    handleAttributeValueEdit = (e) => {
        const {value, name} = e.target;
        const {user} = this.state;
        const idx = user.attributes.findIndex(attr => attr.code === name)
        user.attributes[idx].value = value
        this.setState({user})
    }

    handlerOptinNewsletter = async () => {
        const { optinNewsletter } = this.state;
        this.setState({ optinNewsletter: !optinNewsletter });
    }

    saveForm = async (e) => {
        e.preventDefault();
        const { user, optinNewsletter } = this.state;

        try {
            // Modification de l'utilisateur
            await createOrUpdateUser(user);

            // Acceptation de la newletter
            await updateNewsletterUser(user.email, 'DefaultNewsletter', optinNewsletter);

            NSToast.success('account:account.success_msg.saved_info');
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                NSToast.error(err.response.data.message);
            } else {
                NSToast.error('common:error_occured');
                console.error(err);
            }
        }
    };

    render() {
        const {
            langs, oCmsHeader, oCmsFooter, sitename, t
        } = this.props;
        const { birthDate, user, optinNewsletter } = this.state;

        const days = [];
        for (let i = 1; i <= 31; i++) {
            days.push(i);
        }

        const years = [];
        const now = new Date();
        const d2 = now.getFullYear();
        const d1 = d2 - 120;
        for (let i = d1; i <= d2; i++) {
            years.push(i);
        }

        return (
            <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                <Layout header={oCmsHeader.content} footer={oCmsFooter.content}>
                    <Head>
                        <title>{sitename} | {t('account:account.title')}</title>
                    </Head>
                    <div className="main">
                        <div className="shell">
                            <div className="container container--flex align-top">
                                <div className="content content--alt content--left">
                                    <section className="section-client-area">
                                        <header className="section__head">
                                            <h2 className="section__title"><i className="ico-profile-large" />{t('account:account.page.title')}</h2>{/* <!-- /.section__title --> */}
                                        </header>{/* <!-- /.section__head --> */}
                                        <h6>{t('account:account.sub_title')}</h6>
                                        <div className="section__content">
                                            <div className="form">
                                                <form onSubmit={this.saveForm}>
                                                    <div className="form__body">
                                                        <div className="form__group form__group--shrink">
                                                            <div className="form__row form__row--flex align-right">
                                                                <label htmlFor="field-email" className="form__label">{t('account:account.page.label.email')}<span>*</span></label>
                                                                <div className="form__controls" style={{ textAlign: 'end' }}>
                                                                    <input type="text" className="field" name="email" id="field-email" value={user.email} disabled />
                                                                    {
                                                                        /* user && !user.isActiveAccount
                                                                                ? (
                                                                                    <div>
                                                                                        <a onClick={this.handleActiveAccountMail} style={{ fontSize: '12px' }}>{t('account:account.page.label.send_mail_verif')}</a>
                                                                                    </div>
                                                                                )
                                                                                : '' */
                                                                    }
                                                                </div>{/* <!-- /.form__controls --> */}
                                                            </div>{/* <!-- /.form__row --> */}
                                                            <div className="form__row form__row--flex align-right">
                                                                <div className="form__controls form__controls-password align-right" style={{ textAlign: 'end' }}>
                                                                    <button type="button" onClick={this.sendMailResetPassword} className="btn btn--grey">{t('account:account.page.label.change_password')}</button>
                                                                </div>{/* <!-- /.form__controls --> */}
                                                            </div>{/* <!-- /.form__row --> */}
                                                            <div className="form__row form__row--flex align-right">
                                                                <label htmlFor="field-language" className="form__label">{t('account:account.page.label.preferredLanguage')}</label>
                                                                <div className="form__controls">
                                                                    <div className="select__controls">
                                                                        <select name="preferredLanguage" id="field-language" className="field" value={user.preferredLanguage} onChange={(e) => this.handleFormChange(e)}>
                                                                            {
                                                                                langs.map((l) => (
                                                                                    <option key={l.code} value={l.code}>
                                                                                        {l.name}
                                                                                    </option>
                                                                                ))
                                                                            }
                                                                        </select>
                                                                    </div>
                                                                </div>{/* <!-- /.form__controls --> */}
                                                            </div>
                                                            <div className="form__row form__row--flex align-right">
                                                                <span className="form__label"><strong>{t('addresses:edit.titre')}</strong><span>*</span></span>
                                                                <div className="form__controls">
                                                                    <ul className="list-checkboxes list-checkboxes--flex">
                                                                        <li>
                                                                            <div className="checkbox checkbox--medium">
                                                                                <input hidden type="radio" name="civility" id="field-madame" value={1} checked={Number(user.civility) === 1} onClick={this.handleFormChange} readOnly />
                                                                                <label htmlFor="field-madame">{t('addresses:edit.mme')}</label>
                                                                            </div>{/* <!-- /.checkbox --> */}
                                                                        </li>
                                                                        <li>
                                                                            <div className="checkbox checkbox--medium">
                                                                                <input hidden type="radio" name="civility" id="field-monsieur" value={0} checked={Number(user.civility) === 0} onClick={this.handleFormChange} readOnly />
                                                                                <label htmlFor="field-monsieur">{t('addresses:edit.mr')}</label>
                                                                            </div>{/* <!-- /.checkbox --> */}
                                                                        </li>
                                                                    </ul>{/* <!-- /.list-checkboxes --> */}
                                                                </div>{/* <!-- /.form__controls --> */}
                                                            </div>{/* <!-- /.form__row --> */}


                                                            <div className="form__row form__row--flex align-right">
                                                                <label htmlFor="field-lastname" className="form__label">{t('account:account.page.label.lastname')}<span>*</span></label>
                                                                <div className="form__controls" style={{ textAlign: 'end' }}>
                                                                    <input type="text" className="field" name="lastname" id="field-lastname" value={user.lastname} onChange={this.handleFormChange} required />
                                                                </div>
                                                            </div>
                                                            <div className="form__row form__row--flex align-right">
                                                                <label htmlFor="field-firstname" className="form__label">{t('account:account.page.label.firstname')}<span>*</span></label>
                                                                <div className="form__controls" style={{ textAlign: 'end' }}>
                                                                    <input type="text" className="field" name="firstname" id="field-firstname" value={user.firstname} onChange={this.handleFormChange} required />
                                                                </div>
                                                            </div>
                                                            {
                                                                user.attributes && user.attributes.filter(attr => attr.param === "Oui").map(attr => (
                                                                    <div className="form__row form__row--flex align-right">
                                                                        <label htmlFor="field-lastname" className="form__label">{attr.name}<span>*</span></label>
                                                                        <div className="form__controls" style={{ textAlign: 'end' }}>
                                                                            <input type="text" className="field" name={attr.code} id="field-lastname" value={attr.value} onChange={this.handleAttributeValueEdit} />
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            }
                                                            <div className="form__row form__row--flex align-right">
                                                                <label htmlFor="field-birthDate" className="form__label">{t('account:account.page.label.birthDate')}</label>
                                                                <div className="form__controls" style={{ textAlign: 'end' }}>
                                                                    <select name="birthDateDay"  className="field" value={birthDate.day} onChange={(e) => this.handleBirthDateChange(e, 'day')} style={{ width: '33%' }}>
                                                                        <option value="">{t('common:day')}</option>
                                                                        {
                                                                            days.map((i) => (
                                                                                <option key={i} value={i}>{i}</option>
                                                                            ))
                                                                        }
                                                                    </select>
                                                                    <select name="birthDateMonth" className="field" value={birthDate.month} onChange={(e) => this.handleBirthDateChange(e, 'month')} style={{ width: '34%' }}>
                                                                        <option value="">{t('common:month')}</option>
                                                                        <option value="1">{t('common:months.january')}</option>
                                                                        <option value="2">{t('common:months.february')}</option>
                                                                        <option value="3">{t('common:months.march')}</option>
                                                                        <option value="4">{t('common:months.april')}</option>
                                                                        <option value="5">{t('common:months.may')}</option>
                                                                        <option value="6">{t('common:months.june')}</option>
                                                                        <option value="7">{t('common:months.july')}</option>
                                                                        <option value="8">{t('common:months.august')}</option>
                                                                        <option value="9">{t('common:months.september')}</option>
                                                                        <option value="10">{t('common:months.october')}</option>
                                                                        <option value="11">{t('common:months.november')}</option>
                                                                        <option value="12">{t('common:months.december')}</option>
                                                                    </select>
                                                                    <select name="birthDateYear" className="field" value={birthDate.year} onChange={(e) => this.handleBirthDateChange(e, 'year')} style={{ width: '33%' }}>
                                                                        <option value="">{t('common:year')}</option>
                                                                        {
                                                                            years.map((i) => (
                                                                                <option key={i} value={i}>{i}</option>
                                                                            ))
                                                                        }
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <div className="form__row form__row--flex align-right" style={{ marginTop: '20px' }}>
                                                                <div className="checkbox-group" style={{ width: '72%' }}>
                                                                    <ul className="list-checkboxes list-checkboxes--flex">
                                                                        <li>
                                                                            <div className="checkbox checkbox--medium">
                                                                                <input type="checkbox" name="optinNewsletter" id="field-newsletter" checked={optinNewsletter} value={optinNewsletter} onChange={this.handlerOptinNewsletter} />
                                                                                <label htmlFor="field-newsletter" style={{ width: '100%' }}>
                                                                                    {t('account:account.page.label.subscribe_newsletter')}
                                                                                </label>
                                                                            </div>{/* <!-- /.checkbox --> */}
                                                                        </li>
                                                                    </ul>{/* <!-- /.list-checkboxes --> */}
                                                                </div>{/* <!-- /.checkbox-group --> */}
                                                            </div>
                                                            <div className="form__row form__row--flex align-right">
                                                                <div className="form__controls form__controls-password align-right" style={{ textAlign: 'end' }}>
                                                                    <button type="submit" className="btn btn--red">{t('account:account.page.label.validate')}</button>
                                                                </div>{/* <!-- /.form__controls --> */}
                                                            </div>{/* <!-- /.form__row --> */}
                                                            <div className="form__entry form__entry-spaced-right">
                                                                <div className="form__hint">
                                                                    <p>*{t('account:required_fields')}</p>
                                                                </div>{/* <!-- /.form__hint --> */}
                                                                <div>
                                                                    <div dangerouslySetInnerHTML={{ __html: this.props.cmsLegalTxt.content || '' }} />
                                                                </div>
                                                            </div>{/* <!-- /.form__entry form__entry-spaced-left --> */}
                                                        </div>{/* <!-- /.form__group --> */}
                                                    </div>{/* <!-- /.form__body --> */}
                                                </form>
                                            </div>{/* <!-- /.form --> */}
                                        </div>{/* <!-- /.section__body --> */}
                                    </section>{/* <!-- /.section-client-area --> */}
                                </div>{/* <!-- /.content --> */}
                                <SidebarAccount active="infos" />
                            </div>{/* <!-- /.container container--flex --> */}
                        </div>{/* <!-- /.shell --> */}
                    </div>
                </Layout>
            </NSContext.Provider>
        );
    }
}

export default withI18next(['account', 'addresses'])(PageAccount);
