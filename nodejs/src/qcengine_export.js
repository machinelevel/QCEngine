/////////////////////////////////////////////////////////////////////////////
// qcengine_export.js
// Copyright 2016 Eric Johnston, Machine Level
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


function export_to_javascript(instructions, do_html=false)
{
    var newline = '\n';
//    if (do_html)
//        newline = '<br/>';
    var str = '';
    var err_start = '';
    var err_end = '';
    if (do_html)
    {
        str += '<pre>';
        err_start = '<b><i><font color="red">';
        err_end = '</i></b></font>';
    }
    str += '\n// ----------------------------------------------------------' + newline;
    str += '// Automatically generated JavaScript, from PsiQ|Workbench' + newline;

    for (var inst_index = 0; inst_index < instructions.length; ++inst_index)
    {
        var inst = instructions[inst_index];
        var targ_mask = inst.targ_mask;
        var cond_mask = inst.cond_mask;
        var op = inst.op;
        var theta = inst.theta;
        var write_value = inst.write_value;
        
        var ops_t_c = ['not', 'cnot', 'cx', 'had', 'chad'];
        // Translate some values
        if (op == 'not')
            op = 'x';
        else if (op == 'cnot')
            op = 'cx';
        else if (op == 'hadamard')
            op = 'had';
        else if (op == 'chadamard')
            op = 'chad';

        // TODO: handle more cases here
        if (ops_t_c.includes(op))
        {
            str += 'qc.' + op + '(0x' + (0|(targ_mask)).toString(16);
            if (cond_mask)
                str += ', 0x' + (0|(cond_mask)).toString(16);
            str += ');\n';
        }
        else if (op == 'write')
        {
            str += 'qc.' + op + '(' + (0|(write_value));
            if (targ_mask)
                str += ', 0x' + (0|(targ_mask)).toString(16);
            str += ');\n';
        }
    }
    str += '// ----------------------------------------------------------' + newline;
    if (do_html)
        str += '</pre>';
    return str;
}

function export_to_qasm(instructions, do_html=false)
{
    var newline = '\n';
//    if (do_html)
//        newline = '<br/>';
    var str = '';
    var err_start = '';
    var err_end = '';

    if (do_html)
    {
        str += '<pre>';
        err_start = '<b><i><font color="red">';
        err_end = '</i></b></font>';
    }
    str += '\n// ----------------------------------------------------------' + newline;
    str += '// Automatically generated QASM, from PsiQ|Workbench' + newline;

    var max_qubits = 100;

    var qubit_to_classical_bit = new Array(max_qubits).fill(-1);
    var qubit_has_been_read = new Array(max_qubits).fill(false);
    var next_classical_bit = 0;

    var used_bf = bitfield_zero;
    for (var inst_index = 0; inst_index < instructions.length; ++inst_index)
    {
        var inst = instructions[inst_index];
        var targ_mask = inst.targ_mask;
        var cond_mask = inst.cond_mask;
        var op = inst.op;
        var theta = inst.theta;
        var write_value = inst.write_value;
        var hi_cond  = getHighestBitIndex(cond_mask);
        var lo_cond  = getLowestBitIndex(cond_mask);
        var num_cond = countOneBits(cond_mask);
        var hi_targ  = getHighestBitIndex(targ_mask);
        var lo_targ  = getLowestBitIndex(targ_mask);
        var num_targ = countOneBits(targ_mask);

        if (op == 'not' || op == 'cnot')
        {
            for (var targ = lo_targ; targ <= hi_targ; ++targ)
            {
                if (getBit(targ_mask, targ))
                {
                    if (num_cond == 0)
                        str += 'x q[' + targ + '];' + newline;
                    else if (num_cond == 1)
                    {
                        if (qubit_has_been_read[lo_cond])
                            str += 'if (c[' + qubit_to_classical_bit[lo_cond] + '] == 1) x q[' + targ + '];' + newline;
                        else
                            str += 'cx q[' + lo_cond + '], q[' + targ + '];' + newline;
                    }
                    else
                        str += err_start + '// ERROR (instr ' + inst_index + ' ' + op + '): too many conditions.' + err_end + newline;
                }
            }
        }
        else if (op == 'hadamard' || op == 'chadamard')
        {
            for (var targ = lo_targ; targ <= hi_targ; ++targ)
            {
                if (getBit(targ_mask, targ))
                {
                    if (num_cond == 0)
                        str += 'h q[' + targ + '];' + newline;
                    else
                        str += err_start + '// ERROR (instr ' + inst_index + ' ' + op + '): too many conditions.' + err_end + newline;
                }
            }
        }
        else if (op == 'rotatey' || op == 'crotatey')
        {
            for (var targ = lo_targ; targ <= hi_targ; ++targ)
            {
                if (getBit(targ_mask, targ))
                {
                    if (num_cond == 0)
                    {
                        if (theta == 180.0)
                            str += 'y q[' + targ + '];' + newline;
                        else
                            str += err_start + '// ERROR (instr ' + inst_index + ' ' + op + '): unsupported angle.' + err_end + newline;
                    }
                    else
                        str += err_start + '// ERROR (instr ' + inst_index + ' ' + op + '): too many conditions.' + err_end + newline;
                }
            }
        }
        else if (op == 'phase')
        {
            if (num_cond == 1)
            {
                if (theta == 180.0)
                    str += 'z q[' + lo_cond + '];' + newline;
                else if (theta == 90.0)
                    str += 's q[' + lo_cond + '];' + newline;
                else if (theta == -90.0)
                    str += 'sdg q[' + lo_cond + '];' + newline;
                else if (theta == 45.0)
                    str += 't q[' + lo_cond + '];' + newline;
                else if (theta == -45.0)
                    str += 'tdg q[' + lo_cond + '];' + newline;
                else
                    str += err_start + '// ERROR (instr ' + inst_index + ' ' + op + '): unsupported angle.' + err_end + newline;
            }
            else
                str += err_start + '// ERROR (instr ' + inst_index + ' ' + op + '): too many conditions.' + err_end + newline;
        }
        else if (op == 'read' || op == 'postselect')
        {
            for (var targ = lo_targ; targ <= hi_targ; ++targ)
            {
                if (getBit(targ_mask, targ))
                {
                    if (qubit_to_classical_bit[targ] < 0)
                    {
                        qubit_to_classical_bit[targ] = next_classical_bit++;
                    }
                    qubit_has_been_read[targ] = true;
                    str += 'measure q[' + targ + '] -> c[' + qubit_to_classical_bit[targ] + '];' + newline;
                }
            }
        }
        else if (op == 'write')
        {
            for (var targ = lo_targ; targ <= hi_targ; ++targ)
            {
                if (getBit(targ_mask, targ))
                {
                    qubit_has_been_read[targ] = false;
                    if (getBit(used_bf, targ))
                        str += err_start + '// ERROR (instr ' + inst_index + ' ' + op + '): writes bust happen before anything else.' + err_end + newline;
                    else if (getBit(write_value, targ))
                        str += 'x q[' + targ + '];' + newline;
                }
            }
        }
        else
        {
            str += err_start + '// ERROR (instr ' + inst_index + ' ' + op + '): unsupported instruction.' + err_end + newline;
        }
        used_bf |= targ_mask;
        used_bf |= cond_mask;
    }
    str += '// ----------------------------------------------------------' + newline;
    if (do_html)
        str += '</pre>';
    return str;
}

// Node.js exports
module.exports.export_to_qasm = export_to_qasm;
module.exports.export_to_javascript = export_to_javascript;

