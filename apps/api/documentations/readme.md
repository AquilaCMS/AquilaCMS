# The documentation is avaiblable to `/api-docs`

## PostBody usage

Most of the time, there are no GET routes to get items. You must use a POST route with a single parameter call <code>PostBody</code>.
Here's how to use it.

## Structure

Here is the structure of a PostBody object :

```json
{
    "lang" : "fr",
    "PostBody" :
    {
    "limit" : 10,
    "filter" :
    {
        "field1" : "filter_value",
        "field2" : "other_filter_value"
    },
    "structure" :
    {
        "field1" : 1,
        "field3" : 0
    }
    }
}
```

### Explain

<code>PostBody.limit</code> : Number of items returned. The default value is 1

<code>PostBody.filter</code> : Allows you to filter the datas. It's an object based on the mongodb's $filter(aggregation) :  <https://docs.mongodb.com/manual/reference/operator/aggregation/filter/>

<code>PostBody.structure</code> : Returns the desired object structure. It's an object based on the mongodb's projection : <https://docs.mongodb.com/manual/reference/operator/projection/positional/>

<code>PostBody.populate</code> : ask to populate fields in this array.

<code>PostBody.skip</code> : skip a specific amount of element from the request. The default value is 0

<code>PostBody.sort</code> : sort. It's an object based on the mongodb's sort : <https://docs.mongodb.com/manual/reference/method/cursor.sort/>

<code>PostBody.page</code> : page. The default value is null

## Returned Data

Most APIs return an object including an array of the requested object :

```json
{
    "datas": [
    {
        "_id": "5ba2015b49ceac42b4a16865",
        "field1": "value1",
        "field2":
        {
        "field21": "value21",
        "field22": "value22"
        }
    }
    ],
    "count": 1
}
```

When the route can returns items, they are included in array named <code>datas</code>. The <code>count</code> fields indicates the total number of items matching this request (ie for pagination).

If only one item can be return, the object is directly at the root.

The schemas of the collections possibly include translations. It's in the <code>translation</code> field. When API is call with PostBody, the language fields (and his childrens) contained in <code>translation</code> are automatically moved at the root (of translation field).

## Hooks TODOs

TODO
