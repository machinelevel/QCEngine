/////////////////////////////////////////////////////////////////////////////
// qcengine_test.js
// Confidence test for QCEngine
//
// Copyright 2000-2012 Eric Johnston
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






/////////////////////////////////////////////////////////////////////////////
// The QReg class simulates qubit registers for a quantum computer.
//   numQubits       is the number of qubits to simulate (any positive integer)
//   doublePrecision is a bool which determines whether we use single or double floats
//
// Some key methods:
//   activate()      will allocate the qubit data and ready it for computation.
//
//   deactivate()    will free the qubit data memory when you're done. You can
//                   call activate() again if you like, but the previous data is lost.
//
//   bytesRequired() determines how much memory the qubit data will take. This may be
//                   called on an active or inactive QReg.
//
// BIG FAT WARNING: After creating a QReg, be sure to call bytesRequired() to see
//                  how much memory is going to be required to activate the
//                  register. You might be surprised. Here are some examples:
//
//                     1-qubit single precision: (2^1) *4*2 = 16 bytes
//                    10-qubit single precision: (2^10)*4*2 = 8 KB
//                    20-qubit single precision: (2^20)*4*2 = 8 MB
//                    32-qubit single precision: (2^32)*4*2 = 32 GB
//                    64-qubit single precision: (2^64)*4*2 = 128 exabytes
//                                   (one exabyte = about a million million MB)
//
//                  At 164 qubits, the number of bytes required exceeds the number of
//                  atoms in the Earth. Please let me know if you get this working.
//
//                  Note that even if your machine can handle the data size, some computations
//                  may take longer than the estimated remaining life of the universe.
//

function QTest()
{
    this.resultsOK = true;

    ////////////////////////////
   	// methods
	this.runAllTests = function ()
	{
        this.print("Runnnig all tests...");
        this.resultsOK = true;

        // Do the tests
        this.testNot(1, 1, 0);
        this.testNot(8, 8, 0);
        this.testNot(8, 4, 0);
        this.testCNot(1, 1, 0x5555);
        this.testCNot(8, 8, 0x5555);
        this.testCNot(8, 4, 0x5555);
        this.testHadamard(1, 1, 0);
        this.testHadamard(8, 8, 0);
        this.testHadamard(8, 4, 0);
        this.testCHadamard(1, 1, 0x5555);
        this.testCHadamard(8, 8, 0x5555);
        this.testCHadamard(8, 4, 0x5555);
        this.testPhaseShift(1, 1, 0);
        this.testPhaseShift(8, 8, 0);
        this.testPhaseShift(8, 4, 0);

        if (this.resultsOK)
            this.print("...passed.");
        else
            this.print("...FAILED.");
    }

	this.print = function(str)
    {
//        console.log(str);
    }

	this.error = function(str)
    {
//        console.log(str);
        this.resultsOK = false;
    }

	this.testNot = function (numQubits, blockQubits, initialValue)
	{
        this.print("Testing Not... " + numQubits + "/" + blockQubits);
        var doublePrecision = false;
        var qReg = new QReg(numQubits, blockQubits, doublePrecision);
        qReg.activate();

        // Tracker is used to parallel the qreg ops with a normal reg.
        var tracker = initialValue & qReg.allBitsMask;
        qReg.writeAll(tracker);
        if (qReg.readAll() != tracker)
            this.error("  : write and read don't match: (" + qReg.readAll() + " != " + tracker + ")");

        for (var i = 0; i < numQubits; ++i)
        {
            var target = 1 << i;
            qReg.not(target);
            tracker ^= (target);
            if (qReg.readAll() != tracker)
                this.error("  error in bit " + i + " (" + qReg.readAll() + " != " + tracker + ")");
        }
    }

	this.testCNot = function (numQubits, blockQubits, initialValue)
	{
        this.print("Testing CNot... " + numQubits + "/" + blockQubits);
        var doublePrecision = false;
        var qReg = new QReg(numQubits, blockQubits, doublePrecision);
        qReg.activate();

        // Tracker is used to parallel the qreg ops with a normal reg.
        var tracker = initialValue & qReg.allBitsMask;
//        this.print("tracker: " + tracker);
        qReg.writeAll(tracker);
        if (qReg.readAll() != tracker)
            this.error("  : write and read don't match: (" + qReg.readAll() + " != " + tracker + ")");

        for (var i = 0; i < numQubits; ++i)
        {
            for (var j = 0; j < (1 << (numQubits - 1)); ++j)
            {
                var target = 1 << i;
                var cond = ((j >> i) << (i + 1)) | (j & (target - 1));
                cond &= qReg.allBitsMask;
                var prevTracker = tracker;
                var prevReg = qReg.readAll();
//                if (prevTracker == 84 && numQubits == 8 && blockQubits == 8 && target == 1 && cond == 2)
//                    this.print("about to fail");
                qReg.cnot(target, cond);
                if ((tracker & cond) == cond)
                    tracker ^= target;
                var cresult = qReg.readAll();
                qReg.invalidateAllClassicalBits();
                var qresult = qReg.readAll();
                if (qresult != cresult || cresult != tracker)
                    this.error("  error in bit " + i + " of " + numQubits + "/" + blockQubits +
                               " prevTracker:" + prevTracker + 
                               " prevReg:" + prevReg + 
                               " target:" + target + 
                               " cond:" + cond + 
                               " ( quantum:" + qresult + " class:" + cresult + " trk:" + tracker + ")");
            }
        }
    }

    this.testHadamard = function (numQubits, blockQubits, initialValue)
	{
        this.print("Testing Hadamard... " + numQubits + "/" + blockQubits);
        var ok = true;
        var doublePrecision = false;
        var qReg = new QReg(numQubits, blockQubits, doublePrecision);
        qReg.activate();
        var tracker = initialValue & qReg.allBitsMask;
        qReg.writeAll(tracker);
        if (qReg.readAll() != tracker)
            this.error("  : write and read don't match: (" + qReg.readAll() + " != " + tracker + ")");

        qReg.hadamard(1);
    }

    this.testCHadamard = function (numQubits, blockQubits, initialValue)
	{
        this.print("Testing CHadamard... " + numQubits + "/" + blockQubits);
        var ok = true;
        var doublePrecision = false;
        var qReg = new QReg(numQubits, blockQubits, doublePrecision);
        qReg.activate();
        var tracker = initialValue & qReg.allBitsMask;
        qReg.writeAll(tracker);
        if (qReg.readAll() != tracker)
            this.error("  : write and read don't match: (" + qReg.readAll() + " != " + tracker + ")");

        qReg.chadamard(1, 2);
    }
    this.testPhaseShift = function (numQubits, blockQubits, initialValue)
	{
        this.print("Testing Phase Shift... " + numQubits + "/" + blockQubits);
        var ok = true;
        var doublePrecision = false;
        var qReg = new QReg(numQubits, blockQubits, doublePrecision);
        qReg.activate();
        var tracker = initialValue & qReg.allBitsMask;
        qReg.writeAll(tracker);
        if (qReg.readAll() != tracker)
            this.error("  : write and read don't match: (" + qReg.readAll() + " != " + tracker + ")");

        qReg.single_qubit_phase(1, 180);
    }
}

function runRegressionTest()
{
    var test = new QTest();
    test.runAllTests();
}

// Now actually run it!
runRegressionTest();


