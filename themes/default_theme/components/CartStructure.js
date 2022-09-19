import React from 'react';
import Head from 'next/head';
import { NSContext, isServer } from 'aqlrc';
import PropTypes from 'prop-types'
import { Router } from 'routes';
import Layout from './Layout';
import { withI18next } from 'lib/withI18n';

/**
 * CartStructure - Squelette du panier
 * @return {React.Component}
 */

class CartStructure extends React.Component {
    render() {
        const {
            isClickable,
            oCmsHeader,
            oCmsFooter,
            step,
            t
        } = this.props;
        const routerLang = this.context.props ? this.context.props.routerlang : null;
        const progress = ['10%', '30%', '50%', '70%', '100%'];
        return (
            <Layout header={oCmsHeader.content} footer={oCmsFooter.content}>
                <Head />
                <div className="main page-content">
                    <div className="shell">
                        <div className="shipping-progress hidden-xs">
                            <ul className="shipping-steps">
                                <li
                                    className={`shipping-step${step === 1 ? ' active' : ''}`}
                                    onClick={() => (step >= 2 && isClickable ? Router.pushRoute('cartLogin', { lang: routerLang }) : console.warn('non passed step'))}>
                                    <span className="icon">
                                        <span className="material-symbols-outlined">badge</span>
                                        <span className="material-symbols-outlined mso-active">badge</span>
                                    </span>

                                    <strong>{t('steps.connexion')}</strong>
                                </li>{/* <!-- /.shipping-step --> */}

                                <li
                                    className={`shipping-step${step === 2 ? ' active' : ''}`}
                                    style={{ cursor: step >= 3 && isClickable ? 'pointer' : 'unset' }}
                                    onClick={() => (step >= 3 && isClickable ? Router.pushRoute('cartAddress', { lang: routerLang }) : console.warn('non passed step'))}>
                                    <span className="icon">
                                        <span className="material-symbols-outlined">pin_drop</span>
                                        <span className="material-symbols-outlined mso-active">pin_drop</span>
                                    </span>

                                    <strong>{t('steps.coordonnees')}</strong>
                                </li>{/* <!-- /.shipping-step --> */}

                                <li
                                    className={`shipping-step${step === 3 ? ' active' : ''}`}
                                    style={{ cursor: step >= 4 && isClickable ? 'pointer' : 'unset' }}
                                    onClick={() => (step >= 4 && isClickable ? Router.pushRoute('cartDelivery', { lang: routerLang }) : console.warn('non passed step'))}>
                                    <span className="icon">
                                        <span className="material-symbols-outlined">local_shipping</span>
                                        <span className="material-symbols-outlined mso-active">local_shipping</span>
                                    </span>

                                    <strong>{t('steps.livraison')}</strong>
                                </li>{/* <!-- /.shipping-step --> */}

                                <li
                                    className={`shipping-step${step === 4 ? ' active' : ''}`}
                                    style={{ cursor: step >= 5 && isClickable ? 'pointer' : 'unset' }}
                                    onClick={() => (step >= 5 && isClickable ? Router.pushRoute('cartPayment', { lang: routerLang }) : console.warn('non passed step'))}>
                                    <span className="icon">
                                    <span className="material-symbols-outlined">payments</span>
                                    <span className="material-symbols-outlined mso-active">payments</span>
                                    </span>

                                    <strong>{t('steps.paiement')}</strong>
                                </li>{/* <!-- /.shipping-step --> */}

                                <li className={`shipping-step${step === 5 ? ' active' : ''}`}>
                                    <span className="icon">
                                    <span className="material-symbols-outlined">task_alt</span>
                                    <span className="material-symbols-outlined mso-active">task_alt</span>
                                    </span>

                                    <strong>{t('steps.confirmation')}</strong>
                                </li>{/* <!-- /.shipping-step --> */}
                            </ul>{/* <!-- /.shipping-steps --> */}

                            <div className="shipping-progress-bar">
                                <div className="shipping-progress-bar-element" style={{ width: progress[step - 1] }} />{/* <!-- /.shipping-progress-bar-element --> */}
                                <div className="shipping-progress-bar-thumb" style={{ left: progress[step - 1] }} />{/* <!-- /.shipping-progress-bar-thumb --> */}
                            </div>{/* <!-- /.shipping-progress-bar --> */}
                        </div>{/* <!-- /.shipping-progress --> */}

                        {this.props.children}

                    </div>{/* <!-- /.shell --> */}
                </div>
                <style jsx global>{`
                    .btn-retour {${(!isServer() && window.location.pathname.indexOf('success') === -1) ? 'position: absolute;top: -117px;left: 10px;' : ''}}
                `}</style>
            </Layout>
        );
    }
}

CartStructure.contextType = NSContext;

CartStructure.defaultProps = {
    isClickable: true,
}

CartStructure.propTypes = {
    isClickable: PropTypes.bool,
    oCmsHeader: PropTypes.object,
    oCmsFooter: PropTypes.object,
    step: PropTypes.number,
    t: PropTypes.func,
    children: PropTypes.node
}

export default withI18next(['common', 'cart'])(CartStructure);
