import React from 'react';
import PropTypes from 'prop-types'
import { Link } from 'routes';
import Layout from 'components/Layout';
import { withI18next } from 'lib/withI18n';

class Error extends React.Component {
    static async getInitialProps(ctx) {
        const statusCode = ctx.res ? ctx.res.statusCode : ctx.err ? ctx.err.statusCode : null;

        return {
            statusCode
        };
    }

    constructor(props) {
        super(props);
        this.state = {
            ...props,
        };
    }

    render() {
        const { oCmsHeader, oCmsFooter, t } = this.props;
        return (

            <Layout header={oCmsHeader.content} footer={oCmsFooter.content}>
                <div style={{ minHeight: '500px', position: 'relative', textAlign: 'center' }}>
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                    }}
                    >
                        <p style={{ fontSize: '30pt' }}>404 {t('notFound')}</p>
                        <button className="btn btn--form btn--red" type="button"><Link route="home"><a>{t('returnToHomepage')}</a></Link></button>
                    </div>
                </div>
            </Layout>
        );
    }
}

Error.defaultProps = {
    contentHtml: {
        content: '',
    },
    oCmsHeader: {
        content: '',
    },
    oCmsFooter: {
        content: '',
    },
    message: '404 Not found',
};

Error.propTypes = {
    oCmsHeader: PropTypes.object,
    oCmsFooter: PropTypes.object,
    t: PropTypes.func,
}

export default withI18next(['common'])(Error);
