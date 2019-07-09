/////////////////////////////////////////////////////////////////////////////
// qcengine_int.js
// Copyright 2000-2011 Eric Johnston
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
// The QInt class simulates multi-qubit signed and unsigned integers.
//   numBits  the integer size in bits (any positive integer)
//   qReg     the QReg to use for storage. This may be active or inactive.

function make_sub_int(parent, name, sub_start, num_bits)
{
   var new_qint = new QInt(num_bits, parent.qReg, name);

   new_qint.startBit = parent.startBit + sub_start;
   new_qint.baseMask = 0;
   for (var i = 0; i < new_qint.numBits; ++i)
       new_qint.baseMask |= 1 << i;
   new_qint.maskBF = newShiftedMask(new_qint.baseMask, new_qint.startBit);
   new_qint.valid = true;
   return new_qint;
}

function Qubits(numBits, name, qReg)
{
    // Arg flexibility: allow qreg to be passed in name slot
    if (qReg == null && name && name.qReg)
    {
        qReg = name;
        name = null;
    }

    if (numBits == 0)
        return null;
 
    numBits = 0|numBits;
    this.valid = false;            // true if this int is ready to use
    this.numBits = numBits;        // the number of bits in this integer

    // Accept either "qc" or "qc.qReg" here
    if (qReg.qReg)
    {
        this.qpu = qReg;
        qReg = qReg.qReg;
    }

    // Handle the case where no name is passed in
    this.auto_name_prefix = 'q';
    if (this.qpu && !name)
        name = this.auto_name_prefix + this.qpu.next_qint_serial_number();

    this.qReg = qReg;
    this.isUtil = false;
    if (name == '(util)')
    {
        this.isUtil = true;
        qReg.utilityInts.push(this);
    }
    qReg.qInts.push(this);
    this.name = name;
    this.isUtil = false;
    this.isQInt = true;

    //
    // methods
    //

    // reserve() is called to reserve the qubits for this int.
    // This is called automatically on construction.
    this.reserve = function ()
    {
        if (!this.valid)
        {
            this.startBit = qReg.reserveBits(this.numBits);
            if (this.startBit >= 0)
            {
                this.baseMask = 0;
                for (var i = 0; i < this.numBits; ++i)
                    this.baseMask |= 1 << i;
                this.maskBF = newShiftedMask(this.baseMask, this.startBit);
                this.valid = true;
            }
        }
        this.qReg.qIntsChanged();
    }


    // release() is called to give up the qubits allocated to this int.
    this.release = function ()
    {
        if (this.valid)
        {
            this.valid = false;
            this.qReg.releaseBits(this.numBits, this.startBit);
        }
    }

    this.getValueProbability = function (value)
    {
        if (this.valid)
        {
            var regValue = value << this.startBit;
            var qx = this.qReg.vector[0][regValue];
            var qy = this.qReg.vector[1][regValue];
            return qx * qx + qy * qy;
        }
        return 0;
    }

    this.getValuePhaseRadians = function (value)
    {
        if (this.valid)
        {
            var regValue = value << this.startBit;
            var qx = this.qReg.vector[0][regValue];
            var qy = this.qReg.vector[1][regValue];
            return Math.atan2(qy, qx);
        }
        return 0;
    }

    this.peekComplexValue = function (value)
    {
        if (this.valid)
        {
            var regValue = value << this.startBit;
            return this.qReg.peekComplexValue(regValue);
        }
        return 0;
    }

    this.peekProbability = function (value, cval_array)
    {
        if (this.valid)
        {
            var regValue = value << this.startBit;
            var bitsBelow = this.startBit;
            var bitsAbove = this.qReg.numQubits - (this.startBit + this.numBits);
            var probability = 0;
            for (below = 0; below < 1 << bitsBelow; ++below)
            {
                for (above = 0; above < 1 << bitsAbove; ++above)
                {
                    var checkValue = regValue | below | (above << (this.startBit + this.numBits));
                    var complexValue = this.qReg.peekComplexValue(checkValue);
                    var prob = complexValue.x * complexValue.x + complexValue.y * complexValue.y;
                    probability += prob;
                    if (cval_array && prob > 0.000001)
                        cval_array.push(complexValue);
                }
            }
            return probability;
        }
        return 0;
    }

    this.printProbabilities = function(message, start, count)
    {
        if (message == null)
            message = '';
        if (start == null)
            start = 0;
        if (count == null)
            count = 1 << this.numBits;
        var str = '' + this.name + ': ' + message + ' ';
        for (var i = start; i < count; ++i)
        {
            var val = this.peekProbability(i);
            if (val != 0)
                str += '[' + i + ']=' + val.toFixed(6) + ' ';
        }
        console.log(str);
    }

    this.peekHighestProbability = function(start, count)
    {
        if (start == null)
            start = 0;
        if (count == null)
            count = 1 << this.numBits;

        var best_val = start;
        var best_prob = 0;
        for (var i = start; i < count; ++i)
        {
            var prob = this.peekProbability(i);
            if (prob > best_prob)
            {
                best_prob = prob;
                best_val = i;
            }
        }
        return best_val;
    }

    // NOTE: this does a cnot between corresponding qubits in the qint.
    // It's useful for expanding programs to larger bytes.
    // Two qints of any size can be swapped with three of these.
    this.cnot_core = function (op, conditionInt, targ_mask, extraConditionBits, extraNOTConditionBits)
    {
        // Special simple common syntax
        if (conditionInt && !is_qint(conditionInt))
        {
            // In this case, it's myint.cnot(target, cond)
            extraConditionBits = this.bits(targ_mask);
            targ_mask = conditionInt;
            conditionInt = null;
        }
        var anim = this.qReg.animateWidgets;

        if (extraNOTConditionBits)
        {
            if (anim)
                this.qReg.staff.addInstructionAfterInsertionPoint('not', extraNOTConditionBits, 0, 0);
            else
                this.qReg.not(extraNOTConditionBits);
        }

        var condition = NewBitField(0, this.qReg.numQubits);
        var baseTarget = (targ_mask == null) ? this.baseMask : this.baseMask & targ_mask;
        if (!conditionInt)
        {
            condition.set(0);
            condition.orEquals(extraConditionBits);
            condition.orEquals(extraNOTConditionBits);
            var bt = qintMask([this, baseTarget]);
            if (anim)
                this.qReg.staff.addInstructionAfterInsertionPoint('cnot', bt, condition, 0);
            else
                this.qReg.cnot(bt, condition);
            bt.recycle();
        }
        else
        {
            var target = NewBitField(0, this.qReg.numQubits);
            var bits = this.numBits;
            if (conditionInt && conditionInt.numBits < bits)
                bits = conditionInt.numBits;
            for (var i = 0; i < bits; ++i)
            {
                if (baseTarget & (1 << i))
                {
                    target.set(0);
                    target.setBits(i + this.startBit, 1, 1);
                    condition.set(0);
                    if (conditionInt)
                        condition.setBits(i + conditionInt.startBit, 1, 1);
                    condition.orEquals(extraConditionBits);
                    condition.orEquals(extraNOTConditionBits);
    //TODO1                conditionMask |= extraConditionBits | extraNOTConditionBits;
           //         this.qReg.cnot(targetMask, conditionMask);
                    if (anim)
                        this.qReg.staff.addInstructionAfterInsertionPoint(op, target, condition, 0);
                    else
                    {
                        if (op == 'cnot')
                            this.qReg.cnot(target, condition);
                        else if (op == 'crootnot')
                            this.qReg.crootnot(target, condition);
                        else if (op == 'crootnot_inv')
                            this.qReg.crootnot_inv(target, condition);
                    }
                }
            }
            target.recycle();
        }
        condition.recycle();
        if (extraNOTConditionBits)
        {
            if (anim)
                this.qReg.staff.addInstructionAfterInsertionPoint('not', extraNOTConditionBits, 0, 0);
            else
                this.qReg.not(extraNOTConditionBits);
        }
    }

    this.not = function (mask)
        { this.cnot_core('cnot', null, mask, null, null); }
    this.cnot = function (conditionInt, mask, extraConditionBits, extraNOTConditionBits)
        { this.cnot_core('cnot', conditionInt, mask, extraConditionBits, extraNOTConditionBits); }
    this.rootnot = function (mask)
        { this.cnot_core('crootnot', null, mask, null, null); }
    this.crootnot = function (conditionInt, mask, extraConditionBits, extraNOTConditionBits)
        { this.cnot_core('crootnot', conditionInt, mask, extraConditionBits, extraNOTConditionBits); }
    this.rootnot_inv = function (mask)
        { this.cnot_core('crootnot_inv', null, mask, null, null); }
    this.crootnot_inv = function (conditionInt, mask, extraConditionBits, extraNOTConditionBits)
        { this.cnot_core('crootnot_inv', conditionInt, mask, extraConditionBits, extraNOTConditionBits); }

    this.rootx = function (mask)
        { this.cnot_core('crootnot', null, mask, null, null); }
    this.crootx = function (conditionInt, mask, extraConditionBits, extraNOTConditionBits)
        { this.cnot_core('crootnot', conditionInt, mask, extraConditionBits, extraNOTConditionBits); }
    this.rootx_inv = function (mask)
        { this.cnot_core('crootnot_inv', null, mask, null, null); }
    this.crootx_inv = function (conditionInt, mask, extraConditionBits, extraNOTConditionBits)
        { this.cnot_core('crootnot_inv', conditionInt, mask, extraConditionBits, extraNOTConditionBits); }

    this.exchange_core = function (op, swapInt, baseMask, extraConditionBits, extraNOTConditionBits)
    {
        // convert any qint extra cond args to bitfields
        if (extraConditionBits && extraConditionBits.isQInt)
            extraConditionBits = extraConditionBits.maskBF;
        if (extraNOTConditionBits && extraNOTConditionBits.isQInt)
            extraNOTConditionBits = extraNOTConditionBits.maskBF;

        if (extraNOTConditionBits)
            this.qReg.staff.addInstructionAfterInsertionPoint('not', extraNOTConditionBits, 0, 0);
        if (baseMask == null) // null is different from zero! It means no value was passed.
            baseMask = this.baseMask;

        var conditionMask = 0;
        if (!(isAllZero(extraConditionBits) && isAllZero(extraNOTConditionBits)))
        {
            if (conditionMask)
            {
                conditionMask = NewBitField(extraConditionBits);
                conditionMask.orEquals(extraNOTConditionBits);
            }
            else
            {
                conditionMask = NewBitField(extraNOTConditionBits);
                conditionMask.orEquals(extraConditionBits);
            }
        }
        var bits = this.numBits;

        targetBits = NewBitField(0, this.qReg.numQubits);

        if (swapInt == null || swapInt == this)
        {
            targetBits.set(0);
            for (var i = 0; i < bits; ++i)
            {
                if (baseMask & (1 << i))
                {
                    targetBits.setBit(i + this.startBit, 1);
                }
            }
            this.qReg.staff.addInstructionAfterInsertionPoint(op, targetBits, conditionMask, 0);
        }
        else
        {
            if (swapInt.numBits < bits)
                bits = swapInt.numBits;
            for (var i = 0; i < bits; ++i)
            {
                if (baseMask & (1 << i))
                {
                    targetBits.set(0);
                    targetBits.setBit(i + this.startBit, 1);
                    targetBits.setBit(i + swapInt.startBit, 1);
                    this.qReg.staff.addInstructionAfterInsertionPoint(op, targetBits, conditionMask, 0);
                }
            }
        }
        if (extraNOTConditionBits)
            this.qReg.staff.addInstructionAfterInsertionPoint('not', extraNOTConditionBits, 0, 0);
    }

    this.exchange = function (swapInt, baseMask, extraConditionBits, extraNOTConditionBits)
    {
        this.exchange_core('exchange', swapInt, baseMask, extraConditionBits, extraNOTConditionBits);
    }
    this.swap = this.exchange;
    this.cswap = this.exchange;

    this.rootexchange = function (swapInt, baseMask, extraConditionBits, extraNOTConditionBits)
    {
        this.exchange_core('rootexchange', swapInt, baseMask, extraConditionBits, extraNOTConditionBits);
    }

    this.rootexchange_inv = function (swapInt, baseMask, extraConditionBits, extraNOTConditionBits)
    {
        this.exchange_core('rootexchange_inv', swapInt, baseMask, extraConditionBits, extraNOTConditionBits);
    }

    this.y = function (mask, extraConditionBits)
        { this.qpu.y(this.mask(mask)) }
    this.cy = this.y;

    this.hadamard = function (mask, extraConditionBits)
    {
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var target = newShiftedMask(baseTarget, this.startBit);
        this.qReg.staff.addInstructionAfterInsertionPoint('hadamard', target, extraConditionBits);
    }
    this.had = this.hadamard; // more convenient

    this.chadamard = function (conditionInt, mask, extraConditionBits, extraNOTConditionBits)
    {
        if (extraNOTConditionBits)
            this.qReg.staff.addInstructionAfterInsertionPoint('not', extraNOTConditionBits, 0, 0);

        var condition = NewBitField(0, this.qReg.numQubits);
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        if (!conditionInt)
        {
            condition.set(0);
            condition.orEquals(extraConditionBits);
            condition.orEquals(extraNOTConditionBits);
            var bt = qintMask([this, baseTarget]);
            this.qReg.staff.addInstructionAfterInsertionPoint('chadamard', bt, condition, 0);
            bt.recycle();
        }
        else
        {
            var target = NewBitField(0, this.qReg.numQubits);
            var bits = this.numBits;
            if (conditionInt && conditionInt.numBits < bits)
                bits = conditionInt.numBits;
            for (var i = 0; i < bits; ++i)
            {
                if (baseTarget & (1 << i))
                {
                    target.set(0);
                    target.setBits(i + this.startBit, 1, 1);
                    condition.set(0);
                    if (conditionInt)
                        condition.setBits(i + conditionInt.startBit, 1, 1);
                    condition.orEquals(extraConditionBits);
                    condition.orEquals(extraNOTConditionBits);
    //TODO1                conditionMask |= extraConditionBits | extraNOTConditionBits;
           //         this.qReg.cnot(targetMask, conditionMask);
                    this.qReg.staff.addInstructionAfterInsertionPoint('chadamard', target, condition, 0);
                }
            }
        }
        if (extraNOTConditionBits)
            this.qReg.staff.addInstructionAfterInsertionPoint('not', extraNOTConditionBits, 0, 0);
    }
    this.chad = this.chadamard; // more convenient

    this.beamsplitter = function (reflectivity, mask)
    {
        if (reflectivity == null)
            reflectivity = 0.5;
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var target = newShiftedMask(baseTarget, this.startBit);
        this.qReg.staff.addInstructionAfterInsertionPoint('optical_beamsplitter', target, null, reflectivity);
    }

    this.dual_rail_beamsplitter = function (reflectivity, mask)
    {
        if (reflectivity == null)
            reflectivity = 0.5;
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var target = newShiftedMask(baseTarget, this.startBit);
        this.qReg.staff.addInstructionAfterInsertionPoint('dual_rail_beamsplitter', target, null, reflectivity);
    }

    this.pbs = function (hoiz_vert, mask)
    {
        if (reflectivity == null)
            reflectivity = 0.5;
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var target = newShiftedMask(baseTarget, this.startBit);
        this.qReg.staff.addInstructionAfterInsertionPoint('pbs', target, null, horiz_vert);
    }

    this.postselect_qubit_pair = function (mask)
    {
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var target = null;

        // If the arg is a qint, then make pair qubits between them
        if (mask && mask.isQInt)
        {
            target = newShiftedMask(1, this.startBit);
            target.setBit(mask.startBit, 1);
        }
        else
            target = newShiftedMask(baseTarget, this.startBit);

        this.qReg.staff.addInstructionAfterInsertionPoint('postselect_qubit_pair', target);
    }

    this.pair_source = function (mask)
    {
        // If the arg is a qint, then make pair sources between corresponding bits
        if (mask.isQInt)
            return this.cnot_core('pair_source', mask, null, null, null);

        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var target = newShiftedMask(baseTarget, this.startBit);
        this.qReg.staff.addInstructionAfterInsertionPoint('pair_source', target, null, 0);
    }

    this.polarization_grating_in = function (mask, theta)
    {
        if (theta == null)
            theta = 0.0;
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var target = newShiftedMask(baseTarget, this.startBit);
        this.qReg.staff.addInstructionAfterInsertionPoint('polarization_grating_in', target, null, theta);
    }

    this.polarization_grating_out = function (mask, theta)
    {
        if (theta == null)
            theta = 0.0;
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var target = newShiftedMask(baseTarget, this.startBit);
        this.qReg.staff.addInstructionAfterInsertionPoint('polarization_grating_out', target, null, theta);
    }

    this.phase = function (thetaDegrees, targetMask, conditionMask, extraConditionBits, extraNOTConditionBits)
    {
        // convert any qint extra cond args to bitfields
        if (extraConditionBits && extraConditionBits.isQInt)
            extraConditionBits = extraConditionBits.maskBF;
        if (extraNOTConditionBits && extraNOTConditionBits.isQInt)
            extraNOTConditionBits = extraNOTConditionBits.maskBF;

        var baseTarget = (targetMask == null) ? this.baseMask : this.baseMask & targetMask;
        var baseCondition = (conditionMask == null) ? 0 : this.baseMask & conditionMask;
        var target = newShiftedMask(baseTarget, this.startBit);
        var condition = newShiftedMask(baseCondition, this.startBit);
        if (extraNOTConditionBits)
            this.qReg.staff.addInstructionAfterInsertionPoint('not', extraNOTConditionBits, 0, 0);
        condition.orEquals(extraConditionBits);
        condition.orEquals(extraNOTConditionBits);
        this.qReg.staff.addInstructionAfterInsertionPoint('phase', target, condition, thetaDegrees);
        if (extraNOTConditionBits)
            this.qReg.staff.addInstructionAfterInsertionPoint('not', extraNOTConditionBits, 0, 0);
    }


    this.cphase_intarg = function (thetaDegrees, condInt, targetMask, extraConditionBits, extraNOTConditionBits)
    {
        // convert any qint extra cond args to bitfields
        if (extraConditionBits && extraConditionBits.isQInt)
            extraConditionBits = extraConditionBits.maskBF;
        if (extraNOTConditionBits && extraNOTConditionBits.isQInt)
            extraNOTConditionBits = extraNOTConditionBits.maskBF;

        var baseTarget = (targetMask == null) ? this.baseMask : this.baseMask & targetMask;
        var baseCondition = baseTarget & condInt.baseMask;
        baseTarget &= baseCondition;
        var targ_hi = getHighestBitIndex(baseTarget);
        var targ_lo = getLowestBitIndex(baseTarget);
        if (targ_lo != targ_hi)
        {
            // If we have multiple target qubits, run them as separate ops
            for (var targ_bit = targ_lo; targ_bit <= targ_hi; ++targ_bit)
            {
                var tmask = 1 << targ_bit;
                if (baseTarget & tmask)
                    this.cphase(thetaDegrees, condInt, tmask, extraConditionBits, extraNOTConditionBits);
            }
            return;
        }
        var target = newShiftedMask(baseTarget, this.startBit);
        var condition = newShiftedMask(baseCondition, condInt.startBit);
        if (extraNOTConditionBits)
            this.qReg.staff.addInstructionAfterInsertionPoint('not', extraNOTConditionBits, 0, 0);
        condition.orEquals(extraConditionBits);
        condition.orEquals(extraNOTConditionBits);
        this.qReg.staff.addInstructionAfterInsertionPoint('phase', target, condition, thetaDegrees);
        if (extraNOTConditionBits)
            this.qReg.staff.addInstructionAfterInsertionPoint('not', extraNOTConditionBits, 0, 0);
    }

    // TODO: Should these two be allowed to take int args like cx?
    this.cphase = function (thetaDegrees, condition_int, target_mask, extraConditionBits)
    {
        if (is_qint(condition_int)) 
        {
            if (target_mask == null)
                target_mask = ~0;
            // If the first arg is an int, then cphase the corresponding qubits of both ints
            for (var bit_index = 0; bit_index < this.numBits && bit_index < condition_int.numBits; ++bit_index)
            {
                var bit = 1 << bit_index;
                if (bit & target_mask)
                    this.qpu.phase(thetaDegrees, this.bits(bit), condition_int.bits(bit, extraConditionBits));
            }
        }
        else
        {
            // Otherwise, treat the mask as local to this qint 
            extraConditionBits = target_mask;
            target_mask = condition_int;
            if (target_mask == null)
                target_mask = ~0;
            this.qpu.cphase(thetaDegrees, this.bits(target_mask, extraConditionBits));
        }
    }
    this.cz = function (condition_int, target_mask, extraConditionBits)
    {
        this.cphase(180, condition_int, target_mask, extraConditionBits);
    }

    this.x = function (targetMask, conditionMask, extraConditionBits, extraNOTConditionBits)
    {
        this.not(targetMask, conditionMask, extraConditionBits, extraNOTConditionBits);
    }
    this.cx = function (targetMask, conditionMask, extraConditionBits, extraNOTConditionBits)
    {
        this.cnot(targetMask, conditionMask, extraConditionBits, extraNOTConditionBits);
    }

    this.z = function (targetMask, conditionMask, extraConditionBits, extraNOTConditionBits)
    {
        this.phase(180, targetMask, conditionMask, extraConditionBits, extraNOTConditionBits);
    }
    this.s = function (targetMask, conditionMask, extraConditionBits, extraNOTConditionBits)
    {
        this.phase(90, targetMask, conditionMask, extraConditionBits, extraNOTConditionBits);
    }
    this.t = function (targetMask, conditionMask, extraConditionBits, extraNOTConditionBits)
    {
        this.phase(45, targetMask, conditionMask, extraConditionBits, extraNOTConditionBits);
    }
    this.s_inv = function (targetMask, conditionMask, extraConditionBits, extraNOTConditionBits)
    {
        this.phase(-90, targetMask, conditionMask, extraConditionBits, extraNOTConditionBits);
    }
    this.t_inv = function (targetMask, conditionMask, extraConditionBits, extraNOTConditionBits)
    {
        this.phase(-45, targetMask, conditionMask, extraConditionBits, extraNOTConditionBits);
    }

    this.cs = function (condInt, targetMask, extraConditionBits, extraNOTConditionBits)
    {
        this.cphase_intarg(90, condInt, targetMask, extraConditionBits, extraNOTConditionBits);
    }
    this.ct = function (condInt, targetMask, extraConditionBits, extraNOTConditionBits)
    {
        this.cphase_intarg(45, condInt, targetMask, extraConditionBits, extraNOTConditionBits);
    }
    this.cs_inv = function (condInt, targetMask, extraConditionBits, extraNOTConditionBits)
    {
        this.cphase_intarg(-90, condInt, targetMask, extraConditionBits, extraNOTConditionBits);
    }
    this.ct_inv = function (condInt, targetMask, extraConditionBits, extraNOTConditionBits)
    {
        this.cphase_intarg(-45, condInt, targetMask, extraConditionBits, extraNOTConditionBits);
    }


/*
    this.rootnot = function (mask)
    {
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var target = newShiftedMask(baseTarget, this.startBit);
        this.qReg.staff.addInstructionAfterInsertionPoint('rootnot', target, 0, 0);
    }

    this.rootnot_inv = function (mask)
    {
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var target = newShiftedMask(baseTarget, this.startBit);
        this.qReg.staff.addInstructionAfterInsertionPoint('rootnot_inv', target, 0, 0);
    }
*/
    this.rotatex = function (thetaDegrees, mask, cond)
    {
        if (mask && mask.isQInt)
        {
            // Special syntax similar to cnot, arg is another int
            // TODO: replace this with CNOT core
            cond = mask.maskBF;
            mask = null;
        }
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var target = newShiftedMask(baseTarget, this.startBit);
        this.qpu.rx(thetaDegrees, target, cond);
    }

    this.rotatey = function (thetaDegrees, mask, cond)
    {
        if (mask && mask.isQInt)
        {
            // Special syntax similar to cnot, arg is another int
            // TODO: replace this with CNOT core
            cond = mask.maskBF;
            mask = null;
        }
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var target = newShiftedMask(baseTarget, this.startBit);
        this.qpu.ry(thetaDegrees, target, cond);
    }

    this.rotatez = function (thetaDegrees, mask, cond)
    {
        if (mask && mask.isQInt)
        {
            // Special syntax similar to cnot, arg is another int
            // TODO: replace this with CNOT core
            cond = mask.maskBF;
        }
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var target = newShiftedMask(baseTarget, this.startBit);
        target.orEquals(cond);
        this.qpu.rz(thetaDegrees, target, cond);
    }

    this.rotate = this.rotatex;
    this.rotx = this.rotatex;
    this.roty = this.rotatey;
    this.rotz = this.rotatez;
    this.rx = this.rotatex;
    this.ry = this.rotatey;
    this.rz = this.rotatez;
    this.crx = this.rotatex;
    this.cry = this.rotatey;
    this.crz = this.rotatez;
    this.crotatex = this.rotatex;
    this.crotatey = this.rotatey;
    this.crotatez = this.rotatez;

    this.teleport_send = function (entangle_qubit)
    {
        entangle_qubit.cnot(this);
        this.hadamard();
        var bits = [this.read(), entangle_qubit.read()];
        return bits;
    }

    this.teleport_receive = function (send_bits)
    {
        this.not(send_bits[0]);
        this.hadamard();
        this.not(send_bits[1]);
        this.hadamard();
    }

    this.read = function (mask)
    {
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var target = newShiftedMask(baseTarget, this.startBit);

        if (this.qReg.animateWidgets)
        {
            var instruction = this.qReg.staff.addInstructionAfterInsertionPoint('read', target, 0, 0);
            if (instruction)
                instruction.finish();
        }
        // This result is already cached.
        var rval = intToBitField(this.qReg.read(target));
        var result = rval.getBits(this.startBit, baseTarget);
        target.recycle();
        rval.recycle();
        return result;
    }
    this.read_uint = this.read;

    this.postselect = function (value, mask)
    {
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var target = newShiftedMask(baseTarget, this.startBit);

        if (this.qReg.animateWidgets)
        {
            var instruction = this.qReg.staff.addInstructionAfterInsertionPoint('postselect', target, value, 0);
            if (instruction)
                instruction.finish();
        }
        else
        {
            this.qReg.postselect(target, value);
        }
    }

    this.peek = function (mask)
    {
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var target = newShiftedMask(baseTarget, this.startBit);

        var instruction = this.qReg.staff.addInstructionAfterInsertionPoint('peek', target, 0, 0);
        if (instruction)
            instruction.finish();
    }

    this.discard = function (mask)
    {
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var target = newShiftedMask(baseTarget, this.startBit);

        var instruction = this.qReg.staff.addInstructionAfterInsertionPoint('discard', target, 0, 0);
        if (instruction)
            instruction.finish();
    }

    this.nop = function (mask)
    {
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var target = newShiftedMask(baseTarget, this.startBit);

        var instruction = this.qReg.staff.addInstructionAfterInsertionPoint('nop', target, 0, 0);
        if (instruction)
            instruction.finish();
    }

    // Just return a shifted bitmask to use as args
    this.bits = function (mask, or_with_next)
    {        
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var out_mask = newShiftedMask(baseTarget, this.startBit);
        if (or_with_next)
            out_mask.orEquals(or_with_next);
        return out_mask;
    }

    // Just return a shifted bitmask to use as args
    this.mask = function (mask)
    {
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        var out_mask = newShiftedMask(baseTarget, this.startBit);
        return bitFieldToInt(out_mask);
    }

    // Read and then sign-extend
    this.readSigned = function ()
    {
        var rval = this.read();
        rval <<= (32 - this.numBits);
        rval >>= (32 - this.numBits);
        return rval;
    }

    this.write = function (value, mask)
    {
        var baseTarget = (mask == null) ? this.baseMask : this.baseMask & mask;
        if (this.shiftedMask == null)
            this.shiftedMask = newShiftedMask(baseTarget, this.startBit);
        if (this.shiftedValue == null)
            this.shiftedValue = newShiftedMask(value, this.startBit);

        this.shiftedMask.set(0);
        this.shiftedMask.setBits(this.startBit, baseTarget, baseTarget);
        this.shiftedValue.set(0);
        this.shiftedValue.setBits(this.startBit, value, value);

        if (this.qReg.animateWidgets)
            this.qReg.staff.addInstructionAfterInsertionPoint('write', this.shiftedMask, this.shiftedValue, 0);
        else
            this.qReg.write(this.shiftedMask, this.shiftedValue);
    }

    // Testing to get a result which works with Shor's algorithm.
    this.invQFT_test2 = function()
    {
        for (bit1 = 0; bit1 < this.numBits; ++bit1)
        {
            var mask1 = 1 << bit1;
            var theta = -90.0;
            for (bit2 = bit1 + 1; bit2 < this.numBits - 1; ++bit2)
                theta *= 0.5;
            this.hadamard(mask1);
            for (bit2 = bit1 + 1; bit2 < this.numBits; ++bit2)
            {
                var mask2 = 1 << bit2;
                this.phase(theta, 0, mask1|mask2);
                theta *= 2.0;
            }
        }
    }
    this.invQFT_test1 = function()
    {
        for (bit1 = this.numBits - 1; bit1 >= 0; --bit1)
        {
            var mask1 = 1 << bit1;
            var theta = 90.0;
            for (bit2 = this.numBits - 1; bit2 >= bit1 + 1; --bit2)
            {
                var mask2 = 1 << bit2;
                this.phase(theta, 0, mask1|mask2);
                theta *= 0.5;
            }
            this.hadamard(mask1);
        }
    }

    this.invQFT = function(target_mask)
    {
        if (target_mask == null)
            target_mask = ~0;
        this.QFT(target_mask, true)
    }

    this.QFT = function(target_mask, flip_h)
    {
        if (target_mask == null)
            target_mask = ~0;
        this.qReg.qpu.QFT(this.mask(target_mask), flip_h);
    }

    this.Grover = function(conditionMask)
    {
        this.hadamard();
        this.not();
        this.cphase(180, ~0, conditionMask);
        this.not();
        this.hadamard();
    }

    // this += rhs
    this.add = function(rhs, extraConditionBits, extraNOTConditionBits, reverse_to_subtract, shiftRHS)
	{
        var anim = this.qReg.animateWidgets;
        if (!shiftRHS)
            shiftRHS = 0;

        // If rhs is a number, just buid the addition logic
        if (rhs.toFixed)
            return this.add_int(rhs << shiftRHS, extraConditionBits, extraNOTConditionBits);

        if (extraNOTConditionBits)
        {
            if (anim)
                this.qReg.staff.addInstructionAfterInsertionPoint('not', extraNOTConditionBits, 0, 0);
            else
                this.qReg.not(extraNOTConditionBits);
        }

        // Save time by re-using instructions and bitfields
        if (this.add_instructions == null)
            this.add_instructions = [];
        if (this.add_bf != null && this.add_bf.length > 0 && this.add_bf[0].numBits < this.qReg.numQubits)
            this.add_bf = null;
        if (this.add_bf == null)
            this.add_bf = [];

        var instructions = [];
        if (this.slideMask == null)
            this.slideMask = NewBitField(this.maskBF, this.qReg.numQubits);
        if (this.shiftStrip == null)
            this.shiftStrip = NewBitField(this.slideMask);
        this.slideMask.set(this.maskBF);
        this.shiftStrip.set(this.maskBF);
        for (var i = 0; i < shiftRHS; ++i)
            this.shiftStrip.shiftLeft1();
        this.shiftStrip.andEquals(this.slideMask);
        if (this.aCond == null)
            this.aCond = NewBitField(this.slideMask);
        if (this.aTarg == null)
            this.aTarg = NewBitField(this.slideMask);
        if (this.condArg == null)
            this.condArg = NewBitField(this.slideMask);
        if (this.bCond == null)
            this.bCond = NewBitField(0, this.qReg.numQubits);
        this.bCond.set(0);
//        var bCondAndRhs = NewBitField(this.bCond);
        this.bCond.setBit(rhs.startBit, 1);  /**** Add the low bit of B first, then work your way up. ****/
        var shiftWait = 0;
		while (this.bCond.andIsNotEqualZero(rhs.maskBF))
        {
            this.aTarg.set(0);
            this.aTarg.setBit(this.startBit + (this.numBits - 1), 1);
            this.aCond.set(this.slideMask);
            this.aCond.shiftRight1();
            while (this.aTarg.andIsNotEqualZero(this.slideMask) && this.aTarg.andIsNotEqualZero(this.shiftStrip))
            {
                this.condArg.set(this.aCond);
                this.condArg.andEquals(this.slideMask);
                this.condArg.andEquals(this.shiftStrip);
                this.condArg.orEquals(extraConditionBits);
                this.condArg.orEquals(extraNOTConditionBits);
                this.condArg.orEquals(this.bCond);
                if (instructions.length == this.add_instructions.length)
                {
                    var inst = new QInstruction('cnot', this.aTarg, this.condArg, 0, null);
                    this.add_instructions.push(inst);
                    instructions.push(inst);
                }
                else
                {
                    // re-use existing instructions if we have them.
                    var inst = this.add_instructions[instructions.length];
                    inst.targetQubits.set(this.aTarg);
                    inst.conditionQubits.set(this.condArg);
                    instructions.push(inst);
                }
                this.aCond.shiftRight1();
                this.aTarg.shiftRight1();
			}
			this.bCond.shiftLeft1();
            this.slideMask.shiftLeft1();
            this.slideMask.andEquals(this.maskBF);
            this.shiftStrip.shiftLeft1();
            this.shiftStrip.andEquals(this.maskBF);
		}
        if (reverse_to_subtract)
        {
            if (anim)
            {
                for (var i = instructions.length - 1; i >= 0; --i)
                    this.qReg.staff.addInstructionAfterInsertionPoint(instructions[i]);
            }
            else
            {
                for (var i = instructions.length - 1; i >= 0; --i)
                    this.qReg.cnot(instructions[i].targetQubits, instructions[i].conditionQubits);
            }
        }
        else
        {
            if (anim)
            {
                for (var i = 0; i < instructions.length; ++i)
                    this.qReg.staff.addInstructionAfterInsertionPoint(instructions[i]);
            }
            else
            {
                for (var i = 0; i < instructions.length; ++i)
                    this.qReg.cnot(instructions[i].targetQubits, instructions[i].conditionQubits);
            }
        }

        if (extraNOTConditionBits)
        {
            if (anim)
                this.qReg.staff.addInstructionAfterInsertionPoint('not', extraNOTConditionBits, 0, 0);
            else
                this.qReg.not(extraNOTConditionBits);
        }
	}

    // this += rhs << shift
    this.addShifted = function(rhs, shiftRHS, extraConditionBits, extraNOTConditionBits, reverse_to_subtract)
    {
        this.add(rhs, extraConditionBits, extraNOTConditionBits, reverse_to_subtract, shiftRHS);
    }

    // this += rhs * rhs
    this.addSquared = function(rhs, extraConditionBits, extraNOTConditionBits, reverse_to_subtract)
    {
        // If rhs is a number, just buid the addition logic
        if (rhs.toFixed)
            return this.add_int(rhs * rhs, extraConditionBits, extraNOTConditionBits);

        var slideMask = NewBitField(0, this.qReg.numQubits);
        for (var bit = 0; bit < rhs.numBits; ++bit)
        {
            slideMask.set(0);
            if (extraConditionBits)
                slideMask.orEquals(extraConditionBits);
            slideMask.setBit(rhs.startBit + bit, 1);
            this.add(rhs, slideMask, extraNOTConditionBits, reverse_to_subtract, bit);
            slideMask.shiftLeft1();
        }
    }

    // this = (this << shift) rotating bits back arounc
    this.reverseBits = function(extraConditionBits)
    {
        var mask = this.bits(0);
        var iters = Math.floor(this.numBits / 2);
        for (var i = 0; i < iters; ++i)
        {
            mask.set(0);
            mask.setBit(this.startBit + i, 1);
            mask.setBit(this.startBit + this.numBits - (i + 1), 1);
            this.qReg.staff.addInstructionAfterInsertionPoint('exchange', mask, extraConditionBits);
        }
    }

    // this = (this << shift) rotating bits back arounc
    this.rollLeft = function(shift, extraConditionBits, extraNOTConditionBits)
    {
        shift %= this.numBits;
        if (shift == 0)
            return;
        var mask = this.bits(0);
        // TODO: This is temporary and not optimal.
        var one_at_a_time = false;
        if (one_at_a_time)
        {
            var bit0 = 0;
            var bit1 = shift;
            for (var s = 0; s < shift; ++s)
            {
                for (var i = this.numBits - 2; i >= 0; --i)
                {
                    mask.set(0);
                    mask.setBit(this.startBit + ((i + 0) % this.numBits), 1);
                    mask.setBit(this.startBit + ((i + 1) % this.numBits), 1);
                    this.qReg.staff.addInstructionAfterInsertionPoint('exchange', mask, extraConditionBits);
                }
            }
        }
        else
        {
//            shift = this.numBits - shift;
            for (var i = this.numBits - 1; i > 0; --i)
            {
                mask.set(0);
                var buddy = Math.max(i - shift, 0);
                mask.setBit(this.startBit + i, 1);
                mask.setBit(this.startBit + buddy, 1);
                this.qReg.staff.addInstructionAfterInsertionPoint('exchange', mask, extraConditionBits);
            }
        }
    }

    // this -= rhs << shift
    this.subtractShifted = function(rhs, shiftRHS, extraConditionBits, extraNOTConditionBits, reverse_to_subtract)
    {
        if (rhs.toFixed)
            return this.add_int(-(rhs << shiftRHS), extraConditionBits, extraNOTConditionBits);
        this.addShifted(rhs, shiftRHS, extraConditionBits, extraNOTConditionBits, true);
    }

    // this += rhs * rhs
    this.subtractSquared = function(rhs, extraConditionBits, extraNOTConditionBits, reverse_to_subtract)
    {
        if (rhs.toFixed)
            return this.add_int(-(rhs * rhs), extraConditionBits, extraNOTConditionBits);
        this.addSquared(rhs, extraConditionBits, extraNOTConditionBits, true);
    }

    this.negate = function ()
    {
         this.not();
         this.add(1);
    }

    this.subtract = function (rhs, extraConditionBits, extraNOTConditionBits)
    {
        if (rhs.toFixed)
            return this.add_int(-rhs, extraConditionBits, extraNOTConditionBits);
        // Just add the number, but backwards.
        this.add(rhs, extraConditionBits, extraNOTConditionBits, true);
    }

    // this += rhs
    // extraConditionBits is any bits which we want to add as conditions
    this.add_int = function(rhs, extraConditionBits, extraNOTConditionBits)
    {
        // Optimization while writing QQFSM(bf) whitepaper:
        // If the high bit is set, it's going to be faster to negate the int
        // and just run the addition backwards.
        var anim = this.qReg.animateWidgets;

        var reverse = false;
        if (this.numBits > 1
            && (rhs & (1 << (this.numBits - 1))))
        {
            reverse = true;
            rhs = -rhs & this.baseMask;
        }
        var instructions = [];
        // Save time by re-using instructions and bitfields
        if (this.add_instructions == null)
            this.add_instructions = [];

        if (extraNOTConditionBits)
        {
            if (anim)
                this.qReg.staff.addInstructionAfterInsertionPoint('not', extraNOTConditionBits, 0, 0);
            else
                this.qReg.not(extraNOTConditionBits);
        }
        rhs = 0|rhs;    // Force it to be an integer
        var rhs_mask = 0;
        while (rhs & ~rhs_mask)
            rhs_mask = (rhs_mask << 1) | 1;
        rhs_mask &= this.baseMask;

        if (this.slideMask == null)
            this.slideMask = NewBitField(this.maskBF, this.qReg.numQubits);
        if (this.aCond == null)
            this.aCond = NewBitField(this.slideMask);
        if (this.aTarg == null)
            this.aTarg = NewBitField(this.slideMask);
        if (this.condArg == null)
            this.condArg = NewBitField(this.slideMask);
        this.slideMask.set(this.maskBF);
        var bCond = 1;  /**** Add the low bit of B first, then work your way up. ****/
        while (bCond & rhs_mask)
        {
            this.aTarg.set(0);
            this.aTarg.setBit(this.startBit + (this.numBits - 1), 1);
            this.aCond.set(this.slideMask);
            this.aCond.shiftRight1();
            while (this.aTarg.andIsNotEqualZero(this.slideMask))
            {
                if (rhs & bCond)
                {
                    this.condArg.set(this.aCond);
                    this.condArg.andEquals(this.slideMask);
                    this.condArg.orEquals(extraConditionBits);
                    this.condArg.orEquals(extraNOTConditionBits);
                    if (instructions.length == this.add_instructions.length)
                    {
                        var inst = new QInstruction('cnot', this.aTarg, this.condArg, 0, null);
                        this.add_instructions.push(inst);
                        instructions.push(inst);
                    }
                    else
                    {
                        // re-use existing instructions if we have them.
                        var inst = this.add_instructions[instructions.length];
                        inst.targetQubits.set(this.aTarg);
                        inst.conditionQubits.set(this.condArg);
                        instructions.push(inst);
                    }
                }
                this.aCond.shiftRight1();
                this.aTarg.shiftRight1();
            }
            bCond <<= 1;
            this.slideMask.shiftLeft1();
            this.slideMask.andEquals(this.maskBF);
        }

        if (reverse)
        {
            if (anim)
            {
                for (var i = instructions.length - 1; i >= 0; --i)
                    this.qReg.staff.addInstructionAfterInsertionPoint(instructions[i]);
            }
            else
            {
                for (var i = instructions.length - 1; i >= 0; --i)
                    this.qReg.cnot(instructions[i].targetQubits, instructions[i].conditionQubits);
            }
        }
        else
        {
            if (anim)
            {
                for (var i = 0; i < instructions.length; ++i)
                    this.qReg.staff.addInstructionAfterInsertionPoint(instructions[i]);
            }
            else
            {
                for (var i = 0; i < instructions.length; ++i)
                    this.qReg.cnot(instructions[i].targetQubits, instructions[i].conditionQubits);
            }
        }

        if (extraNOTConditionBits)
        {
            if (anim)
                this.qReg.staff.addInstructionAfterInsertionPoint('not', extraNOTConditionBits, 0, 0);
            else
                this.qReg.not(extraNOTConditionBits);
        }
    }



    // Now actually reserve it (at construction time)
    this.reserve();
}

function QUInt(numBits, qReg, name)
{
    Qubits.call( this, numBits, qReg, name);
}

function QInt(numBits, qReg, name)
{
    QUInt.call( this, numBits, qReg, name);

    this.read = function (mask)
    {
        var result = this.read_uint(mask);

        // Now make it signed
        high_bit = 1 << (this.numBits - 1)
        if (result & high_bit)
        {
            // sign-extend
            result |= (-1 << this.numBits);
        }
        return result;
    }
    this.read_int = this.read;
    this.write_int = this.write;
}

function QFixed(numBits, radix, qReg, name)
{
    QInt.call( this, numBits, qReg, name);
    this.radix = radix;

    this.read = function (mask)
    {
        var value = this.read_int(mask);
        value /= (1.0 * (1 << this.radix));
        return value;
    }
    this.write = function (value, mask)
    {
        value = 0|(value * (1 << this.radix))
        this.write_int(value, mask);
    }
}

function is_qint(value)
{
    // Check to see if a variable is a qint (otherwise it's likely a bitfield or an integer)
    return value != null && value.startBit != null;
}

// Given an array of qints and masks, return a bitfield which is a combined mask.
// Input is like this:
//    qintBits([intA, maskA, intB, maskB, ...]);
function qintMask(list)
{
    var numBits = 1;
    if (list[0])
        numBits = list[0].qReg.numQubits;
    var result = NewBitField(0, numBits);
    for (var index = 0; index < list.length; index += 2)
    {
        var qint = list[index];
        if (qint)
        {
            var mask = list[index + 1];
            result.orEquals(qint.bits(mask));
        }
    }
    return result;
}

// Node.js hookups
module.exports.is_qint = is_qint;
module.exports.Qubits = Qubits;
module.exports.QInt = QInt;
module.exports.QUInt = QUInt;
module.exports.QFixed = QFixed;
