import { initializeStore }                    from '@lib/redux/store';
import defaultActions                         from '@lib/redux/defaultActions';
import { nsComponentDataLoader, unsetCookie } from '@lib/utils';
import Cookies                                from 'cookies';

// Dispatch default actions and requested actions (for the current page)
// Goal : No need to dispatch "global action" in every pages :)
export const dispatcher = async (locale, req, res, requestActions = []) => {
    // Init store for all dispatch
    const reduxStore   = initializeStore();
    const { dispatch } = reduxStore;
    let error          = false;
    let redirect       = undefined;
    let notFound       = false;
    
    // Default param for actions
    const defaultParams = {
        light     : false,
        lastUpdate: Date.now(),
    };

    let cookiesServerInstance;
    if (req && res) cookiesServerInstance = new Cookies(req, res);

    // Merge default actions and requested actions
    const _defaultActions = defaultActions(cookiesServerInstance, locale); // Get all other actions
    const allActions      = requestActions ? [..._defaultActions, ...requestActions] : _defaultActions;

    // For all actions, doing the real dispatch
    let content = '';
    for (let index = 0; index < allActions.length; index++) {
        // Create the action to dispatch
        const action = { ...defaultParams, ...allActions[index] };

        try {
            // Execute the function if exists
            let data = action.value;
            if (action.func) {
                data = await action.func();
            }

            dispatch({
                type      : action.type,
                light     : action.light,
                lastUpdate: action.lastUpdate,
                data
            });

            // Generates a 404 error
            if ((action.type === 'SET_STATICPAGE' || action.type === 'SET_PRODUCT') && !data) {
                notFound = true;
            }

            // Concat data of CMS block and static page
            if (action.type === 'PUSH_CMSBLOCKS') {
                if (data.length) {
                    for (const cmsblock of data) {
                        content += cmsblock.content;
                    }
                }
            } else if (action.type === 'SET_STATICPAGE') {
                content += data.content;
            }
        } catch (e) {
            error = { code: e.code || '?', message: e.name + ': ' + e.message };
            console.error(error);
            if (action.type === 'SET_CART') { // Exception for cart recovery : no 404 & delete cookie
                error = false;
                unsetCookie('cart_id', cookiesServerInstance);
            } else if (error.code === 404) {
                notFound = true;
            }
        }
    }

    // Load component data for cms blocks and static page
    const componentData = await nsComponentDataLoader(content, locale);
    if (Object.keys(componentData).length) {
        dispatch({
            ...defaultParams,
            type: 'SET_COMPONENT_DATA',
            data: componentData
        });
    }


    return { props: { error, initialReduxState: reduxStore.getState() }, redirect, notFound };
};
