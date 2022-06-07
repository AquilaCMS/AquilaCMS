/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const NodeCache = require('node-cache');

// HOW TO DECLARE A NEW CACHE FROM A MODULE (in the init.js) :
// const { info } = require('./info');
// const CacheService = require('./services/cache');
// global.moduleExtend.useCacheModule = {
//     module: info.name,
//     function: (params) => { global.cache = new CacheService(params.cacheTTL); }
// };

class CacheService {
    constructor(ttlSeconds) {
        this.cache = new NodeCache({stdTTL: ttlSeconds, useClones: false});
        this.ttl   = ttlSeconds;
    }

    async get(key, storeFunction) {
        if (this.ttl && this.ttl > 0) {
            const value = this.cache.get(key);
            if (value) {
                return value;
            }

            const result = await storeFunction();
            this.cache.set(key, result);
            return result;
        }
        return storeFunction();
    }

    del(keys) {
        this.cache.del(keys);
    }

    delStartWith(startStr = '') {
        if (!startStr) {
            return;
        }

        const keys = this.cache.keys();
        for (const key of keys) {
            if (key.indexOf(startStr) === 0) {
                this.del(key);
            }
        }
    }

    flush() {
        this.cache.flushAll();
    }
}

module.exports = CacheService;