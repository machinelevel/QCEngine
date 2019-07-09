/////////////////////////////////////////////////////////////////////////////
// qcengine_staff.js
// Copyright 2000-2011 Eric Johnston, Machine Level
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

/////////////////////////////////////////////////////////////////
// NOT
QReg.prototype.not = function (targetQubits)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.not(targetQubits);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    // TODO: Try speed with float view vs. int view into the data.
    if (targetQubits == null)	// this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;
    if (isAllZero(targetQubits))
        return;

    if (this.disableSimulation)
    {
        this.storage.not(targetQubits);
        this.changed();
        return;
    }

    // TODO: Add bitfield support to the rest of this
    //       For now it's not needed, since we're full-sim, so the QC size will be <= 32 bits
    targetQubits = bitFieldToInt(targetQubits);

    if (printSpeedMetrics)
    {
        var startTime = new Date().getTime();
        console.log('NOT start...\n');
    }
    for (var i = 0; i < this.numQubits; ++i)
    {
        var mask = 1 << i;
        if (targetQubits & mask)
            this.storage.not(mask, this.storage);
    }
    if (printSpeedMetrics)
    {
        var elapsedTimeMS = new Date().getTime() - startTime;
        console.log('NOT op time: ' + (elapsedTimeMS / 1000.0) + ' seconds.\n');
    }
    // No need to change the observation mask, but the values changed.
    this.classicalBits ^= targetQubits;
    this.changed();
}

QRegNode.prototype.not = function (targetQubit)
{
    if (targetQubit == 0)
        return;
    
    if (targetQubit == this.bitValue)
    {
        this.swap();
    }
    else if (targetQubit & this.kidMask)
    {
        this.tree[0].not(targetQubit);
        this.tree[1].not(targetQubit);
    }
    else
    {
        // no condition bits, no target bits. We should never get here.
        console.log("ERROR: bad condition (1) in NOT gate.");
    }
}

QBlock.prototype.not = function (targetQubit)
{
    if (this.qReg.currentInstruction)
    {
        bj = this.qReg.currentInstruction.nextBlockJob(this, null);
//        return;
    }

    if (targetQubit == 0)
        return;

    var vals = 1 << this.numQubits;
    if ((targetQubit & ((1 << this.numQubits) - 1)) == 0)
    {
        // no condition bits, no target bits. We should never get here.
        console.log("ERROR: bad condition (2) in NOT gate.");
        return;
    }

    if (0 &&     this.qReg.blockNotAsm)
    {
        this.qReg.blockNotAsm(targetQubit, this.masterArrayStartIndex, this.qReg.numBlockValues);
        return;
    }

    if (0 &&      this.qReg.bytesPerBlock > 100000)
    {
        var rowBytes = targetQubit * 2 * this.qReg.bytesPerFloat;
        var width = rowBytes >> 2;
        var height = this.qReg.bytesPerBlock / rowBytes;
        if (this.qReg.blockCanvas.width != width ||  this.qReg.blockCanvas.height != height)
        {
            this.qReg.blockCanvas.width = width;
            this.qReg.blockCanvas.height = height;
            this.qReg.blockCtx = this.qReg.blockCanvas.getContext("2d");
        }

        var array = new Uint8ClampedArray(this.values.buffer);
//         pre-allocate img and use set() to fill it.
//        var img = this.qReg.blockCtx.createImageData(width, height);
        return;
    }

    if (this.gpuBlock)
    {
        this.gpuBlock.op_not(targetQubit);
        if (!webgl_blocks.side_by_side_checking)
            return;
    }
    if (this.qReg.core_sim)
        return;

    // this is a within-block operation
    var temp;
    var index1;
    var index2;
    var column1 = 0;
    var column2 = column1 + targetQubit;
    while (column1 < vals)
    {
        for (var j = 0; j < targetQubit; ++j)
        {
            index1 = column1 * 2;
            index2 = column2 * 2;

            temp = this.values[index1];
            this.values[index1] = this.values[index2];
            this.values[index2] = temp;
            temp = this.values[index1 + 1];
            this.values[index1 + 1] = this.values[index2 + 1];
            this.values[index2 + 1] = temp;
                  
            column1++;
            column2++;
        }
        // Now skip the other half of our pairs
        column1 += targetQubit;
        column2 += targetQubit;
    }
    if (this.gpuBlock && webgl_blocks.side_by_side_checking)
        this.gpuBlock.side_by_side_check('NOT bit'+targetQubit, this.values);
}
/*
function BlockAsmModule(stdlib, foreign, heap)
{
   "use asm";

//    var sqrt = stdlib.Math.sqrt;

    function not(targetQubit, startIndex, numIndices)
    {
        // this is a within-block operation
        var temp;
        var index1;
        var index2;
        var column1 = startIndex;
        var column2 = column1 + targetQubit;
        var endIndex = startIndex + numIndices;
        while (column1 < endIndex)
        {
            for (var j = 0; j < targetQubit; ++j)
            {
                index1 = column1 * 2;
                index2 = column2 * 2;

                temp = heap[index1];
                heap[index1] = heap[index2];
                heap[index2] = temp;
                temp = heap[index1 + 1];
                heap[index1 + 1] = heap[index2 + 1];
                heap[index2 + 1] = temp;
                      
                column1++;
                column2++;
//tcount++;
            }
            // Now skip the other half of our pairs
            column1 += targetQubit;
            column2 += targetQubit;
        }
    }
    return { not: not };
}
*/
/////////////////////////////////////////////////////////////////
// Exchange (implemented using cnot)
QReg.prototype.exchange = function (targetQubits, conditionQubits)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.exchange(targetQubits, conditionQubits);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    this.invalidateClassicalBits(targetQubits, conditionQubits);

    if (this.use_photon_sim)
    {
        this.photonSim.exchange(targetQubits);
        this.changed();
        return;
    }

    if (this.chp && this.chp.active)
    {
        // TODO, simply exchange columns
    }

    // Exactly two targetBits are set. Find them and proceed with 3 cnots.
    var targetArray = makeBitArray(targetQubits, 2);

    var target1 = new BitField(targetQubits);
    var target2 = new BitField(targetQubits);
    target1.setBit(targetArray[0], 0);
    target2.setBit(targetArray[1], 0);
    var cond1 = new BitField(target2);
    var cond2 = new BitField(target1);
    cond1.orEquals(conditionQubits);
    cond2.orEquals(conditionQubits);

    this.cnot(target1, cond1);
    this.cnot(target2, cond2);
    this.cnot(target1, cond1);
}

/////////////////////////////////////////////////////////////////
// Exchange (implemented using cnot)
QReg.prototype.rootexchange = function (targetQubits, conditionQubits)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.rootexchange(targetQubits, conditionQubits);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    this.invalidateClassicalBits(targetQubits, conditionQubits);
    // Exactly two targetBits are set. Find them and proceed with 3 cnots.
    var targetArray = makeBitArray(targetQubits, 2);

    var target1 = new BitField(targetQubits);
    var target2 = new BitField(targetQubits);
    target1.setBit(targetArray[0], 0);
    target2.setBit(targetArray[1], 0);
    var cond1 = new BitField(target2);
    var cond2 = new BitField(target1);
    cond1.orEquals(conditionQubits);
    cond2.orEquals(conditionQubits);

    this.cnot(target1, cond1);
    this.crootnot(target2, cond2);
    this.cnot(target1, cond1);
}

QReg.prototype.rootexchange_inv = function (targetQubits, conditionQubits)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.rootexchange_inv(targetQubits, conditionQubits);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    this.invalidateClassicalBits(targetQubits, conditionQubits);
    // Exactly two targetBits are set. Find them and proceed with 3 cnots.
    var targetArray = makeBitArray(targetQubits, 2);

    var target1 = new BitField(targetQubits);
    var target2 = new BitField(targetQubits);
    target1.setBit(targetArray[0], 0);
    target2.setBit(targetArray[1], 0);
    var cond1 = new BitField(target2);
    var cond2 = new BitField(target1);
    cond1.orEquals(conditionQubits);
    cond2.orEquals(conditionQubits);

    this.cnot(target1, cond1);
    this.crootnot_inv(target2, cond2);
    this.cnot(target1, cond1);
}

/////////////////////////////////////////////////////////////////
// CNOT
QReg.prototype.cnot = function (targetQubits, conditionQubits)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.cnot(targetQubits, conditionQubits);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    // TODO: Try speed with float view vs. int view into the data.
    if (isAllZero(targetQubits))
        return;
    if (isAllZero(conditionQubits))
    {
        this.not(targetQubits);
        return;
    }

    if (this.chp && this.chp.active)
    {
        if (conditionQubits.countOneBits() == 1)
        {
            var cond = conditionQubits.getLowestBitIndex();
            var low_targ = targetQubits.getLowestBitIndex();
            var high_targ = targetQubits.getHighestBitIndex();

            for (var targ = low_targ; targ <= high_targ; ++targ)
            {
                if (targetQubits.getBit(targ))
                    this.chp.cnot(null, cond, targ);
            }
        }
        return;
    }

    if (this.disableSimulation)
    {
        this.storage.cnot(targetQubits, conditionQubits);
        this.changed();
        return;
    }
    // TODO: Add bitfield support to the rest of this
    //       For now it's not needed, since we're full-sim, so the QC size will be <= 32 bits
    targetQubits = bitFieldToInt(targetQubits);
    conditionQubits = bitFieldToInt(conditionQubits);

    // If we've mixed with any quantum-funky bits, then all of these are quantum-funky
    if ((conditionQubits & this.classicalBitsValid) != conditionQubits)
        this.invalidateClassicalBits(targetQubits);
    else if ((this.classicalBits & conditionQubits) == conditionQubits)
        this.classicalBits ^= targetQubits;

    for (var i = 0; i < this.numQubits; ++i)
    {
        var mask = 1 << i;
        if (targetQubits & mask)
        {
            this.storage.cnot(mask, conditionQubits, this.storage);
        }
    }

    if (qc_options.noise_probability)
    {
        this.apply_noise(qc_options.noise_magnitude, targetQubits, qc_options.noise_func);
        this.apply_noise(qc_options.noise_magnitude, conditionQubits, qc_options.noise_func);
    }

    this.changed();
}

QRegNode.prototype.cnot = function (targetQubit, conditionQubits, pairBranch)
{
    if (targetQubit == 0)
        return;

    if (conditionQubits == 0)
    {
        // If there are no condition bits left, switch to Not.
        if (targetQubit & (this.bitValue | this.kidMask))
        {
            // We're still above the target, so it's just a NOT
            this.not(targetQubit);
        }
        else
        {
            // The target is above us, so swap pairs
            var temp = this.tree[0];
            this.tree[0] = pairBranch.tree[0];
            pairBranch.tree[0] = temp;
            var temp = this.tree[1];
            this.tree[1] = pairBranch.tree[1];
            pairBranch.tree[1] = temp;
        }
    }
    else if (conditionQubits & this.bitValue)
    {
        // If the top bit is a condition, then only continue down one branch.
        this.tree[1].cnot(targetQubit, conditionQubits & this.kidMask, pairBranch.tree[1]);
    }
    else if (targetQubit == this.bitValue)
    {
        // If the top bit is the target, we need to start using pairs.
        this.tree[0].cnot(targetQubit, conditionQubits & this.kidMask, this.tree[1]);
    }
    else
    {
        // If this bit isn't used, just keep calling down the chain.
        this.tree[0].cnot(targetQubit, conditionQubits & this.kidMask, pairBranch.tree[0]);
        this.tree[1].cnot(targetQubit, conditionQubits & this.kidMask, pairBranch.tree[1]);
    }
}

QBlock.prototype.cnot = function (targetQubit, conditionQubits, pairBlock)
{
    if (this.gpuBlock)
    {
        this.gpuBlock.op_not(targetQubit, conditionQubits, 0, pairBlock.gpuBlock);
        if (!webgl_blocks.side_by_side_checking)
            return;
    }

    var vals = 1 << this.numQubits;
    var temp;

    // Here we skip a bunch of work by moving the start forward
    // based on the conditions
    var starter = conditionQubits;
    var shifter = targetQubit;
    while (shifter)
    {
        starter &= ~shifter;
        shifter >>= 1;
    }
    if (pairBlock != this)
    {
        // We're doing the operation between two paired buffers
        var index;
        for (var column = starter; column < vals; ++column)
        {
            if ((column & conditionQubits) == conditionQubits)
            {
                index = column * 2;
                temp = this.values[index];
                this.values[index] = pairBlock.values[index];
                pairBlock.values[index] = temp;
                temp = this.values[index + 1];
                this.values[index + 1] = pairBlock.values[index + 1];
                pairBlock.values[index + 1] = temp;
            }
        }
    }
    else
    {
        // The operation is within a block.
        var index1;
        var index2;
        var column1 = starter;
        var column2 = column1 + targetQubit;
        while (column1 < vals)
        {
            for (var j = 0; j < targetQubit; ++j)
            {
                if ((column1 & conditionQubits) == conditionQubits)
                {
                    index1 = column1 * 2;
                    index2 = column2 * 2;

                    temp = this.values[index1];
                    this.values[index1] = this.values[index2];
                    this.values[index2] = temp;
                    temp = this.values[index1 + 1];
                    this.values[index1 + 1] = this.values[index2 + 1];
                    this.values[index2 + 1] = temp;
                }
                column1++;
                column2++;
            }
            // Now skip the other half of our pairs
            column1 += targetQubit;
            column2 += targetQubit;
        }
    }
    if (this.gpuBlock && webgl_blocks.side_by_side_checking)
        this.gpuBlock.side_by_side_check('cNOT', this.values);
}

QReg.prototype.apply_noise = function (noiseMagnitude, targetQubits, noiseFunc)
{
    this.noise_level = 0;
    var noise_count = 0;
    var save_noise_prob = qc_options.noise_probability;
    qc_options.noise_probability = 0;
    if (noiseFunc)
    {
        noiseFunc(this, noiseMagnitude, targetQubits);
    }
    else
    {
        var bf = NewBitField(0, this.numQubits);
        if (Math.random() < save_noise_prob)
        {
            var max_noise = 0;
            var low = targetQubits.getLowestBitIndex();
            var high = targetQubits.getHighestBitIndex();

            bf.set(0);
            bf.setBit(low, 1);
            for (var bit = low; bit <= high; ++bit)
            {
                if (bf.andIsNotEqualZero(targetQubits))
                {
                    var phaseMag = noiseMagnitude * (2 * Math.random() - 1);
                    max_noise = Math.max(max_noise, Math.abs(phaseMag));
                    this.single_qubit_phase(bf, 180 * phaseMag);

                    var xmag = noiseMagnitude * (2 * Math.random() - 1);
                    max_noise = Math.max(max_noise, Math.abs(xmag));
                    this.rotatex(bf, 180 * xmag);
                }
                bf.shiftLeft1();
            }
//            this.phaseShift(targetQubits, 180 * mag1);
            this.noise_level += max_noise;
            noise_count += 2;
        }
        bf.recycle();
    }
    if (noise_count)
        this.noise_level /= noise_count;
//    this.noise_level = 1;
    qc_options.noise_probability = save_noise_prob;
}

QReg.prototype.noise = function (noiseMagnitude, targetQubits, noiseFunc)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.noise(noiseMagnitude, targetQubits, noiseFunc);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    if (noiseMagnitude == null)
        noiseMagnitude = 1.0;
    if (targetQubits == null)
        targetQubits = this.allBitsMask;
    var save_noise_prob = qc_options.noise_probability;
    qc_options.noise_probability = 1;
    this.apply_noise(noiseMagnitude, targetQubits, noiseFunc);
    qc_options.noise_probability = save_noise_prob;
}


QReg.prototype.single_qubit_phase = function (targetQubits, phiDegrees)
{
    this._phaseShift(targetQubits, 0, phiDegrees);
}

QReg.prototype.multi_qubit_phase = function (targetQubits, conditionQubits, phiDegrees)
{
    this._phaseShift(targetQubits, conditionQubits, phiDegrees);
}

//////////////////////////////////////////////////////////////
// Phase Shift
// New new new API change:
// This now operates more like CNOT.
// If conditionQubits is 0, then this is a single-qubit phase on each qubit in targetQubits.
// If conditionQubits is not 0, then this is a cphase on each qubit in targetQubits, with all conditionQubits.
// If targetQubits is 0 and conditionQubits is not 0, then this is a cphase on conditionQubits
// If targetQubits and conditionQubits are 0, then this is a single-qubit phase on all qubits

QReg.prototype._phaseShift = function (targetQubits, conditionQubits, phiDegrees)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg._phaseShift(targetQubits, conditionQubits, phiDegrees);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    // TODO: Try speed with float view vs. int view into the data.
    if (phiDegrees == 0)
        return;

    if (conditionQubits == null)
        conditionQubits = 0;
    if (targetQubits == null)
        targetQubits = 0;
    var zerot = isAllZero(targetQubits);
    var zeroc = isAllZero(conditionQubits);

    if (zerot && zeroc)
    {
        // t=0 c=0: single-qubit phase on all qubits
        targetQubits = this.allBitsMask;
    }

    // TODO: Add bitfield support to the rest of this
    //       For now it's not needed, since we're full-sim, so the QC size will be <= 32 bits
    conditionQubits = bitFieldToInt(conditionQubits);
    targetQubits = bitFieldToInt(targetQubits);

    // In the case where we have MULTIPLE target qubits, separate them and
    // run them separately.
    // In all other cases, just merge the qubits into condition.
    var targ_lo = getLowestBitIndex(targetQubits);
    var targ_hi = getHighestBitIndex(targetQubits);
    if (targ_lo != targ_hi)
    {
        // In the case where we have MULTIPLE target qubits, separate them and
        // run them separately.
        for (var bit = targ_lo; bit <= targ_hi; ++bit)
        {
            var targ_mask = 1 << bit;
            if (targetQubits & targ_mask)
                this._phaseShift(targ_mask, conditionQubits & ~targ_mask, phiDegrees);
        }
        return;
    }
    else
    {
        // In all other cases, just merge the qubits into condition.
        conditionQubits |= targetQubits;
        targetQubits = 0;
    }

    if (this.chp && this.chp.active)
    {
        // TODO: fix CHP handling
        conditionQubits.orEquals(targetQubits);
        if (conditionQubits.countOneBits() == 1)
        {
            var phi = phiDegrees;
            while (phi < 0)
                phi += 360;
            var phi_iters = Math.floor(phi / 90);
            if (phi_iters * 90 == phi)
            {
                var cond = conditionQubits.getLowestBitIndex();
                this.chp.phase(null, cond);
            }
        }
        else if (conditionQubits.countOneBits() == 2 && phiDegrees == 180)
        {
            var bit1 = conditionQubits.getLowestBitIndex();
            var bit2 = conditionQubits.getHighestBitIndex();
            this.chp.hadamard(null, bit2);
            this.chp.cnot(null, bit1, bit2);
            this.chp.hadamard(null, bit2);
        }
        return;
    }

    if (this.disableSimulation)
    {
        this.storage._phaseShift(conditionQubits, phiDegrees);
        this.changed();
        return;
    }
    // TODO: Add bitfield support to the rest of this
    //       For now it's not needed, since we're full-sim, so the QC size will be <= 32 bits
    conditionQubits = bitFieldToInt(conditionQubits);
    // Clear out any high bits
    conditionQubits &= ~(~0 << this.numQubits);

    if (this.use_photon_sim)
    {
        this.photonSim.phase(conditionQubits, phiDegrees);
        this.changed();
        return;
    }

    var phiRadians = phiDegrees * Math.PI / 180.0;
    var sval = Math.sin(phiRadians);
    var cval = Math.cos(phiRadians);
    this.storage._phaseShift(conditionQubits, sval, cval);

    if (qc_options.noise_probability)
        this.apply_noise(qc_options.noise_magnitude, conditionQubits, qc_options.noise_func);

    // No need to invalidate classical bits; none of the probabilities have changed.
    this.changed();
}

QRegNode.prototype._phaseShift = function (conditionQubits, sval, cval)
{
    if (conditionQubits & this.bitValue)
    {
        // If the top bit is a condition, then only continue down one branch.
        this.tree[1]._phaseShift(conditionQubits & this.kidMask, sval, cval);
    }
    else
    {
        // If this bit isn't used, just keep calling down the chain.
        this.tree[0]._phaseShift(conditionQubits & this.kidMask, sval, cval);
        this.tree[1]._phaseShift(conditionQubits & this.kidMask, sval, cval);
    }
}

QBlock.prototype._phaseShift = function (conditionQubits, sval, cval)
{
    if (this.gpuBlock)
    {
        this.gpuBlock.op_phase(conditionQubits, 0, sval, cval);
        if (!webgl_blocks.side_by_side_checking)
            return;
    }

    var vals = 1 << this.numQubits;
    var ax, ay;

    // Here we skip a bunch of work by moving the start forward
    // based on the conditions
    var starter = conditionQubits;
    if (conditionQubits == 0)
    {
        // We're doing the operation on the whole buffer
        var index;
        for (var column = starter; column < vals; ++column)
        {
            index = column * 2;
            ax = this.values[index];
            ay = this.values[index + 1];
            this.values[index]     = (cval * ax) + (sval * ay);
            this.values[index + 1] = (cval * ay) - (sval * ax);
        }
    }
    else
    {
        // Need to skip items based on cond.
        var index;
        for (var column = starter; column < vals; ++column)
        {
            if ((column & conditionQubits) == conditionQubits)
            {
                index = column * 2;

                ax = this.values[index];
                ay = this.values[index + 1];
                this.values[index]     = (cval * ax) + (sval * ay);
                this.values[index + 1] = (cval * ay) - (sval * ax);
            }
        }
    }
    if (this.gpuBlock && webgl_blocks.side_by_side_checking)
        this.gpuBlock.side_by_side_check('phaseShift', this.values);
}

//////////////////////////////////////////////////////////////
// 2x2 Matrix operation
// This can be used for all sorts of things
// opData can be anything; it will be passed to opFunc during block operations
QReg.prototype.op2x2 = function (targetQubits, opFunc, opData, mtx2x2)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.op2x2(targetQubits, opFunc, opData, mtx2x2);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    this.invalidateClassicalBits(targetQubits);
    if (isAllZero(targetQubits))
        return;

    if (this.disableSimulation)
    {
        this.storage.op2x2(targetQubits, opFunc, opData, mtx2x2);
        this.changed();
        return;
    }
    // TODO: Add bitfield support to the rest of this
    //       For now it's not needed, since we're full-sim, so the QC size will be <= 32 bits
    targetQubits = bitFieldToInt(targetQubits);

    // Any bits touched by this are probably quantum-funky now
    this.invalidateClassicalBits(targetQubits);

    if (printSpeedMetrics)
    {
        var startTime = new Date().getTime();
        console.log('2x2 start...\n');
    }
    for (var i = 0; i < this.numQubits; ++i)
    {
        var mask = 1 << i;
        if (targetQubits & mask)
        {
            this.storage.op2x2(mask, opFunc, opData, mtx2x2, this.storage);
        }
    }
    if (printSpeedMetrics)
    {
        var elapsedTimeMS = new Date().getTime() - startTime;
        console.log('2x2 op time: ' + (elapsedTimeMS / 1000.0) + ' seconds.\n');
    }

    this.changed();
}

QRegNode.prototype.op2x2 = function (targetQubit, opFunc, opData, mtx2x2, pairBranch)
{
    if (targetQubit == 0)
        return;

    if (targetQubit == this.bitValue)
    {
        // If the top bit is the target, we need to start using pairs.
        this.tree[0].op2x2(targetQubit, opFunc, opData, mtx2x2, this.tree[1]);
    }
    else
    {
        // If this bit isn't used, just keep calling down the chain.
        this.tree[0].op2x2(targetQubit, opFunc, opData, mtx2x2, pairBranch.tree[0]);
        this.tree[1].op2x2(targetQubit, opFunc, opData, mtx2x2, pairBranch.tree[1]);
    }
}

QBlock.prototype.op2x2 = function (targetQubit, opFunc, opData, mtx2x2, pairBlock)
{
    if (this.gpuBlock)
    {
        this.gpuBlock.op_2x2(targetQubit, mtx2x2, pairBlock.gpuBlock);
        if (!webgl_blocks.side_by_side_checking)
            return;
    }
    var vals = 1 << this.numQubits;

    // Here we skip a bunch of work by moving the start forward
    // based on the conditions
    var starter = 0;
    if (pairBlock != this)
    {
        // We're doing the operation between two paired buffers
        var index;
        for (var column = starter; column < vals; ++column)
        {
            index = column * 2;
            opFunc(this.values, index, pairBlock.values, index, opData);
        }
    }
    else
    {
        // The operation is within a block.
        var index1;
        var index2;
        var column1 = starter;
        var column2 = column1 + targetQubit;
        while (column1 < vals)
        {
            for (var j = 0; j < targetQubit; ++j)
            {
                index1 = column1 * 2;
                index2 = column2 * 2;

                opFunc(this.values, index1, this.values, index2, opData);
                column1++;
                column2++;
            }
            // Now skip the other half of our pairs
            column1 += targetQubit;
            column2 += targetQubit;
        }
    }
    if (this.gpuBlock && webgl_blocks.side_by_side_checking)
    {
        this.gpuBlock.side_by_side_check('2x2 bit'+targetQubit, this.values);
        if (pairBlock != this)
            pairBlock.gpuBlock.side_by_side_check('2x2 bit (pairBlock)'+targetQubit, pairBlock.values);
    }
}

QReg.prototype.cop2x2 = function (targetQubits, conditionQubits, opFunc, opData, mtx2x2)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.cop2x2(targetQubits, conditionQubits, opFunc, opData, mtx2x2);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    this.invalidateClassicalBits(targetQubits, conditionQubits);
    if (isAllZero(targetQubits))
        return;
    if (isAllZero(conditionQubits))
    {
        this.op2x2(targetQubits, opFunc, opData, mtx2x2);
        return;
    }

    if (this.disableSimulation)
    {
        this.storage.cop2x2(targetQubits, conditionQubits, opFunc, opData, mtx2x2);
        this.changed();
        return;
    }
    // TODO: Add bitfield support to the rest of this
    //       For now it's not needed, since we're full-sim, so the QC size will be <= 32 bits
    targetQubits = bitFieldToInt(targetQubits);
    conditionQubits = bitFieldToInt(conditionQubits);

    // Any bits touched by this are probably quantum-funky now
    this.invalidateClassicalBits(targetQubits);

    for (var i = 0; i < this.numQubits; ++i)
    {
        var mask = 1 << i;
        if (targetQubits & mask)
        {
            this.storage.cop2x2(mask, conditionQubits, opFunc, opData, mtx2x2, this.storage);
        }
    }

    this.changed();
}

QRegNode.prototype.cop2x2 = function (targetQubit, conditionQubits, opFunc, opData, mtx2x2, pairBranch)
{
    if (targetQubit == 0)
        return;

    if (conditionQubits & this.bitValue)
    {
        // If the top bit is a condition, then only continue down one branch.
        this.tree[1].cop2x2(targetQubit, conditionQubits & this.kidMask, opFunc, opData, mtx2x2, pairBranch.tree[1]);
    }
    else if (targetQubit == this.bitValue)
    {
        // If the top bit is the target, we need to start using pairs.
        this.tree[0].cop2x2(targetQubit, conditionQubits & this.kidMask, opFunc, opData, mtx2x2, this.tree[1]);
    }
    else
    {
        // If this bit isn't used, just keep calling down the chain.
        this.tree[0].cop2x2(targetQubit, conditionQubits & this.kidMask, opFunc, opData, mtx2x2, pairBranch.tree[0]);
        this.tree[1].cop2x2(targetQubit, conditionQubits & this.kidMask, opFunc, opData, mtx2x2, pairBranch.tree[1]);
    }
}

QBlock.prototype.cop2x2 = function (targetQubit, conditionQubits, opFunc, opData, mtx2x2, pairBlock)
{
    var vals = 1 << this.numQubits;
    var temp;

    // Here we skip a bunch of work by moving the start forward
    // based on the conditions
    var starter = conditionQubits;
    var shifter = targetQubit;
    while (shifter)
    {
        starter &= ~shifter;
        shifter >>= 1;
    }
    if (pairBlock != this)
    {
        // We're doing the operation between two paired buffers
        var index;
        for (var column = starter; column < vals; ++column)
        {
            if ((column & conditionQubits) == conditionQubits)
            {
                index = column * 2;
                opFunc(this.values, index, pairBlock.values, index, opData);
            }
        }
    }
    else
    {
        // The operation is within a block.
        var index1;
        var index2;
        var column1 = starter;
        var column2 = column1 + targetQubit;
        while (column1 < vals)
        {
            for (var j = 0; j < targetQubit; ++j)
            {
                if ((column1 & conditionQubits) == conditionQubits)
                {
                    index1 = column1 * 2;
                    index2 = column2 * 2;

                    opFunc(this.values, index1, this.values, index2, opData);
                }
                column1++;
                column2++;
            }
            // Now skip the other half of our pairs
            column1 += targetQubit;
            column2 += targetQubit;
        }
    }
    if (this.gpuBlock && webgl_blocks.side_by_side_checking)
        this.gpuBlock.side_by_side_check('c2x2', this.values);
}

/////////////////////////////////////////////////////////////////////////
// 2x2 Block Operations
// Optimization note: These could get faster by inlining them within 
//                    the QBlock loop. That may be worth doing
//                    for some common operations.

//////////////////////////////////////////////////////////////
// Hadamard and cHadamard
//
function blockOp_Hadamard(array1, index1, array2, index2, opData)
{
    var oneOverRoot2 = opData;
    var ar = array1[index1];
    var ai = array1[index1 + 1];
    var br = array2[index2];
    var bi = array2[index2 + 1];
    array1[index1]     = (ar + br) * oneOverRoot2;
    array1[index1 + 1] = (ai + bi) * oneOverRoot2;
    array2[index2]     = (ar - br) * oneOverRoot2;
    array2[index2 + 1] = (ai - bi) * oneOverRoot2;
}

QReg.prototype.hadamard = function (targetQubits)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.hadamard(targetQubits);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    if (targetQubits == null)	// this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;

    if (this.use_photon_sim)
    {
        var low_targ = targetQubits.getLowestBitIndex();
        var high_targ = targetQubits.getHighestBitIndex();

        for (var targ = low_targ; targ <= high_targ; ++targ)
        {
            if (targetQubits.getBit(targ))
            {
                this.photonSim.beamsplitter(1 << targ, 0.5);
                this.photonSim.phase(90, 1 << targ);
            }
        }
        this.changed();
        return;
    }

    if (this.chp && this.chp.active)
    {
        var low_targ = targetQubits.getLowestBitIndex();
        var high_targ = targetQubits.getHighestBitIndex();

        for (var targ = low_targ; targ <= high_targ; ++targ)
        {
            if (targetQubits.getBit(targ))
                this.chp.hadamard(null, targ);
        }
        return;
    }


    var oneOverRoot2 = 1.0 / Math.sqrt(2.0);
    var mtx2x2 = [[{real: oneOverRoot2, imag: 0.0}, {real: oneOverRoot2, imag: 0.0}],
                  [{real: oneOverRoot2, imag: 0.0}, {real:-oneOverRoot2, imag: 0.0}]];

    this.op2x2(targetQubits, blockOp_Hadamard, oneOverRoot2, mtx2x2);

    if (qc_options.noise_probability)
        this.apply_noise(qc_options.noise_magnitude, targetQubits, qc_options.noise_func);
}

QReg.prototype.chadamard = function (targetQubits, conditionQubits)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.chadamard(targetQubits, conditionQubits);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }

    if (this.use_photon_sim && isAllZero(conditionQubits))
    {
        var low_targ = targetQubits.getLowestBitIndex();
        var high_targ = targetQubits.getHighestBitIndex();

        for (var targ = low_targ; targ <= high_targ; ++targ)
        {
            if (targetQubits.getBit(targ))
            {
                this.photonSim.beamsplitter(1 << targ, 0.5);
                this.photonSim.phase(1 << targ, 90);
            }
        }
        this.changed();
        return;
    }

    if (this.chp && this.chp.active)
    {
        if (targetQubits == null)   // this allows a missing arg to just affect the whole reg
            targetQubits = this.allBitsMask;
        if (isAllZero(conditionQubits))
        {
            var low_targ = targetQubits.getLowestBitIndex();
            var high_targ = targetQubits.getHighestBitIndex();

            for (var targ = low_targ; targ <= high_targ; ++targ)
            {
                if (targetQubits.getBit(targ))
                    this.chp.hadamard(null, targ);
            }
        }
        return;
    }

    var oneOverRoot2 = 1.0 / Math.sqrt(2.0);
    var mtx2x2 = [[{real: oneOverRoot2, imag: 0.0}, {real: oneOverRoot2, imag: 0.0}],
                  [{real: oneOverRoot2, imag: 0.0}, {real:-oneOverRoot2, imag: 0.0}]];
    this.cop2x2(targetQubits, conditionQubits, blockOp_Hadamard, oneOverRoot2, mtx2x2);

    if (qc_options.noise_probability)
        this.apply_noise(qc_options.noise_magnitude, targetQubits, qc_options.noise_func);
}

// This is an optical phase shift (PS) gate from J. Silverstone 2015
// http://jsilverst.webspace.virginmedia.com/Data/Thesis.pdf (1.10) on page 11
QReg.prototype.optical_phase = function (targetQubits, phiDegrees)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.optical_phase(targetQubits, phiDegrees);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    this.invalidateClassicalBits(targetQubits);
    if (targetQubits == null)   // this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;
    var phiRadians = phiDegrees * Math.PI / 180.0;
    var sval = Math.sin(phiRadians);
    var cval = Math.cos(phiRadians);

    var mtx2x2 = [[{real: cval, imag: -sval}, {real: 0.0, imag: 0.0}],
                  [{real: 0.0, imag: 0.0}, {real: 1.0, imag: 0.0}]];

    this.op2x2(targetQubits, blockOp_2x2, mtx2x2, mtx2x2);
}

// This is an optical beam splitter (BS) gate from J. Silverstone 2015
// http://jsilverst.webspace.virginmedia.com/Data/Thesis.pdf (1.10) on page 11
QReg.prototype.optical_beamsplitter = function (targetQubits, reflectivity)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.optical_beamsplitter(targetQubits, reflectivity);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    this.invalidateClassicalBits(targetQubits);
    if (reflectivity == null)
        reflectivity = 0.5;
    if (targetQubits == null)   // this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;
    var dir = 1;
    if (reflectivity < 0.0)
    {
        dir = -1;
        reflectivity = -reflectivity;
    }
    var root_r = Math.sqrt(reflectivity);
    var root_one_minus_r = Math.sqrt(1.0 - reflectivity);

    var mtx2x2 = [[{real: root_r, imag: 0},                {real: 0.0,    imag: dir * root_one_minus_r}],
                  [{real: 0.0,    imag: dir * root_one_minus_r}, {real: root_r, imag: 0.0}]];

    this.op2x2(targetQubits, blockOp_2x2, mtx2x2, mtx2x2);
}

QReg.prototype.coptical_beamsplitter = function (targetQubits, conditionQubits, reflectivity)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.coptical_beamsplitter(targetQubits, conditionQubits, reflectivity);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    this.invalidateClassicalBits(targetQubits, conditionQubits);
    if (reflectivity == null)
        reflectivity = 0.5;
    if (targetQubits == null)   // this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;
    var dir = 1;
    if (reflectivity < 0.0)
    {
        dir = -1;
        reflectivity = -reflectivity;
    }
    var root_r = Math.sqrt(reflectivity);
    var root_one_minus_r = Math.sqrt(1.0 - reflectivity);

    var mtx2x2 = [[{real: root_r, imag: 0},                {real: 0.0,    imag: dir * root_one_minus_r}],
                  [{real: 0.0,    imag: dir * root_one_minus_r}, {real: root_r, imag: 0.0}]];

    this.cop2x2(targetQubits, conditionQubits, blockOp_2x2, mtx2x2, mtx2x2);
}

QReg.prototype.dual_rail_beamsplitter = function (targetQubits, conditionQubits, reflectivity, auxQubits)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.dual_rail_beamsplitter(targetQubits, conditionQubits, reflectivity, auxQubits);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    this.invalidateClassicalBits(targetQubits, conditionQubits);
    if (reflectivity == null)
        reflectivity = 0.5;
    if (targetQubits == null)   // this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;

    if (this.core_sim)
    {
        if (targetQubits)
            this.core_sim.op_beamsplitter(targetQubits, reflectivity);
        this.changed();
        return;
    }

    if (this.use_photon_sim)
    {
        if (targetQubits)
            this.photonSim.beamsplitter(targetQubits, reflectivity);
        if (auxQubits)
            this.photonSim.beamsplitter_aux(auxQubits, reflectivity);
        this.changed();
        return;
    }

    // Exactly two targetBits are set. Find them and proceed with 3 ops.
    var targetArray = makeBitArray(targetQubits, 2);

    var target1 = new BitField(targetQubits);
    var target2 = new BitField(targetQubits);
    target1.setBit(targetArray[0], 0);
    target2.setBit(targetArray[1], 0);
    var cond1 = new BitField(target2);
    var cond2 = new BitField(target1);
    cond1.orEquals(conditionQubits);
    cond2.orEquals(conditionQubits);

    this.cnot(target1, cond1);
    this.coptical_beamsplitter(target2, cond2, reflectivity);
    this.cnot(target1, cond1);
}

QReg.prototype.pbs = function (targetQubits, conditionQubits, horiz_vert, auxQubits)
{
    // If we use this, we're committed to linear optics.
    // Can't do this one in qubit space.
    var default_modes_per_qubit = 2;
    this.startPhotonSim(targetQubits, null, default_modes_per_qubit);

    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.pbs(targetQubits, conditionQubits, horiz_vert, auxQubits);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    this.invalidateClassicalBits(targetQubits, conditionQubits);
    if (horiz_vert == null)
        horiz_vert = 0;
    if (targetQubits == null)   // this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;

    if (this.core_sim)
    {
        if (targetQubits)
            this.core_sim.op_pbs(targetQubits, horiz_vert);
        this.changed();
        return;
    }

    if (this.use_photon_sim)
    {
        if (targetQubits)
            this.photonSim.pbs(targetQubits, horiz_vert);
        if (auxQubits)
            this.photonSim.pbs_aux(auxQubits, horiz_vert);
        this.changed();
        return;
    }

    // Exactly two targetBits are set. Find them and proceed with 3 ops.
    var targetArray = makeBitArray(targetQubits, 2);

    var target1 = new BitField(targetQubits);
    var target2 = new BitField(targetQubits);
    target1.setBit(targetArray[0], 0);
    target2.setBit(targetArray[1], 0);
    var cond1 = new BitField(target2);
    var cond2 = new BitField(target1);
    cond1.orEquals(conditionQubits);
    cond2.orEquals(conditionQubits);

    this.cnot(target1, cond1);
    this.coptical_beamsplitter(target2, cond2, reflectivity);
    this.cnot(target1, cond1);
}

QReg.prototype.pair_source = function (targetQubits, conditionQubits)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.pair_source(targetQubits, conditionQubits);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    if (this.use_photon_sim)
    {
        this.photonSim.pair_source(targetQubits);
        this.changed();
        return;
    }
    this.write(targetQubits, 0);
    this.write(conditionQubits, 0);

    var low_cond  = conditionQubits.getLowestBitIndex();
    var high_cond = conditionQubits.getHighestBitIndex();
    var low_targ  = targetQubits.getLowestBitIndex();
    var high_targ = targetQubits.getHighestBitIndex();
    if (low_cond == high_cond)
    {
        this.hadamard(conditionQubits);
        this.cnot(targetQubits, conditionQubits);
    }
    else
    {
        this.hadamard(1 << low_cond);
        this.not(1 << high_cond);
        this.cnot(1 << high_cond, 1 << low_cond);
        this.cnot(1 << low_targ, 1 << low_cond);
        this.cnot(1 << high_targ, 1 << high_cond);
    }
}

QReg.prototype.polarization_grating_in = function (targetQubits, conditionQubits, theta)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.polarization_grating_in(targetQubits, conditionQubits, theta);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    this.invalidateClassicalBits(targetQubits, conditionQubits);
    if (theta == null)
        theta = 0.0;
    if (targetQubits == null)   // this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;

    if (this.use_photon_sim)
    {
        this.photonSim.polarization_grating_in(targetQubits, theta);
        this.changed();
        return;
    }

    // Exactly two targetBits are set. Find them and proceed with 3 ops.
    var targetArray = makeBitArray(targetQubits, 2);

    var target1 = new BitField(targetQubits);
    var target2 = new BitField(targetQubits);
    target1.setBit(targetArray[0], 0);
    target2.setBit(targetArray[1], 0);
    var cond1 = new BitField(target2);
    var cond2 = new BitField(target1);
    cond1.orEquals(conditionQubits);
    cond2.orEquals(conditionQubits);

    if (theta < 0)
    {
        this.write(target2, ~0);
        this.cnot(target2, target1);
    }
    else
    {
        this.write(target1, ~0);
        this.cnot(target1, target2);
    }
}


QReg.prototype.polarization_grating_out = function (targetQubits, conditionQubits, theta)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.polarization_grating_out(targetQubits, conditionQubits, theta);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    this.invalidateClassicalBits(targetQubits, conditionQubits);
    if (theta == null)
        theta = 0.0;
    if (targetQubits == null)   // this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;

    if (this.use_photon_sim)
    {
        this.photonSim.polarization_grating_out(targetQubits, theta);
        this.changed();
        return;
    }

    // Exactly two targetBits are set. Find them and proceed with 3 ops.
    var targetArray = makeBitArray(targetQubits, 2);

    var target1 = new BitField(targetQubits);
    var target2 = new BitField(targetQubits);
    target1.setBit(targetArray[0], 0);
    target2.setBit(targetArray[1], 0);
    var cond1 = new BitField(target2);
    var cond2 = new BitField(target1);
    cond1.orEquals(conditionQubits);
    cond2.orEquals(conditionQubits);

    if (theta < 0)
    {
        this.cnot(target2, target1);
        this.not(target2);
        this.postselect(target2, 0);
    }
    else
    {
        this.cnot(target1, target2);
        this.not(target1);
        this.postselect(target1, 0);
    }
}

// Apply a general 2x2 complex matrix
function blockOp_2x2(array1, index1, array2, index2, opData)
{
    // |ar,ai| |m00r,m00i m01r,m01i|     |m00r*ar-m00i*ai+m01r*br-m01i*bi,m00r*ai+m00i+ar+m01r*bi+m01i+br m00r*ar-m00i*ai+m01r*br-m01i*bi,
    //                                    m00r*ai+m00i+ar+m01r*bi+m01i+br|
    // |     | |                   | ==>
    // |br,bi| |m10r,m10i m11r,m11i|     |m00r*ar-m00i*ai,m00r*ai+m00i+ar,
    var m = opData;
    var ar = array1[index1];
    var ai = array1[index1 + 1];
    var br = array2[index2];
    var bi = array2[index2 + 1];
    array1[index1]     = m[0][0].real*ar - m[0][0].imag*ai + m[0][1].real*br - m[0][1].imag*bi;
    array1[index1 + 1] = m[0][0].real*ai + m[0][0].imag*ar + m[0][1].real*bi + m[0][1].imag*br;
    array2[index2]     = m[1][0].real*ar - m[1][0].imag*ai + m[1][1].real*br - m[1][1].imag*bi;
    array2[index2 + 1] = m[1][0].real*ai + m[1][0].imag*ar + m[1][1].real*bi + m[1][1].imag*br;
}

//////////////////////////////////////////////////////////////
// Rotate and cRotate
//
function blockOp_Rotatey(array1, index1, array2, index2, opData)
{
    var sval = opData[0];
    var cval = opData[1];
    var ar = array1[index1];
    var ai = array1[index1 + 1];
    var br = array2[index2];
    var bi = array2[index2 + 1];
    array1[index1]     = (cval * ar) + (sval * bi);
    array1[index1 + 1] = (cval * ai) - (sval * br);
    array2[index2]     = (cval * br) + (sval * ai);
    array2[index2 + 1] = (cval * bi) - (sval * ar);
}

function blockOp_Rotatex(array1, index1, array2, index2, opData)
{
    var sval = opData[0];
    var cval = opData[1];
    var ar = array1[index1];
    var ai = array1[index1 + 1];
    var br = array2[index2];
    var bi = array2[index2 + 1];
    array1[index1]     = (cval * ar) - (sval * br);
    array1[index1 + 1] = (cval * ai) - (sval * bi);
    array2[index2]     = (cval * br) + (sval * ar);
    array2[index2 + 1] = (cval * bi) + (sval * ai);
}

QReg.prototype.rotatex = function (targetQubits, thetaDegrees)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.rotatex(targetQubits, thetaDegrees);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    if (targetQubits == null)	// this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;
    var thetaRadians = thetaDegrees * Math.PI / 180.0;
    var sval = Math.sin(0.5 * thetaRadians);
    var cval = Math.cos(0.5 * thetaRadians);
    var mtx2x2 = [[{real: cval, imag:  0.0},  {real: 0.0,  imag: -sval}],
                  [{real: 0.0,  imag: -sval}, {real: cval, imag:  0.0}]];
    this.op2x2(targetQubits, blockOp_2x2, mtx2x2, mtx2x2);
}

QReg.prototype.crotatex = function (targetQubits, conditionQubits, thetaDegrees)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.crotatex(targetQubits, conditionQubits, thetaDegrees);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    var thetaRadians = thetaDegrees * Math.PI / 180.0;
    var sval = Math.sin(0.5 * thetaRadians);
    var cval = Math.cos(0.5 * thetaRadians);
    var mtx2x2 = [[{real: cval, imag:  0.0},  {real: 0.0,  imag: -sval}],
                  [{real: 0.0,  imag: -sval}, {real: cval, imag:  0.0}]];
    this.cop2x2(targetQubits, conditionQubits, blockOp_2x2, mtx2x2, mtx2x2);
}

QReg.prototype.y = function (targetQubits, thetaDegrees)
{
    // TODO: This can be done without multiplication, similar to x()     
    if (targetQubits == null)   // this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;
    var mtx2x2 = [[{real: 0.0, imag: 0.0}, {real: 0.0, imag: -1.0}],
                  [{real: 0.0, imag: 1.0}, {real: 0.0, imag: 0.0}]];
    this.op2x2(targetQubits, blockOp_2x2, mtx2x2, mtx2x2);
}

QReg.prototype.rotatey = function (targetQubits, thetaDegrees)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.rotatey(targetQubits, thetaDegrees);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    if (targetQubits == null)   // this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;
    var thetaRadians = thetaDegrees * Math.PI / 180.0;
    var sval = Math.sin(0.5 * thetaRadians);
    var cval = Math.cos(0.5 * thetaRadians);
    // TODO: Fill this in for the GPU op
    var mtx2x2 = [[{real: cval, imag: 0.0}, {real: -sval, imag: 0.0}],
                  [{real: sval, imag: 0.0}, {real:  cval, imag: 0.0}]];
    this.op2x2(targetQubits, blockOp_2x2, mtx2x2, mtx2x2);
}

QReg.prototype.crotatey = function (targetQubits, conditionQubits, thetaDegrees)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.crotatey(targetQubits, conditionQubits, thetaDegrees);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    var thetaRadians = thetaDegrees * Math.PI / 180.0;
    var sval = Math.sin(0.5 * thetaRadians);
    var cval = Math.cos(0.5 * thetaRadians);
    // TODO: Fill this in for the GPU op
    var mtx2x2 = [[{real: cval, imag: 0.0}, {real: -sval, imag: 0.0}],
                  [{real: sval, imag: 0.0}, {real:  cval, imag: 0.0}]];
    this.cop2x2(targetQubits, conditionQubits, blockOp_2x2, mtx2x2, mtx2x2);
}

QReg.prototype.rotatez = function (targetQubits, thetaDegrees)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.rotatey(targetQubits, thetaDegrees);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    if (targetQubits == null)   // this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;
    var thetaRadians = thetaDegrees * Math.PI / 180.0;
    var sval = Math.sin(0.5 * thetaRadians);
    var cval = Math.cos(0.5 * thetaRadians);
    // TODO: Fill this in for the GPU op
    var mtx2x2 = [[{real: cval, imag: -sval}, {real:   0.0, imag:  0.0}],
                  [{real: 0.0,  imag:   0.0}, {real:  cval, imag: sval}]];
    this.op2x2(targetQubits, blockOp_2x2, mtx2x2, mtx2x2);
}

QReg.prototype.crotatez = function (targetQubits, conditionQubits, thetaDegrees)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.crotatey(targetQubits, conditionQubits, thetaDegrees);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    var thetaRadians = thetaDegrees * Math.PI / 180.0;
    var sval = Math.sin(0.5 * thetaRadians);
    var cval = Math.cos(0.5 * thetaRadians);
    // TODO: Fill this in for the GPU op
    var mtx2x2 = [[{real: cval, imag: -sval}, {real:   0.0, imag:  0.0}],
                  [{real: 0.0,  imag:   0.0}, {real:  cval, imag: sval}]];
    this.cop2x2(targetQubits, conditionQubits, blockOp_2x2, mtx2x2, mtx2x2);
}

//////////////////////////////////////////////////////////////
// RootNot and RootNot_inv
//
function blockOp_RootNot(array1, index1, array2, index2, opData)
{
    var direction = opData;
//    var oneOverRoot2 = 0.70710678118654752440084436210485;
    var half = 0.5;
    var ar = array1[index1];
    var ai = array1[index1 + 1];
    var br = array2[index2];
    var bi = array2[index2 + 1];
    if (direction > 0)
    {
        array1[index1]     = (ar - ai + br + bi) * half;
        array1[index1 + 1] = (ar + ai - br + bi) * half;
        array2[index2]     = (ar + ai + br - bi) * half;
        array2[index2 + 1] = (ai - ar + br + bi) * half;
    }
    else
    {
        array1[index1]     = (ar + ai + br - bi) * half;
        array1[index1 + 1] = (ai - ar + br + bi) * half;
        array2[index2]     = (ar - ai + br + bi) * half;
        array2[index2 + 1] = (ar + ai - br + bi) * half;
    }
}

QReg.prototype.rootnot = function (targetQubits)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.rootnot(targetQubits);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    if (targetQubits == null)   // this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;
    // TODO: Fill this in for the GPU op
    var mtx2x2 = [[{real: 0.0, imag: 0.0}, {real: 0.0, imag: 0.0}],
                  [{real: 0.0, imag: 0.0}, {real: 0.0, imag: 0.0}]];
    this.op2x2(targetQubits, blockOp_RootNot, 1, mtx2x2);
}
QReg.prototype.rootnot_inv = function (targetQubits)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.rootnot_inv(targetQubits);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    if (targetQubits == null)   // this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;
    // TODO: Fill this in for the GPU op
    var mtx2x2 = [[{real: 0.0, imag: 0.0}, {real: 0.0, imag: 0.0}],
                  [{real: 0.0, imag: 0.0}, {real: 0.0, imag: 0.0}]];
    this.op2x2(targetQubits, blockOp_RootNot, -1, mtx2x2);
}

QReg.prototype.crootnot = function (targetQubits, conditionQubits)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.crootnot(targetQubits, conditionQubits);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    // TODO: Fill this in for the GPU op
    var mtx2x2 = [[{real: 0.0, imag: 0.0}, {real: 0.0, imag: 0.0}],
                  [{real: 0.0, imag: 0.0}, {real: 0.0, imag: 0.0}]];
    this.cop2x2(targetQubits, conditionQubits, blockOp_RootNot, 1, mtx2x2);
}
QReg.prototype.crootnot_inv = function (targetQubits, conditionQubits)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.crootnot_inv(targetQubits, conditionQubits);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    // TODO: Fill this in for the GPU op
    var mtx2x2 = [[{real: 0.0, imag: 0.0}, {real: 0.0, imag: 0.0}],
                  [{real: 0.0, imag: 0.0}, {real: 0.0, imag: 0.0}]];
    this.cop2x2(targetQubits, conditionQubits, blockOp_RootNot, -1, mtx2x2);
}







QRegNode.prototype.setZeroMask = function (targetQubits, targetValues)
{
    if (targetQubits == 0)
        return;

    if (targetQubits & this.bitValue)
    {
        var target = targetValues >> (this.numQubits - 1);
        this.tree[1 - target].setZero();
        this.tree[    target].setZeroMask(targetQubits & this.kidMask, 
                                          targetValues & this.kidMask);
    }
    else
    {
        this.tree[0].setZeroMask(targetQubits, targetValues);
        this.tree[1].setZeroMask(targetQubits, targetValues);
    }
}

QBlock.prototype.setZeroMask = function (targetQubits, targetValues)
{
    if (targetQubits == 0)
        return;

    if (this.gpuBlock)
    {
        this.gpuBlock.op_set_bits(targetQubits, targetValues);
        if (!webgl_blocks.side_by_side_checking)
            return;
    }
    var vals = 1 << this.numQubits;
    var column;
    var index;
    for (var bit = 0; bit < this.numQubits; ++bit)
    {
        var mask = 1 << bit;
        if (mask & targetQubits)
        {
            if (mask & targetValues) /**** set it to clear the 0 bits ****/
                column = 0;
            else /**** set it tp clear the 1 bits ****/
                column = mask;
            while (column < vals)
            {
                for (var i = 0; i < mask; ++i)
                {
                    index = (column + i) * 2;
                    this.values[index] = 0;
                    this.values[index + 1] = 0;
                }
                column += mask * 2;
            }
        }
    }
    if (this.gpuBlock && webgl_blocks.side_by_side_checking)
        this.gpuBlock.side_by_side_check('SetZeroMask', this.values);
}

QReg.prototype.readAll = function ()
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        this.mergeMixedStates();
    }
    return this.read(this.allBitsMask);
}

// Zero ALL data (produces an invalid state)
QReg.prototype.setZero = function()
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.setZero();
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    this.storage.setZero();
}

// force_zero causes the read to return zero, regardless of probability.
// this is used for post-selection.
QReg.prototype.read = function (targetQubits, force_zero, force_one)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        this.mergeMixedStates();
    }
    if (targetQubits == null)	// this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;
    if (isAllZero(targetQubits))
//        return intToBitField(0);
        return 0;
    if (!this.active)
    {
       console.log("register needs to be activated!");
       return 0;
    }
    if (this.core_sim)
        return 0;

    if (this.chp && this.chp.active)
    {
        var low_targ = targetQubits.getLowestBitIndex();
        var high_targ = targetQubits.getHighestBitIndex();

        var result_bf = new BitField(0, this.numQubits);
        for (var targ = low_targ; targ <= high_targ; ++targ)
        {
            if (targetQubits.getBit(targ))
            {
                var bit = this.chp.measure(null, targ);
                if (bit & 1)
                    result_bf.setBit(targ, 1);
            }
        }
        this.changed();
        if (this.numQubits <= 32)
        {
            var result_int = bitFieldToInt(result_bf);
            result_bf.recycle();
            return result_int;
        }
        return result_bf;
    }

    if (this.disableSimulation)
    {
        var result = this.storage.read(targetQubits);
        this.changed();
        return result;
    }

    // TODO: Add bitfield support to the rest of this
    //       For now it's not needed, since we're full-sim, so the QC size will be <= 32 bits
    targetQubits = bitFieldToInt(targetQubits);
    var loop_required_targetQubits = targetQubits;
    var resultBits = 0;

    // If the classical bits are valid, we're done.
    if (!fullDebugChecking)
    {
        if ((this.classicalBitsValid & targetQubits) == targetQubits)
//            return intToBitField(this.classicalBits & targetQubits);
            return (this.classicalBits & targetQubits);

        // For anything we already know, just fill it in.
        resultBits |= this.classicalBits & this.classicalBitsValid;
        loop_required_targetQubits &= ~this.classicalBitsValid;
    }


    if (printSpeedMetrics)
    {
        var startTime = new Date().getTime();
        console.log('READ start...\n');
    }
    var vals = this.numValues;
    for (var i = 0; i < this.numQubits; ++i)
    {
        var mask = 1 << i;
        if (loop_required_targetQubits & mask)
        {
            var probability = this.peekQubitProbability(mask);
            var new_length = 1.0;
            if (probability > 0.0)
            {
                var rand = Math.random();
                // The "forcing" is done in such a way that the resulting
                // state will be valid, even if the postselection fails.

                if (force_zero)
                    rand = 1.0;
                else if (force_one)
                    rand = 0.0;

                if (rand <= probability)
                {
                    resultBits |= mask;
                    new_length = Math.sqrt(probability);
                }
                else
                {
                    new_length = Math.sqrt(1.0 - probability);
                }
            }
            this.storage.setZeroMask(mask, resultBits);
            // TODO: If I adjust peekProbability to handle non-normalized data, then I don't have to normalize each time.
            this.renormalize(new_length);
            if (this.current_mix)
            {
                for (var m = 0; m < this.mixed_states.length; ++m)
                {
                    var mix = this.mixed_states[m];
                    mix.reg.storage.setZeroMask(mask, resultBits);
                    mix.reg.renormalize(new_length);
                }
            }
        }
    }
    if (printSpeedMetrics)
    {
        var elapsedTimeMS = new Date().getTime() - startTime;
        console.log('READ op time: ' + (elapsedTimeMS / 1000.0) + ' seconds.\n');
    }

    if (fullDebugChecking)
    {
        if ((resultBits & this.classicalBitsValid) != (this.classicalBits & targetQubits & this.classicalBitsValid)) {
            console.log('============= Error: classical bit inconsistency. ========================');
            crash.here();
        }
    }

    // clear out the impossible values
    this.setClassicalBits(targetQubits, resultBits);

    this.changed();
    return this.classicalBits & targetQubits;
//    return intToBitField(this.classicalBits & targetQubits);
}

QReg.prototype.writeAll = function (newValues)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.writeAll(newValues);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    this.write(this.allBitsMask, newValues);
}

// to write, just read and then flip whatever bits don't match
QReg.prototype.write = function (targetQubits, newValues, photon_count)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.write(targetQubits, newValues);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    if (targetQubits == null)	// this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;
    if (photon_count == null)
        photon_count = 1;

    if (this.use_photon_sim)
    {
        this.photonSim.write(targetQubits, newValues, photon_count);
        return;
    }

    if (this.core_sim)
    {
        this.core_sim.op_write(targetQubits, newValues);
        return;
    }

    var bitsToFlip = intToBitField(this.read(targetQubits));
    bitsToFlip.xorEquals(newValues);
    bitsToFlip.andEquals(targetQubits);

    if (!bitsToFlip.isAllZero())
        this.not(bitsToFlip);
    bitsToFlip.recycle();
    this.changed();
}

// to postselect, just read with a forced value
QReg.prototype.postselect = function (targetQubits, value)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.postselect(targetQubits, value);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    if (targetQubits == null)   // this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;

    if (this.use_photon_sim)
    {
        this.photonSim.postselect(targetQubits, value);
        this.changed();
        return;
    }

    var force_zero = (value == 0);
    var force_one = (value == 1);
    this.read(targetQubits, force_zero, force_one);
    this.changed();
}

// to postselect, just read with a forced value
QReg.prototype.postselect_qubit_pair = function (targetQubits)
{
    // Handle mixed-state callthrough
    if (this.current_mix)
    {
        for (var m = 0; m < this.mixed_states.length; ++m)
        {
            var mix = this.mixed_states[m];
            mix.reg.postselect_qubit_pair(targetQubits);
        }
        this.mergeMixedStates();
        this.changed();
        return;
    }
    if (targetQubits == null)   // this allows a missing arg to just affect the whole reg
        targetQubits = this.allBitsMask;

    if (this.use_photon_sim)
    {
        this.photonSim.postselect_qubit_pair(targetQubits);
        this.changed();
        return;
    }

    var low = targetQubits.getLowestBitIndex();
    var high = targetQubits.getHighestBitIndex();
    var mask = (1 << low) | (1 << high);
    // TODO: Add bitfield support to the rest of this
    //       For now it's not needed, since we're full-sim, so the QC size will be <= 32 bits
    targetQubits = bitFieldToInt(targetQubits);

    for (var value = 0; value < this.numValues; ++value)
    {
        if ((value & mask) == 0 || (value & mask) == mask)
            this.pokeComplexValue(value, 0, 0);
    }
    this.renormalize();
    this.changed();
}

QReg.prototype.totalLengthSquared = function ()
{
    return this.storage.totalLengthSquared();
}

QRegNode.prototype.totalLengthSquared = function ()
{
    return this.tree[0].totalLengthSquared() +
           this.tree[1].totalLengthSquared();
}

QBlock.prototype.totalLengthSquared = function ()
{
    if (this.gpuBlock)
    {
        // Note that peek_probability on targetBit 0 just returns the length^2 of the whole vector
        var gpu_lengthSquared = this.gpuBlock.peek_probability(0);
        if (!webgl_blocks.side_by_side_checking)
            return gpu_lengthSquared;
    }
    var lengthSquared = 0;
    var vals = 1 << this.numQubits;
    var x;
    vals *= 2; // for real/imag
    for (var i = 0; i < vals; ++i)
    {
        x = this.values[i];
        lengthSquared += x * x;
    }
    if (this.gpuBlock && webgl_blocks.side_by_side_checking)
        this.gpuBlock.side_by_side_check('totalLengthSquared', null, gpu_lengthSquared, lengthSquared);
    return lengthSquared;
}

QReg.prototype.peekQubitProbability = function (targetQubit)
{
    if (this.core_sim)
        return 0;
    var probability = this.storage.peekQubitProbability(targetQubit);
//    console.log("probability " + targetQubit + " = " + probability);
    return probability;
}

QRegNode.prototype.peekQubitProbability = function (targetQubit)
{
    if (targetQubit == this.bitValue)
        return this.tree[1].totalLengthSquared();
    else
        return this.tree[0].peekQubitProbability(targetQubit) +
               this.tree[1].peekQubitProbability(targetQubit);
}

QBlock.prototype.peekQubitProbability = function (targetQubit)
{
    var probability = 0;
    var vals = 1 << this.numQubits;
    var x, y;
    var column = 0;
    var index;

    if (this.gpuBlock)
    {
        var gpu_probability = this.gpuBlock.peek_probability(targetQubit);
        if (!webgl_blocks.side_by_side_checking)
            return gpu_probability;
    }

    for (var i = targetQubit; i < vals; i += targetQubit * 2)
    {
        column += targetQubit;
        for (var j = 0; j < targetQubit; ++j)
        {
            index = column * 2;
            x = this.values[index];
            y = this.values[index + 1];
            probability += x * x + y * y;
            column++;
        }
    }
    if (this.gpuBlock && webgl_blocks.side_by_side_checking)
        this.gpuBlock.side_by_side_check('peekProbability', null, gpu_probability, probability);
    return probability;
}

QReg.prototype.printState = function(message, start, count)
{
    if (message == null)
        message = '';
    if (start == null)
        start = 0;
    if (count == null)
        count = 1 << this.numQubits;
    var str = 'QReg: ' + message + ' ';
    for (var i = start; i < count; ++i)
    {
        var val = this.peekComplexValue(i);
        if (val.x != 0 || val.y != 0)
            str += '|' + i + '> = ' + val.x.toFixed(6) + ',' + val.y.toFixed(6) + ' ';
    }
    qc.print(str);
    console.log(str);
}

QReg.prototype.printStateToString = function(message, start, count)
{
    if (message == null)
        message = '';
    if (start == null)
        start = 0;
    if (count == null)
        count = 1 << this.numQubits;
    var str = 'QReg: ' + message + '\n';
    for (var i = start; i < count; ++i)
    {
        var val = this.peekComplexValue(i);
        if (val.x != 0 || val.y != 0)
            str += '|' + i + '> = ' + val.x.toFixed(6) + ',' + val.y.toFixed(6) + '\n';
    }
    return str;
}

QReg.prototype.pull_state = function ()
{
    var out_array;
    if (this.doublePrecision)
        out_array = new Float64Array(new ArrayBuffer(2 * this.numValues * this.bytesPerFloat));
    else
        out_array = new Float32Array(new ArrayBuffer(2 * this.numValues * this.bytesPerFloat));
    for (var i = 0; i < this.numValues; ++i)
    {
        var value = this.storage.peekComplexValue(i);
        out_array[i * 2] = value.x;
        out_array[i * 2 + 1] = value.y;
    }
    return out_array;
}

QReg.prototype.push_state = function (new_values, normalize)
{
    if (normalize == null)
        normalize = true;
    var expected_terms = this.numValues;
    var actual_terms = new_values.length;
    if (actual_terms == expected_terms)
    {
        if (new_values[0].length == 2)
        {
            // These are in the form [[re, im], [re, im], ...]
            for (var i = 0; i < this.numValues; ++i)
                this.storage.pokeComplexValue(i, new_values[i][0], new_values[i][1]);
        }
        else
        {
            // These are in the form [re, re, re, re, ...]
            for (var i = 0; i < this.numValues; ++i)
                this.storage.pokeComplexValue(i, new_values[i], 0);
        }
    }
    if (actual_terms == 2 * expected_terms)
    {
        // These are in the form [re, im, re, im, ...]
        for (var i = 0; i < this.numValues; ++i)
            this.storage.pokeComplexValue(i, new_values[i * 2], new_values[i * 2 + 1]);
    }
    if (normalize)
        this.renormalize();
}

QReg.prototype.check_state = function (check_values, epsilon)
{
    if (epsilon == null)
        epsilon = 0.000001;
    var expected_terms = this.numValues;
    var actual_terms = check_values.length;
    if (actual_terms == expected_terms)
    {
        if (check_values[0].length == 2)
        {
            // These are in the form [[re, im], [re, im], ...]
            for (var i = 0; i < this.numValues; ++i)
            {
                var value = this.storage.peekComplexValue(i);
                var x = check_values[i][0];
                var y = check_values[i][1];
                if (Math.abs(value.x - x) > epsilon || Math.abs(value.y - y) > epsilon)
                    return false;
            }
        }
        else
        {
            // These are in the form [re, re, re, re, ...]
            for (var i = 0; i < this.numValues; ++i)
            {
                var value = this.storage.peekComplexValue(i);
                var x = check_values[i];
                var y = 0.0;
                if (Math.abs(value.x - x) > epsilon || Math.abs(value.y - y) > epsilon)
                    return false;
            }
        }
    }
    if (actual_terms == 2 * expected_terms)
    {
        // These are in the form [re, im, re, im, ...]
        for (var i = 0; i < this.numValues; ++i)
        {
            var value = this.storage.peekComplexValue(i);
            var x = check_values[i * 2];
            var y = check_values[i * 2 + 1];
            if (Math.abs(value.x - x) > epsilon || Math.abs(value.y - y) > epsilon)
                return false;
        }
    }
    return true;
}


QReg.prototype.print_state_vector_to_string = function (line, min_value_to_print, max_num_values)
{
    // Default values (some browsers don't accept them in the declaration)
    if (line == null)
        line = -1;
    if (min_value_to_print == null)
        min_value_to_print = 0.000000001;
    if (max_num_values == null)
        max_num_values = 1000;
    var output = "";
    if (line >= 0)
        output += 'State vector at line '+line+':\n';
    else
        output += 'State vector:\n';
    var num_values_printed = 0;
    for (var i = 0; i < this.numValues; ++i)
    {
        var value = this.storage.peekComplexValue(i);
        if (min_value_to_print <= 0.0 || Math.abs(value.x) >= min_value_to_print || Math.abs(value.y) >= min_value_to_print)
        {
            output += '|'+i+'&rangle; ('+value.x+', '+value.y+')\n';
            num_values_printed++;
            if (num_values_printed > max_num_values)
            {
                output += '...output truncated to '+max_num_values+' values.\n';
                break;                
            }
        }
    }
    return output;
}


// WARNING: This makes a complete copy of the probabilities for all values.
// With a large number of qubits, this will fail, or at least be very slow.
QReg.prototype.copyAllProbabilities = function ()
{
    var out_array;
    if (this.doublePrecision)
        out_array = new Float64Array(new ArrayBuffer(this.numValues * this.bytesPerFloat));
    else
        out_array = new Float32Array(new ArrayBuffer(this.numValues * this.bytesPerFloat));
    for (var i = 0; i < this.numValues; ++i)
    {
        var value = this.storage.peekComplexValue(i);
        out_array[i] = value.x * value.x + value.y * value.y;
    }
    return out_array;
}

QReg.prototype.pokeAllProbabilities = function (new_probabilities)
{
    for (var i = 0; i < this.numValues; ++i)
        this.storage.pokeComplexValue(i, Math.sqrt(new_probabilities[i]), 0);
//        this.storage.pokeComplexValue(i, new_probabilities[i], new_probabilities[i]);
}

QReg.prototype.peekComplexValue = function (targetValue)
{
    // If any valid classical bits disagree with the target, then the value must be zero.
    if ((this.classicalBits & this.classicalBitsValid)
        != (targetValue & this.classicalBitsValid))
        return new Vec2(0,0);

    var value = this.storage.peekComplexValue(targetValue);
//    console.log("peekValue " + targetValue + " = " + value);
    return value;
}

QRegNode.prototype.peekComplexValue = function (targetValue)
{
    if (targetValue & this.bitValue)
        return this.tree[1].peekComplexValue(targetValue & this.kidMask);
    else
        return this.tree[0].peekComplexValue(targetValue & this.kidMask);
}

QBlock.prototype.peekComplexValue = function (targetValue)
{
    if (this.gpuBlock)
    {
        var gpu_value = this.gpuBlock.peek_complex_value(targetValue);
        if (!webgl_blocks.side_by_side_checking)
            return gpu_value;
    }
    var index = targetValue * 2;
    if (!this.values)
        return 0;
    value = new Vec2(this.values[index], this.values[index + 1]);
    if (this.gpuBlock && webgl_blocks.side_by_side_checking)
    {
        this.gpuBlock.side_by_side_check('peekComplexValue.x', null, gpu_value.x, value.x);
        this.gpuBlock.side_by_side_check('peekComplexValue.y', null, gpu_value.y, value.y);
    }
    return value;
}

QReg.prototype.peekMagnitude = function (targetValue)
{
    // If any valid classical bits disagree with the target, then the value must be zero.
    if ((this.classicalBits & this.classicalBitsValid)
        != (targetValue & this.classicalBitsValid))
        return 0;

    var value = this.storage.peekMagnitude(targetValue);
    return value;
}

QRegNode.prototype.peekMagnitude = function (targetValue)
{
    if (targetValue & this.bitValue)
        return this.tree[1].peekMagnitude(targetValue & this.kidMask);
    else
        return this.tree[0].peekMagnitude(targetValue & this.kidMask);
}

QBlock.prototype.peekMagnitude = function (targetValue)
{
    if (this.gpuBlock)
    {
        var gval = this.gpuBlock.peek_complex_value(targetValue);
        var gpu_value = gval.x * gval.x + gval.y * gval.y;
        if (!webgl_blocks.side_by_side_checking)
            return gpu_value;
    }
    var index = targetValue * 2;
    var x = this.values[index];
    var y = this.values[index + 1];
    var value = x * x + y * y;
    if (this.gpuBlock && webgl_blocks.side_by_side_checking)
    {
        this.gpuBlock.side_by_side_check('peekMagnitude', null, gpu_value, value);
    }
    return value;
}

QReg.prototype.pokeComplexValue = function (targetValue, x, y)
{
    this.classicalBitsValid = 0;
    this.storage.pokeComplexValue(targetValue, x, y);
}

QRegNode.prototype.pokeComplexValue = function (targetValue, x, y)
{
    if (targetValue & this.bitValue)
        this.tree[1].pokeComplexValue(targetValue & this.kidMask, x, y);
    else
        this.tree[0].pokeComplexValue(targetValue & this.kidMask, x, y);
}

QBlock.prototype.pokeComplexValue = function (targetValue, x, y)
{
    var index = targetValue * 2;
    this.values[index] = x;
    this.values[index + 1] = y;
    if (this.gpuBlock && webgl_blocks.side_by_side_checking)
        this.gpuBlock.side_by_side_check('pokeComplexValue', this.values);
}

// If the length is known, it can be passed in to save time.
QReg.prototype.renormalize = function (length)
{
// TODO: We're ALWAYS going to renormalize after a read and maskZero, so might as well combine those ops.
//       Or even better, use the length^2 from the probability to determine the length of what's left,
//       and scale those while zeroing out.
// Also, we KNOW we only need to scale half the values, at most.
    if (this.use_photon_sim)
    {
        this.photonSim.renormalize();
    }
    if (length == null)
        length = Math.sqrt(this.storage.totalLengthSquared());
    if (length == 0)
        this.storage.initialize(0);
    else if (length != 1.0)
        this.storage.scaleValues(1.0 / length);
}


