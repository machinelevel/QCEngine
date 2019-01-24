/////////////////////////////////////////////////////////////////////////////
// qcengine_liquid.js
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



function generate_ibm_qasm(staff, do_html)
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
    str += '// ----------------------------------------------------------' + newline;
    str += '// Automatically generated QASM, from http://qcengine.com' + newline;

    var max_hardware_qubits = 5;

    var used_bf = NewBitField(0, max_hardware_qubits);
    for (var inst_index = 0; inst_index < staff.instructions.length; ++inst_index)
    {
        var inst = staff.instructions[inst_index];
        var hi_cond  = inst.conditionQubits.getHighestBitIndex();
        var lo_cond  = inst.conditionQubits.getLowestBitIndex();
        var num_cond = inst.conditionQubits.countOneBits();
        var hi_targ  = inst.targetQubits.getHighestBitIndex();
        var lo_targ  = inst.targetQubits.getLowestBitIndex();
        var num_targ = inst.targetQubits.countOneBits();

        if (inst.op == 'not' || inst.op == 'cnot')
        {
            for (var targ = lo_targ; targ <= hi_targ; ++targ)
            {
                if (inst.targetQubits.getBit(targ))
                {
                    if (targ != 2)
                        str += err_start + '// ERROR (instr ' + inst_index + ' ' + inst.op + '): CNOT target must be qubit 2.' + err_end + newline;
                    else if (num_cond == 0)
                        str += 'x q[' + targ + '];' + newline;
                    else if (num_cond == 1)
                        str += 'cx q[' + lo_cond + '], q[' + targ + '];' + newline;
                    else
                        str += err_start + '// ERROR (instr ' + inst_index + ' ' + inst.op + '): too many conditions.' + err_end + newline;
                }
            }
        }
        else if (inst.op == 'hadamard' || inst.op == 'chadamard')
        {
            for (var targ = lo_targ; targ <= hi_targ; ++targ)
            {
                if (inst.targetQubits.getBit(targ))
                {
                    if (num_cond == 0)
                        str += 'h q[' + targ + '];' + newline;
                    else
                        str += err_start + '// ERROR (instr ' + inst_index + ' ' + inst.op + '): too many conditions.' + err_end + newline;
                }
            }
        }
        else if (inst.op == 'rotatey' || inst.op == 'crotatey')
        {
            for (var targ = lo_targ; targ <= hi_targ; ++targ)
            {
                if (inst.targetQubits.getBit(targ))
                {
                    if (num_cond == 0)
                    {
                        if (inst.theta == 180.0)
                            str += 'y q[' + targ + '];' + newline;
                        else
                            str += err_start + '// ERROR (instr ' + inst_index + ' ' + inst.op + '): unsupported angle.' + err_end + newline;
                    }
                    else
                        str += err_start + '// ERROR (instr ' + inst_index + ' ' + inst.op + '): too many conditions.' + err_end + newline;
                }
            }
        }
        else if (inst.op == 'phase')
        {
            if (num_cond == 1)
            {
                if (inst.theta == 180.0)
                    str += 'z q[' + lo_cond + '];' + newline;
                else if (inst.theta == 90.0)
                    str += 's q[' + lo_cond + '];' + newline;
                else if (inst.theta == -90.0)
                    str += 'sdg q[' + lo_cond + '];' + newline;
                else if (inst.theta == 45.0)
                    str += 't q[' + lo_cond + '];' + newline;
                else if (inst.theta == -45.0)
                    str += 'tdg q[' + lo_cond + '];' + newline;
                else
                    str += err_start + '// ERROR (instr ' + inst_index + ' ' + inst.op + '): unsupported angle.' + err_end + newline;
            }
            else
                str += err_start + '// ERROR (instr ' + inst_index + ' ' + inst.op + '): too many conditions.' + err_end + newline;
        }
        else if (inst.op == 'read' || inst.op == 'postselect')
        {
            for (var targ = lo_targ; targ <= hi_targ; ++targ)
            {
                if (inst.targetQubits.getBit(targ))
                {
                    str += 'measure q[' + targ + '];' + newline;
                }
            }
        }
        else if (inst.op == 'write')
        {
            for (var targ = lo_targ; targ <= hi_targ; ++targ)
            {
                if (inst.targetQubits.getBit(targ))
                {
                    if (used_bf.getBit(targ))
                        str += err_start + '// ERROR (instr ' + inst_index + ' ' + inst.op + '): writes bust happen before anything else.' + err_end + newline;
                    else if (getBitfieldBit(inst.writeValue, targ))
                        str += 'x q[' + targ + '];' + newline;
                }
            }
        }
        else
        {
            str += err_start + '// ERROR (instr ' + inst_index + ' ' + inst.op + '): unsupported instruction.' + err_end + newline;
        }
        used_bf.orEquals(inst.targetQubits);
        used_bf.orEquals(inst.conditionQubits);
    }
    str += '// ----------------------------------------------------------' + newline;
    if (do_html)
        str += '</pre>';
    return str;
}
