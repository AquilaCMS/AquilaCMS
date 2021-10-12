import React from 'react';
import axios from 'axios';
import Head from 'next/head';
import {
    NSPageAccount, NSContext, NSToast, getLangPrefix, anonymizeUser, deleteUser, logoutUser
} from 'aqlrc';
import ModalR from 'react-responsive-modal';
import Layout from 'components/Layout';
import SidebarAccount from 'components/SidebarAccount';
import { Link, Router } from 'routes';
import getAPIUrl from 'lib/getAPIUrl';
import { withI18next } from 'lib/withI18n';

/**
 * PageRgpd - Page RGPD client (surcharge NSPageAccount)
 * @return {React.Component}
 */

class PageRgpd extends NSPageAccount {
    constructor(props) {
        super(props);
        this.state = {
            ...props,
            openModalAnonymise : false,
            openModalDelete    : false
        };
    }

    onLangChange = async (lang) => {
        window.location.pathname = `${await getLangPrefix(lang)}/account/rgpd`;
    }

    async exportData() {
        const { user } = this.props;
        axios({
            url          : `${getAPIUrl()}v2/rgpd/export/${user._id}`,
            method       : 'GET',
            responseType : 'blob',
        }).then((response) => {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'dataExport.txt');
            document.body.appendChild(link);
            link.click();
        });
    }

    anonymiseData = async () => {
        const { routerLang, t, user } = this.props;

        try {
            // Anonymisation du compte utilisateur
            await anonymizeUser(user._id);

            NSToast.success(t('account:rgpd.accountAnonymized'));
            this.setState({ openModalAnonymise: false });

            // Déconnexion
            await logoutUser();

            setTimeout(async () => {
                Router.pushRoute('auth', { lang: routerLang });
            }, 1000);
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                NSToast.error(err.response.data.message);
            } else {
                NSToast.error('common:error_occured');
                console.error(err);
            }
        }
    }

    deleteAccount = async () => {
        const { routerLang, t, user } = this.props;

        try {
            // Suppression du compte utilisateur
            await deleteUser(user._id);

            NSToast.success(t('account:rgpd.accountRemoved'));
            this.setState({ openModalDelete: false });

            // Déconnexion
            await logoutUser();

            setTimeout(() => {
                Router.pushRoute('home', { lang: routerLang });
            }, 1000);
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                NSToast.error(err.response.data.message);
            } else {
                NSToast.error('common:error_occured');
                console.error(err);
            }
        }
    }

    onOpenModal = (modal) => {
        if (modal) {
            this.setState({ openModalAnonymise: true });
        } else {
            this.setState({ openModalDelete: true });
        }
    };

    onCloseModalAnonymise = () => {
        this.setState({ openModalAnonymise: false });
    };

    onCloseModalDelete = () => {
        this.setState({ openModalDelete: false });
    };

    render() {
        const {
            oCmsHeader, oCmsFooter, sitename, t
        } = this.props;
        const { openModalAnonymise, openModalDelete } = this.state;
        return (
            <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                <Layout header={oCmsHeader.content} footer={oCmsFooter.content}>
                    <Head>
                        <title>{sitename} | {t('account:rgpd.title')}</title>
                    </Head>
                    <div className="main">
                        <div className="shell">
                            <div className="container container--flex align-top">
                                <div className="content content--alt content--left">
                                    <section className="section-client-area">
                                        <header className="section__head">
                                            <h2 className="section__title">
                                                <i className="ico-profile-large" />
                                                {t('account.page.title')}
                                            </h2>{/* <!-- /.section__title --> */}
                                        </header>{/* <!-- /.section__head --> */}
                                        <h6>{t('account:rgpd.sub_title')}</h6>
                                        <div className="section__content">
                                            <div className="form rgpd">
                                                <div className="main__inner">
                                                    <div className="shell rgpd-content">
                                                        <br/>
                                                        <div>
                                                            <button type="button" onClick={() => this.exportData()} className="btn btn--red">{t('account:rgpd.page.button.export_data')}</button>
                                                            <p>{t('account:rgpd.page.label.export_data')}</p>
                                                        </div>
                                                        <div>
                                                            <button type="button" onClick={() => this.onOpenModal(true)} className="btn btn--red">{t('account:rgpd.page.button.anonymized_data')}</button>
                                                            <p>{t('account:rgpd.page.label.anonymized_data')}</p>
                                                        </div>
                                                        <div>
                                                            <button type="button" onClick={() => this.onOpenModal(false)} className="btn btn--red">{t('account:rgpd.page.button.remove_account')}</button>
                                                            <p>{t('account:rgpd.page.label.remove_account')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <br />
                                                <div dangerouslySetInnerHTML={{ __html: this.props.cmsLegalTxt.content || '' }} />
                                            </div>

                                            <section className="section section--table">
                                                <ModalR
                                                    animationDuration={0} classNames={{ modal: 'popup__container rgpd', overlay: 'popup active' }}
                                                    open={openModalAnonymise} onClose={this.onCloseModalAnonymise} center
                                                >
                                                    <h3 className="popup__title">{t('account:rgpd.page.modal.anonymized_data')}<br /> {t('account:rgpd.page.modal.cannot_revert')}</h3>

                                                    <div className="popup__body" style={{ textAlign: 'center' }}>
                                                        <br />
                                                        <button type="button" className="btn btn--red" onClick={() => this.anonymiseData()}>
                                                            {t('account:rgpd.page.label.yes')}
                                                        </button>
                                                                    &nbsp;&nbsp;&nbsp;
                                                        <button type="button" className="btn btn--red" onClick={() => this.onCloseModalAnonymise()}>
                                                            {t('account:rgpd.page.label.no')}
                                                        </button>
                                                    </div>
                                                </ModalR>
                                                <ModalR
                                                    animationDuration={0} classNames={{ modal: 'popup__container rgpd', overlay: 'popup active' }}
                                                    open={openModalDelete} onClose={this.onCloseModalDelete} center
                                                >
                                                    <h3 className="popup__title">{t('account:rgpd.page.modal.remove_account')}<br /> {t('account:rgpd.page.modal.cannot_revert')}</h3>
                                                    <div className="popup__body" style={{ textAlign: 'center' }}>
                                                        <br />
                                                        <button type="button" className="btn btn--red" onClick={() => this.deleteAccount()}>
                                                            {t('account:rgpd.page.label.yes')}
                                                        </button>
                                                                    &nbsp;&nbsp;&nbsp;
                                                        <button type="button" className="btn btn--red" onClick={() => this.onCloseModalDelete()}>
                                                            {t('account:rgpd.page.label.no')}
                                                        </button>
                                                    </div>
                                                </ModalR>
                                            </section>
                                        </div>{/* <!-- /.section__body --> */}
                                    </section>{/* <!-- /.section-client-area --> */}
                                </div>{/* <!-- /.content --> */}
                                <SidebarAccount active="rgpd" />
                            </div>{/* <!-- /.container container--flex --> */}
                        </div>{/* <!-- /.shell --> */}
                    </div>{/* <!-- /.main --> */}
                </Layout>
            </NSContext.Provider>
        );
    }
}

export default withI18next(['account'])(PageRgpd);
