/////////////////////////////////////////////////////////////////////////////
// qcengine_photonic.js
// Copyright 2015-2016 Eric Johnston, Machine Level
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


function is_complex(num)
{
    return num.re != null;
}

function get_re(num)
{
    if (is_complex(num))
        return num.re;
    return num;
}

function get_im(num)
{
    if (is_complex(num))
        return num.im;
    return 0;
}

function to_complex(re, im)
{
    // is it already complex?
    if (re.re)
        return re;
    if (im == null)
        im = 0;
    return {re:re, im:im};
}

function complex_add(a, b)
{
    var ar = get_re(a);
    var ai = get_im(a);
    var br = get_re(b);
    var bi = get_im(b);
    return to_complex(ar + br, ai + bi);
}

function complex_mul(a, b)
{
    var ar = get_re(a);
    var ai = get_im(a);
    var br = get_re(b);
    var bi = get_im(b);
    return to_complex(ar * br - ai * bi, ar * bi + ai * br);
}

function complex_str(num)
{
    return '(' + get_re(num) + '+i' + get_im(num) + ')';
}


function int_log2(val)
{
    var result = 0;
    val >>= 1;
    while (val)
    {
        val >>= 1;
        result++;
    }
    return result;
}





////////////////////////////////////////////////////////
// Photonic sim code, January 2016
// Overhauled 13 Feb 2017 with mode remapping and PBS
//
// Accurate simulation of photons and bosonic modes
// is done by topographic analysis of the profgam and
// the input photons, with as much extra work trimmed
// away as possible.




function PhotonSimState(sim, state_index, mode_to_photon_count)
{
    var factorial = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800];

    this.sim = sim;
    this.mode_to_photon_count = new Array(mode_to_photon_count.length);
    this.mode_logical_value = 0;
    this.mode_logical_value_bf = new BitField(sim.num_modes);
    this.mode_logical_value_bf.set(0);
    this.normalization_const = 1;

    for (var i = 0; i < mode_to_photon_count.length; ++i)
    {
        var count = mode_to_photon_count[i];
        if (count)
        {
            this.mode_logical_value |= 1 << i;
            this.mode_logical_value_bf.setBit(i, 1);
        }
        this.mode_to_photon_count[i] = count;
        this.normalization_const *= factorial[count];
    }


    this.state_index = state_index;

    this.matches = function(mode_to_photon_count)
    {
        if (mode_to_photon_count.length != this.mode_to_photon_count.length)
            return false;
        for (var i = 0; i < mode_to_photon_count.length; ++i)
            if (mode_to_photon_count[i] != this.mode_to_photon_count[i])
                return false;
        return true;
    }

    this.amplitude = function()
    {
        return to_complex(this.sim.state_data[this.state_index * 2],
                          this.sim.state_data[this.state_index * 2 + 1]);
    }

    this.mode_to_photon_count_str = function(mode_to_photon_count)
    {
        var str = '';
        for (var qubit = 0; qubit < this.sim.qReg.numQubits; ++qubit)
        {
            var qmodes = this.sim.mode_map[qubit];
            for (var qm = 0; qm < qmodes.length; ++qm)
            {
                var count = mode_to_photon_count[qmodes[qm]];
                str += (count) ? count : '-';
            }
            if (qmodes.length > 1 && qubit < this.sim.qReg.numQubits-1)
                str += ' ';
        }
        return str;
    }

    this.mode_str = function()
    {
        var str = this.mode_to_photon_count_str(this.mode_to_photon_count);
        return str;
    }

    this.print = function(message)
    {
        var str = '';
        if (message)
            str += message;
        str += ' state ' + this.state_index + ': ' + this.mode_str() +
               ' ' + complex_str(this.amplitude());
        console.log(str);
    }
}

function PhotonSim()
{
    this.reset = function(qReg, targetQubits, this_instruction, modes_per_qubit, starting_allocation)
    {
        this.verbose = false;
        this.qReg = qReg;

        // Each qubit may contain either one or two modes.
        // TODO: We can add mutiplexed (time-bin, freq, distinguishable, etc)
        //    modes in the future if we want to.
        // When it's two modes, they'll be known as H and V.
        // Also, the mode map allows us to do fast and easy crossovers and exchanges.
        this.mode_map = [];
        this.num_modes = 0;
        if (modes_per_qubit == null)
            modes_per_qubit = 1;    // legacy, where qubit "0" means no photon
        for (var qubit_index = 0; qubit_index < this.qReg.numQubits; ++qubit_index)
        {
            this.mode_map[qubit_index] = [];
            var modes_for_this_qubit = modes_per_qubit;
            for (var i = 0; i < modes_for_this_qubit; ++i)
                this.mode_map[qubit_index][i] = this.num_modes++;
        }
        var bitmask = new BitField(qReg.numQubits);

        // Set our mode labels, for printing
        this.mode_names = [];
        for (var qubit_index = 0; qubit_index < qReg.numQubits; ++qubit_index)
        {
            var modes_for_this_qubit = this.mode_map[qubit_index].length;
            for (var qubit_mode = 0; qubit_mode < modes_for_this_qubit; ++qubit_mode)
            {
                var int_name = qReg.getQubitIntName(qubit_index);
                var place_name = qReg.getQubitIntPlace(qubit_index);
                var mode_name;
                if (modes_for_this_qubit > 1)
                {
                    if (qubit_mode == 0)
                        mode_name = '.H';
                    else if (qubit_mode == 1)
                        mode_name = '.V';
                    else
                        mode_name = '.' + qubit_mode;
                }
                var str = '(' + int_name;
                // if it's just one bit, drop the place number
                if (int_name == '' || place_name != '1')
                    str += ':' + place_name;
                if (modes_for_this_qubit > 1)
                    str += mode_name;
                str += ')';
                this.mode_names.push(str);
            }
        }

        this.states = [];
        this.num_states = 0;
        this.num_states_allocated = 0;
        this.state_data = null;
        if (starting_allocation == null)
            starting_allocation = 4096;
        this.expand_states(starting_allocation);
    }

    this.expand_states = function(num_states)
    {
        if (this.num_states_allocated >= num_states)
            return;
        var old_num_allocated = this.num_states_allocated;
        var old_state_data = this.state_data;

        this.num_states_allocated = num_states;

        // Now actually allocate the state data
        var bytes_per_float = 4;
        if (qReg.doublePrecision)
          bytes_per_float = 8;
        this.num_data_floats = 2 * this.num_states_allocated;
        this.num_data_bytes = this.num_data_floats * bytes_per_float;

        if (bytes_per_float == 4)
          this.state_data = new Float32Array(new ArrayBuffer(this.num_data_bytes));
        else
          this.state_data = new Float64Array(new ArrayBuffer(this.num_data_bytes));

        // Copy forward the values
        if (old_state_data)
        {
            for (var i = 0; i < old_state_data.length; ++i)
                this.state_data[i] = old_state_data[i];
        }
    }

    this.clearStates = function()
    {
        this.states = [];
        this.num_states = 0;
    }

    this.setStates = function(states)
    {
        this.clearStates();
        for (var i = 0; i < states.length; ++i)
            this.addState(states[i][0], states[i][1], states[i][2]);
    }

    this.addState = function(mode_to_photon_count, amp_real, amp_imag)
    {
        var state = new PhotonSimState(this, this.states.length, mode_to_photon_count);
        this.states.push(state);
        var state_index = state.state_index;
        this.state_data[state_index * 2] = amp_real;
        this.state_data[state_index * 2 + 1] = amp_imag;
        this.num_states++;
        return state;
    }

    this.addStateIfNew = function(mode_to_photon_count, amp_real, amp_imag)
    {
        for (var i = 0; i < this.states.length; ++i)
        {
            if (this.states[i].matches(mode_to_photon_count))
                return this.states[i];
        }
        return this.addState(mode_to_photon_count, amp_real, amp_imag);
    }

    this.addStateIfNew_logical = function(mode_logical, amp_real, amp_imag)
    {
        var found = false;

        for (var i = 0; i < this.states.length && !found; ++i)
        {
            if (this.states[i].mode_logical_value == mode_logical)
            {
                var ok = true;
                for (var j = 0; j < this.num_modes && ok; ++j)
                    if (this.states[i].mode_to_photon_count[j] > 1)
                        ok = false;
                if (ok)
                    return this.states[i];
            }
        }
        // Looks like it's new, so add it.
        var mode_to_photon_count = new Array(this.num_modes);
        for (var i = 0; i < this.num_modes; ++i)
            mode_to_photon_count[i] = (mode_logical >>> i) & 1;
        return this.addState(mode_to_photon_count, amp_real, amp_imag);
    }

    this.printState = function(message)
    {
        var str = '';
        if (message)
            str += message;
        str += 'photonic sim state: \n';
        console.log(str);
        if (!this.states || !this.states.length)
        {
            console.log('There are no photons.');
            return;
        }
        for (var i = 0; i < this.states.length; ++i)
            this.states[i].print();
    }

    // Use the mode_map to convert qubit values to LO mode photons
    this.state_vector_logical_to_mode_logical = function(sv_value)
    {
        var result = 0;
        for (var qubit_index = 0; qubit_index < this.qReg.numQubits; ++qubit_index)
        {
            var modes_for_this_qubit = this.mode_map[qubit_index].length;
            var qubit_value = (sv_value >>> qubit_index) & 1;
            // If the qubit is a |1>, then mode[0] is a 1
            if (modes_for_this_qubit > 0)
                result |= qubit_value << this.mode_map[qubit_index][0];
            // If we're dual-mode, then a |0> value causes a 1 in the oher mode
            if (modes_for_this_qubit == 2)
                result |= (1 - qubit_value) << this.mode_map[qubit_index][1];
        }
        return result;
    }

    // Use the mode_map to LO mode photons to convert qubit values. This is often lossy.
    this.mode_logical_to_state_vector_logical = function(mode_value)
    {
        var result = 0;
        for (var qubit_index = 0; qubit_index < this.qReg.numQubits; ++qubit_index)
        {
            var modes_for_this_qubit = this.mode_map[qubit_index].length;
            if (modes_for_this_qubit > 0)
            {
                var qubit_value = (mode_value >>> this.mode_map[qubit_index][0]) & 1;
                result |= qubit_value << qubit_index;
            }
        }
        return result;
    }

    this.transferLogicalToPhotonic = function()
    {
        for (var i = 0; i < this.num_data_floats; ++i)
            this.state_data[i] = 0;

        // TODO: make this more general, to handle more complex inputs
        for (var value_index = 0; value_index < this.qReg.numValues; ++value_index)
        {
            var cval = this.qReg.peekComplexValue(value_index);
            if (cval.x || cval.y)
            {
                var mode_logical = this.state_vector_logical_to_mode_logical(value_index);
                var state = this.addStateIfNew_logical(mode_logical, cval.x, cval.y);
            }
        }
        if (this.verbose)
            this.printState('Imported from logical');
    }

    this.transferPhotonicToLogical = function()
    {
        // TODO: Partial transfers
        this.qReg.setZero();
        var values_used = 0;
        for (var state_index = 0; state_index < this.num_states; ++state_index)
        {
            var state = this.states[state_index];
            var ar = this.state_data[state_index * 2];
            var ai = this.state_data[state_index * 2 + 1];
            // Wherever the photon states are non-zero, add them to the
            // logical state.
            if (ar || ai)
            {
                var sv_logical_value = this.mode_logical_to_state_vector_logical(state.mode_logical_value);
                var cv = this.qReg.peekComplexValue(sv_logical_value);
                cv.x += ar;
                cv.y += ai;
                this.qReg.pokeComplexValue(sv_logical_value, cv.x, cv.y);
                values_used++;
            }
        }
        if (values_used == 0)
        {
            console.log('Photon state ended empty. Likely error.');
            this.qReg.pokeComplexValue(0, 1.0, 0.0);
        }
        this.qReg.renormalize();
        this.qReg.changed();
    }

    this.findNonZeroStates = function()
    {
        this.non_zero_states = [];
        for (var state_index = 0; state_index < this.num_states; ++state_index)
        {
            var state = this.states[state_index];
            var ar = this.state_data[state_index * 2];
            var ai = this.state_data[state_index * 2 + 1];
            // Wherever the photon states are non-zero, add them to the
            // logical state.
            if (ar * ar + ai * ai > 0.00001)
            {
                this.non_zero_states.push(state_index);
            }
        }
    }

    this.getNonZeroState = function(index)
    {
        if (index >= this.non_zero_states.length)
            return null;
        var state_index = this.non_zero_states[index];
        return this.states[state_index];
    }

    this.getNonZeroStateLabel = function(index)
    {
        if (index >= this.non_zero_states.length)
            return null;
        var state_index = this.non_zero_states[index];
        var state = this.states[state_index];
        return state.mode_to_photon_count_str(state.mode_to_photon_count);
    }

    this.getNonZeroStateComplexMag = function(index)
    {
        if (index >= this.non_zero_states.length)
            return null;
        var state_index = this.non_zero_states[index];
        var ar = this.state_data[state_index * 2];
        var ai = this.state_data[state_index * 2 + 1];
        return new Vec2(ar, ai);
    }

    this.renormalize = function(index)
    {
        // TODO
        return 1.0;
    }

    this.print_mat = function(mat, name)
    {
        var str = '' + name + ': [[';
        for (var row = 0; row < mat.length; ++row)
        {
            str += '[';
            for (var col = 0; col < mat[row].length; ++col)
            {
                str += complex_str(mat[row][col]);
                if (col < mat[row].length - 1)
                    str += ', ';
            }
            str += ']';
        }
        str += ']';
        console.log(str);
    }

    this.normalization_const = function(modes)
    {
        var factorial = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800];

        var done = false;
        var result = 1;
        for (var i = 0; !done; ++i)
        {
            done = true;
            var count = 0;
            for (var j = 0; j < modes.length; ++j)
            {
                if (modes[j] == i)
                {
                    count++;
                    result *= count;
                }
                else if (modes[j] > i)
                    done = false;
            }
//            result *= factorial[count];
        }
        return result;
    }

    this.fast_permanent = function(mat)
    {
        var size = mat.length;
        // Create the temporary space
        if (!this.perm_mat_size || this.perm_mat_size < size)
        {
            this.perm_mat_size = size;
            var floats_per_row = size * 2;    // Complex
            var floats_per_mat = size * floats_per_row;
            var bytes_per_float = 8;
            this.perm_mat = new Float64Array(new ArrayBuffer(floats_per_mat * bytes_per_float));
            this.perm_row = new Float64Array(new ArrayBuffer(floats_per_row * bytes_per_float));
        }
        var transp = this.perm_mat;
        var xrow = this.perm_row;

        // First, pre-transpose the matrix
        var off1 = 0;
        for (var i = 0; i < size; ++i)
        {
            var off2 = i << 1;
            for (var j = 0; j < size; ++j)
            {
                var val = mat[i][j];
                if (val.re != null)
                {
                    transp[off2    ] = mat[i][j].re;
                    transp[off2 + 1] = mat[i][j].im;
                }
                else
                {
                    transp[off2    ] = mat[i][j];
                    transp[off2 + 1] = 0.0;
                }
                off2 += size << 1;
            }
        }

        var p_r = 1.0;
        var p_i = 0.0;
        for (var i = 0; i < size; ++i)
        {
            var sum_r = 0.0;
            var sum_i = 0.0;
            for (var j = 0; j < size; ++j)
            {
                sum_r += transp[((j * size + i) << 1)];
                sum_i += transp[((j * size + i) << 1) + 1];
            }
            var xrow_r = xrow[(i << 1)]     = transp[(((size - 1) * size + i) << 1)    ] - sum_r * 0.5;
            var xrow_i = xrow[(i << 1) + 1] = transp[(((size - 1) * size + i) << 1) + 1] - sum_i * 0.5;
            // p *= xrow[i];
            var m_r = p_r * xrow_r - p_i * xrow_i;
            var m_i = p_i * xrow_r + p_r * xrow_i;
            p_r = m_r;
            p_i = m_i;
        }

        var tn11 = (1 << (size - 1)) - 1;
        var y_prev = 0;

        for (var i = 0; i < tn11; ++i)
        {
            var yi = (i+1) ^ ((i+1) >> 1);
            var zi = int_log2(yi ^ y_prev);
            var si = -1.0 + 2.0 * ((yi >> zi) & 1);

            y_prev = yi;

            var prodx_r = 1.0;
            var prodx_i = 0.0;
            var offset = zi * size;
            for (var j = 0; j < size; ++j)
            {
                var rr_r = xrow[j * 2    ] + transp[(offset + j) * 2    ] * si;
                var rr_i = xrow[j * 2 + 1] + transp[(offset + j) * 2 + 1] * si;
                xrow[(j << 1)    ] = rr_r;
                xrow[(j << 1) + 1] = rr_i;
                // prodx *= rr;
                var m_r = prodx_r * rr_r - prodx_i * rr_i;
                var m_i = prodx_i * rr_r + prodx_r * rr_i;
                prodx_r = m_r;
                prodx_i = m_i;
            }
            if (i & 1)
            {
                p_r += prodx_r;
                p_i += prodx_i;
            }
            else
            {
                p_r -= prodx_r;
                p_i -= prodx_i;
            }
        }

        p_r *= 2;
        p_i *= 2;
        if (!(size & 1))
        {
            p_r = -p_r;
            p_i = -p_i;
        }
        return {re:p_r, im:p_i};
    }

    this.permanent = function(mat)
    {
        if (this.perm_scratch == null)
            this.perm_scratch = [1];
        while (this.perm_scratch.length < mat.length)
        {
            var len = this.perm_scratch.length;
            var scratch_mat = new Array(len);
            for (var i = 0; i < len; ++i)
                scratch_mat[i] = new Array(len);
            this.perm_scratch.push(scratch_mat);
        }

        if (mat.length == 1)
            return mat[0][0];
        if (mat.length == 2)
            return complex_add(complex_mul(mat[0][0], mat[1][1]),
                               complex_mul(mat[0][1], mat[1][0]));
        if (mat.length == 3)
        {
            var perm = 0;
            perm = complex_add(perm, complex_mul(mat[0][0], complex_mul(mat[1][2], mat[2][1])));
            perm = complex_add(perm, complex_mul(mat[0][0], complex_mul(mat[1][1], mat[2][2])));
            perm = complex_add(perm, complex_mul(mat[0][1], complex_mul(mat[1][0], mat[2][2])));
            perm = complex_add(perm, complex_mul(mat[0][1], complex_mul(mat[1][2], mat[2][0])));
            perm = complex_add(perm, complex_mul(mat[0][2], complex_mul(mat[1][0], mat[2][1])));
            perm = complex_add(perm, complex_mul(mat[0][2], complex_mul(mat[1][1], mat[2][0])));
            return perm;
        }


        // arbitrary size
        // TODO: This is horribly inefficient, and will be fixed.
        {
            var perm = 0;
            var mat2 = this.perm_scratch[mat.length - 1];
            for (var pick = 0; pick < mat.length; ++pick)
            {
                for (var i = 0; i < mat.length - 1; ++i)
                {
                    var src = 0;
                    for (var j = 0; j < mat.length - 1; ++j)
                    {
                        if (src == pick)
                            src++;
                         mat2[i][j] = mat[i + 1][src++];
                    }
                }
                perm = complex_add(perm, complex_mul(mat[0][pick], this.permanent(mat2)));
            }
// Compare results with fast_perm
//if (perm.re != 0 || perm.im != 0)
//{
//var perm2 = this.fast_permanent(mat);
//console.log('------------- perm ' + mat.length + 'x' + mat[0].length);
//console.log(' ref: ' + perm.re + ' ' + perm.im);
//console.log(' ref: ' + perm2.re + ' ' + perm2.im);
//}
            return perm;
        }

        console.log('Error: TODO more permanent calcs');
        crash.here();
    }

    this.make_photon_groups = function(mode0, mode1)
    {
        // TODO: a better implementation of this
        var state_lists = [];
        var photon_groups = [];
        var temp_pattern = new Array(this.num_modes);

//var nz = 0;
//for (var state_index = 0; state_index < this.num_states; ++state_index)
//{
//    var ar = this.state_data[state_index * 2];
//    var ai = this.state_data[state_index * 2 + 1];
//    if (ar != 0 || ai != 0)
//        nz++;
//}
//console.log('mpg this.num_states = ' + this.num_states + ' (' + nz + ' are non-zero)');

        for (var state_index = 0; state_index < this.num_states; ++state_index)
        {
            var state = this.states[state_index];
            var pattern = state.mode_to_photon_count;
            var mode_sum = pattern[mode0] + pattern[mode1];
            if (mode_sum)
            {
                while (state_lists.length <= mode_sum)
                {
                    state_lists.push([]);
                    photon_groups.push([]);
                }
                state_lists[mode_sum].push(state_index);
            }
        }

        for (var mode_sum = 1; mode_sum < state_lists.length; ++mode_sum)
        {
//console.log('    mpg mode_sum = ' + mode_sum);
            var list = state_lists[mode_sum];
            var list_length = list.length;
//console.log('      mpg list_length = ' + list_length);
            for (var list_index = 0; list_index < list_length; ++list_index)
            {
                var leader_index = list[list_index];
                if  (leader_index < 0)
                    continue;
                var leader_state = this.states[leader_index];
                var leader_pattern = leader_state.mode_to_photon_count;
                var group = new Array(mode_sum + 1);
                photon_groups[mode_sum].push(group);
                for (var i = 0; i < mode_sum + 1; ++i)
                    group[i] = -1;
                var m0 = leader_pattern[mode0];
                group[m0] = leader_index;

//console.log('        mpg list_length = ' + list_length);
                for (var list_index2 = list_index + 1; list_index2 < list_length; ++list_index2)
                {
                    var test_index = list[list_index2];
                    if  (test_index < 0)
                        continue;
                    var test_state = this.states[test_index];
                    var test_pattern = test_state.mode_to_photon_count;
                    var tm0 = test_pattern[mode0];
                    if (group[tm0] < 0)
                    {
                        var ok = true;
                        for (var i = 0; i < this.num_modes && ok; ++i)
                        {
                            if (i != mode0 && i != mode1 && leader_pattern[i] != test_pattern[i])
                                ok = false;
                        }
                        if (ok)
                        {
                            // This pattern is in the group
                            group[tm0] = test_index;
                            // remove it from the list by swapping
                            list[list_index2] = -1;
//                            list[list_index2] = list[list_length - 1];
//                            --list_index2;
//                            --list_length;
                        }
                    }
                }
                // Now, if we have empty spots, generate the nw states.
                // TODO: defer this generation to just non-zero states.
                for (var i = 0; i < this.num_modes; ++i)
                    temp_pattern[i] = leader_pattern[i];
                for (var m0 = 0; m0 < group.length; ++m0)
                {
                    if (group[m0] < 0)
                    {
                        temp_pattern[mode0] = m0;
                        temp_pattern[mode1] = mode_sum - m0;
                        var new_state = this.addState(temp_pattern, 0, 0);
                        group[m0] = new_state.state_index;
                    }
                }
            }
        }
//if (1)
//{
//
//console.log('Group safety check:');
//}
        return photon_groups;
    }

// version test
    this.beamsplitter = function(targetQubits, reflectivity)
    {
//        return;
        if (reflectivity == null)
            reflectivity = 0.5;
        var root_r = Math.sqrt(reflectivity);
        var root_one_minus_r = Math.sqrt(1.0 - reflectivity);
        var qubit0 = getLowestBitIndex(targetQubits);
        var qubit1 = getHighestBitIndex(targetQubits);

        // For the moment, assume we're coming from qubit space.
        // TODO: cycle through all qubits' modes
        var num_sub_modes = this.mode_map[qubit0].length;
        if (num_sub_modes > this.mode_map[qubit1].length)
            num_sub_modes = this.mode_map[qubit1].length;

        for (var sub_mode = 0; sub_mode <  sub_mode < num_sub_modes; ++sub_mode)
        {
//console.log('sub_mode = ' + sub_mode);
            var mode0 = this.mode_map[qubit0][sub_mode];
            var mode1 = this.mode_map[qubit1][sub_mode];
            // Special case: if only one qubit is named, do the op on its two modes.
            if (qubit0 == qubit1 && num_sub_modes == 2)
            {
                mode1 = this.mode_map[qubit0][sub_mode + 1];
                sub_mode++;
            }

            var mode_mask = (1 << mode0) | (1 << mode1);

            var m00 = to_complex(root_r, 0);
            var m01 = to_complex(0, root_one_minus_r);
            var full_unitary = [[m00, m01],
                                [m01, m00]];
            if (qc_options.use_phaseless_bs)
            {
                var m01 = to_complex(root_one_minus_r, 0);
                var m11 = to_complex(-root_r, 0);
                full_unitary = [[m00, m01],
                                [m01, m11]];
            }

            var group_lists = this.make_photon_groups(mode0, mode1);
            var max_mode_sum = group_lists.length - 1;
            if (max_mode_sum < 1)
                return;
    //        var out_amps = new Array(max_mode_sum);
            var bytes_per_float = 8;
            var out_amps = new Float64Array(new ArrayBuffer((max_mode_sum + 1) * 2 * bytes_per_float));
            var perms = new Float64Array(new ArrayBuffer(max_mode_sum * 2 * bytes_per_float));
            for (var mode_sum = 1; mode_sum <= max_mode_sum; ++mode_sum)
            {
//console.log('  mode_sum = ' + mode_sum);
                var tall_unitary = new Array(full_unitary.length);
                for (var i = 0; i < full_unitary.length; ++i)
                    tall_unitary[i] = new Array(mode_sum);
                var mini_unitary = new Array(mode_sum);
                for (var i = 0; i < mode_sum; ++i)
                    mini_unitary[i] = new Array(mode_sum);

                var group_list = group_lists[mode_sum];
                var group_list_length = group_list.length;
                for (var group_index = 0; group_index < group_list_length; ++group_index)
                {
//console.log('    group_index = ' + group_index);
                    var group = group_list[group_index];
                    for (var i = 0; i < 2 * (mode_sum+1); ++i)
                        out_amps[i] = 0;
                    for (var photons_in0 = 0; photons_in0 <= mode_sum; ++photons_in0)
                    {
//console.log('    photons_in0 = ' + photons_in0);
                        var state_in_index = group[photons_in0];
                        if (state_in_index >= 0)
                        {
                            var state_in = this.states[state_in_index];
                            var ar = this.state_data[state_in_index * 2];
                            var ai = this.state_data[state_in_index * 2 + 1];
                            if (ar || ai)
                            {
                                var amplitude_in = {re:ar, im:ai};
                                var photons_in1 = mode_sum - photons_in0;
                                // Build the tall matrix
                                // Todo: Move this out further
                                for (var row = 0; row < tall_unitary.length; ++row)
                                {
                                    var src0 = full_unitary[row][0];
                                    var src1 = full_unitary[row][1];
                                    var dst_row = tall_unitary[row];
                                    var col = 0;
                                    while (col < photons_in0)
                                        dst_row[col++] = src0;
                                    while (col < mode_sum)
                                        dst_row[col++] = src1;
                                }
                                for (var photons_out0 = 0; photons_out0 <= mode_sum; ++photons_out0)
                                {
//console.log('    photons_out0 = ' + photons_out0);
                                    var state_out_index = group[photons_out0];
                                    var state_out = this.states[state_out_index];
                                    var photons_out1 = mode_sum - photons_out0;
                                    // Build the tall matrix
                                    // Todo: Move this out further
                                    var src0 = tall_unitary[0];
                                    var src1 = tall_unitary[1];
                                    var row = 0;
                                    while (row < photons_out0)
                                        mini_unitary[row++] = src0;
                                    while (row < mode_sum)
                                        mini_unitary[row++] = src1;

                                    var n0 = state_in.normalization_const;
                                    var n1 = state_out.normalization_const;
                                    var perm = this.fast_permanent(mini_unitary);
                                    var value = complex_mul(complex_mul(amplitude_in, perm), 1.0 / Math.sqrt(n0 * n1));
    //                                if (this.verbose)
    //                                    console.log('contrib to ' + state1.mode_str() + ' from ' + state0.mode_str() + ' is ' + complex_str(value) +
    //                                                ' perm: ' + complex_str(perm) + ' n0: ' + n0 + ' n1: ' + n1);
                //                    this.print_mat(umat, 'umat');
                                    out_amps[photons_out0 * 2] += get_re(value);
                                    out_amps[photons_out0 * 2 + 1] += get_im(value);
                                }
                            }
                        }
                    }
                    // Now the accumulation is done, so write the values out.
                    for (var photons_out0 = 0; photons_out0 <= mode_sum; ++photons_out0)
                    {
                        var state_out_index = group[photons_out0];
                        this.state_data[state_out_index * 2]     = out_amps[photons_out0 * 2];
                        this.state_data[state_out_index * 2 + 1] = out_amps[photons_out0 * 2 + 1];
                    }
                }
            }
        }
        if (this.verbose)
            this.printState('-> beamsplitter result ');
    }


    this.pbs = function(targetQubits, horiz_vert)
    {
        if (this.verbose)
            console.log(this.state_data);
        var qubit0 = getLowestBitIndex(targetQubits);
        var qubit1 = getHighestBitIndex(targetQubits);
        var mode0 = this.mode_map[qubit0][1];
        var mode1 = this.mode_map[qubit1][0];
        // Handle the exchange using just a re-map
        this.mode_map[qubit0][1] = mode1;
        this.mode_map[qubit1][0] = mode0;

        if (this.verbose)
            this.printState('-> pbs result ');
        if (this.verbose)
            console.log(this.state_data);
    }

/*
    this.old_beamsplitter = function(targetQubits, reflectivity)
    {
//        return;
        if (reflectivity == null)
            reflectivity = 0.5;
        var root_r = Math.sqrt(reflectivity);
        var root_one_minus_r = Math.sqrt(1.0 - reflectivity);
        var m00r = root_r;
        var m11r = root_r;
        var m10i = root_one_minus_r;
        var m01i = root_one_minus_r;
        var bit0 = getLowestBitIndex(targetQubits);
        var bit1 = getHighestBitIndex(targetQubits);

        if (this.num_photons == 0)
        {
            console.log('There are no photons.');
            return;
        }

        var umat = new Array(this.num_photons);
        for (var i = 0; i < this.num_photons; ++i)
            umat[i] = new Array(this.num_photons);

        // TODO: Most of this unitary is zero, so it's not needed.
        var unitary = new Array(this.qReg.numQubits);
        for (var i = 0; i < this.qReg.numQubits; ++i)
        {
            unitary[i] = new Array(this.qReg.numQubits);
            for (var j = 0; j < this.qReg.numQubits; ++j)
            {
                unitary[i][j] = (i == j) ? 1 : 0;
            }
        }
        unitary[bit0][bit0] = unitary[bit1][bit1] = to_complex(root_r, 0);
        unitary[bit1][bit0] = unitary[bit0][bit1] = to_complex(0, root_one_minus_r);
//        var unitary = [ [{re:root_one_minus_r, im:0},{re:0, im:root_r}],
//                        [{re:0, im:root_r},{re:root_one_minus_r, im:0}]];
        if (this.verbose)
            this.print_mat(unitary, 'unitary');
//        this.unitary_map = new Array(this.qReg.numQubits);

        // Unitary_map maps from our target bits to the 2x2 unitart matrix
//        for (var i = 0; i < this.unitary_map.length; ++i)
//            this.unitary_map[i] = -1;    // identity row
//        this.unitary_map[bit0] = 0;
//        this.unitary_map[bit1] = 1;

        for (var i = 0; i < this.num_data_floats; ++i)
            this.state_data_scratch[i] = 0.0;

        for (var state_index0 = 0; state_index0 < this.num_states; ++state_index0)
        {
            var state0 = this.states[state_index0];

//            if (targetQubits.andIsNotEqualZero(state0.logical_value_bf))
            {
                if (this.verbose)
                    state0.print('from: ');
                var ar = this.state_data[state_index0 * 2];
                var ai = this.state_data[state_index0 * 2 + 1];
                if (ar || ai)
                {
                    var amplitude = {re:ar, im:ai};
                    for (var state_index1 = 0; state_index1 < this.num_states; ++state_index1)
                    {
                        var state1 = this.states[state_index1];
//                        if (targetQubits.andIsNotEqualZero(state1.logical_value_bf))
                        {
                            if (this.verbose)
                                console.log('');
                            if (this.verbose)
                                state1.print('  to: ');

                            for (var r = 0; r < this.num_photons; ++r)
                            {
                                for (var c = 0; c < this.num_photons; ++c)
                                {
                                    umat[r][c] = unitary[state1.photon_to_mode[r]][state0.photon_to_mode[c]];
                                }
                            }

                            var n0 = state0.normalization_const;
                            var n1 = state1.normalization_const;
                            var bit0_change = state0.mode_to_photon_count[bit0] - state1.mode_to_photon_count[bit0];
                            var bit1_change = state0.mode_to_photon_count[bit1] - state1.mode_to_photon_count[bit1];

                            var perm = 0;
                            perm = this.fast_permanent(umat);
                            var value = complex_mul(complex_mul(amplitude, perm), 1.0 / Math.sqrt(n0 * n1));
                            if (this.verbose)
                                console.log('contrib to ' + state1.mode_str() + ' from ' + state0.mode_str() + ' is ' + complex_str(value) +
                                            ' perm: ' + complex_str(perm) + ' n0: ' + n0 + ' n1: ' + n1);
        //                    this.print_mat(umat, 'umat');
                            this.state_data_scratch[state_index1 * 2] += get_re(value);
                            this.state_data_scratch[state_index1 * 2 + 1] += get_im(value);
                        }
                    }
                    if (this.verbose)
                        console.log('');
                }
            }
        }
        var temp = this.state_data;
        this.state_data = this.state_data_scratch;
        this.state_data_scratch = temp;



        if (this.verbose)
            this.printState('-> beamsplitter result ');
    }
*/

    // This is a beamsplitter where the second bit is an "aux" bit, which
    // means it's zero, and then is postselected back to zero.
    // That means we can take some shortcuts, and don't need to simulate the seconnd bit.
    this.beamsplitter_aux = function(auxQubits, reflectivity)
    {
        if (reflectivity == null)
            reflectivity = 0.5;
        var root_r = Math.sqrt(reflectivity);

        for (var state_index = 0; state_index < this.num_states; ++state_index)
        {
            var state = this.states[state_index];
            if (state.logical_value_bf.andIsNotEqualZero(auxQubits))
            {
                var ar = this.state_data[state_index * 2];
                var ai = this.state_data[state_index * 2 + 1];
                this.state_data[state_index * 2]     = root_r*ar;
                this.state_data[state_index * 2 + 1] = root_r*ai;
            }
        }
        if (this.verbose)
            this.printState('-> beamsplitter_aux result ');
    }

    this.postselect = function(targetQubits, value)
    {
        // For the moment, assume we're coming from qubit space.
        // TODO: cycle through all qubits' modes
        var target_modes = [];
        var low_bit = getLowestBitIndex(targetQubits);
        var high_bit = getHighestBitIndex(targetQubits);
        for (var bit = low_bit; bit <= high_bit; ++bit)
        {
            if (targetQubits.getBit(bit))
            {
                target_modes.push(bit);
            }
        }
        for (var state_index = 0; state_index < this.num_states; ++state_index)
        {
            var state = this.states[state_index];
            var pattern = state.mode_to_photon_count;
            var match = true;
            for (index = 0; index < target_modes.length && match; ++index)
            {
                if (pattern[this.mode_map[target_modes[index]]] != value)
                    match = false;
            }
            if (!match)
            {
                this.state_data[state_index * 2]     = 0;
                this.state_data[state_index * 2 + 1] = 0;
            }
        }
        this.findNonZeroStates();
        if (this.verbose)
            this.printState('-> postselect result ');
    }

    this.postselect_qubit_pair = function(targetQubits)
    {
        var qubit0 = getLowestBitIndex(targetQubits);
        var qubit1 = getHighestBitIndex(targetQubits);
        // For the moment, assume we're coming from qubit space.
        // TODO: cycle through all qubits' modes
        var mode0 = this.mode_map[qubit0][0];
        var mode1 = this.mode_map[qubit1][0];

        for (var state_index = 0; state_index < this.num_states; ++state_index)
        {
            var state = this.states[state_index];
            if (state.mode_logical_value_bf.getBit(mode0) == state.mode_logical_value_bf.getBit(mode1))
            {
                this.state_data[state_index * 2]     = 0;
                this.state_data[state_index * 2 + 1] = 0;
            }
        }
        if (this.verbose)
            this.printState('-> postselect_qubit_pair result ');
    }

    this.write = function(targetQubits, new_values, photon_count, fock)
    {
        if (new_values.length && new_values.length > 0)
        {
            console.log('writing fock states');
            this.clearStates();
            this.setStates(new_values);
            return;
        }
        var qubit0 = getLowestBitIndex(targetQubits);
        var qubit1 = getHighestBitIndex(targetQubits);
        // For the moment, assume we're coming from qubit space.
        // TODO: cycle through all qubits' modes
        var mode0 = this.mode_map[qubit0][0];
        var mode1 = this.mode_map[qubit1][0];
        var targ = bitFieldToInt(targetQubits);

        for (var state_index = 0; state_index < this.num_states; ++state_index)
        {
            var state = this.states[state_index];
            var pattern = state.mode_to_photon_count;
            for (var qi = qubit0; qi <= qubit1; ++qi)
            {
                if (targ & (1 << qi))
                {
                    var mode = this.mode_map[qi][0];
                    pattern[mode] = photon_count;
                }
            }
        }
        if (this.verbose)
            this.printState('-> write result ');
    }

    this.exchange = function(targetQubits)
    {
        if (this.verbose)
            console.log(this.state_data);
        var qubit0 = getLowestBitIndex(targetQubits);
        var qubit1 = getHighestBitIndex(targetQubits);
        // For the moment, assume we're coming from qubit space.
        // TODO: cycle through all qubits' modes
        var mode0 = this.mode_map[qubit0][0];
        var mode1 = this.mode_map[qubit1][0];
        // Handle the exchange using just a re-map
        this.mode_map[qubit0][0] = mode1;
        this.mode_map[qubit1][0] = mode0;

        if (this.verbose)
            this.printState('-> exchange result ');
        if (this.verbose)
            console.log(this.state_data);
    }

    // Given one photon at the source, this generates a photon at the output
    this.pair_source = function(targetQubits)
    {
        if (this.verbose)
            console.log(this.state_data);
        var bit0 = getLowestBitIndex(targetQubits);
        var bit1 = getHighestBitIndex(targetQubits);
        for (var state_index0 = 0; state_index0 < this.num_states; ++state_index0)
        {
            var state0 = this.states[state_index0];
            for (var state_index1 = state_index0 + 1; state_index1 < this.num_states; ++state_index1)
            {
                var state1 = this.states[state_index1];
                var is_buddy = false;
                if (state0.mode_to_photon_count[bit0] == 2 && state0.mode_to_photon_count[bit1] == 0
                    && state0.mode_to_photon_count[bit0] == 1 && state0.mode_to_photon_count[bit1] == 1)
                {
                    is_buddy = true;
                    for (var mode_index = 0; mode_index < this.qReg.numQubits && is_buddy; ++mode_index)
                    {
                        if (mode_index != bit0 && mode_index != bit1)
                        {
                            if (state0.mode_to_photon_count[mode_index] != state1.mode_to_photon_count[mode_index])
                                is_buddy = false;
                        }
                    }
                }
                if (is_buddy)
                {
                    if (this.verbose)
                        console.log('  pair_source buddies ' + state0.mode_str() + ' <-> ' + state1.mode_str());
                    // Found an exchange-buddy, so swap the values.
                    var tr = this.state_data[state_index0 * 2];
                    var ti = this.state_data[state_index0 * 2 + 1];
                    this.state_data[state_index0 * 2]     = 0;
                    this.state_data[state_index0 * 2 + 1] = 0;
                    this.state_data[state_index1 * 2]     = tr;
                    this.state_data[state_index1 * 2 + 1] = ti;
                    break;
                }
            }
        }
        if (this.verbose)
            this.printState('-> pair_source result ');
        if (this.verbose)
            console.log(this.state_data);
    }


    this.phase = function(targetQubits, theta_degrees)
    {
        if (this.verbose)
            console.log(this.state_data);
        if (theta_degrees == 0)
            return;
        var theta_radians = Math.PI * theta_degrees / 180.0;
        var sval = Math.sin(theta_radians);
        var cval = Math.cos(theta_radians);

        // For the moment, assume we're coming from qubit space.
        // TODO: cycle through all qubits' modes
        var mode_mask = 0;
        var qubit_mask = bitFieldToInt(targetQubits);
        // TODO: Expand this to >32 modes
        var low_bit = getLowestBitIndex(targetQubits)
        var high_bit = getHighestBitIndex(targetQubits)
        
        if (low_bit == high_bit)
        {
            // For single-mode phase, multiply the phase angle by the number of photons.
            // I'm not sure how this applies to multimode phase, but in qubit space
            // (which is usually where I do that) it doesn't matter, so I'll ignore
            // that case for now, and consider cphase separate from single-mode phase.
            var cos_sin_phase_table = [[1,0],[cval,sval]];
            for (var state_index = 0; state_index < this.num_states; ++state_index)
            {
                var state = this.states[state_index];
                var num_photons = state.mode_to_photon_count[low_bit];
                // TODO: Expand this to >32 modes
                if (num_photons > 0)
                {
                    while (cos_sin_phase_table.length <= num_photons)
                    {
                        var p = cos_sin_phase_table.length;
                        var sval = Math.sin(theta_radians * p);
                        var cval = Math.cos(theta_radians * p);
                        cos_sin_phase_table.push([cval, sval]);
                    }
                    var cval = cos_sin_phase_table[num_photons][0];
                    var sval = cos_sin_phase_table[num_photons][1];
                    var ar = this.state_data[state_index * 2];
                    var ai = this.state_data[state_index * 2 + 1];
                    this.state_data[state_index * 2]     = cval*ar + sval*ai;
                    this.state_data[state_index * 2 + 1] = cval*ai - sval*ar;
                }
            }
        }
        else
        {
            // This is the conditional-phase case.
            for (var i = 0; qubit_mask; ++i)
            {
                if (qubit_mask & 1)
                    mode_mask |= 1 << this.mode_map[i][0];
                qubit_mask >>>= 1;
            }
            
            for (var state_index = 0; state_index < this.num_states; ++state_index)
            {
                var state = this.states[state_index];
                // TODO: Expand this to >32 modes
                if ((state.mode_logical_value & mode_mask) == mode_mask)
                {
                    var ar = this.state_data[state_index * 2];
                    var ai = this.state_data[state_index * 2 + 1];
                    this.state_data[state_index * 2]     = cval*ar + sval*ai;
                    this.state_data[state_index * 2 + 1] = cval*ai - sval*ar;
                }
            }
        }
        if (this.verbose)
            this.printState('-> phase shift result ');
    }

// End of class
}














//////////////////////////////////////////////////////////////////
// The code below is legacy now, but still used. Hopefully the
// code above will eventually replace it.



function convertToBeamSplitters(staff)
{
    if (!qReg.position_encoded)
        return;
    staff.convertToBeamSplitters();
}

function convertToPositionEncoding(staff)
{
    var qReg = staff.qReg;
    if (qReg.position_encoded)
        return;
    qReg.position_encoded = true;
    var old_instructions = new Array();
    var old_numQubits = qReg.numQubits;

    for (var instIndex = 0; instIndex < staff.instructions.length; ++instIndex)
        old_instructions.push(staff.instructions[instIndex]);

    // First, double the number of qubits.
    this.qReg.deactivate();
//    this.qReg.removeAllQInts();
    this.qReg.setSize(old_numQubits * 2, qReg.numBlockQubits, qReg.doublePrecision);
    this.qReg.activate();
    this.qReg.staff.clear();

    // Now, transfer the instructions
    var in_photon_sim = false;

    for (var instIndex = 0; instIndex < old_instructions.length; ++instIndex)
    {
        var old_inst = old_instructions[instIndex];

        var old_op = old_inst.op;
        var new_op = old_op;

        // Transfer the conditions
        var old_cond = old_inst.conditionQubits;
        var new_cond = new BitField(0, qReg.numQubits);
        var new_aux = new BitField(0, qReg.numQubits);
        var temp_cond = new BitField(0, qReg.numQubits);
        var low_cond = old_cond.getLowestBitIndex();
        var high_cond = old_cond.getHighestBitIndex();
        for (var bit = low_cond; bit <= high_cond; ++bit)
        {
            if (old_cond.getBit(bit))
                new_cond.setBit(bit << 1, 1);
        }

        // Transfer the target
        var old_targ = old_inst.targetQubits;
        var new_targ = new BitField(0, qReg.numQubits);
        var new_cond2 = new BitField(0, qReg.numQubits);
        var new_targ2 = new BitField(0, qReg.numQubits);
        var new_write_val = new BitField(0, qReg.numQubits);
        var low_targ = old_targ.getLowestBitIndex();
        var high_targ = old_targ.getHighestBitIndex();
        if (0 && !in_photon_sim)
        {
            // if we're in qubi space, leave it alone.
            new_targ.set(0);
            for (var bit = low_targ; bit <= high_targ; ++bit)
            {
                if (old_targ.getBit(bit))
                {
                    new_targ.set(0);
                    new_targ.setBit(bit << 1, 1);
                    new_cond2.set(0);
                    new_cond2.setBit(bit << 1, 1);
                    new_targ2.set(0);
                    new_targ2.setBit((bit << 1) + 1, 1);
//                    staff.insertInstruction(staff.instructions.length, new QInstruction('cnot', new_targ2, new_cond2, 0, old_inst.codeLabel));
                    temp_cond.set(new_cond);
                    temp_cond.setBit((bit << 1) + 1, 1);
                    staff.insertInstruction(staff.instructions.length, new QInstruction(old_op, new_targ, temp_cond, old_inst.theta, old_inst.codeLabel));
                    new_cond2.set(0);
                    new_cond2.setBit(bit << 1, 1);
                    new_targ2.set(0);
                    new_targ2.setBit((bit << 1) + 1, 1);
//                    staff.insertInstruction(staff.instructions.length, new QInstruction('cnot', new_targ2, new_cond2, 0, old_inst.codeLabel));
                }
            }
        }
        else if (old_op == 'start_photon_sim')
        {
            in_photon_sim = true;
        }
        else if (old_op == 'stop_photon_sim')
        {
            in_photon_sim = false;
        }
        else if (old_op == 'not' || old_op == 'cnot' ||
            old_op == 'rootnot' || old_op == 'crootnot' ||
            old_op == 'rootnot_inv' || old_op == 'crootnot_inv' )
        {
            // A non-photonic NOT is a photonic EXCHANGE
            new_op = 'exchange';
            if (old_op == 'rootnot' || old_op == 'crootnot')
                new_op = 'rootexchange';
            else if (old_op == 'rootnot_inv' || old_op == 'crootnot_inv')
                new_op = 'rootexchange_inv';
            for (var bit = low_targ; bit <= high_targ; ++bit)
            {
                new_targ.set(0);
                if (old_targ.getBit(bit))
                {
                    new_targ.setBit(bit << 1, 1);
                    new_targ.setBit((bit << 1) + 1, 1);
                    var new_inst = staff.insertInstruction(staff.instructions.length, new QInstruction(new_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));

                    // Add the aux bit
                    if (low_cond >= 0)
                    {
                        new_inst.auxQubits = new BitField(0, qReg.numQubits);
                        for (var c = 0; c < qReg.numQubits; ++c)
                        {
                            if (new_cond.getBit(c))
                            {
                                var aux = c ^ 1;
                                new_inst.auxQubits.setBit(aux, 1);
                            }
                        }
                    }
                }
            }
        }
        else if (old_op == 'phase')
        {
            new_op = 'phase';
            if (low_cond == high_cond)
            {
                new_cond.set(0);
                new_cond.setBit((low_cond << 1) + 1, 1);
                var new_inst = staff.insertInstruction(staff.instructions.length, new QInstruction(new_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));
            }
            // Two-qubit CZ gate
            else if (old_inst.theta == 180 &&
                    old_inst.conditionQubits.countOneBits() == 2)
            {
                // TODO: beamsplitter CZ with utility bits
                new_targ.set(0);
                new_targ.setBit((high_cond << 1) + 0, 1);
                new_targ.setBit((low_cond << 1) + 1, 1);

                var new_inst = staff.insertInstruction(staff.instructions.length,
                                new QInstruction("dual_rail_beamsplitter", new_targ, null, 1.0/3.0, old_inst.codeLabel));

                // Set the aux bits
                new_inst.auxQubits = new BitField(0, qReg.numQubits);
                new_inst.auxQubits.setBit((high_cond << 1) + 1, 1);
                new_inst.auxQubits.setBit((low_cond << 1) + 0, 1);
            }
            else
            {
                // TODO: This isn't correct.
                new_cond.set(0);
                for (var bit = low_cond; bit <= high_cond; ++bit)
                {
                    if (old_cond.getBit(bit))
                        new_cond.setBit((bit << 1) + 1, 1);
                }
                var new_inst = staff.insertInstruction(staff.instructions.length, new QInstruction(new_op, 0, new_cond, old_inst.theta, old_inst.codeLabel));
            }
        }
        else if (old_op == 'exchange' || old_op == 'cexchange' ||
                old_op == 'rootexchange' || old_op == 'rootexchange_inv')
        {
            // A non-photonic EXCHANGE is two photonic EXCHANGEs
            new_op = old_op;
            low_targ <<= 1;
            high_targ <<= 1;
            new_targ.set(0);
            new_targ.setBit(low_targ, 1);
            new_targ.setBit(high_targ, 1);
            staff.insertInstruction(staff.instructions.length, new QInstruction(new_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));
            new_targ.set(0);
            new_targ.setBit(low_targ + 1, 1);
            new_targ.setBit(high_targ + 1, 1);
            staff.insertInstruction(staff.instructions.length, new QInstruction(new_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));
        }
        else if (old_op == 'hadamard')
        {
            // TODO: Convert this to a beamsplit/phase/beamsplit
            // This isn't logically valid (the "else" case below would be), but it's something we can recognise later.
            for (var bit = low_targ; bit <= high_targ; ++bit)
            {
                new_targ.set(0);
                if (old_targ.getBit(bit))
                {
                    new_targ.set(0);
                    new_targ2.set(0);
                    new_targ2.setBit(bit << 1, 1);
                    new_targ.setBit(bit << 1, 1);
                    new_targ.setBit((bit << 1) + 1, 1);
                    staff.insertInstruction(staff.instructions.length, new QInstruction('dual_rail_beamsplitter', new_targ, new_cond, 0.5, old_inst.codeLabel));
                    staff.insertInstruction(staff.instructions.length, new QInstruction('phase', 0, new_targ2, -90, old_inst.codeLabel));
                }
            }
        }
        else if (old_op == 'pbs')
        {
            // TODO: Convert this to a beamsplit/phase/beamsplit
            // This isn't logically valid (the "else" case below would be), but it's something we can recognise later.
            new_targ.set(0);
            new_targ.setBit((low_targ << 1) + 1, 1);
            new_targ.setBit((high_targ << 1), 1);
            staff.insertInstruction(staff.instructions.length, new QInstruction('exchange', new_targ, new_cond, 0.5, old_inst.codeLabel));
        }
        else if (old_op == 'optical_beamsplitter')
        {
            // This isn't logically valid (the "else" case below would be), but it's something we can recognise later.
            new_targ.set(0);
            new_op = 'dual_rail_beamsplitter';
            for (var bit = low_targ; bit <= high_targ; ++bit)
            {
                if (old_targ.getBit(bit))
                {
                    new_targ.setBit(bit << 1, 1);
                    new_targ.setBit((bit << 1) + 1, 1);
                }
            }
            staff.insertInstruction(staff.instructions.length, new QInstruction(new_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));
        }
        else if (old_op == 'start_photon_sim' || old_op == 'stop_photon_sim')
        {
            // This isn't logically valid (the "else" case below would be), but it's something we can recognise later.
            new_targ.set(0);
            for (var bit = low_targ; bit <= high_targ; ++bit)
            {
                if (old_targ.getBit(bit))
                {
                    new_targ.setBit(bit << 1, 1);
                    new_targ.setBit((bit << 1) + 1, 1);
                }
            }
            staff.insertInstruction(staff.instructions.length, new QInstruction(old_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));
        }
        else if (old_op == 'pair_source'
                || old_op == 'discard')
        {
            new_targ.set(0);
            new_cond.set(0);
            for (var bit = low_targ; bit <= high_targ; ++bit)
            {
                if (old_targ.getBit(bit))
                {
                    new_targ.setBit(bit << 1, 1);
                    new_targ.setBit((bit << 1) + 1, 1);
                }
            }
            for (var bit = low_cond; bit <= high_cond; ++bit)
            {
                if (old_cond.getBit(bit))
                {
                    new_cond.setBit(bit << 1, 1);
                    new_cond.setBit((bit << 1) + 1, 1);
                }
            }
            staff.insertInstruction(staff.instructions.length, new QInstruction(old_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));
        }
        else if (old_op == 'postselect')
        {
            new_targ.set(0);
            for (var bit = low_targ; bit <= high_targ; ++bit)
                if (old_targ.getBit(bit))
                    new_targ.setBit(bit << 1, 1);
            staff.insertInstruction(staff.instructions.length, new QInstruction(old_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));
        }
        else if (old_op == 'read')
        {
            new_targ.set(0);
            for (var bit = low_targ; bit <= high_targ; ++bit)
                if (old_targ.getBit(bit))
                    new_targ.setBit(bit << 1, 1);
            staff.insertInstruction(staff.instructions.length, new QInstruction(old_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));
        }
        else if (old_op == 'write')
        {
            var old_write_val = intToBitField(old_inst.writeValue);
            new_targ.set(0);
            new_write_val.set(0);
            for (var bit = low_targ; bit <= high_targ; ++bit)
            {
                if (old_targ.getBit(bit))
                {
                    // Only write the 1 bits.
                    if (val)
                        new_targ.setBit(bit << 1, 1);
                    if (!val)
                        new_targ.setBit((bit << 1) + 1, 1);
                    var val = old_write_val.getBit(bit);
                    new_write_val.setBit(bit << 1, val);
                    new_write_val.setBit((bit << 1) + 1, !val);
                }
            }
            staff.insertInstruction(staff.instructions.length, new QInstruction(old_op, new_targ, new_write_val, old_inst.theta, old_inst.codeLabel));
        }
        else
        {
            // Other non-photonic gates can be performned by using CNOT brackets.
            new_targ.set(0);
            for (var bit = low_targ; bit <= high_targ; ++bit)
            {
                if (old_targ.getBit(bit))
                {
new_targ.set(0);
                    new_targ.setBit(bit << 1, 1);
                    new_cond2.set(0);
                    new_cond2.setBit(bit << 1, 1);
                    new_targ2.set(0);
                    new_targ2.setBit((bit << 1) + 1, 1);
                    staff.insertInstruction(staff.instructions.length, new QInstruction('cnot', new_targ2, new_cond2, 0, old_inst.codeLabel));
temp_cond.set(new_cond);
temp_cond.setBit((bit << 1) + 1, 1);
staff.insertInstruction(staff.instructions.length, new QInstruction(old_op, new_targ, temp_cond, old_inst.theta, old_inst.codeLabel));
//                }
//            }
//            staff.insertInstruction(staff.instructions.length, new QInstruction(old_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));
//            for (var bit = low_targ; bit <= high_targ; ++bit)
//            {
//                if (old_targ.getBit(bit))
//                {
                    new_cond2.set(0);
                    new_cond2.setBit(bit << 1, 1);
                    new_targ2.set(0);
                    new_targ2.setBit((bit << 1) + 1, 1);
                    staff.insertInstruction(staff.instructions.length, new QInstruction('cnot', new_targ2, new_cond2, 0, old_inst.codeLabel));
                }
            }


//            new_targ.set(0);
//            staff.insertInstruction(staff.instructions.length, new QInstruction(new_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));
        }
    }
    staff.cancelRedundantOperations();

    this.qReg.changed();
}

function dipStroke(x1, x2, y1, y2, ctx)
{
    // ________x1           x2________ y1
    //         \             /
    //          \___________/          y2

    var x1a = x1 + 0.4 * (x2 - x1);
    var x2a = x1 + 0.6 * (x2 - x1);
    var x1m = 0.5  * (x1 + x1a);
    var x2m = 0.5  * (x2 + x2a);
    var ym =  0.5  * (y1 + y2);
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(x1m, y1, x1m, ym);
    ctx.quadraticCurveTo(x1m, y2, x1a, y2);
    ctx.lineTo(x2a, y2);
    ctx.quadraticCurveTo(x2m, y2, x2m, ym);
    ctx.quadraticCurveTo(x2m, y1, x2, y1);
}

function drawPhotonicInstructions(staff, ctx)
{
    var qReg = staff.qReg;
    if (!qReg.position_encoded)
        return;
    ctx.save();

    {
        var gx = staff.gridSize * staff.photonic_stretch;
        var gy = staff.gridSize;

        var dark_grad = ctx.createLinearGradient(-0.5 * gx, 0, 0.5 * gx, 0);
        dark_grad.addColorStop(0.0, ctx.strokeStyle);
        dark_grad.addColorStop(0.5, 'black');
        dark_grad.addColorStop(1.0, ctx.strokeStyle);

        var dip_grad = ctx.createLinearGradient(0, 0, 0, 0.5 * gy);
        dip_grad.addColorStop(0.0, '#999');
        dip_grad.addColorStop(0.5, '#999');
        dip_grad.addColorStop(1.0, ctx.strokeStyle);
        var dip_grad2 = ctx.createLinearGradient(0, 0.5 * gy, 0, 0);
        dip_grad.addColorStop(0.0, '#999');
        dip_grad.addColorStop(0.5, '#999');
        dip_grad.addColorStop(1.0, ctx.strokeStyle);

        var dark_grad3 = ctx.createLinearGradient(-0.5 * gx, 0, 0.5 * gx, 0);
        dark_grad3.addColorStop(0.0, '#999');
        dark_grad3.addColorStop(0.3, '#999');
        dark_grad3.addColorStop(0.4, ctx.strokeStyle);
        dark_grad3.addColorStop(0.6, ctx.strokeStyle);
        dark_grad3.addColorStop(0.7, '#999');
        dark_grad3.addColorStop(1.0, '#999');

        // Draw the connecting lines
        var rows = new BitField(qReg.numQubits);
        if (staff.instructions_parallel)
        {
            num_slots = staff.instructions_parallel.length;
            for (var slot = 0; slot < num_slots; ++slot)
            {
                var islot = staff.instructions_parallel[slot];
                rows.set(0);
                for (var i = 0; i < islot.length; ++i)
                {
                    rows.orEquals(islot[i].targetQubits);
                    rows.orEquals(islot[i].conditionQubits);
                    rows.orEquals(islot[i].auxQubits);
                }
                for (var bit = 0; bit < qReg.numQubits; ++bit)
                {
                    if (!rows.getBit(bit))
                    {
                        ctx.beginPath();
                        ctx.moveTo(gx * (slot - 0.51), gy * bit);
                        ctx.lineTo(gx * (slot + 0.51), gy * bit);
                        ctx.stroke();
                    }
                }
            }
        }
        else
        {
            var num_slots = staff.instructions.length;
            for (var slot = 0; slot < num_slots; ++slot)
            {
                rows.set(0);
                rows.orEquals(staff.instructions[slot].targetQubits);
                rows.orEquals(staff.instructions[slot].conditionQubits);
                rows.orEquals(staff.instructions[slot].auxQubits);
                for (var bit = 0; bit < qReg.numQubits; ++bit)
                {
                    if (!rows.getBit(bit))
                    {
                        ctx.beginPath();
                        ctx.moveTo(gx * (slot - 0.51), gy * bit);
                        ctx.lineTo(gx * (slot + 0.51), gy * bit);
                        ctx.stroke();
                    }
                }
            }
        }

        for (var inst = 0; inst < staff.instructions.length; ++inst)
        {
            ctx.save();

            var curr = staff.instructions[inst];
            if (curr.parallel_slot != null)
            {
                var x = gx * curr.parallel_slot;
                ctx.translate(x, 0);
            }
            else
            {
                ctx.translate(gx * inst, 0);
            }

            var high_targ = curr.targetQubits.getHighestBitIndex();
            var low_targ = curr.targetQubits.getLowestBitIndex();
            var high_cond = curr.conditionQubits.getHighestBitIndex();
            var low_cond = curr.conditionQubits.getLowestBitIndex();
            var high = Math.max(high_targ, high_cond);
            var low = Math.min(low_targ, low_cond);
            var ok = false;

            /////////////////////////////////////////////////////////////////
            // Write
            if (curr.op == 'write')
            {
                ok = true;
                ctx.beginPath();
                for (var bit = low; bit <= high; bit += 2)
                {
                    if (curr.targetQubits.getBit(bit))
                    {
                        var x1 = -0.1 * gx;
                        var y1 = (bit - 1) * gy;
                        var x2 = 0.5 * gx;
                        var y2 = (bit + 0) * gy;
                        var dip_depth = 0.4 * gy;
                        var gap = 0.1 * gy;
                        var xa = x1 + 0.1 * (x2 - x1);
                        var xb = x1 + 0.4 * (x2 - x1);
                        var xe = x1 + 0.6 * (x2 - x1);
                        var xf = x1 + 0.9 * (x2 - x1);
                        var xm = 0.5 * (x1 + x2);
                        var ym = 0.5 * (y1 + y2);
                        dipStroke(xa, xb, y1, y1 + dip_depth, ctx);
                        dipStroke(xa, xb, y2, y2 - dip_depth, ctx);
                        dipStroke(xe, xf, y1, y1 + dip_depth, ctx);
                        dipStroke(xe, xf, y2, y2 - dip_depth, ctx);

                        // Fill in the remaining lines
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(xa, y1);
                        ctx.moveTo(xb, y1);
                        ctx.lineTo(xe, y1);
                        ctx.moveTo(xf, y1);
                        ctx.lineTo(x2, y1);

                        ctx.moveTo(x1, y2);
                        ctx.lineTo(xa, y2);
                        ctx.moveTo(xb, y2);
                        ctx.lineTo(xe, y2);
                        ctx.moveTo(xf, y2);
                        ctx.lineTo(x2, y2);

                        ctx.moveTo(x1, y3);
                        ctx.lineTo(xc, y3);
                        ctx.moveTo(xd, y3);
                        ctx.lineTo(x2, y3);

                        // Draw the resonators
                        var xr1 = x1 + 0.3 * (x2 - x1);
                        var xr2 = x1 + 0.6 * (x2 - x1);
                        var xrm = 0.5 * (xr1 + xr2);
                        var yr1 = gap;
                        var yr2 = gap * 3;
                        var yrm = 0.5 * (yr1 + yr2);

                        ctx.moveTo(xrm, y1 - yr1);
                        ctx.quadraticCurveTo(xr1, y1 - yrm, xrm, y1 - yr2);
                        ctx.quadraticCurveTo(xr2, y1 - yrm, xrm, y1 - yr1);
                        ctx.moveTo(xrm, y2 + yr1);
                        ctx.quadraticCurveTo(xr1, y2 + yrm, xrm, y2 + yr2);
                        ctx.quadraticCurveTo(xr2, y2 + yrm, xrm, y2 + yr1);
                    }
                }

                ctx.stroke();
            }
            else if (curr.op == 'dual_rail_beamsplitter' || curr.op == 'exchange' || curr.op == 'cexchange' || curr.op == 'rootexchange' || curr.op == 'rootexchange_inv')
            {
                if (high_targ == low_targ + 1)
                {
                    if (curr.op == 'exchange' && low_cond < 0)
                    {
                        // No conditions, just a swap
                        ok = true;
                        var x1 = -0.5 * gx;
                        var y1 = low_targ * gy;
                        var x2 = 0.5 * gx;
                        var y2 = high_targ * gy;
                        var xm = 0.5 * (x1 + x2);
                        var ym = 0.5 * (y1 + y2);
                        ctx.save();
                        ctx.strokeStyle = dark_grad;
                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.quadraticCurveTo(0.5 * (x1 + xm), y1, xm, ym);
                        ctx.quadraticCurveTo(0.5 * (x2 + xm), y2, x2, y2);
                        ctx.stroke();
                        ctx.restore();

                        ctx.beginPath();
                        ctx.moveTo(x1, y2);
                        ctx.quadraticCurveTo(0.5 * (x1 + xm), y2, xm, ym);
                        ctx.quadraticCurveTo(0.5 * (x2 + xm), y1, x2, y1);
                        ctx.stroke();
                    }
                    else if (curr.op == 'dual_rail_beamsplitter')
                    {
                        // No conditions, just a swap
                        ok = true;
                        var x1 = -0.5 * gx;
                        var y1 = low_targ * gy;
                        var x2 = 0.5 * gx;
                        var y2 = high_targ * gy;
                        var y3 = low_cond * gy;
                        var dip_depth = 0.4 * gy;
                        var gap = 0.1 * gy;
                        var xa = x1 + 0.1 * (x2 - x1);
                        var xb = x1 + 0.3 * (x2 - x1);
                        var xc = x1 + 0.3 * (x2 - x1);
                        var xd = x1 + 0.7 * (x2 - x1);
                        var xe = x1 + 0.7 * (x2 - x1);
                        var xf = x1 + 0.9 * (x2 - x1);
                        var xm = 0.5 * (x1 + x2);
                        var ym = 0.5 * (y1 + y2);
                        ctx.beginPath();
                        dipStroke(x1, x2, y1, y1 + dip_depth, ctx);
                        ctx.moveTo(x1, y2);
                        dipStroke(x1, x2, y2, y2 - dip_depth, ctx);
                        ctx.stroke();
                    }
                    else if (low_cond == high_cond) // one condition
                    {
                        if (low_cond == low_targ - 1 || low_cond == high_targ + 1)
                        {
                            // This is a normal CEXCHANGE or ROOTEXCHANGE gate
                            ok = true;
                            var x1 = -0.5 * gx;
                            var y1 = low_targ * gy;
                            var x2 = 0.5 * gx;
                            var y2 = high_targ * gy;
                            var y3 = low_cond * gy;
                            var dip_depth = 0.4 * gy;
                            var gap = 0.1 * gy;
                            var xa = x1 + 0.1 * (x2 - x1);
                            var xb = x1 + 0.3 * (x2 - x1);
                            var xc = x1 + 0.3 * (x2 - x1);
                            var xd = x1 + 0.7 * (x2 - x1);
                            var xe = x1 + 0.7 * (x2 - x1);
                            var xf = x1 + 0.9 * (x2 - x1);
                            var xm = 0.5 * (x1 + x2);
                            var ym = 0.5 * (y1 + y2);
                            ctx.beginPath();
                            dipStroke(xa, xb, y1, y1 + dip_depth, ctx);
                            dipStroke(xa, xb, y2, y2 - dip_depth, ctx);
                            dipStroke(xc, xd, y1, y1 - dip_depth, ctx);
                            if (low_cond < low_targ)
                                dipStroke(xc, xd, y1 - gy, y1 - gy + dip_depth, ctx);

                            dipStroke(xc, xd, y2, y2 + dip_depth, ctx);
                            if (low_cond > low_targ)
                                dipStroke(xc, xd, y2 + gy, y2 + gy - dip_depth, ctx);
                            dipStroke(xe, xf, y1, y1 + dip_depth, ctx);
                            dipStroke(xe, xf, y2, y2 - dip_depth, ctx);

                            // Fill in the remaining lines
                            ctx.moveTo(x1, y1);
                            ctx.lineTo(xa, y1);
                            ctx.moveTo(xb, y1);
                            ctx.lineTo(xc, y1);
//                            if (low_cond > low_targ)
//                                ctx.lineTo(xd, y1);
                            ctx.moveTo(xd, y1);
                            ctx.lineTo(xe, y1);
                            ctx.moveTo(xf, y1);
                            ctx.lineTo(x2, y1);

                            ctx.moveTo(x1, y2);
                            ctx.lineTo(xa, y2);
                            ctx.moveTo(xb, y2);
                            ctx.lineTo(xc, y2);
//                            if (low_cond < low_targ)
//                                ctx.lineTo(xd, y2);
                            ctx.moveTo(xd, y2);
                            ctx.lineTo(xe, y2);
                            ctx.moveTo(xf, y2);
                            ctx.lineTo(x2, y2);

                            ctx.moveTo(x1, y3);
                            ctx.lineTo(xc, y3);
                            ctx.moveTo(xd, y3);
                            ctx.lineTo(x2, y3);

                            ctx.stroke();
                            // cleanup bits
                            ctx.save();
                            if (low_cond > low_targ)
                            {
                                ctx.strokeStyle = dark_grad3;
                                ctx.beginPath();
                                dipStroke(xc, xd, y1 - dip_depth - 2*gap - dip_depth/8, y1 - dip_depth - 2*gap, ctx);
                                ctx.stroke();
                            }
                            else
                            {
                                ctx.strokeStyle = dark_grad3;
                                ctx.beginPath();
                                dipStroke(xc, xd, y2 + dip_depth + 2*gap + dip_depth/8, y2 + dip_depth + 2*gap, ctx);
                                ctx.stroke();
                            }
                            ctx.restore();
                            // AUX qubit, with cleanup
                            if (curr.auxQubits)
                            {
                                var low_aux = curr.auxQubits.getLowestBitIndex();
                                if (low_aux >= 0)
                                {
                                    var yaux = low_aux * gy;
                                    if (low_aux > low_targ)
                                    {
                                        ctx.beginPath();
                                        dipStroke(xc, xd, yaux, yaux + dip_depth, ctx);
                                        ctx.stroke();

                                        ctx.save();
                                        ctx.strokeStyle = dark_grad3;
                                        ctx.beginPath();
                                        dipStroke(xc, xd, yaux + dip_depth + 2*gap + dip_depth/8, yaux + dip_depth + 2*gap, ctx);
                                        ctx.stroke();
                                        ctx.restore();
                                    }
                                    else
                                    {
                                        ctx.beginPath();
                                        dipStroke(xc, xd, yaux, yaux - dip_depth, ctx);
                                        ctx.stroke();

                                        ctx.save();
                                        ctx.strokeStyle = dark_grad3;
                                        ctx.beginPath();
                                        dipStroke(xc, xd, yaux - dip_depth - 2*gap - dip_depth/8, yaux - dip_depth - 2*gap, ctx);
                                        ctx.stroke();
                                        ctx.restore();
                                    }
                                    ctx.beginPath();
                                    ctx.moveTo(x1, yaux);
                                    ctx.lineTo(xc, yaux);
                                    ctx.moveTo(xd, yaux);
                                    ctx.lineTo(x2, yaux);
                                    ctx.stroke();
                                }
                            }
                        }
                    }
                }
            }

            // If we found something we can't etch, highlight it in red.
            if (!ok)
            {
                ctx.save();
                // Instruction isn't recognized
                ctx.fillStyle = 'red';
                ctx.strokeStyle = 'red';
                ctx.globalAlpha = 0.5;
                ctx.lineWidth = 8;
                if (high_cond >= 0)
                {
                    fillCircle(ctx, 0, gy * high_cond, gy * 0.5);
                    fillCircle(ctx, 0, gy * low_cond, gy * 0.5);
                }
                if (high_targ >= 0)
                {
                    strokeCircle(ctx, 0, gy * high_targ, gy * 0.5);
                    strokeCircle(ctx, 0, gy * low_targ, gy * 0.5);
                }
                ctx.restore();
            }

            ctx.restore();
        }
    }
    ctx.restore();
}

// Node.js hookups
module.exports.PhotonSim = PhotonSim;
