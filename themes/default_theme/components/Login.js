import React from 'react';
import Head from 'next/head';
import { NSContext, NSLogin } from 'aqlrc';
import CMS from './CMS';
import { withI18next } from 'lib/withI18n';
import { listModulePage } from 'lib/utils';

/**
 * Login - Formulaire de connexion / inscription (surcharge NSLogin)
 * @return {React.Component}
 */

class Login extends NSLogin {
    render() {
        const { t } = this.props;
        const {
            emailResetPassword, step, stepMobile, user, address, countries, subUser, subscribeNL
        } = this.state;
        const { cmsLogin } = this.context.props ? this.context.props : '';
        return (
            <section className="section-sign-in shell">
                <Head>
                    <link rel="stylesheet" href="/static/css/login-register.css" />
                </Head>
                <div className="tabs tabs-only-mobile">
                    <div className="tabs__head visible-xs-block">
                        <nav className="tabs__nav">
                            <ul>
                                <li className={stepMobile === 0 ? 'current' : ''}>
                                    <a href="#" onClick={() => this.setState({ stepMobile: 0 })}>{t('login:page.nav.login')}</a>
                                </li>

                                <li className={stepMobile === 1 ? 'current' : ''}>
                                    <a href="#" onClick={() => this.setState({ stepMobile: 1 })}>{t('login:page.nav.sign_in')}</a>
                                </li>
                            </ul>
                        </nav>{/* <!-- /.tabs__nav --> */}
                    </div>{/* <!-- /.tabs__head --> */}

                    <div className="tabs__body">
                        <div className={stepMobile === 0 ? 'tab current' : 'tab'} id="tab1">
                            {
                                step === 0 && (
                                    <div className="form form-login form-login--alt">
                                        <form onSubmit={(e) => this.handleLoginSubmit(e)}>
                                            <div className="form__head">
                                                <h2>{t('login:page.client_sign_in.title')}</h2>

                                                <h3>{t('login:page.client_sign_in.sub_title')}</h3>

                                                <h6 className="visible-xs-block">{t('login:page.client_sign_in.login_label')}</h6>
                                            </div>{/* <!-- /.form__head --> */}

                                            <div className="form__body">
                                                <div className="form__row">
                                                    <label htmlFor="email_login" className="form__label hidden">{t('login:page.client_sign_in.password.label')}</label>

                                                    <div className="form__controls">
                                                        <input type="text" className="field" name="field-email" id="email_login" value={user.email} placeholder={t('login:page.client_sign_in.email.placeholder')} />
                                                        {typeof window !== 'undefined' && document.querySelector('#email_login') ? document.querySelector('#email_login').setAttribute('placeholder', t('login:page.client_sign_in.email.placeholder')) : ''}
                                                    </div>{/* <!-- /.form__controls --> */}
                                                </div>{/* <!-- /.form__row --> */}

                                                <div className="form__row">
                                                    <label htmlFor="password_login" className="form__label hidden">{t('login:page.client_sign_in.password.label')}</label>

                                                    <div className="form__controls">
                                                        <input type="password" className="field" name="field-password" id="password_login" value={user.password} placeholder={t('login:page.client_sign_in.password.placeholder')} />
                                                        {typeof window !== 'undefined' && document.querySelector('#password_login') ? document.querySelector('#password_login').setAttribute('placeholder', t('login:page.client_sign_in.password.placeholder')) : ''}
                                                        <div className="form__controls-link text-right">
                                                            <button type="button" onClick={() => this.setState({ step: 2 })} className="nbb">
                                                                {t('login:page.client_sign_in.forgot_password')}
                                                            </button>
                                                        </div>{/* <!-- /.form__controls-link --> */}
                                                    </div>{/* <!-- /.form__controls --> */}
                                                </div>{/* <!-- /.form__row --> */}
                                            </div>{/* <!-- /.form__body --> */}

                                            <div className="form__actions text-center">
                                                <button type="submit" className="form__btn btn btn--red">{t('login:page.client_sign_in.button_label')}</button>
                                            </div>{/* <!-- /.form__actions --> */}

                                            <div className="form__entry">
                                                {
                                                    listModulePage('auth')
                                                }
                                            </div>{/* <!-- /.form__entry --> */}
                                            <div className="form__entry">
                                                {
                                                    cmsLogin && <CMS ns-code="login" content={cmsLogin.content || ''} hide_error="1" />
                                                }
                                            </div>{/* <!-- /.form__entry --> */}
                                        </form>
                                    </div>
                                )
                            }
                            {
                                step === 2 && (
                                    <div className="form form-login form-login--alt">
                                        <form onSubmit={(e) => this.handleResetSubmit(e)}>
                                            <div className="form__head">
                                                <h2>{t('login:page.client_forgot_password.title')}</h2>
                                                <h3>{t('login:page.client_forgot_password.sub_title')}</h3>
                                            </div>{/* <!-- /.form__head --> */}

                                            <div className="form__body">
                                                <div className="form__row">
                                                    <label htmlFor="email_login_forgot" className="form__label hidden">{t('login:page.client_forgot_password.email.label')}</label>

                                                    <div className="form__controls">
                                                        <input type="text" className="field" name="field-email" id="email_login_forgot" value={emailResetPassword} placeholder={t('login:page.client_forgot_password.email.placeholder')} onChange={(e) => this.handleResetPassword(e)} />
                                                        {
                                                            typeof window !== 'undefined' && document.querySelector('#email_login_forgot')
                                                                ? document.querySelector('#email_login_forgot').setAttribute('placeholder', t('login:page.client_forgot_password.email.placeholder'))
                                                                : ''
                                                        }
                                                    </div>{/* <!-- /.form__controls --> */}
                                                </div>{/* <!-- /.form__row --> */}
                                            </div>{/* <!-- /.form__body --> */}

                                            <div className="form__actions text-center" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <button type="button" className="form__btn btn btn--red" onClick={() => this.setState({ step: 0 })}>
                                                    {t('login:page.client_forgot_password.return')}
                                                </button>
                                                <button type="submit" className="form__btn btn btn--red">
                                                    {t('login:page.client_forgot_password.button_label')}
                                                </button>
                                            </div>{/* <!-- /.form__actions --> */}
                                        </form>
                                    </div>
                                )
                            }
                        </div>{/* <!-- /.tab --> */}

                        <div className={stepMobile === 1 ? 'tab current' : 'tab'} id="tab2">
                            <div className="form form-login">
                                <form
                                    onSubmit={(e) => this.handleRegisterSubmit(e)}
                                >
                                    <div className="form__head">
                                        <h2>{t('login:page.client_sign_up.title')}</h2>

                                        <h3>{t('login:page.client_sign_up.sub_title')}</h3>
                                    </div>{/* <!-- /.form__head --> */}

                                    <div className="form__body">
                                        <div className="radio-group radio-group--flex  form__row--flex align-right">
                                            <span htmlFor="field-societe" className="label form__label">{t('login:page.client_sign_up.civility.label')}<span>*</span></span>
                                            <ul className="list-radios list-radios--flex">
                                                <li>
                                                    <div className="radio radio--btn">
                                                        <input hidden type="radio" name="civility" id="field-women" value={1} onChange={(e) => this.handleChangeSub(e)} />
                                                        <label htmlFor="field-women">{t('login:page.client_sign_up.civility.female')}</label>
                                                    </div>{/* <!-- /.radio --> */}
                                                </li>

                                                <li>
                                                    <div className="radio radio--btn">
                                                        <input hidden type="radio" name="civility" value={0} id="field-men" onChange={(e) => this.handleChangeSub(e)} />
                                                        <label htmlFor="field-men">{t('login:page.client_sign_up.civility.male')}</label>
                                                    </div>{/* <!-- /.radio --> */}
                                                </li>
                                            </ul>{/* <!-- /.list-radios --> */}
                                        </div>{/* <!-- /.radio-group --> */}

                                        <div className="form__row form__row--flex align-right">
                                            <label htmlFor="field-name" className="form__label">{t('login:page.client_sign_up.lastname.label')}<span>*</span></label>

                                            <div className="form__controls">
                                                <input required type="text" className="field" name="lastname" id="field-name" value={subUser.lastname} onChange={(e) => this.handleChangeSub(e)} />
                                            </div>{/* <!-- /.form__controls --> */}
                                        </div>{/* <!-- /.form__row --> */}

                                        <div className="form__row form__row--flex align-right">
                                            <label htmlFor="field-name-last" className="form__label">{t('login:page.client_sign_up.firstname.label')}<span>*</span></label>

                                            <div className="form__controls">
                                                <input required type="text" className="field" name="firstname" id="field-name-last" value={subUser.firstname} onChange={(e) => this.handleChangeSub(e)} />
                                            </div>{/* <!-- /.form__controls --> */}
                                        </div>{/* <!-- /.form__row --> */}

                                        <div className="form__row form__row--flex align-right">
                                            <label htmlFor="field-address" className="form__label">{t('login:page.client_sign_up.address.label')}<span>*</span></label>

                                            <div className="form__controls">
                                                <input required type="text" className="field" name="address/line1" id="field-address" value={address.line1} onChange={(e) => this.handleChangeSub(e)} />
                                            </div>{/* <!-- /.form__controls --> */}
                                        </div>{/* <!-- /.form__row --> */}

                                        <div className="form__row form__row--flex align-right">
                                            <label htmlFor="field-address-2" className="form__label">{t('login:page.client_sign_up.address_complementary.label')}</label>

                                            <div className="form__controls">
                                                <input type="text" className="field" name="address/line2" id="field-address-2" value={address.line2} onChange={(e) => this.handleChangeSub(e)} />
                                            </div>{/* <!-- /.form__controls --> */}
                                        </div>{/* <!-- /.form__row --> */}

                                        <div className="cols">
                                            <div className="col--small">
                                                <div className="form__row form__row--flex align-right">
                                                    <label htmlFor="field-zip" className="form__label">{t('login:page.client_sign_up.zip.label')}<span>*</span></label>

                                                    <div className="form__controls">
                                                        <input required type="text" className="field" name="address/zipcode" id="field-zip" value={address.zipcode} onChange={(e) => this.handleChangeSub(e)} />
                                                    </div>{/* <!-- /.form__controls --> */}
                                                </div>{/* <!-- /.form__row --> */}
                                            </div>{/* <!-- /.col col-1of2 --> */}

                                            <div className="col--large">
                                                <div className="form__row form__row--flex align-right">
                                                    <label htmlFor="field-city" className="form__label">{t('login:page.client_sign_up.city.label')}<span>*</span></label>

                                                    <div className="form__controls">
                                                        <input required type="text" className="field" name="address/city" id="field-city" value={address.city} onChange={(e) => this.handleChangeSub(e)} />
                                                    </div>{/* <!-- /.form__controls --> */}
                                                </div>{/* <!-- /.form__row --> */}
                                            </div>{/* <!-- /.col col-1of2 --> */}
                                        </div>{/* <!-- /.row --> */}

                                        <div className="form__row form__row--flex align-right">
                                            <label htmlFor="field-phone" className="form__label">{t('login:page.client_sign_up.phone_mobile.label')}<span>*</span></label>

                                            <div className="form__controls">
                                                <input required type="tel" className="field" name="address/phone_mobile" id="field-phone" value={address.phone_mobile} onChange={(e) => this.handleChangeSub(e)} />
                                            </div>{/* <!-- /.form__controls --> */}
                                        </div>{/* <!-- /.form__row --> */}

                                        <div className="form__row form__row--flex align-right">
                                            <label htmlFor="field-country" className="form__label">{t('login:page.client_sign_up.country.label')}<span>*</span></label>

                                            <div className="form__controls">
                                                <select required type="tel" defaultValue="" className="field" name="address/isoCountryCode" id="field-country" value={address.isoCountryCode} onChange={(e) => this.handleChangeSub(e)}>
                                                    <option value="">--</option>
                                                    {
                                                        countries.map((c) => (<option key={c._id} value={c.code}>{c.name}</option>))
                                                    }
                                                </select>
                                            </div>{/* <!-- /.form__controls --> */}
                                        </div>{/* <!-- /.form__row --> */}
                                        
                                        {
                                            subUser.attributes && subUser.attributes.filter(attr => attr.param === "Oui").map(attr => (
                                                <div className="form__row form__row--flex align-right">
                                                    <label htmlFor="field-lastname" className="form__label">{attr.name}<span>*</span></label>
                                                    <div className="form__controls" style={{ textAlign: 'end' }}>
                                                        <input type="text" className="field" name={attr.code} id="field-lastname" value={attr.value} onChange={this.handleAttributeValueEdit} />
                                                    </div>
                                                </div>
                                            ))
                                        }

                                        <div className="form__row form__row--flex align-right">
                                            <label htmlFor="field-email3" className="form__label">{t('login:page.client_sign_up.email.label')}<span>*</span></label>

                                            <div className="form__controls">
                                                <input required type="email" className="field" name="email" id="field-email3" value={subUser.email} onChange={(e) => this.handleChangeSub(e)} />
                                            </div>{/* <!-- /.form__controls --> */}
                                        </div>{/* <!-- /.form__row --> */}

                                        <div className="form__row form__row--flex align-right">
                                            <label htmlFor="field-email-confirm" className="form__label">{t('login:page.client_sign_up.email_confirm.label')}<span>*</span></label>

                                            <div className="form__controls">
                                                <input required type="email" className="field" name="confirmEmail" id="field-email-confirm" value={subUser.confirmEmail} onChange={(e) => this.handleChangeSub(e)} />
                                            </div>{/* <!-- /.form__controls --> */}
                                        </div>{/* <!-- /.form__row --> */}

                                        <div className="form__row form__row--flex align-right">
                                            <label htmlFor="field-password3" className="form__label">{t('login:page.client_sign_up.password.label')}<span>*</span></label>

                                            <div className="form__controls">
                                                <input required onChange={(e) => this.handleChangeSub(e)} type="password" className="field" name="password" id="field-password3" value={subUser.password} placeholder={t('login:page.client_sign_up.password.placeholder')} />
                                            </div>{/* <!-- /.form__controls --> */}
                                        </div>{/* <!-- /.form__row --> */}

                                        <div className="form__row form__row--flex align-right">
                                            <label htmlFor="field-password-confirm3" className="form__label">{t('login:page.client_sign_up.password_confirm.label')}<span>*</span></label>

                                            <div className="form__controls">
                                                <input required onChange={(e) => this.handleChangeSub(e)} type="password" className="field" name="passwordConfirm" id="field-password-confirm3" value={subUser.passwordConfirm} />
                                            </div>{/* <!-- /.form__controls --> */}
                                        </div>{/* <!-- /.form__row --> */}

                                        <div className="form__entry form__entry-spaced-left-alt form__entry-no-spacings">
                                            <div className="form__hint form__hint--alt">
                                                <p>{t('login:page.client_sign_up.required_label')}</p>
                                            </div>{/* <!-- /.form__hint --> */}
                                        </div>{/* <!-- /.form__entry --> */}
                                    </div>{/* <!-- /.form__body --> */}

                                    <div className="checkbox-group-alt" style={{ paddingTop: '20px' }}>
                                        <p>{t('login:page.client_sign_up.commercial_ads.label')}</p>

                                        <ul className="list-checkboxes list-checkboxes--flex">
                                            <li>
                                                <div className="checkbox checkbox--medium">
                                                    <input hidden type="radio" name="field-newsletter" defaultChecked={subscribeNL} id="field-yes" onChange={() => this.setState({ subscribeNL: true })} />

                                                    <label style={{ fontSize: '14px' }} htmlFor="field-yes">{t('login:page.client_sign_up.commercial_ads.yes')}</label>
                                                </div>{/* <!-- /.checkbox --> */}
                                            </li>

                                            <li>
                                                <div className="checkbox checkbox--medium">
                                                    <input hidden type="radio" name="field-newsletter" defaultChecked={!subscribeNL} id="field-no" onChange={() => this.setState({ subscribeNL: false })} />

                                                    <label style={{ fontSize: '14px' }} htmlFor="field-no">{t('login:page.client_sign_up.commercial_ads.no')}</label>
                                                </div>{/* <!-- /.checkbox --> */}
                                            </li>
                                        </ul>{/* <!-- /.list-checkboxes --> */}
                                    </div>{/* <!-- /.checkbox-group --> */}

                                    <div className="form__actions text-center">
                                        <button type="submit" className="form__btn btn btn--red">{t('login:page.client_sign_up.button_label')}</button>
                                    </div>{/* <!-- /.form__actions --> */}
                                </form>
                            </div>{/* <!-- /.form form-login --> */}
                        </div>{/* <!-- /.tab --> */}
                    </div>{/* <!-- /.tabs__body --> */}
                </div>{/* <!-- /.tabs --> */}
                {typeof window !== 'undefined' && document.querySelector('#field-password3') ? document.querySelector('#field-password3').setAttribute('placeholder', t('login:page.client_sign_up.password.placeholder')) : ''}
            </section>
        );
    }

    static contextType = NSContext;
}

export default withI18next(['login'])(Login);
