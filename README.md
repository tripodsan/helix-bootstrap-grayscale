# Helix Bootstrap Grayscale

Helix implementation of the "Grayscale" bootstrap template: see [https://startbootstrap.com/template-overviews/grayscale/](https://startbootstrap.com/template-overviews/grayscale/)

# Install

```
git clone https://github.com/kptdobe/helix-bootstrap-grayscale.git
cd helix-bootstrap-grayscale/client
npm install
npx gulp
cd ..
hlx up
```

You can now change the content in [index.md](./index.md) or create more content pages with the same template.

### original HTML

1. ensure that the gulp file uses the `webroot/dist` as target:
```js
var dist = path.resolve(__dirname, '../webroot/dist');
```
2. run gulp
3. use http://localhost:3000/index.ori.html

### build with parcel

1. ensure that the gulp file uses the `client` directory as target:
```js
var dist = path.resolve(__dirname, '.');
```
2. run gulp
3. parcel should now put all processed files to `webroot/dist`
2. use http://localhost:3000/index.parcel.html (contains relative links to static client files)
