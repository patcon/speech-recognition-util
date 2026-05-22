# speech-recognition-util

Single-page speech timestamp tool, iterated in Claude and deployed to GitHub Pages.

## Integrating a new Claude export

When copying a fresh HTML export from `~/Downloads`, three things need to be added — Claude strips the document boilerplate when generating artifact HTML.

**1. Prepend before the opening `<style>` tag:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Speech Timestamp Recorder</title>
```

**2. Inject after the closing `</style>` tag (before `<div class="root">`):**
```html
<link rel="stylesheet" href="style.css">
```

**3. Append after the closing `</script>` tag:**
```html
</body>
</html>
```

The `style.css` file provides CSS custom properties (design tokens), page background, layout centering, card shadows, button styles, and Tabler Icons (via `@import`). All of these would otherwise be undefined since the exported HTML references Claude's internal design system variables.

## Deployment

GitHub Pages serves from `main` at `/`. The `.nojekyll` file disables Jekyll processing. Push to `main` to deploy.

## Git remotes

Always use SSH: `git@github.com:patcon/speech-recognition-util.git`
