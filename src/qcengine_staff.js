/////////////////////////////////////////////////////////////////////////////
// qcengine_staff.js
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


var qc_options = {
    start_qubits_from:  0,
    double_ff_line:     false,
    auto_draw:          true,
    print_function:     null,
    max_staff_width:    1024,
    max_staff_height:   1024,
    draw_s_t_gates:     false,
};    // A general bucket for collecting global options


function QInstruction(op, targetQubits, conditionQubits, theta, codeLabel, auxQubits)
{
    this.qReg = null;
    this.op = op;
    if (targetQubits == null)
        targetQubits = 0;
    if (conditionQubits == null)
        conditionQubits = 0;
    if (auxQubits == null)
        auxQubits = 0;

    this.targetQubits = new BitField(targetQubits);
    this.conditionQubits = new BitField(conditionQubits);
    if (auxQubits)
        this.auxQubits = new BitField(auxQubits);
//    if (targetQubits.isBitField)
//    {
//        this.targetQubitsBF = targetQubits;
//        this.targetQubits = targetQubits.values[0];
//    }
//    if (conditionQubits.isBitField)
//    {
//        this.conditionQubitsBF = conditionQubits;
//        this.conditionQubits = conditionQubits.values[0];
//    }

//console.log('makein ' + this.op
//    + ' t:' + bitfieldHexString(targetQubits)
//    + ' c:' + bitfieldHexString(conditionQubits)
//    );
//console.log('make ' + this.op
//    + ' t:' + bitfieldHexString(this.targetQubits)
//    + ' c:' + bitfieldHexString(this.conditionQubits)
//    );


    this.codeLabel = codeLabel;
    if (op == "write" || op == "postselect")
    {
        // conditionQubits are used to pass in the value
        this.writeValue = conditionQubits;
        this.conditionQubits.set(0);
        if (this.writeValue.length && this.writeValue.length > 0)
        {
            this.is_fock = true;
            this.targetQubits = new BitField(~0);
        }
    }

    this.theta = theta;
    this.blockJobs = new Array();
    this.blockJobsInUse = 0; // We'll save time by re-using block jobs
    this.firstWaitingBlockJob = 0;
    this.started = false;
    this.finished = false;

    this.execute = function(qReg, direction)
    {
        if (direction == null)
            direction = 1;
        this.qReg = qReg;
        this.blockJobsInUse = 0;
        this.firstWaitingBlockJob = 0;
        qReg.currentInstruction = this;
        this.started = true;
        this.finished = false;
        this.qReg.noise_level = 0;
        this.noise_level = 0;
        if (op == 'not')
            qReg.not(this.targetQubits);
        else if (op == 'cnot')
            qReg.cnot(this.targetQubits, this.conditionQubits);
        else if (op == 'exchange')
            qReg.exchange(this.targetQubits, this.conditionQubits);
        else if (op == 'hadamard')
            qReg.chadamard(this.targetQubits, this.conditionQubits);
        else if (op == 'chadamard')
            qReg.chadamard(this.targetQubits, this.conditionQubits);
        else if (op == 'rotatex')
            qReg.rotatex(this.targetQubits, theta * direction);
        else if (op == 'crotatex')
            qReg.crotatex(this.targetQubits, this.conditionQubits, theta * direction);
        else if (op == 'rotatey')
            qReg.rotatey(this.targetQubits, theta * direction);
        else if (op == 'rotatez')
            qReg.rotatez(this.targetQubits, theta * direction);
        else if (op == 'y')
            qReg.y(this.targetQubits, this.conditionQubits);
        else if (op == 'crotatey')
            qReg.crotatey(this.targetQubits, this.conditionQubits, theta * direction);
        else if (op == 'crotatez')
            qReg.crotatez(this.targetQubits, this.conditionQubits, theta * direction);
        else if ((op == 'crootnot' && direction > 0) || (op == 'crootnot_inv' && direction < 0))
            qReg.crootnot(this.targetQubits, this.conditionQubits);
        else if ((op == 'crootnot_inv' && direction > 0) || (op == 'crootnot' && direction < 0))
            qReg.crootnot_inv(this.targetQubits, this.conditionQubits);
        else if ((op == 'rootexchange' && direction > 0) || (op == 'rootexchange_inv' && direction < 0))
            qReg.rootexchange(this.targetQubits, this.conditionQubits);
        else if ((op == 'rootexchange_inv' && direction > 0) || (op == 'rootexchange' && direction < 0))
            qReg.rootexchange(this.targetQubits, this.conditionQubits);
        else if (op == 'noise')
            qReg.noise(this.theta, this.targetQubits);
        else if (op == 'phase')
            qReg.multi_qubit_phase(this.targetQubits, this.conditionQubits, this.theta * direction);
        else if (op == 'optical_phase')
            qReg.optical_phase(this.conditionQubits, this.theta * direction);
        else if (op == 'optical_beamsplitter')
            qReg.optical_beamsplitter(this.targetQubits, this.theta * direction);
        else if (op == 'coptical_beamsplitter')
            qReg.coptical_beamsplitter(this.targetQubits, this.conditionQubits, this.theta * direction);
        else if (op == 'read' && direction > 0)
            this.recentReadValue = qReg.read(this.targetQubits, false, false);
        else if (op == 'write' && direction > 0)
            qReg.write(this.targetQubits, this.writeValue, this.theta);
        else if (op == 'postselect' && direction > 0)
            qReg.postselect(this.targetQubits, this.writeValue);
        else if (op == 'postselect_qubit_pair' && direction > 0)
            qReg.postselect_qubit_pair(this.targetQubits);
        else if (op == 'dual_rail_beamsplitter')
            qReg.dual_rail_beamsplitter(this.targetQubits, this.conditionQubits, this.theta * direction, this.auxQubits);
        else if (op == 'pbs')
            qReg.pbs(this.targetQubits, this.conditionQubits, this.theta, this.auxQubits);
        else if (op == 'pair_source')
            qReg.pair_source(this.targetQubits, this.conditionQubits, 0);
        else if (op == 'polarization_grating_in')
            qReg.polarization_grating_in(this.targetQubits, this.conditionQubits, this.theta * direction);
        else if (op == 'polarization_grating_out')
            qReg.polarization_grating_out(this.targetQubits, this.conditionQubits, this.theta * direction);
        else if (op == 'discard')
            {}
        else if (op == 'nop')
            {}
        else if (op == 'start_photon_sim')
            qReg.startPhotonSim(this.targetQubits, this, this.theta);
        else if (op == 'stop_photon_sim')
            qReg.stopPhotonSim(this.targetQubits, this);
        else if (op == 'start_chp_sim')
            qReg.startCHPSim(this.targetQubits, this);
        else if (op == 'stop_chp_sim')
            qReg.stopCHPSim(this.targetQubits, this);
        else if (op == 'push_mixed')
            qReg.pushMixedState(this.targetQubits, this.theta, this);
        else if (op == 'use_mixed')
            qReg.useMixedState(this.targetQubits, this.theta, this);
        else if (op == 'peek')
        {
            // Peek at the values, to display them
            var high = this.targetQubits.getHighestBitIndex();
            var low = this.targetQubits.getLowestBitIndex();
            this.recentPeekValues = [];
            for (var bit = 0; bit < low; ++bit)
                this.recentPeekValues.push(null);
            for (var bit = low; bit <= high; ++bit)
                this.recentPeekValues.push(qReg.peekQubitProbability(1 << bit));
        }
        this.noise_level = this.qReg.noise_level;
        this.finish();
    }

    // create (if necessary) and setup a block job
    this.nextBlockJob = function(qBlock1, qBlock2)
    {
        // var bj;
        // if (this.blockJobsInUse < this.blockJobs.length)
        // {
        //     bj = this.blockJobs[this.blockJobsInUse];
        // }
        // else
        // {
        //     bj = new BlockJob();
        //     this.blockJobs.push(bj);
        // }
        // this.blockJobsInUse++;
        // bj.setup(this, qBlock1, qBlock2);
    }

    // Return the number of block jobs remaining to start.
    this.serviceBlockJobs = function(qReg)
    {
        // if (this.isFinished())
        //     return 0;
        // for (var i = this.firstWaitingBlockJob; i < this.blockJobsInUse; ++i)
        // {
        //     if (this.blockJobs[i].started)
        //     {
        //         this.blockJobs[i].start();
        //         this.firstWaitingBlockJob = i + 1;
        //         return this.firstWaitingBlockJob - i;
        //     }
        // }
        // this.setFinished();
        return 0;   // all jobs have started
    }

    this.isFinished = function()
    {
        return !this.qReg;
    }

    this.setFinished = function()
    {
        this.started = true;
        this.finished = true;
        this.qReg.currentInstruction = null;
        this.qReg = null;
        this.blockJobsInUse = 0;
    }

    this.finish = function()
    {
        while (this.serviceBlockJobs() > 0)
        {
            // do nothing;
        }
    }

    this.draw = function(ctx, x, y, radius, qubitIndex, staff, instruction_x, slot)
    {
        ctx.lineWidth = 2;
        ctx.fillStyle = 'white';


        if (this.op == 'phase' || this.op == 'cphase')
        {
            if (this.theta == 180)
            {
                // Z gate
                ctx.lineWidth = 1;
                ctx.fillStyle = 'white';
                ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
                ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);

                ctx.lineWidth = 2;
                ctx.beginPath();
                var hradx = 0.4 * radius;
                var hrady = 0.4 * radius;
                ctx.lineTo(x - hradx, y - hrady);
                ctx.lineTo(x + hradx * 0.7, y - hrady);
                ctx.lineTo(x - hradx * 0.7, y + hrady);
                ctx.lineTo(x + hradx, y + hrady);
                ctx.stroke();
            }
            else if ((this.theta == 90 || this.theta == -90) && qc_options.draw_s_t_gates)
            {
                // S gate
                ctx.lineWidth = 1;
                ctx.fillStyle = 'white';
                ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
                ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);

                // inverse
                if (this.theta < 0)
                {
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.lineTo(x + radius * 0.6, y - radius * 0.1);
                    ctx.lineTo(x + radius * 0.3, y - radius * 0.1);
                    ctx.moveTo(x + radius * 0.8, y - radius * 0.5);
                    ctx.lineTo(x + radius * 0.8, y + radius * 0.3);
                    ctx.stroke();
                }

                ctx.lineWidth = 2;
                ctx.beginPath();
                var hradx = 0.4 * radius;
                var hrady = 0.4 * radius;
                ctx.lineTo(x + hradx, y - hrady);
                ctx.lineTo(x - hradx * 0.5, y - hrady);
                ctx.lineTo(x - hradx * 0.7, y - hrady * 0.5);
                ctx.lineTo(x + hradx * 0.7, y + hrady * 0.5);
                ctx.lineTo(x + hradx * 0.5, y + hrady);
                ctx.lineTo(x - hradx, y + hrady);
                ctx.stroke();
            }
            else if ((this.theta == 45 || this.theta == -45) && qc_options.draw_s_t_gates)
            {
                // T gate
                ctx.lineWidth = 1;
                ctx.fillStyle = 'white';
                ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
                ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);

                // inverse
                if (this.theta < 0)
                {
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.lineTo(x + radius * 0.6, y - radius * 0.1);
                    ctx.lineTo(x + radius * 0.3, y - radius * 0.1);
                    ctx.moveTo(x + radius * 0.8, y - radius * 0.5);
                    ctx.lineTo(x + radius * 0.8, y + radius * 0.3);
                    ctx.stroke();
                }

                ctx.lineWidth = 2;
                ctx.beginPath();
                var hradx = 0.5 * radius;
                var hrady = 0.5 * radius;
                ctx.lineTo(x - hradx, y - hrady);
                ctx.lineTo(x + hradx, y - hrady);
                ctx.lineTo(x, y - hrady);
                ctx.lineTo(x, y + hrady);
                ctx.stroke();
            }
            else
            {
                // Large phase circle
                ctx.fillStyle = 'white';
                var scale_down = 0.85;
                strokeCircle(ctx, x, y, radius * scale_down);
                fillCircle(ctx, x, y, radius * scale_down);

                ctx.lineWidth = 1;
                strokeCircle(ctx, x, y, radius * scale_down * 0.15 / 0.35);
                ctx.beginPath();
                ctx.lineTo(x + radius * 0.05,  y - radius * 0.7);
                ctx.lineTo(x - radius * 0.05, y + radius * 0.7);
                ctx.stroke();
            }
        }
        else if (this.op == 'cnot' || this.op == 'not')
        {
            fillCircle(ctx, x, y, radius);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.lineTo(x - radius, y);
            ctx.lineTo(x + radius, y);
            ctx.lineTo(x, y);
            ctx.lineTo(x, y - radius);
            ctx.lineTo(x, y + radius);
            ctx.stroke();

            // and now the frame
            strokeCircle(ctx, x, y, radius);
        }
        else if (this.op == 'noise')
        {
            ctx.fillStyle = '#f00';
            fillCircle(ctx, x, y, radius * 0.4);
            ctx.fillStyle = '#fff';
        }
        else if (this.op == 'peek')
        {
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y - radius * 0.2);
            ctx.stroke();
            if (this.recentPeekValues
                && this.recentPeekValues.length > qubitIndex
                && this.recentPeekValues[qubitIndex] != null)
            {
                var val = this.recentPeekValues[qubitIndex];
                var val_1p = val.toFixed(1);
                var val_3p = val.toFixed(3);
                var str = '';
                if (parseFloat(val_3p) == parseFloat(val_1p))
                    str += val_1p;
                else
                    str += val_3p;
                var label_font_size = 10;
                draw_text(ctx, str, x, y - radius * 0.2, label_font_size, '', '#48f', 'center', 'bottom');
            }
        }
        else if (this.op == 'stop_photon_sim')
        {
            var yr = staff.gridSize * 0.5;
            ctx.fillStyle = '#4f8';
            ctx.globalAlpha = 0.25;
            var dx = instruction_x - staff.start_photon_sim_x;
            ctx.fillRect(-dx, y - yr, dx, yr * 2);
            ctx.globalAlpha = 0.75;
            ctx.fillRect(x - 0.1 * radius, y - 0.5 * staff.gridSize, 0.2 * radius, staff.gridSize);
            ctx.globalAlpha = 1.0;
        }
        else if (this.op == 'start_photon_sim')
        {
            var yr = radius * 1.0;
            ctx.fillStyle = '#4f8';
            ctx.globalAlpha = 0.25;
            staff.start_photon_sim_x = instruction_x;
//            ctx.fillRect(0, y - yr, staff.gridSize * 0.5, yr * 2);
            ctx.globalAlpha = 0.75;
            ctx.fillRect(x - 0.1 * radius, y - 0.5 * staff.gridSize, 0.2 * radius, staff.gridSize);
            ctx.globalAlpha = 1.0;
        }
        else if (this.op == 'stop_chp_sim')
        {
            var yr = staff.gridSize * 0.5;
            ctx.fillStyle = '#C38EFF';
            ctx.globalAlpha = 0.25;
            var dx = instruction_x - staff.start_chp_sim_x;
            ctx.fillRect(-dx, y - yr, dx, yr * 2);
            ctx.globalAlpha = 0.75;
            ctx.fillRect(x - 0.1 * radius, y - 0.5 * staff.gridSize, 0.2 * radius, staff.gridSize);
            ctx.globalAlpha = 1.0;
        }
        else if (this.op == 'start_chp_sim')
        {
            var yr = radius * 1.0;
            ctx.fillStyle = '#C38EFF';
            ctx.globalAlpha = 0.25;
            staff.start_chp_sim_x = instruction_x;
//            ctx.fillRect(0, y - yr, staff.gridSize * 0.5, yr * 2);
            ctx.globalAlpha = 0.75;
            ctx.fillRect(x - 0.1 * radius, y - 0.5 * staff.gridSize, 0.2 * radius, staff.gridSize);
            ctx.globalAlpha = 1.0;
        }
        else if (this.op == 'postselect_qubit_pair')
        {
            var xwidth = radius / 0.8;
            var high = this.targetQubits.getHighestBitIndex();
            var low = this.targetQubits.getLowestBitIndex();
            if (high == low + 1)
            {
                // Two lines right next to each other
                var yscale = 3.0;
                var ydir = 1;
                if (qubitIndex == low)
                {
                    ctx.save();
                    ctx.scale(1, yscale);
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = '#08f';
                    strokeCircle(ctx, x, (y + ydir * 0.5 * staff.gridSize)/yscale, 0.5 * xwidth);
                    ctx.restore();
                }
            }
            else
            {
                // Two lines right next to each other
                var yscale = 3.0;
                ctx.save();
                ctx.scale(1, yscale);
                ctx.lineWidth = 1;
                ctx.strokeStyle = '#08f';
                strokeCircle(ctx, x, y/yscale, 0.25 * xwidth);
                ctx.restore();
            }
        }
        else if (this.op == 'pair_source')
        {
            var high = this.targetQubits.getHighestBitIndex();
            var low = this.targetQubits.getLowestBitIndex();
            ctx.fillStyle = '#f20';
            if (high == low)
                fillCircle(ctx, x, y, staff.gridSize * 0.3);
            else if (qubitIndex == low)
                fillCircle(ctx, x, y, staff.gridSize * 0.3, 0, 180);
            else if (qubitIndex == high)
                fillCircle(ctx, x, y, staff.gridSize * 0.3, 180, 0);
        }
        else if (this.op == 'exchange'
                || this.op == 'rootexchange' 
                || this.op == 'rootexchange_inv'
                || this.op == 'dual_rail_beamsplitter'
                || this.op == 'pbs'
                || this.op == 'polarization_grating_in'
                || this.op == 'polarization_grating_out')
        {
            var high = this.targetQubits.getHighestBitIndex();
            var low = this.targetQubits.getLowestBitIndex();
            if (high == low + 1)
            {
                // Two lines right next to each other
                yd = radius * 2 * staff.double_line_space;
                // Nice-looking crossed wires
                var xwidth = radius / 0.8;
                ctx.lineWidth = 1;
                ctx.fillStyle = 'white';
                ctx.strokeStyle = 'white';
                ctx.fillRect(x - radius, y - 1, radius * 2, 2);
                ctx.strokeRect(x - radius, y - 1, radius * 2, 2);
                ctx.fillRect(x - 1, y - radius, 2, radius * 2);
                ctx.strokeRect(x - 1, y - radius, 2, radius * 2);

                ctx.strokeStyle = 'black';
                ctx.beginPath();
                if (this.op == 'dual_rail_beamsplitter')
                {
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    var ydir = -1;
                    if (qubitIndex == low)
                        ydir = 1;
                    ctx.moveTo(x - xwidth, y);
                    ctx.lineTo(x - 0.7 * xwidth, y + 0.2 * ydir * xwidth);
                    ctx.lineTo(x - 0.5 * xwidth, y + 0.6 * ydir * xwidth);
                    ctx.lineTo(x - 0.3 * xwidth, y + 0.8 * ydir * xwidth);
                    ctx.lineTo(x + 0.3 * xwidth, y + 0.8 * ydir * xwidth);
                    ctx.lineTo(x + 0.5 * xwidth, y + 0.6 * ydir * xwidth);
                    ctx.lineTo(x + 0.7 * xwidth, y + 0.2 * ydir * xwidth);
                    ctx.lineTo(x + xwidth, y);
                }
                else if (this.op == 'pbs')
                {
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 1.0;
                    ctx.beginPath();
                    // i/o lines
                    for (var xdir = -1; xdir <= 1; ++xdir)
                    {
                        var ydir = -1;
                        if (qubitIndex == low)
                            ydir = 1;
//                        if (qubitIndex == low && this.theta >= 0) {
                            // polarized photon in/out
                            ctx.moveTo(x - xdir * 1.0 * xwidth, y - 0.0 * ydir * xwidth);
                            ctx.lineTo(x - xdir * 0.5 * xwidth, y + 0.5 * ydir * xwidth);
//                        }
//                        else if (qubitIndex == high && this.theta < 0) {
                            // polarized photon in/out
                            ctx.moveTo(x - xdir * 1.0 * xwidth, y - 0.0 * ydir * xwidth);
                            ctx.lineTo(x - xdir * 0.5 * xwidth, y + 0.5 * ydir * xwidth);
//                        }
                    }
                    ctx.stroke();

                    // Box fill
                    ctx.fillStyle = 'white';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x - 1.0 * xwidth, y + 1.0 * ydir * xwidth);
                    ctx.lineTo(x + 0.0 * xwidth, y - 0.0 * ydir * xwidth);
                    ctx.lineTo(x + 1.0 * xwidth, y + 1.0 * ydir * xwidth);
                    ctx.fill();
                    // splitter line
                    ctx.strokeStyle = '#88f';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(x - 1.0 * xwidth, y + 1.0 * ydir * xwidth);
                    ctx.lineTo(x + 1.0 * xwidth, y + 1.0 * ydir * xwidth);
                    ctx.stroke();
                    // Box border
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x - 1.0 * xwidth, y + 1.0 * ydir * xwidth);
                    ctx.lineTo(x + 0.0 * xwidth, y - 0.0 * ydir * xwidth);
                    ctx.lineTo(x + 1.0 * xwidth, y + 1.0 * ydir * xwidth);
                    ctx.stroke();
                }
                else if (this.op == 'polarization_grating_in'
                        || this.op == 'polarization_grating_out')
                {
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 1.0;
                    ctx.beginPath();
                    var xdir = -1;
                    var ydir = -1;
                    if (qubitIndex == low)
                        ydir = 1;
                    if (this.op == 'polarization_grating_in')
                        xdir = 1;
                    if (qubitIndex == low && this.theta >= 0) {
                        // polarized photon in/out
                        ctx.moveTo(x - xdir * 1.0 * xwidth, y - 0.0 * ydir * xwidth);
                        ctx.lineTo(x - xdir * 0.5 * xwidth, y + 0.5 * ydir * xwidth);
                    }
                    else if (qubitIndex == high && this.theta < 0) {
                        // polarized photon in/out
                        ctx.moveTo(x - xdir * 1.0 * xwidth, y - 0.0 * ydir * xwidth);
                        ctx.lineTo(x - xdir * 0.5 * xwidth, y + 0.5 * ydir * xwidth);
                    }
                    // Box border
                    ctx.moveTo(x - 1.0 * xwidth, y + 1.0 * ydir * xwidth);
                    ctx.lineTo(x + 0.0 * xwidth, y - 0.0 * ydir * xwidth);
                    ctx.lineTo(x + 1.0 * xwidth, y + 1.0 * ydir * xwidth);
                    // dual-rail wedges
                    ctx.moveTo(x + xdir * 0.0 * xwidth, y - 0.0 * ydir * xwidth);
                    ctx.lineTo(x + xdir * 1.0 * xwidth, y + 0.0 * ydir * xwidth);
                    ctx.lineTo(x + xdir * 0.5 * xwidth, y + 0.5 * ydir * xwidth);
                    ctx.stroke();

                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    for (var i = -0.8; i < 1.0; i += 0.3)
                    {
                        if (i < 0.0)
                            ctx.moveTo(x + i * xwidth, y - i * ydir * xwidth);
                        else
                            ctx.moveTo(x + i * xwidth, y + i * ydir * xwidth);
                        ctx.lineTo(x + i * xwidth, y + 1.0 * ydir * xwidth);
                        if (i < 0.0)
                        {
                            ctx.moveTo(x + i * xwidth, y - i * ydir * xwidth);
                            ctx.lineTo(x - i * xwidth, y - i * ydir * xwidth);
                        }
                    }
                    ctx.stroke();
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 1.0;
                }
                else
                {
                    // exchange
                    var ym = y - xwidth;
                    if (qubitIndex == low)
                        ym = y + xwidth;
                    yd = radius * 2 * staff.double_line_space;
                    if (0 && staff.draw_double_lines)
                    {
                        ctx.moveTo(x - xwidth, y - yd);
                        ctx.lineTo(0, ym - yd);
                        ctx.lineTo(x + xwidth, y - yd);
                        ctx.moveTo(x - xwidth, y + yd);
                        ctx.lineTo(0, ym + yd);
                        ctx.lineTo(x + xwidth, y + yd);
                    }
                    else
                    {
                        var drawSlope_down = staff.wire_grid[slot].getBit(low);
                        var drawSlope_up = staff.wire_grid[slot].getBit(high);
                        var draw_a = drawSlope_down;
                        var draw_b = drawSlope_up;
                        if (qubitIndex == high)
                        {
                            draw_b = drawSlope_down;
                            draw_a = drawSlope_up;
                        }
                        if (draw_a)
                        {
                            ctx.moveTo(x - xwidth, y);
                            ctx.lineTo(0, ym);
                        }
                        if (draw_b)
                        {
                            ctx.moveTo(0, ym);
                            ctx.lineTo(x + xwidth, y);
                        }
                    }
                }
                ctx.stroke();

                if (!isAllZero(this.conditionQubits))
                {
                    // Thicken the X
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    if (qubitIndex == low)
                    {
                        ctx.moveTo(x - (xwidth * 0.5), y + (xwidth * 0.5));
                        ctx.lineTo(0,          y + (xwidth * 1.0));
                        ctx.lineTo(x + (xwidth * 0.5), y + (xwidth * 0.5));
                    }
                    else
                    {
                        ctx.moveTo(x - (xwidth * 0.5), y - (xwidth * 0.5));
                        ctx.lineTo(0,          y - (xwidth * 1.0));
                        ctx.lineTo(x + (xwidth * 0.5), y - (xwidth * 0.5));
                    }
                    ctx.stroke();

                    // Repair the condition line if it's there.
                    var high_cond = this.conditionQubits.getHighestBitIndex();
                    var low_cond = this.conditionQubits.getLowestBitIndex();
                    var do_line = false;
                    if (qubitIndex == low)
                    {
                        if (low_cond < low)
                            do_line = true;
                    }
                    else
                    {
                        if (high_cond > high)
                            do_line = true;
                        ctx.fillStyle = 'black';
                        fillCircle(ctx, x, y - xwidth, xwidth * 0.25);
                    }
                    if (do_line)
                    {
                        ctx.lineWidth = 2;
                        ctx.strokeStyle = 'black';
                        ctx.beginPath();
                        ctx.moveTo(x, y + xwidth);
                        ctx.lineTo(x, y - xwidth);
                        ctx.stroke();
                    }
                }

                // Now draw the "root" symbol.
                if (qubitIndex == high)
                {
                    if (this.op == 'rootexchange' || this.op == 'rootexchange_inv')
                    {
                        ctx.save();
                        ctx.translate(x + xwidth, y - xwidth);
                        ctx.scale(0.75, 0.75);
                        ctx.lineWidth = 1;
                        ctx.fillStyle = 'white';
                        ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
                        ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);

                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        var hradx = 0.4 * radius;
                        var hrady = 0.6 * radius;
                        if (this.op == 'rootexchange_inv')
                            hradx = -hradx;
                        ctx.lineTo(-2.0 * hradx, 0.25 * hrady);
                        ctx.lineTo(-hradx, hrady);
                        ctx.lineTo(0, -hrady);
                        ctx.lineTo(2.0 * hradx, -hrady);
                        ctx.stroke();
                        ctx.restore();
                    }
                }


            }
            else
            {
                var xwidth = radius * 0.75;
                // Draw the x
                if (this.op == 'dual_rail_beamsplitter')
                {
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x - xwidth, y);
                    ctx.lineTo(x + xwidth, y);
                    ctx.stroke();

                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x - xwidth, y);
                    if (qubitIndex == high)
                    {
                        ctx.lineTo(x - 0.5 * xwidth, y - 0.7 * xwidth);
                        ctx.lineTo(x + 0.5 * xwidth, y - 0.7 * xwidth);
                    }
                    else
                    {
                        ctx.lineTo(x - 0.5 * xwidth, y + 0.7 * xwidth);
                        ctx.lineTo(x + 0.5 * xwidth, y + 0.7 * xwidth);
                    }
                    ctx.lineTo(x + xwidth, y);
                    ctx.stroke();
                }
                else
                {
                    // exchange, separated
                    var important_bits = 0;
                    if (staff.wire_grid[slot].getBit(high))
                        important_bits++;
                    if (staff.wire_grid[slot].getBit(low))
                        important_bits++;
                    if (important_bits == 2 || !isAllZero(this.conditionQubits))
                    {
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(x - xwidth, y - xwidth);
                        ctx.lineTo(x + xwidth, y + xwidth);
                        ctx.moveTo(x - xwidth, y + xwidth);
                        ctx.lineTo(x + xwidth, y - xwidth);
                        ctx.stroke();
                    }
                }

                // Now draw the "root" symbol.
                if (this.op == 'rootexchange' || this.op == 'rootexchange_inv')
                {
                    ctx.save();
                    ctx.translate(x + xwidth, y);
                    ctx.scale(0.75, 0.75);
                    ctx.lineWidth = 1;
                    ctx.fillStyle = 'white';
                    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
                    ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);

                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    var hradx = 0.4 * radius;
                    var hrady = 0.6 * radius;
                    if (this.op == 'rootexchange_inv')
                        hradx = -hradx;
                    ctx.lineTo(-2.0 * hradx, 0.25 * hrady);
                    ctx.lineTo(-hradx, hrady);
                    ctx.lineTo(0, -hrady);
                    ctx.lineTo(2.0 * hradx, -hrady);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }
        else if (this.op == 'chadamard' || this.op == 'hadamard')
        {
            ctx.lineWidth = 1;
            ctx.fillStyle = 'white';
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
            ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);

            ctx.lineWidth = 2;
            ctx.beginPath();
            var hradx = 0.4 * radius;
            var hrady = 0.6 * radius;
            ctx.lineTo(x - hradx, y - hrady);
            ctx.lineTo(x - hradx, y + hrady);
            ctx.lineTo(x - hradx, y);
            ctx.lineTo(x + hradx, y);
            ctx.lineTo(x + hradx, y - hrady);
            ctx.lineTo(x + hradx, y + hrady);
            ctx.stroke();
        }
        else if (this.op == 'y')
        {
            ctx.lineWidth = 1;
            ctx.fillStyle = 'white';
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
            ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);

            ctx.lineWidth = 2;
            ctx.beginPath();
            var hradx = 0.4 * radius;
            var hrady = 0.6 * radius;
            ctx.lineTo(x - hradx, y - hrady);
            ctx.lineTo(x, y);
            ctx.lineTo(x + hradx, y - hrady);
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + hrady);
            ctx.stroke();
        }
        else if (this.op == 'push_mixed' || this.op == 'use_mixed')
        {
            ctx.lineWidth = 1;
            ctx.fillStyle = 'white';
            if (this.op == 'use_mixed')
            {
                ctx.fillRect(x - radius, y - radius, radius, radius * 2);
                ctx.lineWidth = 1;
                ctx.strokeStyle = '#FFA372';
                ctx.beginPath();
                ctx.moveTo(x - 0.5 * radius, y - 0.5 * staff.gridSize);
                ctx.lineTo(x,          y);
                ctx.lineTo(x - 0.5 * radius, y + 0.5 * staff.gridSize);
                ctx.stroke();
            }
            else
            {
                ctx.fillRect(x, y - radius, radius, radius * 2);
                ctx.lineWidth = 1;
                ctx.strokeStyle = '#FFA372';
                ctx.beginPath();
                ctx.moveTo(x - 0.5 * radius, y - 0.5 * staff.gridSize);
                ctx.lineTo(x,          y);
                ctx.lineTo(x - 0.5 * radius, y + 0.5 * staff.gridSize);
                ctx.stroke();
            }
        }
        else if (this.op == 'optical_beamsplitter' || this.op == 'coptical_beamsplitter')
        {
            ctx.lineWidth = 1;
            ctx.fillStyle = 'white';
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
//          ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);

            ctx.lineWidth = 1;
            ctx.beginPath();
            var hradx = 0.5 * radius;
            var hrady = 0.5 * radius;
            ctx.moveTo(x - radius, y - hrady);
            ctx.lineTo(x - hradx,  y - hrady);
            ctx.lineTo(x + hradx,  y + hrady);
            ctx.lineTo(x + radius, y + hrady);

            ctx.moveTo(x - radius, y + hrady);
            ctx.lineTo(x - hradx,  y + hrady);
            ctx.lineTo(x + hradx,  y - hrady);
            ctx.lineTo(x + radius, y - hrady);
            ctx.stroke();

            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - hradx,  y);
            ctx.lineTo(x + hradx,  y);
            ctx.stroke();
        }
        else if (this.op == 'crotatex' || this.op == 'rotatex'
                || this.op == 'crotatey' || this.op == 'rotatey'
                || this.op == 'crotatez' || this.op == 'rotatez')
        {
            ctx.lineWidth = 1;
            ctx.fillStyle = 'white';
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
            ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);

            ctx.lineWidth = 2;
            ctx.beginPath();
            var hradx = 0.4 * radius;
            var hrady = 0.6 * radius;
            x -= hradx * 1.0;
            hradx *= 0.7;
            ctx.moveTo(x - hradx, y + hrady);
            ctx.lineTo(x - hradx, y - hrady);
            ctx.lineTo(x + hradx * 0.8, y - hrady);
            ctx.lineTo(x + hradx, y - hrady * 0.75);
            ctx.lineTo(x + hradx, y - hrady * 0.25);
            ctx.lineTo(x + hradx * 0.8, y);
            ctx.lineTo(x - hradx, y);
            ctx.lineTo(x + hradx * 0.0, y);
            ctx.lineTo(x + hradx, y + hrady);
            ctx.stroke();

            hradx = 0.4 * radius;
            x += hradx * 2.0;
            hradx *= 0.9;
            y += hradx * 1.0;
            hrady *= 0.7;
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (this.op == 'crotatex' || this.op == 'rotatex')
            {
                ctx.moveTo(x - hradx, y - hrady);
                ctx.lineTo(x + hradx, y + hrady);
                ctx.moveTo(x + hradx, y - hrady);
                ctx.lineTo(x - hradx, y + hrady);
            }
            else if (this.op == 'crotatey' || this.op == 'rotatey')
            {
                ctx.moveTo(x + hradx, y - hrady);
                ctx.lineTo(x, y);
                ctx.moveTo(x - hradx, y - hrady);
                ctx.lineTo(x, y);
                ctx.lineTo(x, y + hrady);
            }
            else if (this.op == 'crotatez' || this.op == 'rotatez')
            {
                hradx *= 0.8;
                hrady *= 0.9;
                ctx.moveTo(x - hradx, y - hrady);
                ctx.lineTo(x + hradx, y - hrady);
                ctx.lineTo(x - hradx, y + hrady);
                ctx.lineTo(x + hradx, y + hrady);
            }
            ctx.stroke();
        }
        else if (this.op == 'crootnot' || this.op == 'crootnot_inv')
        {
            ctx.lineWidth = 1;
            ctx.fillStyle = 'white';
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
            ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);

            ctx.lineWidth = 2;
            ctx.beginPath();
            var hradx = 0.4 * radius;
            var hrady = 0.6 * radius;
            if (this.op == 'crootnot_inv')
                hradx = -hradx;
            ctx.lineTo(x - 2.0 * hradx, y + 0.25 * hrady);
            ctx.lineTo(x - hradx, y + hrady);
            ctx.lineTo(x, y - hrady);
            ctx.lineTo(x + 2.0 * hradx, y - hrady);
            ctx.stroke();
        }
        else if (this.op == 'read' || this.op == 'postselect')
        {
            ctx.fillStyle = 'white';
            ctx.lineWidth = 1;
            ctx.fillRect(x - radius * 0.5, y - radius, radius * 1.5, radius * 2);

            if (1)
            {
                // new D symbol
                var radx = 0.99 * radius;
                // Draw the output value
                if (this.op == 'postselect' ||
                    (qc_options.show_read_bit_values && this.recentReadValue != null))
                {
                    var val = this.writeValue;
                    ctx.fillStyle = '#ddd';
                    if (this.op == 'read')
                    {
                        ctx.strokeStyle = '#48f';
                        val = getBit(this.recentReadValue, qubitIndex);
                    }

                    if (val)
                    {
                        // Make it glow
/*
                        ctx.globalAlpha = 0.25;
                        ctx.fillStyle = '#fe8';
                        fillCircle(ctx, x + radx * 0.0, y, radx * 0.5 * 3.0);
                        fillCircle(ctx, x + radx * 0.0, y, radx * 0.5 * 2.5);
                        fillCircle(ctx, x + radx * 0.0, y, radx * 0.5 * 2.0);
                        fillCircle(ctx, x + radx * 0.0, y, radx * 0.5 * 1.5);
                        ctx.globalAlpha = 1.0;
*/
                        ctx.fillStyle = '#ffa';
                    }
                    fillCircle(ctx, x - radius * 0.5, y, radx, 90, 270);
                    ctx.fillStyle = 'white';
                    ctx.lineWidth = 1.5;
                    if (val)
                    {
                        // Draw a little one
                        ctx.beginPath();
                        ctx.moveTo(x, y - radx * 0.4);
                        ctx.lineTo(x, y + radx * 0.4);
                        ctx.stroke();
                    }
                    else
                    {
                        // Draw a little zero
                        strokeCircle(ctx, x, y, radx * 0.3, 0, 360);
                    }
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 0.25;
                }
                ctx.beginPath();
                var radx = 0.99 * radius;
                ctx.moveTo(x - radius * 0.5, y - radx);
                ctx.lineTo(x - radius * 0.5, y + radx);
                ctx.stroke();
                strokeCircle(ctx, x - radius * 0.5, y, radx, 90, 270);
                ctx.lineWidth = 1;
            }
            else
            {
                // Old < symbol
                ctx.beginPath();
                var radx = 0.5 * radius;
                var rady = 0.7 * radius;
                ctx.lineTo(x + radx, y + rady);
                ctx.lineTo(x - radius, y);
                ctx.lineTo(x + radx, y - rady);
                ctx.stroke();
            }
        }
        else if (this.op == 'write')
        {
            ctx.fillStyle = 'white';
            ctx.lineWidth = 1;
//            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

            var radx = 0.5 * radius;
            var rady = 0.7 * radius;
            if (qc_options.show_write_bit_values)  // Draw the write input value
            {
                if (getBitfieldBit(this.writeValue, qubitIndex))
                {
                    // Make it glow
                    ctx.fillStyle = '#ffa';
                    /*
                    ctx.globalAlpha = 0.25;
                    fillCircle(ctx, x - radx * 0.5, y, radx * 3.0);
                    fillCircle(ctx, x - radx * 0.5, y, radx * 2.5);
                    fillCircle(ctx, x - radx * 0.5, y, radx * 2.0);
                    fillCircle(ctx, x - radx * 0.5, y, radx * 1.5);
                    ctx.globalAlpha = 1.0;
                    */
                }
            }

            ctx.lineWidth = 1;
            if (staff.draw_double_lines)
            {
                var xx = x + radius * 0.4;
                var y1 = y - radius * 2.5 * staff.double_line_space;
                var y2 = y + radius * 2.5 * staff.double_line_space;
                radx *= 0.8;
                rady *= 0.5;
                ctx.beginPath();
                ctx.moveTo(xx - radx, y1 + rady);
                ctx.lineTo(xx + radius, y1);
                ctx.lineTo(xx - radx, y1 - rady);
                ctx.moveTo(xx - radx, y2 + rady);
                ctx.lineTo(xx + radius, y2);
                ctx.lineTo(xx - radx, y2 - rady);
                ctx.fill();
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'black';
                ctx.stroke();
            }
            else
            {
                ctx.beginPath();
                ctx.moveTo(x - radx, y + rady);
                ctx.lineTo(x + radius, y);
                ctx.lineTo(x - radx, y - rady);
                ctx.fill();
//                ctx.lineWidth = 4;
//                ctx.strokeStyle = 'white';
//                ctx.stroke();
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'black';
                ctx.stroke();
            }
            // Draw the write values
            if (qc_options.show_write_bit_values && !this.is_fock)  // Draw the write input value
            {
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = '#48f';
                if (getBitfieldBit(this.writeValue, qubitIndex))
                {
                    // Draw a little one
                    ctx.beginPath();
                    ctx.moveTo(x - radx * 1.0, y - radx * 0.7);
                    ctx.lineTo(x - radx * 1.0, y + radx * 0.7);
                    ctx.stroke();
                }
                else
                {
                    // Draw a little zero
                    strokeCircle(ctx, x - radx * 1.0, y, radx * 0.5, 0, 360);
                }
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
            }


        }


        // Draw noise
        if (this.noise_level > 0 && qc_options.draw_noise)
        {
            var level = this.noise_level / qc_options.noise_magnitude;
//            console.log('error = ' + level);
            var radial_grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.25);
            radial_grad.addColorStop(0,'rgba(255,100,0,255)');
            radial_grad.addColorStop(1,'rgba(255,0,0,0');
            ctx.globalAlpha = level;
            ctx.fillStyle = radial_grad;
            fillCircle(ctx, x, y, radius * 2.25);
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 1;
        }


    }

    this.drawBlockJobs = function(ctx, x, y, radius)
    {
        ctx.lineWidth = 1;
        ctx.fillStyle = 'gray';

        for (var i = 0; i < this.blockJobsInUse; ++i)
        {
            var bj = this.blockJobs[i];
            if (this.started && !this.finished)
            {
                if (bj.finished)
                    ctx.fillStyle = 'green';
                else if (bj.started)
                    ctx.fillStyle = 'yellow';
                else
                    ctx.fillStyle = 'red';
            }

            ctx.beginPath();
            ctx.lineTo(x - radius, y + 4 * i);
            ctx.lineTo(x + radius, y + 4 * i);
            ctx.stroke();
        }
    }
}

function QStaff(qReg, qPanel, pos)
{
    if (pos == null)
        pos = new Vec2(0, 0);
    this.qReg = qReg;
    this.qPanel = qPanel;
    qReg.staff = this;
    if (qPanel)
        qPanel.staff = this;
    
    this.scale = 1.0;
    this.baseScale = 1.0;
    this.wheelScale = 1.0;

    this.margin_x = 20;
    this.margin_y = 50;
    this.gridSize = 20;
    this.photonic_view = false;
    this.classical_view = true;
    this.photonic_stretch = 1.0;    // When photonic display is on, stretch it out this much
	this.gridSpacing = 4;
    this.numColumns = 20;
    this.nameWidth = 0;
    this.codeLabel = null;
    this.hoverInstruction = -1;
    this.hoverFockPattern = null;

    this.do_advance_on_add = true;
    this.draw_double_lines = false;
    this.double_line_space = 0.2;

    this.pos = new Vec2(pos.x, pos.y);
//    this.size = new Vec2(this.gridSize * this.numColumns, 2 * this.margin + this.gridSize * qReg.numQubits);
    
    if (qPanel && qPanel.canvas)
        this.size = new Vec2(this.qPanel.canvas.width, this.qPanel.canvas.height);
    else
        this.size = new Vec2(0, 0);

    this.insertionStart = 0;
    this.instructions = new Array();
    this.instructions.push(new QInstruction("cnot", 0x01, 0x00, 0.0, this.codeLabel));
    this.instructions.push(new QInstruction("rotate", 0x01, 0x02, 0.0, this.codeLabel));
    this.instructions.push(new QInstruction("phaseshift", 0x01, 0x04, 0.0, this.codeLabel));

	this.trackingEnabled = true;	// Turn this on to allow the staff to record every QC action.
    qc_options.show_write_bit_values = true;
    qc_options.show_read_bit_values = true;
    qc_options.show_rotation_angle_values = true;

    qReg.widgets.push(this);
    if (qPanel)
        qPanel.widgets.push(this);

    this.calculateScale = function()
    {
        this.scale = this.baseScale;
        this.scale *= this.wheelScale;
    }

    this.drawBits = function(ctx)
    {
        var font_size = 14;
        this.nameWidth = 0;
        var nameTextWidth = 0;
        var namePlaceWidth = 0;

        this.max_bits_to_draw = ctx.canvas.height / (this.gridSize * this.wheelScale);
        if (this.max_bits_to_draw > this.qReg.numQubits)
            this.max_bits_to_draw = this.qReg.numQubits;

        // Measure the names
        for (var bit = 0; bit < this.max_bits_to_draw; ++bit)
        {
            var qubitName = this.qReg.getQubitIntName(bit);
            var qubitPlace = '0x' + this.qReg.getQubitIntPlace(bit);
            var x = 1.75 * radius;
            var y = 0;
            draw_text(ctx, '', x, y, font_size, 'bold', '#000', 'left', 'middle');
            nameTextWidth = Math.max(nameTextWidth, ctx.measureText(qubitName).width);
            namePlaceWidth = Math.max(namePlaceWidth, ctx.measureText(qubitPlace).width);
        }
        this.nameWidth = 10 + nameTextWidth + namePlaceWidth;

        ctx.save();
        {
            var oldName = null;
            for (var bit = 0; bit < this.max_bits_to_draw; ++bit)
            {
                // Draw the phase discs
                var radius = this.gridSize * 0.5 * 0.8;
            
                ctx.lineWidth = 1;

                if (0)
                {
                    strokeCircle(ctx, 0, 0, radius);

                    var bitMask = 1 << bit;
                    var probability = this.qReg.peekQubitProbability(bitMask);

                    var thetaDeg = -90.0 * (1.0 - probability);
                    var thetaRad = thetaDeg * Math.PI / 180.0;
                    var sval = Math.sin(thetaRad);
                    var cval = Math.cos(thetaRad);

                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.lineTo(sval * -radius, cval * -radius);
                    ctx.lineTo(sval *  radius, cval *  radius);
                    ctx.stroke();
                }

                var x = 1.75 * radius + this.nameWidth;
                var y = 0;
                draw_text(ctx, '0x' + this.qReg.getQubitIntPlace(bit), x, y, font_size, 'bold', '#000', 'right', 'middle');

                var qubitName = this.qReg.getQubitIntName(bit);
                if (qubitName != oldName)
                {
                    oldName = qubitName;
                    // scan ahead to see how many rows fit
                    var sharedRows = 0;
                    for (var rbit = bit + 1; rbit < this.max_bits_to_draw && this.qReg.getQubitIntName(rbit) == qubitName; rbit++)
                        sharedRows++;
                    x = 1.75 * radius + this.nameWidth - (10 + namePlaceWidth);
                    y = this.gridSize * (sharedRows / 2);
                    if (qubitName != '(util)')
                        draw_text(ctx, qubitName, x, y, font_size, 'bold', '#000', 'right', 'middle');

                    ctx.save();
                    ctx.strokeStyle = 'rgba(0, 100, 125, 1.0)';
                    ctx.lineWidth = 1;
                    var cornerRadius = 0.5 * this.gridSize;
                    rounded_rect_leftonly(ctx, x + 5, -0.5 * this.gridSize, 10, this.gridSize * (sharedRows + 1), cornerRadius, true, false);
                    ctx.restore();
                }

                ctx.translate(0, this.gridSize);
            }
        }
        ctx.restore();
    }

    // Delete all instructions
    this.clear = function()
    {
        this.clearParallelization();
        this.draw_double_lines = false;
        this.insertionStart = 0;
        //TODO: Wait for current instruction to finish
        for (var i = 0; i < this.instructions.length; ++i)
        {
            var inst = this.instructions[i];
            this.instructions[i] = null;
            delete inst;
        }
        this.instructions = new Array();
//        this.draw();
    }

    // Delete all instructions
    this.rewind_insertion_to_start = function()
    {
        this.hoverFockPattern = null;
        this.qReg.use_photon_sim = false;
        this.qReg.mixed_states = null;
        this.qReg.current_mix = null;

        if (this.qReg.chp)
            this.qReg.chp.active = false;
        this.insertionStart = 0;
        for (var i = 0; i < this.instructions.length; ++i)
        {
            var inst = this.instructions[i];
            inst.recentPeekValues = null;
            inst.recentReadValue = null;
        }        
//        this.qReg.write(null, 0);
        this.qReg.setZero();
        this.qReg.pokeComplexValue(0, 1, 0);

        if (qc && qc.panel_chart)
            qc.panel_chart.startAnimation(null);
//        DrawAllPanels();
    }

    this.removeInstruction = function(index)
    {
        // If we passed an instruction instead of an index, look for it.
        if (index.op)
        {
            for (var i = 0; i < this.instructions.len; ++i)
            {
                if (this.instructions[i] = index)
                {
                    index = i;
                    break;
                }
            }
            return;
        }
        // Remove the instruction at the desired index.
        this.clearParallelization();
        this.instructions.splice(index, 1);
        if (this.insertionStart >= index)
            this.insertionStart--;
    }

    this.insertInstruction = function(index, instr)
    {
        this.clearParallelization();
        this.checkSpecialInstructions(instr);
        this.instructions.splice(index, 0, instr);
        if (this.insertionStart >= index)
            this.insertionStart++;
        return instr;
    }

    this.appendInstruction = function(instr)
    {
        return this.insertInstruction(this.instructions.length, instr);
    }

    this.advanceOnAdd = function(enable)
    {
        this.do_advance_on_add = enable;
        if (enable)
            this.advanceToEnd();
    }

    this.advanceToEnd = function()
    {
        this.advance(this.instructions.length);
    }

    this.checkSpecialInstructions = function(inst)
    {
        if (!inst)
            return;
        // If we added a beamsplitter, start drawing double lines.
//        if (inst.op == 'optical_beamsplitter')
//            this.draw_double_lines = true;
    }

    this.addInstructionAfterInsertionPoint = function(op_inst, targetQubits, conditionQubits, theta, auxQubits)
    {
		// safety catch. If we left tracking on, stop it after too many instructions.
		if (this.instructions.length > 1000000)
		{
			this.clear();
			this.disableTracking();
		}
        // If we were passed a pre-existing instruction, just set the label and put it in.
        var inst = op_inst;
        if (op_inst.op != null)
//            inst.codeLabel = this.codeLabel;
            inst = new QInstruction(inst.op, inst.targetQubits, inst.conditionQubits, inst.theta, this.codeLabel, auxQubits);
        else
            inst = new QInstruction(op_inst, targetQubits, conditionQubits, theta, this.codeLabel, auxQubits);

		if (!this.trackingEnabled)
		{
			inst.execute(this.qReg, 1);
			return null;
		}

        this.checkSpecialInstructions(inst);
        this.instructions.splice(this.insertionStart, 0, inst);
//        this.draw();
        if (this.do_advance_on_add)
            this.advance(1);
        return inst;
    }
	
	this.enableTracking = function()
	{
		this.trackingEnabled = true;
	}

	this.disableTracking = function()
	{
		this.trackingEnabled = false;
	}

    this.runLabel = function(label)
    {
        var final_index = -1;
        for (var inst_index = 0; inst_index < this.instructions.length; ++inst_index)
        {
            var inst = this.instructions[inst_index];
            if (inst.codeLabel == label)
            {
                inst.execute(this.qReg, 1);
                final_index = inst_index + 1;
            }
        }
        if (final_index < 0)
        {
            console.log('ERROR: No instructions with label "' + label + '" were found.');
            return false;
        }
        this.insertionStart = final_index;
        this.changed();
        return true;
    }

    // If the label exists, go there and play to the end
    this.repeatFromLabel = function(label)
    {
        for (var i = 0; i < this.instructions.length; ++i)
        {
            var inst = this.instructions[i];
            if (inst.codeLabel == label)
            {
                this.insertionStart = i;
                this.advanceToEnd();
                return true;
            }
        }
        return false;
    }

    this.advance = function(count)
    {
        this.hoverFockPattern = null;
		if (!this.trackingEnabled)
			return;

        if (count < 0 && !qc_options.allow_backward_eval)
        {
            // If it's just ine step and all not or cnot, always allow back-eval
            // because it looks nice.
            var ok_to_go_backwards = false;
            if (count == -1 && !this.parallelized && this.insertionStart > 0)
            {
                var inst = this.instructions[this.insertionStart - 1];
                if (inst.op == 'not' || inst.op == 'cnot')
                    ok_to_go_backwards = true; 
            }
            if (!ok_to_go_backwards)
            {
                var pos = this.insertionStart + count;
                this.rewind_insertion_to_start();
                if (pos < 0)
                    pos = 0;
                this.advance(pos);
                return;
            }
        }

        var direction = 1;
        if (count < 0)
        {
            direction = -1;
            count = -count;
        }
        var numSlots = this.instructions.length;
        if (this.instructions_parallel)
            numSlots = this.instructions_parallel.length;

        var instruction = null;
        var anim_val = this.qReg.animateWidgets;
        this.qReg.animateWidgets = false;
        for (var i = 0; i < count; ++i)
        {
            // Turn on animation just for the last instruction.
            if (i == count - 1)
                this.qReg.animateWidgets = anim_val;

            if (this.insertionStart == 0 && (direction < 0))
                return;
            if (this.insertionStart == numSlots && (direction > 0))
                return;

            var slot = this.insertionStart;
            if (direction < 0)
            {
                slot = this.insertionStart - 1;
                this.insertionStart--;
            }
            else
            {
                this.insertionStart++;
            }

            if (this.instructions_parallel)
            {
                for (var pinst = 0; pinst < this.instructions_parallel[slot].length; ++pinst)
                {
                    instruction = this.instructions_parallel[slot][pinst];
                    instruction.execute(this.qReg, direction);
                }
            }
            else
            {
                instruction = this.instructions[slot];
                instruction.execute(this.qReg, direction);
            }
        }
        this.qReg.animateWidgets = anim_val;
//        this.draw();
        if (this.qReg.animateWidgets && qc && qc.panel_chart)
            qc.panel_chart.startAnimation(instruction);
    }

    this.setCodeLabel = function(codeLabel)
    {
        this.codeLabel = codeLabel;
    }

    this.drawCodeLabels = function(ctx)
    {
        var gx = this.gridSize * this.photonic_stretch;
        var gy = this.gridSize;
        ctx.save();
        {
            var currentLabel = null;
            var labelStartX = -1;
            var labelEndX = 0;

            for (var inst = 0; inst < this.instructions.length; ++inst)
            {
                // Draw the phase discs
                var instruction = this.instructions[inst];

                var thisLabel = instruction.codeLabel;
                var nextLabel = null;
                if (inst < this.instructions.length - 1)
                    nextLabel = this.instructions[inst + 1].codeLabel;

                if (nextLabel == thisLabel)
                {
                    labelEndX++;
                }
                else
                {
                    // Draw the label
                    if (thisLabel)
                    {
                        var gap = gx * 0.1;
                        var x1 = labelStartX;
                        var x2 = labelEndX;

                        // If we're parallelized, re-mmap the labels
                        if (this.instructions_parallel)
                        {
                            x1 = 1000000;
                            x2 = -1;
                            for (var np = labelStartX; np <= labelEndX; ++np)
                            {
                                if (np >= 0 && this.instructions[np].parallel_slot != null)
                                {
                                    x1 = Math.min(x1, this.instructions[np].parallel_slot);
                                    x2 = Math.max(x2, this.instructions[np].parallel_slot);
                                    if  (x1 == 0)
                                        x1 = -1;
                                }
                            }
                        }

                        var x = gx * x1 + gap + gx * 0.5;
                        var y = -1.3 * gy;
                        var width = gx * (x2 - x1) - 2 * gap;
                        var height = (this.qReg.numQubits + 1.3) * gy;
                        var cornerRadius = this.gridSize * 0.5;
                        var do_stroke = true;
                        var do_fill = true;
                        if (this.photonic_view)
                            do_fill = false;
                        ctx.save();
//                        ctx.opacity = 0.4;
//                        ctx.fillStyle = '#ddd';
                        ctx.strokeStyle = 'rgba(0, 100, 125, 1.0)';
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                        rounded_rect(ctx, x, y, width, height, cornerRadius, false, do_fill);
                        rounded_rect_nosides(ctx, x, y, width, height, cornerRadius, do_stroke, false);

                        ctx.fillStyle = 'rgba(0, 100, 125, 1.0)';
                        var font_size = 12;
                        var tx = x + 0.5 * width;
                        var topy = y - 2;
                        var boty = y + height + 3;
                        draw_text(ctx, thisLabel, tx, topy, font_size, '', 'rgba(0, 100, 125, 1.0)', 'center', 'bottom');
                        draw_text(ctx, thisLabel, tx, boty, font_size, '', 'rgba(0, 100, 125, 1.0)', 'center', 'top');

                        ctx.restore();
                    }

                    // Start the next label
                    labelStartX = labelEndX;
                    labelEndX++;
                    if (labelStartX * this.wheelScale > ctx.canvas.width)
                        break;
                }
            }
        }
        ctx.restore();
    }

    this.construct_LOJS = function()
    {
        var lojs = [];
        var xmax = 0;
        var ymax = 0;

        for (var inst = 0; inst < this.instructions.length; ++inst)
        {
            var instruction = this.instructions[inst];
            var xpos = inst;
            var ypos = 0;
            if (instruction.parallel_slot != null)
                xpos = instruction.parallel_slot;
            var ratio = 0.5;
            for (var bit = 0; bit < this.qReg.numQubits; ++bit)
            {
                if (instruction.targetQubits.getBit(bit))
                {
                    ypos = bit;
                    break;
                }
            }
            if (instruction.op == "exchange" && isAllZero(instruction.conditionQubits))
            {
                lojs.push({'type':'crossing','x':xpos,'y':ypos});
            }
            else if (instruction.op == 'write')
            {
                lojs.push({'type':'fockstate','x':xpos,'y':ypos,'n':1});
            }
            else
            {
                lojs.push({'type':'coupler','x':xpos,'y':ypos,'ratio':ratio});
            }
            xmax = Math.max(xpos, xmax);
            ymax = Math.max(ypos, ymax);
        }
        // Now center everything
        var xoff = Math.floor(xmax * 0.5);
        var yoff = Math.floor(ymax * 0.5);
        for (var i = 0; i < lojs.length; ++i)
        {
            lojs[i].x -= xoff;
            lojs[i].y -= yoff;
        }
//        console.log(lojs);
//        console.log(JSON.stringify(lojs));
        return lojs;
    }






    this.old_construct_IPKISS = function()
    {
        var ipkiss = '';
        var xmax = 0;
        var ymax = 0;
        var xscale = 50;
        var yscale = 10;
        var indent = '        ';

        // First count our slots and buils a usage matrix
        var num_slots = this.instructions.length;
        if (this.instructions_parallel)
            num_slots = this.instructions_parallel.length;
        var usage = [];
        for (var row = 0; row < this.qReg.numQubits; ++row)
        {
            usage.push([]);
            for (var col = 0; col < num_slots; ++col)
                usage[row].push(false);
        }


        for (var inst = 0; inst < this.instructions.length; ++inst)
        {
            var instruction = this.instructions[inst];
            var xpos = inst;
            var ypos = 0;
            if (instruction.parallel_slot != null)
                xpos = instruction.parallel_slot;
            var ratio = 0.5;
            for (var bit = 0; bit < this.qReg.numQubits; ++bit)
            {
                if (instruction.targetQubits.getBit(bit))
                {
                    ypos = bit;
                    break;
                }
            }
            if (instruction.op == "beamsplitter" && isAllZero(instruction.conditionQubits))
            {
                usage[ypos][xpos] = true;
                usage[ypos + 1][xpos] = true;
                var str = '';
                var x1 = xpos * xscale;
                var y1 = ypos * yscale;
                str += indent + 'self.elems += SRef(self.coupler, position = ('+x1+','+y1+'))\n';
/*
                str += 'self.elems += Line(WG_LAYER,begin_coord = ('
                        +x1.toFixed(6)+','+y1.toFixed(6)+'), end_coord = ('
                        +x2.toFixed(6)+','+y2.toFixed(6)+'), line_width = '
                        +width+')\n';
                str += 'self.elems += Line(WG_LAYER,begin_coord = ('
                        +x2.toFixed(6)+','+y1.toFixed(6)+'), end_coord = ('
                        +x1.toFixed(6)+','+y2.toFixed(6)+'), line_width = '
                        +width+')\n';
*/
                ipkiss += str;
            }
            else if (instruction.op == 'write')
            {
//                lojs.push({'type':'fockstate','x':xpos,'y':ypos,'n':1});
            }
            else
            {
//                lojs.push({'type':'coupler','x':xpos,'y':ypos,'ratio':ratio});
            }
            xmax = Math.max(xpos, xmax);
            ymax = Math.max(ypos, ymax);
        }
        // Now fill in the straight guides
        {
            for (var row = 0; row < usage.length; ++row)
            {
                for (var col = 0; col < usage[row].length; ++col)
                {
                    if (!usage[row][col])
                    {
                        var line_width = 0.5;
                        var x1 = (col - 0.5) * xscale;
                        var y1 = (row - 0.5) * yscale;
                        var x2 = (col + 0.5) * xscale;
                        var y2 = y1;
                        var str = indent + 'self.elems += Line(WG_LAYER,begin_coord = ('
                            +x1.toFixed(6)+','
                            +y1.toFixed(6)+'), end_coord = ('
                            +x2.toFixed(6)+','
                            +y2.toFixed(6)+'), line_width = '+line_width.toFixed(6)+')\n';
                        ipkiss += str;
                    }
                }
            }
        }



        console.log(ipkiss);
        return ipkiss;
    }


    this.construct_IPKISS = function()
    {
        var ipkiss = '';
        var xmax = 0;
        var ymax = 0;
        var xscale = 50;
        var yscale = 30;
        var xoff = 50;
        var yoff = 200;
        var indent = '        ';

        // First count our slots and buils a usage matrix
        var num_slots = this.instructions.length;
        if (this.instructions_parallel)
            num_slots = this.instructions_parallel.length;

        for (var inst = 0; inst < this.instructions.length; ++inst)
        {
            var instruction = this.instructions[inst];
            var xpos = inst;
            var ypos = 0;
            if (instruction.parallel_slot != null)
                xpos = instruction.parallel_slot;
            if (instruction.op == "write")
            {
                var str = '';
                for (var bit = 0; bit < this.qReg.numQubits; ++bit)
                {
                    if (instruction.targetQubits.getBit(bit))
                    {
                        ypos = bit;
                        str += indent + 'rail_ports['+ypos+'] = array.ports[next_grating]\n';
                        str += indent + 'next_grating += 1 \n';
                    }
                }
                ipkiss += str;
            }
            else if (instruction.op == "dual_rail_beamsplitter")
            {
                var low_pos = instruction.targetQubits.getLowestBitIndex();
                var high_pos = instruction.targetQubits.getHighestBitIndex();
                var is_mzi = false;
                if (inst < this.instructions.length - 2)
                {
                    var instruction2 = this.instructions[inst + 1];
                    var instruction3 = this.instructions[inst + 2];
                    if (instruction2.op == "phase" && instruction3.op == "dual_rail_beamsplitter")
                    {
                        var ph_low = instruction2.conditionQubits.getLowestBitIndex();
                        var ph_high = instruction2.conditionQubits.getHighestBitIndex();
                        var bs_low = instruction3.targetQubits.getLowestBitIndex();
                        var bs_high = instruction3.targetQubits.getHighestBitIndex();
                        if (ph_low == ph_high && (ph_low == low_pos || ph_low == high_pos))
                        {
                            if (bs_low == low_pos && bs_high == high_pos)
                            {
                                is_mzi = true;
                            }
                        }
                    }
                }
                var str = '';
                if (is_mzi)
                {
                    var x1 = 'xoffset + '+xpos+' * xscale';
                    var y1 = 'yoffset + '+(0.5 * (low_pos + high_pos))+' * yscale + coupler_width / 2';
                    str += indent + 'mzi = SRef(mzi_t, position = ['+x1+','+y1+'])\n';
                    str += indent + 'elems += mzi\n';
                    str += indent + 'if rail_ports['+high_pos+']:\n';
                    str += indent + '    elems += ManhattanWgConnector(rail_ports['+high_pos+'], mzi.ports[0])\n';
                    str += indent + 'if rail_ports['+low_pos+']:\n';
                    str += indent + '    elems += ManhattanWgConnector(rail_ports['+low_pos+'], mzi.ports[1])\n';
                    str += indent + 'rail_ports['+high_pos+'] = mzi.ports[2]\n';
                    str += indent + 'rail_ports['+low_pos+'] = mzi.ports[3]\n';
                    inst += 2;  // Skip the next two instructions
                }
                else
                {
                    var x1 = 'xoffset + '+xpos+' * xscale';
                    var y1 = 'yoffset + '+(0.5 * (low_pos + high_pos))+' * yscale + coupler_width / 2';
                    str += indent + 'bs = SRef(bs_t, position = ['+x1+','+y1+'])\n';
                    str += indent + 'elems += bs\n';
                    str += indent + 'if rail_ports['+high_pos+']:\n';
                    str += indent + '    elems += ManhattanWgConnector(rail_ports['+high_pos+'], bs.ports[0])\n';
                    str += indent + 'if rail_ports['+low_pos+']:\n';
                    str += indent + '    elems += ManhattanWgConnector(rail_ports['+low_pos+'], bs.ports[1])\n';
                    str += indent + 'rail_ports['+high_pos+'] = bs.ports[2]\n';
                    str += indent + 'rail_ports['+low_pos+'] = bs.ports[3]\n';
                }
                ipkiss += str;
            }
            else if (instruction.op == "phase")
            {
                var low_pos = instruction.conditionQubits.getLowestBitIndex();
                var high_pos = instruction.conditionQubits.getHighestBitIndex();
                var str = '';
                var is_cz = false;
                if (low_pos != high_pos && instruction.theta > 179.9 && instruction.theta < 180.1)
                    is_cz = true;

                if (is_cz)
                {
                    var x1 = 'xoffset + '+xpos+' * xscale';
                    var y1 = 'yoffset + '+(0.5 * (low_pos + high_pos))+' * yscale + coupler_width / 2';
                    str += indent + 'dc = SRef(dc_t, position = ['+x1+','+y1+'])\n';
                    str += indent + 'elems += dc\n';
                    str += indent + 'if rail_ports['+high_pos+']:\n';
                    str += indent + '    elems += ManhattanWgConnector(rail_ports['+high_pos+'], dc.ports[0])\n';
                    str += indent + 'if rail_ports['+low_pos+']:\n';
                    str += indent + '    elems += ManhattanWgConnector(rail_ports['+low_pos+'], dc.ports[1])\n';
                    str += indent + 'rail_ports['+high_pos+'] = dc.ports[2]\n';
                    str += indent + 'rail_ports['+low_pos+'] = dc.ports[3]\n';

                    var y1 = 'yoffset + '+(low_pos - 0.5)+' * yscale + coupler_width / 2';
                    str += indent + 'dc = SRef(dc_t, position = ['+x1+','+y1+'])\n';
                    str += indent + 'elems += dc\n';
//                    str += indent + 'if rail_ports['+high_pos+']:\n';
//                    str += indent + '    elems += ManhattanWgConnector(rail_ports['+high_pos+'], dc.ports[0])\n';
//                    str += indent + 'if rail_ports['+low_pos+']:\n';
//                    str += indent + '    elems += ManhattanWgConnector(rail_ports['+low_pos+'], dc.ports[1])\n';
//                    str += indent + 'rail_ports['+high_pos+'] = dc.ports[2]\n';
//                    str += indent + 'rail_ports['+low_pos+'] = dc.ports[3]\n';

                    var y1 = 'yoffset + '+(high_pos + 0.5)+' * yscale + coupler_width / 2';
                    str += indent + 'dc = SRef(dc_t, position = ['+x1+','+y1+'])\n';
                    str += indent + 'elems += dc\n';
//                    str += indent + 'if rail_ports['+high_pos+']:\n';
//                    str += indent + '    elems += ManhattanWgConnector(rail_ports['+high_pos+'], dc.ports[0])\n';
//                    str += indent + 'if rail_ports['+low_pos+']:\n';
//                    str += indent + '    elems += ManhattanWgConnector(rail_ports['+low_pos+'], dc.ports[1])\n';
//                    str += indent + 'rail_ports['+high_pos+'] = dc.ports[2]\n';
//                    str += indent + 'rail_ports['+low_pos+'] = dc.ports[3]\n';
                }
                else
                {
                    var x1 = 'xoffset + '+xpos+' * xscale';
                    var y1 = 'yoffset + '+low_pos+' * yscale';
                    if (1)
                    {
                        // Heater
                        str += indent + 'heater = SRef(heater_t, position = ['+x1+','+y1+'])\n';
                        str += indent + 'elems += heater\n';
                        str += indent + 'if rail_ports['+low_pos+']:\n';
                        str += indent + '    elems += ManhattanWgConnector(rail_ports['+low_pos+'], heater.ports[0])\n';
                        str += indent + 'rail_ports['+low_pos+'] = heater.ports[1]\n';
                    }
                    else
                    {
                        // Detour delay loop
                        str += indent + 'if rail_ports['+low_pos+']:\n';
                        str += indent + '    elems += ConnectorToSouth(rail_ports['+low_pos+'])\n';
                        str += indent + '    elems += ConnectorToWest(elems[-1].ports[1],end_straight = 10.)\n';
                        str += indent + '    elems += ConnectorToSouth(elems[-1].ports[1])                \n';
                        str += indent + '    elems += ConnectorToEast(elems[-1].ports[1],end_straight = 44.)\n';
                        str += indent + '    elems += ConnectorToNorth(elems[-1].ports[1])\n';
                        str += indent + '    elems += ConnectorToWest(elems[-1].ports[1],end_straight = 10.)\n';
                        str += indent + '    elems += ConnectorToNorth(elems[-1].ports[1])\n';
                        str += indent + '    elems += ConnectorToEast(elems[-1].ports[1],end_straight = 10.)\n';
                        str += indent + '    rail_ports['+low_pos+'] = elems[-1].ports[1]\n';
                    }
                }
                ipkiss += str;
            }
            else if (instruction.op == 'write')
            {
//                lojs.push({'type':'fockstate','x':xpos,'y':ypos,'n':1});
            }
            else
            {
//                lojs.push({'type':'coupler','x':xpos,'y':ypos,'ratio':ratio});
            }
            xmax = Math.max(xpos, xmax);
            ymax = Math.max(ypos, ymax);
        }
        // Now fill in the straight guides



        console.log(ipkiss);
        return ipkiss;
    }

    this.drawInstructions = function(ctx, instructionRange)
    {
        ctx.save();
        {
            var gx = this.gridSize * this.photonic_stretch;
            var gy = this.gridSize;
            for (var inst = 0; inst < this.instructions.length; ++inst)
            {
                if (instructionRange)
                {
                    if (inst < instructionRange[0] || inst > instructionRange[1])
                        continue;
                }
                ctx.save();

                var instruction = this.instructions[inst];
                var instruction_x = gx * inst;
                var slot = inst;
                if (instruction.parallel_slot != null)
                {
                    instruction_x = gx * instruction.parallel_slot;
                    instruction_x += 4 * instruction.parallel_offset;
                    slot = instruction.parallel_slot;
                }

                if (instruction_x * this.wheelScale > ctx.canvas.width + this.gridSize)
                {
                    ctx.restore();
                    break;
                }

                ctx.translate(instruction_x, 0);

                // Draw the phase discs
                var radius = this.gridSize * 0.5 * 0.8;
                var minBit = 1000;
                var maxBit = -1000;
//                console.log(instruction.targetQubits);
//    if (inst == 0) console.log('draw ' + instruction.op
//        + ' t:' + bitfieldHexString(instruction.targetQubits)
//        + ' c:' + bitfieldHexString(instruction.conditionQubits)
//        );
                // First just get the min and max bits used
                for (var bit = 0; bit < this.max_bits_to_draw; ++bit)
                {
                    if (instruction.targetQubits.getBit(bit)
                        || instruction.conditionQubits.getBit(bit))
                    {
                        if (minBit > bit) minBit = bit;
                        if (maxBit < bit) maxBit = bit;
                    }
                }

                if (!instruction.conditionQubits.isAllZero()
                    || instruction.op == 'exchange'
                    || instruction.op == 'rootexchange'
                    || instruction.op == 'rootexchange_inv'
                    || instruction.op == 'dual_rail_beamsplitter'
                    || instruction.op == 'pbs'
                    || instruction.op == 'postselect_qubit_pair'
                    || instruction.op == 'pair_source'
                    || instruction.op == 'polarization_grating_in'
                    || instruction.op == 'polarization_grating_out'
                    )
                {
                    var dim = false;
                    if (instruction.op == 'phase' && instruction.theta == 0.0)
                        dim = true;
                    if (dim)
                        ctx.globalAlpha = 0.25;
                    // This is the vertical line connecting conditions and targts
                    if (minBit < maxBit)
                    {
                        if (instruction.op == 'dual_rail_beamsplitter'
                            || instruction.op == 'pbs'
                            || instruction.op == 'postselect_qubit_pair'
                            || instruction.op == 'polarization_grating_in'
                            || instruction.op == 'polarization_grating_out')
                        {
                            if (minBit + 1 < maxBit)
                            {
                                ctx.lineWidth = 0.5;
                                ctx.beginPath();
                                ctx.moveTo(0, this.gridSize * (minBit + 0.25));
                                ctx.lineTo(0, this.gridSize * (maxBit - 0.25));
                                ctx.stroke();
                            }
                        }
                        else if (instruction.op == 'pair_source')
                        {
                            var dx = this.gridSize * 0.08;
                            ctx.lineWidth = 1;
                            ctx.strokeStyle = '#08f';
                            ctx.beginPath();
                            ctx.moveTo(-dx, this.gridSize * minBit);
                            ctx.lineTo(-dx, this.gridSize * maxBit);
                            ctx.stroke();
                            ctx.strokeStyle = '#f20';
                            ctx.beginPath();
                            ctx.moveTo(dx, this.gridSize * minBit);
                            ctx.lineTo(dx, this.gridSize * maxBit);
                            ctx.stroke();
                        }
                        else
                        {
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.moveTo(0, this.gridSize * minBit);
                            ctx.lineTo(0, this.gridSize * maxBit);
                            ctx.stroke();

                            // Now, if there are any classical bits, draw double lines
                            if (qc_options.double_ff_line)
                            {
                                var old_bit = minBit;
                                var old_classical = false;
                                var old_cond = false;
                                var old_targ = false;
                                for (var bit = minBit; bit <= maxBit; ++bit)
                                {
                                    var is_cond = instruction.conditionQubits.getBit(bit);
                                    var is_targ = instruction.targetQubits.getBit(bit);
                                    if (is_cond || is_targ)
                                    {
                                        var is_classical = !this.wire_grid[slot].getBit(bit);
                                        if ((is_cond && is_classical) || (old_cond && old_classical))
                                        {
                                            ctx.beginPath();
                                            ctx.moveTo(0, this.gridSize * bit);
                                            ctx.lineTo(0, this.gridSize * old_bit);
                                            ctx.strokeStyle = 'black';
                                            ctx.lineWidth = 4;
                                            ctx.stroke();
                                            ctx.strokeStyle = 'white';
                                            ctx.lineWidth = 2;
                                            ctx.stroke();
                                            ctx.strokeStyle = 'black';
                                            ctx.lineWidth = 2;
                                        }
                                        old_bit = bit;
                                        old_classical = is_classical;
                                        old_cond = is_cond;
                                        old_targ = is_targ;
                                    }
                                }
                            }
                        }
                    }
                    if (dim)
                        ctx.globalAlpha = 1.0;
                }

                // Add the theta label
                if (qc_options.show_rotation_angle_values)
                {
                    if ((instruction.op == 'optical_beamsplitter') 
                        || (instruction.op == 'coptical_beamsplitter') 
                        || (instruction.op == 'dual_rail_beamsplitter') 
                        || (instruction.op == 'optical_phase') 
                        || (instruction.op == 'phase')
                        || (instruction.op == 'rotatex')
                        || (instruction.op == 'rotatey')
                        || (instruction.op == 'rotatez')
                        || (instruction.op == 'crotatex')
                        || (instruction.op == 'crotatey')
                        || (instruction.op == 'crotatez')
                        )
                    {
                        ctx.save();
                        ctx.font = 'bold 11px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        var x = 0;
                        var y = -this.gridSize * 1.0;

                        var label = '';

                        if (instruction.op == 'optical_beamsplitter'
                            || instruction.op == 'coptical_beamsplitter'
                            || instruction.op == 'dual_rail_beamsplitter'
                            || instruction.op == 'pair_source'
                            )
                        {
                            // reflectivity
                            var eta = instruction.theta.toFixed(1);
                            if ((instruction.theta * 100) % 10) {
                                ctx.font = 'bold 8px sans-serif';
                                ctx.textBaseline = 'middle';
                                eta = instruction.theta.toFixed(2);
                            }
                            if (eta != 0.5) // 0.5 splitters are so common, no need to label
                                label += eta;
                        }
                        else
                        {
                            var special_phase = false;
                            if (instruction.op == 'phase')
                            {
                                // No label for a simple CZ
//                                if (instruction.conditionQubits.countOneBits() > 1)
                                {
                                    if (instruction.theta == 180.0
                                        || (instruction.theta == 90.0 && qc_options.draw_s_t_gates)
                                        || (instruction.theta == 45.0 && qc_options.draw_s_t_gates))
                                        special_phase = true;
                                }
                            }
                            if (!special_phase)
                            {
                                var theta = instruction.theta.toFixed(0);
                                if ((instruction.theta * 10) % 10) {
                                    ctx.font = 'bold 8px sans-serif';
                                    ctx.textBaseline = 'middle';
                                    theta = instruction.theta.toFixed(1);
                                }
                                label += theta;
                                label += '\u00B0';  // Add degree symbol
                            }
                        }

                        ctx.fillText(label, x, y);
                        ctx.restore();
                    }
                }

                for (var bit = 0; bit < this.max_bits_to_draw; ++bit)
                {
//    if (inst == 0) console.log('draw2 ' + bit + ' ' + instruction.op
//        + ' t:' + bitfieldHexString(instruction.targetQubits)
//        + ' c:' + bitfieldHexString(instruction.conditionQubits)
//        );
                    var is_targ = instruction.targetQubits.getBit(bit);
                    var is_cond = instruction.conditionQubits.getBit(bit);
                    var num_targ = instruction.targetQubits.countOneBits();
                    var num_cond = instruction.conditionQubits.countOneBits();
                    if (instruction.op == 'phase' && (is_targ || is_cond))
                    {
                        if (is_targ || is_cond)
                        {
                            var do_large_phase_marker = false;
                            if (instruction.theta == 180.0)
                            {
                                if (num_cond == 0
                                    || (is_targ && num_targ > 1 && num_cond > 0)
                                    || (num_targ + num_cond) == 1)
                                {
                                    do_large_phase_marker = true;
                                }
                            }
                            else if ((instruction.theta == 45.0 ||
                                instruction.theta == -45.0 ||
                                instruction.theta == 90.0 ||
                                instruction.theta == -90.0) && qc_options.draw_s_t_gates)
                            {
                                if (is_targ || num_targ == 0)
                                    do_large_phase_marker = true;
                            }
                            else
                            {
                                if (is_targ || num_targ == 0 || num_targ == 1)
                                    do_large_phase_marker = true;
                            }

                            if (do_large_phase_marker)
                            {
                                instruction.draw(ctx, 0, this.gridSize * bit, radius, bit, this, instruction_x, slot);
                            }
                            else
                            {
                                // Draw just a dot
                                ctx.fillStyle = 'black';
                                fillCircle(ctx, 0, this.gridSize * bit, this.gridSize * 0.2);
                            }
                        }
                    }                    
                    else if (is_targ)
                    {
//    if (inst == 0) console.log('draw3 ' + bit + ' ' + instruction.op
//        + ' t:' + bitfieldHexString(instruction.targetQubits)
//        + ' c:' + bitfieldHexString(instruction.conditionQubits)
//        );
                        instruction.draw(ctx, 0, this.gridSize * bit, radius, bit, this, instruction_x, slot);
                    }                    
                    else if (instruction.auxQubits && instruction.auxQubits.getBit(bit)
                            && instruction.op == 'dual_rail_beamsplitter')
                    {
                        // Draw the aux line (empty waveguide, usually postselected afterward)
//                        ctx.lineWidth = 1;
//                        ctx.fillStyle = 'white';
//                        ctx.strokeStyle = 'black';
//                        if (instruction.theta == 0.0)   // Dim phase gates which do nothing
//                            ctx.globalAlpha = 0.25;
//                        strokeCircle(ctx, 0, this.gridSize * bit, this.gridSize * 0.4);
//                        fillCircle(ctx, 0, this.gridSize * bit, this.gridSize * 0.4);

                        var x = 0;
                        var y = this.gridSize * bit;
                        var xwidth = this.gridSize * 0.25;
                        var high_targ = instruction.targetQubits.getHighestBitIndex();
                        var dir_up = (high_targ < bit) ? 1 : -1;
                        ctx.strokeStyle = 'white';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(x - xwidth, y);
                        ctx.lineTo(x + xwidth, y);
                        ctx.stroke();

                        ctx.strokeStyle = 'black';
                        // splitter
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(x - xwidth, y);
                        ctx.lineTo(x - 0.5 * xwidth, y + dir_up * 0.5 * xwidth);
                        ctx.lineTo(x + 0.5 * xwidth, y + dir_up * 0.5 * xwidth);
                        ctx.lineTo(x + xwidth, y);
                        ctx.stroke();
                        // aux
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(x - xwidth * 3, y + dir_up * 1.75 * xwidth);
                        ctx.lineTo(x - xwidth, y + dir_up * 1.75 * xwidth);
                        ctx.lineTo(x - 0.5 * xwidth, y + dir_up * 1.25 * xwidth);
                        ctx.lineTo(x + 0.5 * xwidth, y + dir_up * 1.25 * xwidth);
                        ctx.lineTo(x + xwidth, y + dir_up * 1.75 * xwidth);
                        ctx.lineTo(x + xwidth * 3, y + dir_up * 1.75 * xwidth);
                        ctx.stroke();




                    }
                    else if (is_cond)
                    {
                        if (instruction.op == 'phase' || instruction.op == 'optical_phase')
                        {
                            ctx.lineWidth = 1;
                            ctx.strokeStyle = 'black';
                            var cz_dots = false;
                            if (instruction.theta == 0.0 || instruction.theta == 180.0)
                            {
                                // If there's more than one target, use dots for the conditions
                                if (num_targ > 1)
                                    cz_dots = true;
                                // If there's one target or no targets, and more than one qubit involved, use dots
                                if (num_cond + num_targ > 1 && num_targ <= 1)
                                    cz_dots = true;
                            }
                            else if ((instruction.theta == 45.0 || instruction.theta == -45.0
                                    || instruction.theta == 90.0 || instruction.theta == -90.0) && qc_options.draw_s_t_gates)
                            {
                                // if there's at least one target
                                if (num_targ > 0)
                                    cz_dots = true;
                            }
                            else
                            {
                                // If there's more than one target, use dots for the conditions
                                if (num_targ > 1)
                                    cz_dots = true;
                            }
                            if (instruction.theta == 0.0)   // Dim phase gates which do nothing
                                ctx.globalAlpha = 0.25;
                            if (cz_dots)
                            {
                                ctx.fillStyle = 'black';
                                fillCircle(ctx, 0, this.gridSize * bit, this.gridSize * 0.2);
                            }
                            else
                            {
                                // // Large phase circle
                                // ctx.fillStyle = 'white';
                                // strokeCircle(ctx, 0, this.gridSize * bit, this.gridSize * 0.35);
                                // fillCircle(ctx, 0, this.gridSize * bit, this.gridSize * 0.35);

                                // strokeCircle(ctx, 0, this.gridSize * bit, this.gridSize * 0.15);
                                // ctx.beginPath();
                                // ctx.lineTo(this.gridSize * 0.03,  this.gridSize * bit - this.gridSize * 0.3);
                                // ctx.lineTo(-this.gridSize * 0.03, this.gridSize * bit + this.gridSize * 0.3);
                                // ctx.stroke();
                            }
                            if (instruction.theta == 0.0)
                                ctx.globalAlpha = 1.0;

//                            ctx.fillStyle = 'black';
//                            fillCircle(ctx, 0, this.gridSize * bit, this.gridSize * 0.2);

                            // Draw noise
//                            this.noise_level = 1;
                            if (instruction.noise_level > 0 && qc_options.draw_noise)
                            {
                                var radius = this.gridSize * 0.4;
                                var level = instruction.noise_level / qc_options.noise_magnitude;
                    //            console.log('error = ' + level);
                                var radial_grad = ctx.createRadialGradient(0, this.gridSize * bit, 0, 0, this.gridSize * bit, radius * 2.25);
                                radial_grad.addColorStop(0,'rgba(255,100,0,255)');
                                radial_grad.addColorStop(1,'rgba(255,0,0,0');
                                ctx.globalAlpha = level;
                                ctx.fillStyle = radial_grad;
                                fillCircle(ctx, 0, this.gridSize * bit, radius * 2.25);
                                ctx.fillStyle = '#fff';
                                ctx.globalAlpha = 1;
                            }
                        }
                        else if (instruction.op == 'pair_source')
                        {
                            var high = instruction.conditionQubits.getHighestBitIndex();
                            var low = instruction.conditionQubits.getLowestBitIndex();
                            ctx.fillStyle = '#08f';
                            if (high == low)
                                fillCircle(ctx, 0, this.gridSize * bit, this.gridSize * 0.3);
                            else if (bit == low)
                                fillCircle(ctx, 0, this.gridSize * bit, this.gridSize * 0.3, 0, 180);
                            else if (bit == high)
                                fillCircle(ctx, 0, this.gridSize * bit, this.gridSize * 0.3, 180, 0);
                        }
                        else
                        {
                            ctx.fillStyle = 'black';
                            fillCircle(ctx, 0, this.gridSize * bit, this.gridSize * 0.2);
                        }
                    }
                }

                instruction.drawBlockJobs(ctx, 0, this.gridSize * this.qReg.numQubits, radius);

                ctx.restore();
            }
        }
        ctx.restore();
    }

    this.drawInsertionPoint = function(ctx)
    {
//        if (this.photonic_view)
//            return;
        // Only show this if we're hovering, or if it's not at the end.
        if (this.hoverInstruction < 0)
            return;
        ctx.save();
        {
            ctx.strokeStyle = 'orange';
            ctx.lineWidth = 1;
            ctx.beginPath();
            var x = this.gridSize * (this.insertionStart - 0.5);
            ctx.lineTo(x, -this.gridSize);
            ctx.lineTo(x, this.gridSize * this.qReg.numQubits);
            ctx.stroke();
        }
        ctx.restore();
    }

    this.drawFockArrows = function(ctx)
    {
        if (!this.hoverFockPattern)
            return;
        ctx.save();
        {
            // First draw the line to place them on
            ctx.strokeStyle = 'lightgray';
            ctx.lineWidth = 1;
            ctx.beginPath();
            var x = this.gridSize * (this.insertionStart - 0.5);
            ctx.lineTo(x, -this.gridSize);
            ctx.lineTo(x, this.gridSize * this.qReg.numQubits);
            ctx.stroke();

            // Then draw the actual arrows
            var pattern = this.hoverFockPattern.mode_to_photon_count;
            var mode_map = this.qReg.photonSim.mode_map;

            var marker_size = 0.5 * this.gridSize;
            var marker_spacing = 0.4 * this.gridSize;
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (var mode = 0; mode < pattern.length; ++mode)
            {
                var photons = pattern[mode_map[mode]];
                var marker_offset = -0.5 * (photons - 1) * marker_spacing;
                for (var i = 0; i < photons; ++i)
                {
                    var y = this.gridSize * mode;
                    ctx.moveTo(marker_offset + x - 0.5 * marker_size, y - 0.35 * marker_size);
                    ctx.lineTo(marker_offset + x + 0.5 * marker_size, y);
                    ctx.lineTo(marker_offset + x - 0.5 * marker_size, y + 0.35 * marker_size);
                    marker_offset += marker_spacing;
                }
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    this.drawHoverPoint = function(ctx)
    {
//        if (this.photonic_view)
//            return;
        ctx.save();
        {
            if (this.photonic_view)
                ctx.strokeStyle = 'black';
            else
                ctx.strokeStyle = 'gray';

            ctx.lineWidth = 1;
            ctx.beginPath();
            var x = this.gridSize * (this.hoverInstruction - 0.5);
            ctx.lineTo(x, -this.gridSize);
            ctx.lineTo(x, this.gridSize * this.qReg.numQubits);
            ctx.stroke();
        }
        ctx.restore();
    }

	this.drawBackdrop = function(ctx)
	{
//        ctx.lineWidth = 1;
//        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, this.qPanel.canvas.width, this.qPanel.canvas.height);
	}
    
    this.drawStaffLines = function(ctx)
    {
        this.makeWireGrid();
        var gx = this.gridSize * this.photonic_stretch;
        var gy = this.gridSize;
		ctx.save();
		{
            var dark = "#000000";
            var light = "#dddddd";
            ctx.lineWidth = 1;
			for (var bit = 0; bit < this.max_bits_to_draw; ++bit)
			{
                var startX = 0;
                var endX = 0;
    			ctx.strokeStyle = light;
                var old_style = light;
                var new_style = light;
                var lastOp = null;
                var startx = 0;
                var x1 = (0 - 1.0) * gx;
                var x2 = (0 + 0.0) * gx;
                for (var col = 1; col < this.wire_grid.length; ++col)
                {
                    x1 = (col - 1.0) * gx;
                    x2 = (col + 0.0) * gx;
                    if (this.wire_grid[col].getBit(bit))
                        new_style = dark;
                    else
                        new_style = light;

                    if (old_style != new_style || col == this.wire_grid.length - 1)
                    {
                        ctx.beginPath();
                        ctx.moveTo(startx, 0);
                        if (col == this.wire_grid.length - 1)
                            ctx.lineTo(x2, 0);
                        else
                            ctx.lineTo(x1, 0);
                        if (old_style == light && qc_options.double_ff_line)
                        {
                            // Double horizontal line, dark
                            ctx.strokeStyle = dark;
                            ctx.lineWidth = 4;
                            ctx.stroke();
                            ctx.strokeStyle = 'white';
                            ctx.lineWidth = 3;
                            ctx.stroke();
                            ctx.lineWidth = 1;
                            ctx.strokeStyle = dark;
                        }
                        else
                        {
                            // Single horizontal line, light or dark
                            ctx.strokeStyle = old_style;
                            ctx.stroke();
                        }
                        startx = x1;
                        old_style = new_style;
                    }
                }

    			ctx.translate(0, gy);
			}
        }
        ctx.restore();
    }

    this.draw = function(hideInsertionPoint, instructionRange)
    {
        this.calculateScale();

        if (instructionRange)
        {
            // If either range is -1, ignore it.
            var ir = instructionRange;
            if (ir[0] < 0)
                ir[0] = ir[1];
            if (ir[1] < 0)
                ir[1] = ir[0];
            if (ir[1] < ir[0])
                ir[1] = ir[0];
            ir[0]--;
            ir[1]++;
        }
        var ctx = this.qPanel.canvas.getContext('2d');
        ctx.save();
        {
            if (this.photonic_view && !this.classical_view)
                ctx.fillStyle = '#999';
            else
                ctx.fillStyle = '#fff';
            this.drawBackdrop(ctx);

            ctx.scale(this.scale, this.scale);

            ctx.translate(this.margin_x, this.margin_y);
            this.drawBits(ctx);

            ctx.translate(this.gridSize * 1.25 + this.nameWidth, 0);
            if (this.classical_view)
            {
			    this.drawStaffLines(ctx);
                this.drawInstructions(ctx, instructionRange);
            }
            if (this.photonic_view)
            {
                // shadow
                ctx.save();
                ctx.translate(1, 1);
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 8;
                ctx.globalAlpha = 0.1;
                drawPhotonicInstructions(this, ctx);
                ctx.lineWidth = 6;
                ctx.globalAlpha = 0.2;
                drawPhotonicInstructions(this, ctx);
                ctx.lineWidth = 4;
                ctx.globalAlpha = 0.4;
                drawPhotonicInstructions(this, ctx);
                ctx.restore();
                // solid
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 1.0;
                drawPhotonicInstructions(this, ctx);
            }
            if (this.hoverInstruction >= 0)
                this.drawHoverPoint(ctx);
            if (!hideInsertionPoint)
                this.drawInsertionPoint(ctx);
            if (this.hoverFockPattern)
                this.drawFockArrows(ctx);
            this.drawCodeLabels(ctx);
        }
        if (this.qReg.mbc)
            this.qReg.mbc.draw_staff_overlay(ctx);
        ctx.restore();
    }

	this.changed = function ()
	{
//        if (this.trackingEnabled)
//			this.draw();
	}

    
	this.message = function (msg, bitMask, arg1)
	{
	}

    this.getMouseInstructionSlot = function(x, y)
    {
        x /= this.scale;
        y /= this.scale;
        var xmin = this.margin_x + this.gridSize * 1.25 + this.nameWidth;
        var ymin = this.margin_y - 0.5 * this.gridSize;
        var ymax = this.margin_y + this.gridSize * this.qReg.numQubits;

        numSlots = this.instructions.length;
        if (this.instructions_parallel)
            numSlots = this.instructions_parallel.length;

        if (y >= ymin && y<= ymax)
        {
            var instructionNum = 1 + Math.floor((x - xmin) / this.gridSize);
            if (instructionNum >= 0 && instructionNum <= numSlots)
            return instructionNum;
        }
        return -1;
    }

    this.checkClickTravel = function(x, y)
    {
        if (this.inClick)
        {
            var dx = this.clickDownPosX - x;
            var dy = this.clickDownPosY - y;
            var cancel_dist = 10 * 10;
            if (dx * dx + dy * dy > cancel_dist * cancel_dist)
                this.inClick = false;
        }
    }

    this.mouseWheel = function (e)
    {
        if (e.ctrlKey == true)
        {
            var dy = e.deltaY;
//            console.log('Wheel ' + dy);
            if (dy > 0)
                this.wheelScale *= 0.9;
            if (dy < 0)
                this.wheelScale *= 1.1;

            if (this.wheelScale < 0.1)
                this.wheelScale = 0.1;
            if (this.wheelScale > 6.0)
                this.wheelScale = 6.0;
            this.draw();
            return false;
        }
        return false;
    }

    this.flipToLogicalModes = function()
    {
        if (!this.qReg.position_encoded)
        {
            convertToPositionEncoding(this);
//            this.gridSize *= 0.5;
//            this.wheelScale *= 0.5;
//            this.margin_x *= 2;
//            this.margin_y *= 2;
            this.draw();
        }
    }

    this.mouseDown = function (x, y, e)
    {
        // If it's in the grow box, pass it up.
        var grow_size = 20;
        if (x > this.qPanel.width - grow_size &&
            y > this.qPanel.height - grow_size)
            return false;

//        if (this.photonic_view)
//            return false;

        if (e.ctrlKey == true)
        {
            this.flipToLogicalModes();
            return true;
        }

        var inst = this.getMouseInstructionSlot(x, y);
        if (inst >= 0)
        {
            this.inClick = true;
            this.clickDownPosX = x;
            this.clickDownPosY = y;            
            return true;
        }
        return false;
    }

    this.mouseUp = function (x, y)
    {
        this.checkClickTravel();
        if (this.inClick)
        {
            x = this.clickDownPosX;
            y = this.clickDownPosY;
            var inst = this.getMouseInstructionSlot(x, y);
            if (inst >= 0)
            {
//                console.log('click at '+x+','+y+' is inst '+inst);
                if (this.insertionStart != inst)
                {
                    this.advance(inst - this.insertionStart);
                    if (this.qReg.use_photon_sim)
                        this.qReg.photonSim.transferPhotonicToLogical();
                    if (this.qReg.chp && this.qReg.chp.active)
                        this.qReg.chp.transferCHPToLogical();
                    this.draw(false);
                }
            }
        }
        this.inClick = false;
    }

    this.mouseMove = function (x, y)
    {
        // If it's in the grow box, pass it up.
        var grow_size = 20;
        if (x > this.qPanel.width - grow_size &&
            y > this.qPanel.height - grow_size)
            return false;

//        if (this.photonic_view)
//            return false;

        if (this.inClick)
        {
            this.checkClickTravel();
        }
        else
        {
            var oldHover = this.hoverInstruction;
            this.hoverInstruction = this.getMouseInstructionSlot(x, y);
//            if (inst >= 0)
//            {
//                console.log('hover '+x+','+y+' is inst '+inst);
//            }
            if (oldHover != this.hoverInstruction)
                this.draw(false);
        }
    }

    this.makeWireGrid = function()
    {
        var num_columns = this.instructions.length + 1;
        if (this.instructions_parallel)
            num_columns = this.instructions_parallel.length + 1;
        var num_rows = this.qReg.numQubits;

        this.wire_grid = new Array(num_columns);
        // Start with all wires "on"
        for (var col = 0; col < num_columns; ++col)
//        for (var row = 0; row < num_rows; ++row)
        {
            this.wire_grid[col] = new BitField(0, this.qReg.allBitsMask.numBits);
//            this.wire_grid[row] = new Array(num_columns);
//            for (var col = 0; col < num_columns; ++col)
//                this.wire_grid[row][col] = 1;
        }
        var brush = new BitField(0, this.qReg.allBitsMask.numBits);
        var scratch = new BitField(0, this.qReg.allBitsMask.numBits);
        var old_col = -1;
        for (var inst_index = 0; inst_index < this.instructions.length; ++inst_index)
        {
            var inst = this.instructions[inst_index];
            var col = (inst.parallel_slot == null) ? inst_index : inst.parallel_slot;

            if (col > old_col)
            {
                this.wire_grid[col].set(brush);
                old_col = col;
            }
//            console.log('set col'+col+' to '+brush.values[0]);

            if (inst.op == 'read' || inst.op == 'postselect' 
                || inst.op == 'discard' || inst.op == 'push_mixed')
            {
                scratch.set(inst.targetQubits);
                scratch.invert();
                brush.andEquals(scratch);
            }
            else if (inst.op == 'exchange')
            {
                var high_pos = inst.targetQubits.getHighestBitIndex();
                var high_val = brush.getBit(high_pos);
                var low_pos = inst.targetQubits.getLowestBitIndex();
                var low_val = brush.getBit(low_pos);
                brush.setBit(high_pos, low_val);
                brush.setBit(low_pos, high_val);
            }
            else if (inst.op == 'polarization_grating_out')
            {
                var high_pos = inst.targetQubits.getHighestBitIndex();
                var low_pos = inst.targetQubits.getLowestBitIndex();
                if (inst.theta < 0)
                    brush.setBit(low_pos, 0);
                else
                    brush.setBit(high_pos, 0);
            }
            else if (inst.op == 'nop' || inst.op == 'peek'
                    || inst.op == 'not' || inst.op == 'cnot'
                    || inst.op == 'start_photon_sim' || inst.op == 'stop_photon_sim'
                    || inst.op == 'start_chp_sim' || inst.op == 'stop_chp_sim'
                    )
            {
            }
            else if (inst.op == 'pair_source')
            {
                brush.orEquals(inst.conditionQubits);
                brush.orEquals(inst.targetQubits);
            }
            else
            {
                brush.orEquals(inst.targetQubits);
            }
        }
        this.wire_grid[num_columns - 1].set(brush);
    }

    this.getFullWidth = function ()
    {
        var gx = this.gridSize * this.photonic_stretch;

        var len = this.instructions.length;
        if (this.instructions_parallel)
            len = this.instructions_parallel.length;
        return this.wheelScale * (len * gx + 4 * this.margin_x + this.nameWidth);
    }

    this.getFullHeight = function ()
    {
        return this.wheelScale * ((this.qReg.numQubits + 1) * this.gridSize + 1 * this.margin_y);
    }

    this.togglePhotonicView = function()
    {
        if (this.qReg.position_encoded)
            this.photonic_view = !this.photonic_view;
        else
            this.photonic_view = false;
        this.classical_view = !this.photonic_view;
    }

    this.togglePhotonicStretch = function()
    {
        var high = 6;
        var low = 1;
        var mid = 0.5 * (high + low);
        if (this.photonic_stretch > mid)
            this.photonic_stretch = low;
        else
            this.photonic_stretch = high;
    }

    this.fullSnapshot = function (max_width, max_height)
    {
        if (max_width == null)
            max_width = qc_options.max_staff_width;
        if (max_height == null)
            max_height = qc_options.max_staff_height;
//        this.simplify1();
        var wd = this.getFullWidth() + 500;
        var ht = this.getFullHeight();
        if (max_width && wd > max_width)
            wd = max_width;
        if (max_height && ht > max_height)
            ht = max_height;
        if (this.qPanel)
        {
            this.qPanel.setVisible(true);
            this.qPanel.setSize(wd, ht);
        }
//        this.qPanel.canvas.width = this.getFullWidth();
//        this.qPanel.canvas.height = this.getFullHeight();
        this.draw(true); // Hide the insertion point
    }
/*
    this.doCommonReductions = function()
    {
        for (var qubitIndex = 0; qubitIndex < this.qReg.numQubits; ++qubitIndex)
        {
            var bit_inst = [];
            var bit_ct = [];
            var prev2 = null;
            var prev = null;
            var curr = null;
            // Build a packed list
            for (var instIndex = 0; instIndex < this.instructions.length; ++instIndex)
            {
                var new_curr = this.instructions[instIndex];
                if (curr.conditionQubits.getBit(qubitIndex))
                {
                    prev2 = prev;
                    prev = curr;
                    curr = new_curr;

                if (prev && curr.op == 'phase' && prev.op == 'phase')
                {
                    if (prev.conditionQubits.countOneBits() == 1
                        && prev.conditionQubits.countOneBits() == 1)
                }
                if (curr.targetQubits.getBit(qubitIndex))
                {
                    bit_inst.push(curr);
                    bit_ct.push('t');
                }
                if (curr.targetQubits.getBit(qubitIndex))
                {
                    bit_inst.push(curr);
                    bit_ct.push('c');
                }
            }
            for (var i = 0; i < bit_inst.length; ++i)
            {
                if (i)
            }
        }
    }
*/
    // Look for super-easy simplifications and make them
    this.cancelRedundantOperations = function()
    {
        var reparallelize = (this.instructions_parallel != null);
        this.clearParallelization();
        var scratch_bf = new BitField(0, this.qReg.numQubits);
        for (var instIndex = 0; instIndex < this.instructions.length - 1; ++instIndex)
        {
            var curr = this.instructions[instIndex];
            var is_exchange = (curr.op == 'exchange' || curr.op == 'cexchange'
                                 || curr.op == 'dual_rail_beamsplitter'
                                 || curr.op == 'pbs'
                                  || curr.op == 'pair_source');
            var is_not = (curr.op == 'not' || curr.op == 'cnot');
            var is_hadamard = (curr.op == 'hadamard' || curr.op == 'chadamard');
            // For some operations, it's simpler to go bit-by-bit
            var do_bit_by_bit = false;
            if (is_not || is_hadamard)
            {
                do_bit_by_bit = true;
            }
            if (do_bit_by_bit)
            {
                for (var bit = 0; bit < this.qReg.numQubits; ++bit)
                {
                    var done = false;
                    if (curr.targetQubits.getBit(bit))
                    {
                        // Now scan forward to see if there's an op we can match with.
                        for (var instIndex2 = instIndex + 1; instIndex2 < this.instructions.length; ++instIndex2)
                        {
                            var next = this.instructions[instIndex2];
                            var is_not2 = (next.op == 'not' || next.op == 'cnot');
                            if (curr.op == next.op)
                            {
                                if (bitFieldsAreIdentical(curr.conditionQubits, next.conditionQubits))
                                {
                                    if (next.targetQubits.getBit(bit))
                                    {
                                        curr.targetQubits.setBit(bit, 0);
                                        next.targetQubits.setBit(bit, 0);
                                        break;
                                    }
                                }
                            }
                            if (is_not && is_not2 && !next.conditionQubits.getBit(bit))
                            {
                                // keep going
                            }
                            else if (next.targetQubits.getBit(bit) || next.conditionQubits.getBit(bit)
                                    || next.targetQubits.andIsNotEqualZero(curr.conditionQubits))
                            {
                                // We're blocked
                                break;
                            }
                        }
                    }
                }
                if (curr.targetQubits.isAllZero())
                    this.removeInstruction(instIndex);
            }
            else if (curr.op == 'not' || curr.op == 'cnot' ||
                curr.op == 'hadamard' || curr.op == 'chadamard' ||
                curr.op == 'exchange' || curr.op == 'cexchange' ||
                curr.op == 'dual_rail_beamsplitter' ||
                curr.op == 'pbs' ||
                curr.op == 'pair_source' || curr.op == 'phase'
                ) // TODO: Check beamsplitter operation to cancel.
            {
                // Now scan forward to see if there's an op we can match with.
                for (var instIndex2 = instIndex + 1; instIndex2 < this.instructions.length; ++instIndex2)
                {
                    var blocked = false;
                    var next = this.instructions[instIndex2];
                    if (curr.op == next.op)
                    {
                        if (bitFieldsAreIdentical(curr.conditionQubits, next.conditionQubits))
                        {
                            if (curr.op == 'phase')
                            {
                                // phases can be combined
                                var theta = curr.theta + next.theta;
                                while (theta > 180)
                                    theta -= 360;
                                while (theta < -180)
                                    theta += 360;
                                if (theta == 0)
                                {
                                    this.removeInstruction(instIndex2);
                                    this.removeInstruction(instIndex);
                                    instIndex--;
                                    blocked = true;
                                }
                                else
                                {
                                    curr.theta = theta;
                                    this.removeInstruction(instIndex2);
                                    blocked = true;
                                }
                            }
                            // If not/exch/hadamard gates have the same conditions, they can cancel or combine.
                            else if (bitFieldsAreIdentical(curr.targetQubits, next.targetQubits))
                            {
                                this.removeInstruction(instIndex2);
                                this.removeInstruction(instIndex);
                                instIndex--;
                                blocked = true;
                            }


                            // If targets aren't the same but they overlap, cancel exchange.
                            else if (is_exchange)
                            {
                                scratch_bf.set(curr.targetQubits);
                                scratch_bf.andEquals(next.targetQubits);
                                if (!isAllZero(scratch_bf))
                                    blocked = true;
                            }
                            else
                            {
                                curr.targetQubits.xorEquals(next.targetQubits);
                                this.removeInstruction(instIndex2);
    //                            instIndex = 0;  // Start over and look again.
    //                            blocked = true;
                            }
                        }
                        // Otherwise, if targets and conditions overlap at all, we're done
                        else
                        {
                            scratch_bf.set(curr.targetQubits);
                            scratch_bf.andEquals(next.targetQubits);
                            if (!isAllZero(scratch_bf))
                                blocked = true;
                            scratch_bf.set(curr.targetQubits);
                            scratch_bf.andEquals(next.conditionQubits);
                            if (!isAllZero(scratch_bf))
                                blocked = true;
                            scratch_bf.set(curr.conditionQubits);
                            scratch_bf.andEquals(next.targetQubits);
                            if (!isAllZero(scratch_bf))
                                blocked = true;
                        }
                    }
                    else
                    {
                        // Otherwise, if targets and conditions overlap at all, we're done
                        scratch_bf.set(curr.targetQubits);
                        scratch_bf.andEquals(next.targetQubits);
                        if (!isAllZero(scratch_bf))
                            blocked = true;
                        scratch_bf.set(curr.targetQubits);
                        scratch_bf.andEquals(next.conditionQubits);
                        if (!isAllZero(scratch_bf))
                            blocked = true;
                        scratch_bf.set(curr.conditionQubits);
                        scratch_bf.andEquals(next.targetQubits);
                        if (!isAllZero(scratch_bf))
                            blocked = true;
                    }
                    if (blocked)
                        break;
                }
            }
        }
        this.deleteEmptyInstructions();
        if (reparallelize)
            this.parallelize(this.parallelize_option);
    }

    // Look for Hadamard-X-Hadamard and convert to 180-degree Z.
    this.convertHXHToPhase = function()
    {
        var reparallelize = (this.instructions_parallel != null);
        this.clearParallelization();
        var scratch_bf = new BitField(0, this.qReg.numQubits);
        var instIndex = [0, 0, 0];
        var inst = [null, null, null];
        for (instIndex[0] = 0; instIndex[0] < this.instructions.length - 1; ++instIndex[0])
        {
            var curr = inst[0] = this.instructions[instIndex[0]];
            if ((curr.op == 'hadamard' || curr.op == 'chadamard')
                && curr.conditionQubits.isAllZero())
            {
                for (var bit = 0; bit < this.qReg.numQubits; ++bit)
                {
                    var blocked = false;
                    if (curr.targetQubits.getBit(bit))
                    {
                        // Now scan forward to see if there's an op we can match with.
                        for (instIndex[1] = instIndex[0] + 1; !blocked && instIndex[1] < this.instructions.length; ++instIndex[1])
                        {
                            inst[1] = this.instructions[instIndex[1]];
                            if ((inst[1].op == 'not' || inst[1].op == 'cnot')
                                && inst[1].conditionQubits.isAllZero()
                                && inst[1].targetQubits.getBit(bit))
                            {
                                // Now scan forward to see if there's an op we can match with.
                                for (instIndex[2] = instIndex[1] + 1; !blocked && instIndex[2] < this.instructions.length; ++instIndex[2])
                                {
                                    inst[2] = this.instructions[instIndex[2]];
                                    if ((inst[2].op == 'hadamard' || inst[2].op == 'chadamard')
                                        && inst[2].conditionQubits.isAllZero()
                                        && inst[2].targetQubits.getBit(bit))
                                    {
                                        // We've found the pattern we're looking for.
                                        curr.targetQubits.setBit(bit, 0);
                                        inst[1].targetQubits.setBit(bit, 0);
                                        inst[2].targetQubits.setBit(bit, 0);
                                        scratch_bf.set(0);
                                        scratch_bf.setBit(bit, 1);
                                        this.insertInstruction(instIndex[0],
                                            new QInstruction('phase', 0, scratch_bf, 180.0, curr.codeLabel));
                                        break;
                                    }
                                    else if (inst[2].targetQubits.getBit(bit) || inst[2].conditionQubits.getBit(bit))
                                    {
                                        blocked = true;
                                        break;
                                    }
                                }
                            }
                            else if (inst[1].targetQubits.getBit(bit) || inst[1].conditionQubits.getBit(bit))
                            {
                                blocked = true;
                                break;
                            }
                        }
                    }
                }
            }
        }
        this.deleteEmptyInstructions();
        if (reparallelize)
            this.parallelize(this.parallelize_option);
    }

    // Other conversions:
    // H(Phase(theta))H -> Rotx(theta/2)
    // HZH -> X
    



    this.deleteEmptyInstructions = function()
    {
        for (var instIndex = 0; instIndex < this.instructions.length - 1; ++instIndex)
        {
            var curr = this.instructions[instIndex];
            var is_condition_only_ok = (curr.op == 'phase');
            var delete_this = false;
            if (is_condition_only_ok)
            {
                // For gates which can survive with only condition bits
                if (curr.conditionQubits.isAllZero() && curr.targetQubits.isAllZero())
                    delete_this = true;
            }
            else
            {
                // Gates which need target bits
                if (curr.targetQubits.isAllZero())
                    delete_this = true;
            }
            if (delete_this)
            {
                this.removeInstruction(instIndex);
                instIndex--;
            }
        }
    }

    this.clearParallelization = function()
    {
        this.insertionStart = 0;
        this.instructions_parallel = null;
        for (var instIndex = 0; instIndex < this.instructions.length; ++instIndex)
        {
            var inst = this.instructions[instIndex];
            inst.parallel_slot = null;
            inst.parallel_index_in_slot = null;
            inst.parallel_offset = null;
        }
    }

    // Look for operations which can be done in parallel, and mark them.
    this.parallelize = function(crossLabelBounds)
    {
        // Reset the insertion point
        this.insertionStart = 0;
        this.parallelize_option = crossLabelBounds;
        this.cancelRedundantOperations();
        // instructions_parallel will just be a 2D array of links to existing instructions
        this.instructions_parallel = new Array();
        var bfi = new BitField(0, this.qReg.numQubits);
        var bfp = new BitField(0, this.qReg.numQubits);
        var bfprev = new BitField(0, this.qReg.numQubits);

        for (var instIndex = 0; instIndex < this.instructions.length; ++instIndex)
        {
            var foundSlot = 0;
            var inst = this.instructions[instIndex];
            bfi.set(inst.targetQubits);
            bfi.orEquals(inst.conditionQubits);
            bfi.orEquals(inst.auxQubits);
            bfp.set(0);
            var min_bit = bfi.getLowestBitIndex();
            var max_bit = bfi.getHighestBitIndex();

            for (var parIndex = this.instructions_parallel.length - 1; parIndex >= 0 && foundSlot == 0; --parIndex)
            {
                var parallelSlot = this.instructions_parallel[parIndex];
                var match_codelabel = true;
                for (var i = 0; i < parallelSlot.length; ++i)
                {
                    bfp.orEquals(parallelSlot[i].targetQubits);
                    bfp.orEquals(parallelSlot[i].conditionQubits);
                    bfp.orEquals(parallelSlot[i].auxQubits);
                    if (inst.codeLabel != parallelSlot[i].codeLabel)
                        match_codelabel = false;
                }
                bfp.andEquals(bfi);
                var blocked = !isAllZero(bfp);
                if (!match_codelabel && !crossLabelBounds)
                    blocked = true;
                if (blocked)
                    foundSlot = parIndex + 1;
            }
//            console.log('inst ' + instIndex + ':' + inst.codeLabel + ' -> ' + foundSlot);
            if (foundSlot >= this.instructions_parallel.length)
                this.instructions_parallel.push(new Array());
            inst.parallel_slot = foundSlot;
            inst.parallel_index_in_slot = this.instructions_parallel[foundSlot].length;
            inst.parallel_offset = inst.parallel_index_in_slot;
            if (inst.parallel_index_in_slot > 0)
            {
                // If there's no overlap between this and the rev parallel instruction,
                // don't offset it at all.

                var prev_inst = this.instructions_parallel[foundSlot][inst.parallel_index_in_slot - 1];
                bfprev.set(prev_inst.targetQubits);
                bfprev.orEquals(prev_inst.conditionQubits);
                bfprev.orEquals(prev_inst.auxQubits);
                var prev_min_bit = bfprev.getLowestBitIndex();
                var prev_max_bit = bfprev.getHighestBitIndex();
                if (min_bit == -1 || prev_min_bit == -1
                    || max_bit < prev_min_bit
                    || min_bit > prev_max_bit)
                    inst.parallel_offset = prev_inst.parallel_offset;
                else
                    inst.parallel_offset = 1 + prev_inst.parallel_offset;
            }
            this.instructions_parallel[foundSlot].push(inst);
        }
        console.log('parallelize: ' + this.instructions.length + ' -> ' + this.instructions_parallel.length);
    }

    this.convertExchangeToCnot = function(only_conditional_exchanges)
    {
        var targ1_bf = new BitField(0, this.qReg.numQubits);
        var targ2_bf = new BitField(0, this.qReg.numQubits);
//        var cond1_bf = new BitField(0, this.qReg.numQubits);
        var cond2_bf = new BitField(0, this.qReg.numQubits);
        for (var instIndex = 0; instIndex < this.instructions.length; ++instIndex)
        {
            var curr = this.instructions[instIndex];
            var do_this_one = (curr.op == 'exchange');
            if (do_this_one && only_conditional_exchanges && isAllZero(curr.conditionQubits))
                do_this_one = false;
            if (do_this_one)
            {
                var hi_targ = curr.targetQubits.getHighestBitIndex();
                var lo_targ = curr.targetQubits.getLowestBitIndex();
                targ1_bf.set(0);
                targ2_bf.set(0);
//                cond1_bf.set(curr.conditionQubits)
                cond2_bf.set(curr.conditionQubits)
                targ1_bf.setBit(hi_targ, 1);
                targ2_bf.setBit(lo_targ, 1);
//                cond1_bf.setBit(lo_targ, 1);
                cond2_bf.setBit(hi_targ, 1);
                var new_inst1 = new QInstruction("cnot", targ1_bf, targ2_bf, 0.0, curr.codeLabel);
                var new_inst2 = new QInstruction("cnot", targ2_bf, cond2_bf, 0.0, curr.codeLabel);
                var new_inst3 = new QInstruction("cnot", targ1_bf, targ2_bf, 0.0, curr.codeLabel);
                this.removeInstruction(instIndex);
                this.insertInstruction(instIndex, new_inst1);
                this.insertInstruction(instIndex, new_inst2);
                this.insertInstruction(instIndex, new_inst3);
            }
        }
        this.cancelRedundantOperations();
    }

    this.convertRootNotToHPhaseH = function(only_conditionals)
    {
        var targ_bf = new BitField(0, this.qReg.numQubits);
        var cond_bf = new BitField(0, this.qReg.numQubits);
        for (var instIndex = 0; instIndex < this.instructions.length; ++instIndex)
        {
            var curr = this.instructions[instIndex];
            var do_this_one = (curr.op == 'rootnot'
                               || curr.op == 'crootnot'
                               || curr.op == 'rootnot_inv'
                               || curr.op == 'crootnot_inv');
            var is_inverse = (curr.op == 'rootnot_inv'
                               || curr.op == 'crootnot_inv');
            if (do_this_one && only_conditionals && isAllZero(curr.conditionQubits))
                do_this_one = false;
            if (do_this_one)
            {
                var targ = curr.targetQubits.getHighestBitIndex();
                targ_bf.set(0);
                cond_bf.set(curr.conditionQubits)
                cond_bf.setBit(targ, 1);
                targ_bf.setBit(targ, 1);

                var theta = -90;
                if (is_inverse)
                    theta = -theta;
                var new_inst1 = new QInstruction("hadamard", targ_bf, 0, 0.0, curr.codeLabel);
                var new_inst2 = new QInstruction("phase", 0, cond_bf, theta, curr.codeLabel);
                var new_inst3 = new QInstruction("hadamard", targ_bf, 0, 0.0, curr.codeLabel);
                this.removeInstruction(instIndex);
                this.insertInstruction(instIndex, new_inst1);
                this.insertInstruction(instIndex, new_inst2);
                this.insertInstruction(instIndex, new_inst3);
            }
        }
        this.cancelRedundantOperations();
    }

    this.discardUnmeasuredInstructions = function()
    {
        var measured_bf = NewBitField(0, this.qReg.numQubits);
        var scratch_bf = NewBitField(0, this.qReg.numQubits);
        var done = false;
        for (var instIndex = this.instructions.length - 1; instIndex >= 0 && !done; --instIndex)
        {
            var curr = this.instructions[instIndex];
            if (curr.op == 'read')
                measured_bf.orEquals(curr.targetQubits);
            else if (curr.op == 'exchange' && curr.conditionQubits.isAllZero())
            {
                // An exchange changes which qubits are on the "measured" list
                scratch_bf.set(curr.targetQubits);
                scratch_bf.andEquals(measured_bf);
                if (scratch_bf.countOneBits == 1)
                {
                    measured_bf.xorEquals(curr.targetQubits);
                }
            }
            else
            {
                var do_this_one = true;
                if (curr.op == 'nop' || curr.op == 'peek')
                    do_this_one = false;
                if (do_this_one)
                {
                    scratch_bf.set(curr.targetQubits);
                    scratch_bf.orEquals(curr.conditionQubits);
                    if (!scratch_bf.andIsNotEqualZero(measured_bf))
                    {
                        // If none of the qubits are going to be measured, throw it out.
                        this.removeInstruction(instIndex);
                    }
                    else
                    {
                        // It *does* contain measured bits.
                        // If there are no conditions, then just strip out target bits
                        if (curr.conditionQubits.isAllZero())
                        {
                            scratch_bf.set(measured_bf);
                            curr.targetQubits.andEquals(scratch_bf);
                            if (curr.targetQubits.isAllZero())
                                this.removeInstruction(instIndex);
                        }
                        else
                        {
                            // ...so from now on, every bit it touched is considered measured.
                            measured_bf.orEquals(scratch_bf);
                        }
                    }
                }
            }
        }
        scratch_bf.recycle();
        measured_bf.recycle();
//        this.cancelRedundantOperations();
    }

    this.convertCzToCnot = function(max_conditions_to_hit, preferred_target_qubit, min_conditions_to_hit)
    {
        if (max_conditions_to_hit == null)
            max_conditions_to_hit = this.qReg.numQubits;
        if (min_conditions_to_hit == null)
            min_conditions_to_hit = 2;
        var targ_bf = NewBitField(0, this.qReg.numQubits);
        var cond_bf = NewBitField(0, this.qReg.numQubits);
        var recent_cnot_targ_index = 1;
//        var ignore_recent_cnot = true;
        for (var instIndex = 0; instIndex < this.instructions.length; ++instIndex)
        {
            var curr = this.instructions[instIndex];
            var do_this_one = (curr.op == 'phase' 
                                && curr.theta == 180 
                                && curr.conditionQubits.countOneBits() > 1
                                && curr.conditionQubits.countOneBits() <= max_conditions_to_hit
                                && curr.conditionQubits.countOneBits() >= min_conditions_to_hit
                                );
            if (curr.op == 'cnot' && !isAllZero(curr.conditionQubits))
                recent_cnot_targ_index = curr.targetQubits.getLowestBitIndex();

            if (do_this_one)
            {
                var hi_cond = curr.conditionQubits.getHighestBitIndex();
                var lo_cond = curr.conditionQubits.getLowestBitIndex();
                targ_bf.set(0);
                cond_bf.set(curr.conditionQubits);
                if (!curr.conditionQubits.getBit(recent_cnot_targ_index))
                {
                    recent_cnot_targ_index = lo_cond;
                }
                if (preferred_target_qubit != null)
                {
                    if (curr.conditionQubits.getBit(preferred_target_qubit))
                    {
                        recent_cnot_targ_index = preferred_target_qubit;
                    }
                }
                targ_bf.setBit(recent_cnot_targ_index, 1);
                cond_bf.setBit(recent_cnot_targ_index, 0);
                var new_inst1 = new QInstruction("hadamard", targ_bf, 0, 0.0, curr.codeLabel);
                var new_inst2 = new QInstruction("cnot", targ_bf, cond_bf, 0.0, curr.codeLabel);
                var new_inst3 = new QInstruction("hadamard", targ_bf, 0, 0.0, curr.codeLabel);
                this.removeInstruction(instIndex);
                this.insertInstruction(instIndex, new_inst1);
                this.insertInstruction(instIndex, new_inst2);
                this.insertInstruction(instIndex, new_inst3);
            }
        }
        targ_bf.recycle();
        cond_bf.recycle();
//        this.cancelRedundantOperations();
    }

    this.convertCnotToCz = function(max_conditions_to_hit, preferred_target_qubit)
    {
        if (max_conditions_to_hit == null)
            max_conditions_to_hit = this.qReg.numQubits;
        var targ_bf = NewBitField(0, this.qReg.numQubits);
        var cond_bf = NewBitField(0, this.qReg.numQubits);
        var recent_cnot_targ_index = 1;
//        var ignore_recent_cnot = true;
        for (var instIndex = 0; instIndex < this.instructions.length; ++instIndex)
        {
            var curr = this.instructions[instIndex];
            var do_this_one = (curr.op == 'not' || curr.op == 'cnot' 
                                && curr.conditionQubits.countOneBits() >= 1
                                && curr.conditionQubits.countOneBits() <= max_conditions_to_hit);

            if (do_this_one)
            {
                var hi_targ = curr.targetQubits.getHighestBitIndex();
                var lo_targ = curr.targetQubits.getLowestBitIndex();
                targ_bf.set(curr.targetQubits);
                cond_bf.set(curr.conditionQubits);
                cond_bf.orEquals(curr.targetQubits);
                var new_inst1 = new QInstruction("hadamard", targ_bf, 0, 0.0, curr.codeLabel);
                var new_inst2 = new QInstruction("phase", 0, cond_bf, 180.0, curr.codeLabel);
                var new_inst3 = new QInstruction("hadamard", targ_bf, 0, 0.0, curr.codeLabel);
                this.removeInstruction(instIndex);
                this.insertInstruction(instIndex, new_inst1);
                this.insertInstruction(instIndex, new_inst2);
                this.insertInstruction(instIndex, new_inst3);
            }
        }
        targ_bf.recycle();
        cond_bf.recycle();
    }

    this.convertCPhaseToCnot = function()
    {
        var targ_bf = NewBitField(0, this.qReg.numQubits);
        var cond_bf = NewBitField(0, this.qReg.numQubits);
        var recent_cnot_targ_index = 2;
        for (var instIndex = 0; instIndex < this.instructions.length; ++instIndex)
        {
            var curr = this.instructions[instIndex];
            var do_this_one = (curr.op == 'phase' 
                                && curr.theta != 180 
                                && curr.conditionQubits.countOneBits() == 2);
            if (curr.op == 'cnot' && !isAllZero(curr.conditionQubits))
                recent_cnot_targ_index = curr.targetQubits.getLowestBitIndex();

            if (do_this_one)
            {
                var half_theta = 0.5 * curr.theta;
                var hi_cond = curr.conditionQubits.getHighestBitIndex();
                var lo_cond = curr.conditionQubits.getLowestBitIndex();
                targ_bf.set(0);
                cond_bf.set(curr.conditionQubits);
                if (!curr.conditionQubits.getBit(recent_cnot_targ_index))
                {
                    recent_cnot_targ_index = lo_cond;
                }
                targ_bf.setBit(recent_cnot_targ_index, 1);
                cond_bf.setBit(recent_cnot_targ_index, 0);
                var new_inst = [];
                new_inst.push(new QInstruction("phase", 0, targ_bf, half_theta, curr.codeLabel));
                new_inst.push(new QInstruction("phase", 0, cond_bf, half_theta, curr.codeLabel));
                new_inst.push(new QInstruction("cnot", targ_bf, cond_bf, 0.0, curr.codeLabel));
                new_inst.push(new QInstruction("phase", 0, targ_bf, -half_theta, curr.codeLabel));
                new_inst.push(new QInstruction("cnot", targ_bf, cond_bf, 0.0, curr.codeLabel));
                this.removeInstruction(instIndex);
                for (var i = new_inst.length - 1; i >= 0; --i)
                    this.insertInstruction(instIndex, new_inst[i]);
            }
        }
        targ_bf.recycle();
        cond_bf.recycle();
//        this.cancelRedundantOperations();
    }

    this.expandToffoliGates = function(use_expanded_exchange)
    {
        var do_cnot_all_same_qubit = false;
        var targ_bf  = NewBitField(0, this.qReg.numQubits);
        var cond1_bf = NewBitField(0, this.qReg.numQubits);
        var cond2_bf = NewBitField(0, this.qReg.numQubits);
        var swap_bf  = NewBitField(0, this.qReg.numQubits);
        for (var instIndex = 0; instIndex < this.instructions.length; ++instIndex)
        {
            var curr = this.instructions[instIndex];
            var do_this_one = (curr.op == 'cnot'
                                && curr.conditionQubits.countOneBits() == 2
                                && curr.targetQubits.countOneBits() == 1);

            if (do_this_one)
            {
                var hi_cond = curr.conditionQubits.getHighestBitIndex();
                var lo_cond = curr.conditionQubits.getLowestBitIndex();
                targ_bf.set(curr.targetQubits);
                cond1_bf.set(0);
                cond2_bf.set(0);
                cond1_bf.setBit(lo_cond, 1);
                cond2_bf.setBit(hi_cond, 1);
                swap_bf.set(targ_bf);
                swap_bf.setBit(hi_cond, 1);
                var new_inst = [];
                new_inst.push(new QInstruction("hadamard", targ_bf, 0, 0.0, curr.codeLabel));
                new_inst.push(new QInstruction("cnot",     targ_bf, cond2_bf, 0.0, curr.codeLabel));
                new_inst.push(new QInstruction("phase",    0, targ_bf, -45.0, curr.codeLabel));
                new_inst.push(new QInstruction("cnot",     targ_bf, cond1_bf, 0.0, curr.codeLabel));
                new_inst.push(new QInstruction("phase",    0, targ_bf, 45.0, curr.codeLabel));
                new_inst.push(new QInstruction("cnot",     targ_bf, cond2_bf, 0.0, curr.codeLabel));
                new_inst.push(new QInstruction("phase",    0, targ_bf, -45.0, curr.codeLabel));
                new_inst.push(new QInstruction("cnot",     targ_bf, cond1_bf, 0.0, curr.codeLabel));
                new_inst.push(new QInstruction("phase",    0, targ_bf, 45.0, curr.codeLabel));
                new_inst.push(new QInstruction("hadamard", targ_bf, 0, 0.0, curr.codeLabel));

                if (do_cnot_all_same_qubit)
                {
                    // exchange
                    if (use_expanded_exchange)
                    {
                        new_inst.push(new QInstruction("cnot",     targ_bf, cond2_bf, 0.0, curr.codeLabel));
                        new_inst.push(new QInstruction("hadamard", swap_bf, 0, 0.0, curr.codeLabel));
                        new_inst.push(new QInstruction("cnot",     targ_bf, cond2_bf, 0.0, curr.codeLabel));
                        new_inst.push(new QInstruction("hadamard", swap_bf, 0, 0.0, curr.codeLabel));
                        new_inst.push(new QInstruction("cnot",     targ_bf, cond2_bf, 0.0, curr.codeLabel));
                    }
                    else
                    {
                        new_inst.push(new QInstruction("exchange", swap_bf, 0, 0.0, curr.codeLabel));
                    }

                    new_inst.push(new QInstruction("phase", 0, targ_bf, -45.0, curr.codeLabel));
                    new_inst.push(new QInstruction("cnot",  targ_bf, cond1_bf, 0.0, curr.codeLabel));
                    new_inst.push(new QInstruction("phase", 0, targ_bf, -45.0, curr.codeLabel));
                    new_inst.push(new QInstruction("cnot",  targ_bf, cond1_bf, 0.0, curr.codeLabel));
                    new_inst.push(new QInstruction("phase", 0, targ_bf, 90.0, curr.codeLabel));
                    new_inst.push(new QInstruction("phase", 0, cond1_bf, 45.0, curr.codeLabel));

                    // exchange
                    if (use_expanded_exchange)
                    {
                        new_inst.push(new QInstruction("cnot",     targ_bf, cond2_bf, 0.0, curr.codeLabel));
                        new_inst.push(new QInstruction("hadamard", swap_bf, 0, 0.0, curr.codeLabel));
                        new_inst.push(new QInstruction("cnot",     targ_bf, cond2_bf, 0.0, curr.codeLabel));
                        new_inst.push(new QInstruction("hadamard", swap_bf, 0, 0.0, curr.codeLabel));
                        new_inst.push(new QInstruction("cnot",     targ_bf, cond2_bf, 0.0, curr.codeLabel));
                    }
                    else
                    {
                        new_inst.push(new QInstruction("exchange", swap_bf, 0, 0.0, curr.codeLabel));
                    }
                }
                else
                {
                    // Simpler case when we don't need to do the exchange
                    new_inst.push(new QInstruction("phase", 0, cond2_bf, -45.0, curr.codeLabel));
                    new_inst.push(new QInstruction("cnot",  cond2_bf, cond1_bf, 0.0, curr.codeLabel));
                    new_inst.push(new QInstruction("phase", 0, cond2_bf, -45.0, curr.codeLabel));
                    new_inst.push(new QInstruction("cnot",  cond2_bf, cond1_bf, 0.0, curr.codeLabel));
                    new_inst.push(new QInstruction("phase", 0, cond2_bf, 90.0, curr.codeLabel));
                    new_inst.push(new QInstruction("phase", 0, cond1_bf, 45.0, curr.codeLabel));
                }

                this.removeInstruction(instIndex);
                for (var i = new_inst.length - 1; i >= 0; --i)
                    this.insertInstruction(instIndex, new_inst[i]);
            }
        }
        targ_bf.recycle();
        cond1_bf.recycle();
        cond2_bf.recycle();
        swap_bf.recycle();
//        this.cancelRedundantOperations();
    }

    this.convertToBeamSplitters = function()
    {
        var only_conditional_exchanges = true;
        this.clearParallelization();
        var targ1_bf = new BitField(0, this.qReg.numQubits);
        var targ2_bf = new BitField(0, this.qReg.numQubits);
//        var cond1_bf = new BitField(0, this.qReg.numQubits);
        var cond2_bf = new BitField(0, this.qReg.numQubits);
        var split2_bf = new BitField(0, this.qReg.numQubits);
        var split3_bf = new BitField(0, this.qReg.numQubits);
        for (var instIndex = 0; instIndex < this.instructions.length; ++instIndex)
        {
            var curr = this.instructions[instIndex];
            var do_this_one = (curr.op == 'exchange'
                            || curr.op == 'rootexchange'
                            || curr.op == 'rootexchange_inv'
                            );
            if (do_this_one && only_conditional_exchanges && isAllZero(curr.conditionQubits))
                do_this_one = false;
            if (do_this_one)
            {
                var cond = curr.conditionQubits.getHighestBitIndex();
                var hi_targ = curr.targetQubits.getHighestBitIndex();
                var lo_targ = curr.targetQubits.getLowestBitIndex();
                targ1_bf.set(0);
                targ2_bf.set(0);
//                cond1_bf.set(curr.conditionQubits)
                cond2_bf.set(curr.conditionQubits);
                targ1_bf.setBit(hi_targ, 1);
                targ2_bf.setBit(lo_targ, 1);
//                cond1_bf.setBit(lo_targ, 1);
                cond2_bf.setBit(hi_targ, 1);
                var reflectivity = 0.5;

                this.removeInstruction(instIndex);

                this.insertInstruction(instIndex, new QInstruction("beamsplitter", curr.targetQubits, null, reflectivity, curr.codeLabel));

                var utility_bit;

                utility_bit = this.qReg.findClosestUtilityBit(cond+1);
                split2_bf.set(0);
                split2_bf.setBit(cond+1, 1);
                if (utility_bit >= 0)
                    split2_bf.setBit(utility_bit, 1);
                this.insertInstruction(instIndex, new QInstruction("beamsplitter", split2_bf, null, reflectivity, curr.codeLabel));

                split2_bf.set(0);
                split2_bf.setBit(cond, 1);
                split2_bf.setBit(hi_targ, 1);
                this.insertInstruction(instIndex, new QInstruction("beamsplitter", split2_bf, null, reflectivity, curr.codeLabel));

                utility_bit = this.qReg.findClosestUtilityBit(lo_targ);
                split2_bf.set(0);
                split2_bf.setBit(lo_targ, 1);
                if (utility_bit >= 0)
                    split2_bf.setBit(utility_bit, 1);
                this.insertInstruction(instIndex, new QInstruction("beamsplitter", split2_bf, null, reflectivity, curr.codeLabel));

                this.insertInstruction(instIndex, new QInstruction("beamsplitter", curr.targetQubits, null, reflectivity, curr.codeLabel));

//                var new_inst3 = new QInstruction("beamsplitter", curr.targetQubits, null, reflectivity, curr.codeLabel);

//                var new_inst1 = new QInstruction("beamsplitter", targ1_bf, targ2_bf, reflectivity, curr.codeLabel);
//                var new_inst1 = new QInstruction("beamsplitter", targ1_bf, targ2_bf, reflectivity, curr.codeLabel);
//                var new_inst2 = new QInstruction("cnot", targ2_bf, cond2_bf, 0.0, curr.codeLabel);
//                var new_inst3 = new QInstruction("cnot", targ1_bf, targ2_bf, 0.0, curr.codeLabel);
            }
        }
        this.cancelRedundantOperations();
    }

    this.convertGatesToOneTargetQubit = function()
    {
//        this.convertExchangeToCnot(true);    // only convert conditional exchanges

        var did_something = true;
        while (did_something)
        {
            did_something = false;
            for (var instIndex = 0; instIndex < this.instructions.length; ++instIndex)
            {
                var curr = this.instructions[instIndex];
                if (curr.op == 'cnot' || curr.op == 'not')  // TODO: Which other instructions?
                {
                    // For multi-target ops, break them into single-target ops.
                    if (curr.targetQubits.countOneBits() > 1)
                    {
                        did_something = true;
                        this.removeInstruction(instIndex);
                        var low = curr.targetQubits.getLowestBitIndex();
                        var high = curr.targetQubits.getHighestBitIndex();
                        for (var bit = low; bit <= high; ++bit)
                        {
                            if (curr.targetQubits.getBit(bit))
                            {
                                var new_targ = new BitField(curr.targetQubits);
                                new_targ.set(0);
                                new_targ.setBit(bit, 1);
                                var new_inst = new QInstruction(curr.op, new_targ, curr.conditionQubits, 0.0, curr.codeLabel);
                                this.insertInstruction(instIndex, new_inst);
                            }
                        }
                    }
                }
            }
        }
        this.cancelRedundantOperations();
    }

    this.convertGatesTo1Condition = function()
    {
//        this.convertExchangeToCnot(true);    // only convert conditional exchanges
        this.convertGatesToOneTargetQubit();

        // Implements Seciotn 7.2 in Elementary Quantum Gates
        var did_something = true;
        while (did_something)
        {
            did_something = false;
            for (var instIndex = 0; instIndex < this.instructions.length; ++instIndex)
            {
                var curr = this.instructions[instIndex];
                if (curr.op == 'cnot' || curr.op == 'not' ||
                    curr.op == 'exchange' || curr.op == 'cexchange')  // TODO: What other instructions?
                {
                    // For multi-target ops, break them into single-target ops.
                    if (curr.conditionQubits.countOneBits() > 1)
                    {
                        did_something = true;
                        this.removeInstruction(instIndex);
                        var low = curr.conditionQubits.getLowestBitIndex();
                        var high = curr.conditionQubits.getHighestBitIndex();
                        var cond_minus_one = new BitField(curr.conditionQubits);
                        var cond_one = new BitField(curr.conditionQubits);
                        var targ = curr.targetQubits;
                        cond_one.set(0);
                        cond_one.setBit(high, 1);
                        cond_minus_one.setBit(high, 0);

                        v_op = 'crootnot';
                        vt_op = 'crootnot_inv';
                        if (curr.op == 'exchange' || curr.op == 'cexchange')
                        {
                            v_op = 'rootexchange';
                            vt_op = 'rootexchange_inv';
                        }
                        this.insertInstruction(instIndex, new QInstruction(v_op, curr.targetQubits, cond_minus_one, 0.0, curr.codeLabel));
                        this.insertInstruction(instIndex, new QInstruction('cnot', cond_one, cond_minus_one, 0.0, curr.codeLabel));
                        this.insertInstruction(instIndex, new QInstruction(vt_op, curr.targetQubits, cond_one, 0.0, curr.codeLabel));
                        this.insertInstruction(instIndex, new QInstruction('cnot', cond_one, cond_minus_one, 0.0, curr.codeLabel));
                        this.insertInstruction(instIndex, new QInstruction(v_op, targ, cond_one, 0.0, curr.codeLabel));

                        did_something = true;
                    }
                }
            }
        }
        this.cancelRedundantOperations();
    }

    this.convertGatesTo2Condition = function()
    {
//        this.convertExchangeToCnot(true);    // only convert conditional exchanges
        this.convertGatesToOneTargetQubit();
        var bfi = new BitField(0, this.qReg.numQubits);
        var bfs = new BitField(0, this.qReg.numQubits);
        var bf_primary = new BitField(0, this.qReg.numQubits);
        var bf_secondary = new BitField(0, this.qReg.numQubits);

        // Implements Seciotn 7.3 in Elementary Quantum Gates
        var did_something = true;
        while (did_something)
        {
            did_something = false;
            for (var instIndex = 0; instIndex < this.instructions.length; ++instIndex)
            {
                var curr = this.instructions[instIndex];
                if (curr.op == 'cnot' || curr.op == 'not' || curr.op == 'exchange')  // TODO: What other instructions?
                {
                    // Turn 3+ condition gates into Toffolis.
                    var num_condition_bits = curr.conditionQubits.countOneBits();
                    var targ = curr.targetQubits;
                    if (num_condition_bits > 2)
                    {
                        bfi.set(curr.targetQubits);
                        bfi.orEquals(curr.conditionQubits);
                        // Find a temp-bit
                        var bfi_low = bfi.getLowestBitIndex();
                        var bfi_high = bfi.getHighestBitIndex();
                        var scratch_bit = bfi_low - 1;
                        if (bfi_low == 0)
                        {
                            scratch_bit = 1;
                            while (bfi.getBit(scratch_bit))
                                scratch_bit++;
                        }
                        // If there's an available scratch bit, proceed.
                        if (scratch_bit < this.qReg.numQubits)
                        {
                            did_something = true;
                            bfs.set(0);
                            bfs.setBit(scratch_bit, 1);
                            var num_primary_conditions = num_condition_bits >>> 1;
                            bf_primary.set(0);
                            bf_primary.setBit(scratch_bit, 1);
                            bf_secondary.set(0);
                            var primary_count = 0;
                            for (var bit = bfi_low; bit <= bfi_high; ++bit)
                            {
                                if (curr.conditionQubits.getBit(bit))
                                {
                                    if (primary_count < num_primary_conditions)
                                    {
                                        bf_primary.setBit(bit, 1);
                                        primary_count++;
                                    }
                                    else
                                    {
                                        bf_secondary.setBit(bit, 1);
                                    }
                                }
                            }
                            this.removeInstruction(instIndex);
                            this.insertInstruction(instIndex, new QInstruction('cnot', bfs, bf_secondary, 0.0, curr.codeLabel));
                            this.insertInstruction(instIndex, new QInstruction(curr.op, targ, bf_primary, 0.0, curr.codeLabel));
                            this.insertInstruction(instIndex, new QInstruction('cnot', bfs, bf_secondary, 0.0, curr.codeLabel));
                            this.insertInstruction(instIndex, new QInstruction(curr.op, targ, bf_primary, 0.0, curr.codeLabel));
                        }
                    }
                }
            }
        }
        this.cancelRedundantOperations();
    }

    this.moveCnotTargets = function(dest_index, dontUnTwistAtEnd)
    {
        var exchangeBits = new BitField(0, this.qReg.numQubits);
        var exchangeBitsC = new BitField(0, this.qReg.numQubits);
        var exchangeBitsT = new BitField(0, this.qReg.numQubits);
        var swapper = new BitSwapper(this.qReg.numQubits);
        var use_exchange_instr = false;

        var first_cnot = true;

        for (var instIndex = 0; instIndex < this.instructions.length; ++instIndex)
        {
            var curr = this.instructions[instIndex];
            swapper.convertInstruction(curr);
            // Whatever the instruction is (if there are conditions or it's an exchange), collect all of the
            // bits together.
            if (curr.op == 'cnot' 
                && (curr.targetQubits.countOneBits() == 1) 
                && !isAllZero(curr.conditionQubits))
            {
                var targ = curr.targetQubits.getLowestBitIndex();
                var bit = curr.targetQubits.getLowestBitIndex();
                while (bit != dest_index)
                {
                    var max_step = 0;
                    var step = dest_index - bit;
                    if (max_step)
                    {
                        if (step > max_step)
                            step = max_step;
                        if (step < -max_step)
                            step = -max_step;
                    }
                    if (use_exchange_instr || first_cnot)
                    {
                        exchangeBits.set(0);
                        exchangeBits.setBit(bit, 1);
                        exchangeBits.setBit(bit + step, 1);
                        this.insertInstruction(instIndex, new QInstruction('exchange', exchangeBits, 0, 0.0, curr.codeLabel));
                        instIndex++;
                    }
                    else
                    {
                        // exhange made from Hadamard and CNOT
                        exchangeBits.set(0);
                        exchangeBitsC.set(0);
                        exchangeBitsT.set(0);
                        exchangeBits.setBit(bit, 1);
                        exchangeBits.setBit(bit + step, 1);
                        exchangeBitsC.setBit(bit, 1);
                        exchangeBitsT.setBit(bit + step, 1);
                        this.insertInstruction(instIndex, new QInstruction('cnot', exchangeBitsT, exchangeBitsC, 0.0, curr.codeLabel));
                        this.insertInstruction(instIndex, new QInstruction('hadamard', exchangeBits, 0, 0.0, curr.codeLabel));
                        this.insertInstruction(instIndex, new QInstruction('cnot', exchangeBitsT, exchangeBitsC, 0.0, curr.codeLabel));
                        this.insertInstruction(instIndex, new QInstruction('hadamard', exchangeBits, 0, 0.0, curr.codeLabel));
                        this.insertInstruction(instIndex, new QInstruction('cnot', exchangeBitsT, exchangeBitsC, 0.0, curr.codeLabel));
                        instIndex += 5;
                    }
                    swapper.swap(bit, bit + step, curr);
                    bit += step;
                }
                first_cnot = false;
            }
        }
        if (!dontUnTwistAtEnd)
        {
            // Unwind the swapper
            for (var sb = 0; sb < swapper.numBits; ++sb)
            {
                if (swapper.table[sb] != sb)
                {
                    var sb2 = sb + 1;
                    while (swapper.table[sb2] != sb)
                        sb2++;
                    while (sb2 > sb)
                    {
                        exchangeBits.set(0);
                        exchangeBits.setBit(sb2, 1);
                        exchangeBits.setBit(sb2 - 1, 1);
                        this.insertInstruction(instIndex, new QInstruction('exchange', exchangeBits, 0, 0.0, 'swap restore'));
                        swapper.swap(sb2, sb2 - 1);
                        instIndex++;
                        sb2--;
                    }
                }
            }
        }
//        this.cancelRedundantOperations();
    }

    // Add (LOTS of) exchange instructions to make qubits adjacent to one another.
    this.migrateAdjacent1D = function(collectTargets, dontUnTwistAtEnd)
    {
        var allInstBits = new BitField(0, this.qReg.numQubits);
        var exchangeBits = new BitField(0, this.qReg.numQubits);
        var swapper = new BitSwapper(this.qReg.numQubits);

        for (var instIndex = 0; instIndex < this.instructions.length; ++instIndex)
        {
            var curr = this.instructions[instIndex];
            swapper.convertInstruction(curr);
            // Whatever the instruction is (if there are conditions or it's an exchange), collect all of the
            // bits together.
            if (curr.op == 'exchange'
                || curr.op == 'dual_rail_beamsplitter'
                || curr.op == 'pbs'
                || curr.op == 'pair_source'
                || curr.op == 'rootexchange'
                || curr.op == 'rootexchange_inv'
                || !isAllZero(curr.conditionQubits))
            {
                allInstBits.set(curr.targetQubits);
                allInstBits.orEquals(curr.conditionQubits);
                var count = allInstBits.countOneBits();
                if (count > 1)
                {
                    var low = allInstBits.getLowestBitIndex();
                    var high = allInstBits.getHighestBitIndex();
                    while (high - low > count - 1)
                    {
                        var center = 0;
                        var inv_count = 0;
                        for (var i = low; i <= high; ++i)
                        {
                            if (!allInstBits.getBit(i))
                            {
                                center += i;
                                inv_count++;
                            }
                        }
                        center = 0| (center / inv_count);
                        for (bit = center; bit < high; ++bit)
                        {
                            if (!allInstBits.getBit(bit)
                                && allInstBits.getBit(bit + 1))
                            {
                                exchangeBits.set(0);
                                exchangeBits.setBit(bit, 1);
                                exchangeBits.setBit(bit + 1, 1);
                                this.insertInstruction(instIndex, new QInstruction('exchange', exchangeBits, 0, 0.0, curr.codeLabel));
                                swapper.swap(bit, bit + 1, curr);
                                instIndex++;

                                allInstBits.set(curr.targetQubits);
                                allInstBits.orEquals(curr.conditionQubits);
                                low = allInstBits.getLowestBitIndex();
                                high = allInstBits.getHighestBitIndex();
                            }
                        }
                        for (bit = center; bit > low; --bit)
                        {
                            if (!allInstBits.getBit(bit)
                                && allInstBits.getBit(bit - 1))
                            {
                                exchangeBits.set(0);
                                exchangeBits.setBit(bit, 1);
                                exchangeBits.setBit(bit - 1, 1);
                                this.insertInstruction(instIndex, new QInstruction('exchange', exchangeBits, 0, 0.0, curr.codeLabel));
                                swapper.swap(bit, bit - 1, curr);
                                instIndex++;

                                allInstBits.set(curr.targetQubits);
                                allInstBits.orEquals(curr.conditionQubits);
                                low = allInstBits.getLowestBitIndex();
                                high = allInstBits.getHighestBitIndex();
                            }
                        }
                    }
                    if  (collectTargets)
                    {
                        allInstBits.set(curr.targetQubits);
                        count = allInstBits.countOneBits();
                        var low = allInstBits.getLowestBitIndex();
                        var high = allInstBits.getHighestBitIndex();
                        while (high - low > count - 1)
                        {
                            var center = 0;
                            var inv_count = 0;
                            for (var i = low; i <= high; ++i)
                            {
                                if (!allInstBits.getBit(i))
                                {
                                    center += i;
                                    inv_count++;
                                }
                            }
                            center = 0| (center / inv_count);
                            for (bit = center; bit < high; ++bit)
                            {
                                if (!allInstBits.getBit(bit)
                                    && allInstBits.getBit(bit + 1))
                                {
                                    exchangeBits.set(0);
                                    exchangeBits.setBit(bit, 1);
                                    exchangeBits.setBit(bit + 1, 1);
                                    this.insertInstruction(instIndex, new QInstruction('exchange', exchangeBits, 0, 0.0, curr.codeLabel));
                                    swapper.swap(bit, bit + 1, curr);
                                    instIndex++;

                                    allInstBits.set(curr.targetQubits);
                                    low = allInstBits.getLowestBitIndex();
                                    high = allInstBits.getHighestBitIndex();
                                }
                            }
                            for (bit = center; bit > low; --bit)
                            {
                                if (!allInstBits.getBit(bit)
                                    && allInstBits.getBit(bit - 1))
                                {
                                    exchangeBits.set(0);
                                    exchangeBits.setBit(bit, 1);
                                    exchangeBits.setBit(bit - 1, 1);
                                    this.insertInstruction(instIndex, new QInstruction('exchange', exchangeBits, 0, 0.0, curr.codeLabel));
                                    swapper.swap(bit, bit - 1, curr);
                                    instIndex++;

                                    allInstBits.set(curr.targetQubits);
                                    low = allInstBits.getLowestBitIndex();
                                    high = allInstBits.getHighestBitIndex();
                                }
                            }
                        }
                    }
                }
            }
        }
        if (!dontUnTwistAtEnd)
        {
            // Unwind the swapper
            for (var sb = 0; sb < swapper.numBits; ++sb)
            {
                if (swapper.table[sb] != sb)
                {
                    var sb2 = sb + 1;
                    while (swapper.table[sb2] != sb)
                        sb2++;
                    while (sb2 > sb)
                    {
                        exchangeBits.set(0);
                        exchangeBits.setBit(sb2, 1);
                        exchangeBits.setBit(sb2 - 1, 1);
                        this.insertInstruction(instIndex, new QInstruction('exchange', exchangeBits, 0, 0.0, 'swap restore'));
                        swapper.swap(sb2, sb2 - 1);
                        instIndex++;
                        sb2--;
                    }
                }
            }
        }
        this.cancelRedundantOperations();
    }

    // Add (LOTS of) exchange instructions to make qubits adjacent to one another.
    // This is V2, which tries to reduce gate-to-gate twisting,
    // and considers pre-twist and post-twist operations to be free.
    this.migrateAdjacent1D_V2 = function()
    {
        var exchangeBits = new BitField(0, this.qReg.numQubits);
        var used_bits = new BitField(0, this.qReg.numQubits);
        var swapper = new BitSwapper(this.qReg.numQubits);

        for (var instIndex = 0; instIndex < this.instructions.length; ++instIndex)
        {
            var curr = this.instructions[instIndex];
            swapper.convertInstruction(curr);
            // Whatever the instruction is (if there are conditions or it's an exchange), collect all of the
            // bits together.
            if (curr.op == 'exchange' || curr.op == 'rootexchange' || curr.op == 'rootexchange_inv'
                || !isAllZero(curr.conditionQubits))
            {
                var cond_count = curr.conditionQubits.countOneBits();
                var targ_count = curr.targetQubits.countOneBits();
                // Special common case: 2 targets, 0 or 1 condition (c-exchange)
                if (cond_count <= 1 && targ_count == 2)
                {
                    var cond = curr.conditionQubits.getLowestBitIndex();
                    var targ_high = curr.targetQubits.getHighestBitIndex();
                    var targ_low = curr.targetQubits.getLowestBitIndex();
                    if (targ_high == targ_low + 1 &&
                        (cond == -1 || cond == targ_low - 1 || cond == targ_high + 1))
                    {
                        // Everything's already good, nothing to do.
                    }
                    else
                    {
                        var best_cost = 1000000;
                        var best_th = -1;
                        var best_tl = -1;
                        var best_c = -1;
                        // Search every option. TODO: This could surely be reduced.
                        for (var tb = 0; tb < this.qReg.numQubits - 1; ++tb)
                        {
                            var whatif_targ_low = tb;
                            var whatif_targ_high = tb + 1;
                            var whatif_cond = -1;
                            // TODO: cost should be zero if it's apre-twist (bits not yet used)
                            var cost = 0;
                            if (used_bits.getBit(swapper.table[whatif_targ_high]) ||
                                    used_bits.getBit(swapper.table[targ_high]))
                                cost += Math.abs(whatif_targ_high - targ_high);
                            if (used_bits.getBit(swapper.table[whatif_targ_low]) ||
                                    used_bits.getBit(swapper.table[targ_low]))
                                cost += Math.abs(whatif_targ_low - targ_low);
                            if (cond_count)
                            {
                                var c1 = tb - 1;
                                var c2 = tb + 2;
                                var cost1 = 1000000;
                                var cost2 = 1000000;
                                if (c1 >= 0)
                                {
                                    cost1 = Math.abs(c1 - cond);
                                    if (!used_bits.getBit(swapper.table[c1]) &&
                                        !used_bits.getBit(swapper.table[cond]))
                                            cost1 = 0;
                                }
                                if (c2 < qReg.numQubits)
                                {
                                    cost2 = Math.abs(c2 - cond);
                                    if (!used_bits.getBit(swapper.table[c2]) &&
                                        !used_bits.getBit(swapper.table[cond]))
                                            cost2 = 0;
                                }


//                                console.log('Inst '+instIndex+'/'+curr.op+': cond cost '+c1+':'+cost1+' '+c2+':'+cost2);
                                if (cost1 < cost2)
                                {
                                    whatif_cond = c1;
//                                console.log('>>>> picked '+c1+':'+cost1);
                                    cost += cost1;
                                }
                                else
                                {
                                    whatif_cond = c2;
//                                console.log('>>>> picked '+c2+':'+cost2);
                                    cost += cost1;
                                }
                            }
                            if (cost < best_cost)
                            {
                                best_cost = cost;
                                best_th = whatif_targ_high;
                                best_tl = whatif_targ_low;
                                best_c = whatif_cond;
                            }
                        }
                        // Now, we should know what the best option is. Make it so.
                        var move_done = false;
                        while (!move_done)
                        {
                            cond = curr.conditionQubits.getLowestBitIndex();
                            targ_high = curr.targetQubits.getHighestBitIndex();
                            targ_low = curr.targetQubits.getLowestBitIndex();
                            if (targ_high != best_th)
                            {
                                var bit = targ_high;
                                var dest = best_th;
                                var dir = (dest > bit) ? 1 : -1;
                                if (!used_bits.getBit(swapper.table[bit]) &&
                                    !used_bits.getBit(swapper.table[dest]))
                                {
                                    used_bits.setBit(swapper.table[bit], 1);
                                    used_bits.setBit(swapper.table[dest], 1);
                                    swapper.swap(bit, dest, curr);
                                    bit = dest;
                                }
                                while (bit != dest)
                                {
                                    exchangeBits.set(0);
                                    exchangeBits.setBit(bit, 1);
                                    exchangeBits.setBit(bit + dir, 1);
                                    this.insertInstruction(instIndex, new QInstruction('exchange', exchangeBits, 0, 0.0, curr.codeLabel));
                                    swapper.swap(bit, bit + dir, curr);
                                    instIndex++;
                                    bit += dir;
                                }
                                cond = curr.conditionQubits.getLowestBitIndex();
                                targ_high = curr.targetQubits.getHighestBitIndex();
                                targ_low = curr.targetQubits.getLowestBitIndex();
                                continue;
                            }
                            if (targ_low != best_tl)
                            {
                                var bit = targ_low;
                                var dest = best_tl;
                                var dir = (dest > bit) ? 1 : -1;
                                if (!used_bits.getBit(swapper.table[bit]) &&
                                    !used_bits.getBit(swapper.table[dest]))
                                {
                                    used_bits.setBit(swapper.table[bit], 1);
                                    used_bits.setBit(swapper.table[dest], 1);
                                    swapper.swap(bit, dest, curr);
                                    bit = dest;
                                }
                                while (bit != dest)
                                {
                                    exchangeBits.set(0);
                                    exchangeBits.setBit(bit, 1);
                                    exchangeBits.setBit(bit + dir, 1);
                                    this.insertInstruction(instIndex, new QInstruction('exchange', exchangeBits, 0, 0.0, curr.codeLabel));
                                    swapper.swap(bit, bit + dir, curr);
                                    instIndex++;
                                    bit += dir;
                                }
                                cond = curr.conditionQubits.getLowestBitIndex();
                                targ_high = curr.targetQubits.getHighestBitIndex();
                                targ_low = curr.targetQubits.getLowestBitIndex();
                                continue;
                            }
                            if (cond_count && cond != best_c)
                            {
                                var bit = cond;
                                var dest = best_c;
                                var dir = (dest > bit) ? 1 : -1;
                                if (!used_bits.getBit(swapper.table[bit]) &&
                                    !used_bits.getBit(swapper.table[dest]))
                                {
                                    used_bits.setBit(swapper.table[bit], 1);
                                    used_bits.setBit(swapper.table[dest], 1);
                                    swapper.swap(bit, dest, curr);
                                    bit = dest;
                                }
                                while (bit != dest)
                                {
                                    exchangeBits.set(0);
                                    exchangeBits.setBit(bit, 1);
                                    exchangeBits.setBit(bit + dir, 1);
                                    this.insertInstruction(instIndex, new QInstruction('exchange', exchangeBits, 0, 0.0, curr.codeLabel));
                                    swapper.swap(bit, bit + dir, curr);
                                    instIndex++;
                                    bit += dir;
                                }
                                cond = curr.conditionQubits.getLowestBitIndex();
                                targ_high = curr.targetQubits.getHighestBitIndex();
                                targ_low = curr.targetQubits.getLowestBitIndex();
                                continue;
                            }

                            if (targ_high == best_th &&
                                targ_low == best_tl &&
                                (cond_count == 0 || cond == best_c))
                            {
                                move_done = true;
                            }
                        }
                    }
                }
            }
            if (curr.op != 'write' && curr.op != 'postselect' && curr.op != 'discard')
            {
                // Set the "used" bits
                var allInstBits = new BitField(0, this.qReg.numQubits);
                allInstBits.set(curr.targetQubits);
                allInstBits.orEquals(curr.conditionQubits);
                allInstBits.orEquals(curr.auxQubits);
                for (var bit = 0; bit < qReg.numQubits; ++bit)
                {
                    if (allInstBits.getBit(bit))
                        used_bits.setBit(swapper.table[bit], 1);
                }
            }
        }
        // TODO: re-assign inputs and outputs!
        if (0)
        {
            // Unwind the swapper
            for (var sb = 0; sb < swapper.numBits; ++sb)
            {
                if (swapper.table[sb] != sb)
                {
                    var sb2 = sb + 1;
                    while (swapper.table[sb2] != sb)
                        sb2++;
                    while (sb2 > sb)
                    {
                        exchangeBits.set(0);
                        exchangeBits.setBit(sb2, 1);
                        exchangeBits.setBit(sb2 - 1, 1);
                        this.insertInstruction(instIndex, new QInstruction('exchange', exchangeBits, 0, 0.0, 'swap restore'));
                        swapper.swap(sb2, sb2 - 1);
                        instIndex++;
                        sb2--;
                    }
                }
            }
        }
        this.cancelRedundantOperations();
    }

    ///////////////////////////////////
}


// Node.js hookups
module.exports.qc_options = qc_options;
module.exports.QStaff = QStaff;
