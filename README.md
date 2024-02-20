## pdf-viewer-root

This library is based on <a href="https://www.npmjs.com/package/@yangxuy/pdf-reader">@yangxuy/pdf-reader</a> but has some new features

### Setup:

```
yarn add pdf-viewer-root
```

```
npm i pdf-viewer-root
```

### Usage

vue 2 / 3:

```

<template>
<pdf-viewer-root :url="url" />
</template>

<script>
import "pdf-viewer-root"
</script>

```

react:

```
import pdf from "./assets/1.pdf";
import "pdf-viewer-root";
import { useRef } from "react";
import React from "react";

function App() {
    const div = useRef<any>();

    return (
        <div className="App" ref={div}>
            {React.createElement("pdf-viewer-root", { url: pdf })}
        </div>
    );
}

export default App;
```


### component attributes

| attr          | description                                                   | default | Type          |Not working yet |
|---------------|---------------------------------------------------------------|---------|---------------|----------------|
| url           | Link to the file (you can send a blob)                        |         | string        |                |
| page          | Page number, from 1 to infinity                               | 1       | number        |                |
| mode          | Display mode if 1 shows by page. If 2 shows all pages at once | 1       | number        |                |
| scale         | pdf size on screen. from 10 to 100                            | 100     | number        |        -       |
| dpi           | Manages the quality                                           | 300     | number        |        -       |
| onSuccess     | When the pdf is loaded, this event will be called             | -       | (pdf) => {}   |                |
| onError       | When the pdf gives an error, this event will be called        | -       | (error) => {} |                |
| debug         | Log info in console                                           | false   | boolean       |                |
| loadingtext   | Text in loadingComponent                                      |'loading'| string        |                |