/////////////////////////////////////////////////////////////////////////////
// qcengine_svg.js
// Copyright 2000-2019 Eric Johnston
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
// This code takes in an instruction stream and spits out an SVG diagram.
// It will eventually replace the canvas-based drawing code in qcengine_staff.js

function create_svg_string(instruction_stream, options)
{
    if (instruction_stream == null || instruction_stream.length == 0)
        return null;
    var ctx = new SVGDrawContext();
    var str2svg = new SVGWriter(ctx);
    str2svg.append_instructions(instruction_stream);
    if (options != null && options.parallelize)
        str2svg.parallelize();
    var svg_string = str2svg.draw();
    return svg_string;
}

function SVGDrawContext()
{
    this.svg_strings = [];

    this._save_stack = [];
    this._saved_context_items = ['lineWidth', 'strokeStyle', 'fillStyle', 'globalAlpha',
                                 'font', 'textAlign', 'textBaseline',
                                 '_pos_x', '_pos_y', '_scale_x', '_scale_y', '_translate_x', '_translate_y'];

    // Saved context items
    this.lineWidth = 1;
    this.strokeStyle = 'black';
    this.fillStyle = 'white';
    this.globalAlpha = 1.0;
    this.font = 'bold 11px sans-serif';
    this.textAlign = 'middle';
    this.textBaseline = 'middle';
    this._pos_x = 0;
    this._pos_x = 0;
    this._scale_x = 1;
    this._scale_x = 1;
    this._translate_x = 0;
    this._translate_y = 0;
    this._path_sstr = [];
    this.bounds = null;
    this._bounds_margin = 20;

    this.expand_bounds = function(x, y)
    {
        if (this.bounds == null)
        {
            this.bounds = [x - this._bounds_margin, y - this._bounds_margin,
                           x + this._bounds_margin, y + this._bounds_margin];
        }
        else
        {
            if (this.bounds[0] > x - this._bounds_margin)
                this.bounds[0] = x - this._bounds_margin;
            if (this.bounds[1] > y - this._bounds_margin)
                this.bounds[1] = y - this._bounds_margin;
            if (this.bounds[2] < x + this._bounds_margin)
                this.bounds[2] = x + this._bounds_margin;
            if (this.bounds[3] < y + this._bounds_margin)
                this.bounds[3] = y + this._bounds_margin;
        }
    }

    this.get_bounds = function()
    {
        return this.bounds;
    }

    this.make_path_str = function()
    {
        return this._path_sstr.join('') + '"';
    }

    this.clear = function()
    {
        this.svg_strings = [];
    }

    this.get_svg_strings = function()
    {
        // Note that keeping an array of strings and then joining them is
        // much much much faster than concatenating as we go.
        return this.svg_strings;
    }

    this.beginPath = function()
    {
        this._path_sstr = ['<path d=\"'];
    }

    this.closePath = function()
    {
        this._path_sstr.push('Z');
    }

    this.moveTo = function(x, y)
    {
        x += this._translate_x;
        y += this._translate_y;
        this._path_sstr.push('M'+x+','+y);
        this._pos_x = x;
        this._pos_y = y;
        this.expand_bounds(x, y);
    }

    this.lineTo = function(x, y)
    {
        x += this._translate_x;
        y += this._translate_y;
        this._path_sstr.push('L'+x+','+y);
        this._pos_x = x;
        this._pos_y = y;
        this.expand_bounds(x, y);
    }

    this.quadraticCurveTo = function(control_x, control_y, x, y)
    {
        x += this._translate_x;
        y += this._translate_y;
        control_x += this._translate_x;
        control_y += this._translate_y;
        this._path_sstr.push('Q'+(control_x)+' '+(control_y)+' '+x+' '+y);
        this._pos_x = x;
        this._pos_y = y;
        this.expand_bounds(x, y);
    }

    this.arc = function(x, y, radius, start_radians, end_radians, ccw)
    {
        x += this._translate_x;
        y += this._translate_y;
        this.expand_bounds(x - radius, y - radius);
        this.expand_bounds(x + radius, y + radius);
        // TODO: real arcs if needed
        var full_circle = (start_radians < 0.0001) && (end_radians > 2.0 * Math.PI - 0.0001);
        var half_circle = (start_radians > 0.5 * Math.PI - 0.0001) && (start_radians < 0.5 * Math.PI + 0.0001)
                            && (end_radians > 1.5 * Math.PI - 0.0001) && (end_radians < 1.5 * Math.PI + 0.0001);
        if (full_circle)
        {
            this._path_sstr.push('M'+(x-radius)+','+y);
            this._path_sstr.push('a'+radius+','+radius+' '+'0 1,0  '+(radius*2)+',0');
            this._path_sstr.push('a'+radius+','+radius+' '+'0 1,0 -'+(radius*2)+',0');
        }
        else if (half_circle)
        {
            this._path_sstr.push('M'+x+','+(y+radius));
            this._path_sstr.push('a'+(radius)+','+(-radius)+' '+'0 1,0  '+0+','+(-radius*2));
//            this._path_sstr.push('a'+radius+','+radius+' '+'0 1,0 -'+(radius*2)+',0');
        }
    }

    this.fillRect = function(x, y, w, h)
    {
        x += this._translate_x;
        y += this._translate_y;
        var corner_radius = 0;
        this.emit("<rect "
            + "x=\"" + x + "\" "
            + "y=\"" + y + "\" "
            + "width=\"" + w + "\" "
            + "height=\"" + h + "\" "
            + "rx=\"" + corner_radius + "\" "
            + "ry=\"" + corner_radius + "\" "
            + "fill=\"" + this.fillStyle + "\" "
            + "stroke=\"" + "none" + "\" "
            + "fill-opacity=\"" + this.globalAlpha + "\" "
            + "stroke-opacity=\"" + this.globalAlpha + "\" "
            + "stroke-width=\""+ this.lineWidth + "\" "
            + "></rect>\n");
    }

    this.strokeRect = function(x, y, w, h)
    {
        x += this._translate_x;
        y += this._translate_y;
        var corner_radius = 0;
        this.emit("<rect "
            + "x=\"" + x + "\" "
            + "y=\"" + y + "\" "
            + "width=\"" + w + "\" "
            + "height=\"" + h + "\" "
            + "rx=\"" + corner_radius + "\" "
            + "ry=\"" + corner_radius + "\" "
            + "fill=\"" + "none" + "\" "
            + "stroke=\"" + this.strokeStyle + "\" "
            + "fill-opacity=\"" + this.globalAlpha + "\" "
            + "stroke-opacity=\"" + this.globalAlpha + "\" "
            + "stroke-width=\""+ this.lineWidth + "\" "
            + "></rect>\n");
    }

    this.emit = function(sstr)
    {
        this.svg_strings.push(sstr);
    }

    this.stroke = function()
    {
        this.emit(this.make_path_str());
        this.emit(" fill=\"none\" stroke=\"" + this.strokeStyle + "\" stroke-width=\"" + this.lineWidth + "\">");
//        this.emit("<title>" + tooltip + "</title>");
        this.emit("</path>\n");
    }

    this.fill = function()
    {
        this.emit(this.make_path_str());
        this.emit(" fill=\""+this.fillStyle+"\" stroke=\"none\" stroke-width=\"" + this.lineWidth + "\">");
//        this.emit("<title>" + tooltip + "</title>");
        this.emit("</path>\n");
    }

    this.fillText = function(text, x, y)
    {
        x += this._translate_x;
        y += this._translate_y;
        var text_size = '11px';
        var text_font = "Tahoma"
        var text_str = "<text x=\"" + x + "\" y=\"" + y
         + "\" font-family=\"" + text_font + "\" alignment-baseline=\"" + this.textBaseline + "\" text-anchor=\"" + this.textAlign + "\" "
         + "stroke=\"none\" fill=\"" + this.fillStyle + "\" fill-opacity=\"1.0\" font-size=\"" + text_size + "\">"
         + text + "</text>";
        this.emit(text_str);
    }

    this.save = function()
    {
        var save_item = {};
        for (var i = 0; i < this._saved_context_items.length; ++i)
        {
            var key = this._saved_context_items[i];
            save_item[key] = this[key];
        }
        this._save_stack.push(save_item);
    }

    this.restore = function()
    {
        if (this._save_stack.length == 0)
            return;
        var save_item = this._save_stack.pop();
        for (var i = 0; i < this._saved_context_items.length; ++i)
        {
            var key = this._saved_context_items[i];
            this[key] = save_item[key];
        }
    }

    this.translate = function(dx, dy)
    {
        this._translate_x += dx;
        this._translate_y += dy;
    }

    this.scale = function(sx, sy)
    {
        this._scale_x *= sx;
        this._scale_y *= sy;
    }

    this.measureText = function(text)
    {
        return {'width':10};
    }
}

function SVGQInstruction(op, targetQubits, conditionQubits, theta, codeLabel, auxQubits)
{
    this.qReg = null;
    this.op = op;
    if (targetQubits == null)
        targetQubits = bitfield_zero;
    if (conditionQubits == null)
        conditionQubits = bitfield_zero;
    if (auxQubits == null)
        auxQubits = bitfield_zero;

    if (!(typeof(targetQubits) === 'number' || is_bitfield(targetQubits) || Array.isArray(targetQubits)))
        console.log('Internal error: targetQubits type mismatch.');
    if (!(typeof(conditionQubits) === 'number' || is_bitfield(conditionQubits) || Array.isArray(conditionQubits)))
        console.log('Internal error: conditionQubits type mismatch.');

    this.targetQubits = to_bitfield(targetQubits);
    this.conditionQubits = to_bitfield(conditionQubits);
    if (auxQubits)
        this.auxQubits = to_bitfield(auxQubits);
    this.codeLabel = codeLabel;
    this.theta = theta;

    // TODO: Native support for S and T
    if (op == 'qc.s')
    {
        this.op = 'qc.phase';
        this.theta = 90;
    }
    else if (op == 'qc.s_inv')
    {
        this.op = 'qc.phase';
        this.theta = -90;
    }
    else if (op == 'qc.t')
    {
        this.op = 'qc.phase';
        this.theta = 45;
    }
    else if (op == 'qc.t_inv')
    {
        this.op = 'qc.phase';
        this.theta = -45;
    }
    else if (op == 'qc.z')
    {
        this.op = 'qc.phase';
        this.theta = 180;
    }


    if (op == "qc.write" || op == "qc.postselect")
    {
        // conditionQubits are used to pass in the value
        this.writeValue = conditionQubits;
        this.conditionQubits = 0;
    }


    this.draw = function(ctx, x, y, radius, qubitIndex, staff, instruction_x, slot)
    {
        ctx.lineWidth = 2;
        ctx.fillStyle = 'white';


        if (this.op == 'qc.phase' || this.op == 'qc.cphase' || this.op == 'qc.z' || this.op == 'qc.cz')
        {
            if (this.theta == 180 || this.op == 'qc.z' || this.op == 'qc.cz')
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
                ctx.moveTo(x - hradx, y - hrady);
                ctx.lineTo(x + hradx * 0.7, y - hrady);
                ctx.lineTo(x - hradx * 0.7, y + hrady);
                ctx.lineTo(x + hradx, y + hrady);
                ctx.stroke();
            }
            else if (this.theta == 90 || this.theta == -90)
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
                    ctx.moveTo(x + radius * 0.6, y - radius * 0.1);
                    ctx.lineTo(x + radius * 0.3, y - radius * 0.1);
                    ctx.moveTo(x + radius * 0.8, y - radius * 0.5);
                    ctx.lineTo(x + radius * 0.8, y + radius * 0.3);
                    ctx.stroke();
                }

                ctx.lineWidth = 2;
                ctx.beginPath();
                var hradx = 0.4 * radius;
                var hrady = 0.4 * radius;
                ctx.moveTo(x + hradx, y - hrady);
                ctx.lineTo(x - hradx * 0.5, y - hrady);
                ctx.lineTo(x - hradx * 0.7, y - hrady * 0.5);
                ctx.lineTo(x + hradx * 0.7, y + hrady * 0.5);
                ctx.lineTo(x + hradx * 0.5, y + hrady);
                ctx.lineTo(x - hradx, y + hrady);
                ctx.stroke();
            }
            else if (this.theta == 45 || this.theta == -45)
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
                    ctx.moveTo(x + radius * 0.6, y - radius * 0.1);
                    ctx.lineTo(x + radius * 0.3, y - radius * 0.1);
                    ctx.moveTo(x + radius * 0.8, y - radius * 0.5);
                    ctx.lineTo(x + radius * 0.8, y + radius * 0.3);
                    ctx.stroke();
                }

                ctx.lineWidth = 2;
                ctx.beginPath();
                var hradx = 0.5 * radius;
                var hrady = 0.5 * radius;
                ctx.moveTo(x - hradx, y - hrady);
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
                ctx.moveTo(x + radius * 0.05,  y - radius * 0.7);
                ctx.lineTo(x - radius * 0.05, y + radius * 0.7);
                ctx.stroke();
            }
        }
        else if (this.op == 'qc.cnot' || this.op == 'qc.x')
        {
            fillCircle(ctx, x, y, radius);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - radius, y);
            ctx.lineTo(x + radius, y);
            ctx.moveTo(x, y - radius);
            ctx.lineTo(x, y + radius);
            ctx.stroke();

            // and now the frame
            strokeCircle(ctx, x, y, radius);
        }
        else if (this.op == 'qc.swap' || this.op == 'qc.cswap')
        {
            var high = getHighestBitIndex(this.targetQubits);
            var low = getLowestBitIndex(this.targetQubits);
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
                        var drawSlope_down = getBit(staff.wire_grid[slot], low);
                        var drawSlope_up = getBit(staff.wire_grid[slot], high);
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

                if (this.conditionQubits)
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
                    var high_cond = getHighestBitIndex(this.conditionQubits);
                    var low_cond = getLowestBitIndex(this.conditionQubits);
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

                
            }
            else
            {
                var xwidth = radius * 0.75;
                // Draw the x
                {
                    // exchange, separated
                    var important_bits = 0;
                    if (getBit(staff.wire_grid[slot], high))
                        important_bits++;
                    if (getBit(staff.wire_grid[slot], low))
                        important_bits++;
                    if (important_bits == 2 || this.conditionQubits)
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
            }
        }
        else if (this.op == 'qc.had')
        {
            ctx.lineWidth = 1;
            ctx.fillStyle = 'white';
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
            ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);

            ctx.lineWidth = 2;
            ctx.beginPath();
            var hradx = 0.4 * radius;
            var hrady = 0.6 * radius;
            ctx.moveTo(x - hradx, y - hrady);
            ctx.lineTo(x - hradx, y + hrady);
            ctx.moveTo(x - hradx, y);
            ctx.lineTo(x + hradx, y);
            ctx.moveTo(x + hradx, y - hrady);
            ctx.lineTo(x + hradx, y + hrady);
            ctx.stroke();
        }
        else if (this.op == 'qc.y')
        {
            ctx.lineWidth = 1;
            ctx.fillStyle = 'white';
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
            ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);

            ctx.lineWidth = 2;
            ctx.beginPath();
            var hradx = 0.4 * radius;
            var hrady = 0.6 * radius;
            ctx.moveTo(x - hradx, y - hrady);
            ctx.lineTo(x, y);
            ctx.lineTo(x + hradx, y - hrady);
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + hrady);
            ctx.stroke();
        }
        else if (this.op == 'qc.crx' || this.op == 'qc.rx'
                || this.op == 'qc.cry' || this.op == 'qc.ry'
                || this.op == 'qc.crz' || this.op == 'qc.rz')
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
            if (this.op == 'qc.crx' || this.op == 'qc.rx')
            {
                ctx.moveTo(x - hradx, y - hrady);
                ctx.lineTo(x + hradx, y + hrady);
                ctx.moveTo(x + hradx, y - hrady);
                ctx.lineTo(x - hradx, y + hrady);
            }
            else if (this.op == 'qc.cry' || this.op == 'qc.ry')
            {
                ctx.moveTo(x + hradx, y - hrady);
                ctx.lineTo(x, y);
                ctx.moveTo(x - hradx, y - hrady);
                ctx.lineTo(x, y);
                ctx.lineTo(x, y + hrady);
            }
            else if (this.op == 'qc.crz' || this.op == 'qc.rz')
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
        else if (this.op == 'qc.rootx' || this.op == 'qc.rootx_inv' || this.op == 'qc.rooty' || this.op == 'qc.rooty_inv')
        {
            ctx.lineWidth = 1;
            ctx.fillStyle = 'white';
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
            ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);

            ctx.lineWidth = 2;
            ctx.beginPath();
            var hradx = 0.4 * radius;
            var hrady = 0.6 * radius;
            if (this.op == 'qc.rootx_inv' || this.op == 'qc.rooty_inv')
                hradx = -hradx;
            ctx.moveTo(x - 2.0 * hradx, y + 0.25 * hrady);
            ctx.lineTo(x - hradx, y + hrady);
            ctx.lineTo(x, y - hrady);
            ctx.lineTo(x + 2.0 * hradx, y - hrady);

            var marker_scale = 0.6;
            var marker_offx = 0.8 * hradx;
            var marker_offy = 0.35 * hrady;

            if (this.op == 'qc.rootx' || this.op == 'qc.rootx_inv')
            {
                ctx.moveTo(x - hradx * marker_scale + marker_offx, y - hrady * marker_scale + marker_offy);
                ctx.lineTo(x + hradx * marker_scale + marker_offx, y + hrady * marker_scale + marker_offy);
                ctx.moveTo(x + hradx * marker_scale + marker_offx, y - hrady * marker_scale + marker_offy);
                ctx.lineTo(x - hradx * marker_scale + marker_offx, y + hrady * marker_scale + marker_offy);
            }
            else if (this.op == 'qc.rooty' || this.op == 'qc.rooty_inv')
            {
                ctx.moveTo(x + marker_offx + hradx * marker_scale, y - hrady * marker_scale + marker_offy);
                ctx.lineTo(x + marker_offx, y + marker_offy);
                ctx.moveTo(x + marker_offx - hradx * marker_scale, y - hrady * marker_scale + marker_offy);
                ctx.lineTo(x + marker_offx, y + marker_offy);
                ctx.lineTo(x + marker_offx, y + hrady * marker_scale + marker_offy);
            }

            ctx.stroke();
        }
        else if (this.op == 'qc.read' || this.op == 'qc.postselect')
        {
            ctx.fillStyle = 'white';
            ctx.lineWidth = 1;
            ctx.fillRect(x - radius * 0.5, y - radius, radius * 1.5, radius * 2);

            if (1)
            {
                // new D symbol
                var radx = 0.99 * radius;
                // Draw the output value
                if (this.op == 'qc.postselect' ||
                    (qc_options.show_read_bit_values && this.recentReadValue != null))
                {
                    var val = this.writeValue;
                    ctx.fillStyle = '#ddd';
                    if (this.op == 'qc.read')
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
                ctx.moveTo(x + radx, y + rady);
                ctx.lineTo(x - radius, y);
                ctx.lineTo(x + radx, y - rady);
                ctx.stroke();
            }
        }
        else if (this.op == 'qc.write')
        {
            ctx.fillStyle = 'white';
            ctx.lineWidth = 1;
//            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

            var radx = 0.5 * radius;
            var rady = 0.7 * radius;
            if (qc_options.show_write_bit_values)  // Draw the write input value
            {
                if (getBit(this.writeValue, qubitIndex))
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
                if (getBit(this.writeValue, qubitIndex))
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

    }

}

function SVGWriter(draw_context)
{
    this.ctx = draw_context;
    this.scale = 1.0;
    this.baseScale = 1.0;
    this.wheelScale = 1.0;

    this.margin_x = 20;
    this.margin_y = 50;
    this.gridSize = 20;
    this.gridSpacing = 4;
    this.numColumns = 20;
    this.nameWidth = 0;
    this.codeLabel = null;
    this.draw_double_lines = false;
    this.double_line_space = 0.2;
    this.pos = new Vec2(0, 0);

    this.view_left = 0;
    this.view_top = 0;
    this.view_width = 10;   // TODO: expand this during draw
    this.view_height = 10;   // TODO: expand this during draw
    this.outer_margin = 0;
    this.backdrop_color = 'white';
    this.num_qubits = 1;

    this.original_stream = [];
    this.instructions = [];

    this.draw = function()
    {
        this.draw_all();
        var bounds = this.ctx.get_bounds();
        if (bounds != null)
        {
            this.view_left   = bounds[0];
            this.view_top    = bounds[1];
            this.view_width  = bounds[2] - bounds[0];
            this.view_height = bounds[3] - bounds[1];
        }

        var svg_prefix = this.write_svg_prefix();
        var svg_body   = this.ctx.get_svg_strings();
        var svg_suffix = this.write_svg_suffix();
        var svg_complete = svg_prefix.concat(svg_body, svg_suffix);

        return svg_complete.join('');
    }

    this.clear_instructions = function()
    {
        this.original_stream = [];
        this.instructions = [];
        this.num_qubits = 1;
    }

    this.append_instructions = function(instruction_stream)
    {
        for (var index = 0; index < instruction_stream.length; ++index)
        {
            var inst = instruction_stream[index];
            if (inst[0] == 'qc.label' || inst[0] == 'qc.qubits')
                continue;
            this.original_stream.push(inst);
            var label = '';
            var op = inst[0];
            var item = new SVGQInstruction(inst[0], inst[1], inst[2], inst[3], label);
            this.instructions.push(item);

            if (op == 'qc.reset')
            {
                var num_qubits = inst[1];
                if (this.num_qubits < num_qubits)
                    this.num_qubits = num_qubits;
            }
        }
    }
    
    this.parallelize = function()
    {
        // TODO
    }

    this.write_svg_prefix = function()
    {
        var sstr = [
                "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"" +
                    this.view_left + " " + this.view_top + " " + this.view_width + " " + this.view_height + "\" ",
                "xmlns:xlink=\"http://www.w3.org/1999/xlink\">\n",
                "<style>\n",
                ".hover_modes_0:hover\n",
                "{\n",
                "    stroke-opacity: 0.6;\n",
                "}\n",
                ".no_mouse_events\n",
                "{\n",
                "    pointer-events: none;\n",
                "}\n",
                ".hover_labels_0:hover\n",
                "{\n",
                "    fill-opacity: 1.0;\n",
                "}\n",
                ".no_mouse_events\n",
                "{\n",
                "    pointer-events: none;\n",
                "}\n",
                "</style>\n",
                "<g>\n",
                // Draw the backdrop and frame
                "  <path d=\"M" + (this.view_left + this.outer_margin) + "," + (this.view_top + this.outer_margin)
                    + "H" + (this.view_left + this.view_width  - this.outer_margin)
                    + "V" + (this.view_top  + this.view_height - this.outer_margin)
                    + "H" + (this.view_left + this.outer_margin)
                    + "Z\""
                    + " fill=\"" + this.backdrop_color + "\" stroke=\"#000\" stroke-width=\"0.025\"/>\n",
            ];
        return sstr;
    }

    this.write_svg_suffix = function()
    {
        var sstr = [
                "</g>\n",
                "</svg>\n",
            ];
        return sstr;
    }

    this.get_qint_place = function(bit)
    {
        return '000';
    }

    this.get_qint_name = function(bit)
    {
        return 'xxx';
    }

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

        // Measure the names
        for (var bit = 0; bit < this.num_qubits; ++bit)
        {
            var radius = this.gridSize * 0.5;
            var qubitName = this.get_qint_name(bit);
            var qubitPlace = '0x' + this.get_qint_place(bit);
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
            for (var bit = 0; bit < this.num_qubits; ++bit)
            {
                // Draw the phase discs
                var radius = this.gridSize * 0.5 * 0.8;
            
                ctx.lineWidth = 1;

                var x = 1.75 * radius + this.nameWidth;
                var y = 0;

                // TODO: Fix the spacing and re-enable this
                // draw_text(ctx, '0x' + this.get_qint_place(bit), x, y, font_size, 'bold', '#000', 'right', 'middle');

                var qubitName = this.get_qint_name(bit);
                if (qubitName != oldName)
                {
                    oldName = qubitName;
                    // scan ahead to see how many rows fit
                    var sharedRows = 0;
                    for (var rbit = bit + 1; rbit < this.num_qubits && this.get_qint_name(rbit) == qubitName; rbit++)
                        sharedRows++;
                    x = 1.75 * radius + this.nameWidth - (10 + namePlaceWidth);
                    y = this.gridSize * (sharedRows / 2);
                    // TODO: Fix the spacing and re-enable this
                    // if (qubitName != '(util)')
                    //     draw_text(ctx, qubitName, x, y, font_size, 'bold', '#000', 'right', 'middle');

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

    this.setCodeLabel = function(codeLabel)
    {
        this.codeLabel = codeLabel;
    }

    this.drawCodeLabels = function(ctx)
    {
        var gx = this.gridSize;
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
                        var height = (this.num_qubits + 1.3) * gy;
                        var cornerRadius = this.gridSize * 0.5;
                        var do_stroke = true;
                        var do_fill = true;
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
                }
            }
        }
        ctx.restore();
    }

    this.drawInstructions = function(ctx)
    {
        ctx.save();
        {
            var gx = this.gridSize;
            var gy = this.gridSize;
            for (var inst = 0; inst < this.instructions.length; ++inst)
            {
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

                ctx.translate(instruction_x, 0);

                // Draw the phase discs
                var radius = this.gridSize * 0.5 * 0.8;
                var minBit = 1000;
                var maxBit = -1000;
                // First just get the min and max bits used
                for (var bit = 0; bit < this.num_qubits; ++bit)
                {
                    if (getBit(instruction.targetQubits, bit)
                        || getBit(instruction.conditionQubits, bit))
                    {
                        if (minBit > bit) minBit = bit;
                        if (maxBit < bit) maxBit = bit;
                    }
                }

                if (instruction.op == 'qc.ppr' || instruction.op == 'qc.ppm')
                {
                    console.log(this.op);
                    // Pauli-Product Rotations and Measurements
                    var dx = this.gridSize * 0.4;
                    var tb = this.gridSize * 0.4;
                    var xy_mask = instruction.targetQubits;
                    var zy_mask = instruction.conditionQubits;
                    var high = Math.max(getHighestBitIndex(xy_mask), getHighestBitIndex(zy_mask));
                    var low = Math.min(getLowestBitIndex(xy_mask), getLowestBitIndex(zy_mask));
                    if (!xy_mask)
                        low = getLowestBitIndex(zy_mask);
                    else if (!zy_mask)
                        low = getLowestBitIndex(xy_mask);

                    ctx.lineWidth = 1;
                    ctx.strokeStyle = 'black';
                    ctx.fillStyle = '#888';
                    if (instruction.op == 'qc.ppr')
                    {
                        if (instruction.theta >= 90.0)
                            ctx.fillStyle = '#ca8';
                        else if (instruction.theta >= 45.0)
                            ctx.fillStyle = '#8b8';
                        else
                            ctx.fillStyle = '#88f';
                        ctx.fillRect(-dx, this.gridSize * low  - dx, 2 * dx, 2 * dx + this.gridSize * (high - low));
                        ctx.strokeRect(-dx, this.gridSize * low  - dx, 2 * dx, 2 * dx + this.gridSize * (high - low));
                    }
                    else
                    {
                        var corner = 0.65;
                        ctx.fillStyle = '#ccf';
                        ctx.beginPath();
                        ctx.moveTo(-dx, this.gridSize * low  - tb);
                        ctx.lineTo( dx - dx * corner, this.gridSize * low  - tb);
                        ctx.lineTo( dx, this.gridSize * low  - tb + dx * corner);
                        ctx.lineTo( dx, this.gridSize * high + tb - dx * corner);
                        ctx.lineTo( dx - dx * corner, this.gridSize * high + tb);
                        ctx.lineTo(-dx, this.gridSize * high + tb);
                        ctx.lineTo(-dx, this.gridSize * low  - tb);
                        ctx.fill();
                        ctx.stroke();
                    }
                    ctx.fillStyle = 'black';
                    // Draw the letters
                    for (var i = low; i <= high; ++i)
                    {
                        var x = 0;
                        var y = i * this.gridSize;
                        var radius = this.gridSize * 0.4;
                        var pauli = getBit(xy_mask, i) | (getBit(zy_mask, i) << 1);
                        if (pauli == 1)
                        {  // X
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            var hradx = 0.4 * radius;
                            var hrady = 0.6 * radius;
                            ctx.moveTo(x - hradx, y - hrady);
                            ctx.lineTo(x + hradx, y + hrady);
                            ctx.moveTo(x - hradx, y + hrady);
                            ctx.lineTo(x + hradx, y - hrady);
                            ctx.stroke();
                        }
                        else if (pauli == 2)
                        { // Z
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            var hradx = 0.4 * radius;
                            var hrady = 0.4 * radius;
                            ctx.moveTo(x - hradx, y - hrady);
                            ctx.lineTo(x + hradx * 0.7, y - hrady);
                            ctx.lineTo(x - hradx * 0.7, y + hrady);
                            ctx.lineTo(x + hradx, y + hrady);
                            ctx.stroke();
                        }
                        else if (pauli == 3)
                        { // Y
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            var hradx = 0.4 * radius;
                            var hrady = 0.6 * radius;
                            ctx.moveTo(x - hradx, y - hrady);
                            ctx.lineTo(x, y);
                            ctx.lineTo(x + hradx, y - hrady);
                            ctx.moveTo(x, y);
                            ctx.lineTo(x, y + hrady);
                            ctx.stroke();
                        }
                    }
                }
                else if (instruction.conditionQubits
                    || instruction.op == 'qc.swap'
                    || instruction.op == 'qc.cswap'
                    || instruction.op == 'qc.rootswap'
                    || instruction.op == 'qc.rootswap_inv'
                    )
                {
                    var dim = false;
                    if (instruction.op == 'qc.phase' && instruction.theta == 0.0)
                        dim = true;
                    if (dim)
                        ctx.globalAlpha = 0.25;
                    // This is the vertical line connecting conditions and targts
                    if (minBit < maxBit)
                    {
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
                                    var is_cond = getBit(instruction.conditionQubits, bit);
                                    var is_targ = getBit(instruction.targetQubits, bit);
                                    if (is_cond || is_targ)
                                    {
                                        var is_classical = !getBit(this.wire_grid[slot], bit);
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
                if (1 || qc_options.show_rotation_angle_values)
                {
                    if (   (instruction.op == 'qc.phase')
                        || (instruction.op == 'qc.rx')
                        || (instruction.op == 'qc.ry')
                        || (instruction.op == 'qc.rz')
                        || (instruction.op == 'qc.crx')
                        || (instruction.op == 'qc.cry')
                        || (instruction.op == 'qc.crz')
                        || (instruction.op == 'qc.ppr')
                        || (instruction.op == 'qc.ppm')
                        )
                    {
                        ctx.save();
                        ctx.font = 'bold 11px sans-serif';
                        ctx.textAlign = 'middle';
                        ctx.textBaseline = 'middle';
                        var x = 0;
                        var y = -this.gridSize * 1.0;

                        var label = '';

                        if (instruction.op == 'qc.ppm')
                        {
                            label = (instruction.theta < 0.0) ? '-' : '';
                        }
                        else
                        {
                            var special_phase = false;
                            if (instruction.op == 'qc.phase')
                            {
                                // No label for a simple CZ
    //                                if (countOneBits(instruction.conditionQubits) > 1)
                                {
                                    if (instruction.theta == 180.0
                                        || instruction.theta == 90.0
                                        || instruction.theta == 45.0)
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

                for (var bit = 0; bit < this.num_qubits; ++bit)
                {
                    var is_targ = getBit(instruction.targetQubits, bit);
                    var is_cond = getBit(instruction.conditionQubits, bit);
                    var num_targ = countOneBits(instruction.targetQubits);
                    var num_cond = countOneBits(instruction.conditionQubits);
                    if (instruction.op == 'qc.ppr' || instruction.op == 'qc.ppm')
                    {
                    }
                    else if ((instruction.op == 'qc.phase' || instruction.op == 'qc.z' || instruction.op == 'qc.cz')
                             && (is_targ || is_cond))
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
                            else if (instruction.theta == 45.0 ||
                                instruction.theta == -45.0 ||
                                instruction.theta == 90.0 ||
                                instruction.theta == -90.0)
                            {
                                if (is_targ || num_targ == 0)
                                    do_large_phase_marker = true;
                            }
                            else
                            {
                                if (is_targ || num_targ == 0 || num_targ == 1)
                                    do_large_phase_marker = true;
                            }

                            // Exception for simple multi-dot Z and CZ
                            if ((num_targ == 0 && num_cond > 1)
                                || (num_targ == 1 && num_cond > 0))
                                do_large_phase_marker = false;

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
                        instruction.draw(ctx, 0, this.gridSize * bit, radius, bit, this, instruction_x, slot);
                    }
                    else if (is_cond)
                    {
                        if (instruction.op == 'qc.phase')
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
                            else if (instruction.theta == 45.0 || instruction.theta == -45.0
                                    || instruction.theta == 90.0 || instruction.theta == -90.0)
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
                            if (instruction.theta == 0.0)
                                ctx.globalAlpha = 1.0;
                        }
                        else
                        {
                            ctx.fillStyle = 'black';
                            fillCircle(ctx, 0, this.gridSize * bit, this.gridSize * 0.2);
                        }
                    }
                }
                ctx.restore();
            }
        }
        ctx.restore();
    }

    this.drawBackdrop = function(ctx)
    {
        // ctx.fillStyle = 'white';
        // ctx.fillRect(0, 0, this.qPanel.canvas.width, this.qPanel.canvas.height);
    }
    
    this.drawStaffLines = function(ctx)
    {
        this.makeWireGrid();
        var gx = this.gridSize;
        var gy = this.gridSize;
        ctx.save();
        {
            var dark = "#000000";
            var light = "#dddddd";
            ctx.lineWidth = 1;
            for (var bit = 0; bit < this.num_qubits; ++bit)
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
                    if (getBit(this.wire_grid[col], bit))
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

    this.draw_all = function()
    {
        this.calculateScale();

        var ctx = this.ctx;
        ctx.save();
        {
            // ctx.fillStyle = '#fff';
            // this.drawBackdrop(ctx);

            // ctx.scale(this.scale, this.scale);

            ctx.translate(this.margin_x, this.margin_y);
            this.drawBits(ctx);

            ctx.translate(this.gridSize * 1.25 + this.nameWidth, 0);
            this.drawStaffLines(ctx);
            this.drawInstructions(ctx);
            this.drawCodeLabels(ctx);
        }
        ctx.restore();
    }

    this.makeWireGrid = function()
    {
        var num_columns = this.instructions.length + 1;
        if (this.instructions_parallel)
            num_columns = this.instructions_parallel.length + 1;
        var num_rows = this.num_qubits;

        this.wire_grid = new Array(num_columns);
        // Start with all wires "on"
        for (var col = 0; col < num_columns; ++col)
            this.wire_grid[col] = bitfield_zero;

        var brush = bitfield_zero;
        var old_col = -1;
        for (var inst_index = 0; inst_index < this.instructions.length; ++inst_index)
        {
            var inst = this.instructions[inst_index];
            var col = (inst.parallel_slot == null) ? inst_index : inst.parallel_slot;

            if (col > old_col)
            {
                this.wire_grid[col] = brush;
                old_col = col;
            }

            if (inst.op == 'qc.read' || inst.op == 'qc.postselect' 
                || inst.op == 'qc.discard')
            {
                brush &= ~inst.targetQubits;
            }
            else if (inst.op == 'qc.swap' || inst.op == 'qc.cswap')
            {
                var high_pos = getHighestBitIndex(inst.targetQubits);
                var high_val = getBit(brush, high_pos);
                var low_pos = getLowestBitIndex(inst.targetQubits);
                var low_val = getBit(brush, low_pos);
                if (low_val)
                    brush |= bitfield_one << to_bitfield(high_pos);
                else
                    brush &= ~(bitfield_one << to_bitfield(high_pos));

                if (high_val)
                    brush |= bitfield_one << to_bitfield(low_pos);
                else
                    brush &= ~(bitfield_one << to_bitfield(low_pos));
            }
            else if (inst.op == 'qc.nop' || inst.op == 'qc.peek'
                    || inst.op == 'qc.not' || inst.op == 'qc.cnot')
            {
            }
            else
            {
                if (inst.targetQubits)
                    brush |= inst.targetQubits;
            }
        }
        this.wire_grid[num_columns - 1] = brush;
    }

    this.getFullWidth = function ()
    {
        var gx = this.gridSize;

        var len = this.instructions.length;
        if (this.instructions_parallel)
            len = this.instructions_parallel.length;
        return this.wheelScale * (len * gx + 4 * this.margin_x + this.nameWidth);
    }

    this.getFullHeight = function ()
    {
        return this.wheelScale * ((this.num_qubits + 1) * this.gridSize + 1 * this.margin_y);
    }
}

function rounded_rect(ctx, x, y, width, height, radius, do_stroke, do_fill)
{
    ctx.beginPath();
    ctx.moveTo(x,y+radius);
    ctx.lineTo(x,y+height-radius);
    ctx.quadraticCurveTo(x,y+height,x+radius,y+height);
    ctx.lineTo(x+width-radius,y+height);
    ctx.quadraticCurveTo(x+width,y+height,x+width,y+height-radius);
    ctx.lineTo(x+width,y+radius);
    ctx.quadraticCurveTo(x+width,y,x+width-radius,y);
    ctx.lineTo(x+radius,y);
    ctx.quadraticCurveTo(x,y,x,y+radius);
    if (do_stroke)
        ctx.stroke();
    if (do_fill)
        ctx.fill();
}

function rounded_rect_nosides(ctx, x, y, width, height, radius, do_stroke, do_fill)
{
    ctx.beginPath();
    ctx.moveTo(x,y+radius);
    ctx.moveTo(x,y+height-radius);
    ctx.quadraticCurveTo(x,y+height,x+radius,y+height);
    ctx.lineTo(x+width-radius,y+height);
    ctx.quadraticCurveTo(x+width,y+height,x+width,y+height-radius);
    ctx.moveTo(x+width,y+radius);
    ctx.quadraticCurveTo(x+width,y,x+width-radius,y);
    ctx.lineTo(x+radius,y);
    ctx.quadraticCurveTo(x,y,x,y+radius);
    if (do_stroke)
        ctx.stroke();
    if (do_fill)
        ctx.fill();
}

function rounded_rect_leftonly(ctx, x, y, width, height, radius, do_stroke, do_fill)
{
    ctx.beginPath();
    ctx.moveTo(x+radius,y);
    ctx.quadraticCurveTo(x,y,x,y+radius);
    ctx.lineTo(x,y+radius);
    ctx.lineTo(x,y+height-radius);
    ctx.quadraticCurveTo(x,y+height,x+radius,y+height);
    if (do_stroke)
        ctx.stroke();
    if (do_fill)
        ctx.fill();
}

function draw_text(ctx, str, x, y, pts, style_str, color, halign, valign)
{
    ctx.fillStyle = color;
    ctx.textAlign = halign;
    ctx.textBaseline = valign;
    ctx.font = make_font_size(pts, style_str);
    ctx.fillText(str, x, y);
    return y;
}

function make_font_size(pts, style_str)
{
    return style_str + ' ' + pts.toFixed(1) + 'px Helvetica';
}

// Node.js hookups
module.exports.create_svg_string = create_svg_string;
