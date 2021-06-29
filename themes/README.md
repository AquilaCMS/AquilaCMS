# Themes

Theme folders must be placed in this directory

## Options

Theme can use options in `themeConfig.json`

Options are listed here:

```json
{
    "type": "static",
    "expose": "/dist",
    "buildAtStart": true
}
```

> Legend :
>
> - `type`: a type different from `"next"` will not load NextJS
> - `expose`: the link to public pages
> - `buildAtStart`: to build the theme when starting the server (even in `production`mode)
