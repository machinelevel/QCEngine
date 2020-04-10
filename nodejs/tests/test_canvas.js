require('../src/qcengine_node.js')
const { createCanvas, loadImage } = require('canvas')
const fs = require('fs')

// This is a test of writing a diagram to PNG
// You may need to run "npm install canvas" first.

var do_parallelize = false; // Set this true to try squiching the gates together.

qc = new QPU();
qc.reset(6);

var canvas = createCanvas(100, 100);
qc.set_canvas(canvas);

// Run our gates
qc.write(0);
qc.had();
qc.QFT();

// Draw the circuit
if (do_parallelize)
    qc.qReg.staff.parallelize();
qc.draw();

// Write the canvas as a PNG file
var out_file_name = 'out_test.png';
const out = fs.createWriteStream(out_file_name);
const png_stream = canvas.createPNGStream();
png_stream.pipe(out);
out.on('finish', () =>  console.log('...saved PNG file as ' + out_file_name))
