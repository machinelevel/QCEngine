# QCEngine nodejs testing

This is a test version of QCEngine which can be run locally (not in a browser), using Node.js. It also contains a bunch of updates which have not yet been tested well enough to merge into the main [O'Reilly book sample page](https://oreilly-qc.github.io).

For comments and questions, please post issues on this repo, or contact EJ at [octopus@machinelevel.com](mailto:octopus@machinelevel.com)

### Installation

1. Install **node** and **npm** on your machine.
2. `npm install canvas` if you want canvas/PNG support.

### Testing

Try any scripts you see in the `tests` directory, like this:
```bash
node ./tests/test_svg.js
node ./tests/test_speed_24.js
node ./tests/test_canvas.js
```
