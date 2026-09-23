# Pimsleur Picture in Picture

Adds a button to the Pimsleur lesson player (`learn.pimsleur.com/Learn/lesson`, next to *Share*) that opens an always-on-top mini player with previous/next lesson, ±10s, play/pause and a seek bar.

Pimsleur plays lessons through an `<audio>` element, which regular video PiP can't float, so this uses the [Document Picture-in-Picture API](https://developer.chrome.com/docs/web-platform/document-picture-in-picture) (Chrome 116+). The mini player drives the page's own `<audio>`, and the site's UI keeps in sync with it.

It also publishes Media Session metadata and handlers, so the macOS media keys and Chrome's global media controls play and pause the lesson too.

In the mini player: `Space`/`k` play/pause, `←`/`j` back 10s, `→`/`l` forward 10s.

## Build

```bash
yarn install
yarn build   # → dist/, load it via chrome://extensions → Load unpacked
```
