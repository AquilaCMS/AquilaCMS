export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export const pageview = (url) => {
    if (GTM_ID) {
        window.dataLayer.push({
            event: 'pageview',
            page : url,
        });
    }
};

const obj = {
    pageview,
    GTM_ID
};
export default obj;