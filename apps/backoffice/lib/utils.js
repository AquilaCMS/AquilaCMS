function cleanEmptyProperties(obj)
{
    var objKeys = Object.keys(obj);
    for(var i = 0; i < objKeys.length; i++)
    {
        if(obj[objKeys[i]] === undefined || obj[objKeys[i]] == null || obj[objKeys[i]] === "")
        {
            delete obj[objKeys[i]];
        }
    }
}