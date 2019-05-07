/////////////////////////////////////////////////////////////////////////////
// qcengine_scriptpanel.js
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
// The Script panel
//
//

var qc = null;
var qint = null;

// This class provides a fairly safe scripting object.
function QScriptInterface(qReg)
{
    this.qReg = qReg;
    qReg.qpu = this;
    this.bitsRequired = 0;
    this.preferredBlockBits = 16;
    this.printBox = null;
    this.qint = new Array();
    this.prev_activated_qubits = 0;
    this.stashed_message = '';
    this.user_params = {
        'radians':false,
        'auto_draw':qc_options.auto_draw,
        'print_function':qc_options.print_function,
    };

    qint = this.qint;
    qint.numUtil = 0;

    this.set_param = function(param_name, param_value)
    {
        this.user_params[param_name] = param_value;
    }

    this.get_param = function(param_name, default_value=null)
    {
        value = this.user_params[param_name];
        if (value == null)
            return default_value;
        return value;
    }

    this.set_canvas = function(canvas)
    {
        if (this.panel_staff)
            this.panel_staff.set_canvas(canvas);
    }

    this.start = function()
    {
        // If we get here, the qc is already started.
    }

    qint.new = function(numBits, name)
    {
        if (numBits == 0)
            return null;
        var theInt = new QInt(numBits, name, qReg.qpu);
        if (!theInt.valid)
            return null;
        this[name] = theInt;
        qReg.qIntsChanged();
        return theInt;
    }

    this.print = function(message)
    {
        var custom_print = this.get_param('print_function');
        if (custom_print)
            custom_print(message);
        else if (this.printBox)
            this.printBox.value += message;
        else
        {
            var ends_with_newline = (message && message.length && message[message.length - 1] == '\n');
            if (ends_with_newline)
            {
                // console.log will add a newline, so skip the one in the string
                console.log(this.stashed_message + message.substring(0, message.length - 1));
                this.stashed_message = '';
            }
            else
            {
                this.stashed_message += message;
            }
        }
    }

    this.next_qint_serial_number = function()
    {
        var num = this.qint_serial_number++;
        return num;
    }

    this.reset = function(numBits, preferredBlockBits)
    {
        if (preferredBlockBits != null)
            this.preferredBlockBits = preferredBlockBits;

        var blockBits = this.preferredBlockBits;
        if (blockBits > numBits)
            blockBits = numBits;

        this.qint = new Array();
        this.qint_serial_number = 0;

        this.qReg.position_encoded = false;
        this.qReg.deactivate();
        this.qReg.removeAllQInts();
        this.qReg.setSize(numBits, blockBits, qReg.doublePrecision);
        this.qReg.activate();
        this.qReg.staff.clear();

        this.qReg.use_photon_sim = false;
//        if (this.printBox)
//            this.printBox.value = "";
//		this.enableAnimation();
        this.qReg.changed();
        if (this.chp)
            this.chp.reset(this.qReg);

        // if (this.prev_activated_qubits != this.numQubits)
        //     console.log('QCEngine activated: ' + this.qReg.numQubits + ' qubits.');
        this.prev_activated_qubits = this.qReg.numQubits;
    }

    this.parse_chp_commands = function(program_str)
    {
        if (this.chp == null)
          this.chp = new CHPSimulator();
        this.chp.parse_chp_commands(program_str);
    }

    this.clearOutput = function()
    {
        if (this.printBox)
            this.printBox.value = "";
    }

    this.numQubits = function()
    {
        if (this.qReg)
            return this.qReg.numQubits;
        return 0;
    }

    this.renderModel = function()
    {
        this.qReg.staff.draw();
        this.qReg.staff.renderModel();
    }

    this.flat = function(arg)
    {
        if (is_qint(arg))
            return arg.mask();
        return arg;
    }

    this.to_deg = function(theta)
    {
        if (this.user_params['radians'])
            return theta * 180.0 / Math.PI;
        return theta;
    }

	// pokeValues allows us to manually set up a state. It would be great
    // to replace this with a dynamic universal state-setter which is actually
    // done legally, but even then the phase won't match what the user wants.
    this.pokeValues = function (values_array)
    {
        var pairs = values_array.length / 2;
        console.log(values_array);
        console.log(pairs);
        for (var i = 0; i < pairs; ++i)
            this.qReg.pokeComplexValue(i, values_array[i * 2], values_array[i * 2 + 1]);
        this.qReg.renormalize();
    }

    this.set_random = function ()
    {
        // TODO: Make this more efficient, by a lot.
        for (var i = 0; i < (1 << this.qReg.numQubits); ++i)
            this.qReg.pokeComplexValue(i, Math.random() * 2.0 - 1.0, Math.random() * 2.0 - 1.0);
    }

    this.normalize = function()
    {
        return this.qReg.renormalize();
    }

    // Run all instructions with a given label.
    this.runLabel = function(label)
    {
        this.qReg.staff.runLabel(label);
    }

	// (this is the default) allow user-friendly animations
	this.enableAnimation = function ()
	{
		this.qReg.animateWidgets = true;

		// hook up the animated versions of the functions
	    this.not       = this.anim_not;
        this.cnot      = this.anim_cnot;
        this.exchange  = this.anim_exchange;
        this.rootexchange      = this.anim_rootexchange;
        this.rootexchange_inv  = this.anim_rootexchange_inv;
        this.hadamard  = this.anim_hadamard;
        this.chadamard = this.anim_chadamard;
        this.rootnot      = this.anim_rootnot;
        this.rootnot_inv  = this.anim_rootnot_inv;
        this.crootnot     = this.anim_crootnot;
        this.crootnot_inv = this.anim_crootnot_inv;
        this.rotatex    = this.anim_rotatex;
        this.crotatex   = this.anim_crotatex;
        this.y    = this.anim_y;
        this.rotatey    = this.anim_rotatey;
        this.rotatez    = this.anim_rotatez;
        this.crotatey   = this.anim_crotatey;
        this.phase     = this.anim_phase;
        this.noise     = this.anim_noise;
        this.optical_phase        = this.anim_optical_phase;
        this.optical_beamsplitter = this.anim_optical_beamsplitter;
        this.coptical_beamsplitter = this.anim_coptical_beamsplitter;
        this.dual_rail_beamsplitter = this.anim_dual_rail_beamsplitter;
        this.pbs = this.anim_pbs;
        this.pair_source = this.anim_pair_source;
        this.polarization_grating_in = this.anim_polarization_grating_in;
        this.polarization_grating_out = this.anim_polarization_grating_out;
        this.postselect     = this.anim_postselect;
        this.postselect_qubit_pair     = this.anim_postselect_qubit_pair;
        this.discard     = this.anim_discard;
        this.write     = this.anim_write;
		this.read      = this.anim_read;
        this.peek      = this.anim_peek;
        this.nop       = this.anim_nop;
        this.start_photon_sim = this.anim_start_photon_sim;
        this.stop_photon_sim = this.anim_stop_photon_sim;
        this.start_chp_sim = this.anim_start_chp_sim;
        this.stop_chp_sim = this.anim_stop_chp_sim;
        this.push_mixed_state = this.anim_push_mixed_state;
        this.use_mixed_state = this.anim_use_mixed_state;

        this.setupAliases();
	}

	// Speed up computation ( a lot) by disabling animations
	this.disableAnimation = function ()
	{
		this.qReg.animateWidgets = false;

		// hook up the animated versions of the functions
	    this.not       = this.fast_not;
        this.cnot      = this.fast_cnot;
        this.exchange  = this.fast_exchange;
        this.rootexchange      = this.fast_rootexchange;
        this.rootexchange_inv  = this.fast_rootexchange_inv;
		this.hadamard  = this.fast_hadamard;
		this.chadamard = this.fast_chadamard;
        this.rootnot      = this.fast_rootnot;
        this.rootnot_inv  = this.fast_rootnot_inv;
        this.crootnot     = this.fast_crootnot;
        this.crootnot_inv = this.fast_crootnot_inv;
        this.rotatex    = this.fast_rotatex;
        this.crotatex   = this.fast_crotatex;
        this.y    = this.fast_y;
        this.rotatey    = this.fast_rotatey;
        this.rotatez    = this.fast_rotatez;
        this.crotatey   = this.fast_crotatey;
        this.phase     = this.fast_phase;
        this.noise     = this.fast_noise;
        this.optical_phase        = this.fast_optical_phase;
        this.optical_beamsplitter = this.fast_optical_beamsplitter;
        this.coptical_beamsplitter = this.fast_coptical_beamsplitter;
        this.dual_rail_beamsplitter = this.fast_dual_rail_beamsplitter;
        this.pbs = this.fast_pbs;
        this.pair_source = this.fast_pair_source;
        this.polarization_grating_in = this.fast_polarization_grating_in;
        this.polarization_grating_out = this.fast_polarization_grating_out;
        this.postselect     = this.fast_postselect;
        this.postselect_qubit_pair     = this.fast_postselect_qubit_pair;
        this.discard     = this.fast_discard;
		this.write     = this.fast_write;
        this.read      = this.fast_read;
        this.peek      = this.fast_peek;
        this.nop       = this.fast_nop;
        this.start_photon_sim = this.fast_start_photon_sim;
        this.stop_photon_sim = this.fast_stop_photon_sim;
        this.start_chp_sim = this.fast_start_chp_sim;
        this.stop_chp_sim = this.fast_stop_chp_sim;
        this.push_mixed_state = this.fast_push_mixed_state;
        this.use_mixed_state = this.fast_use_mixed_state;

        this.setupAliases();
	}

    this.setupAliases = function()
    {
        // and some short-versions
        this.had = this.hadamard;
        this.chad = this.chadamard;
        this.phaseShift = this.phase;
        this.beamsplitter = this.optical_beamsplitter;
        this.cbeamsplitter = this.coptical_beamsplitter;
        this.bs = this.dual_rail_beamsplitter;
        this.rotate = this.rotatex;
        this.rot = this.rotatex;
        this.rotx = this.rotatex;
        this.roty = this.rotatey;
        this.rx = this.rotatex;
        this.ry = this.rotatey;
        this.rz = this.rotatez;
        this.crx = this.rotatex;
        this.cry = this.rotatey;
        this.crz = this.rotatez;
        this.crotatex = this.rotatex;
        this.crotatey = this.rotatey;
        this.crotatez = this.rotatez;
        this.x = this.not;
        this.cx = this.cnot;
        this.cy = this.y;
        this.swap = this.exchange;
        this.cswap = this.exchange;
        this.cexchange = this.exchange;
        this.rootx = this.rootnot;
        this.crootx = this.crootnot;
        this.rootx_inv = this.rootnot_inv;
        this.crootx_inv = this.crootnot_inv;
    }

    this.new_qubits = function(num_qubits, name=null)
    {
        return new Qubits(num_qubits, name, this);
    }
    
    this.new_qint = function(num_qubits, name=null)
    {
        return new QInt(num_qubits, name, this);
    }
    
    this.new_quint = function(num_qubits, name=null)
    {
        return new QUInt(num_qubits, name, this);
    }
    
    this.new_qfixed = function(num_qubits, radix, name=null)
    {
        return new QFixed(num_qubits, radix, name, this);
    }
    
    this.advanceOnAdd = function (enable)
    {
        this.qReg.staff.advanceOnAdd(enable);
    }

    this.record_js = function()
    {
    }

    this.draw = function(expand_canvas=true)
    {
        scale = this.get_param('draw_scale');
        if (scale)
            this.qReg.staff.wheelScale = scale;
        if (expand_canvas)
            this.qReg.staff.fullSnapshot(); // Expand canvas and draw
        else if (this.staff_panel)
            this.staff_panel.draw();
    }

    this.label = function (codeLabel)
    {
        this.qReg.staff.setCodeLabel(codeLabel);
    }

    this.codeLabel = function (codeLabel)
    {
        this.qReg.staff.setCodeLabel(codeLabel);
    }

    this.advanceToEnd = function ()
    {
        this.qReg.staff.advanceToEnd();
    }

    // Allow the staff to accumulate operations as they're performed.
	this.enableRecording = function ()
	{
        this.enableAnimation();
        this.qReg.staff.enableTracking();
    }

	this.disableRecording = function ()
	{
        this.qReg.staff.disableTracking();
    }

	this.clearRecording = function ()
	{
        this.qReg.staff.clear();
    }

    this.repeatFromLabel = function(label)
    {
        return this.qReg.staff.repeatFromLabel(label);
    }

    this.intTest = function(numBits, name)
    {
        var theInt = new QInt(numBits, name, qReg);
        if (theInt.valid)
            return theInt;
        else
            return null;
    }

    this.pull_state = function()
    {
        return this.qReg.pull_state();
    }
    
    this.push_state = function(new_state, normalize=true)
    {
        this.qReg.push_state(new_state, normalize);
    }
    
    this.check_state = function(check_state, epsilon=0.000001)
    {
        return this.qReg.check_state(check_state, epsilon);
    }
    
    this.print_state_vector = function(line=-1, min_value_to_print=0.000000001, max_num_values=1000)
    {
        var out_str = this.qReg.print_state_vector_to_string(line, min_value_to_print, max_num_values);
        this.print(out_str);
    }
    
    this.copyAllProbabilities = function ()
    {
        return this.qReg.copyAllProbabilities();
    }

    this.pokeAllProbabilities = function (new_probabilities)
    {
        this.qReg.pokeAllProbabilities(new_probabilities);
    }

    this.clear_mbc = function()
    {
        if (this.qReg.mbc)
            this.qReg.mbc.clear();
    }

    this.build_mbc_graph = function(use_alt_links)
    {
        if (this.qReg.mbc == null)
            this.qReg.mbc = new MeasurementBasedComputationConverter(this.qReg);
        this.qReg.mbc.build_mbc_graph(use_alt_links);
    }

    this.convert_to_mbc = function(append_to_current, ignore_input, use_alt_links)
    {
        if (this.qReg.mbc == null || this.qReg.mbc.nodes.length == 0)
            this.build_mbc_graph(use_alt_links);
        this.qReg.mbc.convert_to_mbc(append_to_current, ignore_input, use_alt_links);
    }

    this.fast_not = function(mask, cond) { this.qReg.cnot(this.flat(mask), this.flat(cond)); }
    this.anim_not = function(mask, cond)          
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        if (mask && cond)
            this.qReg.staff.addInstructionAfterInsertionPoint('cnot', mask, cond, 0);
        else if (mask)
            this.qReg.staff.addInstructionAfterInsertionPoint('not', mask, 0, 0);
    }

    this.cphase = function(theta, cond=~0) { this.phase(theta, 0, cond); }

    this.z = function(mask, cond) { this.phase(180, mask, cond); }
    this.cz = function(mask, cond) { this.phase(180, mask, cond); }
    this.s = function(mask, cond) { this.phase(90, mask, cond); }
    this.t = function(mask, cond) { this.phase(45, mask, cond); }
    this.s_inv = function(mask, cond) { this.phase(-90, mask, cond); }
    this.t_inv = function(mask, cond) { this.phase(-45, mask, cond); }

    this.graph = function(pair_list)          
    {
        var bf = NewBitField(0, this.qReg.numQubits);
        for (var i = 0; i < pair_list.length; ++i)
        {
            bf.set(0);
            bf.setBit(pair_list[i][0] - qc_options.start_qubits_from, 1);
            bf.setBit(pair_list[i][1] - qc_options.start_qubits_from, 1);
            this.cz(bf);
        }
        bf.recycle();
    }

    this.bits = function(bit_array)
    {
        var bf = NewBitField(0, this.qReg.numQubits);
        if (bit_array.toFixed)
        {
            bf.setBit(bit_array - qc_options.start_qubits_from, 1);
        }
        else
        {
            for (var i = 0; i < bit_array.length; ++i)
                bf.setBit(bit_array[i] - qc_options.start_qubits_from, 1);
        }
        return bf;
    }

    this.reverse_bits = function(target_mask=0, extraConditionBits)
    {
        var mask = NewBitField(this.qReg.allBitsMask, this.qReg.numQubits);
        if (!isAllZero(target_mask))
            mask.andEquals(intToBitField(target_mask));
        hi = mask.getHighestBitIndex();
        lo = mask.getLowestBitIndex();

        var mask2 = NewBitField(0, this.qReg.numQubits);
        while (lo < hi)
        {
            mask2.set(0);
            mask2.setBit(lo, 1);
            mask2.setBit(hi, 1);
            this.exchange(mask2, extraConditionBits);

            hi -= 1;
            lo += 1;
            while (hi > lo && !mask.getBit(hi))
                hi -= 1;
            while (hi > lo && !mask.getBit(lo))
                lo += 1;
        }
        mask.recycle();
        mask2.recycle();
    }

    this.Grover = function(target_mask=~0, condition_mask=0)
    {
        this.hadamard(target_mask);
        this.x(target_mask);
        this.cz(0, target_mask|condition_mask);
        this.x(target_mask);
        this.hadamard(target_mask);
    }

    this.invQFT = function(target_mask=0)
    {
        this.QFT(target_mask, true);
    }

    this.QFT = function(target_mask=0, flip_h=false)
    {
        if (flip_h)
            this.reverse_bits(target_mask);
        var bits = this.qReg.numQubits;
        for (var i = 0; i < bits; ++i)
        {
            var bit1 = bits - (i + 1);
            if (flip_h)
                bit1 = i;
            var mask1 = 1 << bit1;
            if (!target_mask || getBit(target_mask, bit1))
            {
                this.hadamard(mask1);
                var theta = -90.0;
                if (flip_h)
                    theta = -theta; // If we're inverting, the phases need to be negative
                for (var j = i + 1; j < bits; ++j)
                {
                    var bit2 = bits - (j + 1);
                    if (flip_h)
                        bit2 = j;
                    var mask2 = 1 << bit2;
                    if (!target_mask || getBit(target_mask, bit2))
                    {
                        this.phase(theta, 0, mask1|mask2);
                        theta *= 0.5;
                    }
                }
            }
        }
        if (!flip_h)
            this.reverse_bits(target_mask);
    }

    this.fast_cnot = function(mask, cond) { this.qReg.cnot(this.flat(mask), this.flat(cond)); }
    this.anim_cnot = function(mask, cond)          
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        if (mask && cond)
            this.qReg.staff.addInstructionAfterInsertionPoint('cnot', mask, cond, 0);
        else if (mask)
            this.qReg.staff.addInstructionAfterInsertionPoint('not', mask, 0, 0);
    }

    this.fast_exchange = function(mask, cond) { this.qReg.exchange(this.flat(mask), this.flat(cond)); }
    this.anim_exchange = function(mask, cond)          
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        if (mask)
            this.qReg.staff.addInstructionAfterInsertionPoint('exchange', mask, cond, 0);
    }

    this.fast_rootexchange = function(mask, cond) { this.qReg.rootexchange(this.flat(mask), this.flat(cond)); }
    this.anim_rootexchange = function(mask, cond)          
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        if (mask)
            this.qReg.staff.addInstructionAfterInsertionPoint('rootexchange', mask, cond, 0);
    }

    this.fast_rootexchange_inv = function(mask, cond) { this.qReg.rootexchange_inv(this.flat(mask), this.flat(cond)); }
    this.anim_rootexchange_inv = function(mask, cond)          
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        if (mask)
            this.qReg.staff.addInstructionAfterInsertionPoint('rootexchange_inv', mask, cond, 0);
    }

	this.fast_hadamard = function(mask, cond) { this.qReg.hadamard(this.flat(mask)); }
    this.anim_hadamard = function(mask, cond)
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        if (mask && cond)
            this.qReg.staff.addInstructionAfterInsertionPoint('chadamard', mask, cond, 0);
        else if (mask)
            this.qReg.staff.addInstructionAfterInsertionPoint('hadamard', mask, 0, 0);
    }

	this.fast_chadamard = function(mask, cond) { this.qReg.chadamard(this.flat(mask), this.flat(cond)); }
    this.anim_chadamard = function(mask, cond)
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        if (mask && cond)
            this.qReg.staff.addInstructionAfterInsertionPoint('chadamard', mask, cond, 0);
        else if (mask)
            this.qReg.staff.addInstructionAfterInsertionPoint('hadamard', mask, 0, 0);
    }

    this.fast_rootnot = function(mask) { this.fast_crootnot(mask, 0); }
    this.anim_rootnot = function(mask) { this.anim_crootnot(mask, 0); }
    this.fast_rootnot_inv = function(mask) { this.fast_crootnot_inv(mask, 0); }
    this.anim_rootnot_inv = function(mask) { this.anim_crootnot_inv(mask, 0); }

    this.fast_crootnot = function(mask, cond) { this.qReg.crootnot(this.flat(mask), this.flat(cond)); }
    this.anim_crootnot = function(mask, cond)
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        this.qReg.staff.addInstructionAfterInsertionPoint('crootnot', mask, cond, 0);
    }
    this.fast_crootnot_inv = function(mask, cond) { this.qReg.crootnot_inv(this.flat(mask), this.flat(cond)); }
    this.anim_crootnot_inv = function(mask, cond)
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        this.qReg.staff.addInstructionAfterInsertionPoint('crootnot_inv', mask, cond, 0);
    }

    this.fast_y = function(mask, cond) { this.qReg.y(this.flat(mask), this.flat(cond)); }
    this.anim_y = function(mask, cond)
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        this.qReg.staff.addInstructionAfterInsertionPoint('y', mask, cond);
    }


	this.fast_rotatex = function(thetaDegrees, mask, cond) { this.qReg.crotatex(this.flat(mask), this.flat(cond), this.to_deg(thetaDegrees)); }
    this.anim_rotatex = function(thetaDegrees, mask, cond)
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        this.qReg.staff.addInstructionAfterInsertionPoint('crotatex', mask, cond, this.to_deg(thetaDegrees));
    }

	this.fast_crotatex = function(thetaDegrees, mask, cond) { this.qReg.crotatex(this.flat(mask), this.flat(cond), this.to_deg(thetaDegrees)); }
    this.anim_crotatex = function(thetaDegrees, mask, cond)
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        if (mask && cond)
            this.qReg.staff.addInstructionAfterInsertionPoint('crotatex', mask, cond, this.to_deg(thetaDegrees));
    }

    this.fast_rotatey = function(thetaDegrees, mask, cond) { this.qReg.crotatey(this.flat(mask), this.flat(cond), this.to_deg(thetaDegrees)); }
    this.anim_rotatey = function(thetaDegrees, mask, cond)
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        this.qReg.staff.addInstructionAfterInsertionPoint('crotatey', mask, cond, this.to_deg(thetaDegrees));
    }

    this.fast_crotatey = function(thetaDegrees, mask, cond) { this.qReg.crotatey(this.flat(mask), this.flat(cond), this.to_deg(thetaDegrees)); }
    this.anim_crotatey = function(thetaDegrees, mask, cond)
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        if (mask && cond)
            this.qReg.staff.addInstructionAfterInsertionPoint('crotatey', mask, cond, this.to_deg(thetaDegrees));
    }

    this.fast_rotatez = function(thetaDegrees, mask, cond) { this.qReg.crotatex(this.flat(mask), this.flat(cond), this.to_deg(thetaDegrees)); }
    this.anim_rotatez = function(thetaDegrees, mask, cond)
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        this.qReg.staff.addInstructionAfterInsertionPoint('crotatez', mask, cond, this.to_deg(thetaDegrees));
    }

    this.fast_crotatez = function(thetaDegrees, mask, cond) { this.qReg.crotatex(this.flat(mask), this.flat(cond), this.to_deg(thetaDegrees)); }
    this.anim_crotatez = function(thetaDegrees, mask, cond)
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        if (mask && cond)
            this.qReg.staff.addInstructionAfterInsertionPoint('crotatez', mask, cond, this.to_deg(thetaDegrees));
    }

    this.fast_phase = function(thetaDegrees, mask, cond) { this.qReg._phaseShift(this.flat(mask), this.flat(cond), this.to_deg(thetaDegrees)); }
    this.anim_phase = function(thetaDegrees, mask, cond)
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        if (mask == null && cond == null)
        {
            mask = this.qReg.allBitsMask;
            cond = 0;
        }
        else if (mask == null)
            mask = 0;
        else if (cond == null)
            cond = 0;
        this.qReg.staff.addInstructionAfterInsertionPoint('phase', mask, cond, this.to_deg(thetaDegrees));
    }

    this.fast_optical_phase = function(thetaDegrees, mask) { this.qReg.optical_phase(this.flat(mask), this.to_deg(thetaDegrees)); }
    this.anim_optical_phase = function(thetaDegrees, mask)
    {
        mask = this.flat(mask);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        this.qReg.staff.addInstructionAfterInsertionPoint('optical_phase', 0, mask, this.to_deg(thetaDegrees));
    }

    this.fast_noise = function(noiseMagnitude, mask, noiseFunc) { this.qReg.noise(noiseMagnitude, this.flat(mask), noiseFunc); }
    this.anim_noise = function(noiseMagnitude, mask, noiseFunc)
    {
        mask = this.flat(mask);
        if (noiseMagnitude == null)
            noiseMagnitude = 1.0;
        if (mask == null)
            mask = this.qReg.allBitsMask;
        this.qReg.staff.addInstructionAfterInsertionPoint('noise', mask, 0, noiseMagnitude);
    }

    this.fast_optical_beamsplitter = function(reflectivity, mask) { this.qReg.optical_beamsplitter(this.flat(mask), reflectivity); }
    this.anim_optical_beamsplitter = function(reflectivity, mask)
    {
        mask = this.flat(mask);
        if (reflectivity == null)
            reflectivity = 0.5;
        if (mask == null)
            mask = this.qReg.allBitsMask;
        this.qReg.staff.addInstructionAfterInsertionPoint('optical_beamsplitter', mask, 0, reflectivity);
    }

    this.fast_coptical_beamsplitter = function(reflectivity, mask, cond) { this.qReg.optical_beamsplitter(this.flat(mask), this.flat(cond), reflectivity); }
    this.anim_coptical_beamsplitter = function(reflectivity, mask, cond)
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        if (reflectivity == null)
            reflectivity = 0.5;
        if (mask == null)
            mask = this.qReg.allBitsMask;
        this.qReg.staff.addInstructionAfterInsertionPoint('coptical_beamsplitter', mask, cond, reflectivity);
    }

    this.fast_dual_rail_beamsplitter = function(reflectivity, mask, aux) { this.qReg.dual_rail_beamsplitter(this.flat(mask), null, reflectivity, aux); }
    this.anim_dual_rail_beamsplitter = function(reflectivity, mask, aux)
    {
        mask = this.flat(mask);
        if (reflectivity == null)
            reflectivity = 0.5;
        this.qReg.staff.addInstructionAfterInsertionPoint('dual_rail_beamsplitter', mask, null, reflectivity, aux);
    }

    this.fast_pbs = function(mask, aux, horiz_vert) { this.qReg.pbs(this.flat(mask), null, horiz_vert, aux); }
    this.anim_pbs = function(mask, aux, horiz_vert)
    {
        mask = this.flat(mask);
        if (horiz_vert == null)
            horiz_vert = 0;
        this.qReg.staff.addInstructionAfterInsertionPoint('pbs', mask, null, horiz_vert, aux);
    }

    this.fast_pair_source = function(mask, cond) { this.qReg.pair_source(this.flat(mask), this.flat(cond), 0); }
    this.anim_pair_source = function(mask, cond)
    {
        mask = this.flat(mask);
        cond = this.flat(cond);
        this.qReg.staff.addInstructionAfterInsertionPoint('pair_source', mask, cond, 0);
    }

    this.fast_polarization_grating_in = function(mask, theta) { this.qReg.polarization_grating_in(this.flat(mask), null, theta); }
    this.anim_polarization_grating_in = function(mask, theta)
    {
        mask = this.flat(mask);
        if (theta == null)
            theta = 0.0;
        this.qReg.staff.addInstructionAfterInsertionPoint('polarization_grating_in', mask, null, theta);
    }

    this.fast_polarization_grating_out = function(mask, theta) { this.qReg.polarization_grating_out(this.flat(mask), this.flat(cond), theta); }
    this.anim_polarization_grating_out = function(mask, theta)
    {
        mask = this.flat(mask);
        if (theta == null)
            theta = 0.0;
        this.qReg.staff.addInstructionAfterInsertionPoint('polarization_grating_out', mask, null, theta);
    }

    this.fast_write = function(value, mask, photon_count) { this.qReg.write(this.flat(mask), value, photon_count); }
    this.anim_write = function(value, mask, photon_count)
    {
        mask = this.flat(mask);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        if (photon_count == null)
            photon_count = 1;
        this.qReg.staff.addInstructionAfterInsertionPoint('write', mask, value, photon_count);
    }

    this.fast_postselect = function(value, mask) { this.qReg.postselect(this.flat(mask), value); }
    this.anim_postselect = function(value, mask)
    {
        mask = this.flat(mask);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        this.qReg.staff.addInstructionAfterInsertionPoint('postselect', mask, value, 0);
    }

    this.fast_postselect_qubit_pair = function(mask) { this.qReg.postselect_qubit_pair(this.flat(mask)); }
    this.anim_postselect_qubit_pair = function(mask)
    {
        mask = this.flat(mask);
        this.qReg.staff.addInstructionAfterInsertionPoint('postselect_qubit_pair', mask, 0, 0);
    }

    this.fast_discard = function(mask) { }
    this.anim_discard = function(mask)
    {
        mask = this.flat(mask);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        this.qReg.staff.addInstructionAfterInsertionPoint('discard', mask, 0, 0);
    }

	this.fast_read = function(mask) { mask = this.flat(mask); if (mask == null) mask = this.qReg.allBitsMask; return this.qReg.read(mask); }
    this.anim_read = function(mask)
    { 
        mask = this.flat(mask);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        var inst = this.qReg.staff.addInstructionAfterInsertionPoint('read', mask, 0, 0);
        if (inst)
			inst.finish();
        return this.qReg.read(mask);
    }

    this.fast_peek = function(mask) { }
    this.anim_peek = function(mask)
    { 
        mask = this.flat(mask);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        var inst = this.qReg.staff.addInstructionAfterInsertionPoint('peek', mask, 0, 0);
        if (inst)
            inst.finish();
    }

    this.fast_nop = function(mask) { }
    this.anim_nop = function(mask)
    { 
        mask = this.flat(mask);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        var inst = this.qReg.staff.addInstructionAfterInsertionPoint('nop', mask, 0, 0);
        if (inst)
            inst.finish();
    }

    this.fast_start_photon_sim = function(default_modes_per_qubit, mask) { this.qReg.startPhotonSim(this.flat(mask), null, default_modes_per_qubit); }
    this.anim_start_photon_sim = function(default_modes_per_qubit, mask)
    {
        mask = this.flat(mask);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        this.qReg.staff.addInstructionAfterInsertionPoint('start_photon_sim', mask, 0, default_modes_per_qubit);
    }

    this.fast_stop_photon_sim = function(mask) { this.qReg.stopPhotonSim(this.flat(mask)); }
    this.anim_stop_photon_sim = function(mask)
    {
        mask = this.flat(mask);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        this.qReg.staff.addInstructionAfterInsertionPoint('stop_photon_sim', mask);
    }

    this.fast_start_chp_sim = function(mask) { this.qReg.startCHPSim(this.flat(mask)); }
    this.anim_start_chp_sim = function(mask)
    {
        mask = this.flat(mask);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        this.qReg.staff.addInstructionAfterInsertionPoint('start_chp_sim', mask);
    }

    this.fast_stop_chp_sim = function(mask) { this.qReg.stopCHPSim(this.flat(mask)); }
    this.anim_stop_chp_sim = function(mask)
    {
        mask = this.flat(mask);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        this.qReg.staff.addInstructionAfterInsertionPoint('stop_chp_sim', mask);
    }

    this.fast_push_mixed_state = function(name, mask) { return this.qReg.pushMixedState(this.flat(mask), name); }
    this.anim_push_mixed_state = function(name, mask)
    {
        mask = this.flat(mask);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        var inst = this.qReg.staff.addInstructionAfterInsertionPoint('push_mixed', mask, null, name);
        if (inst)
            inst.finish();
        return this.qReg.mixed_states.length - 1;
    }

    this.fast_use_mixed_state = function(params, mask) { this.qReg.useMixedState(this.flat(mask), params); }
    this.anim_use_mixed_state = function(params, mask)
    {
        mask = this.flat(mask);
        if (mask == null)
            mask = this.qReg.allBitsMask;
        this.qReg.staff.addInstructionAfterInsertionPoint('use_mixed', mask, null, params);
    }


	this.enableAnimation();
//	this.disableRecording();
	this.clearRecording();
    this.qReg.changed();
    return this;
}

function runQCScript(scriptText, outputAreaItem, scopeBrackets)
{
    qc.start();
    if (outputAreaItem)
        qc.printBox = outputAreaItem;

    if (scopeBrackets)
        scriptText = '{' + scriptText + '}';

    var startTime = new Date().getTime();
    eval(scriptText);
    var elapsedTimeMS = new Date().getTime() - startTime;
	if (elapsedTimeMS > 500 || qc_options.always_show_completion_time)
	    qc.print('\n(Finished in ' + (elapsedTimeMS / 1000.0) + ' seconds.)\n');
//	qcEngineSetupPanel.qReg.forceChanged();
//    if (qcEngineSetupPanel.qReg.staff.qPanel.isVisible())
//        qcEngineSetupPanel.qReg.staff.draw();
    if (outputAreaItem)
        outputAreaItem.scrollTop = outputAreaItem.scrollHeight;
//    if (panel_chart)
//        panel_chart.draw();
    if (qc.get_param('auto_draw'))
        qc.draw();
}

function runQCScriptInTextArea(textAreaName, outputAreaName, scopeBrackets)
{
    var outputAreaItem = null;
    if (outputAreaName)
        outputAreaItem = document.getElementById(outputAreaName);
    var scriptText;
    if (textAreaName == 'editor')
    {
        scriptText = editor.getValue();
    }
    else
    {
        var box = document.getElementById(textAreaName);
        scriptText = box.value;
    }
    runQCScript(scriptText, outputAreaItem, scopeBrackets);
}

// var kickstart_qc = {
//   start: function()
//   {
//     var staff = null;
//     if (panel_staff)
//     {
//         staff = panel_staff.staff;
//     }
//     else
//     {
//         var qreg = new QReg(1);
//         staff = new QStaff(qreg);
//     }

//     qc = new QScriptInterface(staff.qReg);
//     return qc;
//   },
//   codeLabel: function(label)
//   {
//     this.start();
//     qc.codeLabel(label);
//   },
//   reset: function(numBits, preferredBlockBits)
//   {
//     this.start();
//     qc.reset(numBits, preferredBlockBits);
//   }
// };

// function qcengine_start()
// {
//     qc = qc.start();
//     return qc;
// }

function QPU()
{
    var staff_canvas = qc_options.staff_canvas;
    var staff_div = qc_options.staff_div;
    var circle_canvas = qc_options.circle_canvas;
    var circle_div = qc_options.circle_div;
    var num_qubits = 4;
    var qReg  = new QReg(num_qubits);
    qReg.activate();
    var staff_panel = createStaffPanel(qReg, 0, 0, staff_canvas, staff_div);
    var chart_panel = createChartPanel(qReg, 0, 0, circle_canvas, circle_div);
    var qc = new QScriptInterface(qReg);
    qc.panel_staff = staff_panel;
    qc.panel_chart = chart_panel;
    qc.reset(num_qubits);
    return qc;
}

// qc = kickstart_qc;

// // Node.js hookups
module.exports.QPU = QPU;
// module.exports.qcengine_start = qcengine_start;





