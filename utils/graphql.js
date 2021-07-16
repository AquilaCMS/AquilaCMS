/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2021 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const path                   = require('path');
const {makeExecutableSchema} = require('@graphql-tools/schema');
const {loadFiles}            = require('@graphql-tools/load-files');
const {ApolloServer}         = require('apollo-server-express');
const {InMemoryLRUCache}     = require('apollo-server-caching');
const fs                     = require('./fsp');
const {Modules}              = require('../orm/models');
const {buildSchema}          = require('../graphql');
const {dev}                  = require('./server');

const setContext = async ({req, res}) => {
    if (!req.headers.authorization) return {};
    const {getDecodedToken} = require('../services/auth');
    const {authenticate}    = require('../middleware/passport');
    const decoded           = getDecodedToken(req.headers.authorization);
    if (decoded.type === 'USER') {
        const user = await authenticate(req, res);
        return {user: user.info};
    }
    return {};
};

const startGraphQL = async (server) => {
    const directivesPaths = [path.join(global.appRoot, 'graphql', 'directives')];
    const resolversPaths  = [path.join(global.appRoot, 'graphql', 'resolvers')];
    const schemaPaths     = [path.join(global.appRoot, 'graphql', 'schema')];

    const modules              = await Modules.find({active: true});
    const modulesPathToGraphQL = modules.map((oneModule) => path.join(oneModule.path, 'graphql'));
    for (const graphQLPath of modulesPathToGraphQL) {
        if (await fs.hasAccess(graphQLPath)) {
            directivesPaths.push(path.join(graphQLPath, 'directives'));
            resolversPaths.push(path.join(graphQLPath, 'resolvers'));
            schemaPaths.push(path.join(graphQLPath, 'schema'));
        }
    }
    const typeDefs         = await buildSchema(schemaPaths);
    const resolvers        = await loadFiles(resolversPaths);
    const schemaDirectives = await loadFiles(directivesPaths);

    const apolloServer = new ApolloServer({
        schema : makeExecutableSchema({
            typeDefs,
            resolvers,
            schemaDirectives : schemaDirectives.reduce(function (acc, dir) {
                return {
                    ...acc,
                    ...dir
                };
            }, {})
        }),
        introspection    : dev,
        playground       : dev,
        cacheControl     : true,
        persistedQueries : {
            cache : new InMemoryLRUCache(),
            ttl   : 900
        },
        context : setContext
    });
    apolloServer.applyMiddleware({app: server});
};

module.exports = {
    startGraphQL
};