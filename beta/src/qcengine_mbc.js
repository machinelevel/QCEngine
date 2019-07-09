/////////////////////////////////////////////////////////////////////////////
// qcengine_mbc.js
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

function MbcNode(node_index, inst_index, qubit_index, instruction)
{
    this.node_index = node_index;
    this.inst_index = inst_index;
    this.qubit_index = qubit_index;
    this.final_qubit_index = this.node_index;
    this.instruction = instruction;
    this.measurement_phase = 0;
    this.pending_instructions = [];
}

function MbcLink(link_index, type, node0, node1)
{
    this.link_index = link_index;
    this.type = type;
    this.node = [node0, node1];
}

function MeasurementBasedComputationConverter(qReg)
{
    this.qReg = qReg;
    this.verbose = false;
    this.overlay_visible = false;
    this.use_alt_links = false;

    this.clear = function()
    {
        this.nodes = [];
        this.links = [];
        this.node_grid = [];
        this.pre_instructions = [];
        this.overlay_visible = false;
    }

    // Build the MBC graph
    this.build_mbc_graph = function(use_alt_links)
    {
        this.use_alt_links = use_alt_links;
        this.bits_in_cluster = new BitField(0, this.qReg.numQubits);
        this.staff = this.qReg.staff;
        this.staff.clearParallelization();
        this.clear();

        for (var qubit_index = 0; qubit_index < this.qReg.numQubits; ++qubit_index)
            this.node_grid.push([]);

        for (var inst_index = 0; inst_index < this.staff.instructions.length; ++inst_index)
        {
            var inst = this.staff.instructions[inst_index];
            if (inst.op == 'phase' && inst.theta == 180 &&
                inst.conditionQubits.countOneBits() > 1)
            {
                // CZ case
                var low = inst.conditionQubits.getLowestBitIndex();
                var high = inst.conditionQubits.getHighestBitIndex();
                var prev_cz_node = null;
                this.bits_in_cluster.orEquals(inst.conditionQubits);
                for (qubit_index = low; qubit_index <= high; ++qubit_index)
                {
                    if (inst.conditionQubits.getBit(qubit_index))
                    {
                        this.analyze_pending_instructions(this.node_grid[qubit_index], inst_index);
                        var node = this.add_node(inst_index, qubit_index, inst);
                        if (prev_cz_node)
                            this.add_link('cz', node, prev_cz_node, inst);
                        if (this.node_grid[qubit_index].length > 1)
                            this.add_link('rail', node,
                                this.node_grid[qubit_index][this.node_grid[qubit_index].length - 2]);
                        prev_cz_node = node;
                    }
                }
            }
            else
            {
                this.add_instruction(inst);
            }
        }

        this.overlay_visible = true;
        this.staff.draw();
        this.debug_print();
    }

    this.add_node = function(inst_index, qubit_index, inst)
    {
        var node_index = this.nodes.length;
        var node = new MbcNode(node_index, inst_index, qubit_index, inst);
        if (this.node_grid[qubit_index].length == 0)
            node.is_input = true;
        this.node_grid[qubit_index].push(node);
        this.nodes.push(node);
        return node;
    }

    this.add_link = function(type, node0, node1)
    {
        var link_index = this.links.length;
        var link = new MbcLink(link_index, type, node0, node1);
        this.links.push(link);
        return link;
    }

    this.add_instruction = function(inst)
    {
        var handled_ok = false;
        if (inst.op == 'phase')
        {
            if (!this.bits_in_cluster.andIsNotEqualZero(inst.conditionQubits))
            {
                this.pre_instructions.push(inst);
                return true;
            }
        }
        else
        {
            if (!this.bits_in_cluster.andIsNotEqualZero(inst.targetQubits))
            {
                this.pre_instructions.push(inst);
                return true;
            }
        }

        if (inst.op == 'hadamard')
        {
            handled_ok = this.add_pending_instruction_bits(inst, inst.targetQubits);
        }
        else if (inst.op == 'phase')
        {
            if (inst.conditionQubits.countOneBits() == 1)
                handled_ok = this.add_pending_instruction_bits(inst, inst.conditionQubits);
        }
        else if (inst.op == 'not' || inst.op == 'cnot')
        {
            handled_ok = this.add_pending_instruction_bits(inst, inst.targetQubits);
        }

        if (!handled_ok)
        {
            this.add_error(inst.targetQubits);
            this.add_error(inst.conditionQubits);
        }
    }

    this.add_pending_instruction_bits = function(inst, qubits)
    {
        var low = qubits.getLowestBitIndex();
        var high = qubits.getHighestBitIndex();

        for (qubit_index = low; qubit_index <= high; ++qubit_index)
        {
            var grid = this.node_grid[qubit_index];
            if (grid.length > 0)
            {
                var last = grid[grid.length - 1];
                last.pending_instructions.push(inst);
            }
        }

        return true;
    }

    this.ap_one_instruction = function(inst, ap)
    {
        if (inst.op == 'phase' && inst.theta != 0)
        {
            if (ap.ending_op == 'hadamard')
            {
                var in_between_index = 0.5 * (ap.curr_node.inst_index + ap.next_inst_index);
                ap.curr_node = this.add_node(in_between_index, ap.node.qubit_index, null);
                ap.curr_node.is_auto_added = true;
                this.add_link('rail', ap.node, ap.curr_node);
            }
            ap.ending_op = inst.op;
            ap.curr_node.measurement_phase += inst.theta;
        }
        else if (inst.op == 'hadamard')
        {
            // Two Hadamards in a row cancel out.
            if (ap.ending_op == 'hadamard')
                ap.ending_op = '';
            else
                ap.ending_op = inst.op;
        }
        else if (inst.op == 'not' || inst.op == 'cnot')
        {
            // A NOT is H->Phase->H
            this.ap_one_instruction({op:'hadamard'}, ap);
            this.ap_one_instruction({op:'phase', theta:180}, ap);
            this.ap_one_instruction({op:'hadamard'}, ap);
        }
        else
            this.add_error();
    }

    // Look at the insructions between the nodes, and figure out what must be done.
    this.analyze_pending_instructions = function(grid, next_inst_index)
    {
        if (grid.length == 0)
            return;
        var grid_col = grid.length - 1;
        var ap = {};
        ap.node = grid[grid_col];
        ap.curr_node = ap.node;
        ap.ending_op = '';
        ap.next_inst_index = next_inst_index;
        var pend_count = ap.node.pending_instructions.length;
        for (var pend_index = 0; pend_index < pend_count; ++pend_index)
        {
            var inst = ap.node.pending_instructions[pend_index];
            var is_last = (pend_index == pend_count - 1);
            this.ap_one_instruction(inst, ap);
        }
        // If we end with a phase, we need to mark as not ending in a hadamard.
        if (ap.ending_op != 'hadamard')
        {
            if (this.use_alt_links)
            {
                ap.node.no_trailing_hadamard = true;
            }
            else
            {
                var in_between_index = 0.5 * (ap.node.inst_index + next_inst_index);
                var node2 = this.add_node(in_between_index, ap.node.qubit_index, null);
                node2.is_auto_added = true;
                this.add_link('rail', ap.node, node2);
            }
        }
    }

    this.add_error = function(qubits)
    {
        this.error = true;
        return true;
    }

    this.arrange_final_qubits = function(ignore_input)
    {
        // Arrange the qubits so that the output bits are first (to make
        // debugging easy) and then the input bits, and then all of the extras.
        var next_index = 0;
        this.input_nodes_bf = new BitField(0, this.nodes.length);
        this.output_nodes_bf = new BitField(0, this.nodes.length);
        this.work_nodes_bf = new BitField(0, this.nodes.length);

        var input_first = true;
        if (ignore_input)
            input_first = false;

        // Input bits
        if (input_first)
        {
            for (var i = 0; i < this.node_grid.length; ++i)
            {
                if (this.node_grid[i].length > 0)
                {
                    var node = this.node_grid[i][0];
                    node.final_qubit_index = next_index++;
                    this.input_nodes_bf.setBit(node.final_qubit_index, 1);
                }
            }
        }

        // Output bits
        for (var i = 0; i < this.node_grid.length; ++i)
        {
            if (this.node_grid[i].length > 1)
            {
                var node = this.node_grid[i][this.node_grid[i].length - 1];
                node.final_qubit_index = next_index++;
                this.output_nodes_bf.setBit(node.final_qubit_index, 1);
            }
        }

        // Input bits
        if (!input_first)
        {
            for (var i = 0; i < this.node_grid.length; ++i)
            {
                if (this.node_grid[i].length > 0)
                {
                    var node = this.node_grid[i][0];
                    node.final_qubit_index = next_index++;
                    this.input_nodes_bf.setBit(node.final_qubit_index, 1);
                }
            }
        }

        // Everything else
        for (var i = 0; i < this.node_grid.length; ++i)
        {
            for (var j = 1; j < this.node_grid[i].length - 1; ++j)
            {
                var node = this.node_grid[i][j];
                node.final_qubit_index = next_index++;
                this.work_nodes_bf.setBit(node.final_qubit_index, 1);
            }
        }
    }

    // Build the MBC graph
    this.convert_to_mbc = function(append_to_current, ignore_input)
    {
        this.arrange_final_qubits(ignore_input);

        if (!append_to_current)
            this.overlay_visible = false;

        var staff = this.staff;
        var qReg = this.qReg;

        var old_instructions = new Array();
        var old_numQubits = qReg.numQubits;
        var new_numQubits = this.nodes.length;

        for (var instIndex = 0; instIndex < staff.instructions.length; ++instIndex)
            old_instructions.push(staff.instructions[instIndex]);

        // First, increase the number of qubits.
        if (old_numQubits < new_numQubits)
        {
            this.qReg.deactivate();
            this.qReg.removeAllQInts();
            this.qReg.setSize(new_numQubits);
            this.qReg.activate();
            this.qReg.staff.clear();

            if (append_to_current)
            {
                for (var instIndex = 0; instIndex < old_instructions.length; ++instIndex)
                    staff.appendInstruction(old_instructions[instIndex]);
            }
        }
        else if (!append_to_current)
        {
            this.qReg.staff.clear();
        }

        var code_label = '';
        // TODO: this pre-hadamard will get more involved soon.
        var all_bits = this.qReg.allBitsMask;
        if (append_to_current)
        {
            staff.appendInstruction(new QInstruction('discard', all_bits, 0, 0, code_label));
            staff.appendInstruction(new QInstruction('nop', all_bits, 0, 0, code_label));
        }

        var new_targ = new BitField(0, this.qReg.numQubits);
        var new_cond = new BitField(0, this.qReg.numQubits);

        if (!ignore_input)
        {
            code_label = 'pre';
            for (var i = 0; i < this.pre_instructions.length; ++i)
            {
                var inst = this.pre_instructions[i];
                var op = inst.op;
                var targ = inst.targetQubits;
                var cond = inst.conditionQubits;
                var theta = inst.theta;
                if (inst.op == 'write')
                    cond = inst.writeValue;
                staff.appendInstruction(new QInstruction(op, targ, cond, theta, code_label));
            }
            // Now transport them to the input positions
            var low_input = this.input_nodes_bf.getLowestBitIndex();
            if (low_input > 0)
            {
                var high_input = this.input_nodes_bf.getHighestBitIndex();
                new_targ.set(0);
                new_targ.setBit(high_input - low_input, 1);
                new_targ.setBit(high_input, 1);
                for (var j = high_input; j >= low_input; --j)
                {
                    staff.appendInstruction(new QInstruction('exchange', new_targ, 0, 0, code_label));                
                    new_targ.shiftRight1();
                }
            }
        }

        // Now, build the cluster
        code_label = 'prep cluster';
//        new_targ.set(this.qReg.allBitsMask);
        new_targ.set(0);
        new_targ.orEquals(this.work_nodes_bf);
        new_targ.orEquals(this.output_nodes_bf);
        if (ignore_input)
            new_targ.orEquals(this.input_nodes_bf);
        staff.appendInstruction(new QInstruction('write', new_targ, 0, 0, code_label));
        for (var node_index = 0; node_index < this.nodes.length; ++node_index)
        {
            var node = this.nodes[node_index];
//            if (node.no_trailing_hadamard)
//                new_targ.setBit(node.final_qubit_index, 0);
        }
        
        staff.appendInstruction(new QInstruction('hadamard', new_targ, 0, 0, code_label));
        for (var pass = 0; pass < 2; ++pass)
        {
            for (var link_index = 0; link_index < this.links.length; ++link_index)
            {
                var link = this.links[link_index];
                var do_this_pass = true;
                if (link.type == 'cz' && pass == 0)
                    do_this_pass = false;
                if (link.type == 'rail' && pass == 1)
                    do_this_pass = false;

                if (do_this_pass)
                {
                    if (link.type == 'rail' &&
                        (link.node[0].no_trailing_hadamard
                            || link.node[1].no_trailing_hadamard))
                    {
                        if (1)
                        {
                            // This is a better solution
                            var op = 'phase';
                            var theta = 180;
                            new_cond.set(0);
                            new_cond.setBit(link.node[0].final_qubit_index, 1);
                            new_cond.setBit(link.node[1].final_qubit_index, 1);
                            var new_inst = staff.appendInstruction(
                                        new QInstruction(op, null, new_cond, theta, code_label));

                            var targ_bit = link.node[1].final_qubit_index;
                            if (link.node[0].no_trailing_hadamard)
                                targ_bit = link.node[0].final_qubit_index;
                            new_targ.set(0);
                            new_targ.setBit(targ_bit, 1);
                            staff.appendInstruction(
                                new QInstruction('hadamard', new_targ, 0, 0, code_label));
                        }
                        else
                        {
                            // Interesting case. Is this a valid solution?
                            var cond_bit = link.node[0].final_qubit_index;
                            var targ_bit = link.node[1].final_qubit_index;
                            if (link.node[0].no_trailing_hadamard)
                            {
                                cond_bit = link.node[1].final_qubit_index;
                                targ_bit = link.node[0].final_qubit_index;
                            }
                            new_cond.set(0);
                            new_cond.setBit(cond_bit, 1);
                            new_targ.set(0);
                            new_targ.setBit(targ_bit, 1);
            //                staff.appendInstruction(new QInstruction('hadamard', new_targ, 0, 0, code_label));
                            staff.appendInstruction(new QInstruction('cnot', new_targ, new_cond, 0, code_label));
                        }
                    }
                    else
                    {
                        var op = 'phase';
                        var theta = 180;
                        new_cond.set(0);
                        new_cond.setBit(link.node[0].final_qubit_index, 1);
                        new_cond.setBit(link.node[1].final_qubit_index, 1);
                        // scan for CZ with more than two qubits and link them together.
                        if (link.type == 'cz')
                        {
                            for (var next_index = link_index + 1; next_index < this.links.length; ++next_index)
                            {
                                var next_link = this.links[next_index];
                                if (next_link.inst_index == link.inst_index && next_link.type == 'cz')
                                {
                                    new_cond.setBit(next_link.node[0].final_qubit_index, 1);
                                    new_cond.setBit(next_link.node[1].final_qubit_index, 1);
                                    link_index = next_index;
                                }
                                else
                                {
                                    break;
                                }
                            }
                        }
                        var new_inst = staff.appendInstruction(
                                    new QInstruction(op, null, new_cond, theta, code_label));
                    }
                }
            }
        }

        code_label = 'compute';
        for (var qubit_index = 0; qubit_index < this.node_grid.length; ++qubit_index)
        {
            var grid = this.node_grid[qubit_index];
            for (var grid_col = 0; grid_col < grid.length; ++grid_col)
            {
                var node = grid[grid_col];
                if (node.measurement_phase != 0)
                {
                    new_targ.set(0);
                    new_targ.setBit(node.final_qubit_index, 1);
                    staff.appendInstruction(new QInstruction('phase', 0, new_targ, node.measurement_phase, code_label));        
                }
            }
        }
        var had_targ = new BitField(0, qReg.numQubits);
        var ps_targ = new BitField(0, qReg.numQubits);
        had_targ.orEquals(this.input_nodes_bf);
        had_targ.orEquals(this.work_nodes_bf);
        ps_targ.orEquals(this.input_nodes_bf);
        ps_targ.orEquals(this.work_nodes_bf);
        staff.appendInstruction(new QInstruction('hadamard', had_targ, 0, 0, code_label));
        staff.appendInstruction(new QInstruction('postselect', ps_targ, 0, 0, code_label));

        // Now transport them from the output positions
        code_label = '';
        var low_output = this.output_nodes_bf.getLowestBitIndex();
        if (low_output > 0)
        {
            var high_output = this.output_nodes_bf.getHighestBitIndex();
            new_targ.set(0);
            new_targ.setBit(0, 1);
            new_targ.setBit(low_output, 1);
            for (var j = low_output; j <= high_output; ++j)
            {
                staff.appendInstruction(new QInstruction('exchange', new_targ, 0, 0, code_label));                
                new_targ.shiftLeft1();
            }
            staff.appendInstruction(new QInstruction('nop', 0, 0, 0, code_label));                
        }

        staff.fullSnapshot();
    }

    this.debug_print = function(message)
    {
        var str = '';
        if (message)
            str += message;
        str += 'measurement-based computation state: \n';
        console.log(str);
        console.log('There are ' + this.nodes.length + ' nodes and ' +
                    this.links.length + ' links.');
    }

    this.draw_staff_overlay = function(ctx)
    {
        if (!this.overlay_visible)
            return;
        if (!this.nodes || !this.nodes.length)
            return;
        var gs = this.staff.gridSize;
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#06f';
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.75;

        var xmin = this.nodes[0].inst_index;
        var ymin = this.nodes[0].qubit_index;
        var xmax = this.nodes[0].inst_index;
        var ymax = this.nodes[0].qubit_index;
        for (var node_index = 1; node_index < this.nodes.length; ++node_index)
        {
            xmin = Math.min(xmin, this.nodes[node_index].inst_index)
            ymin = Math.min(ymin, this.nodes[node_index].qubit_index)
            xmax = Math.max(xmax, this.nodes[node_index].inst_index)
            ymax = Math.max(ymax, this.nodes[node_index].qubit_index)
        }

        // Draw backdrop();
        var x1 = gs * (xmin - 0.5);
        var y1 = gs * (ymin - 0.5);
        var x2 = gs * (xmax - xmin + 1.0);
        var y2 = gs * (ymax - ymin + 1.0);
        ctx.fillRect(x1, y1, x2, y2);
        ctx.globalAlpha = 1.05;
        ctx.strokeRect(x1, y1, x2, y2);

        // Draw the links
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00f';
        for (var link_index = 0; link_index < this.links.length; ++link_index)
        {
            ctx.beginPath();
            var link = this.links[link_index];
            var x1 = gs * link.node[0].inst_index;
            var y1 = gs * link.node[0].qubit_index;
            var x2 = gs * link.node[1].inst_index;
            var y2 = gs * link.node[1].qubit_index;
            var radius = gs * 0.2;
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        // Draw the nodes
        ctx.lineWidth = 2;
        for (var node_index = 0; node_index < this.nodes.length; ++node_index)
        {
            var node = this.nodes[node_index];
            if (node.is_auto_added)
            {
                ctx.strokeStyle = '#06f';
                ctx.fillStyle = '#6fa';
            }
            else
            {
                ctx.strokeStyle = '#06f';
                ctx.fillStyle = '#6af';
            }
            var x = gs * node.inst_index;
            var y = gs * node.qubit_index;
            var radius = gs * 0.2;
            fillCircle(ctx, x, y, radius);
            strokeCircle(ctx, x, y, radius);
        }
        // Outline the final nodes
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#f22';
        for (var qubit_index = 0; qubit_index < this.node_grid.length; ++qubit_index)
        {
            var grid = this.node_grid[qubit_index];
            if (grid.length)
            {
                var node = grid[grid.length - 1];
                var x = gs * node.inst_index;
                var y = gs * node.qubit_index;
                var radius = gs * 0.5;
                strokeCircle(ctx, x, y, radius);
            }
        }
        ctx.restore();
    }


// End of class
}

