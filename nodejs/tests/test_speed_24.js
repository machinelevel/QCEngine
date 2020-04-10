require('../src/qcengine_node.js')

// Setup
var num_qubits = 24;
qc = new QPU();
qc.reset(num_qubits);

qc.write(0);
qc.had();

var start_time = Date.now()
qc.QFT();
var end_time = Date.now()
var elapsed_seconds = (end_time - start_time) / 1000.0;

console.log('...finished ' + num_qubits + '-qubit QFT in ' + elapsed_seconds + ' seconds.');
