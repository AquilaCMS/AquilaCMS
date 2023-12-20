import { useEffect, useState } from 'react';
import { aqlRound }            from 'aql-utils/theme';

export default function DrawStars({ mode = 'read', rate = 0, numberStars = 5, displayTextRate = true, positionTextRate = 'right',  onClickStar, questionId = null, starsColor = '#ff8946', textRateColor = '#ff8946', width = 'normal' }) {
    const [initStars, setInitStars] = useState(0);
    const [stars, setStars]         = useState(0);

    const percent = aqlRound(stars * (100 / numberStars), 2);
    
    useEffect(() => {
        if (mode === 'read') {
            setStars(rate);
        }
    }, [rate]);

    const onMouseEnterStar = (star) => {
        if (mode === 'edit') {
            setStars(star);
        }
    };

    const onMouseLeaveStar = () => {
        if (mode === 'edit') {
            setStars(initStars);
        }
    };

    const onGlobalClickStar = (star, questionId) => {
        if (mode === 'edit') {
            setInitStars(star);
            onClickStar(star, questionId);
        }
    };

    return (
        <>
            <svg style={{ display: 'none' }}>
                <symbol id="ns-review-star" width="32" height="30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M31.77 11.857H19.74L15.99.5l-3.782 11.357H0l9.885 6.903-3.692 11.21 9.736-7.05 9.796 6.962-3.722-11.18 9.766-6.845z" fill="currentColor"/></symbol>
            </svg>
            <div style={{ display: 'flex', alignItems: 'center', gap: positionTextRate === 'right' ? '10px' : '0px', flexDirection: positionTextRate === 'right' ? 'row' : 'column' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <div style={{ display: 'inline-flex', color: '#e5e7eB' }}>
                        {
                            [...Array(numberStars)].map((item, index) => (
                                <svg key={index} viewBox="0 0 32 30" style={{ width: width === 'small' ? '1rem' : '2rem', height: width === 'small' ? '1rem' : '2rem' }} onMouseEnter={() => onMouseEnterStar(index + 1)} onMouseLeave={onMouseLeaveStar}>
                                    <use xlinkHref="#ns-review-star"></use>
                                </svg>
                            ))
                        }
                    </div>
                    <div style={{ position: 'absolute', left: 0, top: 0, color: starsColor, display: 'flex', overflow: 'hidden', width: `${percent}%` }}>
                        {
                            [...Array(numberStars)].map((item, index) => (
                                <svg key={index} viewBox="0 0 32 30" style={{ width: width === 'small' ? '1rem' : '2rem', height: width === 'small' ? '1rem' : '2rem', flexShrink: 0, cursor: mode === 'edit' ? 'pointer' : 'inherit' }} onClick={() => onGlobalClickStar(index + 1, questionId)} onMouseEnter={() => onMouseEnterStar(index + 1)} onMouseLeave={onMouseLeaveStar}>
                                    <use xlinkHref="#ns-review-star"></use>
                                </svg>
                            ))
                        } 
                    </div>
                </div>
            
                { displayTextRate && <div style={{ color: textRateColor }}>{stars} / {numberStars}</div> }
            </div>
        </>
    );
}