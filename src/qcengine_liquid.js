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



/*

 .\bin\Liquid.exe "__Entangle1(20)"
0:0000.0/
0:0000.0/===========================================================================================
0:0000.0/=    The Language-Integrated Quantum Operations (LIQUi|>) Simulator                       =
0:0000.0/=        Copyright (c) 2015,2016 Microsoft Corporation                                        =
0:0000.0/=        If you use LIQUi|> in your research, please follow the guidelines at             =
0:0000.0/=        https://github.com/msr-quarc/Liquid for citing LIQUi|> in your publications.     =
0:0000.0/===========================================================================================
0:0000.0/
0:0000.0/=============== Logging to: Liquid.log opened ================
0:0000.0/
0:0000.0/ Secs/Op  S/Qubit  Mem(GB) Operation
0:0000.0/ -------  -------  ------- ---------
0:0000.0/   0.314    0.314    0.249 Created single state vector
0:0000.0/   0.290    0.290    0.249 Did Hadamard
0:0000.0/   0.259    0.259    0.249   Did CNOT:  1
0:0000.0/   0.535    0.268    0.249   Did CNOT:  2
0:0000.0/   0.781    0.260    0.249   Did CNOT:  3
0:0000.0/   1.076    0.269    0.250   Did CNOT:  4
0:0000.0/   1.413    0.283    0.251   Did CNOT:  5
0:0000.0/   1.659    0.277    0.251   Did CNOT:  6
0:0000.0/   1.905    0.272    0.252   Did CNOT:  7
0:0000.1/   2.147    0.268    0.252   Did CNOT:  8
0:0000.1/   2.386    0.265    0.253   Did CNOT:  9
0:0000.1/   2.627    0.263    0.254   Did CNOT: 10
0:0000.1/   2.876    0.261    0.254   Did CNOT: 11
0:0000.1/   3.116    0.260    0.255   Did CNOT: 12
0:0000.1/   3.357    0.258    0.255   Did CNOT: 13
0:0000.1/   3.604    0.257    0.256   Did CNOT: 14
0:0000.1/   3.854    0.257    0.257   Did CNOT: 15
0:0000.1/   4.099    0.256    0.258   Did CNOT: 16
0:0000.1/   4.340    0.255    0.259   Did CNOT: 17
0:0000.1/   4.639    0.258    0.260   Did CNOT: 18
0:0000.1/   4.969    0.262    0.261   Did CNOT: 19
0:0000.1/   0.239    0.012    0.265 Did Measure
0:0000.1/
0:0000.1/=============== Logging to: Liquid.log closed ================

*/

var have_liquid_emulator = true;

function LiquidTimer()
{
    var header1 = '0:0.0/ Secs              Mem(GB) Operation';
    var header2 = '0:0.0/ -------  -------  ------- ---------';
    qc.print(header1 + '\n' + header2 + '\n');
//    console.log(header1 + '\n' + header2);

    this.Show = function(message)
    {
        var end_time = new Date().getTime();
        var total_elapsed_time_minutes = (end_time - this.init_time) / (60 * 1000);
        var elapsed_time = (end_time - this.start_time) / 1000;
        var GiB = qc.qReg.bytesRequired() / (1024 * 1024 * 1024);
        var str = '';
        str += '0:';
        str += total_elapsed_time_minutes.toFixed(1) + '/ ';
        str += elapsed_time.toFixed(3) + ' ';
        str += '         ';
        str += '   ';
        str += GiB.toFixed(3) + '   ';
        str += message;
        qc.print(str + '\n');
//        console.log(str);
        this.start_time = new Date().getTime();
    }
    this.start_time = this.init_time = new Date().getTime();
}

function LiquidEmulator()
{
    this.verbose = false;

    this.is_sim_disabled = function()
    {
        if (qc.qReg.disableSimulation)
        {
            var str = 'This sim has ' + qc.qReg.numQubits + ' qubits, ' +
              'which would require ' + (Math.pow(2, qc.qReg.numQubits + 3) / (1024 * 1024 * 1024)).toFixed(1) +
              ' GB, so it\'s running in digital-only mode, and entanglement won\'t work.';
            qc.print(str);
            console.log(str);
            return true;
        }
    }

    this.__Entangle1 = function(num_qubits)
    {
        qc.reset(num_qubits);
        if (this.is_sim_disabled())
            return;
        var qt = new LiquidTimer(this);
        qc.hadamard(1);
        if (this.verbose)
            qt.Show('Did Hadamard');
        for (var i = 1; i < num_qubits; ++i)
        {
            qc.cnot(1 << i, 1);
            if (this.verbose)
                qt.Show('Did CNOT: ' + i);
        }
        qc.read();

        if (this.verbose)
            qt.Show('Did Read');
    }

    this.__Entangle2 = function(num_qubits)
    {
        qc.reset(num_qubits);
        if (this.is_sim_disabled())
            return;
        var qt = new LiquidTimer(this);
        qc.hadamard(1);
        for (var i = 1; i < num_qubits; ++i)
        {
            qc.cnot(1 << i, 1);
        }
        qc.read();
        qt.Show('Straight function calls');
    }

    this.__Entangles = function()
    {
        var num_qubits = 16;
        var num_iters = 100;
        qc.reset(num_qubits);
        var qt = new LiquidTimer(this);
        for (var iter = 0; iter < num_iters; ++iter)
        {
            qc.write(0);
            qc.hadamard(1);
            for (var i = 1; i < num_qubits; ++i)
                qc.cnot(1 << i, 1);
            var result = qc.read();
            if (this.verbose)
            {
                if (result == 0)
                    result = '0000000000000000';
                else if (result == 65535)
                    result = '1111111111111111';
                qt.Show('#### Iter ' + iter + ': ' + result);
            }
        }
    }

/////////////////////////////////////////////////////
// Teleport samples
    // Define an EPR function
    this.EPR = function(qs)
    {
        qs[0].hadamard();
        qs[1].cnot(qs[0]);
    }

    this.teleport = function(q0, q1, q2)
    {
        this.EPR([q1, q2]);         // EPR 1,2, then CNOT 0,1 and H 0
        q1.cnot(q0);
        q0.hadamard();
        var bits = qc.read(1|2);
        q2.cnot(q1);           // Conditionally apply X
        q2.cz(q0);             // Conditionally apply Z
        return bits;
    }

    // Get a random number between -1.0 and +1.0
    this.randomPlusMinus = function()
    {
        return Math.random() * 2.0 - 1.0;
    }

    this.teleportRun = function(cnt)
    {
        qc.print("============ TELEPORT =============\n");

        for (var i = 0; i < cnt; ++i)
        {
            qc.codeLabel('');
            var rVal = this.randomPlusMinus;
            qc.reset(3);
            qc.write(0);

            // Give names to the first three qubits
            var q0 = qint.new(1, 'Src');
            var q1 = qint.new(1, '|0>');
            var q2 = qint.new(1, 'Dest');

            qc.codeLabel('rand');
            // Force the first qubit into a random location on the Bloch sphere
            qc.qReg.pokeComplexValue(0, rVal(), rVal());
            qc.qReg.pokeComplexValue(1, rVal(), rVal());
            qc.qReg.renormalize();
            q0.rotx(180 * rVal());
            q0.rotz(180 * rVal());

            var v0 = qc.qReg.peekComplexValue(0);
            var v1 = qc.qReg.peekComplexValue(1);
            qc.print("Initial State: " +
                    "(" + v0.x.toFixed(4) + "+" + v0.y.toFixed(4) + "i)|0>+" +
                    "(" + v1.x.toFixed(4) + "+" + v1.y.toFixed(4) + "i)|1>\n");

            qc.codeLabel('teleport');
            var bits = this.teleport(q0, q1, q2);

            var v0 = qc.qReg.peekComplexValue(bits | 0);
            var v1 = qc.qReg.peekComplexValue(bits | 4);
            qc.print("Final State:   " +
                    "(" + v0.x.toFixed(4) + "+" + v0.y.toFixed(4) + "i)|0>+" +
                    "(" + v1.x.toFixed(4) + "+" + v1.y.toFixed(4) + "i)|1> " +
                    "(bits:" + ((bits >> 1) & 1) + (bits & 1) + ")\n");
        }
        qc.print("==================================\n");
    }

    this.__Teleport = function()
    {
        this.teleportRun(10);
    }

// End of class
}

// Node.js hookups
module.exports.LiquidEmulator = LiquidEmulator;
