require('../src/qcengine_node.js')
const fs = require('fs')

// This is a test of writing a diagram to SVG, without using a canvas

qc = new QPU();
qc.reset(6);

// Run our gates
qc.write(0);
qc.had();
qc.QFT();

// Output an instruction stream
var stream = translate_staff_to_stream(qc.qReg.staff)
// console.log(stream);

// Make an SVG
var svg_str = create_svg_string(stream);

// Write the SVG to a file
var out_file_name = 'out_test.svg';
fs.writeFile(out_file_name, svg_str, (err) => {
    if (err)
        throw err;
    console.log('...saved SVG file as ' + out_file_name);
});
