## file-change-announcer

This package can be used to autoreload html pages with minimal overhead.

### starting
```batch
file-change-announcer start
```

### example file
```html
<!DOCTYPE html>
<html lang="en">

    <head>
        <meta charset="UTF-8">
        <title>some page</title>
        <link rel="stylesheet" href="./some-relative-file.js">

        <!-- loading the reloader -->
        <script src="localhost:40255"></script>
        <script>
            /* subscribing to some file */
            autoreloader.subscribe(['C:/some/path/to/some-relative-file.js'])
        </script>
    </head>

    <body>

    </body>

</html>
```

Now everytime `C:/some/path/to/some-relative-file.js` changes the webpage will be reloaded.