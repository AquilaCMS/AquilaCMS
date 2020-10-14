const components = require('./components');

module.exports = {
    openapi : '3.0.3',
    info    : {
        version     : '2.0.0',
        title       : 'Documentation for AquilaCMS\'s API',
        // eslint-disable-next-line max-len
        description : '## PostBody usage\nMost of the time, there are no GET routes to get items. You must use a POST route with a single parameter call <code>PostBody</code>.\nHere\'s how to use it.\n### Structure\nHere is the structure of a PostBody object :\n\n     {\n       "lang" : "fr",\n       "PostBody" : {\n           "limit" : 10,\n           "filter" : {\n                "field1" : "filter_value",\n                "field2" : "other_filter_value",\n           },\n           structure" : {\n               "field1" : 1,\n               "field3" : 0,\n           }\n       }\n     }\n#### Explain ####\n<code>PostBody.limit</code> : Number of items eturned. The default value is 1\n\n<code>PostBody.filter</code> : Allows you to filter the datas. It\'s an object based on the mongodb\'s $filter(aggregation) :  <https://docs.mongodb.com/manual/reference/operator/aggregation/filter/>\n\n<code>PostBody.structure</code> : Returns the desired object structure. It\'s an object based on the mongodb\'s projection : <https://docs.mongodb.com/manual/reference/operator/projection/positional/>\n\n<code>PostBody.populate</code> : sk to populate fields in this array.\n\n<code>PostBody.skip</code> : skip a specific amount of element from the request. The default value is 0\n\n<code>PostBody.sort</code> : sort. It\'s an object based on the mongodb\'s sort : <https://docs.mongodb.com/manual/reference/method/cursor.sort/>\n\n<code>PostBody.page</code> : page. The default value is null\n### Returned Data\nMost APIs return an object including an array of the requested object :\n\n     {\n       "datas": [{\n           "_id": "5ba2015b49ceac42b4a16865",\n           "field1": "value1",\n           "field2": {\n                "field21": "value21",\n                "field22": "value22"\n           }\n       }],\n       "count": 1\n     }\n\n\nWhen the route can returns items, they are included in array named <code>datas</code>. The <code>count</code> fields indicates the total number of items matching this equest (ie for pagination).\n\nIf only one item can be return, the object is directly at the root.\n\n## Schemas\nThe schemas of the collections possibly include translations. It\'s in the <code>translation</code> field. When API is call with PostBody, the language fields (and his childrens) contained in <code>translation</code> are automatically moved at the root (of translation field).\n\n',
        // termsOfService : 'https://localhost:3010/term',
        contact     : {
            email : 'contact@nextsourcia.com'
        },
        licence : {
            name : 'OSL3.0',
            url  : 'https://opensource.org/licenses/OSL-3.0'
        }
    },
    externalDocs : {
        description : 'Find out more about AquilaCMS',
        url         : 'https://www.aquila-cms.com/'
    },
    ...components
};