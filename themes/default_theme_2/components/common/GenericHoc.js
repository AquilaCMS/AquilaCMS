import dynamic          from 'next/dynamic';
import { getAqModules } from '@lib/utils';

export default function HOC ({ children }) {
    const hocAqModules = getAqModules()?.filter((aqModule) => aqModule.type === 'hoc');

    const recursiveHOC = (children) => {
        if (hocAqModules.length > 0) {
            const aqModule  = hocAqModules.shift();
            const Component = dynamic(() => aqModule.jsx);
            return (
                <Component>
                    { recursiveHOC(children) }
                </Component>
            );
        } else {
            return children;
        }
    };

    return (
        <>
            { recursiveHOC(children) }
        </>
    );
}