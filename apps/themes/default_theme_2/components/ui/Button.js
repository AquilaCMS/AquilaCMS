import { useState, useEffect } from 'react';

export default function Button({ type = 'submit', text = 'Bouton', loadingText = 'Loading...', isLoading = false, hookOnClick = undefined, className = 'log-button w-button', disabled = false, style = {} }) {
    const [localLoader, setLocalLoader] = useState(false);

    // If isLoading is change and the loading is finish, settting localLoader to false
    useEffect(() => {
        if (!isLoading) {
            setLocalLoader(false);
        }
    }, [isLoading]);

    const onClickHandler = async () => {
        setLocalLoader(true);
        if (hookOnClick) {
            hookOnClick();
        }
    };

    return <button type={type} className={className} disabled={isLoading || disabled ? 'disabled' : ''} onClick={onClickHandler} style={style}>{localLoader && isLoading ? loadingText : text}</button>;
}
