'use client';

import { Provider }    from 'react-redux';
import { createStore } from '@lib/redux/store';

export default function ReduxProvider({ children, preloadedState }) {
    const store = createStore(preloadedState);
    return (
        <Provider store={store}>
            {children}
        </Provider>
    );
}