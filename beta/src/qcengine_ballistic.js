/////////////////////////////////////////////////////////////////////////////
// qcengine_ballistic.js
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

// Just the core of the tracked ballistic sim

/*
 To test, point browser to one of these:
 http://qcengine.com/doc/qcengine_workbench.html?program=PTAECkFcGcBdQIalgUzqA9gM1AIwQDYECWcxAxqAQrLBWgLABQzAjuQPoYAOdGAdtAB0AWwQAPDnBooOANxTlYGAE5TiIjq0i5isaKAC8oAIwA2ANyhroEKBEY4BAJ6hi-ABbFd8WB5R4xADmoNAazHIIKlQ0dOQBxvwoAO6gAEKEJGTkADKx9AAUAMwANKClpgAMAJQWbORCKmgosAXUtPRCyrCEWjp60LXM7XEoQu56BUNM7ELSKrAc5B7c6iJTdUxYqqAFkdFYKggiCaCVVofHAQA8MR3xQvyQmtAk8dBWANSflyfVzABvZg2O6jR4ocSLV6FaYAX3qc2Uq2WqzC62mQA
 file:///C:/Dropbox/Secret%20Plans/SP2xx%20-%20Quantum%20internet%20pop-up%20book/doc/qcengine_workbench.html?program=PTAECkFcGcBdQIalgUzqA9gM1AIwQDYECWcxAxqAQrLBWgLABQzAjuQPoYAOdGAdtAB0AWwQAPDnBooOANxTlYGAE5TiIjq0i5isaKAC8oAIwA2ANyhroEKBEY4BAJ6hi-ABbFd8WB5R4xADmoNAazHIIKlQ0dOQBxvwoAO6gAEKEJGTkADKx9AAUAMwANKClpgAMAJQWbORCKmgosAXUtPRCyrCEWjp60LXM7XEoQu56BUNM7ELSKrAc5B7c6iJTdUxYqqAFkdFYKggiCaCVVofHAQA8MR3xQvyQmtAk8dBWANSflyfVzABvZg2O6jR4ocSLV6FaYAX3qc2Uq2WqzC62mQA

 file:///C:/Dropbox/Secret%20Plans/SP2xx%20-%20Quantum%20internet%20pop-up%20book/doc/qcengine_workbench.html?program=PTAECkFcGcBdQIalgUzqA9gM1AIwQDYECWcxAxqAQrLBWgLABQzAjuQHQAmpCuBKAEopyGAE48AdgHMAFAEoA3MzbkA+hgAOdDJOgcAtggAeauDRRqAbiNjizxA2taRcxWNFABeUAEYAbIqgwaAgoAYYcAQAnqDEkgAWxG7wsAkoeMTSoNCOzFYIYlQ0dOQZPpIoAO6gAEKEJGTkADIl9LIArAA0oN1+HUqqHGJoKLCy1LT0HHawhM6u7tCDTJOlKBzx7grKTCDsHOZisGrkCZoOBjvMWOKgsgVFWGIIBuWgAAxBz68ZADzFKZlDiSSBOaAkMrQIIAahhPze8mYAG9mCFAesQShjCcIe0VgBfFRMR6gBHvL75QpxSSoMSabyfXZYSCScg6SSgLgYNSQTRcCwKFFokLkuG7dGkyo4xlYQjQFASkLxOkMmE+D4cXxK4LEHCyFUoemgAB8Pl8HA+SKY6NRNvRIWl8B8sDEkEVIodNNVjMp9uCRP9cX1TutXuCa2mTrMkJQ1yDKAICs9Dr190jwKqxC40jGYfD6IzGyzObGHDOCBkKC48cLbWBlccakNxp8Lc0OuD93JoABFo6oAAVBio2CY-Rlin0QrYAAVRwoDCQcbc3n8iw9WS+YAAZitQ78HyPhOJq75AtQ8eY+04cC0p3Ol3jQA



 file:///C:/Dropbox/Secret%20Plans/SP2xx%20-%20Quantum%20internet%20pop-up%20book/doc/qcengine_workbench.html?program=PTAECkFcGcBdQIalgUzqA9gM1AIwQDYECWcxAxqAQrLBWgLABQzAjuQHQAmpCuBKAEopyGAE48AdgHMAFAEoA3MzbkA+hgAOdDJOgcAtggAeauDRRqAbiNjizxA2taRcxWNFABeUAEYAbIqgwaAgoAYYcAQAnqDEkgAWxG7wsAkoeMTSoNCOzFYIYlQ0dOQZPpIoAO6gAEKEJGTkADIl9LIArAA0oN1+HUqqHGJoKLCy1LT0HHawhM6u7tCDTJOlKBzx7grKTCDsHOZisGrkCZoOBjvMWOKgsgVFWGIIBuWgAAxBz68ZADzFKZlDiSSBOaAkMrQIIAahhPze8mYAG9mCFAesQShjCcIe0VgBfFRMR6gBHvL75QpxSSoMSabyfXZYSCScg6SSgLgYNSQTRcCwKFFokLkuG7dGkyo4xlYQjQFASkLxOkMmE+D4cXxK4LEHCyFUoemgAB8Pl8HA+SKY6NRNvRIWl8B8sDEkEVIodNNVjMp9uCRP9cX1TutXuCa2mTrMkJQ1xYQcjwIQkkcakNxp8Gc0OuD9yTGyqxC40jGYfDBY4RZLYw4ZxTpa48bCyv15NAAItHVAACoMVGwTH6MtPQ6FbAACqOFAYSDjbm8-kWHqyXzAADMVt7fg+u8JxIXfIFqHjzH2nDgWlO50u8aAA



*/

function BallisticLogicalQubit(lattice)
{
    this.index = lattice.logical_qubits.length;
    lattice.logical_qubits.push(this);
    this.active = false;
    this.path = [];
    this.color = rainbow_color(Math.random());
    this.ballistic_lattice = lattice;

    this.find_a_starting_qubit = function()
    {
        var lattice = this.ballistic_lattice;
        var s = (lattice.current_slice + lattice.num_slices - 1) % lattice.num_slices;
        var first_slice_qubit = s * lattice.one_slice;
        var starting_qubit = -1;

        // First, if we already have a path, move it along...
        if (this.path.length > 0)
        {
            var first_in_slice = -1;
            var last_in_slice = -1;
            // Find the first node in the path which is in our starting slice
            for (var i = 0; i < this.path.length && first_in_slice < 0; ++i)
            {
                var node = this.path[i];
                if (node >= first_slice_qubit && node < first_slice_qubit + lattice.one_slice)
                    first_in_slice = i;
            }
            // Find the last node in the path which is in our starting slice
            if (first_in_slice >= 0)
            {
                last_in_slice = first_in_slice;
                while (last_in_slice < this.path.length - 1)
                {
                    var next_node = this.path[last_in_slice + 1];
                    if (next_node < first_slice_qubit || next_node >= first_slice_qubit + lattice.one_slice)
                        break;
                    last_in_slice++;
                }

                // Now shift the path back
                var src = last_in_slice;
                var dst = 0;
                while (src < this.path.length)
                    this.path[dst++] = this.path[src++];
                this.path.length -= last_in_slice;

                starting_qubit = this.path[0];
/*
                // Temporary: If our path is blocked, terminate this one and search new
                this.path.length = 0;
                if (lattice.path_cost[starting_qubit] == lattice.blocked)
                {
                    starting_qubit = -1;
                    this.color = rainbow_color(Math.random());
                }
*/

                // Now, if the path is blocked we'll let it decay.
                if (lattice.path_cost[starting_qubit] == lattice.blocked)
                {
                    // See if any of our lateral neighbors aren't blocked
                    for (var i = 0; i < 4; ++i)
                    {
                        var link = lattice.tracker.links[starting_qubit * lattice.max_links + i];
                        if (link)
                        {
                            var link_qubit = starting_qubit + link;
                            if (lattice.path_cost[link_qubit] != lattice.blocked)
                                starting_qubit = link_qubit;
                        }
                    }
                }

                if (lattice.path_cost[starting_qubit] != lattice.blocked)
                {
                    // If it's not blocked, search it again.
                    // TODO: This is a bit wasteful. Shouldn't need to search every time, just extend.
                    this.path.length = 0;
                }
                else
                {
                    // For now, if it's blocked, give up and mak a new path.
                    starting_qubit = -1;
                    this.path.length = 0;
//                    this.color = rainbow_color(Math.random());
                }

            }
        }

        // If there wasn't already a path, then search for a starting qubit
        // TODO: Just search every unblocked qubit every time? Seems likely.
        if (starting_qubit < 0)
        {
            // First, look for one in the core
            var x0 = 0 | (lattice.slice_width * 0.25);
            var x1 = 0 | (x0 + lattice.slice_width * 0.5);
            var y0 = 0 | (lattice.slice_height * 0.25);
            var y1 = 0 | (y0 + lattice.slice_height * 0.5);
            for (var y = y0; y < y1; ++y)
            {
                for (var x = x0; x < x1; ++x)
                {
                    var qi = first_slice_qubit + y * lattice.slice_width + x;
                    if (lattice.path_cost[qi] == 0 && lattice.path_used[qi] < 0)
                    {
                        lattice.path_used[qi] = this.index;
                        return qi;
                    }
                }
            }
            // If still not found, search everything
            for (var y = 0; y < lattice.slice_height; ++y)
            {
                for (var x = 0; x < lattice.slice_width; ++x)
                {
                    var qi = first_slice_qubit + y * lattice.slice_width + x;
                    if (lattice.path_cost[qi] == 0 && lattice.path_used[qi] < 0)
                    {
                        lattice.path_used[qi] = this.index;
                        return qi;
                    }
                }
            }
        }
        return starting_qubit;
    }

    this.update_path = function()
    {
        var lattice = this.ballistic_lattice;
        // TODO: Update without starting over
//        this.path = [];
        var start = this.find_a_starting_qubit();

        // If we have an old path, and can't make a new one, just let it decay.
        if (start >= 0 && this.path.length > 1 && lattice.path_cost[this.path[start]] != lattice.blocked)
        {
            this.active = true;
            return;
        }

        if (start < 0)
        {
            this.active = false;
            return;
        }
        else
        {
            this.path.push(start);
            var done = false;
            var qubit_0_index = start;
            while (!done)
            {
                var links_index = qubit_0_index * lattice.max_links;
                var next = -1;
                if (lattice.tracker.links[5 + links_index])
                {
                    // Move forward if possible
                    var test = qubit_0_index + lattice.tracker.links[5 + links_index];
//                    if (lattice.path_used[test] < 0)
                    if (lattice.path_cost[test] != lattice.blocked) // This should never happen!
                        next = test;
                }

                if (next < 0)
                {
                    // Otherwise, find a good lateral move
                    var best_cost = lattice.path_cost[qubit_0_index];
                    for (var i = 0; i < 4; ++i)
                    {
                        if (lattice.tracker.links[i + links_index])
                        {
                            var test = qubit_0_index + lattice.tracker.links[i + links_index];
                            if (lattice.path_cost[test] < best_cost)
                            {
                                best_cost = lattice.path_cost[test];
                                next = test;
                            }
                        }
                    }
                }
                if (next >= 0)
                {
                    lattice.path_used[next] = this.index;
                    this.path.push(next);
                    qubit_0_index = next;
                }
                else
                {
                    done = true;
                }
            }
        }
        this.active = (this.path.length > 0);
    }

    this.draw_path = function(ctx, widget)
    {
        if (!this.active || this.path.length <= 0)
            return;
        var pos = [0, 0];
        ctx.lineWidth = 20;
        ctx.strokeStyle = this.color;
//        ctx.strokeStyle = 'red';
        ctx.globalAlpha = 0.5;
        lattice.qubit_index_to_draw_pos(this.path[0], widget, pos);
        ctx.beginPath();
//        var str = 'path:';
//        str += ' ' + this.path[0];

//        console.log('path ' + 0 + ': ' + this.path[0] + ' at ' + pos[0] + ',' + pos[1]);
        ctx.moveTo(pos[0], pos[1]);
        for (var i = 1; i < this.path.length; ++i)
        {
            lattice.qubit_index_to_draw_pos(this.path[i], widget, pos);
//            console.log('path ' + i + ': ' + this.path[i] + ' at ' + pos[0] + ',' + pos[1]);
//            str += ' ' + this.path[0];
            ctx.lineTo(pos[0], pos[1]);
        }
//        console.log(str);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
}

// Tracker links: for each qubit in the lattice, links are stored
// in 32-bit signed integers, as deltas between qubit indices.
function BallisticLattice(slice_width, slice_height, num_slices)
{
    this.slice_width = slice_width;
    this.slice_height = slice_height;
    this.one_slice = this.slice_width * this.slice_height;
    this.num_slices = num_slices;
    this.slices = [];
    this.tracker = {};
    this.logical_qubits = [];
    this.tracker.links = null;
    this.max_links = 6;
    this.slice_serial_number = 0;
    this.anim_interp = 0;
    this.fusion_probability = 0.75;

    this.slice_mask = [];
    this.read_results = [];
    this.total_qubits = this.one_slice * this.num_slices;
    this.blocked = this.total_qubits + 1000;    // The marker we use for blocked paths

    this.current_slice = 0;


    this.init = function()
    {
        qc.qReg.ballistic_lattice = this;
        this.ballistic_lattice_qint = qint.new(this.one_slice * this.num_slices, 'lattice');
//        this.slices[i].ui_hidden = true;
        for (var i = 0; i < this.num_slices; ++i)
        {
//            this.slices[i] = qint.new(this.one_slice, 'slice' + i);
//            this.slices[i].ui_hidden = true;
            this.slice_mask[i] = newShiftedOnesMask(this.one_slice, i * this.one_slice + this.ballistic_lattice_qint.startBit);
            this.read_results[i] = 0;
        }
        this.tracker.links = new Int32Array(new ArrayBuffer((this.max_links * this.total_qubits) * 4));
        this.path_cost = new Int32Array(new ArrayBuffer(this.total_qubits * 4));
        this.path_used = new Int32Array(new ArrayBuffer(this.total_qubits * 4));
        for (var i = 0; i < this.total_qubits * this.max_links; ++i)
            this.tracker.links[i] = 0;
        for (var i = 0; i < this.total_qubits; ++i)
        {
            this.path_cost[i] = this.blocked; // mark them as blocked
            this.path_used[i] = -1; // mark them as free
        }
        this.fuse_mask = NewBitField(0, qc.qReg.numQubits);
    }

    this.do_gates = function()
    {
        if (!qc.qReg.disableSimulation)
            return true;
        if (qc.qReg.chp && qc.qReg.chp.active)
            return true;
        if (qc.qReg.staff.trackingEnabled)
            return true;
        return false;
    }

    this.add_logical_qubit = function()
    {
        new BallisticLogicalQubit(this);
        // Re-color everything
        for (var i = 0; i < this.logical_qubits.length; ++i)
            this.logical_qubits[i].color = rainbow_color(i / this.logical_qubits.length);
    }

    this.set_num_logical_qubits = function(num)
    {
        while (this.logical_qubits.length < num)
            this.add_logical_qubit();
        if (this.logical_qubits.length > num)
            this.logical_qubits.length = num;
    }

    this.update_all_logical_qubits = function()
    {
        for (var i = 0; i < this.total_qubits; ++i)
            this.path_used[i] = -1; // mark them as free
        for (var i = 0; i < this.logical_qubits.length; ++i)
            this.logical_qubits[i].update_path();
    }

    this.destroy = function()
    {
        qc.qReg.ballistic_lattice = null;
    }

    // Run whatever fusion gate we're using
    this.fuse = function(qubit_0_index, qubit_1_index, fuse_dir_slot)
    {
        this.fuse_mask.set(0);
        this.fuse_mask.setBit(this.ballistic_lattice_qint.startBit + qubit_0_index, 1);
        this.fuse_mask.setBit(this.ballistic_lattice_qint.startBit + qubit_1_index, 1);

        var r = Math.random();
        if (r <= this.fusion_probability)
        {
            // Track this
            var slice0 = 0|(qubit_0_index / this.one_slice);
            var slice1 = 0|(qubit_1_index / this.one_slice);

            var link0_index = this.max_links * qubit_0_index;
            var link1_index = this.max_links * qubit_1_index;
            var diff = qubit_1_index - qubit_0_index;
            this.tracker.links[link0_index + fuse_dir_slot * 2] = diff;
            this.tracker.links[link1_index + fuse_dir_slot * 2 + 1] = -diff;
            // Do the actual quantum instruction
            if (this.do_gates())
                qc.cz(this.fuse_mask);
            return true;
        }
        else
        {
            qc.phase(0, this.fuse_mask);
            return false;
        }
    }

    this.read_slice = function(slice_index)
    {
        if (this.do_gates())
        {
            qc.hadamard(this.slice_mask[this.current_slice]);
            this.read_results[slice_index] = qc.read(this.slice_mask[this.current_slice]);
        }

        // Disconnect all tracked links
        var slice_qubit_start = slice_index * this.one_slice;
        var slice_qubit_end = slice_qubit_start + this.one_slice;
        // TODO: This can be more efficient, by skipping some slices
        for (var qubit_0_index = 0; qubit_0_index < this.total_qubits; ++qubit_0_index)
        {
            if (qubit_0_index >= slice_qubit_start && qubit_0_index < slice_qubit_end)
            {
                for (var i = 0; i < this.max_links; ++i)
                {
                    var link_index = qubit_0_index * this.max_links + i;
                    this.tracker.links[link_index] = 0;
                }
            }
            else
            {
                for (var i = 0; i < this.max_links; ++i)
                {
                    var link_index = qubit_0_index * this.max_links + i;
                    var delta = this.tracker.links[link_index];
                    var qubit_1_index = qubit_0_index + delta;
                    if (qubit_1_index >= slice_qubit_start && qubit_1_index < slice_qubit_end)
                        this.tracker.links[link_index] = 0;
                }
            }
        }
    }

    this.fuse_new_slice = function()
    {
        var current_slice_index = this.current_slice * this.one_slice;
//        var s0 = this.slices[this.current_slice];
//        if (this.do_gates())
//            qc.hadamard(this.slice_mask[this.current_slice]);
        this.read_slice(this.current_slice);
//        for (var i = 0; i < this.num_slices; ++i)
//            this.read_slice(i);
        if (this.do_gates())
        {
            qc.write(0, this.slice_mask[this.current_slice]);
            qc.hadamard(this.slice_mask[this.current_slice]);
        }

        var prev_slice = (this.current_slice + this.num_slices - 1) % this.num_slices;
        var prev_slice_index = prev_slice * this.one_slice;

        // Fuse within a slice
        for (var y = 0; y < slice_height; ++y)
        {
            for (var x = 0; x < slice_width; ++x)
            {
                var qubit_0_index = current_slice_index + x + y * this.slice_width;
                var qubit_x_index = qubit_0_index + 1;
                var qubit_y_index = qubit_0_index + this.slice_width;
                if (x < this.slice_width - 1)
                    if ((this.slice_serial_number ^ x) & 1) // Brickwork pattern
                        this.fuse(qubit_0_index, qubit_x_index, 0);
                if (y < this.slice_height - 1)
                    if ((this.slice_serial_number ^ y ^ x) & 1) // Brickwork pattern
                        this.fuse(qubit_0_index, qubit_y_index, 1);
            }
        }

        // Fuse to the next slice
        for (var y = 0; y < slice_height; ++y)
        {
            for (var x = 0; x < slice_width; ++x)
            {
                var qubit_0_index = current_slice_index + x + y * this.slice_width;
                var qubit_s_index = (qubit_0_index + this.one_slice) % this.total_qubits;
                this.fuse(qubit_0_index, qubit_s_index, 2);
            }
        }
    }

    this.migrate_logical_qubits = function(slice_index)
    {
        return;
        if (!this.do_gates())
            return;
        // For any logical qubits we're managing, move them along the lattice.
        for (var logical_index = 0; logical_index < this.logical_qubits.length; ++logical_index)
        {
            var logical = this.logical_qubits[logical_index];
            var done = false;
            for (var i = 0; i < logical.path.length && !done; ++i)
            {
                var s = 0|(logical.path[i] / this.one_slice);
                if (s == slice_index)
                {
                    // Need to migrate it off of this slice
                    var actual_qubit_index = logical.path[i] + this.ballistic_lattice_qint.startBit;
                    var mask = newShiftedMask(1, actual_qubit_index);
                    qc.hadamard(mask);
                    var result = qc.read(mask);
                    var result_bool = !isAllZero(result);
                    mask.recycle();
                    if (result.isBitField)
                        result.recycle();
                    if (result_bool && logical.path.length >= i)
                    {
                        var actual_qubit_index = logical.path[i + 1] + this.ballistic_lattice_qint.startBit;
                        var mask = newShiftedMask(1, actual_qubit_index);
                        qc.not(mask);
                        mask.recycle();
                    }
                }
                else
                {
                    done = true;
                }
            }
        }

    }

    this.next_slice = function()
    {
        this.current_slice--;
        if (this.current_slice < 0)
            this.current_slice += this.num_slices;

        this.migrate_logical_qubits(this.current_slice);
        this.slice_serial_number++;
        this.fuse_new_slice();
        this.update_path_cost();
        this.update_all_logical_qubits();
    }

    // Given we've bonded a new slice, update the path-finding helpers
    // The value in each cell is the "cost to move forward one layer"
    this.update_path_cost = function()
    {
        var s = this.current_slice;
        var sn = (this.current_slice + 1) % this.num_slices;
        // Mark the whole top layer as zero cost
        for (var index = 0; index < this.one_slice; ++index)
        {
            // If there are forward links, cost is zero. Otherwise it's blocked.
            var qubit_0_index = s * this.one_slice + index;
            this.path_cost[qubit_0_index] = 0;
        }
        var new_blocks = true;
        for (var index = 1; index < this.num_slices && new_blocks; ++index)
            this.update_slice_path_cost((index + s) % this.num_slices);
    }

    this.update_slice_path_cost = function(slice_index)
    {
        var new_block_created = false;
        var fwd_link_slot = 5;
        // First, mark the forward links as blocked if they're blocked.
        for (var index = 0; index < this.one_slice; ++index)
        {
            var qubit_0_index = slice_index * this.one_slice + index;
            var fwd_link_index = fwd_link_slot + qubit_0_index * this.max_links;
            var fwd_link = this.tracker.links[fwd_link_index];
            // If there used to be a way forward from here, but there isn't now, we're newly blocked.
            if ((!fwd_link || this.path_cost[qubit_0_index + fwd_link] == this.blocked)
                && this.path_cost[qubit_0_index] == 0)
            {
                this.path_cost[qubit_0_index] = this.blocked;
                new_block_created = true;
            }
        }
        // Now, if we saw any new blocks, we need to re-route this slice.
        // At this point, all fwd-linked node are either 0 or blocked.
        if (new_block_created)
        {
            // Then, for anything with an unblocked forward link, track costs.
            // First, mark everything as blocked uness it has an unblocked fwd link
            for (var index = 0; index < this.one_slice; ++index)
            {
                var qubit_0_index = slice_index * this.one_slice + index;
                if (this.path_cost[qubit_0_index] != 0)
                    this.path_cost[qubit_0_index] = this.blocked;
            }
            // Now, fill in the costs, starting from each fwd link.
            for (var index = 0; index < this.one_slice; ++index)
            {
                var qubit_0_index = slice_index * this.one_slice + index;
                if (this.path_cost[qubit_0_index] == 0)
                    this.recursive_lateral_path_cost_search(qubit_0_index, 1);
            }
        }
        return new_block_created;
    }

    this.recursive_lateral_path_cost_search = function(qubit_0_index, next_cost)
    {
        for (var slot = 0; slot < 4; ++slot) // Lateral links only
        {
            var link_index = slot + qubit_0_index * this.max_links;
            var link = this.tracker.links[link_index];
            if (link)
            {
                var qubit_1_index = qubit_0_index + link;
                if (this.path_cost[qubit_1_index] > next_cost)
                {
                    this.path_cost[qubit_1_index] = next_cost;
                    this.recursive_lateral_path_cost_search(qubit_1_index, next_cost + 1);
                }
            }
        }
    }

    this.qubit_index_to_draw_pos = function(index, widget, out_pos)
    {
        // TODO: Clean this WAAAAY up.
        var x_start = -0.25 * widget.circleRadius;
        var y_start = -0.25 * widget.circleRadius;
        var s_step = 1.5 * widget.circleRadius;
        var y_step = 1.5 * widget.circleRadius;
        var xx_step = s_step * 0.4;
        var xy_step = y_step * 0.4;
        x_start += s_step * this.anim_interp;

        var s = 0|(index / this.one_slice);
        var y = 0|((index % this.one_slice) / this.slice_width);
        var x = 0|(index % this.slice_width);
        s = ((s - this.current_slice) + this.num_slices) % this.num_slices;
        var x1 = x_start + s * s_step + x * xx_step;
        var y1 = y_start + y * y_step + x * xy_step;
        out_pos[0] = x1;
        out_pos[1] = y1;
    }


    this.draw_slice_links = function(ctx, widget, slice_index, direction)
    {
        // Draw the links
        var x_start = -0.25 * widget.circleRadius;
        var y_start = -0.25 * widget.circleRadius;
        var s_step = 1.5 * widget.circleRadius;
        var y_step = 1.5 * widget.circleRadius;
        var xx_step = s_step * 0.4;
        var xy_step = y_step * 0.4;
        x_start += s_step * this.anim_interp;
        var pos0 = [0, 0];
        var pos1 = [0, 0];

        ctx.beginPath();
        for (index = 0; index < this.one_slice; ++index)
        {
            var qubit_0_index = slice_index * this.one_slice + index;
            this.qubit_index_to_draw_pos(qubit_0_index, widget, pos0);

            var link0_offset = qubit_0_index * this.max_links;
            for (var i = 0; i < this.max_links; i += 2)
            {
                var link = this.tracker.links[link0_offset + i + direction];
                if (link)
                {
                    var qubit_1_index = ((qubit_0_index + link) + this.total_qubits) % this.total_qubits;
                    this.qubit_index_to_draw_pos(qubit_1_index, widget, pos1);
                    ctx.moveTo(pos0[0], pos0[1]);
                    ctx.lineTo(pos1[0], pos1[1]);
                }
            }
        }
        ctx.stroke();

        // draw labels
        if (this.draw_lattice_labels)
        {
            var textsize = 24;
            ctx.font = '' + textsize + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = 'black';
            for (index = 0; index < this.one_slice; ++index)
            {
                var qubit_0_index = slice_index * this.one_slice + index;
                this.qubit_index_to_draw_pos(qubit_0_index, widget, pos0);
                var str = '';
                if (this.draw_lattice_labels == 'path_cost')
                {
                    str += '' + this.path_cost[qubit_0_index];
                }
                else if (this.draw_lattice_labels == 'x_links')
                {
                    str += '' + this.tracker.links[0 + qubit_0_index * this.max_links];
                    str += ' ' + this.tracker.links[1 + qubit_0_index * this.max_links];
                }
                else if (this.draw_lattice_labels == 'y_links')
                {
                    str += '' + this.tracker.links[2 + qubit_0_index * this.max_links];
                    str += ' ' + this.tracker.links[3 + qubit_0_index * this.max_links];
                }
                else if (this.draw_lattice_labels == 's_links')
                {
                    str += '' + this.tracker.links[4 + qubit_0_index * this.max_links];
                    str += ' ' + this.tracker.links[5 + qubit_0_index * this.max_links];
                }
                ctx.fillText(str, pos0[0], pos0[1]);
            }
        }
    }

    this.draw = function(ctx, widget)
    {
        this.widget = widget;
        ctx.save();
        var textsize = 24;
        ctx.font = '' + textsize + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        var red_slice = (this.current_slice + this.num_slices - 1) % this.num_slices;
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#f00';
//        ctx.globalAlpha = 1.0 - this.anim_interp;
        this.draw_slice_links(ctx, widget, red_slice, 1);
//        ctx.globalAlpha = 1.0;

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#08a';
        for (var i = 0; i < this.num_slices; ++i)
        {
    //        if (i != red_slice)
                this.draw_slice_links(ctx, widget, i, 1);
        }

        ctx.lineWidth = 6;
        ctx.strokeStyle = '#7f7';
        this.draw_slice_links(ctx, widget, (this.current_slice + 1) % this.num_slices, 0);

        ctx.lineWidth = 6;
        ctx.strokeStyle = '#ff0';
        this.draw_slice_links(ctx, widget, this.current_slice, 0);

        for (var i = 0; i < this.logical_qubits.length; ++i)
            this.logical_qubits[i].draw_path(ctx, widget);

        ctx.restore();
    }
}





