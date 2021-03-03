import React from 'react';
import Slider from 'react-slick';
import { NSContext } from 'aqlrc';
import PropTypes from 'prop-types'
import CMS from './CMS';

/**
 * BlockSlider - Slider de blocs CMS
 * @return {React.Component}
 */

class BlockSlider extends React.Component {
    render() {
        const {
            autoplay,
            arrows,
            adaptiveHeight,
            dots,
            draggable
        } = this.props;
        const settings = {
            autoplay,
            arrows,
            adaptiveHeight,
            dots,
            draggable
        };
        // Si le composant est appelé depuis un bloc CMS, on ne peut pas passer de booléens mais uniquement des strings
        // Dans ce cas on interprète les valeurs possibles et on affecte un booléen
        Object.keys(settings).forEach((key) => {
            if (typeof settings[key] !== 'boolean') {
                if (settings[key] === '0' || settings[key] === 'false') {
                    settings[key] = false;
                } else {
                    settings[key] = true;
                }
            }
        });
        const nsBlockSlider = this.context.props ? this.context.props[`nsBlockSlider_${this.props['ns-code']}`] : null;
        if (!nsBlockSlider) {
            return (
                <div>{this.props.t('common:error.loadDataComponent', { component: 'BlockSlider' })}</div>
            );
        }
        return (
            <>
                <div className="NSBlockSlider">
                    <Slider {...settings} style={{ width: '100%' }}>
                        {nsBlockSlider.map((item) => (
                            <div key={item._id} style={{ width: '100%' }}>
                                <CMS content={item.content} />
                            </div>
                        ))}
                    </Slider>
                </div>
            </>
        );
    }
}

BlockSlider.contextType = NSContext

BlockSlider.propTypes = {
    autoplay: PropTypes.bool,
    arrows: PropTypes.bool,
    adaptiveHeight: PropTypes.bool,
    dots: PropTypes.bool,
    draggable: PropTypes.bool,
    t: PropTypes.func,
    ['ns-code']: PropTypes.string
}

export default BlockSlider;
