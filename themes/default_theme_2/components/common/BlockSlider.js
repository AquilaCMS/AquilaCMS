
import crypto                             from 'crypto';
import useTranslation                     from 'next-translate/useTranslation';
import { Carousel }                       from 'react-responsive-carousel';
import BlockCMS                           from '@components/common/BlockCMS';
import { useCmsBlocks, useComponentData } from '@lib/hooks';

import 'react-responsive-carousel/lib/styles/carousel.min.css';

export default function BlockSlider({ 'ns-code': nsCodeList }) {
    const cmsBlocks     = useCmsBlocks();
    const componentData = useComponentData();
    const { t }         = useTranslation();

    // 2 options :
    // Live use in code (data in redux store => PUSH_CMSBLOCKS)
    // Use in CMS block (data in redux store => SET_COMPONENT_DATA)
    const codes    = nsCodeList?.replace(/\s/g, '').split(',');
    let listBlocks = cmsBlocks.filter((b) => codes.includes(b.code));
    if (!listBlocks?.length) {
        const hash = crypto.createHash('md5').update(codes.join('_')).digest('hex');
        listBlocks = componentData[`nsBlockSlider_${hash}`];
    }

    if (!listBlocks?.length) {
        return <div className="w-dyn-empty">{t('components/blockSlider:noItem', { nsCodeList })}</div>;
    }
    return (
        <Carousel
            emulateTouch={true}
            showStatus={false}
            showThumbs={false}
            renderArrowPrev={(onClickHandler, hasPrev, label) =>
                hasPrev && (
                    <div className="left-arrow w-slider-arrow-left" onClick={onClickHandler} title={label}>
                        <div className="w-icon-slider-left" />
                    </div>
                )
            }
            renderArrowNext={(onClickHandler, hasNext, label) =>
                hasNext && (
                    <div className="right-arrow w-slider-arrow-right" onClick={onClickHandler} title={label}>
                        <div className="w-icon-slider-right" />
                    </div>
                )
            }
        >
            {listBlocks.map((item) => (
                <BlockCMS key={item._id} ns-code={item.code} content={item.content} />
            ))}
        </Carousel>
    );
}
