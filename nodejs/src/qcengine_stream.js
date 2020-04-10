/////////////////////////////////////////////////////////////////////////////
// qcengine_stream.js
// Copyright 2000-2015 Eric Johnston, Machine Level
// qcengine@machinelevel.com
//
//  License:
//    (This is similar to the zlib license, with item 4 added and modifications
//     which apply only to commercial use.) 
//
//  This software is provided 'as-is', without any express or implied
//  warranty. In no event will the authors be held liable for any damages
//  arising from the use of this software.
//
//  Commercial use requires written authorization from the author.
//  Please contact me, as I can also help make sure you're getting the best use
//  from this software, and have the most up-to-date version.
//
//  Permission is granted to anyone to use this software for non-commercial
//  purposes, and to alter it and redistribute it freely, subject to the
//  following restrictions:
//
//  1. The origin of this software must not be misrepresented; you must not
//     claim that you wrote the original software. If you use this software
//     in a product, an acknowledgment in the product documentation would be
//     appreciated but is not required.
//  2. Altered source versions must be plainly marked as such, and must not be
//     misrepresented as being the original software.
//  3. This notice may not be removed or altered from any source distribution.
//  4. If you find this material useful, I'd love to know. If there is an email
//     address listed above this notice, please consider sending me a note.
//  (end of license text)
//
//  Commercial interest: There are several versions of this software, each
//  designed to maximize speed under different hardware and/or language constraints.
//  For more info, please contact me at qcengine@machinelevel.com
//

function translate_stream_to_staff(stream_data, qpu, execute_gates)
{
    if (execute_gates == null)
        execute_gates = false;
    staff = qpu.qReg.staff;

    qpu.qReg.removeAllQInts();
    var named_qubits = {};

    if (!execute_gates)
        staff.do_advance_on_add = false;
    for (var index = 0; index < stream_data.length; ++index)
    {
        var inst = stream_data[index];
        var op = inst[0];
        if      (op == 'qc.reset')  qpu.reset(inst[1]);
        else if (op == 'qc.nop')    staff.addInstructionAfterInsertionPoint('nop',       inst[1]);
        else if (op == 'qc.x')      staff.addInstructionAfterInsertionPoint('not',       inst[1], inst[2]);
        else if (op == 'qc.y')      staff.addInstructionAfterInsertionPoint('y',         inst[1], inst[2]);
        else if (op == 'qc.z')      staff.addInstructionAfterInsertionPoint('phase',     inst[1], inst[2], 180);
        else if (op == 'qc.s')      staff.addInstructionAfterInsertionPoint('phase',     inst[1], inst[2], 90);
        else if (op == 'qc.t')      staff.addInstructionAfterInsertionPoint('phase',     inst[1], inst[2], 45);
        else if (op == 'qc.s_inv')  staff.addInstructionAfterInsertionPoint('phase',     inst[1], inst[2], -90);
        else if (op == 'qc.t_inv')  staff.addInstructionAfterInsertionPoint('phase',     inst[1], inst[2], -45);
        else if (op == 'qc.had')    staff.addInstructionAfterInsertionPoint('hadamard',  inst[1], inst[2]);
        else if (op == 'qc.cz')     staff.addInstructionAfterInsertionPoint('cz',        inst[1], inst[2]);
        else if (op == 'qc.rootx')  staff.addInstructionAfterInsertionPoint('crootnot',  inst[1], inst[2]);
        else if (op == 'qc.rootx_inv')  staff.addInstructionAfterInsertionPoint('crootnot_inv',  inst[1], inst[2]);
        else if (op == 'qc.rooty')  staff.addInstructionAfterInsertionPoint('crooty',  inst[1], inst[2]);
        else if (op == 'qc.rooty_inv')  staff.addInstructionAfterInsertionPoint('crooty_inv',  inst[1], inst[2]);
        else if (op == 'qc.write')  staff.addInstructionAfterInsertionPoint('write',     inst[1], inst[2]);
        else if (op == 'qc.cnot')   staff.addInstructionAfterInsertionPoint('cnot',      inst[1], inst[2]);
        else if (op == 'qc.swap')   staff.addInstructionAfterInsertionPoint('exchange',  inst[1], inst[2]);
        else if (op == 'qc.cswap')  staff.addInstructionAfterInsertionPoint('exchange',  inst[1], inst[2]);
        else if (op == 'qc.phase')  staff.addInstructionAfterInsertionPoint('phase',     inst[1], inst[2], inst[3]);
        else if (op == 'qc.cphase') staff.addInstructionAfterInsertionPoint('phase',     inst[1], inst[2], inst[3]);
        else if (op == 'qc.rx')     staff.addInstructionAfterInsertionPoint('rotatex',   inst[1], inst[2], inst[3]);
        else if (op == 'qc.ry')     staff.addInstructionAfterInsertionPoint('rotatey',   inst[1], inst[2], inst[3]);
        else if (op == 'qc.rz')     staff.addInstructionAfterInsertionPoint('rotatez',   inst[1], inst[2], inst[3]);
        else if (op == 'qc.ppr')    staff.addInstructionAfterInsertionPoint('ppr',       inst[1], inst[2], inst[3]);
        else if (op == 'qc.ppm')    staff.addInstructionAfterInsertionPoint('ppm',       inst[1], inst[2], inst[3]);
        else if (op == 'qc.read')
        {
            var read_inst = staff.addInstructionAfterInsertionPoint('read',      inst[1]);
            if (!execute_gates)
                read_inst.recentReadValue = inst[2];
        }
        else if (op == 'qc.label')
        {
            staff.setCodeLabel(inst[1]);
        }
        else if (op == 'qc.qubits')
        {
            qubits_mask = inst[1];
            qubits_name = inst[2];
            named_qubits[qubits_mask] = qubits_name;
        }
        else console.log('ERROR: stream-to-staff: instruction '+op+' was not recognized.');
        if (!execute_gates)
            staff.insertionStart = staff.instructions.length;
    }
    if (!execute_gates)
        staff.do_advance_on_add = true;

    const named_qubits_ordered = {};
    Object.keys(named_qubits).sort().forEach(function(key) {
        named_qubits_ordered[key] = named_qubits[key];
    });
    for (const [mask, name] of Object.entries(named_qubits_ordered))
    {
        var low_qubit = 0;
        while (!((1 << low_qubit) & mask))
            low_qubit += 1;
        var high_qubit = low_qubit;
        while (((1 << (high_qubit + 1)) & mask))
            high_qubit += 1;
        var num_bits = 1 + high_qubit - low_qubit;
        var q = new Qubits(num_bits, name, qpu);
    }

    return staff;
}

function translate_staff_to_stream(staff)
{
    stream = []
    stream.push(['qc.reset', staff.qReg.numQubits])

    // Get the qubit names
    var named_qubits = {};
    for (var bit = 0; bit < staff.qReg.numQubits; ++bit)
    {
        var qubit_name = staff.qReg.getQubitIntName(bit);
        if (qubit_name)
        {
            var nq = named_qubits[qubit_name];
            if (!nq)
                nq = 0;
            nq |= (1 << bit);
            named_qubits[qubit_name] = nq;
        }
    }
    for (const [key, value] of Object.entries(named_qubits))
    {
        stream.push(['qc.qubits', value, key])
    }

    var current_label = '';
    for (var index = 0; index < staff.instructions.length; ++index)
    {
        var inst = staff.instructions[index];
        var op = inst.op;
        var cond = inst.conditionQubits;
        var targ = inst.targetQubits;
        var theta = inst.theta;
        var write_value = inst.writeValue;
        var read_value  = inst.recentReadValue;
        var label = inst.codeLabel;
        if (label == null)
            label = '';
        if (label != current_label)
        {
            stream.push(['qc.label', label]);
            current_label = label;
        }
        if (op == 'phase')
        {
            if      (theta == 180) op = 'qc.z';
            else if (theta ==  90) op = 'qc.s';
            else if (theta == -90) op = 'qc.s_inv';
            else if (theta ==  45) op = 'qc.t';
            else if (theta == -45) op = 'qc.t_inv';
            else op = 'phase';
        }
        if      (op == 'nop')       stream.push([ 'qc.nop',    targ]);
        else if (op == 'not')       stream.push([ 'qc.x',      targ, cond]);
        else if (op == 'y')         stream.push([ 'qc.y',      targ, cond]);
        else if (op == 'phase')     stream.push([ 'qc.phase',  targ, cond, theta]);
        else if (op == 'qc.z')      stream.push([ 'qc.z',      targ, cond]);
        else if (op == 'qc.s')      stream.push([ 'qc.s',      targ, cond]);
        else if (op == 'qc.t')      stream.push([ 'qc.t',      targ, cond]);
        else if (op == 'qc.s_inv')  stream.push([ 'qc.s_inv',  targ, cond]);
        else if (op == 'qc.t_inv')  stream.push([ 'qc.t_inv',  targ, cond]);
        else if (op == 'had')       stream.push([ 'qc.had',    targ, cond]);
        else if (op == 'hadamard')  stream.push([ 'qc.had',    targ, cond]);
        else if (op == 'cz')        stream.push([ 'qc.cz',     targ, cond]);
        else if (op == 'rootnot')   stream.push([ 'qc.rootx',  targ, cond]);
        else if (op == 'crootnot')  stream.push([ 'qc.rootx',  targ, cond]);
        else if (op == 'rootnot_inv')   stream.push([ 'qc.rootx_inv',  targ, cond]);
        else if (op == 'crootnot_inv')  stream.push([ 'qc.rootx_inv',  targ, cond]);
        else if (op == 'read')      stream.push([ 'qc.read',   targ, read_value]);
        else if (op == 'write')     stream.push([ 'qc.write',  targ, write_value]);
        else if (op == 'cnot')      stream.push([ 'qc.cnot',   targ, cond]);
        else if (op == 'exchange')  stream.push([ 'qc.swap',   targ, cond]);
        else if (op == 'cexchange') stream.push([ 'qc.cswap',  targ, cond]);
        else if (op == 'rotatex')   stream.push([ 'qc.rx',     targ, cond, theta]);
        else if (op == 'rotatey')   stream.push([ 'qc.ry',     targ, cond, theta]);
        else if (op == 'rotatez')   stream.push([ 'qc.rz',     targ, cond, theta]);
        else if (op == 'crotatex')  stream.push([ 'qc.rx',     targ, cond, theta]);
        else if (op == 'crotatey')  stream.push([ 'qc.ry',     targ, cond, theta]);
        else if (op == 'crotatez')  stream.push([ 'qc.rz',     targ, cond, theta]);
        else if (op == 'ppr')       stream.push([ 'qc.ppr',    targ, cond, theta]);
        else if (op == 'ppm')       stream.push([ 'qc.ppm',    targ, cond, theta]);
        else console.log('ERROR: staff-to-stream: instruction '+op+' was not recognized.');
    }
    return stream;
}


// Node.js hookups
module.exports.translate_stream_to_staff = translate_stream_to_staff;
module.exports.translate_staff_to_stream = translate_staff_to_stream;
