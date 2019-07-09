/////////////////////////////////////////////////////////////////////////////
// qcengine_blockjob.js
// Copyright 2000-2012 Eric Johnston, Machine Level
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

// Core sims are typically only available in Node.js

function CoreSim(core_type)
{
    this.active = false;
    this.core_type = core_type;
    this.qReg = null;
    this.core_library = null;
    if (this.core_type == 'linear_optics')
        this.core_library = core_linear_optics;

    this.activate = function(qReg)
    {
        qReg.core_sim = this;
        this.qReg = qReg;
        this.active = true;
    }

    this.deactivate = function()
    {
        this.qReg.core_sim = null;
        this.qReg = null;
        this.active = false;
    }

    this.test_suite = function()
    {
    }

    this.set_param = function(param, value)
    {
        this.core_library.core_set_param(param, value);
    }

    this.qreg_activated = function()
    {
        this.core_library.core_set_param('num_modes', this.qReg.numQubits);
//        this.core_library.core_set_param('max_num_photons', 2);
//        this.core_library.core_set_param('num_parallel_solutions', 1);
//        this.core_library.core_set_param('max_mem_gb', 1);
//        this.core_library.core_set_param('verbose', 0);
        this.core_library.core_activate(0);
    }

    this.set_max_num_photons = function(value)
    {
        this.core_library.core_set_param('max_num_photons', value);
    }

    this.op_beamsplitter = function(target_qubits, reflectivity)
    {
//        console.log('core op_bs ' + reflectivity);
//        this.core_library._Z7test_loi(2);
        var mode0 = getLowestBitIndex(target_qubits);
        var mode1 = getHighestBitIndex(target_qubits);
//        var mode0 = 0;
//        var mode1 = 1;
        this.core_library.core_op_beamsplitter(reflectivity, mode0, mode1);
    }

    this.op_write = function(target_qubits, new_values)
    {
        target_qubits = intToBitField(target_qubits);
        new_values = intToBitField(new_values);
        console.log('core op_write(' + bitFieldToInt(target_qubits) + ', ' + bitFieldToInt(new_values) + ')');
        var tq_data = new UInt32Array(target_qubits.values.length);
        for (var i = 0; i < target_qubits.values.length; ++i)
            tq_data[i] = target_qubits.values[i];
        var v_data = new UInt32Array(new_values.values.length);
        for (var i = 0; i < new_values.values.length; ++i)
            v_data[i] = new_values.values[i];

//        console.log('----> write ' + (tq_data.length * 32) + ' bits');
//        console.log('target_qubits:');
//        console.log(target_qubits.values);
//        console.log('tq_data:');
//        console.log(tq_data);

        this.core_library.core_write(tq_data, target_qubits.numBits, v_data, new_values.numBits);
    }

    this.debug_print = function()
    {
        this.core_library.core_debug_print();
    }
}


// Node.js hookups
module.exports.CoreSim = CoreSim;

