## file-change-announcer

This package can be used to autoreload html pages with minimal overhead.

### starting
```batch
file-change-announcer
```

### example file
```html
<!DOCTYPE html>
<html lang="en">

    <head>
        <meta charset="UTF-8">
        <title>some page</title>
        <link rel="stylesheet" href="./some-relative-file.css">

        <!-- loading the reloader -->
        <script src="localhost:40255"></script>
        <script>
            /* subscribing to some file */
            autoreloader.subscribe(['C:/some/path/to/some-relative-file.css'])
        </script>
    </head>

    <body>

    </body>

</html>
```

Now everytime `C:/some/path/to/some-relative-file.css` changes the webpage will be reloaded.

### GYP issue while installing

This issue comes from the used [Websocket package](https://www.npmjs.com/package/websocket), see [this explanation](https://www.npmjs.com/package/websocket#installation) for more information.