import React from 'react';
import axios from 'axios';
import Head from 'next/head';
import { NSContext, getLangPrefix } from 'aqlrc';
import PropTypes from 'prop-types'
import Layout from 'components/Layout';
import getAPIUrl from 'lib/getAPIUrl';
import { withI18next } from 'lib/withI18n';

/**
 * CheckEmailValid - Page
 * @return {React.Component}
 */

class CheckEmailValid extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            ...props,
            user: {}
        };
    }

    componentDidMount = async () => {
        try {
            const url = new URL(window.location.href);
            const activateAccountToken = url.searchParams.get('token');
            let user = await axios.post(`${getAPIUrl()}v2/user/active/account`, { activateAccountToken });
            if (!user) {
                user = null;
            }
            this.setState({ user: user.data });
        } catch (error) {
            console.error(error);
            this.setState({ user: null });
        }
    }

    onLangChange = async (lang) => {
        window.location.pathname = `${await getLangPrefix(lang)}/resetpass`;
    }

    render() {
        const {
            oCmsHeader, oCmsFooter, sitename, t
        } = this.props;
        const { user } = this.state;
        let message = '';
        if (user && user.isActiveAccount) {
            message = t('account_active');
        } else if (user === null) {
            message = t('account_inactive');
        }
        return (
            <NSContext.Provider value={{ props: this.props, state: this.state, onLangChange: (l) => this.onLangChange(l) }}>
                <Layout header={oCmsHeader.content} footer={oCmsFooter.content}>
                    <section style={{ textAlign: 'center', margin: '150px 0 150px 0' }}>
                        <Head>
                            <title>{sitename} | {message}</title>
                            <meta property="og:type" content="website" />
                        </Head>
                        <h1>{message}</h1>
                    </section>
                </Layout>
            </NSContext.Provider>
        );
    }
}

CheckEmailValid.propTypes = {
    oCmsHeader: PropTypes.object,
    oCmsFooter: PropTypes.object,
    sitename: PropTypes.string,
    t: PropTypes.func.isRequired,
}

export default withI18next(['common'])(CheckEmailValid);
