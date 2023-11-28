# Themes

Theme folders must be placed in this directory
Be careful: the name field in the theme package.json and the theme folder must have the same name.

## Options

Theme can use options in `themeConfig.json`

Options are listed here:

```json
{
    "type": "static",
    "expose": "/dist"
}
```

> Legend :
>
> - `type`: a type different from `"next"` will not load NextJS
> - `expose`: the link to public pages
