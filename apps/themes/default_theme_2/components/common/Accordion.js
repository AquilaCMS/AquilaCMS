import { useEffect } from 'react';

export default function Accordion({ autoclose, body, children, classexpand, container, section, head }) {
    useEffect(() => {
        const matches = document.querySelectorAll(`${container} ${section} ${head}`);
        matches.forEach((m) => {
            m.addEventListener('click', expand);
        });
    }, []);

    const expand = (e) => {
        let expand          = false;
        const parentElement = e.currentTarget.closest(section);
        if (![...parentElement.classList].includes(classexpand)) {
            expand = true;
        }
        if (expand) {
            if (autoclose === '1') {
                const matches = document.querySelectorAll(`${container} ${section}`);
                matches.forEach((m) => {
                    m.classList.remove(classexpand);
                });
            }
            parentElement.classList.add(classexpand);
        } else {
            parentElement.classList.remove(classexpand);
        }
    };

    return (
        <>
            {children}
            <style jsx global>
                {`
                    ${container} ${section} ${head} {
                        cursor: pointer;
                    }

                    ${container} ${section} ${body} {
                        display: none;
                    }

                    ${container} ${section}.${classexpand} ${body} {
                        display: block;
                    }
                `}
            </style>
        </>
    );
}