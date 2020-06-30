import axios from 'axios';
import { getAPIUrl, jwtManager } from 'aqlrc';

export default function (ctx) {
    // Autorisation
    const jwt = jwtManager.get(ctx);
    if (jwt) {
        axios.defaults.headers.common.Authorization = jwt;
    } else {
        delete axios.defaults.headers.common.Authorization;
    }

    return getAPIUrl(ctx);
}
