# Neon Snake

A neon-themed Snake game built as a vanilla JavaScript browser app and wrapped as a native iOS app via Capacitor.

## Stack

- HTML5 Canvas + plain JS (`game.js`, `index.html`, `style.css`)
- [Capacitor](https://capacitorjs.com/) for iOS packaging

## Run in the browser

Open `index.html` directly, or serve the directory with any static server:

```bash
npx serve .
```

## Build for iOS

```bash
npm install
npx cap sync ios
npx cap open ios
```

Then build and run from Xcode.

## License

ISC
